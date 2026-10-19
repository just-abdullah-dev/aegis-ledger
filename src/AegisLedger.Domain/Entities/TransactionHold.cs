using AegisLedger.Domain.Common;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;

namespace AegisLedger.Domain.Entities;

public sealed class TransactionHold : Entity<Guid>
{
    public Guid AccountId { get; private set; }
    public decimal HeldAmount { get; private set; }
    public HoldReason Reason { get; private set; }
    public HoldStatus Status { get; private set; }
    public DateTime CreatedAtUtc { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public DateTime? ResolvedAtUtc { get; private set; }
    public string CorrelationId { get; private set; } = string.Empty;

    // Navigation reference
    public Account? Account { get; private set; }

    // Parameterless constructor for EF Core
    private TransactionHold()
    {
    }

    public TransactionHold(
        Guid accountId,
        decimal heldAmount,
        HoldReason reason,
        TimeSpan ttl,
        string correlationId)
    {
        if (accountId == Guid.Empty)
            throw new ArgumentException("AccountId cannot be empty.", nameof(accountId));

        if (heldAmount <= 0)
            throw new ArgumentOutOfRangeException(nameof(heldAmount), "Hold amount must be greater than zero.");

        if (ttl <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(ttl), "Hold TTL must be greater than zero.");

        Id = Guid.NewGuid();
        AccountId = accountId;
        HeldAmount = decimal.Round(heldAmount, 4, MidpointRounding.ToEven);
        Reason = reason;
        Status = HoldStatus.Active;
        CreatedAtUtc = DateTime.UtcNow;
        ExpiresAtUtc = CreatedAtUtc.Add(ttl);
        CorrelationId = correlationId ?? Guid.NewGuid().ToString("N");
    }

    public bool IsExpired(DateTime utcNow) => Status == HoldStatus.Active && utcNow >= ExpiresAtUtc;

    public void Release(DateTime utcNow)
    {
        if (Status != HoldStatus.Active)
            throw new InvalidHoldStateException(Id, "release", Status.ToString());

        Status = HoldStatus.Released;
        ResolvedAtUtc = utcNow;
    }

    public void Capture(DateTime utcNow)
    {
        if (Status != HoldStatus.Active)
            throw new InvalidHoldStateException(Id, "capture", Status.ToString());

        Status = HoldStatus.Captured;
        ResolvedAtUtc = utcNow;
    }
}
