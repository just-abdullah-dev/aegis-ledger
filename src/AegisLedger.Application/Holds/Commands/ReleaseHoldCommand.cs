using AegisLedger.Application.Common.Dtos;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AegisLedger.Application.Holds.Commands;

public record ReleaseHoldCommand(
    Guid AccountId,
    Guid HoldId
) : IRequest<HoldResponseDto>;

public class ReleaseHoldCommandValidator : AbstractValidator<ReleaseHoldCommand>
{
    public ReleaseHoldCommandValidator()
    {
        RuleFor(x => x.AccountId)
            .NotEmpty()
            .WithMessage("AccountId is required.");

        RuleFor(x => x.HoldId)
            .NotEmpty()
            .WithMessage("HoldId is required.");
    }
}

public class ReleaseHoldCommandHandler : IRequestHandler<ReleaseHoldCommand, HoldResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cache;

    public ReleaseHoldCommandHandler(IApplicationDbContext context, ICacheService cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<HoldResponseDto> Handle(ReleaseHoldCommand request, CancellationToken cancellationToken)
    {
        var account = await _context.Accounts
            .Include(a => a.Holds)
            .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken)
            ?? throw new DomainException($"Account with ID '{request.AccountId}' was not found.");

        var hold = account.Holds.FirstOrDefault(h => h.Id == request.HoldId)
            ?? await _context.TransactionHolds.FirstOrDefaultAsync(h => h.Id == request.HoldId && h.AccountId == request.AccountId, cancellationToken)
            ?? throw new DomainException($"Hold with ID '{request.HoldId}' not found for account '{account.AccountNumber}'.");

        account.ReleaseHold(hold, DateTime.UtcNow);
        await _context.SaveChangesAsync(cancellationToken);

        // Invalidate read caches
        await _cache.RemoveAsync("accounts:list", cancellationToken);
        await _cache.RemoveAsync($"account:{request.AccountId}", cancellationToken);
        await _cache.RemoveAsync("holds:active", cancellationToken);

        return new HoldResponseDto(
            hold.Id,
            account.Id,
            hold.HeldAmount,
            hold.Reason.ToFriendlyString(),
            hold.Status.ToString(),
            account.AvailableBalance,
            hold.CreatedAtUtc,
            hold.ExpiresAtUtc,
            hold.CorrelationId
        );
    }
}
