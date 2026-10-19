import {
  AccountDto,
  TransactionHoldDto,
  SolvencyHealthDto,
  User,
  TransactionDto,
  TransferRequest,
  TransferResult,
} from '@/types';

export const MOCK_USER: User = {
  id: 'usr-92841-corp',
  name: 'Marcus Vance',
  email: 'marcus.vance@apexcapital.io',
  accountNumber: 'ACC-882190-USD',
  role: 'Treasury Controller',
  tier: 'Commercial',
};

export let mockAccounts: AccountDto[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    accountNumber: 'ACC-882190-USD',
    name: 'Primary Liquidity & Settlement',
    owner: 'Apex Financial Capital LLC',
    category: 'customer',
    type: 'Checking',
    currency: 'USD',
    ledgerBalance: 12450890.0,
    availableBalance: 12110230.0,
    status: 'Active',
    rowVersion: '0x00000000000007E1',
    openedAt: '2025-01-15T08:00:00Z',
    routingCode: '021000021',
    description: 'Corporate high-frequency settlement liquidity pool',
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    accountNumber: 'ACC-104928-USD',
    name: 'Escrow Milestone Guarantee Vault',
    owner: 'Apex Financial Capital LLC',
    category: 'customer',
    type: 'Escrow',
    currency: 'USD',
    ledgerBalance: 4820000.0,
    availableBalance: 3920000.0,
    status: 'Active',
    rowVersion: '0x00000000000005C2',
    openedAt: '2025-03-20T10:30:00Z',
    routingCode: '021000021',
    description: 'Ring-fenced multi-party collateral custody repository',
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
    accountNumber: 'ACC-552140-USD',
    name: 'Operating Yield Reserve',
    owner: 'Apex Financial Capital LLC',
    category: 'customer',
    type: 'Savings',
    currency: 'USD',
    ledgerBalance: 84520.5,
    availableBalance: 82320.5,
    status: 'Active',
    rowVersion: '0x00000000000003A4',
    openedAt: '2025-06-11T14:15:00Z',
    routingCode: '021000021',
    description: 'Interest-bearing treasury surplus buffer',
  },
  {
    id: 'd4e5f6a7-b8c9-0123-def4-456789012345',
    accountNumber: 'ACC-992011-USD',
    name: 'Meridian Global Clearing Partner',
    owner: 'Meridian Global Securities Ltd',
    category: 'customer',
    type: 'Checking',
    currency: 'USD',
    ledgerBalance: 25000000.0,
    availableBalance: 25000000.0,
    status: 'Active',
    rowVersion: '0x00000000000009B8',
    openedAt: '2025-02-01T09:00:00Z',
    routingCode: '021000021',
    description: 'External institutional counterparty clearing ledger',
  },
];

export let mockHolds: TransactionHoldDto[] = [
  {
    id: 'hld-001-aml',
    accountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    accountNumber: 'ACC-882190-USD',
    accountName: 'Primary Liquidity & Settlement',
    amount: 250000.0,
    reason: 'AML Fraud Review',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    expiresAtEpochMs: Date.now() + 3600000 * 22,
    status: 'Active',
    correlationId: 'corr-aml-7782',
  },
  {
    id: 'hld-002-card',
    accountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    accountNumber: 'ACC-882190-USD',
    accountName: 'Primary Liquidity & Settlement',
    amount: 90660.0,
    reason: 'Card Auth Pre-check',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    expiresAtEpochMs: Date.now() + 3600000 * 48,
    status: 'Active',
    correlationId: 'corr-card-9941',
  },
  {
    id: 'hld-003-escrow',
    accountId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    accountNumber: 'ACC-104928-USD',
    accountName: 'Escrow Milestone Guarantee Vault',
    amount: 900000.0,
    reason: 'Escrow Milestone Guarantee',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    expiresAtEpochMs: Date.now() + 3600000 * 120,
    status: 'Active',
    correlationId: 'corr-escrow-1011',
  },
  {
    id: 'hld-004-cheque',
    accountId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
    accountNumber: 'ACC-552140-USD',
    accountName: 'Operating Yield Reserve',
    amount: 2200.0,
    reason: 'Cheque Clearance',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    expiresAtEpochMs: Date.now() + 3600000 * 16,
    status: 'Active',
    correlationId: 'corr-cheque-3321',
  },
  // Historical Holds (Released and Captured)
  {
    id: 'hld-hist-005',
    accountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    accountNumber: 'ACC-882190-USD',
    accountName: 'Primary Liquidity & Settlement',
    amount: 150000.0,
    reason: 'Card Auth Pre-check',
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    expiresAtEpochMs: Date.now() - 3600000 * 24,
    status: 'Released',
    correlationId: 'corr-card-hist-551',
  },
  {
    id: 'hld-hist-006',
    accountId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    accountNumber: 'ACC-104928-USD',
    accountName: 'Escrow Milestone Guarantee Vault',
    amount: 450000.0,
    reason: 'Escrow Milestone Guarantee',
    createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    expiresAtEpochMs: Date.now() - 3600000 * 48,
    status: 'Captured',
    correlationId: 'corr-escrow-hist-889',
  },
];

