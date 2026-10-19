using AegisLedger.Application.Common.Dtos;
using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Domain.Entities;
using AegisLedger.Domain.Enums;
using AegisLedger.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AegisLedger.Tests.Integration;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _keepAliveConnection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        const string connectionString = "Data Source=AegisTest;Mode=Memory;Cache=Shared";
        _keepAliveConnection = new SqliteConnection(connectionString);
        _keepAliveConnection.Open();

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString,
                ["ConnectionStrings:Redis"] = "",
                ["DatabaseProvider"] = "Sqlite",
                ["Jwt:SecretKey"] = "AegisLedger_CoreBanking_SuperSecretSecurityKey_2026_EnterpriseRelease!",
                ["Jwt:Issuer"] = "AegisLedger.Api",
                ["Jwt:Audience"] = "AegisLedger.Clients"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace IAccountQueries with EfAccountQueries for in-memory test database read-side
            var accountQueriesDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IAccountQueries));
            if (accountQueriesDescriptor != null)
            {
                services.Remove(accountQueriesDescriptor);
            }

            services.AddScoped<IAccountQueries, EfAccountQueries>();
            services.AddDistributedMemoryCache();

            // Seed test database
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AegisLedgerDbContext>();
            db.Database.EnsureCreated();

            if (!db.Accounts.Any())
            {
                var acc1 = new Account(
                    "ACC-10001-CHK",
                    "Treasury Reserve Account",
                    "Aegis Master Treasury",
                    AccountCategory.System,
                    AccountType.Checking,
                    "USD",
                    100_000.00m
                );
                var acc2 = new Account(
                    "ACC-20002-SAV",
                    "Corporate Settlement Account",
                    "Alpha Operations LLC",
                    AccountCategory.Customer,
                    AccountType.Savings,
                    "USD",
                    50_000.00m
                );

                db.Accounts.AddRange(acc1, acc2);
                db.SaveChanges();
            }
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _keepAliveConnection?.Dispose();
    }
}

public class EfAccountQueries : IAccountQueries
{
    private readonly AegisLedgerDbContext _context;

    public EfAccountQueries(AegisLedgerDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<AccountDto>> GetAccountsAsync(CancellationToken cancellationToken = default)
    {
        var accounts = await _context.Accounts.ToListAsync(cancellationToken);
        return accounts.Select(a => new AccountDto(
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
            Convert.ToHexString(a.RowVersion),
            a.OpenedAtUtc,
            a.RoutingCode,
            a.Description
        )).ToList();
    }

    public async Task<AccountDetailDto?> GetAccountByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var a = await _context.Accounts.Include(x => x.Holds).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (a is null) return null;
        return new AccountDetailDto(
            a.Id,
            a.AccountNumber,
            a.Name,
            a.Owner,
            a.Category.ToString().ToLowerInvariant(),
            a.Type.ToString(),
            a.Currency,
            a.LedgerBalance,
            a.ActiveHoldsSum,
            a.AvailableBalance,
            a.Status.ToString(),
            Convert.ToHexString(a.RowVersion),
            a.OpenedAtUtc,
            a.RoutingCode,
            a.Description,
            Array.Empty<TransactionHoldDto>(),
            Array.Empty<JournalLineDto>()
        );
    }

    public Task<IReadOnlyList<JournalFeedItemDto>> GetJournalEntriesAsync(int page = 1, int pageSize = 50, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<JournalFeedItemDto>>(Array.Empty<JournalFeedItemDto>());
    }

    public Task<IReadOnlyList<TransactionHoldDto>> GetActiveHoldsAsync(Guid? accountId = null, CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<TransactionHoldDto>>(Array.Empty<TransactionHoldDto>());
    }
}
