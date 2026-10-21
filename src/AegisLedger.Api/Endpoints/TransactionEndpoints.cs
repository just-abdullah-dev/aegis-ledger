using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Application.Transactions.Commands;
using AegisLedger.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AegisLedger.Api.Endpoints;

public record TransferRequest(
    Guid SourceAccountId,
    Guid DestinationAccountId,
    decimal Amount,
    string Description,
    string? IdempotencyKey = null,
    string? DestinationAccountNumber = null
);

public static class TransactionEndpoints
{
    public static IEndpointRouteBuilder MapTransactionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/transactions");

        // POST /api/v1/transactions/transfer (FR-2 Double-Entry Atomic Posting via MediatR)
        group.MapPost("/transfer", async (
            [FromBody] TransferRequest request,
            ISender sender,
            IAccountQueries accountQueries,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var idempotencyKey = httpContext.Request.Headers["X-Idempotency-Key"].FirstOrDefault()
                                 ?? request.IdempotencyKey;

            // Role-based restriction: Bank Tellers, System Admins, and Retail Customers can post transfers
            if (httpContext.User.Identity?.IsAuthenticated == true)
            {
                if (!httpContext.User.IsInRole("BankTeller") && 
                    !httpContext.User.IsInRole("SystemAdmin") && 
                    !httpContext.User.IsInRole("Customer"))
                {
                    return Results.Json(new
                    {
                        error = "Access Denied: Auditors carry read-only oversight permissions and cannot initiate transactional postings."
                    }, statusCode: StatusCodes.Status403Forbidden);
                }
            }

            var destId = request.DestinationAccountId;
            if (destId == Guid.Empty && !string.IsNullOrWhiteSpace(request.DestinationAccountNumber))
            {
                var allAccounts = await accountQueries.GetAccountsAsync(ct);
                var destAcc = allAccounts.FirstOrDefault(a =>
                    string.Equals(a.AccountNumber, request.DestinationAccountNumber.Trim(), StringComparison.OrdinalIgnoreCase));

                if (destAcc is null)
                {
                    return Results.BadRequest(new { error = $"Destination account '{request.DestinationAccountNumber}' was not found in Core Banking ledger." });
                }
                destId = destAcc.Id;
            }

            var command = new PostTransactionCommand(
                request.SourceAccountId,
                destId,
                request.Amount,
                request.Description,
                idempotencyKey
            );

            var result = await sender.Send(command, ct);
            return Results.Created($"/api/v1/transactions/{result.TransactionId}", result);
        });

        // GET /api/v1/transactions/journal (Double-entry journal feed with DR/CR splits)
        group.MapGet("/journal", async (
            [FromQuery] int? page,
            [FromQuery] int? pageSize,
            IAccountQueries accountQueries,
            CancellationToken ct) =>
        {
            var p = page.GetValueOrDefault(1);
            var ps = pageSize.GetValueOrDefault(50);
            var journal = await accountQueries.GetJournalEntriesAsync(p, ps, ct);
            return Results.Ok(journal);
        });

        // POST /api/v1/transactions/{id}/reverse (Compensating zero-drift reversal transaction)
        group.MapPost("/{id}/reverse", async (
            string id,
            ISender sender,
            IApplicationDbContext context,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var isSystemAdmin = httpContext.User.IsInRole("SystemAdmin") ||
                                httpContext.Request.Headers["X-Persona"].ToString().Equals("System Admin", StringComparison.OrdinalIgnoreCase);

            if (!isSystemAdmin)
            {
                return Results.Json(new { error = "Only System Administrators are authorized to reverse ledger transactions." }, statusCode: StatusCodes.Status403Forbidden);
            }

            var isGuid = Guid.TryParse(id, out var guidId);
            var txn = await context.Transactions
                .Include(t => t.JournalEntries)
                .FirstOrDefaultAsync(t => (isGuid && t.Id == guidId) || t.ReferenceNumber == id, ct);

            if (txn is null)
            {
                return Results.NotFound(new { error = $"Transaction '{id}' was not found in database." });
            }

            if (txn.IsReversed || txn.Status == TransactionStatus.Reversed)
            {
                return Results.BadRequest(new { error = $"Transaction '{txn.ReferenceNumber}' has already been reversed." });
            }

            if (txn.SenderAccountId == null || txn.ReceiverAccountId == null)
            {
                return Results.BadRequest(new { error = "Transaction lacks source and receiver account references for automated compensating reversal." });
            }

            // Post compensating transaction: debit receiver, credit sender
            var command = new PostTransactionCommand(
                txn.ReceiverAccountId.Value,
                txn.SenderAccountId.Value,
                txn.Amount,
                $"Reversal of {txn.ReferenceNumber}: {txn.Description}",
                $"rev-{Guid.NewGuid():N}"
            );

            var result = await sender.Send(command, ct);

            txn.MarkAsReversed();
            await context.SaveChangesAsync(ct);

            return Results.Ok(new
            {
                originalTransactionId = txn.Id,
                originalReference = txn.ReferenceNumber,
                status = "Reversed",
                compensatingTransactionId = result.TransactionId,
                compensatingReference = result.ReferenceNumber,
                amount = txn.Amount
            });
        });

        return app;
    }
}
