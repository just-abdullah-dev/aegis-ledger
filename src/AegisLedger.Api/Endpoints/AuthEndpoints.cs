using AegisLedger.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AegisLedger.Api.Endpoints;

public record LoginRequest(string Username, string Password);
public record RefreshTokenRequest(string RefreshToken);

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth");

        // POST /api/v1/auth/token
        group.MapPost("/token", async (
            [FromBody] LoginRequest request,
            IJwtTokenService jwtService) =>
        {
            var result = await jwtService.AuthenticateAsync(request.Username, request.Password);
            if (result is null)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(result);
        });

        // POST /api/v1/auth/refresh
        group.MapPost("/refresh", async (
            [FromBody] RefreshTokenRequest request,
            IJwtTokenService jwtService) =>
        {
            var result = await jwtService.RefreshTokenAsync(request.RefreshToken);
            if (result is null)
            {
                return Results.Unauthorized();
            }

            return Results.Ok(result);
        });

        return app;
    }
}
