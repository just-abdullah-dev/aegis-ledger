import { BankAccount, Transaction, TransactionHold, EODBatchRecord, AuditLogEntry } from '../types/ledger';

export const INITIAL_ACCOUNTS: BankAccount[] = [
  // Customer Accounts (Total Ledger: $12,450,890.00 | Total Holds: $340,660.00 | Total Available: $12,110,230.00)
  {
    id: 'acc-cust-101',
    accountNumber: 'ACC-8029-CHK',
    name: 'Apex Global Logistics LLC',
    owner: 'Elena Rostova',
    category: 'customer',
    type: 'Checking',
    currency: 'USD',
    ledgerBalance: 3840250.00,
    availableBalance: 3690250.00, // hold: $150,000.00
    status: 'Active',
    rowVersion: '0x00000000000007D4',
    openedAt: '2023-04-12',
    routingCode: '021000021',
    description: 'Commercial operating treasury account for automated wire settlements'
  },
  {
    id: 'acc-cust-102',
    accountNumber: 'ACC-4109-ESC',
    name: 'Meridian Capital Escrow Holdings',
    owner: 'Marcus Sterling',
    category: 'customer',
    type: 'Escrow',
    currency: 'USD',
    ledgerBalance: 2950000.00,
    availableBalance: 2855000.00, // hold: $95,000.00
    status: 'Active',
    rowVersion: '0x000000000000062A',
    openedAt: '2023-08-19',
    routingCode: '021000021',
    description: 'Special purpose institutional acquisition escrow fund'
  },
  {
    id: 'acc-cust-103',
    accountNumber: 'ACC-1940-SAV',
    name: 'Crestline Asset Management',
    owner: 'Sarah Jenkins',
    category: 'customer',
    type: 'Savings',
    currency: 'USD',
    ledgerBalance: 2420440.00,
    availableBalance: 2364780.00, // hold: $55,660.00
    status: 'Active',
    rowVersion: '0x000000000000091C',
    openedAt: '2024-01-05',
    routingCode: '021000021',
    description: 'High-yield corporate liquidity reserve account'
  },
  {
    id: 'acc-cust-104',
    accountNumber: 'ACC-6238-CHK',
    name: 'Vanguard Biopharma Inc',
    owner: 'Dr. Tariq Mahmood',
    category: 'customer',
    type: 'Checking',
    currency: 'USD',
    ledgerBalance: 1845100.00,
    availableBalance: 1805100.00, // hold: $40,000.00
    status: 'Active',
    rowVersion: '0x00000000000004BF',
    openedAt: '2024-03-22',
    routingCode: '021000021',
    description: 'Payroll disbursement & clinical procurement clearing account'
  },
  {
    id: 'acc-cust-105',
    accountNumber: 'ACC-3310-CHK',
    name: 'Nordic Freight & Cargo Ltd',
    owner: 'Astrid Lindgren',
    category: 'customer',
    type: 'Checking',
    currency: 'USD',
    ledgerBalance: 875100.00,
    availableBalance: 875100.00, // hold: $0.00
    status: 'Active',
    rowVersion: '0x000000000000030E',
    openedAt: '2024-06-11',
    routingCode: '021000021',
    description: 'International maritime clearing and port customs depository'
  },
  {
    id: 'acc-cust-106',
    accountNumber: 'ACC-9902-SAV',
    name: 'Helios Renewable Ventures',
    owner: 'Lucas Chen',
    category: 'customer',
    type: 'Savings',
    currency: 'USD',
    ledgerBalance: 520000.00,
    availableBalance: 520000.00, // hold: $0.00
    status: 'Frozen',
    rowVersion: '0x00000000000001FA',
    openedAt: '2024-09-01',
    routingCode: '021000021',
    description: 'Federal grant escrow lock - Temporary AML compliance review hold'
  },

  // System Ledgers (Chart of Accounts - General Ledger Core)
  {
    id: 'acc-sys-1010',
    accountNumber: 'SYS-1010-CASH',
    name: 'Federal Reserve Vault & Clearing Cash',
    owner: 'Aegis Central Treasury',
    category: 'system',
    type: 'Asset',
    currency: 'USD',
    ledgerBalance: 15800000.00,
    availableBalance: 15800000.00,
    status: 'Active',
    rowVersion: '0x0000000000001004',
    openedAt: '2022-01-01',
    routingCode: '000000000',
    description: 'Level 1 Central Bank Cash & Settlement Liquidity Pool'
  },
  {
    id: 'acc-sys-2010',
    accountNumber: 'SYS-2010-DEP',
    name: 'Customer Deposit Liabilities (General)',
    owner: 'Core Banking Engine',
    category: 'system',
    type: 'Liability',
    currency: 'USD',
    ledgerBalance: 12450890.00,
    availableBalance: 12450890.00,
    status: 'Active',
    rowVersion: '0x00000000000021E8',
    openedAt: '2022-01-01',
    routingCode: '000000000',
    description: 'Aggregate liability control account matching all customer balances'
  },
  {
    id: 'acc-sys-3010',
    accountNumber: 'SYS-3010-EQT',
    name: 'Tier-1 Regulatory Paid-In Capital',
    owner: 'Board of Governors',
    category: 'system',
    type: 'Equity',
    currency: 'USD',
    ledgerBalance: 3000000.00,
    availableBalance: 3000000.00,
    status: 'Active',
    rowVersion: '0x000000000000005F',
    openedAt: '2022-01-01',
    routingCode: '000000000',
    description: 'Statutory capital base complying with Basel III Tier 1 reserves'
  },
  {
    id: 'acc-sys-4010',
    accountNumber: 'SYS-4010-REV',
    name: 'Net Interbank Settlement & Wire Fee Revenue',
    owner: 'Revenue Operations',
    category: 'system',
    type: 'Revenue',
    currency: 'USD',
    ledgerBalance: 349110.00,
    availableBalance: 349110.00,
    status: 'Active',
    rowVersion: '0x00000000000008A2',
    openedAt: '2022-01-01',
    routingCode: '000000000',
    description: 'Earned interchange, wire processing, and ledger transaction fees'
  }
];

