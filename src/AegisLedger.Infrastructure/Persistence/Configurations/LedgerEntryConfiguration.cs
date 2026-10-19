using AegisLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AegisLedger.Infrastructure.Persistence.Configurations;

public sealed class LedgerEntryConfiguration : IEntityTypeConfiguration<LedgerEntry>
{
    public void Configure(EntityTypeBuilder<LedgerEntry> builder)
    {
        builder.ToTable("LedgerEntries");

        // Primary Key EntryId (GUID)
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id)
            .HasColumnName("EntryId")
            .ValueGeneratedNever();

        // Foreign Keys
        builder.Property(e => e.TransactionId)
            .IsRequired();

        builder.Property(e => e.AccountId)
            .IsRequired();

        builder.Property(e => e.EntryType)
            .HasConversion<int>()
            .IsRequired();

        // Precision DECIMAL(18, 4)
        builder.Property(e => e.Amount)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(e => e.PostBalance)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(e => e.Memo)
            .HasMaxLength(250)
            .IsRequired();

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired();

        // Composite index on (AccountId, CreatedAtUtc)
        builder.HasIndex(e => new { e.AccountId, e.CreatedAtUtc })
            .HasDatabaseName("IX_LedgerEntries_AccountId_CreatedAtUtc");

        // Relationships
        builder.HasOne(e => e.Transaction)
            .WithMany(t => t.JournalEntries)
            .HasForeignKey(e => e.TransactionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Account)
            .WithMany()
            .HasForeignKey(e => e.AccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
