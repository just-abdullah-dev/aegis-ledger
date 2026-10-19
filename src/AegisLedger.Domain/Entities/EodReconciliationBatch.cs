using AegisLedger.Domain.Common;

namespace AegisLedger.Domain.Entities;

/// <summary>
/// Immutable End-Of-Day (EOD) Reconciliation proof record.
/// Verifies net-zero drift: SUM(Debits) - SUM(Credits) == $0.00 across the ledger.
/// </summary>
public sealed class EodReconciliationBatch : Entity<Guid>, IAggregateRoot
{
    public DateOnly AuditDate { get; private set; }
    public decimal TotalDebits { get; private set; }
    public decimal TotalCredits { get; private set; }
    public decimal Difference { get; private set; }
    public string BatchHash { get; private set; } = string.Empty;
    public string Status { get; private set; } = "Completed"; // Completed, Processing, Failed
    public int ProcessedCount { get; private set; }
    public long DurationMs { get; private set; }
    public DateTime CompletedAtUtc { get; private set; }

    private EodReconciliationBatch()
    {
    }

    public EodReconciliationBatch(
        DateOnly auditDate,
        decimal totalDebits,
        decimal totalCredits,
        string batchHash,
        int processedCount,
        long durationMs,
        string status = "Completed")
    {
        Id = Guid.NewGuid();
        AuditDate = auditDate;
        TotalDebits = decimal.Round(totalDebits, 4, MidpointRounding.ToEven);
        TotalCredits = decimal.Round(totalCredits, 4, MidpointRounding.ToEven);
        Difference = decimal.Round(totalDebits - totalCredits, 4, MidpointRounding.ToEven);
        BatchHash = batchHash ?? string.Empty;
        ProcessedCount = processedCount;
        DurationMs = durationMs;
        Status = status;
        CompletedAtUtc = DateTime.UtcNow;
    }
}
