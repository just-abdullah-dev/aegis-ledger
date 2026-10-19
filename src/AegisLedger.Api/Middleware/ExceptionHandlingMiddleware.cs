using System.Text.Json;
using AegisLedger.Domain.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AegisLedger.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred during request execution: {Path}", context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/problem+json";

        var (statusCode, title, type) = exception switch
        {
            ValidationException => (
                StatusCodes.Status400BadRequest,
                "Request Validation Failed",
                "https://tools.ietf.org/html/rfc7231#section-6.5.1"
            ),
            InsufficientFundsException => (
                StatusCodes.Status400BadRequest,
                "Insufficient Available Liquidity",
                "https://aegisledger.bank/errors/insufficient-funds"
            ),
            AccountFrozenException => (
                StatusCodes.Status403Forbidden,
                "Account Inactive or Frozen",
                "https://aegisledger.bank/errors/account-frozen"
            ),
            UnbalancedTransactionException => (
                StatusCodes.Status422UnprocessableEntity,
                "Double-Entry Solvency Invariant Violation",
                "https://aegisledger.bank/errors/unbalanced-transaction"
            ),
            DomainConcurrencyException or DbUpdateConcurrencyException => (
                StatusCodes.Status409Conflict,
                "Optimistic Concurrency Conflict",
                "https://tools.ietf.org/html/rfc7231#section-6.5.8"
            ),
            CurrencyMismatchException => (
                StatusCodes.Status400BadRequest,
                "Currency Mismatch Detected",
                "https://aegisledger.bank/errors/currency-mismatch"
            ),
            InvalidHoldStateException => (
                StatusCodes.Status400BadRequest,
                "Invalid Hold State Transition",
                "https://aegisledger.bank/errors/invalid-hold-state"
            ),
            DomainException => (
                StatusCodes.Status400BadRequest,
                "Domain Invariant Error",
                "https://aegisledger.bank/errors/domain-error"
            ),
            ArgumentException => (
                StatusCodes.Status400BadRequest,
                "Invalid Argument",
                "https://tools.ietf.org/html/rfc7231#section-6.5.1"
            ),
            InvalidOperationException => (
                StatusCodes.Status400BadRequest,
                "Invalid Operation",
                "https://tools.ietf.org/html/rfc7231#section-6.5.1"
            ),
            KeyNotFoundException => (
                StatusCodes.Status404NotFound,
                "Resource Not Found",
                "https://tools.ietf.org/html/rfc7231#section-6.5.4"
            ),
            _ => (
                StatusCodes.Status500InternalServerError,
                "Internal Server Error",
                "https://tools.ietf.org/html/rfc7231#section-6.6.1"
            )
        };

        context.Response.StatusCode = statusCode;

        var problemDetails = new ProblemDetails
        {
            Type = type,
            Title = title,
            Status = statusCode,
            Detail = exception.Message,
            Instance = context.Request.Path
        };

        problemDetails.Extensions["timestampUtc"] = DateTime.UtcNow;
        problemDetails.Extensions["traceId"] = context.TraceIdentifier;

        if (exception is ValidationException validationEx)
        {
            problemDetails.Extensions["errors"] = validationEx.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(e => e.ErrorMessage).ToArray()
                );
        }

        var json = JsonSerializer.Serialize(problemDetails, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        });

        await context.Response.WriteAsync(json);
    }
}
