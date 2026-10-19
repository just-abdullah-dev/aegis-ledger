export type Currency = 'USD' | 'EUR' | 'PKR';

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

export interface AccountDto {
  id: string;
  accountNumber: string;
  name: string;
  owner: string;
  category: AccountCategory | string;
  type: AccountType | string;
  currency: string;
  ledgerBalance: number;
  availableBalance: number;
  status: AccountStatus | string;
  rowVersion: string;
  openedAt: string;
  routingCode: string;
  description: string;
}

export type HoldReason =
  | 'Card Auth Pre-check'
  | 'AML Fraud Review'
  | 'Cheque Clearance'
  | 'Escrow Milestone Guarantee';

export interface TransactionHoldDto {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  reason: HoldReason | string;
  createdAt: string;
  expiresAtEpochMs: number;
  status: 'Active' | 'Released' | 'Captured' | string;
  correlationId: string;
}

export type TransactionStatus = 'Posted' | 'Pending' | 'Reversed';

export interface JournalLineDto {
  id: string;
  entryType: 'DEBIT' | 'CREDIT';
  accountId: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  postBalance: number;
  memo: string;
}

export interface TransactionDto {
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
  journalLines: JournalLineDto[];
  correlationId: string;
  isReversed?: boolean;
}

export interface TransferRequest {
  senderAccountNumber: string;
  receiverAccountNumber: string;
  amount: number;
  description: string;
  idempotencyKey?: string;
}

export interface TransferResult {
  id: string;
  reference: string;
  senderAccountNum: string;
  receiverAccountNum: string;
  amount: number;
  newSenderAvailableBalance: number;
  status: TransactionStatus;
  idempotencyKey: string;
  timestamp: string;
  description: string;
  journalLines: JournalLineDto[];
}

export interface SolvencyHealthDto {
  system: string;
  version: string;
  status: string;
  solvencyInvariant: string;
  totalBookLedgerBalance: number;
  totalAvailableLiquidity: number;
  activeSecurityHolds: number;
  isZeroDriftVerified: boolean;
  timestampUtc: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
  role: string;
  tier: 'Retail' | 'Commercial' | 'Escrow Vault';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
  tokenType: string;
}

export interface LoginRequest {
  accountIdOrEmail: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: ('FACIAL_RECOGNITION' | 'FINGERPRINT' | 'IRIS' | 'UNKNOWN')[];
}
