using AegisLedger.Application.Common.Interfaces;
using AegisLedger.Application.Holds.Commands;
using AegisLedger.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AegisLedger.Api.Endpoints;

public record ApplyHoldRequest(
    Guid AccountId,
    decimal Amount,
    string Reason,
    int TtlMinutes,
    string? CorrelationId = null
);

public record HoldActionRequest(Guid AccountId);

public static class HoldEndpoints
{
    public static IEndpointRouteBuilder MapHoldEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/holds");

        // GET /api/v1/holds
        group.MapGet("/", async (
            [FromQuery] Guid? accountId,
            IAccountQueries accountQueries,
            CancellationToken ct) =>
        {
            var holds = await accountQueries.GetActiveHoldsAsync(accountId, ct);
            return Results.Ok(holds);
        });

        // POST /api/v1/holds/apply
        group.MapPost("/apply", async (
            [FromBody] ApplyHoldRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            var reasonEnum = HoldReasonExtensions.FromFriendlyString(request.Reason);
            var command = new ApplyHoldCommand(
                request.AccountId,
                request.Amount,
                reasonEnum,
                request.TtlMinutes,
                request.CorrelationId
            );

            var result = await sender.Send(command, ct);
            return Results.Ok(result);
        });

        // POST /api/v1/holds/{id}/release
        group.MapPost("/{id:guid}/release", async (
            Guid id,
            [FromBody] HoldActionRequest? body,
            [FromQuery] Guid? accountId,
            ISender sender,
            CancellationToken ct) =>
        {
            var accId = body?.AccountId ?? accountId ?? Guid.Empty;
            if (accId == Guid.Empty)
            {
                return Results.BadRequest(new { error = "AccountId is required in body or query." });
            }

            var command = new ReleaseHoldCommand(accId, id);
            var result = await sender.Send(command, ct);
            return Results.Ok(result);
        });

        // POST /api/v1/holds/{id}/capture
        group.MapPost("/{id:guid}/capture", async (
            Guid id,
            [FromBody] HoldActionRequest? body,
            [FromQuery] Guid? accountId,
            ISender sender,
            CancellationToken ct) =>
        {
            var accId = body?.AccountId ?? accountId ?? Guid.Empty;
            if (accId == Guid.Empty)
            {
                return Results.BadRequest(new { error = "AccountId is required in body or query." });
            }

            var command = new CaptureHoldCommand(accId, id);
            var result = await sender.Send(command, ct);
            return Results.Ok(result);
        });

        return app;
    }
}
