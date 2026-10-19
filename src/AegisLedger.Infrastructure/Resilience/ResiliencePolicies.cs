using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;

namespace AegisLedger.Infrastructure.Resilience;

public static class ResiliencePolicies
{
    /// <summary>
    /// Exponential Backoff Retry Policy: 3 attempts with (2s, 4s, 8s).
    /// </summary>
    public static AsyncRetryPolicy GetDatabaseRetryPolicy(Action<Exception, TimeSpan, int>? onRetry = null)
    {
        return Policy
            .Handle<Exception>()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (exception, timespan, retryAttempt, _) =>
                {
                    onRetry?.Invoke(exception, timespan, retryAttempt);
                });
    }

    /// <summary>
    /// Circuit Breaker Policy: Breaks circuit for 30 seconds if 5 consecutive failures occur.
    /// </summary>
    public static AsyncCircuitBreakerPolicy GetCircuitBreakerPolicy(Action<Exception, TimeSpan>? onBreak = null, Action? onReset = null)
    {
        return Policy
            .Handle<Exception>()
            .CircuitBreakerAsync(
                exceptionsAllowedBeforeBreaking: 5,
                durationOfBreak: TimeSpan.FromSeconds(30),
                onBreak: (exception, breakDuration) => onBreak?.Invoke(exception, breakDuration),
                onReset: () => onReset?.Invoke());
    }
}