export let mockTransactions: TransactionDto[] = [
  {
    id: 'tx-8812-a1',
    reference: 'TX-20261019-9021',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    senderAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    receiverAccountId: 'd4e5f6a7-b8c9-0123-def4-456789012345',
    senderAccountNum: 'ACC-882190-USD',
    receiverAccountNum: 'ACC-992011-USD',
    amount: 125000.0,
    status: 'Posted',
    idempotencyKey: 'd3b07384-d113-4660-8d5c-f94d4d6b63d6',
    description: 'Corporate intraday liquidity sweep',
    category: 'Treasury Settlement',
    correlationId: 'corr-sweep-4921',
    journalLines: [
      {
        id: 'jl-01',
        entryType: 'DEBIT',
        accountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        accountNumber: 'ACC-882190-USD',
        accountName: 'Primary Liquidity & Settlement',
        amount: 125000.0,
        postBalance: 12450890.0,
        memo: 'Intraday sweep to Meridian Global',
      },
      {
        id: 'jl-02',
        entryType: 'CREDIT',
        accountId: 'd4e5f6a7-b8c9-0123-def4-456789012345',
        accountNumber: 'ACC-992011-USD',
        accountName: 'Meridian Global Clearing Partner',
        amount: 125000.0,
        postBalance: 25000000.0,
        memo: 'Intraday sweep inbound receipt',
      },
    ],
  },
  {
    id: 'tx-7741-b2',
    reference: 'TX-20261018-4412',
    timestamp: new Date(Date.now() - 3600000 * 26).toISOString(),
    senderAccountId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    receiverAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    senderAccountNum: 'ACC-104928-USD',
    receiverAccountNum: 'ACC-882190-USD',
    amount: 75000.0,
    status: 'Posted',
    idempotencyKey: '8a2b53f1-7c98-48b4-b97c-9ef1548e24c2',
    description: 'Escrow Milestone Stage 1 release',
    category: 'Escrow Release',
    correlationId: 'corr-escrow-stage1',
    journalLines: [
      {
        id: 'jl-03',
        entryType: 'DEBIT',
        accountId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
        accountNumber: 'ACC-104928-USD',
        accountName: 'Escrow Milestone Guarantee Vault',
        amount: 75000.0,
        postBalance: 4820000.0,
        memo: 'Stage 1 verified disbursement',
      },
      {
        id: 'jl-04',
        entryType: 'CREDIT',
        accountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        accountNumber: 'ACC-882190-USD',
        accountName: 'Primary Liquidity & Settlement',
        amount: 75000.0,
        postBalance: 12575890.0,
        memo: 'Stage 1 release credit',
      },
    ],
  },
];

export const MOCK_HEALTH: SolvencyHealthDto = {
  system: 'AegisLedger Core Banking Engine',
  version: '1.0.0',
  status: 'Healthy',
  solvencyInvariant: 'SUM(Debits) == SUM(Credits)',
  totalBookLedgerBalance: 42355410.5,
  totalAvailableLiquidity: 41112550.5,
  activeSecurityHolds: 1242860.0,
  isZeroDriftVerified: true,
  timestampUtc: new Date().toISOString(),
};

// Process transfer in mock state ensuring double-entry balance updates
export function executeMockTransfer(request: TransferRequest): TransferResult {
  const sender = mockAccounts.find((a) => a.accountNumber === request.senderAccountNumber);
  const receiver = mockAccounts.find((a) => a.accountNumber === request.receiverAccountNumber);

  if (!sender) {
    throw new Error(`Sender account ${request.senderAccountNumber} not found.`);
  }

  if (sender.availableBalance < request.amount) {
    throw new Error(
      `Insufficient available liquidity. Transfer amount $${request.amount.toFixed(
        2
      )} exceeds available balance $${sender.availableBalance.toFixed(2)}.`
    );
  }

  // Deduct from sender
  sender.availableBalance -= request.amount;
  sender.ledgerBalance -= request.amount;

  // Credit receiver if found in system
  if (receiver) {
    receiver.availableBalance += request.amount;
    receiver.ledgerBalance += request.amount;
  }

  const txId = `tx-${Date.now().toString(36)}`;
  const reference = `TX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
  const idempotencyKey = request.idempotencyKey || `idemp-${Date.now()}`;
  const timestamp = new Date().toISOString();

  const debitLine = {
    id: `jl-dr-${Date.now()}`,
    entryType: 'DEBIT' as const,
    accountId: sender.id,
    accountNumber: sender.accountNumber,
    accountName: sender.name,
    amount: request.amount,
    postBalance: sender.ledgerBalance,
    memo: request.description || 'P2P Instant Internal Transfer',
  };

  const creditLine = {
    id: `jl-cr-${Date.now()}`,
    entryType: 'CREDIT' as const,
    accountId: receiver?.id || 'ext-rec-id',
    accountNumber: request.receiverAccountNumber,
    accountName: receiver?.name || 'Counterparty Settlement Ledger',
    amount: request.amount,
    postBalance: receiver ? receiver.ledgerBalance : request.amount,
    memo: request.description || 'P2P Instant Inbound Credit',
  };

  const newTx: TransactionDto = {
    id: txId,
    reference,
    timestamp,
    senderAccountId: sender.id,
    receiverAccountId: receiver?.id || 'ext-rec-id',
    senderAccountNum: sender.accountNumber,
    receiverAccountNum: request.receiverAccountNumber,
    amount: request.amount,
    status: 'Posted',
    idempotencyKey,
    description: request.description || 'P2P Transfer',
    category: 'P2P Transfer',
    journalLines: [debitLine, creditLine],
    correlationId: `corr-${Date.now()}`,
  };

  mockTransactions = [newTx, ...mockTransactions];

  return {
    id: txId,
    reference,
    senderAccountNum: sender.accountNumber,
    receiverAccountNum: request.receiverAccountNumber,
    amount: request.amount,
    newSenderAvailableBalance: sender.availableBalance,
    status: 'Posted',
    idempotencyKey,
    timestamp,
    description: request.description,
    journalLines: [debitLine, creditLine],
  };
}

export const MOCK_ACCOUNTS = mockAccounts;
export const MOCK_HOLDS = mockHolds;
