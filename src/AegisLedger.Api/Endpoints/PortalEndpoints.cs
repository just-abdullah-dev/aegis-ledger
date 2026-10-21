namespace AegisLedger.Api.Endpoints;

public static class PortalEndpoints
{
    public static void MapPortalEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/", () => Results.Content(LandingPageHtml, "text/html; charset=utf-8"));
    }

    private const string LandingPageHtml = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AegisLedger v1.0 - Core Banking & General Ledger Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111726;
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover-border: rgba(99, 102, 241, 0.4);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --emerald: #10b981;
      --emerald-bg: rgba(16, 185, 129, 0.12);
      --blue: #3b82f6;
      --indigo: #6366f1;
      --amber: #f59e0b;
      --purple: #a855f7;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      line-height: 1.5;
      background-image: 
        radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.12) 0px, transparent 50%),
        radial-gradient(at 50% 50%, rgba(15, 23, 42, 0.5) 0px, transparent 100%);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px;
      width: 100%;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
    }

    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #fff;
    }

    .brand-sub {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
    }

    .sys-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: var(--emerald-bg);
      border: 1px solid rgba(16, 185, 129, 0.3);
      font-size: 13px;
      font-weight: 600;
      color: var(--emerald);
    }

    .sys-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 10px var(--emerald);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    /* Solvency Hero Banner */
    .hero-banner {
      background: linear-gradient(145deg, #131b2e, #0e1524);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 40px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      position: relative;
      overflow: hidden;
    }

    .hero-banner::after {
      content: '';
      position: absolute;
      top: -100px;
      right: -100px;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.15), transparent 70%);
      pointer-events: none;
    }

    .hero-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }

    .hero-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    .hero-desc {
      color: var(--text-muted);
      font-size: 14px;
      max-width: 720px;
      margin-bottom: 28px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }

    .metric-card {
      background: rgba(17, 24, 39, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      backdrop-filter: blur(10px);
    }

    .metric-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .metric-val {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      font-weight: 700;
      color: #fff;
    }

    .metric-val.emerald { color: #34d399; }
    .metric-val.amber { color: #fbbf24; }

    .solvency-eq {
      margin-top: 20px;
      padding: 12px 18px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      color: #a7f3d0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Section Title */
    .section-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title span {
      background: linear-gradient(135deg, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Hub Cards Grid */
    .hub-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .hub-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s ease;
      position: relative;
      text-decoration: none;
      color: inherit;
    }

    .hub-card:hover {
      transform: translateY(-4px);
      border-color: var(--card-hover-border);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    }

    .card-top {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 16px;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .icon-swagger { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .icon-hangfire { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .icon-web { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .icon-mobile { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .icon-redis { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .icon-health { background: rgba(14, 165, 233, 0.15); color: #38bdf8; }

    .card-title {
      font-size: 17px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }

    .card-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
    }

    .card-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .card-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 13px;
      font-weight: 600;
      color: #818cf8;
    }

    .card-action span.target {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #64748b;
    }

    /* Auth Personas */
    .auth-banner {
      background: #111827;
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 40px;
    }

    .auth-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }

    .auth-item {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 14px;
    }

    .auth-role {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #818cf8;
      margin-bottom: 4px;
    }

    .auth-creds {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #f1f5f9;
    }

    .auth-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }

    /* Footer */
    footer {
      margin-top: auto;
      text-align: center;
      padding: 24px;
      color: #64748b;
      font-size: 12px;
      border-top: 1px solid var(--card-border);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="logo-badge">🏛️</div>
        <div>
          <div class="brand-title">AegisLedger v1.0</div>
          <div class="brand-sub">Enterprise Core Banking & Immutable Double-Entry General Ledger</div>
        </div>
      </div>
      <div class="sys-pill">
        <div class="sys-dot"></div>
        <span id="sys-status">Core Engine Operational</span>
      </div>
    </header>

    <!-- Hub Cards -->
    <div class="section-title">
      <span>🚀 Core Infrastructure & Applications Hub</span>
    </div>

    <div class="hub-grid">
      <!-- Swagger API Docs -->
      <a href="/swagger" class="hub-card" target="_blank">
        <div>
          <div class="card-top">
            <div class="card-icon icon-swagger">📜</div>
            <div>
              <div class="card-title">OpenAPI / Swagger UI</div>
              <div class="card-badge">REST Endpoints Map</div>
            </div>
          </div>
          <div class="card-desc">
            Explore and test all Core Banking endpoints: Accounts, Double-Entry Transfers, Security Holds, and EOD Batch Reconciliation.
          </div>
        </div>
        <div class="card-action">
          <span>Open Interactive Swagger</span>
          <span class="target">/swagger ↗</span>
        </div>
      </a>

      <!-- Hangfire Scheduler -->
      <a href="/hangfire" class="hub-card" target="_blank">
        <div>
          <div class="card-top">
            <div class="card-icon icon-hangfire">⏱️</div>
            <div>
              <div class="card-title">Hangfire Operations Dashboard</div>
              <div class="card-badge">Background Workers</div>
            </div>
          </div>
          <div class="card-desc">
            Live dashboard for background jobs: Daily EOD reconciliation at 00:00 UTC and automated expired security hold releases every 5 minutes.
          </div>
        </div>
        <div class="card-action">
          <span>Open Hangfire Dashboard</span>
          <span class="target">/hangfire ↗</span>
        </div>
      </a>

      <!-- Web Admin Portal -->
      <a href="http://localhost:3000" class="hub-card" target="_blank">
        <div>
          <div class="card-top">
            <div class="card-icon icon-web">🖥️</div>
            <div>
              <div class="card-title">Web Operations Portal</div>
              <div class="card-badge">React 19 / Vite / Tailwind v4</div>
            </div>
          </div>
          <div class="card-desc">
            Enterprise bank operations portal featuring Chart of Accounts, Double-Entry Journal Viewer, Holds Workspace, and EOD Audit Hashes.
          </div>
        </div>
        <div class="card-action">
          <span>Launch Web Portal</span>
          <span class="target">:3000 ↗</span>
        </div>
      </a>

      <!-- Mobile Wallet Client -->
      <a href="http://localhost:8081" class="hub-card" target="_blank">
        <div>
          <div class="card-top">
            <div class="card-icon icon-mobile">📱</div>
            <div>
              <div class="card-title">Mobile Sovereign Wallet</div>
              <div class="card-badge">React Native / Expo SDK 58</div>
            </div>
          </div>
          <div class="card-desc">
            Customer banking wallet client supporting FaceID/TouchID biometric auth, instant P2P transfers, QR code engine, and transaction receipts.
          </div>
        </div>
        <div class="card-action">
          <span>Launch Mobile Preview</span>
          <span class="target">:8081 ↗</span>
        </div>
      </a>

      <!-- Redis 7 Cache Engine -->
      <div class="hub-card">
        <div>
          <div class="card-top">
            <div class="card-icon icon-redis">⚡</div>
            <div>
              <div class="card-title">Redis 7 Distributed Engine</div>
              <div class="card-badge">Cache & Idempotency</div>
            </div>
          </div>
          <div class="card-desc">
            Enforces 24-hour idempotent transaction posting (`X-Idempotency-Key`), preventing double-debits on network timeouts and retries.
          </div>
        </div>
        <div class="card-action">
          <span style="color: var(--amber)">Port 6379 (Active)</span>
          <span class="target">localhost:6379</span>
        </div>
      </div>

      <!-- Health Probe -->
      <a href="/api/v1/health" class="hub-card" target="_blank">
        <div>
          <div class="card-top">
            <div class="card-icon icon-health">🩺</div>
            <div>
              <div class="card-title">Solvency Health Probe</div>
              <div class="card-badge">JSON Diagnostic Endpoint</div>
            </div>
          </div>
          <div class="card-desc">
            Provides automated readiness and mathematical balance verification diagnostics for load balancers and container orchestrators.
          </div>
        </div>
        <div class="card-action">
          <span>Inspect Health JSON</span>
          <span class="target">/api/v1/health ↗</span>
        </div>
      </a>
    </div>

    <!-- Default Test Personas -->
    <div class="auth-banner">
      <div class="card-title" style="font-size: 15px; margin-bottom: 2px;">🔐 Pre-Configured Test Credentials</div>
      <div style="font-size: 13px; color: var(--text-muted);">Use these accounts in the Swagger UI (`/api/v1/auth/token`) or Web/Mobile apps:</div>
      
      <div class="auth-grid">
        <div class="auth-item">
          <div class="auth-role">System Administrator</div>
          <div class="auth-creds">admin / Admin123!</div>
          <div class="auth-sub">Full administrative privileges & audit</div>
        </div>
        <div class="auth-item">
          <div class="auth-role">Compliance Auditor</div>
          <div class="auth-creds">auditor / Auditor123!</div>
          <div class="auth-sub">EOD reconciliation & audit trail</div>
        </div>
        <div class="auth-item">
          <div class="auth-role">Bank Teller</div>
          <div class="auth-creds">teller / Teller123!</div>
          <div class="auth-sub">Post transfers & apply/release holds</div>
        </div>
        <div class="auth-item">
          <div class="auth-role">Retail Customer</div>
          <div class="auth-creds">customer / Customer123!</div>
          <div class="auth-sub">Consumer mobile wallet & P2P payments</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer>
      AegisLedger v1.0 • .NET 10 (C# 14) • SQL Server 2022 • Redis 7 • React 19 • React Native
    </footer>
  </div>

  <script>
    // Live Public Health Diagnostics Poller
    async function refreshHealth() {
      try {
        const res = await fetch('/api/v1/health');
        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            document.getElementById('sys-status').innerText = 'Core Engine ' + data.status;
            const healthEl = document.getElementById('val-health');
            if (healthEl) healthEl.innerText = data.status;
          }
          if (data.solvencyInvariant) {
            const invEl = document.getElementById('val-invariant');
            if (invEl) invEl.innerText = data.solvencyInvariant;
          }
          if (data.isZeroDriftVerified !== undefined) {
            const zdEl = document.getElementById('val-zero-drift');
            if (zdEl) zdEl.innerText = data.isZeroDriftVerified ? 'Verified Zero-Drift' : 'Drift Detected';
          }
          if (data.services) {
            if (data.services.api && document.getElementById('svc-api')) {
              document.getElementById('svc-api').innerText = 'API Engine: ' + data.services.api.label;
            }
            if (data.services.redis && document.getElementById('svc-redis')) {
              document.getElementById('svc-redis').innerText = 'Redis Cache: ' + data.services.redis.label;
            }
            if (data.services.hangfire && document.getElementById('svc-hangfire')) {
              document.getElementById('svc-hangfire').innerText = 'Hangfire Scheduler: ' + data.services.hangfire.label;
            }
          }
        }
      } catch (e) {
        console.warn('Health diagnostics poll skipped:', e);
      }
    }
    refreshHealth();
    setInterval(refreshHealth, 5000);
  </script>
</body>
</html>
""";
}
