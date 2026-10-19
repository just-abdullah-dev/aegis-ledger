using AegisLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AegisLedger.Infrastructure.Persistence.Configurations;

public sealed class EodReconciliationBatchConfiguration : IEntityTypeConfiguration<EodReconciliationBatch>
{
    public void Configure(EntityTypeBuilder<EodReconciliationBatch> builder)
    {
        builder.ToTable("EodReconciliationBatches");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id)
            .HasColumnName("BatchId")
            .ValueGeneratedNever();

        builder.Property(b => b.AuditDate)
            .IsRequired();
        builder.HasIndex(b => b.AuditDate)
            .IsUnique();

        builder.Property(b => b.TotalDebits)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(b => b.TotalCredits)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(b => b.Difference)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(b => b.BatchHash)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(b => b.Status)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(b => b.ProcessedCount)
            .IsRequired();

        builder.Property(b => b.DurationMs)
            .IsRequired();

        builder.Property(b => b.CompletedAtUtc)
            .IsRequired();
    }
}
