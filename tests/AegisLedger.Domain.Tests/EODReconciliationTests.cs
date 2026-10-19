using System.Security.Cryptography;
using System.Text;
using AegisLedger.Domain.Entities;

namespace AegisLedger.Domain.Tests;

public class EODReconciliationTests
{
    [Fact]
    public void EodBatch_ShouldCalculateZeroDifference_WhenDebitsEqualCredits()
    {
        var auditDate = DateOnly.FromDateTime(DateTime.UtcNow);
        const decimal totalDebits = 12450890.00m;
        const decimal totalCredits = 12450890.00m;

        var rawData = $"{auditDate:yyyy-MM-dd}|{totalDebits:F4}|{totalCredits:F4}|{0.0000m:F4}|1420";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawData));
        var batchHash = "0x" + Convert.ToHexString(hashBytes).ToLowerInvariant();

        var batch = new EodReconciliationBatch(
            auditDate,
            totalDebits,
            totalCredits,
            batchHash,
            1420,
            420,
            "Completed"
        );

        Assert.Equal(0.00m, batch.Difference);
        Assert.Equal("Completed", batch.Status);
        Assert.StartsWith("0x", batch.BatchHash);
        Assert.Equal(66, batch.BatchHash.Length); // "0x" + 64 hex characters
    }

    [Fact]
    public void EodBatch_ShouldDetectDrift_WhenDebitsDoNotEqualCredits()
    {
        var auditDate = DateOnly.FromDateTime(DateTime.UtcNow);
        const decimal totalDebits = 12450890.00m;
        const decimal totalCredits = 12450889.50m; // Drift of $0.50

        var batch = new EodReconciliationBatch(
            auditDate,
            totalDebits,
            totalCredits,
            "0xhash",
            1420,
            500,
            "Failed"
        );

        Assert.Equal(0.50m, batch.Difference);
        Assert.Equal("Failed", batch.Status);
    }
}
