using System.Data;
using AegisLedger.Application.Common.Dtos;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Enums;
using Dapper;
using Microsoft.Extensions.Logging;

namespace AegisLedger.Infrastructure.Queries;

public class DapperAccountQueries : IAccountQueries
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly ICacheService _cache;
    private readonly IAccountRepository _fallbackAccountRepo;
    private readonly ITransactionRepository _fallbackTxnRepo;
    private readonly ITransactionHoldRepository _fallbackHoldRepo;
    private readonly ILogger<DapperAccountQueries> _logger;

    public DapperAccountQueries(
        ISqlConnectionFactory connectionFactory,
        ICacheService cache,
        IAccountRepository fallbackAccountRepo,
        ITransactionRepository fallbackTxnRepo,
        ITransactionHoldRepository fallbackHoldRepo,
        ILogger<DapperAccountQueries> logger)
    {
        _connectionFactory = connectionFactory;
        _cache = cache;
        _fallbackAccountRepo = fallbackAccountRepo;
        _fallbackTxnRepo = fallbackTxnRepo;
        _fallbackHoldRepo = fallbackHoldRepo;
        _logger = logger;
    }

    public async Task<IReadOnlyList<AccountDto>> GetAccountsAsync(CancellationToken cancellationToken = default)
    {
        const string cacheKey = "accounts:list";
        var cached = await _cache.GetAsync<IReadOnlyList<AccountDto>>(cacheKey, cancellationToken);
        if (cached is not null && cached.Count > 0)
        {
            return cached;
        }

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
                SELECT 
                    a.AccountId AS Id,
                    a.AccountNumber,
                    a.Name,
                    a.Owner,
                    CASE a.Category WHEN 1 THEN 'customer' WHEN 2 THEN 'system' ELSE 'customer' END AS Category,
                    CASE a.Type 
                        WHEN 1 THEN 'Checking' 
                        WHEN 2 THEN 'Savings' 
                        WHEN 3 THEN 'Escrow' 
                        WHEN 4 THEN 'SystemLedger' 
                        WHEN 5 THEN 'Treasury' 
                        WHEN 6 THEN 'Asset' 
                        WHEN 7 THEN 'Liability' 
                        WHEN 8 THEN 'Equity' 
                        WHEN 9 THEN 'Revenue' 
                        ELSE 'Checking' END AS Type,
                    a.Currency,
                    a.LedgerBalance,
                    (a.LedgerBalance - a.ActiveHoldsSum) AS AvailableBalance,
                    CASE a.Status WHEN 1 THEN 'Active' WHEN 2 THEN 'Frozen' WHEN 3 THEN 'Closed' ELSE 'Active' END AS Status,
                    ISNULL(CONVERT(VARCHAR(34), a.RowVersion, 1), '0x0000000000000000') AS RowVersion,
                    a.OpenedAtUtc AS OpenedAt,
                    ISNULL(a.RoutingCode, '') AS RoutingCode,
                    ISNULL(a.Description, '') AS Description
                FROM Accounts a
                ORDER BY a.AccountNumber;
                """;

            var rows = (await connection.QueryAsync<AccountDto>(sql)).ToList();
            if (rows.Count > 0)
            {
                await _cache.SetAsync(cacheKey, rows, TimeSpan.FromSeconds(60), cancellationToken: cancellationToken);
                return rows;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Dapper execution failed. Falling back to in-memory accounts provider.");
        }

        // Fallback to in-memory store
        var inMemory = await _fallbackAccountRepo.GetAllAsync(cancellationToken);
        var mapped = inMemory.Select(a => new AccountDto(
            a.Id,
            a.AccountNumber,
            a.Name,
            a.Owner,
            a.Category.ToString().ToLowerInvariant(),
            a.Type.ToString(),
            a.Currency,
            a.LedgerBalance,
            a.AvailableBalance,
            a.Status.ToString(),
            a.RowVersion.Length > 0 ? "0x" + Convert.ToHexString(a.RowVersion) : "0x00000000000007D4",
            a.OpenedAtUtc,
            a.RoutingCode,
            a.Description
        )).ToList();

        await _cache.SetAsync(cacheKey, mapped, TimeSpan.FromSeconds(60), cancellationToken: cancellationToken);
        return mapped;
    }

    public async Task<AccountDetailDto?> GetAccountByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"account:{id}";
        var cached = await _cache.GetAsync<AccountDetailDto>(cacheKey, cancellationToken);
        if (cached is not null)
            return cached;

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sqlAccount = """
                SELECT 
                    a.AccountId AS Id,
                    a.AccountNumber,
                    a.Name,
                    a.Owner,
                    CASE a.Category WHEN 1 THEN 'customer' WHEN 2 THEN 'system' ELSE 'customer' END AS Category,
                    CASE a.Type 
                        WHEN 1 THEN 'Checking' 
                        WHEN 2 THEN 'Savings' 
                        WHEN 3 THEN 'Escrow' 
                        WHEN 4 THEN 'SystemLedger' 
                        WHEN 5 THEN 'Treasury' 
                        WHEN 6 THEN 'Asset' 
                        WHEN 7 THEN 'Liability' 
                        WHEN 8 THEN 'Equity' 
                        WHEN 9 THEN 'Revenue' 
                        ELSE 'Checking' END AS Type,
                    a.Currency,
                    a.LedgerBalance,
                    a.ActiveHoldsSum,
                    (a.LedgerBalance - a.ActiveHoldsSum) AS AvailableBalance,
                    CASE a.Status WHEN 1 THEN 'Active' WHEN 2 THEN 'Frozen' WHEN 3 THEN 'Closed' ELSE 'Active' END AS Status,
                    ISNULL(CONVERT(VARCHAR(34), a.RowVersion, 1), '0x0000000000000000') AS RowVersion,
                    a.OpenedAtUtc AS OpenedAt,
                    ISNULL(a.RoutingCode, '') AS RoutingCode,
                    ISNULL(a.Description, '') AS Description
                FROM Accounts a
                WHERE a.AccountId = @Id;
                """;

            var account = await connection.QueryFirstOrDefaultAsync<AccountDetailDto>(sqlAccount, new { Id = id });
            if (account is not null)
            {
                const string sqlHolds = """
                    SELECT 
                        h.HoldId AS Id,
                        h.AccountId,
                        a.AccountNumber,
                        a.Name AS AccountName,
                        h.HeldAmount AS Amount,
                        CASE h.Reason
                            WHEN 1 THEN 'Card Auth Pre-check'
                            WHEN 2 THEN 'AML Fraud Review'
                            WHEN 3 THEN 'Cheque Clearance'
                            WHEN 4 THEN 'Escrow Milestone Guarantee'
                            ELSE 'Card Auth Pre-check' END AS Reason,
                        h.CreatedAtUtc AS CreatedAt,
                        DATEDIFF_BIG(ms, '1970-01-01', h.ExpiresAtUtc) AS ExpiresAtEpochMs,
                        CASE h.Status WHEN 1 THEN 'Active' WHEN 2 THEN 'Released' WHEN 3 THEN 'Captured' ELSE 'Active' END AS Status,
                        h.CorrelationId
                    FROM TransactionHolds h
                    JOIN Accounts a ON h.AccountId = a.AccountId
                    WHERE h.AccountId = @Id AND h.Status = 1
                    ORDER BY h.ExpiresAtUtc;
                    """;

                const string sqlEntries = """
                    SELECT TOP 50
                        e.EntryId AS Id,
                        CASE e.EntryType WHEN 1 THEN 'DEBIT' WHEN 2 THEN 'CREDIT' ELSE 'DEBIT' END AS EntryType,
                        e.AccountId,
                        a.AccountNumber,
                        a.Name AS AccountName,
                        e.Amount,
                        e.PostBalance,
                        e.Memo
                    FROM LedgerEntries e
                    JOIN Accounts a ON e.AccountId = a.AccountId
                    WHERE e.AccountId = @Id
                    ORDER BY e.CreatedAtUtc DESC;
                    """;

                var holds = (await connection.QueryAsync<TransactionHoldDto>(sqlHolds, new { Id = id })).ToList();
                var entries = (await connection.QueryAsync<JournalLineDto>(sqlEntries, new { Id = id })).ToList();

                var fullDetail = account with { ActiveHolds = holds, RecentJournalEntries = entries };
                await _cache.SetAsync(cacheKey, fullDetail, TimeSpan.FromSeconds(60), cancellationToken: cancellationToken);
                return fullDetail;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Dapper execution failed for account '{Id}'. Falling back to in-memory store.", id);
        }

        var fallbackAcc = await _fallbackAccountRepo.GetByIdAsync(id, cancellationToken);
        if (fallbackAcc is null) return null;

        var result = new AccountDetailDto(
            fallbackAcc.Id,
            fallbackAcc.AccountNumber,
            fallbackAcc.Name,
            fallbackAcc.Owner,
            fallbackAcc.Category.ToString().ToLowerInvariant(),
            fallbackAcc.Type.ToString(),
            fallbackAcc.Currency,
            fallbackAcc.LedgerBalance,
            fallbackAcc.ActiveHoldsSum,
            fallbackAcc.AvailableBalance,
            fallbackAcc.Status.ToString(),
            fallbackAcc.RowVersion.Length > 0 ? "0x" + Convert.ToHexString(fallbackAcc.RowVersion) : "0x00000000000007D4",
            fallbackAcc.OpenedAtUtc,
            fallbackAcc.RoutingCode,
            fallbackAcc.Description,
            fallbackAcc.Holds.Where(h => h.Status == HoldStatus.Active).Select(h => new TransactionHoldDto(
                h.Id,
                fallbackAcc.Id,
                fallbackAcc.AccountNumber,
                fallbackAcc.Name,
                h.HeldAmount,
                h.Reason.ToFriendlyString(),
                h.CreatedAtUtc,
                new DateTimeOffset(h.ExpiresAtUtc).ToUnixTimeMilliseconds(),
                h.Status.ToString(),
                h.CorrelationId
            )).ToList(),
            []
        );

        await _cache.SetAsync(cacheKey, result, TimeSpan.FromSeconds(60), cancellationToken: cancellationToken);
        return result;
    }

    public async Task<IReadOnlyList<JournalFeedItemDto>> GetJournalEntriesAsync(int page = 1, int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"journal:page_{page}_{pageSize}";
        var cached = await _cache.GetAsync<IReadOnlyList<JournalFeedItemDto>>(cacheKey, cancellationToken);
        if (cached is not null && cached.Count > 0)
            return cached;

        var offset = Math.Max(0, (page - 1) * pageSize);

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sqlTxns = """
                SELECT 
                    t.TransactionId,
                    t.ReferenceNumber,
                    t.CreatedAtUtc AS TimestampUtc,
                    t.Description,
                    t.Category,
                    CASE t.Status WHEN 1 THEN 'Posted' WHEN 2 THEN 'Pending' WHEN 3 THEN 'Reversed' ELSE 'Posted' END AS Status,
                    t.Amount,
                    t.Currency
                FROM Transactions t
                ORDER BY t.CreatedAtUtc DESC
                OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
                """;

            var txns = (await connection.QueryAsync<dynamic>(sqlTxns, new { Offset = offset, PageSize = pageSize })).ToList();
            if (txns.Count > 0)
            {
                var txnIds = txns.Select(t => (Guid)t.TransactionId).ToList();

                const string sqlSplits = """
                    SELECT 
                        e.EntryId AS Id,
                        e.TransactionId,
                        CASE e.EntryType WHEN 1 THEN 'DEBIT' WHEN 2 THEN 'CREDIT' ELSE 'DEBIT' END AS EntryType,
                        e.AccountId,
                        a.AccountNumber,
                        a.Name AS AccountName,
                        e.Amount,
                        e.PostBalance,
                        e.Memo
                    FROM LedgerEntries e
                    JOIN Accounts a ON e.AccountId = a.AccountId
                    WHERE e.TransactionId IN @TxnIds
                    ORDER BY e.EntryType ASC;
                    """;

                var splits = (await connection.QueryAsync<dynamic>(sqlSplits, new { TxnIds = txnIds })).ToList();

                var grouped = txns.Select(t => new JournalFeedItemDto(
                    (Guid)t.TransactionId,
                    (string)t.ReferenceNumber,
                    (DateTime)t.TimestampUtc,
                    (string)t.Description,
                    (string)t.Category,
                    (string)t.Status,
                    (decimal)t.Amount,
                    (string)t.Currency,
                    splits
                        .Where(s => (Guid)s.TransactionId == (Guid)t.TransactionId)
                        .Select(s => new JournalLineDto(
                            (Guid)s.Id,
                            (string)s.EntryType,
                            (Guid)s.AccountId,
                            (string)s.AccountNumber,
                            (string)s.AccountName,
                            (decimal)s.Amount,
                            (decimal)s.PostBalance,
                            (string)s.Memo
                        )).ToList()
                )).ToList();

                await _cache.SetAsync(cacheKey, grouped, TimeSpan.FromSeconds(60), cancellationToken: cancellationToken);
                return grouped;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Dapper execution failed for journal feed. Falling back to in-memory store.");
        }

        var fallbackTxns = await _fallbackTxnRepo.GetRecentAsync(pageSize, cancellationToken);
        var fallbackGrouped = fallbackTxns.Select(t => new JournalFeedItemDto(
            t.Id,
            t.ReferenceNumber,
            t.CreatedAtUtc,
            t.Description,
            t.Category,
            t.Status.ToString(),
            t.Amount,
            t.Currency,
            t.JournalEntries.Select(j => new JournalLineDto(
                j.Id,
                j.EntryType == EntryType.Debit ? "DEBIT" : "CREDIT",
                j.AccountId,
                string.Empty,
                string.Empty,
                j.Amount,
                j.PostBalance,
                j.Memo
            )).ToList()
        )).ToList();

        await _cache.SetAsync(cacheKey, fallbackGrouped, TimeSpan.FromSeconds(60), cancellationToken: cancellationToken);
        return fallbackGrouped;
    }

    public async Task<IReadOnlyList<TransactionHoldDto>> GetActiveHoldsAsync(Guid? accountId = null, CancellationToken cancellationToken = default)
    {
        const string cacheKey = "holds:active";
        if (!accountId.HasValue)
        {
            var cached = await _cache.GetAsync<IReadOnlyList<TransactionHoldDto>>(cacheKey, cancellationToken);
            if (cached is not null && cached.Count > 0)
                return cached;
        }

        try
        {
            using var connection = _connectionFactory.CreateConnection();
            const string sql = """
                SELECT 
                    h.HoldId AS Id,
                    h.AccountId,
                    a.AccountNumber,
                    a.Name AS AccountName,
                    h.HeldAmount AS Amount,
                    CASE h.Reason
                        WHEN 1 THEN 'Card Auth Pre-check'
                        WHEN 2 THEN 'AML Fraud Review'
                        WHEN 3 THEN 'Cheque Clearance'
                        WHEN 4 THEN 'Escrow Milestone Guarantee'
                        ELSE 'Card Auth Pre-check' END AS Reason,
                    h.CreatedAtUtc AS CreatedAt,
                    DATEDIFF_BIG(ms, '1970-01-01', h.ExpiresAtUtc) AS ExpiresAtEpochMs,
                    CASE h.Status WHEN 1 THEN 'Active' WHEN 2 THEN 'Released' WHEN 3 THEN 'Captured' ELSE 'Active' END AS Status,
                    h.CorrelationId
                FROM TransactionHolds h
                JOIN Accounts a ON h.AccountId = a.AccountId
                WHERE h.Status = 1 AND (@AccountId IS NULL OR h.AccountId = @AccountId)
                ORDER BY h.ExpiresAtUtc ASC;
                """;

            var holds = (await connection.QueryAsync<TransactionHoldDto>(sql, new { AccountId = accountId })).ToList();
            if (holds.Count > 0)
            {
                if (!accountId.HasValue)
                {
                    await _cache.SetAsync(cacheKey, holds, TimeSpan.FromSeconds(60), cancellationToken: cancellationToken);
                }
                return holds;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Dapper execution failed for active holds. Falling back to in-memory store.");
        }

        var inMemoryHolds = await _fallbackHoldRepo.GetActiveHoldsAsync(cancellationToken);
        var inMemoryAccounts = await _fallbackAccountRepo.GetAllAsync(cancellationToken);
        var accountsMap = inMemoryAccounts.ToDictionary(a => a.Id);

        var mapped = inMemoryHolds
            .Where(h => !accountId.HasValue || h.AccountId == accountId.Value)
            .Select(h =>
            {
                accountsMap.TryGetValue(h.AccountId, out var acc);
                return new TransactionHoldDto(
                    h.Id,
                    h.AccountId,
                    acc?.AccountNumber ?? string.Empty,
                    acc?.Name ?? string.Empty,
                    h.HeldAmount,
                    h.Reason.ToFriendlyString(),
                    h.CreatedAtUtc,
                    new DateTimeOffset(h.ExpiresAtUtc).ToUnixTimeMilliseconds(),
                    h.Status.ToString(),
                    h.CorrelationId
                );
            }).ToList();

        if (!accountId.HasValue)
        {
            await _cache.SetAsync(cacheKey, mapped, TimeSpan.FromSeconds(60), cancellationToken: cancellationToken);
        }

        return mapped;
    }
}
