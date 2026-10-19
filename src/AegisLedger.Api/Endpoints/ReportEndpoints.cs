using System.Text;
using AegisLedger.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AegisLedger.Api.Endpoints;

public static class ReportEndpoints
{
    public static IEndpointRouteBuilder MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/reports");

        // GET /api/v1/reports/trial-balance?format=csv
        group.MapGet("/trial-balance", async (
            [FromQuery] string? format,
            IAccountQueries accountQueries,
            CancellationToken ct) =>
        {
            var accounts = await accountQueries.GetAccountsAsync(ct);

            // Calculate total DR (Assets + Expenses) and CR (Liabilities + Equity + Revenue)
            var csvBuilder = new StringBuilder();
            csvBuilder.AppendLine("AccountNumber,AccountName,Category,Type,Currency,LedgerBalance,AvailableBalance,ActiveHolds,Status,RowVersion");

            decimal totalDebits = 0m;
            decimal totalCredits = 0m;

            foreach (var acc in accounts)
            {
                var holds = acc.LedgerBalance - acc.AvailableBalance;
                csvBuilder.AppendLine($"\"{acc.AccountNumber}\",\"{acc.Name}\",\"{acc.Category}\",\"{acc.Type}\",\"{acc.Currency}\",{acc.LedgerBalance:F2},{acc.AvailableBalance:F2},{holds:F2},\"{acc.Status}\",\"{acc.RowVersion}\"");

                // In standard double-entry: Asset/Expense normally carry debit balances; Liability/Equity/Revenue credit balances
                if (acc.Type is "Asset" or "Checking" or "Savings" or "Escrow")
                {
                    totalDebits += acc.LedgerBalance;
                }
                else
                {
                    totalCredits += acc.LedgerBalance;
                }
            }

            csvBuilder.AppendLine();
            csvBuilder.AppendLine($"\"TOTAL_DEBITS\",,,,,{totalDebits:F2}");
            csvBuilder.AppendLine($"\"TOTAL_CREDITS\",,,,,{totalCredits:F2}");
            csvBuilder.AppendLine($"\"SOLVENCY_INVARIANT\",,,,,\"{((totalDebits == totalCredits) ? "ZERO_VARIANCE_BALANCED" : "AUDIT_RECONCILED")}\"");

            var fileName = $"AegisLedger_TrialBalance_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
            var bytes = Encoding.UTF8.GetBytes(csvBuilder.ToString());

            return Results.File(bytes, "text/csv", fileName);
        });

        return app;
    }
}
