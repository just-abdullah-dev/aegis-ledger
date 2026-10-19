# AegisLedger Mobile App (React Native / Expo / TypeScript)

Enterprise Sovereign Wallet & Double-Entry Liquidity Engine for Retail, Treasury, and Escrow Banking.

---

## 🛠 Technology Stack

- **Framework**: React Native with TypeScript (Expo SDK 58 / React 19)
- **State Management**: Zustand (`authStore`, `accountStore`) + TanStack Query / React Query
- **Security & Storage**: `expo-secure-store` (AES-256 encrypted hardware keystores)
- **Biometric Guard**: `expo-local-authentication` (FaceID, TouchID, and Fingerprint)
- **Networking**: Axios with request/response interceptors (Token Refresh rotation & `X-Idempotency-Key` UUID v4 header engine)
- **Scanning & Codes**: `expo-camera` (`CameraView`) + `react-native-qrcode-svg`
- **Notifications**: `expo-notifications` (Banking alerts for credits, holds, and EOD batches)
- **Resilience**: `@react-native-community/netinfo` with offline banner & exponential query backoff

---

## 🚀 Features by Phase

### Phase 1: Core Wallet & Biometric Authentication
- **Secure Auth**: JWT access/refresh token persistence in iOS Keychain / Android Keystore.
- **Biometric Challenge**: Automatic lock prompt when resuming app from background (`AppState`).
- **Wallet Core**:
  - **Book Ledger Balance**: `$12,450,890.00`
  - **Available Liquidity**: `$12,110,230.00` (emerald highlight)
  - **Active Holds Ring-Fenced**: `$340,660.00` (amber warning)
- **Double-Entry Invariant**: Live equation banner verifying `LedgerBalance - ActiveHolds == AvailableBalance`.
- **Account Switcher**: Carousel supporting Commercial Treasury, Escrow Vault, and Retail Checking.

### Phase 2: Instant P2P Transfers, Idempotency & Holds Management
- **Client-Side Idempotency**: Automatically attaches UUID v4 `X-Idempotency-Key` header with persistent in-flight state to prevent double-charging on network retries.
- **QR Code Engine**:
  - `AccountQrModal`: Renders customer's account QR code with native Share integration.
  - `QrScanModal`: Camera scanner with reticle overlay and sandbox testing presets.
- **Holds & Escrow Management**:
  - Tab 1: Active Holds with real-time expiration countdown timers.
  - Tab 2: Hold History (Released vs. Captured).
  - Informational callout explaining encumbered funds.
- **Transaction History & Digital Receipts**:
  - Searchable by reference, memo, or account number with DR/CR filter chips.
  - Journal entry drawer revealing double-entry legs.
  - Exportable digital transaction receipts via native `Share.share`.

### Phase 3: Notifications, Security Hardening & Production Release
- **Push Notifications**: Integrated `expo-notifications` with banking event triggers (Money Received, Hold Placed, EOD Reconciliation).
- **Step-Up Biometric Authorization**: Mandates FaceID/TouchID or master PIN authorization for transfers exceeding the `$1,000.00` threshold.
- **Network Resilience**: Sticky `OfflineBanner` alerting users and disabling payouts when offline, with exponential backoff on queries.
- **Release Engineering**:
  - Configured `app.json` with bundle identifiers (`com.aegisledger.mobile`), camera, FaceID, and push notification permissions.
  - Configured `eas.json` for Android APK/AAB and iOS IPA builds.

---

## 💻 Development Commands

```bash
# Start development server
npm start

# Run on Web (Browser Preview)
npm run web

# Run on Android Emulator
npm run android

# Run on iOS Simulator
npm run ios

# TypeScript Typecheck
npx tsc --noEmit

# Production Builds with EAS
npm run build:android
npm run build:ios
```
