using AegisLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AegisLedger.Infrastructure.Persistence.Configurations;

public sealed class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("Transactions");

        // Primary Key TransactionId (GUID)
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id)
            .HasColumnName("TransactionId")
            .ValueGeneratedNever();

        // ReferenceNumber NVARCHAR(50) UNIQUE
        builder.Property(t => t.ReferenceNumber)
            .HasMaxLength(50)
            .IsRequired();
        builder.HasIndex(t => t.ReferenceNumber)
            .IsUnique();

        // IdempotencyKey NVARCHAR(100) UNIQUE
        builder.Property(t => t.IdempotencyKey)
            .HasMaxLength(100)
            .IsRequired();
        builder.HasIndex(t => t.IdempotencyKey)
            .IsUnique();

        builder.Property(t => t.Amount)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(t => t.Currency)
            .HasMaxLength(3)
            .IsRequired();

        builder.Property(t => t.Status)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(t => t.Description)
            .HasMaxLength(500);

        builder.Property(t => t.Category)
            .HasMaxLength(100);

        // Index on CreatedAtUtc
        builder.Property(t => t.CreatedAtUtc)
            .IsRequired();
        builder.HasIndex(t => t.CreatedAtUtc)
            .HasDatabaseName("IX_Txn_CreatedAtUtc");

        builder.Property(t => t.PostedAtUtc);

        builder.Property(t => t.SenderAccountNumber)
            .HasMaxLength(20);

        builder.Property(t => t.ReceiverAccountNumber)
            .HasMaxLength(20);

        builder.Property(t => t.CorrelationId)
            .HasMaxLength(100);

        builder.Property(t => t.IsReversed)
            .IsRequired();

        // Navigation to journal lines (LedgerEntry)
        builder.HasMany(t => t.JournalEntries)
            .WithOne(e => e.Transaction)
            .HasForeignKey(e => e.TransactionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Navigation(t => t.JournalEntries)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
