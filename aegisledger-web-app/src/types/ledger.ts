export type Currency = 'USD' | 'EUR' | 'PKR';

export type UserPersona = 'Compliance Auditor' | 'Bank Teller' | 'System Admin';

export type AccountCategory = 'customer' | 'system';

export type AccountType = 
  | 'Checking' 
  | 'Savings' 
  | 'Escrow' 
  | 'Treasury' 
  | 'Asset' 
  | 'Liability' 
  | 'Equity' 
  | 'Revenue';

export type AccountStatus = 'Active' | 'Frozen' | 'Closed';

export interface BankAccount {
  id: string;
  accountNumber: string;
  name: string;
  owner: string;
  category: AccountCategory;
  type: AccountType;
  currency: 'USD'; // Base storage always in USD
  ledgerBalance: number;
  availableBalance: number;
  status: AccountStatus;
  rowVersion: string; // e.g. "0x00000000000007D4"
  openedAt: string;
  routingCode: string;
  description: string;
}

export type TransactionStatus = 'Posted' | 'Pending' | 'Reversed';

export interface JournalLine {
  id: string;
  entryType: 'DEBIT' | 'CREDIT';
  accountId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  postBalance: number;
  memo: string;
}

export interface Transaction {
  id: string;
  reference: string;
  timestamp: string;
  senderAccountId: string;
  receiverAccountId: string;
  senderAccountNum: string;
  receiverAccountNum: string;
  amount: number;
  status: TransactionStatus;
  idempotencyKey: string;
  description: string;
  category: string;
  journalLines: JournalLine[];
  correlationId: string;
  isReversed?: boolean;
}

export type HoldReason = 
  | 'Card Auth Pre-check' 
  | 'AML Fraud Review' 
  | 'Cheque Clearance' 
  | 'Escrow Milestone Guarantee';

export interface TransactionHold {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  reason: HoldReason;
  createdAt: string;
  expiresAt: number; // epoch ms
  status: 'Active' | 'Released' | 'Captured';
  correlationId: string;
  notes?: string;
}

export interface EODBatchRecord {
  id: string;
  batchId: string;
  date: string;
  totalDebits: number;
  totalCredits: number;
  difference: number;
  status: 'Completed' | 'Processing' | 'Failed';
  duration: string;
  processedCount: number;
  batchHash: string;
}

export interface AuditLogEntry {
  id: string;
  correlationId: string;
  timestamp: string;
  userIp: string;
  persona: UserPersona;
  action: string;
  status: 'SUCCESS' | 'BLOCKED' | 'FLAGGED';
  details: string;
}

export const CURRENCY_RATES: Record<Currency, { rate: number; symbol: string; label: string }> = {
  USD: { rate: 1.0, symbol: '$', label: 'USD ($)' },
  EUR: { rate: 0.92, symbol: '€', label: 'EUR (€)' },
  PKR: { rate: 278.50, symbol: '₨', label: 'PKR (₨)' },
};
