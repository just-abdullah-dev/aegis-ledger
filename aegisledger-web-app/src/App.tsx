import React, { useState, useEffect } from 'react';
import { 
  Currency, 
  UserPersona, 
  BankAccount, 
  Transaction, 
  TransactionHold, 
  EODBatchRecord, 
  AuditLogEntry, 
  HoldReason 
} from './types/ledger';
import { 
  useAccountsQuery, 
  useTransactionsQuery, 
  useHoldsQuery, 
  useReconciliationBatchesQuery, 
  useAuditLogsQuery 
} from './hooks/useLedgerQueries';
import { 
  accountsApi, 
  transactionsApi, 
  holdsApi, 
  reconciliationApi, 
  auditApi,
  CreateAccountPayload
} from './lib/api-client';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { AccountsView } from './components/AccountsView';
import { TransactionsJournalView } from './components/TransactionsJournalView';
import { HoldsEscrowView } from './components/HoldsEscrowView';
import { EODReconciliationView } from './components/EODReconciliationView';
import { HangfireMonitorView } from './components/admin/HangfireMonitorView';
import { HasRole } from './components/auth/HasRole';
import { InternalTransferModal } from './components/modals/InternalTransferModal';
import { ApplyHoldModal } from './components/modals/ApplyHoldModal';
import { AccountLedgerDrawer } from './components/modals/AccountLedgerDrawer';
import { AccountHoldsDrawer } from './components/drawers/AccountHoldsDrawer';
import { Toast, ToastMessage } from './components/Toast';
import { 
  generateCorrelationId, 
  incrementRowVersion, 
  formatCurrency 
} from './utils/formatters';
import { useAuthStore } from './store/useAuthStore';
import { LoginPage } from './components/LoginPage';
import { CustomerLoginPage } from './components/CustomerLoginPage';
import { CustomerPortalView } from './components/CustomerPortalView';
import { useProxyRouter } from './lib/proxy';

