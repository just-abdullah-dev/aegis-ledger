# AegisLedger Customer Web Portal - Phase 2: Instant Transfers, Idempotency & Holds

## Objective
Implement Instant P2P Customer Transfers with client-side idempotency protection, Account Holds & Escrow Inspection with live expiry countdowns, and Transaction History with Digital Receipts.

## Implemented Specifications

### 1. Instant P2P Transfer Engine (`/customer/transfer`)
- Form Fields:
  - Source Account selector (from user's owned accounts).
  - Recipient Account Number input (with quick recipient chips).
  - Transfer Amount ($ USD).
  - Description / Memo note.
- Real-Time Balance Validation:
  - Validates that `Amount <= AvailableBalance` dynamically.
  - Percentage chips (`10%`, `25%`, `50%`, `MAX`) for quick input.
- Client-Side Idempotency Header:
  - Automatically generates a unique UUID v4 `X-Idempotency-Key` header per transfer attempt to prevent double-charging on network retries.
- Step-Up Security Re-Authorization:
  - For high-value transfers (`Amount >= $1,000.00`), prompts for password re-verification before submission.
- Backend API:
  - Calls `POST /api/v1/transactions/transfer` with `DestinationAccountNumber` resolution and idempotency token.

### 2. Account Holds & Escrow Inspection View (`/customer/holds`)
- **Active Holds Tab**:
  - Lists all active security holds ring-fenced on customer accounts.
  - Displays Hold ID, Amount ($ USD), Reason Badge (`CardAuthPreCheck`, `AmlFraudReview`, `ChequeClearance`, `EscrowMilestoneGuarantee`), and live countdown timer (`hh:mm:ss`) to expiration.
- **Hold History Tab**:
  - Historical view of Released and Captured holds.
- Educational Banner: Explains that held funds remain on Book Ledger Balance but are ring-fenced from Available Liquidity.

### 3. Transaction History & Digital Receipts (`/customer/transactions`)
- Filterable and searchable statement feed.
- Visual legs: Outgoing debits (`- $X.XX` in Red) vs incoming deposits (`+ $X.XX` in Green).
- Official Digital Banking Receipt Modal:
  - Reference Number, Timestamp, Sender, Receiver, Amount, Status, and SHA-256 seal.
  - "Print Statement" button triggering formatted browser print.

### 4. Receive Funds & QR Code (`/customer/receive`)
- Scalable vector QR Code embedding account number.
- One-click copy for Account Number and Routing Code (`021000021`).
