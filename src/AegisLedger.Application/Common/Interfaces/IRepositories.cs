using AegisLedger.Domain.Entities;

namespace AegisLedger.Application.Common.Interfaces;

public interface IAccountRepository
{
    Task<Account?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Account?> GetByAccountNumberAsync(string accountNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Account>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Account account, CancellationToken cancellationToken = default);
    Task UpdateAsync(Account account, CancellationToken cancellationToken = default);
}

public interface ITransactionRepository
{
    Task<Transaction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Transaction?> GetByIdempotencyKeyAsync(string idempotencyKey, CancellationToken cancellationToken = default);
    Task<Transaction?> GetByReferenceNumberAsync(string referenceNumber, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Transaction>> GetRecentAsync(int limit = 50, CancellationToken cancellationToken = default);
    Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default);
    Task UpdateAsync(Transaction transaction, CancellationToken cancellationToken = default);
}

public interface ITransactionHoldRepository
{
    Task<TransactionHold?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TransactionHold>> GetActiveHoldsAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TransactionHold>> GetExpiredActiveHoldsAsync(DateTime utcNow, CancellationToken cancellationToken = default);
    Task AddAsync(TransactionHold hold, CancellationToken cancellationToken = default);
    Task UpdateAsync(TransactionHold hold, CancellationToken cancellationToken = default);
}

public interface IEodReconciliationRepository
{
    Task<IReadOnlyList<EodReconciliationBatch>> GetRecentBatchesAsync(int count = 30, CancellationToken cancellationToken = default);
    Task AddAsync(EodReconciliationBatch batch, CancellationToken cancellationToken = default);
}

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<TResult> ExecuteInTransactionAsync<TResult>(
        Func<CancellationToken, Task<TResult>> operation,
        CancellationToken cancellationToken = default);
}
