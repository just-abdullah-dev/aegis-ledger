using AegisLedger.Application.Common.Dtos;

namespace AegisLedger.Application.Common.Interfaces;

public interface IAccountQueries
{
    Task<IReadOnlyList<AccountDto>> GetAccountsAsync(CancellationToken cancellationToken = default);
    Task<AccountDetailDto?> GetAccountByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JournalFeedItemDto>> GetJournalEntriesAsync(int page = 1, int pageSize = 50, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TransactionHoldDto>> GetActiveHoldsAsync(Guid? accountId = null, CancellationToken cancellationToken = default);
}
