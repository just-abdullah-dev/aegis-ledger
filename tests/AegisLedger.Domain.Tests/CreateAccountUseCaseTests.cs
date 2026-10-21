using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Application.UseCases.Accounts;
using AegisLedger.Domain.Entities;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;

namespace AegisLedger.Domain.Tests;

public class CreateAccountUseCaseTests
{
    private class FakeAccountRepo : IAccountRepository
    {
        public readonly Dictionary<Guid, Account> Accounts = new();

        public Task AddAsync(Account account, CancellationToken cancellationToken = default)
        {
            Accounts[account.Id] = account;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<Account>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Account>>(Accounts.Values.ToList());
        }

        public Task<Account?> GetByAccountNumberAsync(string accountNumber, CancellationToken cancellationToken = default)
        {
            var acc = Accounts.Values.FirstOrDefault(a => string.Equals(a.AccountNumber, accountNumber, StringComparison.OrdinalIgnoreCase));
            return Task.FromResult(acc);
        }

        public Task<Account?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            Accounts.TryGetValue(id, out var acc);
            return Task.FromResult(acc);
        }

        public Task UpdateAsync(Account account, CancellationToken cancellationToken = default)
        {
            Accounts[account.Id] = account;
            return Task.CompletedTask;
        }
    }

    private class FakeTxnRepo : ITransactionRepository
    {
        public readonly List<Transaction> Transactions = new();

        public Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default)
        {
            Transactions.Add(transaction);
            return Task.CompletedTask;
        }

        public Task<Transaction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Transactions.FirstOrDefault(t => t.Id == id));
        }

        public Task<Transaction?> GetByIdempotencyKeyAsync(string idempotencyKey, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Transactions.FirstOrDefault(t => t.IdempotencyKey == idempotencyKey));
        }

        public Task<Transaction?> GetByReferenceNumberAsync(string referenceNumber, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Transactions.FirstOrDefault(t => t.ReferenceNumber == referenceNumber));
        }

        public Task<IReadOnlyList<Transaction>> GetRecentAsync(int limit = 50, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Transaction>>(Transactions.Take(limit).ToList());
        }

        public Task UpdateAsync(Transaction transaction, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }

    private class FakeUnitOfWork : IUnitOfWork
    {
        public Task<TResult> ExecuteInTransactionAsync<TResult>(Func<CancellationToken, Task<TResult>> operation, CancellationToken cancellationToken = default)
        {
            return operation(cancellationToken);
        }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(1);
        }
    }

    private class FakeCacheService : ICacheService
    {
        public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) => Task.FromResult<T?>(default);
        public Task SetAsync<T>(string key, T value, TimeSpan? slidingExpiration = null, TimeSpan? absoluteExpiration = null, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RemoveAsync(string key, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    [Fact]
    public async Task CreateAccount_WithZeroDeposit_CreatesActiveAccountWithoutTransactions()
    {
        var accRepo = new FakeAccountRepo();
        var txnRepo = new FakeTxnRepo();
        var uow = new FakeUnitOfWork();
        var cache = new FakeCacheService();
        var useCase = new CreateAccountUseCase(accRepo, txnRepo, uow, cache);

        var command = new CreateAccountCommand(
            AccountNumber: "ACC-5521-CHK",
            Name: "Quantum BioSystems Inc",
            Owner: "Dr. Sarah Connor",
            Category: "customer",
            Type: "Checking",
            Currency: "USD",
            InitialDeposit: 0m,
            DepositType: "ZeroBalance",
            SourceAccountId: null,
            RoutingCode: "021000021",
            Description: "Operating account for clinical trials",
            TaxId: "12-3456789",
            CustomerEmail: "sarah@quantumbio.com",
            CustomerPhone: "+1-555-0192",
            BranchCode: "NYC-BR01",
            AmlRiskTier: "Low"
        );

        var result = await useCase.ExecuteAsync(command);

        Assert.NotNull(result);
        Assert.Equal("ACC-5521-CHK", result.Account.AccountNumber);
        Assert.Equal("Quantum BioSystems Inc", result.Account.Name);
        Assert.Equal(0m, result.Account.LedgerBalance);
        Assert.Equal(0m, result.Account.AvailableBalance);
        Assert.Null(result.InitialFundingTransaction);
        Assert.Empty(txnRepo.Transactions);
    }

    [Fact]
    public async Task CreateAccount_WithCashVaultDeposit_CreatesAtomicDoubleEntryTransaction()
    {
        var accRepo = new FakeAccountRepo();
        var txnRepo = new FakeTxnRepo();
        var uow = new FakeUnitOfWork();
        var cache = new FakeCacheService();

        // Seed central cash vault
        var vaultCash = new Account("SYS-1010-CASH", "Federal Reserve Vault Cash", "Aegis Treasury", AccountCategory.System, AccountType.Asset, "USD", 10000000m);
        await accRepo.AddAsync(vaultCash);

        var useCase = new CreateAccountUseCase(accRepo, txnRepo, uow, cache);

        var command = new CreateAccountCommand(
            AccountNumber: "ACC-7788-SAV",
            Name: "Apex High-Yield Wealth Reserve",
            Owner: "Alexander Vance",
            Category: "customer",
            Type: "Savings",
            Currency: "USD",
            InitialDeposit: 50000m,
            DepositType: "CashVault",
            SourceAccountId: null,
            RoutingCode: "021000021",
            Description: "Executive wealth management deposit",
            TaxId: "98-7654321",
            CustomerEmail: "alexander@vance.com",
            CustomerPhone: "+1-555-8833",
            BranchCode: "NYC-BR01",
            AmlRiskTier: "Low"
        );

        var result = await useCase.ExecuteAsync(command);

        Assert.NotNull(result);
        Assert.Equal(50000m, result.Account.LedgerBalance);
        Assert.NotNull(result.InitialFundingTransaction);
        Assert.Equal(50000m, result.InitialFundingTransaction.Amount);
        Assert.Single(txnRepo.Transactions);

        // Verify fundamental ledger invariant: Sum(Debit) == Sum(Credit)
        var txn = txnRepo.Transactions[0];
        var debits = txn.JournalEntries.Where(j => j.EntryType == EntryType.Debit).Sum(j => j.Amount);
        var credits = txn.JournalEntries.Where(j => j.EntryType == EntryType.Credit).Sum(j => j.Amount);
        Assert.Equal(debits, credits);
        Assert.Equal(50000m, debits);
    }

    [Fact]
    public async Task CreateAccount_WithInternalTransfer_DebitsSourceAccountAndCreditsNewAccount()
    {
        var accRepo = new FakeAccountRepo();
        var txnRepo = new FakeTxnRepo();
        var uow = new FakeUnitOfWork();
        var cache = new FakeCacheService();

        // Seed source customer account
        var sourceAccount = new Account("ACC-1111-CHK", "Corporate Master Operating", "Elena Rostova", AccountCategory.Customer, AccountType.Checking, "USD", 200000m);
        await accRepo.AddAsync(sourceAccount);

        var useCase = new CreateAccountUseCase(accRepo, txnRepo, uow, cache);

        var command = new CreateAccountCommand(
            AccountNumber: null, // Auto-generate
            Name: "Subsidiary Payroll Escrow",
            Owner: "Elena Rostova",
            Category: "customer",
            Type: "Escrow",
            Currency: "USD",
            InitialDeposit: 75000m,
            DepositType: "InternalTransfer",
            SourceAccountId: sourceAccount.AccountNumber,
            RoutingCode: "021000021",
            Description: "Payroll escrow ring-fenced fund",
            TaxId: "45-6789123",
            CustomerEmail: "elena@apex.com",
            CustomerPhone: "+1-555-1212",
            BranchCode: "NYC-BR01",
            AmlRiskTier: "Low"
        );

        var result = await useCase.ExecuteAsync(command);

        Assert.NotNull(result);
        Assert.StartsWith("ACC-", result.Account.AccountNumber);
        Assert.EndsWith("-ESC", result.Account.AccountNumber);
        Assert.Equal(75000m, result.Account.LedgerBalance);

        // Source account was debited
        Assert.Equal(125000m, sourceAccount.LedgerBalance);
    }

    [Fact]
    public async Task CreateAccount_SystemChartOfAccounts_CreatesSystemLedger()
    {
        var accRepo = new FakeAccountRepo();
        var txnRepo = new FakeTxnRepo();
        var uow = new FakeUnitOfWork();
        var cache = new FakeCacheService();
        var useCase = new CreateAccountUseCase(accRepo, txnRepo, uow, cache);

        var command = new CreateAccountCommand(
            AccountNumber: "SYS-5020-REV",
            Name: "Foreign Exchange Trading Spread Revenue",
            Owner: "FX Desk Operations",
            Category: "system",
            Type: "Revenue",
            Currency: "USD",
            InitialDeposit: 0m,
            DepositType: "ZeroBalance",
            SourceAccountId: null,
            RoutingCode: "000000000",
            Description: "Institutional FX markups and spread income",
            TaxId: null,
            CustomerEmail: null,
            CustomerPhone: null,
            BranchCode: "LDN-DESK",
            AmlRiskTier: null
        );

        var result = await useCase.ExecuteAsync(command);

        Assert.NotNull(result);
        Assert.Equal("SYS-5020-REV", result.Account.AccountNumber);
        Assert.Equal("system", result.Account.Category);
        Assert.Equal("Revenue", result.Account.Type);
    }

    [Fact]
    public async Task CreateAccount_WithInsufficientFundsInSource_ThrowsInsufficientFundsException()
    {
        var accRepo = new FakeAccountRepo();
        var txnRepo = new FakeTxnRepo();
        var uow = new FakeUnitOfWork();
        var cache = new FakeCacheService();

        var poorAccount = new Account("ACC-2222-CHK", "Low Balance LLC", "Bob Smith", AccountCategory.Customer, AccountType.Checking, "USD", 500m);
        await accRepo.AddAsync(poorAccount);

        var useCase = new CreateAccountUseCase(accRepo, txnRepo, uow, cache);

        var command = new CreateAccountCommand(
            AccountNumber: "ACC-3333-CHK",
            Name: "Failed Fund Account",
            Owner: "Bob Smith",
            Category: "customer",
            Type: "Checking",
            Currency: "USD",
            InitialDeposit: 10000m, // Exceeds 500m
            DepositType: "InternalTransfer",
            SourceAccountId: poorAccount.AccountNumber,
            RoutingCode: "021000021",
            Description: null,
            TaxId: null,
            CustomerEmail: null,
            CustomerPhone: null,
            BranchCode: null,
            AmlRiskTier: null
        );

        await Assert.ThrowsAsync<InsufficientFundsException>(() => useCase.ExecuteAsync(command));
    }
}
