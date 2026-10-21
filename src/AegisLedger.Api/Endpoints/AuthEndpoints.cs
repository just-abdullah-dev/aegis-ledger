using System.Security.Claims;
using AegisLedger.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AegisLedger.Api.Endpoints;

public record LoginRequest(string? Username, string? EmailOrId, string? Password);
public record RefreshTokenRequest(string? RefreshToken);

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth");

        var handleLogin = async (
            [FromBody] LoginRequest request,
            HttpContext httpContext,
            IJwtTokenService jwtService) =>
        {
            var userIdentifier = !string.IsNullOrWhiteSpace(request.Username)
                ? request.Username
                : request.EmailOrId ?? string.Empty;

            var result = await jwtService.AuthenticateAsync(userIdentifier, request.Password ?? string.Empty);
            if (result is null)
            {
                return Results.Unauthorized();
            }

            // Exclude retail customers from enterprise banking operations portal
            if (result.Roles.Count == 1 && result.Roles[0].Equals("Customer", StringComparison.OrdinalIgnoreCase))
            {
                return Results.Json(new
                {
                    error = "Retail Customer accounts must use the Mobile Sovereign Wallet app. This enterprise portal is restricted to Bank Staff (Tellers, Auditors, Administrators)."
                }, statusCode: StatusCodes.Status403Forbidden);
            }

            var primaryRole = result.Roles.Contains("SystemAdmin", StringComparer.OrdinalIgnoreCase)
                ? "SystemAdmin"
                : result.Roles.Contains("BankTeller", StringComparer.OrdinalIgnoreCase)
                    ? "BankTeller"
                    : result.Roles.Contains("ComplianceAuditor", StringComparer.OrdinalIgnoreCase)
                        ? "ComplianceAuditor"
                        : result.Roles.FirstOrDefault() ?? "ComplianceAuditor";
            var friendlyPersona = primaryRole switch
            {
                "SystemAdmin" => "System Admin",
                "BankTeller" => "Bank Teller",
                "Customer" => "Retail Customer",
                _ => "Compliance Auditor"
            };

            var friendlyName = userIdentifier.Contains('@')
                ? userIdentifier.Split('@')[0].Replace('.', ' ').ToUpper()
                : char.ToUpper(userIdentifier[0]) + userIdentifier[1..];

            // Set secure HTTP cookies
            var accessCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = false, // Allow HTTP localhost development
                Expires = result.ExpiresAtUtc,
                Path = "/"
            };

            var refreshCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = DateTime.UtcNow.AddDays(7),
                Path = "/"
            };

            var clientIndicatorOptions = new CookieOptions
            {
                HttpOnly = false, // Accessible to client-side JS
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = DateTime.UtcNow.AddDays(7),
                Path = "/"
            };

            httpContext.Response.Cookies.Append("aegis_access_token", result.AccessToken, accessCookieOptions);
            httpContext.Response.Cookies.Append("aegis_refresh_token", result.RefreshToken, refreshCookieOptions);
            httpContext.Response.Cookies.Append("aegis_session_active", "1", clientIndicatorOptions);
            httpContext.Response.Cookies.Append("aegis_user_persona", friendlyPersona, clientIndicatorOptions);

            return Results.Ok(new
            {
                accessToken = result.AccessToken,
                refreshToken = result.RefreshToken,
                expiresAtUtc = result.ExpiresAtUtc,
                expiresIn = 3600,
                username = result.Username,
                roles = result.Roles,
                user = new
                {
                    id = $"usr-{userIdentifier.Replace('@', '-').Replace('.', '-')}",
                    name = friendlyName,
                    email = userIdentifier.Contains('@') ? userIdentifier : $"{userIdentifier}@aegisledger.bank",
                    persona = friendlyPersona,
                    role = primaryRole
                }
            });
        };

        // POST /api/v1/auth/token
        group.MapPost("/token", handleLogin);

        // POST /api/v1/auth/login (alias for web portal)
        group.MapPost("/login", handleLogin);

        // POST /api/v1/auth/refresh
        group.MapPost("/refresh", async (
            [FromBody] RefreshTokenRequest? request,
            HttpContext httpContext,
            IJwtTokenService jwtService) =>
        {
            var tokenToUse = request?.RefreshToken;
            if (string.IsNullOrWhiteSpace(tokenToUse) &&
                httpContext.Request.Cookies.TryGetValue("aegis_refresh_token", out var cookieRefreshToken))
            {
                tokenToUse = cookieRefreshToken;
            }

            if (string.IsNullOrWhiteSpace(tokenToUse))
            {
                return Results.Unauthorized();
            }

            var result = await jwtService.RefreshTokenAsync(tokenToUse);
            if (result is null)
            {
                httpContext.Response.Cookies.Delete("aegis_access_token", new CookieOptions { Path = "/" });
                httpContext.Response.Cookies.Delete("aegis_refresh_token", new CookieOptions { Path = "/" });
                httpContext.Response.Cookies.Delete("aegis_session_active", new CookieOptions { Path = "/" });
                return Results.Unauthorized();
            }

            httpContext.Response.Cookies.Append("aegis_access_token", result.AccessToken, new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = result.ExpiresAtUtc,
                Path = "/"
            });

            httpContext.Response.Cookies.Append("aegis_refresh_token", result.RefreshToken, new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = DateTime.UtcNow.AddDays(7),
                Path = "/"
            });

            return Results.Ok(new
            {
                accessToken = result.AccessToken,
                refreshToken = result.RefreshToken,
                expiresAtUtc = result.ExpiresAtUtc,
                expiresIn = 3600,
                username = result.Username,
                roles = result.Roles
            });
        });

        // POST /api/v1/auth/customer/login (Dedicated retail customer authentication)
        group.MapPost("/customer/login", async (
            [FromBody] LoginRequest request,
            HttpContext httpContext,
            IJwtTokenService jwtService) =>
        {
            var userIdentifier = !string.IsNullOrWhiteSpace(request.Username)
                ? request.Username
                : request.EmailOrId ?? string.Empty;

            var result = await jwtService.AuthenticateAsync(userIdentifier, request.Password ?? string.Empty);
            if (result is null)
            {
                return Results.Unauthorized();
            }

            if (!result.Roles.Contains("Customer", StringComparer.OrdinalIgnoreCase))
            {
                return Results.Json(new
                {
                    error = "This portal is reserved exclusively for Retail Customers. Bank Staff members (Tellers, Auditors, Admins) must authenticate via the Operator Portal at /login."
                }, statusCode: StatusCodes.Status403Forbidden);
            }

            var friendlyName = userIdentifier.Contains('@')
                ? userIdentifier.Split('@')[0].Replace('.', ' ').ToUpper()
                : char.ToUpper(userIdentifier[0]) + userIdentifier[1..];

            var accessCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = result.ExpiresAtUtc,
                Path = "/"
            };

            var refreshCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = DateTime.UtcNow.AddDays(7),
                Path = "/"
            };

            var clientIndicatorOptions = new CookieOptions
            {
                HttpOnly = false,
                SameSite = SameSiteMode.Lax,
                Secure = false,
                Expires = DateTime.UtcNow.AddDays(7),
                Path = "/"
            };

            httpContext.Response.Cookies.Append("aegis_access_token", result.AccessToken, accessCookieOptions);
            httpContext.Response.Cookies.Append("aegis_refresh_token", result.RefreshToken, refreshCookieOptions);
            httpContext.Response.Cookies.Append("aegis_session_active", "1", clientIndicatorOptions);
            httpContext.Response.Cookies.Append("aegis_user_persona", "Retail Customer", clientIndicatorOptions);

            return Results.Ok(new
            {
                accessToken = result.AccessToken,
                refreshToken = result.RefreshToken,
                expiresAtUtc = result.ExpiresAtUtc,
                expiresIn = 3600,
                username = result.Username,
                roles = result.Roles,
                user = new
                {
                    id = $"usr-cust-{userIdentifier.Replace('@', '-').Replace('.', '-')}",
                    name = friendlyName,
                    email = userIdentifier.Contains('@') ? userIdentifier : $"{userIdentifier}@aegisledger.bank",
                    persona = "Retail Customer",
                    role = "Customer"
                }
            });
        });

        // POST /api/v1/auth/logout (High-security explicit cookie and session invalidation)
        group.MapPost("/logout", (HttpContext httpContext) =>
        {
            var deleteOptionsHttpOnly = new CookieOptions
            {
                Path = "/",
                SameSite = SameSiteMode.Lax,
                Secure = false,
                HttpOnly = true,
                Expires = DateTime.UnixEpoch
            };

            var deleteOptionsPublic = new CookieOptions
            {
                Path = "/",
                SameSite = SameSiteMode.Lax,
                Secure = false,
                HttpOnly = false,
                Expires = DateTime.UnixEpoch
            };

            httpContext.Response.Cookies.Delete("aegis_access_token", deleteOptionsHttpOnly);
            httpContext.Response.Cookies.Delete("aegis_refresh_token", deleteOptionsHttpOnly);
            httpContext.Response.Cookies.Delete("aegis_session_active", deleteOptionsPublic);
            httpContext.Response.Cookies.Delete("aegis_user_persona", deleteOptionsPublic);

            return Results.Ok(new { message = "Logged out successfully. All authentication credentials and session tokens cleared." });
        });

        // GET /api/v1/auth/me (Inspect current authenticated session via Cookie or Bearer)
        group.MapGet("/me", (HttpContext httpContext) =>
        {
            var user = httpContext.User;
            if (user.Identity?.IsAuthenticated != true)
            {
                return Results.Unauthorized();
            }

            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? user.FindFirst("sub")?.Value
                         ?? "usr-authenticated";
            var username = user.FindFirst(ClaimTypes.Name)?.Value
                           ?? user.Identity.Name
                           ?? "Authenticated User";
            var roles = user.FindAll(ClaimTypes.Role).Select(r => r.Value).ToList();
            var primaryRole = roles.Contains("SystemAdmin", StringComparer.OrdinalIgnoreCase)
                ? "SystemAdmin"
                : roles.Contains("BankTeller", StringComparer.OrdinalIgnoreCase)
                    ? "BankTeller"
                    : roles.Contains("ComplianceAuditor", StringComparer.OrdinalIgnoreCase)
                        ? "ComplianceAuditor"
                        : roles.FirstOrDefault() ?? "ComplianceAuditor";

            var friendlyPersona = primaryRole switch
            {
                "SystemAdmin" => "System Admin",
                "BankTeller" => "Bank Teller",
                "Customer" => "Retail Customer",
                _ => "Compliance Auditor"
            };

            return Results.Ok(new
            {
                isAuthenticated = true,
                user = new
                {
                    id = userId,
                    name = username,
                    email = username.Contains('@') ? username : $"{username}@aegisledger.bank",
                    persona = friendlyPersona,
                    role = primaryRole
                },
                roles
            });
        });

        return app;
    }
}
