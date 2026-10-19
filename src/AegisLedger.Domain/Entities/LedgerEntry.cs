using AegisLedger.Domain.Common;
using AegisLedger.Domain.Enums;

namespace AegisLedger.Domain.Entities;

/// <summary>
/// Immutable double-entry posting journal entry.
/// Once written to the ledger, modifying or deleting entries is strictly prohibited.
/// </summary>
public sealed class LedgerEntry : Entity<Guid>
{
    public Guid TransactionId { get; private set; }
    public Guid AccountId { get; private set; }
    public EntryType EntryType { get; private set; }
    public decimal Amount { get; private set; }
    public decimal PostBalance { get; private set; }
    public string Memo { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; }

    // Navigation properties
    public Transaction? Transaction { get; private set; }
    public Account? Account { get; private set; }

    private LedgerEntry()
    {
    }

    public LedgerEntry(
        Guid transactionId,
        Guid accountId,
        EntryType entryType,
        decimal amount,
        decimal postBalance,
        string memo,
        DateTime? createdAtUtc = null)
    {
        if (transactionId == Guid.Empty)
            throw new ArgumentException("TransactionId cannot be empty.", nameof(transactionId));

        if (accountId == Guid.Empty)
            throw new ArgumentException("AccountId cannot be empty.", nameof(accountId));

        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Entry amount must be positive.");

        Id = Guid.NewGuid();
        TransactionId = transactionId;
        AccountId = accountId;
        EntryType = entryType;
        Amount = decimal.Round(amount, 4, MidpointRounding.ToEven);
        PostBalance = decimal.Round(postBalance, 4, MidpointRounding.ToEven);
        Memo = memo ?? string.Empty;
        CreatedAtUtc = createdAtUtc ?? DateTime.UtcNow;
    }
}
