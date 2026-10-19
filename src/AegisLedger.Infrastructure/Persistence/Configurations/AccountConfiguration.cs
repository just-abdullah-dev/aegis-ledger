using AegisLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AegisLedger.Infrastructure.Persistence.Configurations;

public sealed class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("Accounts");

        // Primary Key AccountId (GUID)
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id)
            .HasColumnName("AccountId")
            .ValueGeneratedNever();

        // AccountNumber NVARCHAR(20) UNIQUE
        builder.Property(a => a.AccountNumber)
            .HasMaxLength(20)
            .IsRequired();
        builder.HasIndex(a => a.AccountNumber)
            .IsUnique();

        builder.Property(a => a.Name)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(a => a.Owner)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(a => a.Category)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(a => a.Type)
            .HasConversion<int>()
            .IsRequired();

        builder.Property(a => a.Currency)
            .HasMaxLength(3)
            .IsRequired();

        // LedgerBalance and ActiveHoldsSum DECIMAL(18, 4)
        builder.Property(a => a.LedgerBalance)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.Property(a => a.ActiveHoldsSum)
            .HasPrecision(18, 4)
            .IsRequired();

        // Ignore computed property AvailableBalance
        builder.Ignore(a => a.AvailableBalance);

        builder.Property(a => a.Status)
            .HasConversion<int>()
            .IsRequired();

        // RowVersion for optimistic concurrency token
        builder.Property(a => a.RowVersion)
            .IsRowVersion()
            .IsConcurrencyToken();

        builder.Property(a => a.OpenedAtUtc)
            .IsRequired();

        builder.Property(a => a.RoutingCode)
            .HasMaxLength(20);

        builder.Property(a => a.Description)
            .HasMaxLength(500);

        // One-to-many relationship with TransactionHold
        builder.HasMany(a => a.Holds)
            .WithOne(h => h.Account)
            .HasForeignKey(h => h.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Navigation(a => a.Holds)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
