# AegisLedger Customer Web Portal - Phase 1: Architecture, Auth & Wallet Core

## Objective
Establish the dedicated `/customer/*` architecture, customer authentication, and the Core Wallet Dashboard displaying double-entry balance calculations.

## Implemented Specifications

### 1. Dedicated Customer Authentication
- Route: `/customer/login`
- Backend API Endpoint: `POST /api/v1/auth/customer/login`
- Role Guard: Validates that the authenticating user holds the `Customer` role. Rejects non-customer roles with instructions to use the Operator Portal.
- Cookies & Security: Issues `HttpOnly`, `SameSite=Lax` cookies (`aegis_access_token`, `aegis_refresh_token`, `aegis_session_active`, `aegis_user_persona`).

### 2. Client-Side Navigation Guard (`proxy.ts`)
- Automatically redirects unauthenticated requests on `/customer/*` to `/customer/login`.
- Confines authenticated `Customer` sessions strictly to `/customer/*`.
- Redirects bank staff operators visiting `/customer/*` back to `/`.

### 3. Core Wallet Dashboard (`/customer/dashboard`)
- Primary Account cards displaying Account Number, Account Type (`Checking` / `Savings` / `Escrow`), Currency (`USD`), and Wire Routing Code.
- Multi-account selector for clients with multiple deposits.
- **Book Ledger Balance**: Settled balance in Core Banking ledger.
- **Available Liquidity**: Available funds for immediate transfer.
- **Active Security Holds**: Ring-fenced funds under verification.
- Mathematical Invariant Verification:
  `Available Balance == Book Ledger Balance - Active Security Holds`
- Live background refetching via TanStack Query.
