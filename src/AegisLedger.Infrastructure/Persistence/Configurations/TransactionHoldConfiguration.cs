using AegisLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AegisLedger.Infrastructure.Persistence.Configurations;

public sealed class TransactionHoldConfiguration : IEntityTypeConfiguration<TransactionHold>
{
    public void Configure(EntityTypeBuilder<TransactionHold> builder)
    {
        builder.ToTable("TransactionHolds");

        // Primary Key HoldId (GUID)
        builder.HasKey(h => h.Id);
        builder.Property(h => h.Id)
            .HasColumnName("HoldId")
            .ValueGeneratedNever();

        builder.Property(h => h.AccountId)
            .IsRequired();

        // Precision DECIMAL(18, 4)
        builder.Property(h => h.HeldAmount)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(h => h.Reason)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(h => h.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(h => h.CreatedAtUtc)
            .IsRequired();

        builder.Property(h => h.ExpiresAtUtc)
            .IsRequired();

        builder.Property(h => h.ResolvedAtUtc);

        builder.Property(h => h.CorrelationId)
            .HasMaxLength(100)
            .IsRequired();

        // Non-clustered index on (Status, ExpiresAtUtc) for background cleanup worker optimization
        builder.HasIndex(h => new { h.Status, h.ExpiresAtUtc })
            .HasDatabaseName("IX_Holds_Status_ExpiresAtUtc");

        // Relationship to Account
        builder.HasOne(h => h.Account)
            .WithMany(a => a.Holds)
            .HasForeignKey(h => h.AccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
