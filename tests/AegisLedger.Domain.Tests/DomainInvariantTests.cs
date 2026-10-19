using AegisLedger.Domain.Entities;
using AegisLedger.Domain.Enums;
using AegisLedger.Domain.Exceptions;
using AegisLedger.Domain.ValueObjects;

namespace AegisLedger.Domain.Tests;

public class DomainInvariantTests
{
    [Fact]
    public void BalancedTransaction_ShouldPostSuccessfully_WhenDebitsEqualCredits()
    {
        // Arrange
        var txn = new Transaction(
            "TXN-2024-001",
            "idem-key-001",
            5000.00m,
            "USD",
            "Corporate transfer",
            "Transfer"
        );
        var sourceAccId = Guid.NewGuid();
        var destAccId = Guid.NewGuid();

        txn.AddJournalEntry(sourceAccId, EntryType.Debit, 5000.00m, 95000.00m, "Debit line");
        txn.AddJournalEntry(destAccId, EntryType.Credit, 5000.00m, 105000.00m, "Credit line");

        // Act
        txn.Post();

        // Assert
        Assert.Equal(TransactionStatus.Posted, txn.Status);
        Assert.NotNull(txn.PostedAtUtc);
    }

    [Fact]
    public void UnbalancedTransaction_ShouldThrowUnbalancedTransactionException_WhenNetDifferenceNotZero()
    {
        // Arrange
        var txn = new Transaction(
            "TXN-2024-002",
            "idem-key-002",
            5000.00m,
            "USD",
            "Unbalanced transfer attempt",
            "Transfer"
        );
        var sourceAccId = Guid.NewGuid();
        var destAccId = Guid.NewGuid();

        txn.AddJournalEntry(sourceAccId, EntryType.Debit, 5000.00m, 95000.00m, "Debit line");
        txn.AddJournalEntry(destAccId, EntryType.Credit, 4999.50m, 104999.50m, "Drifting Credit line");

        // Act & Assert
        var ex = Assert.Throws<UnbalancedTransactionException>(() => txn.Post());
        Assert.Contains("Ledger transaction invariant violation", ex.Message);
    }

    [Fact]
    public void AccountAvailableBalance_ShouldBeDynamicallyCalculatedAs_LedgerBalanceMinusActiveHoldsSum()
    {
        // Arrange
        var account = new Account(
            "ACC-8029-CHK",
            "Apex Global Logistics LLC",
            "Elena Rostova",
            AccountCategory.Customer,
            AccountType.Checking,
            "USD",
            100_000.00m
        );

        // Initial State
        Assert.Equal(100_000.00m, account.LedgerBalance);
        Assert.Equal(0m, account.ActiveHoldsSum);
        Assert.Equal(100_000.00m, account.AvailableBalance);

        // Apply Hold 1: $15,000
        var hold1 = account.ApplyHold(15_000.00m, HoldReason.CardAuthPreCheck, TimeSpan.FromHours(1), "corr-1");
        Assert.Equal(100_000.00m, account.LedgerBalance);
        Assert.Equal(15_000.00m, account.ActiveHoldsSum);
        Assert.Equal(85_000.00m, account.AvailableBalance);

        // Apply Hold 2: $25,000
        var hold2 = account.ApplyHold(25_000.00m, HoldReason.EscrowMilestoneGuarantee, TimeSpan.FromHours(2), "corr-2");
        Assert.Equal(100_000.00m, account.LedgerBalance);
        Assert.Equal(40_000.00m, account.ActiveHoldsSum);
        Assert.Equal(60_000.00m, account.AvailableBalance);

        // Dynamic Calculation Invariant check:
        Assert.Equal(account.LedgerBalance - account.ActiveHoldsSum, account.AvailableBalance);
    }

    [Fact]
    public void AccountRowVersion_ShouldSupportOptimisticConcurrencyToken()
    {
        // Arrange
        var account = new Account(
            "ACC-8029-CHK",
            "Apex Global Logistics LLC",
            "Elena Rostova",
            AccountCategory.Customer,
            AccountType.Checking,
            "USD",
            50_000.00m
        );
        var rowVersionToken = new byte[] { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xD4 };

        // Act
        account.UpdateRowVersion(rowVersionToken);

        // Assert
        Assert.NotNull(account.RowVersion);
        Assert.Equal(rowVersionToken, account.RowVersion);
    }

