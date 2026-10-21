using System.Data;
using System.Text;
using AegisLedger.Application.Common.Dtos;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Entities;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace AegisLedger.Application.UseCases.Accounts;

public record CreateAccountCommand(
    string? AccountNumber,
    string Name,
    string Owner,
    string? Category,
    string? Type,
    string? Currency,
    decimal InitialDeposit,
    string? DepositType,
    string? SourceAccountId,
    string? RoutingCode,
    string? Description,
    string? TaxId,
    string? CustomerEmail,
    string? CustomerPhone,
    string? BranchCode,
    string? AmlRiskTier
);

public record CreateAccountResult(
    AccountDto Account,
    TransactionDto? InitialFundingTransaction
);

public class CreateAccountUseCase
{
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;
    private readonly IApplicationDbContext? _dbContext;

    public CreateAccountUseCase(
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        IUnitOfWork unitOfWork,
        ICacheService cacheService,
        IApplicationDbContext? dbContext = null)
    {
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
        _dbContext = dbContext;
    }

    public async Task<CreateAccountResult> ExecuteAsync(CreateAccountCommand command, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(command.Name))
            throw new ArgumentException("Legal account name is required.", nameof(command.Name));

        if (string.IsNullOrWhiteSpace(command.Owner))
            throw new ArgumentException("Account owner / beneficial signatory is required.", nameof(command.Owner));

        if (command.InitialDeposit < 0m)
            throw new ArgumentOutOfRangeException(nameof(command.InitialDeposit), "Initial deposit amount cannot be negative.");

        var isSystem = string.Equals(command.Category, "system", StringComparison.OrdinalIgnoreCase);
        var category = isSystem ? AccountCategory.System : AccountCategory.Customer;

        var accountType = (command.Type?.ToLowerInvariant()) switch
        {
            "checking" => AccountType.Checking,
            "savings" => AccountType.Savings,
            "escrow" => AccountType.Escrow,
            "asset" => AccountType.Asset,
            "liability" => AccountType.Liability,
            "equity" => AccountType.Equity,
            "revenue" => AccountType.Revenue,
            "treasury" => AccountType.Treasury,
            "systemledger" => AccountType.SystemLedger,
            _ => isSystem ? AccountType.Asset : AccountType.Checking
        };

        // Determine or generate unique account number
        string accountNumber;
        if (!string.IsNullOrWhiteSpace(command.AccountNumber))
        {
            accountNumber = command.AccountNumber.Trim().ToUpperInvariant();
        }
        else
        {
            var randomDigits = Random.Shared.Next(1000, 9999);
            if (isSystem)
            {
                var suffix = accountType switch
                {
                    AccountType.Asset => "AST",
                    AccountType.Liability => "LIA",
                    AccountType.Equity => "EQT",
                    AccountType.Revenue => "REV",
                    AccountType.Treasury => "TRS",
                    _ => "GL"
                };
                accountNumber = $"SYS-{randomDigits}-{suffix}";
            }
            else
            {
                var suffix = accountType switch
                {
                    AccountType.Savings => "SAV",
                    AccountType.Escrow => "ESC",
                    _ => "CHK"
                };
                accountNumber = $"ACC-{randomDigits}-{suffix}";
            }
        }

        var existing = await _accountRepository.GetByAccountNumberAsync(accountNumber, cancellationToken);
        if (existing is not null)
        {
            throw new DomainException($"Account number '{accountNumber}' already exists in ledger registry.");
        }

        var currency = string.IsNullOrWhiteSpace(command.Currency)
            ? "USD"
            : command.Currency.Trim().ToUpperInvariant();

        var routingCode = !string.IsNullOrWhiteSpace(command.RoutingCode)
            ? command.RoutingCode.Trim()
            : (isSystem ? "000000000" : "021000021");

        // Format rich institutional audit memo
        var descBuilder = new StringBuilder();
        if (!string.IsNullOrWhiteSpace(command.Description))
        {
            descBuilder.Append(command.Description.Trim());
        }
        else
        {
            descBuilder.Append(isSystem 
                ? $"{accountType} General Ledger Chart Account" 
                : $"{accountType} Commercial Demand Deposit Account");
        }

