using System.Data;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace AegisLedger.Infrastructure.Persistence;

public class AegisLedgerDbContext : DbContext, IApplicationDbContext
{
    public AegisLedgerDbContext(DbContextOptions<AegisLedgerDbContext> options)
        : base(options)
    {
    }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();
    public DbSet<TransactionHold> TransactionHolds => Set<TransactionHold>();
    public DbSet<EodReconciliationBatch> EodReconciliationBatches => Set<EodReconciliationBatch>();
    public DbSet<User> Users => Set<User>();

    public IExecutionStrategy CreateExecutionStrategy()
    {
        return Database.CreateExecutionStrategy();
    }

    public Task<IDbContextTransaction> BeginTransactionAsync(IsolationLevel isolationLevel, CancellationToken cancellationToken = default)
    {
        return Database.BeginTransactionAsync(isolationLevel, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AegisLedgerDbContext).Assembly);

        if (Database.IsSqlite())
        {
            modelBuilder.Entity<Account>()
                .Property(a => a.RowVersion)
                .ValueGeneratedNever();
        }
    }
}
