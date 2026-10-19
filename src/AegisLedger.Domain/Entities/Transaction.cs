using AegisLedger.Domain.Common;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;

namespace AegisLedger.Domain.Entities;

public sealed class Transaction : Entity<Guid>, IAggregateRoot
{
    private readonly List<LedgerEntry> _journalEntries = [];

    public string ReferenceNumber { get; private set; } = string.Empty;
    public string IdempotencyKey { get; private set; } = string.Empty;
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "USD";
    public TransactionStatus Status { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public string Category { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime? PostedAtUtc { get; private set; }
    public Guid? SenderAccountId { get; private set; }
    public Guid? ReceiverAccountId { get; private set; }
    public string? SenderAccountNumber { get; private set; }
    public string? ReceiverAccountNumber { get; private set; }
    public string CorrelationId { get; private set; } = string.Empty;
    public bool IsReversed { get; private set; }
    public Guid? OriginalTransactionId { get; private set; }

    public IReadOnlyCollection<LedgerEntry> JournalEntries => _journalEntries.AsReadOnly();

    private Transaction()
    {
    }

    public Transaction(
        string referenceNumber,
        string idempotencyKey,
        decimal amount,
        string currency,
        string description,
        string category,
        Guid? senderAccountId = null,
        Guid? receiverAccountId = null,
        string? senderAccountNumber = null,
        string? receiverAccountNumber = null,
        string? correlationId = null,
        Guid? originalTransactionId = null)
    {
        if (string.IsNullOrWhiteSpace(referenceNumber))
            throw new ArgumentException("Reference number is required.", nameof(referenceNumber));

        if (string.IsNullOrWhiteSpace(idempotencyKey))
            throw new ArgumentException("Idempotency key is required.", nameof(idempotencyKey));

        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Transaction amount must be positive.");

        Id = Guid.NewGuid();
        ReferenceNumber = referenceNumber.Trim();
        IdempotencyKey = idempotencyKey.Trim();
        Amount = decimal.Round(amount, 4, MidpointRounding.ToEven);
        Currency = string.IsNullOrWhiteSpace(currency) ? "USD" : currency.ToUpperInvariant().Trim();
        Status = TransactionStatus.Pending;
        Description = description ?? string.Empty;
        Category = string.IsNullOrWhiteSpace(category) ? "Transfer" : category;
        CreatedAtUtc = DateTime.UtcNow;
        SenderAccountId = senderAccountId;
        ReceiverAccountId = receiverAccountId;
        SenderAccountNumber = senderAccountNumber;
        ReceiverAccountNumber = receiverAccountNumber;
        CorrelationId = correlationId ?? Guid.NewGuid().ToString("N");
        OriginalTransactionId = originalTransactionId;
    }

    public void AddJournalEntry(Guid accountId, EntryType entryType, decimal amount, decimal postBalance, string memo)
    {
        if (Status == TransactionStatus.Posted)
            throw new DomainException("Cannot add journal entries to an already posted transaction.");

        var entry = new LedgerEntry(Id, accountId, entryType, amount, postBalance, memo, DateTime.UtcNow);
        _journalEntries.Add(entry);
    }

    /// <summary>
    /// Enforces the fundamental Core Banking Invariant:
    /// SUM(Debits) - SUM(Credits) == 0.00
    /// </summary>
    public void ValidateDoubleEntryBalance()
    {
        if (_journalEntries.Count < 2)
            throw new DomainException("A valid double-entry transaction must contain at least 2 balanced journal lines.");

        var totalDebits = _journalEntries
            .Where(e => e.EntryType == EntryType.Debit)
            .Sum(e => e.Amount);

        var totalCredits = _journalEntries
            .Where(e => e.EntryType == EntryType.Credit)
            .Sum(e => e.Amount);

        var drift = Math.Abs(totalDebits - totalCredits);
        if (drift > 0.0001m)
        {
            throw new UnbalancedTransactionException(totalDebits, totalCredits, drift);
        }
    }

    /// <summary>
    /// Validates zero-drift balanced posting invariant and transitions status to Posted.
    /// </summary>
    public void Post()
    {
        ValidateDoubleEntryBalance();
        Status = TransactionStatus.Posted;
        PostedAtUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks the transaction as reversed via compensating entry.
    /// </summary>
    public void MarkAsReversed()
    {
        if (Status != TransactionStatus.Posted)
            throw new DomainException("Only posted transactions can be reversed.");

        if (IsReversed)
            throw new DomainException("Transaction is already reversed.");

        IsReversed = true;
        Status = TransactionStatus.Reversed;
    }
}