export const INITIAL_HOLDS: TransactionHold[] = [
  {
    id: 'HLD-90214',
    accountId: 'acc-cust-101',
    accountNumber: 'ACC-8029-CHK',
    accountName: 'Apex Global Logistics LLC',
    amount: 150000.00,
    reason: 'AML Fraud Review',
    createdAt: '2026-10-18T05:14:00Z',
    expiresAt: Date.now() + 1000 * 60 * 60 * 6.5, // 6.5 hours remaining
    status: 'Active',
    correlationId: 'corr-8f92a1b3'
  },
  {
    id: 'HLD-90215',
    accountId: 'acc-cust-102',
    accountNumber: 'ACC-4109-ESC',
    accountName: 'Meridian Capital Escrow Holdings',
    amount: 95000.00,
    reason: 'Escrow Milestone Guarantee',
    createdAt: '2026-10-18T04:20:00Z',
    expiresAt: Date.now() + 1000 * 60 * 60 * 18,
    status: 'Active',
    correlationId: 'corr-3c72b810'
  },
  {
    id: 'HLD-90216',
    accountId: 'acc-cust-103',
    accountNumber: 'ACC-1940-SAV',
    accountName: 'Crestline Asset Management',
    amount: 55660.00,
    reason: 'Cheque Clearance',
    createdAt: '2026-10-18T02:45:00Z',
    expiresAt: Date.now() + 1000 * 60 * 60 * 2.2, // 2.2 hours remaining
    status: 'Active',
    correlationId: 'corr-9a11ef04'
  },
  {
    id: 'HLD-90217',
    accountId: 'acc-cust-104',
    accountNumber: 'ACC-6238-CHK',
    accountName: 'Vanguard Biopharma Inc',
    amount: 40000.00,
    reason: 'Card Auth Pre-check',
    createdAt: '2026-10-18T06:01:00Z',
    expiresAt: Date.now() + 1000 * 60 * 45, // 45 mins remaining
    status: 'Active',
    correlationId: 'corr-2d4490c1'
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-78901',
    reference: 'TXN-2026-894201',
    timestamp: '2026-10-18T06:34:12Z',
    senderAccountId: 'acc-cust-101',
    receiverAccountId: 'acc-cust-105',
    senderAccountNum: 'ACC-8029-CHK',
    receiverAccountNum: 'ACC-3310-CHK',
    amount: 42500.00,
    status: 'Posted',
    idempotencyKey: 'idem-4f28bc91-ae70-4921-9876-0001',
    description: 'Charter shipping invoice payment #4819-B',
    category: 'Internal Transfer',
    correlationId: 'corr-7a810f22',
    journalLines: [
      {
        id: 'jl-01',
        entryType: 'DEBIT',
        accountId: 'acc-cust-101',
        accountNumber: 'ACC-8029-CHK',
        accountName: 'Apex Global Logistics LLC',
        amount: 42500.00,
        postBalance: 3840250.00,
        memo: 'DR: Settlement deduction from commercial checking'
      },
      {
        id: 'jl-02',
        entryType: 'CREDIT',
        accountId: 'acc-cust-105',
        accountNumber: 'ACC-3310-CHK',
        accountName: 'Nordic Freight & Cargo Ltd',
        amount: 42500.00,
        postBalance: 875100.00,
        memo: 'CR: Beneficiary funds receipt for cargo haulage'
      }
    ]
  },
  {
    id: 'txn-78902',
    reference: 'TXN-2026-894202',
    timestamp: '2026-10-18T06:12:44Z',
    senderAccountId: 'acc-cust-104',
    receiverAccountId: 'acc-cust-103',
    senderAccountNum: 'ACC-6238-CHK',
    receiverAccountNum: 'ACC-1940-SAV',
    amount: 125000.00,
    status: 'Posted',
    idempotencyKey: 'idem-b7e12910-c44d-4009-8812-0002',
    description: 'Corporate liquidity surplus reinvestment sweep',
    category: 'Internal Transfer',
    correlationId: 'corr-8d193b01',
    journalLines: [
      {
        id: 'jl-03',
        entryType: 'DEBIT',
        accountId: 'acc-cust-104',
        accountNumber: 'ACC-6238-CHK',
        accountName: 'Vanguard Biopharma Inc',
        amount: 125000.00,
        postBalance: 1845100.00,
        memo: 'DR: Surplus liquidity transfer'
      },
      {
        id: 'jl-04',
        entryType: 'CREDIT',
        accountId: 'acc-cust-103',
        accountNumber: 'ACC-1940-SAV',
        accountName: 'Crestline Asset Management',
        amount: 125000.00,
        postBalance: 2420440.00,
        memo: 'CR: High-yield savings deposit allocation'
      }
    ]
  },
  {
    id: 'txn-78903',
    reference: 'TXN-2026-894203',
    timestamp: '2026-10-18T05:40:02Z',
    senderAccountId: 'acc-cust-102',
    receiverAccountId: 'acc-sys-4010',
    senderAccountNum: 'ACC-4109-ESC',
    receiverAccountNum: 'SYS-4010-REV',
    amount: 1450.00,
    status: 'Posted',
    idempotencyKey: 'idem-88ac3321-7601-44bb-9901-0003',
    description: 'Quarterly institutional escrow custody maintenance fee',
    category: 'Fee Assessment',
    correlationId: 'corr-1f55a799',
    journalLines: [
      {
        id: 'jl-05',
        entryType: 'DEBIT',
        accountId: 'acc-cust-102',
        accountNumber: 'ACC-4109-ESC',
        accountName: 'Meridian Capital Escrow Holdings',
        amount: 1450.00,
        postBalance: 2950000.00,
        memo: 'DR: Custodial fee deduction'
      },
      {
        id: 'jl-06',
        entryType: 'CREDIT',
        accountId: 'acc-sys-4010',
        accountNumber: 'SYS-4010-REV',
        accountName: 'Net Interbank Settlement & Wire Fee Revenue',
        amount: 1450.00,
        postBalance: 349110.00,
        memo: 'CR: Core bank revenue recognition'
      }
    ]
  },
  {
    id: 'txn-78904',
    reference: 'TXN-2026-894204',
    timestamp: '2026-10-18T04:55:18Z',
    senderAccountId: 'acc-cust-101',
    receiverAccountId: 'acc-cust-102',
    senderAccountNum: 'ACC-8029-CHK',
    receiverAccountNum: 'ACC-4109-ESC',
    amount: 500000.00,
    status: 'Posted',
    idempotencyKey: 'idem-aa099144-8800-4bce-b620-0004',
    description: 'Acquisition earnest money deposit - Project Titan',
    category: 'Escrow Deposit',
    correlationId: 'corr-3c72b810',
    journalLines: [
      {
        id: 'jl-07',
        entryType: 'DEBIT',
        accountId: 'acc-cust-101',
        accountNumber: 'ACC-8029-CHK',
        accountName: 'Apex Global Logistics LLC',
        amount: 500000.00,
        postBalance: 3882750.00,
        memo: 'DR: Earnest money transfer to escrow facility'
      },
      {
        id: 'jl-08',
        entryType: 'CREDIT',
        accountId: 'acc-cust-102',
        accountNumber: 'ACC-4109-ESC',
        accountName: 'Meridian Capital Escrow Holdings',
        amount: 500000.00,
        postBalance: 2951450.00,
        memo: 'CR: Escrow holding credit deposit'
      }
    ]
  },
  {
    id: 'txn-78905',
    reference: 'TXN-2026-894205',
    timestamp: '2026-10-18T03:18:29Z',
    senderAccountId: 'acc-cust-105',
    receiverAccountId: 'acc-cust-104',
    senderAccountNum: 'ACC-3310-CHK',
    receiverAccountNum: 'ACC-6238-CHK',
    amount: 15200.00,
    status: 'Posted',
    idempotencyKey: 'idem-23849102-192a-43cf-8012-0005',
    description: 'Cold chain container telemetry service agreement',
    category: 'Internal Transfer',
    correlationId: 'corr-918237fa',
    journalLines: [
      {
        id: 'jl-09',
        entryType: 'DEBIT',
        accountId: 'acc-cust-105',
        accountNumber: 'ACC-3310-CHK',
        accountName: 'Nordic Freight & Cargo Ltd',
        amount: 15200.00,
        postBalance: 832600.00,
        memo: 'DR: Vendor settlement disbursement'
      },
      {
        id: 'jl-10',
        entryType: 'CREDIT',
        accountId: 'acc-cust-104',
        accountNumber: 'ACC-6238-CHK',
        accountName: 'Vanguard Biopharma Inc',
        amount: 15200.00,
        postBalance: 1970100.00,
        memo: 'CR: Service payment receivable settled'
      }
    ]
  }
];

