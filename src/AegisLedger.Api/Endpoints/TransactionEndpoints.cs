using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Application.Transactions.Commands;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AegisLedger.Api.Endpoints;

public record TransferRequest(
    Guid SourceAccountId,
    Guid DestinationAccountId,
    decimal Amount,
    string Description,
    string? IdempotencyKey = null
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
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            var idempotencyKey = httpContext.Request.Headers["X-Idempotency-Key"].FirstOrDefault()
                                 ?? request.IdempotencyKey;

            var command = new PostTransactionCommand(
                request.SourceAccountId,
                request.DestinationAccountId,
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

        return app;
    }
}
