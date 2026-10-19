using AegisLedger.Application.Common.Dtos;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Entities;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;

namespace AegisLedger.Application.UseCases.Transactions;

public record PostTransferCommand(
    string SourceAccountNumber,
    string DestinationAccountNumber,
    decimal Amount,
    string Memo,
    string IdempotencyKey,
    string? CorrelationId = null
);

public class PostTransferUseCase
{
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public PostTransferUseCase(
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        IUnitOfWork unitOfWork)
    {
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<TransactionDto> ExecuteAsync(PostTransferCommand command, CancellationToken cancellationToken = default)
    {
        // 1. Idempotency Check
        var existing = await _transactionRepository.GetByIdempotencyKeyAsync(command.IdempotencyKey, cancellationToken);
        if (existing is not null)
        {
            return MapToDto(existing);
        }

        // 2. Load accounts
        var sourceAccount = await _accountRepository.GetByAccountNumberAsync(command.SourceAccountNumber, cancellationToken)
            ?? throw new DomainException($"Source account '{command.SourceAccountNumber}' not found.");

        var destAccount = await _accountRepository.GetByAccountNumberAsync(command.DestinationAccountNumber, cancellationToken)
            ?? throw new DomainException($"Destination account '{command.DestinationAccountNumber}' not found.");

        // 3. Execute in atomic transaction
        return await _unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var refNum = $"TXN-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            var txn = new Transaction(
                refNum,
                command.IdempotencyKey,
                command.Amount,
                sourceAccount.Currency,
                command.Memo,
                "Transfer",
                sourceAccount.Id,
                destAccount.Id,
                sourceAccount.AccountNumber,
                destAccount.AccountNumber,
                command.CorrelationId
            );

            // Execute Debit (DR) on Source Account
            var sourcePostBal = sourceAccount.Debit(command.Amount);
            txn.AddJournalEntry(sourceAccount.Id, EntryType.Debit, command.Amount, sourcePostBal, $"Debit: {command.Memo}");

            // Execute Credit (CR) on Destination Account
            var destPostBal = destAccount.Credit(command.Amount);
            txn.AddJournalEntry(destAccount.Id, EntryType.Credit, command.Amount, destPostBal, $"Credit: {command.Memo}");

            // Post & Validate Invariant: SUM(Debits) == SUM(Credits)
            txn.Post();

            await _transactionRepository.AddAsync(txn, ct);
            await _accountRepository.UpdateAsync(sourceAccount, ct);
            await _accountRepository.UpdateAsync(destAccount, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            return MapToDto(txn);
        }, cancellationToken);
    }

    private static TransactionDto MapToDto(Transaction txn) => new(
        txn.Id,
        txn.ReferenceNumber,
        txn.CreatedAtUtc,
        txn.SenderAccountId,
        txn.ReceiverAccountId,
        txn.SenderAccountNumber,
        txn.ReceiverAccountNumber,
        txn.Amount,
        txn.Status.ToString(),
        txn.IdempotencyKey,
        txn.Description,
        txn.Category,
        txn.JournalEntries.Select(j => new JournalLineDto(
            j.Id,
            j.EntryType == EntryType.Debit ? "DEBIT" : "CREDIT",
            j.AccountId,
            string.Empty,
            string.Empty,
            j.Amount,
            j.PostBalance,
            j.Memo
        )).ToList(),
        txn.CorrelationId,
        txn.IsReversed
    );
}