    [Fact]
    public void TransactionHoldLifecycle_ApplyReleaseCapture_ShouldUpdateActiveHoldsSumAndLedgerBalanceAccurately()
    {
        // Arrange
        var account = new Account(
            "ACC-4109-ESC",
            "Meridian Capital Escrow Holdings",
            "Marcus Sterling",
            AccountCategory.Customer,
            AccountType.Escrow,
            "USD",
            100_000.00m
        );

        // 1. Apply Hold ($30,000)
        var hold = account.ApplyHold(30_000.00m, HoldReason.EscrowMilestoneGuarantee, TimeSpan.FromHours(24), "corr-escrow");
        Assert.Equal(HoldStatus.Active, hold.Status);
        Assert.Equal(100_000.00m, account.LedgerBalance); // Unmutated
        Assert.Equal(30_000.00m, account.ActiveHoldsSum);
        Assert.Equal(70_000.00m, account.AvailableBalance);

        // 2. Release Hold -> Restores ActiveHoldsSum to 0
        account.ReleaseHold(hold, DateTime.UtcNow);
        Assert.Equal(HoldStatus.Released, hold.Status);
        Assert.Equal(100_000.00m, account.LedgerBalance);
        Assert.Equal(0m, account.ActiveHoldsSum);
        Assert.Equal(100_000.00m, account.AvailableBalance);

        // 3. Re-apply and Capture Hold
        var holdToCapture = account.ApplyHold(20_000.00m, HoldReason.ChequeClearance, TimeSpan.FromHours(6), "corr-capture");
        Assert.Equal(20_000.00m, account.ActiveHoldsSum);
        Assert.Equal(80_000.00m, account.AvailableBalance);

        account.CaptureHold(holdToCapture, DateTime.UtcNow);
        Assert.Equal(HoldStatus.Captured, holdToCapture.Status);
        Assert.Equal(0m, account.ActiveHoldsSum);           // Active holds sum drops to 0
        Assert.Equal(80_000.00m, account.LedgerBalance);    // Ledger balance permanently debited
        Assert.Equal(80_000.00m, account.AvailableBalance); // Available balance matches remaining ledger funds
    }

    [Fact]
    public void HoldExceedingAvailableLiquidity_ShouldThrowInsufficientFundsException()
    {
        // Arrange
        var account = new Account(
            "ACC-8029-CHK",
            "Apex Global Logistics LLC",
            "Elena Rostova",
            AccountCategory.Customer,
            AccountType.Checking,
            "USD",
            10_000.00m
        );

        // Act & Assert
        Assert.Throws<InsufficientFundsException>(() =>
            account.ApplyHold(15_000.00m, HoldReason.AmlFraudReview, TimeSpan.FromHours(1), "corr-789")
        );
    }

    [Fact]
    public void OperationsOnFrozenAccount_ShouldThrowAccountFrozenException()
    {
        // Arrange
        var account = new Account(
            "ACC-9902-SAV",
            "Helios Renewable Ventures",
            "Lucas Chen",
            AccountCategory.Customer,
            AccountType.Savings,
            "USD",
            50_000.00m
        );
        account.Freeze();

        // Act & Assert
        Assert.Throws<AccountFrozenException>(() => account.Debit(1_000.00m));
        Assert.Throws<AccountFrozenException>(() => account.Credit(1_000.00m));
        Assert.Throws<AccountFrozenException>(() => account.ApplyHold(1_000.00m, HoldReason.CardAuthPreCheck, TimeSpan.FromHours(1), "corr-f"));
    }

    [Fact]
    public void MoneyAndCurrency_ShouldBeImmutableAndValidateCurrencyEquality()
    {
        // Arrange
        var usd1 = Money.USD(100.50m);
        var usd2 = Money.USD(50.25m);
        var eur = Money.EUR(50.25m);

        // Act
        var sumUsd = usd1 + usd2;
        var diffUsd = usd1 - usd2;

        // Assert
        Assert.Equal(150.75m, sumUsd.Amount);
        Assert.Equal(50.25m, diffUsd.Amount);
        Assert.Equal(Currency.USD, sumUsd.Currency);
        Assert.Equal("$", sumUsd.Currency.Symbol);

        // Currency equality validation
        Assert.Throws<CurrencyMismatchException>(() => _ = usd1 + eur);
        Assert.Throws<CurrencyMismatchException>(() => _ = usd1 - eur);
    }

    [Fact]
    public void Enums_ShouldHaveRequiredValuesAndCodes()
    {
        // AccountType
        Assert.Equal("CHK", AccountType.Checking.ToCode());
        Assert.Equal("SAV", AccountType.Savings.ToCode());
        Assert.Equal("ESC", AccountType.Escrow.ToCode());
        Assert.Equal("SYS", AccountType.SystemLedger.ToCode());

        // EntryType
        Assert.Equal(1, (int)EntryType.Debit);
        Assert.Equal(2, (int)EntryType.Credit);

        // HoldReason
        Assert.Equal("Card Auth Pre-check", HoldReason.CardAuthPreCheck.ToFriendlyString());
        Assert.Equal("AML Fraud Review", HoldReason.AmlFraudReview.ToFriendlyString());
        Assert.Equal("Cheque Clearance", HoldReason.ChequeClearance.ToFriendlyString());
        Assert.Equal("Escrow Milestone Guarantee", HoldReason.EscrowMilestoneGuarantee.ToFriendlyString());

        // HoldStatus & TransactionStatus
        Assert.True(Enum.IsDefined(typeof(HoldStatus), HoldStatus.Active));
        Assert.True(Enum.IsDefined(typeof(HoldStatus), HoldStatus.Released));
        Assert.True(Enum.IsDefined(typeof(HoldStatus), HoldStatus.Captured));

        Assert.True(Enum.IsDefined(typeof(TransactionStatus), TransactionStatus.Posted));
        Assert.True(Enum.IsDefined(typeof(TransactionStatus), TransactionStatus.Pending));
        Assert.True(Enum.IsDefined(typeof(TransactionStatus), TransactionStatus.Reversed));
    }
}
