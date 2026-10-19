using System.Collections.Concurrent;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Entities;
using AegisLedger.Domain.Enums;

namespace AegisLedger.Infrastructure.Persistence.Repositories;

public sealed class InMemoryAccountRepository : IAccountRepository
{
    private static readonly ConcurrentDictionary<Guid, Account> Storage = new();

    static InMemoryAccountRepository()
    {
        // Seed initial accounts matching SRS Solvency rule ($12,450,890.00 = $12,110,230.00 + $340,660.00)
        SeedAccount("ACC-8029-CHK", "Apex Global Logistics LLC", "Elena Rostova", AccountCategory.Customer, AccountType.Checking, 3840250.00m, 150000.00m, HoldReason.CardAuthPreCheck);
        SeedAccount("ACC-4109-ESC", "Meridian Capital Escrow Holdings", "Marcus Sterling", AccountCategory.Customer, AccountType.Escrow, 2950000.00m, 95000.00m, HoldReason.EscrowMilestoneGuarantee);
        SeedAccount("ACC-1940-SAV", "Crestline Asset Management", "Sarah Jenkins", AccountCategory.Customer, AccountType.Savings, 2420440.00m, 55660.00m, HoldReason.ChequeClearance);
        SeedAccount("ACC-6238-CHK", "Vanguard Biopharma Inc", "Dr. Tariq Mahmood", AccountCategory.Customer, AccountType.Checking, 1845100.00m, 40000.00m, HoldReason.AmlFraudReview);
        SeedAccount("ACC-3310-CHK", "Nordic Freight & Cargo Ltd", "Astrid Lindgren", AccountCategory.Customer, AccountType.Checking, 875100.00m, 0m, null);
        
        var frozenAcc = SeedAccount("ACC-9902-SAV", "Helios Renewable Ventures", "Lucas Chen", AccountCategory.Customer, AccountType.Savings, 520000.00m, 0m, null);
        frozenAcc.Freeze();
    }

    private static Account SeedAccount(
        string accountNum,
        string name,
        string owner,
        AccountCategory category,
        AccountType type,
        decimal ledgerBal,
        decimal holdAmount,
        HoldReason? holdReason)
    {
        var acc = new Account(accountNum, name, owner, category, type, "USD", ledgerBal);
        if (holdAmount > 0 && holdReason.HasValue)
        {
            acc.ApplyHold(holdAmount, holdReason.Value, TimeSpan.FromHours(24), "seed-corr");
        }
        Storage[acc.Id] = acc;
        return acc;
    }

    public Task<Account?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        Storage.TryGetValue(id, out var acc);
        return Task.FromResult(acc);
    }

    public Task<Account?> GetByAccountNumberAsync(string accountNumber, CancellationToken cancellationToken = default)
    {
        var acc = Storage.Values.FirstOrDefault(a => string.Equals(a.AccountNumber, accountNumber, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(acc);
    }

    public Task<IReadOnlyList<Account>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Account> list = Storage.Values.OrderBy(a => a.AccountNumber).ToList();
        return Task.FromResult(list);
    }

    public Task AddAsync(Account account, CancellationToken cancellationToken = default)
    {
        Storage[account.Id] = account;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Account account, CancellationToken cancellationToken = default)
    {
        Storage[account.Id] = account;
        return Task.CompletedTask;
    }
}

public sealed class InMemoryTransactionRepository : ITransactionRepository
{
    private static readonly ConcurrentDictionary<Guid, Transaction> Storage = new();

    public Task<Transaction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        Storage.TryGetValue(id, out var txn);
        return Task.FromResult(txn);
    }

    public Task<Transaction?> GetByIdempotencyKeyAsync(string idempotencyKey, CancellationToken cancellationToken = default)
    {
        var txn = Storage.Values.FirstOrDefault(t => string.Equals(t.IdempotencyKey, idempotencyKey, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(txn);
    }

    public Task<Transaction?> GetByReferenceNumberAsync(string referenceNumber, CancellationToken cancellationToken = default)
    {
        var txn = Storage.Values.FirstOrDefault(t => string.Equals(t.ReferenceNumber, referenceNumber, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(txn);
    }

    public Task<IReadOnlyList<Transaction>> GetRecentAsync(int limit = 50, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<Transaction> list = Storage.Values
            .OrderByDescending(t => t.CreatedAtUtc)
            .Take(limit)
            .ToList();
        return Task.FromResult(list);
    }

    public Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        Storage[transaction.Id] = transaction;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        Storage[transaction.Id] = transaction;
        return Task.CompletedTask;
    }
}

public sealed class InMemoryTransactionHoldRepository : ITransactionHoldRepository
{
    private static readonly ConcurrentDictionary<Guid, TransactionHold> Storage = new();

    public Task<TransactionHold?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        Storage.TryGetValue(id, out var hold);
        return Task.FromResult(hold);
    }

    public Task<IReadOnlyList<TransactionHold>> GetActiveHoldsAsync(CancellationToken cancellationToken = default)
    {
        IReadOnlyList<TransactionHold> list = Storage.Values
            .Where(h => h.Status == HoldStatus.Active)
            .OrderBy(h => h.ExpiresAtUtc)
            .ToList();
        return Task.FromResult(list);
    }

    public Task<IReadOnlyList<TransactionHold>> GetExpiredActiveHoldsAsync(DateTime utcNow, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<TransactionHold> list = Storage.Values
            .Where(h => h.IsExpired(utcNow))
            .ToList();
        return Task.FromResult(list);
    }

    public Task AddAsync(TransactionHold hold, CancellationToken cancellationToken = default)
    {
        Storage[hold.Id] = hold;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(TransactionHold hold, CancellationToken cancellationToken = default)
    {
        Storage[hold.Id] = hold;
        return Task.CompletedTask;
    }
}

public sealed class InMemoryEodReconciliationRepository : IEodReconciliationRepository
{
    private static readonly ConcurrentDictionary<Guid, EodReconciliationBatch> Storage = new();

    static InMemoryEodReconciliationRepository()
    {
        // Seed initial 30-day proof sample
        var batch = new EodReconciliationBatch(
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
            12450890.00m,
            12450890.00m,
            "0x8f2a991bce4718e8a93910cbe6a894a4db52f6b8c9d10e11a2f3b4c5d6e7f8a9",
            1420,
            420,
            "Completed"
        );
        Storage[batch.Id] = batch;
    }

    public Task<IReadOnlyList<EodReconciliationBatch>> GetRecentBatchesAsync(int count = 30, CancellationToken cancellationToken = default)
    {
        IReadOnlyList<EodReconciliationBatch> list = Storage.Values
            .OrderByDescending(b => b.AuditDate)
            .Take(count)
            .ToList();
        return Task.FromResult(list);
    }

    public Task AddAsync(EodReconciliationBatch batch, CancellationToken cancellationToken = default)
    {
        Storage[batch.Id] = batch;
        return Task.CompletedTask;
    }
}

public sealed class InMemoryUnitOfWork : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(1);
    }

    public async Task<TResult> ExecuteInTransactionAsync<TResult>(
        Func<CancellationToken, Task<TResult>> operation,
        CancellationToken cancellationToken = default)
    {
        return await operation(cancellationToken);
    }
}
