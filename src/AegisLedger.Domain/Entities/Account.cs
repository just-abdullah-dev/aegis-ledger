using AegisLedger.Domain.Common;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;

namespace AegisLedger.Domain.Entities;

public sealed class Account : Entity<Guid>, IAggregateRoot
{
    private readonly List<TransactionHold> _holds = [];

    public string AccountNumber { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string Owner { get; private set; } = string.Empty;
    public AccountCategory Category { get; private set; }
    public AccountType Type { get; private set; }
    public string Currency { get; private set; } = "USD";
    public decimal LedgerBalance { get; private set; }

    /// <summary>
    /// Sum of all active security holds ring-fenced on this account.
    /// Persisted in SQL Server with DECIMAL(18, 4) precision.
    /// </summary>
    public decimal ActiveHoldsSum { get; private set; }

    /// <summary>
    /// Available liquidity dynamically calculated as Book Ledger Balance minus Active Holds.
    /// Invariant: AvailableBalance == LedgerBalance - ActiveHoldsSum.
    /// Computed property ignored by EF Core.
    /// </summary>
    public decimal AvailableBalance => decimal.Round(
        LedgerBalance - ActiveHoldsSum,
        4,
        MidpointRounding.ToEven);

    public AccountStatus Status { get; private set; }

    /// <summary>
    /// Optimistic concurrency token automatically handled by SQL Server (ROWVERSION).
    /// </summary>
    public byte[] RowVersion { get; private set; } = [0, 0, 0, 0, 0, 0, 0, 1];

    public DateTime OpenedAtUtc { get; private set; }
    public string RoutingCode { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    public IReadOnlyCollection<TransactionHold> Holds => _holds.AsReadOnly();

    private Account()
    {
    }

    public Account(
        string accountNumber,
        string name,
        string owner,
        AccountCategory category,
        AccountType type,
        string currency = "USD",
        decimal initialDeposit = 0m,
        string routingCode = "021000021",
        string description = "")
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            throw new ArgumentException("Account number is required.", nameof(accountNumber));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Account name is required.", nameof(name));

        if (initialDeposit < 0m)
            throw new ArgumentOutOfRangeException(nameof(initialDeposit), "Initial deposit cannot be negative.");

        Id = Guid.NewGuid();
        AccountNumber = accountNumber.Trim();
        Name = name.Trim();
        Owner = owner?.Trim() ?? string.Empty;
        Category = category;
        Type = type;
        Currency = string.IsNullOrWhiteSpace(currency) ? "USD" : currency.ToUpperInvariant().Trim();
        LedgerBalance = decimal.Round(initialDeposit, 4, MidpointRounding.ToEven);
        ActiveHoldsSum = 0m;
        Status = AccountStatus.Active;
        OpenedAtUtc = DateTime.UtcNow;
        RowVersion = [0, 0, 0, 0, 0, 0, 0, 1];
        RoutingCode = routingCode ?? string.Empty;
        Description = description ?? string.Empty;
    }

    /// <summary>
    /// Applies a ring-fenced hold on funds without mutating the book ledger balance.
    /// Increases ActiveHoldsSum and dynamically reduces AvailableBalance.
    /// </summary>
    public TransactionHold ApplyHold(decimal amount, HoldReason reason, TimeSpan ttl, string correlationId)
    {
        EnsureAccountActive();

        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Hold amount must be positive.");

        if (amount > AvailableBalance)
        {
            throw new InsufficientFundsException(AccountNumber, amount, AvailableBalance);
        }

        var hold = new TransactionHold(Id, amount, reason, ttl, correlationId);
        _holds.Add(hold);
        UpdateActiveHoldsSum();

        return hold;
    }

    /// <summary>
    /// Releases an active hold and restores ring-fenced funds to AvailableBalance.
    /// Reduces ActiveHoldsSum. Book Ledger Balance remains unchanged.
    /// </summary>
    public void ReleaseHold(TransactionHold hold, DateTime utcNow)
    {
        EnsureAccountActive();

        if (hold.AccountId != Id)
            throw new DomainException($"Hold '{hold.Id}' does not belong to account '{AccountNumber}'.");

        hold.Release(utcNow);
        UpdateActiveHoldsSum();
    }

    /// <summary>
    /// Captures an active hold permanently.
    /// Deducts held amount from Book Ledger Balance and marks hold as Captured.
    /// AvailableBalance remains invariant because both LedgerBalance and ActiveHoldsSum reduce by heldAmount.
    /// </summary>
    public void CaptureHold(TransactionHold hold, DateTime utcNow)
    {
        EnsureAccountActive();

        if (hold.AccountId != Id)
            throw new DomainException($"Hold '{hold.Id}' does not belong to account '{AccountNumber}'.");

        hold.Capture(utcNow);
        LedgerBalance = decimal.Round(LedgerBalance - hold.HeldAmount, 4, MidpointRounding.ToEven);
        UpdateActiveHoldsSum();
    }

    /// <summary>
    /// Debits funds from the account (money leaves account).
    /// Mutates LedgerBalance; AvailableBalance dynamically reflects the new LedgerBalance.
    /// </summary>
    public decimal Debit(decimal amount)
    {
        EnsureAccountActive();

        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Debit amount must be positive.");

        // Customer accounts cannot overdraw beyond available liquidity
        if (Category == AccountCategory.Customer && amount > AvailableBalance)
        {
            throw new InsufficientFundsException(AccountNumber, amount, AvailableBalance);
        }

        LedgerBalance = decimal.Round(LedgerBalance - amount, 4, MidpointRounding.ToEven);
        return LedgerBalance;
    }

    /// <summary>
    /// Credits funds to the account (money enters account).
    /// Increases LedgerBalance; AvailableBalance dynamically reflects the new LedgerBalance.
    /// </summary>
    public decimal Credit(decimal amount)
    {
        EnsureAccountActive();

        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Credit amount must be positive.");

        LedgerBalance = decimal.Round(LedgerBalance + amount, 4, MidpointRounding.ToEven);
        return LedgerBalance;
    }

    public void Freeze()
    {
        if (Status == AccountStatus.Closed)
            throw new DomainException($"Cannot freeze closed account '{AccountNumber}'.");

        Status = AccountStatus.Frozen;
    }

    public void Unfreeze()
    {
        if (Status == AccountStatus.Closed)
            throw new DomainException($"Cannot unfreeze closed account '{AccountNumber}'.");

        Status = AccountStatus.Active;
    }

    public void Close()
    {
        if (_holds.Any(h => h.Status == HoldStatus.Active))
            throw new DomainException($"Cannot close account '{AccountNumber}' with active holds.");

        if (LedgerBalance != 0m || AvailableBalance != 0m)
            throw new DomainException($"Cannot close account '{AccountNumber}' with non-zero balance (Ledger: {LedgerBalance:C}, Available: {AvailableBalance:C}).");

        Status = AccountStatus.Closed;
    }

    public void UpdateRowVersion(byte[] rowVersion)
    {
        RowVersion = rowVersion ?? [];
    }

    private void UpdateActiveHoldsSum()
    {
        ActiveHoldsSum = decimal.Round(
            _holds.Where(h => h.Status == HoldStatus.Active).Sum(h => h.HeldAmount),
            4,
            MidpointRounding.ToEven);
    }

    private void EnsureAccountActive()
    {
        if (Status != AccountStatus.Active)
        {
            throw new AccountFrozenException(AccountNumber);
        }
    }
}
