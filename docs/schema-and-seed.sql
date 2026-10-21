-- ==============================================================================
-- AegisLedger v1.0 - Core Banking & Immutable Double-Entry Ledger System
-- SQL Server 2022 Database Schema & Seed Data Script
-- ==============================================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AegisLedgerDb')
BEGIN
    CREATE DATABASE AegisLedgerDb;
END
GO

USE AegisLedgerDb;
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ------------------------------------------------------------------------------
-- 1. Accounts Table
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Accounts')
BEGIN
    CREATE TABLE Accounts (
        AccountId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Accounts PRIMARY KEY,
        AccountNumber NVARCHAR(20) NOT NULL CONSTRAINT UQ_Accounts_AccountNumber UNIQUE,
        Name NVARCHAR(150) NOT NULL,
        Owner NVARCHAR(150) NOT NULL,
        Category INT NOT NULL, -- 1: Customer, 2: System
        Type INT NOT NULL,     -- 1: Checking, 2: Savings, 3: Escrow, 4: SystemLedger, 5: Treasury, etc.
        Currency NVARCHAR(3) NOT NULL CONSTRAINT DF_Accounts_Currency DEFAULT 'USD',
        LedgerBalance DECIMAL(18, 4) NOT NULL CONSTRAINT DF_Accounts_LedgerBalance DEFAULT 0,
        ActiveHoldsSum DECIMAL(18, 4) NOT NULL CONSTRAINT DF_Accounts_ActiveHoldsSum DEFAULT 0,
        Status INT NOT NULL CONSTRAINT DF_Accounts_Status DEFAULT 1, -- 1: Active, 2: Frozen, 3: Closed
        RowVersion ROWVERSION NOT NULL,
        OpenedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Accounts_OpenedAtUtc DEFAULT SYSUTCDATETIME(),
        RoutingCode NVARCHAR(20) NULL,
        Description NVARCHAR(500) NULL
    );

    CREATE NONCLUSTERED INDEX IX_Accounts_Category_Status ON Accounts (Category, Status);
END
GO

-- ------------------------------------------------------------------------------
-- 2. Transactions Table
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Transactions')
BEGIN
    CREATE TABLE Transactions (
        TransactionId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Transactions PRIMARY KEY,
        ReferenceNumber NVARCHAR(50) NOT NULL CONSTRAINT UQ_Transactions_ReferenceNumber UNIQUE,
        IdempotencyKey NVARCHAR(100) NOT NULL CONSTRAINT UQ_Transactions_IdempotencyKey UNIQUE,
        Amount DECIMAL(18, 4) NOT NULL,
        Currency NVARCHAR(3) NOT NULL,
        Description NVARCHAR(250) NOT NULL,
        Category NVARCHAR(50) NOT NULL,
        SenderAccountId UNIQUEIDENTIFIER NULL CONSTRAINT FK_Transactions_SenderAccount FOREIGN KEY REFERENCES Accounts(AccountId),
        ReceiverAccountId UNIQUEIDENTIFIER NULL CONSTRAINT FK_Transactions_ReceiverAccount FOREIGN KEY REFERENCES Accounts(AccountId),
        SenderAccountNumber NVARCHAR(20) NULL,
        ReceiverAccountNumber NVARCHAR(20) NULL,
        Status INT NOT NULL CONSTRAINT DF_Transactions_Status DEFAULT 1, -- 1: Posted, 2: Pending, 3: Rejected, 4: Reversed
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_Transactions_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        PostedAtUtc DATETIME2 NULL,
        CorrelationId NVARCHAR(64) NOT NULL,
        IsReversed BIT NOT NULL CONSTRAINT DF_Transactions_IsReversed DEFAULT 0,
        OriginalTransactionId UNIQUEIDENTIFIER NULL
    );

    CREATE NONCLUSTERED INDEX IX_Transactions_CreatedAtUtc ON Transactions (CreatedAtUtc DESC);
END
GO

