using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace AegisLedger.Api.Middleware;

public record CachedIdempotencyResponse(int StatusCode, string ContentType, byte[] Body);

public class IdempotencyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<IdempotencyMiddleware> _logger;

    public const string HeaderName = "X-Idempotency-Key";

    public IdempotencyMiddleware(RequestDelegate next, ILogger<IdempotencyMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IDistributedCache cache)
    {
        // Only process mutations (POST, PUT, PATCH) that include the idempotency header
        if (!HttpMethods.IsPost(context.Request.Method) &&
            !HttpMethods.IsPut(context.Request.Method) &&
            !HttpMethods.IsPatch(context.Request.Method))
        {
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue(HeaderName, out var keyValues) ||
            string.IsNullOrWhiteSpace(keyValues.FirstOrDefault()))
        {
            await _next(context);
            return;
        }

        var idempotencyKey = keyValues.First()!.Trim();
        var cacheKey = $"idempotency:{idempotencyKey}";

        try
        {
            // 1. Check existing cached response in Redis
            var cachedData = await cache.GetAsync(cacheKey);
            if (cachedData is not null && cachedData.Length > 0)
            {
                var cached = JsonSerializer.Deserialize<CachedIdempotencyResponse>(cachedData);
                if (cached is not null)
                {
                    _logger.LogInformation("Idempotency HIT for key '{IdempotencyKey}'. Returning cached response.", idempotencyKey);
                    context.Response.StatusCode = cached.StatusCode;
                    context.Response.ContentType = cached.ContentType;
                    context.Response.Headers["X-Cache-Lookup"] = "HIT-IDEMPOTENCY";
                    context.Response.Headers[HeaderName] = idempotencyKey;
                    await context.Response.Body.WriteAsync(cached.Body);
                    return;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read idempotency key '{IdempotencyKey}' from cache. Proceeding with execution.", idempotencyKey);
        }

        // 2. Intercept response stream
        var originalBodyStream = context.Response.Body;
        await using var memoryStream = new MemoryStream();
        context.Response.Body = memoryStream;

        try
        {
            await _next(context);

            memoryStream.Seek(0, SeekOrigin.Begin);
            var responseBytes = memoryStream.ToArray();

            // Cache successful 2xx responses with 24-hour TTL
            if (context.Response.StatusCode is >= 200 and < 300)
            {
                try
                {
                    var cachePayload = new CachedIdempotencyResponse(
                        context.Response.StatusCode,
                        context.Response.ContentType ?? "application/json",
                        responseBytes
                    );

                    var serialized = JsonSerializer.SerializeToUtf8Bytes(cachePayload);
                    await cache.SetAsync(cacheKey, serialized, new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
                    });
                    _logger.LogInformation("Cached idempotency response for key '{IdempotencyKey}' with 24h TTL.", idempotencyKey);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to cache idempotency key '{IdempotencyKey}'.", idempotencyKey);
                }
            }

            memoryStream.Seek(0, SeekOrigin.Begin);
            await memoryStream.CopyToAsync(originalBodyStream);
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }
    }
}
