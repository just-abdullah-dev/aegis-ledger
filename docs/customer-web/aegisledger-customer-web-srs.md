# AegisLedger Customer Web Portal - Software Requirements Specification (SRS)

**Target Platform**: Responsive Web Application (Desktop & Mobile Web)  
**Framework**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Zustand + TanStack Query  
**Backend Integration**: AegisLedger .NET 10 Core Banking Web API (SQL Server 2022, Redis 7, Hangfire)  
**Route Base**: `/customer/*`

---

## 1. Executive Summary & Vision
AegisLedger Customer Web Portal is a high-security, real-time enterprise retail banking portal for customers. Adapted from the AegisLedger Mobile SRS, it connects directly to the AegisLedger .NET 10 backend API, providing transparent sovereign access to double-entry ledger balances, available liquidity, ring-fenced account holds, instant P2P internal transfers with mandatory client-side idempotency protection, and digital transaction receipts.

---

## 2. Technology Stack & Web Architecture
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4 (responsive desktop + mobile viewports), Lucide React icons
- **State Management**: Zustand (`useAuthStore`)
- **Server Cache & Sync**: TanStack Query (`@tanstack/react-query`) with automatic background refetch and pull-to-refresh
- **Routing & Navigation**: Client-side Navigation Proxy (`proxy.ts`) with HTML5 History API (`/customer/login`, `/customer/dashboard`, `/customer/transfer`, `/customer/holds`, `/customer/transactions`, `/customer/receive`)
- **Security & Session**:
  - Secure `HttpOnly`, `SameSite=Lax` JWT authentication cookies
  - Automated Bearer token injection and refresh token rotation on 401
  - Client-side UUID v4 `X-Idempotency-Key` headers on all transfer mutations
  - Step-up security confirmation dialog (password confirmation) for transfers >= $1,000.00
  - Zero plain-text credential persistence

---

## 3. Three-Phase Implementation Specification

### Phase 1: Customer Web Architecture, Authentication & Wallet Core
- **Dedicated Route Protection**:
  - Unauthenticated visits to `/customer/*` redirect to `/customer/login`.
  - Authenticated staff (Tellers, Auditors, Admins) are redirected to the operator portal `/`.
  - Authenticated customers are strictly confined to `/customer/*`.
- **Wallet Core Dashboard (`/customer/dashboard`)**:
  - Primary Customer Account cards displaying Account Number, Account Type (Checking, Savings, Escrow), Currency (USD).
  - High-visibility distinction between **Book Ledger Balance**, **Available Liquidity**, and **Active Security Holds**.
  - Visual verification banner: `Double-Entry Invariant: Available Balance == Ledger Balance - Active Holds`.
  - Real-time balance refresh via TanStack Query.

### Phase 2: Instant P2P Transfers, Idempotency Engine & Holds Management
- **Instant P2P Transfer Engine (`/customer/transfer`)**:
  - Source Account selector (from user's owned accounts).
  - Destination Account Number input (with quick account presets and format validation).
  - Amount input with real-time balance guard (disallowing amounts > Available Balance).
  - Client-Side Idempotency: Auto-generates unique `X-Idempotency-Key` (UUID v4) per transfer attempt to guarantee zero double-charging.
  - Transfer Confirmation Modal: Detailed breakdown of Sender, Recipient, Amount, Estimated Fee ($0.00), and Post-Transfer Available Balance.
  - Step-Up Security Re-auth: For high-value transfers (>= $1,000.00), prompt for password confirmation before dispatch.
- **Account Holds & Escrow Inspection View (`/customer/holds`)**:
  - Tab 1: **Active Holds**: Displays Hold ID, Amount ($), Reason Badge (`CardAuthPreCheck`, `AmlFraudReview`, `ChequeClearance`, `EscrowMilestoneLock`), and real-time expiration countdown timer.
  - Tab 2: **Hold History**: Displays Released and Captured holds.
  - Informative callout: "Held funds are temporarily ring-fenced from your Available Liquidity while remaining on your Ledger Balance."
- **Transaction History & Digital Receipts (`/customer/transactions`)**:
  - Searchable and filterable transaction feed (Debits in Red `-`, Credits in Green `+`).
  - Transaction detail modal with breakdown of double-entry legs.
  - Digital Banking Receipt generator with print / PDF-ready view.
- **Receive Funds & QR Code (`/customer/receive`)**:
  - High-resolution SVG QR Code encoding the customer's Account Number and Wire Routing Code.
  - One-click copy buttons for Account Number and Routing Code.

### Phase 3: Security Hardening, Real-Time Alerts & Resilience
- **Network Resilience**:
  - Browser online/offline event listener with sticky offline warning banner: "Offline Mode - Transactions Disabled".
- **Real-Time Banking Alerts**:
  - Toast and alert notifications for money sent, money received, holds placed, and EOD confirmations.
- **Session Lifecycle & Security**:
  - 60-second background heartbeat validation.
  - Safe Sign Out: Complete invalidation of server cookies and client session storage.
