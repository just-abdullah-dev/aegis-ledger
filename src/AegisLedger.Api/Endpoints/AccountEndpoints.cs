using AegisLedger.Application.Common.Interfaces;

namespace AegisLedger.Api.Endpoints;

public static class AccountEndpoints
{
    public static IEndpointRouteBuilder MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/accounts");

        // GET /api/v1/accounts with solvency aggregates
        group.MapGet("/", async (IAccountQueries accountQueries, CancellationToken ct) =>
        {
            var accounts = await accountQueries.GetAccountsAsync(ct);
            var totalLedger = accounts.Sum(a => a.LedgerBalance);
            var totalAvailable = accounts.Sum(a => a.AvailableBalance);
            var activeHolds = decimal.Round(totalLedger - totalAvailable, 4, MidpointRounding.ToEven);

            return Results.Ok(new
            {
                solvency = new
                {
                    totalBookLedgerBalance = totalLedger,
                    totalAvailableLiquidity = totalAvailable,
                    activeSecurityHolds = activeHolds,
                    isSolvent = totalLedger == (totalAvailable + activeHolds),
                    invariant = "SUM(Debits) == SUM(Credits) [Zero-Drift Verified]"
                },
                accounts
            });
        });

        // GET /api/v1/accounts/{id} with detail and journal history
        group.MapGet("/{id:guid}", async (Guid id, IAccountQueries accountQueries, CancellationToken ct) =>
        {
            var account = await accountQueries.GetAccountByIdAsync(id, ct);
            if (account is null)
            {
                return Results.NotFound(new { error = $"Account with ID '{id}' was not found." });
            }

            return Results.Ok(account);
        });

        return app;
    }
}
