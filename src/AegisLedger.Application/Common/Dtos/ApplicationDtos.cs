namespace AegisLedger.Application.Common.Dtos;

public record AccountDto(
    Guid Id,
    string AccountNumber,
    string Name,
    string Owner,
    string Category,
    string Type,
    string Currency,
    decimal LedgerBalance,
    decimal AvailableBalance,
    string Status,
    string RowVersion,
    DateTime OpenedAt,
    string RoutingCode,
    string Description
);

public record AccountDetailDto(
    Guid Id,
    string AccountNumber,
    string Name,
    string Owner,
    string Category,
    string Type,
    string Currency,
    decimal LedgerBalance,
    decimal ActiveHoldsSum,
    decimal AvailableBalance,
    string Status,
    string RowVersion,
    DateTime OpenedAt,
    string RoutingCode,
    string Description,
    IReadOnlyList<TransactionHoldDto> ActiveHolds,
    IReadOnlyList<JournalLineDto> RecentJournalEntries
);

public record JournalLineDto(
    Guid Id,
    string EntryType,
    Guid AccountId,
    string AccountNumber,
    string AccountName,
    decimal Amount,
    decimal PostBalance,
    string Memo
);

public record TransactionDto(
    Guid Id,
    string Reference,
    DateTime Timestamp,
    Guid? SenderAccountId,
    Guid? ReceiverAccountId,
    string? SenderAccountNum,
    string? ReceiverAccountNum,
    decimal Amount,
    string Status,
    string IdempotencyKey,
    string Description,
    string Category,
    IReadOnlyList<JournalLineDto> JournalLines,
    string CorrelationId,
    bool IsReversed
);

public record TransactionResponseDto(
    Guid TransactionId,
    string ReferenceNumber,
    string Status,
    decimal NetDifference
);

public record HoldResponseDto(
    Guid HoldId,
    Guid AccountId,
    decimal HeldAmount,
    string Reason,
    string Status,
    decimal NewAvailableBalance,
    DateTime CreatedAtUtc,
    DateTime ExpiresAtUtc,
    string CorrelationId
);

public record TransactionHoldDto(
    Guid Id,
    Guid AccountId,
    string AccountNumber,
    string AccountName,
    decimal Amount,
    string Reason,
    DateTime CreatedAt,
    long ExpiresAtEpochMs,
    string Status,
    string CorrelationId
);

public record JournalFeedItemDto(
    Guid TransactionId,
    string ReferenceNumber,
    DateTime TimestampUtc,
    string Description,
    string Category,
    string Status,
    decimal Amount,
    string Currency,
    IReadOnlyList<JournalLineDto> Splits
);

public record EodBatchRecordDto(
    Guid Id,
    string BatchId,
    string Date,
    decimal TotalDebits,
    decimal TotalCredits,
    decimal Difference,
    string Status,
    string Duration,
    int ProcessedCount,
    string BatchHash
);