export const INITIAL_EOD_BATCHES: EODBatchRecord[] = [
  {
    id: 'eod-30',
    batchId: 'EOD-2026-10-17',
    date: '2026-10-17',
    totalDebits: 28410290.00,
    totalCredits: 28410290.00,
    difference: 0.00,
    status: 'Completed',
    duration: '420ms',
    processedCount: 1420,
    batchHash: '0x8f2a991bce47101da421098ef732a18832a8901'
  },
  {
    id: 'eod-29',
    batchId: 'EOD-2026-10-16',
    date: '2026-10-16',
    totalDebits: 26190450.00,
    totalCredits: 26190450.00,
    difference: 0.00,
    status: 'Completed',
    duration: '388ms',
    processedCount: 1385,
    batchHash: '0x3c71a0029b4721ea10293847fed29182aa10931'
  },
  {
    id: 'eod-28',
    batchId: 'EOD-2026-10-15',
    date: '2026-10-15',
    totalDebits: 31250100.00,
    totalCredits: 31250100.00,
    difference: 0.00,
    status: 'Completed',
    duration: '445ms',
    processedCount: 1520,
    batchHash: '0x9910fe209a84101e48bc72910384a839210cbb4'
  },
  {
    id: 'eod-27',
    batchId: 'EOD-2026-10-14',
    date: '2026-10-14',
    totalDebits: 24890000.00,
    totalCredits: 24890000.00,
    difference: 0.00,
    status: 'Completed',
    duration: '395ms',
    processedCount: 1290,
    batchHash: '0x44fa821190bcdae398102948bbca3910ef99210'
  },
  {
    id: 'eod-26',
    batchId: 'EOD-2026-10-13',
    date: '2026-10-13',
    totalDebits: 27150800.00,
    totalCredits: 27150800.00,
    difference: 0.00,
    status: 'Completed',
    duration: '410ms',
    processedCount: 1362,
    batchHash: '0x12a9bc4891e2049ba3810482910fecca829104b'
  },
  {
    id: 'eod-25',
    batchId: 'EOD-2026-10-12',
    date: '2026-10-12',
    totalDebits: 29840200.00,
    totalCredits: 29840200.00,
    difference: 0.00,
    status: 'Completed',
    duration: '432ms',
    processedCount: 1478,
    batchHash: '0x66fe91048291bbac73819401ef902847a918230'
  },
  {
    id: 'eod-24',
    batchId: 'EOD-2026-10-11',
    date: '2026-10-11',
    totalDebits: 19450000.00,
    totalCredits: 19450000.00,
    difference: 0.00,
    status: 'Completed',
    duration: '340ms',
    processedCount: 994,
    batchHash: '0x88bb71049281aae8938102948cfbb2019481029'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-01',
    correlationId: 'corr-8f92a1b3',
    timestamp: '2026-10-18T06:34:12Z',
    userIp: '192.168.10.45',
    persona: 'Bank Teller',
    action: 'POST_JOURNAL_SPLIT',
    status: 'SUCCESS',
    details: 'Executed internal wire TXN-2026-894201 for $42,500.00. Invariants DR/CR matched 100%.'
  },
  {
    id: 'aud-02',
    correlationId: 'corr-3c72b810',
    timestamp: '2026-10-18T05:14:00Z',
    userIp: '10.0.4.12',
    persona: 'Compliance Auditor',
    action: 'CREATE_ACCOUNT_HOLD',
    status: 'FLAGGED',
    details: 'AML Level-2 Hold applied to ACC-8029-CHK ($150,000.00) pending OFAC beneficial ownership cert.'
  },
  {
    id: 'aud-03',
    correlationId: 'corr-1f55a799',
    timestamp: '2026-10-18T04:20:00Z',
    userIp: '127.0.0.1 (Worker)',
    persona: 'System Admin',
    action: 'EOD_HANGFIRE_BATCH',
    status: 'SUCCESS',
    details: 'Automated midnight ledger audit batch EOD-2026-10-17 verified net-zero across 1,420 postings.'
  },
  {
    id: 'aud-04',
    correlationId: 'corr-2d4490c1',
    timestamp: '2026-10-18T03:10:15Z',
    userIp: '192.168.10.78',
    persona: 'Bank Teller',
    action: 'IDEMPOTENCY_DEDUPLICATION_CHECK',
    status: 'SUCCESS',
    details: 'Idempotency key [idem-b7e12910] validated against Redis memory cache. No duplicate submission.'
  },
  {
    id: 'aud-05',
    correlationId: 'corr-9a11ef04',
    timestamp: '2026-10-18T02:05:40Z',
    userIp: '10.0.4.19',
    persona: 'Compliance Auditor',
    action: 'ACCOUNT_STATUS_CHANGE',
    status: 'FLAGGED',
    details: 'Account ACC-9902-SAV status toggled to FROZEN following suspicious structural split inquiry.'
  }
];

export const HOURLY_FLOW_DATA = [
  { hour: '00:00', debits: 450, credits: 450 },
  { hour: '02:00', debits: 280, credits: 280 },
  { hour: '04:00', debits: 620, credits: 620 },
  { hour: '06:00', debits: 1250, credits: 1250 },
  { hour: '08:00', debits: 2840, credits: 2840 },
  { hour: '10:00', debits: 4100, credits: 4100 },
  { hour: '12:00', debits: 3890, credits: 3890 },
  { hour: '14:00', debits: 4620, credits: 4620 },
  { hour: '16:00', debits: 3750, credits: 3750 },
  { hour: '18:00', debits: 2100, credits: 2100 },
  { hour: '20:00', debits: 1450, credits: 1450 },
  { hour: '22:00', debits: 890, credits: 890 },
];
