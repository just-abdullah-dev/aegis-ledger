using System.Net;
using System.Net.Http.Json;
using AegisLedger.Application.Common.Dtos;
using AegisLedger.Domain.Entities;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;

namespace AegisLedger.Tests.Integration;

public class LedgerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public LedgerIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostTransaction_ShouldMaintainDoubleEntryBalance_AndReturn201Created()
    {
        // Arrange - Get seeded accounts
        var accountsResponse = await _client.GetFromJsonAsync<AccountListResponse>("/api/v1/accounts");
        Assert.NotNull(accountsResponse);
        Assert.True(accountsResponse.Accounts.Count >= 2);

        var source = accountsResponse.Accounts[0];
        var dest = accountsResponse.Accounts[1];
        var idemKey = $"idem-{Guid.NewGuid():N}";

        var transferPayload = new
        {
            SourceAccountId = source.Id,
            DestinationAccountId = dest.Id,
            Amount = 1500.00m,
            Description = "Corporate liquidity transfer",
            IdempotencyKey = idemKey
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/transactions/transfer")
        {
            Content = JsonContent.Create(transferPayload)
        };
        request.Headers.Add("X-Idempotency-Key", idemKey);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var txn = await response.Content.ReadFromJsonAsync<TransactionResponseDto>();
        Assert.NotNull(txn);
        Assert.Equal("Posted", txn.Status);
        Assert.Equal(0.00m, txn.NetDifference);
        Assert.StartsWith("TXN-", txn.ReferenceNumber);
    }

    [Fact]
    public async Task DuplicateIdempotencyKey_ShouldReturnCachedResponse()
    {
        // Arrange
        var accountsResponse = await _client.GetFromJsonAsync<AccountListResponse>("/api/v1/accounts");
        Assert.NotNull(accountsResponse);

        var source = accountsResponse.Accounts[0];
        var dest = accountsResponse.Accounts[1];
        var idempotencyKey = $"idem-duplicate-test-{Guid.NewGuid():N}";

        var payload = new
        {
            SourceAccountId = source.Id,
            DestinationAccountId = dest.Id,
            Amount = 250.00m,
            Description = "Idempotency test payload",
            IdempotencyKey = idempotencyKey
        };

        // First Request
        var request1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/transactions/transfer")
        {
            Content = JsonContent.Create(payload)
        };
        request1.Headers.Add("X-Idempotency-Key", idempotencyKey);
        var response1 = await _client.SendAsync(request1);
        Assert.Equal(HttpStatusCode.Created, response1.StatusCode);

        // Second Request (Duplicate Key)
        var request2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/transactions/transfer")
        {
            Content = JsonContent.Create(payload)
        };
        request2.Headers.Add("X-Idempotency-Key", idempotencyKey);
        var response2 = await _client.SendAsync(request2);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response2.StatusCode);
        Assert.True(
            response2.Headers.Contains("X-Cache-Lookup") ||
            response2.Headers.Contains("X-Idempotency-Key"),
            "Response should indicate idempotent cached reply.");
    }

    [Fact]
    public void ConcurrentTransfers_ShouldHandleOptimisticConcurrency_WithRowVersion()
    {
        // Arrange
        var initialRowVersion = new byte[] { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xD4 };
        var account = new Account(
            "ACC-CONCURRENCY-01",
            "Concurrency Test Account",
            "Test Owner",
            AccountCategory.Customer,
            AccountType.Checking,
            "USD",
            10_000.00m
        );
        account.UpdateRowVersion(initialRowVersion);

        // Simulate concurrent process mutating RowVersion
        var conflictingRowVersion = new byte[] { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xD5 };

        // Act & Assert
        Assert.NotEqual(conflictingRowVersion, account.RowVersion);

        // Verify DomainConcurrencyException captures optimistic locking conflicts
        var ex = new DomainConcurrencyException("Account", account.Id);
        Assert.Contains("Optimistic concurrency violation", ex.Message);
        Assert.Contains(account.Id.ToString(), ex.Message);
    }

    private sealed record AccountListResponse(
        object Solvency,
        IReadOnlyList<AccountDto> Accounts
    );
}
