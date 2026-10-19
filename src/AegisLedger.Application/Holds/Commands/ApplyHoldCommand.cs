using AegisLedger.Application.Common.Dtos;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AegisLedger.Application.Holds.Commands;

public record ApplyHoldCommand(
    Guid AccountId,
    decimal Amount,
    HoldReason Reason,
    int TtlMinutes,
    string? CorrelationId = null
) : IRequest<HoldResponseDto>;

public class ApplyHoldCommandValidator : AbstractValidator<ApplyHoldCommand>
{
    public ApplyHoldCommandValidator()
    {
        RuleFor(x => x.AccountId)
            .NotEmpty()
            .WithMessage("AccountId is required.");

        RuleFor(x => x.Amount)
            .GreaterThan(0m)
            .WithMessage("Hold amount must be greater than $0.00.");

        RuleFor(x => x.TtlMinutes)
            .GreaterThan(0)
            .WithMessage("Hold TTL minutes must be greater than 0.")
            .LessThanOrEqualTo(1440 * 30) // Max 30 days
            .WithMessage("Hold TTL cannot exceed 30 days.");
    }
}

public class ApplyHoldCommandHandler : IRequestHandler<ApplyHoldCommand, HoldResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cache;

    public ApplyHoldCommandHandler(IApplicationDbContext context, ICacheService cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<HoldResponseDto> Handle(ApplyHoldCommand request, CancellationToken cancellationToken)
    {
        var account = await _context.Accounts
            .Include(a => a.Holds)
            .FirstOrDefaultAsync(a => a.Id == request.AccountId, cancellationToken)
            ?? throw new DomainException($"Account with ID '{request.AccountId}' was not found.");

        var correlationId = string.IsNullOrWhiteSpace(request.CorrelationId)
            ? $"corr-{Guid.NewGuid():N}"
            : request.CorrelationId.Trim();

        var hold = account.ApplyHold(
            request.Amount,
            request.Reason,
            TimeSpan.FromMinutes(request.TtlMinutes),
            correlationId
        );

        _context.TransactionHolds.Add(hold);
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