-- ------------------------------------------------------------------------------
-- 3. LedgerEntries Table (Immutable Journal Lines)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LedgerEntries')
BEGIN
    CREATE TABLE LedgerEntries (
        EntryId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_LedgerEntries PRIMARY KEY,
        TransactionId UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_LedgerEntries_Transactions FOREIGN KEY REFERENCES Transactions(TransactionId),
        AccountId UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_LedgerEntries_Accounts FOREIGN KEY REFERENCES Accounts(AccountId),
        EntryType INT NOT NULL, -- 1: Debit, 2: Credit
        Amount DECIMAL(18, 4) NOT NULL,
        PostBalance DECIMAL(18, 4) NOT NULL,
        Memo NVARCHAR(250) NOT NULL,
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_LedgerEntries_CreatedAtUtc DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_LedgerEntries_AccountId_CreatedAt ON LedgerEntries (AccountId, CreatedAtUtc DESC);
    CREATE NONCLUSTERED INDEX IX_LedgerEntries_TransactionId ON LedgerEntries (TransactionId);
END
GO

-- ------------------------------------------------------------------------------
-- 4. TransactionHolds Table
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TransactionHolds')
BEGIN
    CREATE TABLE TransactionHolds (
        HoldId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TransactionHolds PRIMARY KEY,
        AccountId UNIQUEIDENTIFIER NOT NULL CONSTRAINT FK_TransactionHolds_Accounts FOREIGN KEY REFERENCES Accounts(AccountId),
        HeldAmount DECIMAL(18, 4) NOT NULL,
        Reason INT NOT NULL, -- 1: CardAuthPreCheck, 2: EscrowMilestoneGuarantee, 3: ChequeClearance, 4: AmlFraudReview, etc.
        Status INT NOT NULL CONSTRAINT DF_TransactionHolds_Status DEFAULT 1, -- 1: Active, 2: Released, 3: Captured, 4: Expired
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_TransactionHolds_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
        ExpiresAtUtc DATETIME2 NOT NULL,
        ResolvedAtUtc DATETIME2 NULL,
        CorrelationId NVARCHAR(64) NOT NULL
    );

    CREATE NONCLUSTERED INDEX IX_TransactionHolds_Status_Expires ON TransactionHolds (Status, ExpiresAtUtc) WHERE Status = 1;
END
GO

-- ------------------------------------------------------------------------------
-- 5. EOD Reconciliation Batches Table
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EodReconciliationBatches')
BEGIN
    CREATE TABLE EodReconciliationBatches (
        BatchId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_EodReconciliationBatches PRIMARY KEY,
        ReconciliationDate DATETIME2 NOT NULL,
        TotalDebits DECIMAL(18, 4) NOT NULL,
        TotalCredits DECIMAL(18, 4) NOT NULL,
        TotalDifference DECIMAL(18, 4) NOT NULL,
        TotalAccountsReconciled INT NOT NULL,
        TotalTransactionsEvaluated INT NOT NULL,
        Status INT NOT NULL, -- 1: Balanced, 2: DiscrepancyDetected
        BatchAuditHash NVARCHAR(64) NOT NULL,
        CreatedAtUtc DATETIME2 NOT NULL CONSTRAINT DF_EodBatches_CreatedAtUtc DEFAULT SYSUTCDATETIME()
    );

    CREATE NONCLUSTERED INDEX IX_EodBatches_ReconciliationDate ON EodReconciliationBatches (ReconciliationDate DESC);
END
GO

-- ------------------------------------------------------------------------------
-- 6. Canonical Seed Data (SRS Solvency Invariant: $12,450,890.00 = $12,110,230.00 + $340,660.00)
-- ------------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Accounts WHERE AccountNumber = 'ACC-8029-CHK')
BEGIN
    DECLARE @Acc1Id UNIQUEIDENTIFIER = '193E74D6-A98A-433B-BDDA-FE01171FCE76';
    DECLARE @Acc2Id UNIQUEIDENTIFIER = '45DC0155-6128-4BA7-9FEA-E40C46B29532';
    DECLARE @Acc3Id UNIQUEIDENTIFIER = '5C1E70FA-53B4-4B28-868C-0824B71B5FEE';
    DECLARE @Acc4Id UNIQUEIDENTIFIER = '2E6F22BD-96E8-41C2-8287-BAFA309289E2';
    DECLARE @Acc5Id UNIQUEIDENTIFIER = '4A135111-2098-466D-B029-7756B7F98C0B';
    DECLARE @Acc6Id UNIQUEIDENTIFIER = '056F74D4-927A-459E-B3A9-F3C18196E6D5';

    -- Insert Accounts
    INSERT INTO Accounts (AccountId, AccountNumber, Name, Owner, Category, Type, Currency, LedgerBalance, ActiveHoldsSum, Status, OpenedAtUtc, RoutingCode, Description)
    VALUES
        (@Acc1Id, 'ACC-8029-CHK', 'Apex Global Logistics LLC', 'Elena Rostova', 1, 1, 'USD', 3840250.0000, 150000.0000, 1, '2023-04-12T00:00:00Z', '021000021', 'Commercial operating treasury account for automated wire settlements'),
        (@Acc2Id, 'ACC-4109-ESC', 'Meridian Capital Escrow Holdings', 'Marcus Sterling', 1, 3, 'USD', 2950000.0000, 95000.0000, 1, '2023-08-19T00:00:00Z', '021000021', 'Special purpose institutional acquisition escrow fund'),
        (@Acc3Id, 'ACC-1940-SAV', 'Crestline Asset Management', 'Sarah Jenkins', 1, 2, 'USD', 2420440.0000, 55660.0000, 1, '2024-01-05T00:00:00Z', '021000021', 'Interest-bearing asset management liquidity pool'),
        (@Acc4Id, 'ACC-6238-CHK', 'Vanguard Biopharma Inc', 'Dr. Tariq Mahmood', 1, 1, 'USD', 1845100.0000, 40000.0000, 1, '2023-11-14T00:00:00Z', '021000021', 'Primary clinical research disbursement account'),
        (@Acc5Id, 'ACC-3310-CHK', 'Nordic Freight & Cargo Ltd', 'Astrid Lindgren', 1, 1, 'USD', 875100.0000, 0.0000, 1, '2024-03-22T00:00:00Z', '021000021', 'Cross-border maritime clearing account'),
        (@Acc6Id, 'ACC-9902-SAV', 'Helios Renewable Ventures', 'Lucas Chen', 1, 2, 'USD', 520000.0000, 0.0000, 2, '2024-02-18T00:00:00Z', '021000021', 'Project finance escrow savings account');

    -- Insert Active Holds
    INSERT INTO TransactionHolds (HoldId, AccountId, HeldAmount, Reason, Status, CreatedAtUtc, ExpiresAtUtc, CorrelationId)
    VALUES
        (NEWID(), @Acc1Id, 150000.0000, 1, 1, SYSUTCDATETIME(), DATEADD(HOUR, 24, SYSUTCDATETIME()), 'corr-seed-hold-1'),
        (NEWID(), @Acc2Id, 95000.0000, 2, 1, SYSUTCDATETIME(), DATEADD(HOUR, 48, SYSUTCDATETIME()), 'corr-seed-hold-2'),
        (NEWID(), @Acc3Id, 55660.0000, 3, 1, SYSUTCDATETIME(), DATEADD(HOUR, 12, SYSUTCDATETIME()), 'corr-seed-hold-3'),
        (NEWID(), @Acc4Id, 40000.0000, 4, 1, SYSUTCDATETIME(), DATEADD(HOUR, 72, SYSUTCDATETIME()), 'corr-seed-hold-4');

    -- Insert Initial Balanced Transaction & Journal Lines
    DECLARE @TxnId UNIQUEIDENTIFIER = NEWID();
    INSERT INTO Transactions (TransactionId, ReferenceNumber, IdempotencyKey, Amount, Currency, Description, Category, SenderAccountId, ReceiverAccountId, SenderAccountNumber, ReceiverAccountNumber, Status, CreatedAtUtc, PostedAtUtc, CorrelationId, IsReversed)
    VALUES (@TxnId, 'TXN-20261019-91823741', 'idem-seed-initial-wire', 150000.0000, 'USD', 'Inter-account liquidity rebalancing', 'WireTransfer', @Acc1Id, @Acc2Id, 'ACC-8029-CHK', 'ACC-4109-ESC', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 'corr-seed-initial', 0);

    INSERT INTO LedgerEntries (EntryId, TransactionId, AccountId, EntryType, Amount, PostBalance, Memo, CreatedAtUtc)
    VALUES
        (NEWID(), @TxnId, @Acc1Id, 1, 150000.0000, 3840250.0000, 'Wire Settlement Outflow', SYSUTCDATETIME()),
        (NEWID(), @TxnId, @Acc2Id, 2, 150000.0000, 2950000.0000, 'Wire Settlement Inflow', SYSUTCDATETIME());

    PRINT 'AegisLedger canonical seed data inserted successfully.';
END
GO
