using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AegisLedger.Infrastructure.Jobs;

public class ExpiredHoldReleaseJob
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cache;
    private readonly ITransactionHoldRepository _fallbackHoldRepo;
    private readonly IAccountRepository _fallbackAccountRepo;
    private readonly ILogger<ExpiredHoldReleaseJob> _logger;

    public ExpiredHoldReleaseJob(
        IApplicationDbContext context,
        ICacheService cache,
        ITransactionHoldRepository fallbackHoldRepo,
        IAccountRepository fallbackAccountRepo,
        ILogger<ExpiredHoldReleaseJob> logger)
    {
        _context = context;
        _cache = cache;
        _fallbackHoldRepo = fallbackHoldRepo;
        _fallbackAccountRepo = fallbackAccountRepo;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        _logger.LogInformation("Scanning for expired active transaction holds at {UtcNow:u}...", now);

        int releasedCount = 0;

        try
        {
            var expiredHolds = await _context.TransactionHolds
                .Include(h => h.Account)
                .Where(h => h.Status == HoldStatus.Active && h.ExpiresAtUtc <= now)
                .ToListAsync(cancellationToken);

            foreach (var hold in expiredHolds)
            {
                if (hold.Account is not null)
                {
                    hold.Account.ReleaseHold(hold, now);
                    releasedCount++;
                    _logger.LogInformation(
                        "Auto-released expired hold '{HoldId}' ({Amount:C}) on account '{AccountNumber}'. New Available Liquidity: {Available:C}.",
                        hold.Id, hold.HeldAmount, hold.Account.AccountNumber, hold.Account.AvailableBalance);
                }
                else
                {
                    hold.Release(now);
                    releasedCount++;
                }
            }

            if (releasedCount > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
                await _cache.RemoveAsync("accounts:list", cancellationToken);
                await _cache.RemoveAsync("holds:active", cancellationToken);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not process expired holds via DbContext. Checking in-memory repository store.");
            var inMemoryExpired = await _fallbackHoldRepo.GetExpiredActiveHoldsAsync(now, cancellationToken);
            foreach (var hold in inMemoryExpired)
            {
                var account = await _fallbackAccountRepo.GetByIdAsync(hold.AccountId, cancellationToken);
                if (account is not null)
                {
                    account.ReleaseHold(hold, now);
                    releasedCount++;
                    _logger.LogInformation(
                        "[In-Memory] Auto-released expired hold '{HoldId}' ({Amount:C}) on account '{AccountNumber}'.",
                        hold.Id, hold.HeldAmount, account.AccountNumber);
                }
            }

            if (releasedCount > 0)
            {
                await _cache.RemoveAsync("accounts:list", cancellationToken);
                await _cache.RemoveAsync("holds:active", cancellationToken);
            }
        }

        _logger.LogInformation("Expired hold release job completed. Released {Count} holds.", releasedCount);
    }
}
