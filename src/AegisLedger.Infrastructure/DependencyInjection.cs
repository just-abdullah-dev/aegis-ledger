using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Infrastructure.Jobs;
using AegisLedger.Infrastructure.Persistence;
using AegisLedger.Infrastructure.Persistence.Repositories;
using AegisLedger.Infrastructure.Queries;
using AegisLedger.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AegisLedger.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Server=localhost;Database=AegisLedgerDb;Trusted_Connection=True;TrustServerCertificate=True;";

        // EF Core DbContext with SQL Server 2022 or SQLite for automated tests
        services.AddDbContext<AegisLedgerDbContext>(options =>
        {
            if (connectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase) ||
                connectionString.Contains("DataSource=", StringComparison.OrdinalIgnoreCase) ||
                configuration["DatabaseProvider"] == "Sqlite")
            {
                var sqliteConn = connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase)
                    ? "Data Source=aegisledger_test.db"
                    : connectionString;
                options.UseSqlite(sqliteConn);
            }
            else
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.MigrationsAssembly(typeof(AegisLedgerDbContext).Assembly.FullName);
                    sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorNumbersToAdd: null);
                });
            }
        });

        // Register IApplicationDbContext contract
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AegisLedgerDbContext>());

        // ISqlConnectionFactory for raw Dapper queries
        services.AddSingleton<ISqlConnectionFactory>(_ => new SqlConnectionFactory(connectionString));

        // Distributed Cache Service abstraction
        services.AddSingleton<ICacheService, RedisCacheService>();

        // Dapper Read-Side Query Handlers
        services.AddScoped<IAccountQueries, DapperAccountQueries>();

        // Hangfire Background Reconciliation & Hold Release Jobs
        services.AddScoped<EODReconciliationJob>();
        services.AddScoped<ExpiredHoldReleaseJob>();

        // Repositories and Unit of Work
        services.AddSingleton<IAccountRepository, InMemoryAccountRepository>();
        services.AddSingleton<ITransactionRepository, InMemoryTransactionRepository>();
        services.AddSingleton<ITransactionHoldRepository, InMemoryTransactionHoldRepository>();
        services.AddSingleton<IEodReconciliationRepository, InMemoryEodReconciliationRepository>();
        services.AddSingleton<IUnitOfWork, InMemoryUnitOfWork>();

        return services;
    }

    // Retain backward-compatible overload
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
    {
        services.AddSingleton<ICacheService, RedisCacheService>();
        services.AddScoped<IAccountQueries, DapperAccountQueries>();
        services.AddScoped<EODReconciliationJob>();
        services.AddScoped<ExpiredHoldReleaseJob>();
        services.AddSingleton<IAccountRepository, InMemoryAccountRepository>();
        services.AddSingleton<ITransactionRepository, InMemoryTransactionRepository>();
        services.AddSingleton<ITransactionHoldRepository, InMemoryTransactionHoldRepository>();
        services.AddSingleton<IEodReconciliationRepository, InMemoryEodReconciliationRepository>();
        services.AddSingleton<IUnitOfWork, InMemoryUnitOfWork>();

        return services;
    }
}
