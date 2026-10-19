using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.IdentityModel.Tokens;

namespace AegisLedger.Api.Services;

public record TokenResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAtUtc,
    string Username,
    IReadOnlyList<string> Roles
);

public record StoredRefreshToken(
    string UserId,
    string Username,
    IReadOnlyList<string> Roles
);

public interface IJwtTokenService
{
    Task<TokenResponse?> AuthenticateAsync(string username, string password);
    Task<TokenResponse?> RefreshTokenAsync(string refreshToken);
}

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;
    private readonly IDistributedCache _cache;
    private readonly ILogger<JwtTokenService> _logger;

    // Predefined secure personas
    private static readonly Dictionary<string, (string Password, string UserId, string[] Roles)> Users = new(StringComparer.OrdinalIgnoreCase)
    {
        ["compliance_officer"] = ("Pass@123", "usr-auditor-01", ["ComplianceAuditor"]),
        ["bank_teller"] = ("Pass@123", "usr-teller-01", ["BankTeller"]),
        ["sys_admin"] = ("Pass@123", "usr-admin-01", ["ComplianceAuditor", "BankTeller", "SystemAdmin"]),
        ["customer_user"] = ("Pass@123", "usr-cust-01", ["Customer"])
    };

    public JwtTokenService(IConfiguration configuration, IDistributedCache cache, ILogger<JwtTokenService> logger)
    {
        _configuration = configuration;
        _cache = cache;
        _logger = logger;
    }

    public async Task<TokenResponse?> AuthenticateAsync(string username, string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return null;

        if (!Users.TryGetValue(username.Trim(), out var user) || user.Password != password)
        {
            _logger.LogWarning("Authentication failed for user '{Username}'.", username);
            return null;
        }

        return await GenerateTokensAsync(user.UserId, username.Trim(), user.Roles);
    }

    public async Task<TokenResponse?> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return null;

        var cacheKey = $"refresh_token:{refreshToken.Trim()}";
        var data = await _cache.GetStringAsync(cacheKey);
        if (string.IsNullOrEmpty(data))
        {
            _logger.LogWarning("Invalid or expired refresh token attempted.");
            return null;
        }

        var stored = JsonSerializer.Deserialize<StoredRefreshToken>(data);
        if (stored is null) return null;

        // Invalidate old token (one-time rotation)
        await _cache.RemoveAsync(cacheKey);

        // Generate new token pair
        return await GenerateTokensAsync(stored.UserId, stored.Username, stored.Roles);
    }

    private async Task<TokenResponse> GenerateTokensAsync(string userId, string username, IReadOnlyList<string> roles)
    {
        var keyString = _configuration["Jwt:SecretKey"] ?? "AegisLedger_CoreBanking_SuperSecretSecurityKey_2026_EnterpriseRelease!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyString));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiresAtUtc = DateTime.UtcNow.AddMinutes(15); // 15-minute Access Token TTL

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new(ClaimTypes.Name, username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "AegisLedger.Api",
            audience: _configuration["Jwt:Audience"] ?? "AegisLedger.Clients",
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: creds
        );

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

        // Generate random cryptographically secure Refresh Token
        var refreshToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();

        // Store Refresh Token in Redis with 7-day TTL
        var storedToken = new StoredRefreshToken(userId, username, roles);
        var json = JsonSerializer.Serialize(storedToken);
        await _cache.SetStringAsync($"refresh_token:{refreshToken}", json, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
        });

        _logger.LogInformation("Issued JWT token pair for user '{Username}' [Roles: {Roles}].", username, string.Join(", ", roles));

        return new TokenResponse(
            accessToken,
            refreshToken,
            expiresAtUtc,
            username,
            roles
        );
    }
}
