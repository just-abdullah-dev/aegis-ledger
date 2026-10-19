using System.Data;
using AegisLedger.Application.Common.Dtos;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Entities;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AegisLedger.Application.Transactions.Commands;

public record PostTransactionCommand(
    Guid SourceAccountId,
    Guid DestinationAccountId,
    decimal Amount,
    string Description,
    string? IdempotencyKey = null
) : IRequest<TransactionResponseDto>;

public class PostTransactionCommandHandler : IRequestHandler<PostTransactionCommand, TransactionResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICacheService _cache;

    public PostTransactionCommandHandler(IApplicationDbContext context, ICacheService cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<TransactionResponseDto> Handle(PostTransactionCommand request, CancellationToken cancellationToken)
    {
        var idempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey)
            ? $"idem-{Guid.NewGuid():N}"
            : request.IdempotencyKey.Trim();

        // Check if transaction with this idempotency key was already posted
        var existingTxn = await _context.Transactions
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.IdempotencyKey == idempotencyKey, cancellationToken);

        if (existingTxn is not null)
        {
            return new TransactionResponseDto(
                existingTxn.Id,
                existingTxn.ReferenceNumber,
                existingTxn.Status.ToString(),
                0.00m
            );
        }

        // Execute inside SERIALIZABLE transaction to prevent phantom reads & race conditions
        await using var dbTransaction = await _context.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        try
        {
            // Fetch Source and Destination accounts with row locks
            var sourceAccount = await _context.Accounts
                .Include(a => a.Holds)
                .FirstOrDefaultAsync(a => a.Id == request.SourceAccountId, cancellationToken)
                ?? throw new DomainException($"Source account with ID '{request.SourceAccountId}' was not found.");

            var destAccount = await _context.Accounts
                .Include(a => a.Holds)
                .FirstOrDefaultAsync(a => a.Id == request.DestinationAccountId, cancellationToken)
                ?? throw new DomainException($"Destination account with ID '{request.DestinationAccountId}' was not found.");

            // Currency matching invariant check
            if (sourceAccount.Currency != destAccount.Currency)
            {
                throw new CurrencyMismatchException(sourceAccount.Currency, destAccount.Currency);
            }

            // Debit Source and Credit Destination
            var sourcePostBal = sourceAccount.Debit(request.Amount);
            var destPostBal = destAccount.Credit(request.Amount);

            // Generate unique reference number (TXN-YYYYMMDD-XXXXXXXX)
            var refNum = $"TXN-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            var correlationId = $"corr-{Guid.NewGuid():N}";

            var transaction = new Transaction(
                referenceNumber: refNum,
                idempotencyKey: idempotencyKey,
                amount: request.Amount,
                currency: sourceAccount.Currency,
                description: request.Description,
                category: "Transfer",
                senderAccountId: sourceAccount.Id,
                receiverAccountId: destAccount.Id,
                senderAccountNumber: sourceAccount.AccountNumber,
                receiverAccountNumber: destAccount.AccountNumber,
                correlationId: correlationId
            );

            // Add Balanced Double-Entry Journal Lines
            transaction.AddJournalEntry(
                sourceAccount.Id,
                EntryType.Debit,
                request.Amount,
                sourcePostBal,
                $"DR: {request.Description}"
            );

            transaction.AddJournalEntry(
                destAccount.Id,
                EntryType.Credit,
                request.Amount,
                destPostBal,
                $"CR: {request.Description}"
            );

            // Enforce Domain Solvency Invariant: SUM(Debits) == SUM(Credits)
            transaction.Post();

            // Track entities
            _context.Transactions.Add(transaction);

            // Save and commit
            await _context.SaveChangesAsync(cancellationToken);
            await dbTransaction.CommitAsync(cancellationToken);

            // Invalidate read caches
            await _cache.RemoveAsync("accounts:list", cancellationToken);
            await _cache.RemoveAsync($"account:{sourceAccount.Id}", cancellationToken);
            await _cache.RemoveAsync($"account:{destAccount.Id}", cancellationToken);
            await _cache.RemoveAsync("journal:feed", cancellationToken);

            return new TransactionResponseDto(
                transaction.Id,
                transaction.ReferenceNumber,
                transaction.Status.ToString(),
                0.00m
            );
        }
        catch (DbUpdateConcurrencyException ex)
        {
            await dbTransaction.RollbackAsync(cancellationToken);
            throw new DomainConcurrencyException(
                "A concurrent modification conflict occurred while updating account balances (RowVersion token mismatch). Please retry the transaction.",
                ex
            );
        }
        catch
        {
            await dbTransaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