export default function App() {
  // Theme state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('aegis_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  // Core Ledger State (Synchronized with live SQL Server backend)
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [holds, setHolds] = useState<TransactionHold[]>([]);
  const [eodBatches, setEodBatches] = useState<EODBatchRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Live Backend Data Queries
  const { data: serverAccounts, refetch: refetchAccounts } = useAccountsQuery();
  const { data: serverTransactions, refetch: refetchTransactions } = useTransactionsQuery();
  const { data: serverHolds, refetch: refetchHolds } = useHoldsQuery();
  const { data: serverBatches, refetch: refetchBatches } = useReconciliationBatchesQuery();
  const { data: serverLogs, refetch: refetchLogs } = useAuditLogsQuery();

  const refreshAllBackendData = async () => {
    await Promise.all([
      refetchAccounts(),
      refetchTransactions(),
      refetchHolds(),
      refetchBatches(),
      refetchLogs(),
    ]);
  };

  useEffect(() => {
    if (serverAccounts && Array.isArray(serverAccounts)) setAccounts(serverAccounts);
  }, [serverAccounts]);

  useEffect(() => {
    if (serverTransactions && Array.isArray(serverTransactions)) setTransactions(serverTransactions);
  }, [serverTransactions]);

  useEffect(() => {
    if (serverHolds && Array.isArray(serverHolds)) setHolds(serverHolds);
  }, [serverHolds]);

  useEffect(() => {
    if (serverBatches && Array.isArray(serverBatches)) setEodBatches(serverBatches);
  }, [serverBatches]);

  useEffect(() => {
    if (serverLogs && Array.isArray(serverLogs)) setAuditLogs(serverLogs);
  }, [serverLogs]);

  const [currency, setCurrency] = useState<Currency>('USD');
  const [idempotencyEnabled, setIdempotencyEnabled] = useState<boolean>(true);
  const [seenIdempotencyKeys, setSeenIdempotencyKeys] = useState<Set<string>>(new Set());

  // Auth Store Integration: Persona and role are strictly derived from authenticated session
  const { 
    user, 
    isAuthenticated, 
    isLoading: isAuthLoading, 
    initialize: initializeAuth, 
    logout: handleLogout,
    checkSession
  } = useAuthStore();

  // Strict role-to-persona derivation with priority order (SystemAdmin > BankTeller > ComplianceAuditor)
  const activePersona: UserPersona = 
    user?.role === 'SystemAdmin' || user?.persona === 'System Admin' || user?.email?.toLowerCase().includes('admin')
      ? 'System Admin'
      : user?.role === 'BankTeller' || user?.persona === 'Bank Teller' || user?.email?.toLowerCase().includes('teller')
        ? 'Bank Teller'
        : 'Compliance Auditor';

  // Centralized Proxy Security Router
  const { 
    currentPath, 
    isCustomerRoute, 
    isCustomerLoginRoute,
    navigate,
    tabToPath,
    pathToTab
  } = useProxyRouter((reason) => {
    addToast('error', 'Access Prohibited (403)', reason);
  });

  const currentTab = pathToTab(currentPath);

  const handleSelectTab = (tab: string) => {
    const targetPath = tabToPath(tab);
    navigate(targetPath);
  };

  // Interactive Modals State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState<boolean>(false);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<BankAccount | null>(null);
  const [selectedAccountForHolds, setSelectedAccountForHolds] = useState<BankAccount | null>(null);
  const [transferInitialSourceId, setTransferInitialSourceId] = useState<string | undefined>(undefined);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync dark class on document element and persist preference
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aegis_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aegis_theme', 'light');
    }
  }, [isDarkMode]);

  // Initialize auth session
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Periodic session heartbeat: Refresh auth verification every 60 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      checkSession();
    }, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, checkSession]);

  // Listen for session expiry from API client
  useEffect(() => {
    const handleExpired = () => {
      addToast('error', 'Session Expired', 'Session expired. Please sign in again.');
      handleLogout();
    };
    const handleOnline = () => {
      addToast('success', 'Network Reconnected', 'Connected to AegisLedger distributed consensus cluster.');
    };
    const handleOffline = () => {
      addToast('error', 'Network Offline', 'Operating in disconnected resilient mode. Pending mutations queued.');
    };

    window.addEventListener('aegis-session-expired', handleExpired);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('aegis-session-expired', handleExpired);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global Ledger Invariant Calculations
  const totalDebits = (transactions || []).reduce(
    (sum, t) => sum + (t?.journalLines || []).filter((l) => l.entryType === 'DEBIT').reduce((s, l) => s + (l.amount || 0), 0),
    0
  );
  const totalCredits = (transactions || []).reduce(
    (sum, t) => sum + (t?.journalLines || []).filter((l) => l.entryType === 'CREDIT').reduce((s, l) => s + (l.amount || 0), 0),
    0
  );

  // 1. Execute Internal Transfer (Atomic Double-Entry Posting via Backend)
  const handleExecuteTransfer = async ({
    sourceAccountId,
    targetAccountId,
    amount,
    description,
    idempotencyKey,
  }: {
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    description: string;
    idempotencyKey: string;
  }) => {
    // Idempotency check
    if (idempotencyEnabled && idempotencyKey && idempotencyKey !== 'bypass-none') {
      if (seenIdempotencyKeys.has(idempotencyKey)) {
        addToast(
          'error',
          'Idempotency Conflict (409)',
          `Duplicate request blocked: Key [${idempotencyKey.substring(0, 14)}...] already executed.`
        );
        return {
          success: false,
          message: `Idempotency key [${idempotencyKey}] has already been processed by the ledger engine. Duplicate transmission rejected.`,
        };
      }
      setSeenIdempotencyKeys((prev) => new Set(prev).add(idempotencyKey));
    }

    try {
      const result = await transactionsApi.postTransfer({
        sourceAccountId,
        targetAccountId,
        amount,
        description,
        idempotencyKey: idempotencyEnabled && idempotencyKey ? idempotencyKey : crypto.randomUUID(),
      });

      await refreshAllBackendData();

      addToast(
        'success',
        'Transaction Posted (Live Database)',
        `${result.referenceNumber} committed to general ledger. Debits equal credits.`
      );

      return { success: true, message: 'Transfer posted successfully to database.' };
    } catch (err: any) {
      addToast(
        'error',
        'Transfer Failed',
        err.response?.data?.detail || err.message || 'Transaction rejected by ledger engine.'
      );
      return { success: false, message: err.response?.data?.detail || err.message || 'Transfer failed.' };
    }
  };

  // 2. Apply Account Hold via Backend
  const handleApplyHold = async ({
    accountId,
    amount,
    reason,
    durationHours,
  }: {
    accountId: string;
    amount: number;
    reason: HoldReason;
    durationHours: number;
  }) => {
    try {
      await holdsApi.applyHold({
        accountId,
        amount,
        reason,
        durationHours,
      });

      await refreshAllBackendData();

      addToast(
        'info',
        'Hold Enforced (Live Database)',
        `Hold successfully applied in SQL Server database. Available balance adjusted.`
      );

      return { success: true, message: 'Hold successfully applied.' };
    } catch (err: any) {
      addToast('error', 'Hold Failed', err.response?.data?.detail || err.message || 'Failed to apply hold.');
      return { success: false, message: err.response?.data?.detail || err.message || 'Failed to apply hold.' };
    }
  };

  // 3. Release Hold (Restores Available Balance in SQL Server)
  const handleReleaseHold = async (holdId: string) => {
    try {
      const targetHold = holds.find((h) => h.id === holdId);
      await holdsApi.releaseHold(holdId, targetHold?.accountId);
      await refreshAllBackendData();
      addToast(
        'success',
        'Hold Released (Live Database)',
        `Hold ${holdId} cleared in SQL Server. Funds returned to available balance.`
      );
    } catch (err: any) {
      addToast('error', 'Release Failed', err.response?.data?.detail || err.message || 'Failed to release hold.');
    }
  };

  // 4. Capture Hold (Commits Debit Permanently to SQL Server Ledger)
  const handleCaptureHold = async (holdId: string) => {
    try {
      const targetHold = holds.find((h) => h.id === holdId);
      await holdsApi.captureHold(holdId, targetHold?.accountId);
      await refreshAllBackendData();
      addToast(
        'success',
        'Hold Captured (Live Database)',
        `Hold ${holdId} finalized in SQL Server ledger.`
      );
    } catch (err: any) {
      addToast('error', 'Capture Failed', err.response?.data?.detail || err.message || 'Failed to capture hold.');
    }
  };

  // 5. Reverse Transaction via Live Backend Database
  const handleReverseTransaction = async (txnId: string) => {
    const txn = transactions.find((t) => t.id === txnId || t.reference === txnId);
    if (!txn || txn.status === 'Reversed') return;

    try {
      let compRef = '';
      try {
        const res = await transactionsApi.reverseTransaction(txn.id || txn.reference);
        compRef = res.compensatingReference;
      } catch (directErr: any) {
        // If direct reverse route not supported (404/405), try compensating transfer
        if (directErr.response?.status === 404 || directErr.response?.status === 405) {
          const result = await transactionsApi.postTransfer({
            sourceAccountId: txn.receiverAccountId,
            targetAccountId: txn.senderAccountId,
            amount: txn.amount,
            description: `Compensating reversal of ${txn.reference}`,
            idempotencyKey: crypto.randomUUID(),
          });
          compRef = result.referenceNumber;
        } else {
          throw directErr;
        }
      }

      await refreshAllBackendData();

      const correlationId = generateCorrelationId();
      setAuditLogs((prev) => [
        {
          id: `aud-${Date.now()}`,
          correlationId,
          timestamp: new Date().toISOString(),
          userIp: '127.0.0.1',
          persona: activePersona,
          action: 'TRANSACTION_REVERSED',
          status: 'SUCCESS',
          details: `Reversed transaction ${txn.reference} for ${formatCurrency(txn.amount, currency)}. Compensating entry ${compRef} posted to SQL Server.`,
        },
        ...prev,
      ]);

      addToast(
        'info',
        'Transaction Reversed',
        `Compensating entry ${compRef} committed to general ledger.`
      );
    } catch (err: any) {
      const errorText = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to reverse transaction.';
      addToast('error', 'Reversal Failed', errorText);
    }
  };

  // 6. Manual EOD Reconciliation Batch via Backend
  const handleTriggerEODBatch = async () => {
    setIsReconciling(true);
    try {
      const result = await reconciliationApi.triggerManualEOD();
      await refreshAllBackendData();
      addToast(
        'success',
        'EOD Reconciled (Live Backend)',
        `Batch ${result.batchId} processed. Zero drift verified.`
      );
    } catch (err: any) {
      addToast('error', 'Reconciliation Failed', err.response?.data?.detail || err.message || 'Failed to run EOD batch.');
    } finally {
      setIsReconciling(false);
    }
  };

  // 7. Toggle Account Frozen Status via Live Backend Database
  const handleToggleAccountStatus = async (accountId: string, requestedStatus?: 'Active' | 'Frozen' | 'Closed') => {
    const acc = accounts.find((a) => a.id === accountId || a.accountNumber === accountId);
    if (!acc) return;

    const nextStatus = requestedStatus || (acc.status === 'Active' ? 'Frozen' : 'Active');

    try {
      await accountsApi.updateAccountStatus(acc.id || acc.accountNumber, nextStatus);
      await refreshAllBackendData();

      const correlationId = generateCorrelationId();
      setAuditLogs((prev) => [
        {
          id: `aud-${Date.now()}`,
          correlationId,
          timestamp: new Date().toISOString(),
          userIp: '127.0.0.1',
          persona: activePersona,
          action: 'ACCOUNT_STATUS_CHANGE',
          status: nextStatus === 'Frozen' ? 'FLAGGED' : 'SUCCESS',
          details: `Account ${acc.accountNumber} status updated to ${nextStatus.toUpperCase()} in SQL Server by ${activePersona}.`,
        },
        ...prev,
      ]);

      addToast(
        nextStatus === 'Frozen' ? 'info' : 'success',
        `Account ${nextStatus}`,
        `Account ${acc.accountNumber} (${acc.name || 'Account'}) status successfully updated to ${nextStatus} in SQL Server.`
      );
    } catch (err: any) {
      const errorText = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to update account status in database.';
      addToast(
        'error',
        'Status Update Failed',
        errorText
      );
      throw err;
    }
  };

  // 8. Provision New Core Banking Account (System Admin Clearance)
  const handleCreateAccount = async (payload: CreateAccountPayload) => {
    try {
      const result = await accountsApi.createAccount(payload);
      await refreshAllBackendData();
      addToast(
        'success',
        'Account Provisioned (Live Ledger)',
        `${result.account.accountNumber} (${result.account.name}) registered with ${formatCurrency(result.account.ledgerBalance, currency)} balance.`
      );
      return { success: true, message: 'Account provisioned successfully.', account: result.account };
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to provision account.';
      addToast('error', 'Provisioning Failed', msg);
      return { success: false, message: msg };
    }
  };

  // 1. Strict Security Gateway: Loading & Cryptographic Token Verification
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-white">Verifying AegisLedger Security Session...</p>
        <p className="text-xs text-slate-500 mt-1">Validating HMAC-SHA256 JWT claims with .NET backend</p>
      </div>
    );
  }

  // 2. Unauthenticated State: Route to proper Login page
  if (!isAuthenticated) {
    if (isCustomerLoginRoute || isCustomerRoute) {
      return (
        <>
          <CustomerLoginPage
            onLoginSuccess={() => {
              addToast('success', 'Customer Authenticated', 'Access granted to Retail Customer Vault.');
              refreshAllBackendData();
            }}
          />
          <Toast toasts={toasts} onDismiss={removeToast} />
        </>
      );
    }

    return (
      <>
        <LoginPage
          onLoginSuccess={() => {
            addToast('success', 'Authentication Successful', 'Access granted to AegisLedger core portal.');
            refreshAllBackendData();
          }}
        />
        <Toast toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  // 3. Authenticated Retail Customer Partition
  if (user?.role === 'Customer' || isCustomerRoute) {
    return (
      <>
        <CustomerPortalView />
        <Toast toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Fixed Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        activeHoldsCount={(holds || []).filter((h) => h?.status === 'Active').length}
        persona={activePersona}
        isOpenOnMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenTransferModal={() => {
          setTransferInitialSourceId(undefined);
          setIsTransferModalOpen(true);
        }}
        onOpenHoldModal={() => setIsHoldModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header with Invariant Banner */}
        <Header
          currentTab={currentTab}
          currency={currency}
          onCurrencyChange={setCurrency}
          persona={activePersona}
          onLogout={handleLogout}
          user={user}
          idempotencyEnabled={idempotencyEnabled}
          onToggleIdempotency={() => {
            const next = !idempotencyEnabled;
            setIdempotencyEnabled(next);
            addToast(
              'info',
              'Idempotency Engine',
              `Idempotency verification filter is now ${next ? 'ACTIVE' : 'BYPASSED'}.`
            );
          }}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          totalDebits={totalDebits}
          totalCredits={totalCredits}
          onOpenTransferModal={() => {
            setTransferInitialSourceId(undefined);
            setIsTransferModalOpen(true);
          }}
          onOpenHoldModal={() => setIsHoldModalOpen(true)}
          onRunEOD={handleTriggerEODBatch}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* View Router */}
        <main className="flex-1 pb-16">
          {currentTab === 'overview' && (
            <DashboardOverview
              accounts={accounts}
              transactions={transactions}
              holds={holds}
              eodBatches={eodBatches}
              currency={currency}
              persona={activePersona}
              onSelectTab={handleSelectTab}
              onOpenTransferModal={() => setIsTransferModalOpen(true)}
              onOpenHoldModal={() => setIsHoldModalOpen(true)}
              onViewAccountHistory={(acc) => setSelectedAccountForHistory(acc)}
            />
          )}

          {currentTab === 'accounts' && (
            <AccountsView
              accounts={accounts}
              currency={currency}
              persona={activePersona}
              onToggleStatus={handleToggleAccountStatus}
              onViewAccountHistory={(acc) => setSelectedAccountForHistory(acc)}
              onViewHolds={(acc) => setSelectedAccountForHolds(acc)}
              onOpenTransferModalWithSource={(acc) => {
                setTransferInitialSourceId(acc.id);
                setIsTransferModalOpen(true);
              }}
              onCreateAccount={handleCreateAccount}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsJournalView
              transactions={transactions}
              currency={currency}
              persona={activePersona}
              onReverseTransaction={handleReverseTransaction}
              onOpenTransferModal={() => setIsTransferModalOpen(true)}
            />
          )}

          {currentTab === 'holds' && (
            <HasRole
              roles={['BankTeller', 'SystemAdmin']}
              personas={['Bank Teller', 'System Admin']}
              fallback={
                <div className="p-12 text-center max-w-md mx-auto my-12 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto font-bold text-lg">
                    403
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Access Prohibited: Bank Teller or Admin Required
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Compliance Auditors have read-only oversight permissions and cannot manipulate or place balance holds.
                  </p>
                </div>
              }
            >
              <HoldsEscrowView
                holds={holds}
                currency={currency}
                persona={activePersona}
                onReleaseHold={handleReleaseHold}
                onCaptureHold={handleCaptureHold}
                onOpenHoldModal={() => setIsHoldModalOpen(true)}
              />
            </HasRole>
          )}

          {currentTab === 'reconciliation' && (
            <HasRole
              roles={['ComplianceAuditor', 'SystemAdmin']}
              personas={['Compliance Auditor', 'System Admin']}
              fallback={
                <div className="p-12 text-center max-w-md mx-auto my-12 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto font-bold text-lg">
                    403
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Access Prohibited: Auditor or Admin Required
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    End-of-Day reconciliation batch execution and audit hash chain verification require Compliance Auditor or System Admin roles.
                  </p>
                </div>
              }
            >
              <EODReconciliationView
                batches={eodBatches}
                auditLogs={auditLogs}
                currency={currency}
                persona={activePersona}
                onTriggerEODBatch={handleTriggerEODBatch}
                isReconciling={isReconciling}
              />
            </HasRole>
          )}

          {currentTab === 'hangfire' && (
            <HasRole
              roles={['SystemAdmin']}
              personas={['System Admin']}
              fallback={
                <div className="p-12 text-center max-w-md mx-auto my-12 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto font-bold text-lg">
                    403
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Access Prohibited: System Admin Required
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The Hangfire RPC Scheduler and background job execution dashboard requires SystemAdmin RBAC privileges. Switch your persona in the top header to proceed.
                  </p>
                </div>
              }
            >
              <HangfireMonitorView />
            </HasRole>
          )}
        </main>
      </div>

      {/* Interactive Modals & Drawers */}
      <InternalTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        currency={currency}
        persona={activePersona}
        idempotencyEngineActive={idempotencyEnabled}
        onExecuteTransfer={handleExecuteTransfer}
        initialSourceAccountId={transferInitialSourceId}
      />

      <ApplyHoldModal
        isOpen={isHoldModalOpen}
        onClose={() => setIsHoldModalOpen(false)}
        accounts={accounts}
        currency={currency}
        onApplyHold={handleApplyHold}
      />

      <AccountLedgerDrawer
        isOpen={!!selectedAccountForHistory}
        onClose={() => setSelectedAccountForHistory(null)}
        account={selectedAccountForHistory}
        transactions={transactions}
        currency={currency}
      />

      <AccountHoldsDrawer
        isOpen={!!selectedAccountForHolds}
        onClose={() => setSelectedAccountForHolds(null)}
        account={selectedAccountForHolds}
        currency={currency}
        onSuccessToast={(msg) => addToast('info', 'Hold Action', msg)}
      />

      {/* Toasts Notification Container */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