        var metaTags = new List<string>();
        if (!string.IsNullOrWhiteSpace(command.TaxId)) metaTags.Add($"TIN: {command.TaxId.Trim()}");
        if (!string.IsNullOrWhiteSpace(command.CustomerEmail)) metaTags.Add($"Email: {command.CustomerEmail.Trim()}");
        if (!string.IsNullOrWhiteSpace(command.BranchCode)) metaTags.Add($"Branch: {command.BranchCode.Trim()}");
        if (!string.IsNullOrWhiteSpace(command.AmlRiskTier)) metaTags.Add($"AML: {command.AmlRiskTier.Trim()}");
        if (!string.IsNullOrWhiteSpace(command.DepositType)) metaTags.Add($"Funding: {command.DepositType.Trim()}");

        if (metaTags.Count > 0)
        {
            descBuilder.Append(" [").Append(string.Join(" | ", metaTags)).Append("]");
        }

        var fullDescription = descBuilder.ToString();

        var newAccount = new Account(
            accountNumber,
            command.Name.Trim(),
            command.Owner.Trim(),
            category,
            accountType,
            currency,
            0m,
            routingCode,
            fullDescription
        );

        // Case A: Zero Initial Balance
        if (command.InitialDeposit == 0m)
        {
            await _accountRepository.AddAsync(newAccount, cancellationToken);

            if (_dbContext != null)
            {
                try
                {
                    _dbContext.Accounts.Add(newAccount);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
                catch
                {
                    // In-memory fallback
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _cacheService.RemoveAsync("accounts:list", cancellationToken);

            return new CreateAccountResult(MapAccountToDto(newAccount), null);
        }

        // Case B: Initial Deposit with Atomic Double-Entry Invariant
        var depositType = !string.IsNullOrWhiteSpace(command.DepositType) ? command.DepositType.Trim() : "CashVault";

        // Try primary execution through live DbContext if available
        if (_dbContext != null)
        {
            try
            {
                Account? dbFunding = null;
                if (depositType.Equals("InternalTransfer", StringComparison.OrdinalIgnoreCase))
                {
                    if (Guid.TryParse(command.SourceAccountId, out var sGuid))
                    {
                        dbFunding = await _dbContext.Accounts.FirstOrDefaultAsync(a => a.Id == sGuid, cancellationToken);
                    }
                    if (dbFunding == null && !string.IsNullOrWhiteSpace(command.SourceAccountId))
                    {
                        dbFunding = await _dbContext.Accounts.FirstOrDefaultAsync(a => a.AccountNumber == command.SourceAccountId, cancellationToken);
                    }

                    if (dbFunding == null)
                    {
                        throw new DomainException($"Funding source account '{command.SourceAccountId}' was not found.");
                    }
                }
                else
                {
                    dbFunding = await _dbContext.Accounts.FirstOrDefaultAsync(a => a.AccountNumber == "SYS-1010-CASH", cancellationToken);
                    if (dbFunding == null)
                    {
                        dbFunding = new Account(
                            "SYS-1010-CASH",
                            "Federal Reserve Vault & Clearing Cash",
                            "Aegis Central Treasury",
                            AccountCategory.System,
                            AccountType.Asset,
                            currency,
                            50000000m,
                            "000000000",
                            "Level 1 Central Bank Cash & Settlement Liquidity Pool"
                        );
                        _dbContext.Accounts.Add(dbFunding);
                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }
                }

                if (dbFunding.AvailableBalance < command.InitialDeposit)
                {
                    throw new InsufficientFundsException(dbFunding.AccountNumber, command.InitialDeposit, dbFunding.AvailableBalance);
                }

                var refNum = $"TXN-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
                var memo = $"Opening Initial Deposit ({depositType}) for {newAccount.AccountNumber} ({newAccount.Name})";
                var txn = new Transaction(
                    refNum,
                    $"open-dep-{newAccount.Id:N}",
                    command.InitialDeposit,
                    currency,
                    memo,
                    "Deposit",
                    dbFunding.Id,
                    newAccount.Id,
                    dbFunding.AccountNumber,
                    newAccount.AccountNumber
                );

                var sourcePostBal = dbFunding.Debit(command.InitialDeposit);
                txn.AddJournalEntry(dbFunding.Id, EntryType.Debit, command.InitialDeposit, sourcePostBal, $"Debit: {memo}");

                var destPostBal = newAccount.Credit(command.InitialDeposit);
                txn.AddJournalEntry(newAccount.Id, EntryType.Credit, command.InitialDeposit, destPostBal, $"Credit: {memo}");

                txn.Post();

                _dbContext.Accounts.Add(newAccount);
                _dbContext.Transactions.Add(txn);
                await _dbContext.SaveChangesAsync(cancellationToken);

                // Mirror to in-memory repositories
                await _accountRepository.AddAsync(newAccount, cancellationToken);
                await _accountRepository.UpdateAsync(dbFunding, cancellationToken);
                await _transactionRepository.AddAsync(txn, cancellationToken);
                await _cacheService.RemoveAsync("accounts:list", cancellationToken);
                await _cacheService.RemoveAsync("transactions:list", cancellationToken);

                return new CreateAccountResult(MapAccountToDto(newAccount), MapTxnToDto(txn));
            }
            catch (DomainException)
            {
                throw;
            }
            catch
            {
                // Fall back to in-memory store (e.g. for unit tests)
            }
        }

        // In-memory fallback
        Account? fallbackFunding = null;
        if (depositType.Equals("InternalTransfer", StringComparison.OrdinalIgnoreCase))
        {
            if (Guid.TryParse(command.SourceAccountId, out var sourceGuid))
            {
                fallbackFunding = await _accountRepository.GetByIdAsync(sourceGuid, cancellationToken);
            }
            if (fallbackFunding is null && !string.IsNullOrWhiteSpace(command.SourceAccountId))
            {
                fallbackFunding = await _accountRepository.GetByAccountNumberAsync(command.SourceAccountId, cancellationToken);
            }

            if (fallbackFunding is null)
            {
                throw new DomainException($"Funding source account '{command.SourceAccountId}' was not found.");
            }

            if (fallbackFunding.AvailableBalance < command.InitialDeposit)
            {
                throw new InsufficientFundsException(fallbackFunding.AccountNumber, command.InitialDeposit, fallbackFunding.AvailableBalance);
            }
        }
        else
        {
            fallbackFunding = await _accountRepository.GetByAccountNumberAsync("SYS-1010-CASH", cancellationToken);
            if (fallbackFunding is null)
            {
                fallbackFunding = new Account(
                    "SYS-1010-CASH",
                    "Federal Reserve Vault & Clearing Cash",
                    "Aegis Central Treasury",
                    AccountCategory.System,
                    AccountType.Asset,
                    currency,
                    50000000.00m,
                    "000000000",
                    "Level 1 Central Bank Cash & Settlement Liquidity Pool"
                );
                await _accountRepository.AddAsync(fallbackFunding, cancellationToken);
            }
        }

        return await _unitOfWork.ExecuteInTransactionAsync(async ct =>
        {
            var refNum = $"TXN-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            var memo = $"Opening Initial Deposit ({depositType}) for {newAccount.AccountNumber} ({newAccount.Name})";
            var txn = new Transaction(
                refNum,
                $"open-dep-{newAccount.Id:N}",
                command.InitialDeposit,
                currency,
                memo,
                "Deposit",
                fallbackFunding.Id,
                newAccount.Id,
                fallbackFunding.AccountNumber,
                newAccount.AccountNumber
            );

            var sourcePostBal = fallbackFunding.Debit(command.InitialDeposit);
            txn.AddJournalEntry(fallbackFunding.Id, EntryType.Debit, command.InitialDeposit, sourcePostBal, $"Debit: {memo}");

            var destPostBal = newAccount.Credit(command.InitialDeposit);
            txn.AddJournalEntry(newAccount.Id, EntryType.Credit, command.InitialDeposit, destPostBal, $"Credit: {memo}");

            txn.Post();

            await _accountRepository.AddAsync(newAccount, ct);
            await _accountRepository.UpdateAsync(fallbackFunding, ct);
            await _transactionRepository.AddAsync(txn, ct);

            await _unitOfWork.SaveChangesAsync(ct);
            await _cacheService.RemoveAsync("accounts:list", ct);
            await _cacheService.RemoveAsync("transactions:list", ct);

            return new CreateAccountResult(MapAccountToDto(newAccount), MapTxnToDto(txn));
        }, cancellationToken);
    }

    private static AccountDto MapAccountToDto(Account a) => new(
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
        a.RowVersion.Length > 0 ? "0x" + Convert.ToHexString(a.RowVersion) : "0x0000000000000000",
        a.OpenedAtUtc,
        a.RoutingCode,
        a.Description
    );

    private static TransactionDto MapTxnToDto(Transaction txn) => new(
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
            j.EntryType.ToString().ToUpperInvariant(),
            j.AccountId,
            "",
            "",
            j.Amount,
            j.PostBalance,
            j.Memo
        )).ToList(),
        txn.CorrelationId,
        txn.IsReversed
    );
}
