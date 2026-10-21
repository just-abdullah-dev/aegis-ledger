using AegisLedger.Domain.Entities;
using AegisLedger.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AegisLedger.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider, CancellationToken cancellationToken = default)
    {
        using var scope = serviceProvider.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AegisLedgerDbContext>>();
        var context = scope.ServiceProvider.GetService<AegisLedgerDbContext>();

        if (context == null)
        {
            return;
        }

        try
        {
            // Create database tables if they do not exist
            await context.Database.EnsureCreatedAsync(cancellationToken);

            // Seed canonical accounts if empty
            if (!await context.Accounts.AnyAsync(cancellationToken))
            {
                logger.LogInformation("Database is uninitialized. Seeding canonical Core Banking accounts...");

                var acc1 = new Account(
                    "ACC-8029-CHK",
                    "Apex Global Logistics LLC",
                    "Elena Rostova",
                    AccountCategory.Customer,
                    AccountType.Checking,
                    "USD",
                    3840250.00m,
                    "021000021",
                    "Commercial operating treasury account for automated wire settlements"
                );
                acc1.ApplyHold(150000.00m, HoldReason.CardAuthPreCheck, TimeSpan.FromHours(24), "seed-hold-1");

                var acc2 = new Account(
                    "ACC-4109-ESC",
                    "Meridian Capital Escrow Holdings",
                    "Marcus Sterling",
                    AccountCategory.Customer,
                    AccountType.Escrow,
                    "USD",
                    2950000.00m,
                    "021000021",
                    "Special purpose institutional acquisition escrow fund"
                );
                acc2.ApplyHold(95000.00m, HoldReason.EscrowMilestoneGuarantee, TimeSpan.FromHours(48), "seed-hold-2");

                var acc3 = new Account(
                    "ACC-1940-SAV",
                    "Crestline Asset Management",
                    "Sarah Jenkins",
                    AccountCategory.Customer,
                    AccountType.Savings,
                    "USD",
                    2420440.00m,
                    "021000021",
                    "Interest-bearing asset management liquidity pool"
                );
                acc3.ApplyHold(55660.00m, HoldReason.ChequeClearance, TimeSpan.FromHours(12), "seed-hold-3");

                var acc4 = new Account(
                    "ACC-6238-CHK",
                    "Vanguard Biopharma Inc",
                    "Dr. Tariq Mahmood",
                    AccountCategory.Customer,
                    AccountType.Checking,
                    "USD",
                    1845100.00m,
                    "021000021",
                    "Primary clinical research disbursement account"
                );
                acc4.ApplyHold(40000.00m, HoldReason.AmlFraudReview, TimeSpan.FromHours(72), "seed-hold-4");

                var acc5 = new Account(
                    "ACC-3310-CHK",
                    "Nordic Freight & Cargo Ltd",
                    "Astrid Lindgren",
                    AccountCategory.Customer,
                    AccountType.Checking,
                    "USD",
                    875100.00m,
                    "021000021",
                    "Cross-border maritime clearing account"
                );

                var acc6 = new Account(
                    "ACC-9902-SAV",
                    "Helios Renewable Ventures",
                    "Lucas Chen",
                    AccountCategory.Customer,
                    AccountType.Savings,
                    "USD",
                    520000.00m,
                    "021000021",
                    "Project finance escrow savings account"
                );
                acc6.Freeze();

                var sys1 = new Account(
                    "SYS-1010-CASH",
                    "Federal Reserve Vault & Clearing Cash",
                    "Aegis Central Treasury",
                    AccountCategory.System,
                    AccountType.Asset,
                    "USD",
                    15800000.00m,
                    "000000000",
                    "Level 1 Central Bank Cash & Settlement Liquidity Pool"
                );

                var sys2 = new Account(
                    "SYS-2010-DEP",
                    "Customer Deposit Liabilities (General)",
                    "Core Banking Engine",
                    AccountCategory.System,
                    AccountType.Liability,
                    "USD",
                    12450890.00m,
                    "000000000",
                    "Aggregate liability control account matching all customer balances"
                );

                var sys3 = new Account(
                    "SYS-3010-EQT",
                    "Tier-1 Regulatory Paid-In Capital",
                    "Board of Governors",
                    AccountCategory.System,
                    AccountType.Equity,
                    "USD",
                    3000000.00m,
                    "000000000",
                    "Statutory capital base complying with Basel III Tier 1 reserves"
                );

                var sys4 = new Account(
                    "SYS-4010-REV",
                    "Net Interbank Settlement & Wire Fee Revenue",
                    "Revenue Operations",
                    AccountCategory.System,
                    AccountType.Revenue,
                    "USD",
                    349110.00m,
                    "000000000",
                    "Earned interchange, wire processing, and ledger transaction fees"
                );

                context.Accounts.AddRange(acc1, acc2, acc3, acc4, acc5, acc6, sys1, sys2, sys3, sys4);
                await context.SaveChangesAsync(cancellationToken);

                // Seed initial balanced transactions & journal entries
                var txn = new Transaction(
                    "TXN-20261019-91823741",
                    "idem-seed-initial-wire",
                    150000.00m,
                    "USD",
                    "Inter-account liquidity rebalancing",
                    "WireTransfer",
                    acc1.Id,
                    acc2.Id,
                    acc1.AccountNumber,
                    acc2.AccountNumber,
                    "corr-seed-initial"
                );

                txn.AddJournalEntry(acc1.Id, EntryType.Debit, 150000.00m, acc1.LedgerBalance, "Wire Settlement Outflow");
                txn.AddJournalEntry(acc2.Id, EntryType.Credit, 150000.00m, acc2.LedgerBalance, "Wire Settlement Inflow");
                txn.Post();

                context.Transactions.Add(txn);
                await context.SaveChangesAsync(cancellationToken);

                logger.LogInformation("Database seeded successfully with 6 canonical accounts and initial journal entries.");
            }

            // Ensure canonical system COA accounts exist in database
            var systemCOA = new[]
            {
                new Account("SYS-1010-CASH", "Federal Reserve Vault & Clearing Cash", "Aegis Central Treasury", AccountCategory.System, AccountType.Asset, "USD", 15800000.00m, "000000000", "Level 1 Central Bank Cash & Settlement Liquidity Pool"),
                new Account("SYS-2010-DEP", "Customer Deposit Liabilities (General)", "Core Banking Engine", AccountCategory.System, AccountType.Liability, "USD", 12450890.00m, "000000000", "Aggregate liability control account matching all customer balances"),
                new Account("SYS-3010-EQT", "Tier-1 Regulatory Paid-In Capital", "Board of Governors", AccountCategory.System, AccountType.Equity, "USD", 3000000.00m, "000000000", "Statutory capital base complying with Basel III Tier 1 reserves"),
                new Account("SYS-4010-REV", "Net Interbank Settlement & Wire Fee Revenue", "Revenue Operations", AccountCategory.System, AccountType.Revenue, "USD", 349110.00m, "000000000", "Earned interchange, wire processing, and ledger transaction fees")
            };

            foreach (var sysAcc in systemCOA)
            {
                if (!await context.Accounts.AnyAsync(a => a.AccountNumber == sysAcc.AccountNumber, cancellationToken))
                {
                    context.Accounts.Add(sysAcc);
                }
            }
            await context.SaveChangesAsync(cancellationToken);

            // Seed canonical users and roles into SQL Server if empty
            if (!await context.Users.AnyAsync(cancellationToken))
            {
                logger.LogInformation("Seeding canonical RBAC Users table in SQL Server...");

                var admin = new User(
                    "admin",
                    "alex.admin@aegisledger.bank",
                    "Alex Admin",
                    "SystemAdmin",
                    User.HashPassword("Admin123!")
                );

                var teller = new User(
                    "teller",
                    "sarah.teller@aegisledger.bank",
                    "Sarah Teller",
                    "BankTeller",
                    User.HashPassword("Teller123!")
                );

                var auditor = new User(
                    "auditor",
                    "elena.rostova@aegisledger.bank",
                    "Elena Rostova",
                    "ComplianceAuditor",
                    User.HashPassword("Auditor123!")
                );

                var customer = new User(
                    "customer",
                    "customer@aegisledger.bank",
                    "Retail Customer",
                    "Customer",
                    User.HashPassword("Customer123!")
                );

                context.Users.AddRange(admin, teller, auditor, customer);
                await context.SaveChangesAsync(cancellationToken);

                logger.LogInformation("Users table initialized with canonical roles (SystemAdmin, BankTeller, ComplianceAuditor, Customer).");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Could not initialize/seed SQL Server database automatically. If SQL Server is offline, fallback repositories will be used.");
        }
    }
}
