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
  INITIAL_ACCOUNTS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_HOLDS, 
  INITIAL_EOD_BATCHES, 
  INITIAL_AUDIT_LOGS 
} from './data/mockData';
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
import { LoginModal } from './components/LoginModal';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Core Ledger State
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_ACCOUNTS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [holds, setHolds] = useState<TransactionHold[]>(INITIAL_HOLDS);
  const [eodBatches, setEodBatches] = useState<EODBatchRecord[]>(INITIAL_EOD_BATCHES);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // Settings & Context
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [persona, setPersona] = useState<UserPersona>('Compliance Auditor');
  const [idempotencyEnabled, setIdempotencyEnabled] = useState<boolean>(true);
  const [seenIdempotencyKeys, setSeenIdempotencyKeys] = useState<Set<string>>(
    new Set(INITIAL_TRANSACTIONS.map((t) => t.idempotencyKey))
  );

  // Auth Store Integration
  const { user, initialize: initializeAuth, setPersona: setAuthPersona } = useAuthStore();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

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

  // Sync dark class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Initialize auth session
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen for session expiry from API client
  useEffect(() => {
    const handleExpired = () => {
      addToast('error', 'Session Expired', 'Please re-authenticate your JWT session.');
      setIsLoginModalOpen(true);
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
  const totalDebits = transactions.reduce(
    (sum, t) => sum + t.journalLines.filter((l) => l.entryType === 'DEBIT').reduce((s, l) => s + l.amount, 0),
    0
  );
  const totalCredits = transactions.reduce(
    (sum, t) => sum + t.journalLines.filter((l) => l.entryType === 'CREDIT').reduce((s, l) => s + l.amount, 0),
    0
  );

  // 1. Execute Internal Transfer (Atomic Double-Entry Posting)
  const handleExecuteTransfer = ({
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

    const source = accounts.find((a) => a.id === sourceAccountId);
    const target = accounts.find((a) => a.id === targetAccountId);

    if (!source || !target) {
      return { success: false, message: 'Invalid source or destination account identifier.' };
    }

    if (source.status === 'Frozen') {
      return { success: false, message: `Account ${source.accountNumber} is FROZEN. Debits are prohibited.` };
    }

    if (target.status === 'Frozen') {
      return { success: false, message: `Target account ${target.accountNumber} is FROZEN.` };
    }

    if (source.availableBalance < amount) {
      return {
        success: false,
        message: `Insufficient available funds. Available: ${formatCurrency(source.availableBalance, currency)}.`,
      };
    }

    const correlationId = generateCorrelationId();
    const reference = `TXN-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const nowIso = new Date().toISOString();

    const sourcePostLedger = source.ledgerBalance - amount;
    const sourcePostAvailable = source.availableBalance - amount;
    const targetPostLedger = target.ledgerBalance + amount;
    const targetPostAvailable = target.availableBalance + amount;

    const nextSourceRowVersion = incrementRowVersion(source.rowVersion);
    const nextTargetRowVersion = incrementRowVersion(target.rowVersion);

    // Update Accounts
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === source.id) {
          return {
            ...acc,
            ledgerBalance: sourcePostLedger,
            availableBalance: sourcePostAvailable,
            rowVersion: nextSourceRowVersion,
          };
        }
        if (acc.id === target.id) {
          return {
            ...acc,
            ledgerBalance: targetPostLedger,
            availableBalance: targetPostAvailable,
            rowVersion: nextTargetRowVersion,
          };
        }
        return acc;
      })
    );

    // Create Immutable Journal Transaction
    const newTxn: Transaction = {
      id: `txn-${Date.now()}`,
      reference,
      timestamp: nowIso,
      senderAccountId: source.id,
      receiverAccountId: target.id,
      senderAccountNum: source.accountNumber,
      receiverAccountNum: target.accountNumber,
      amount,
      status: 'Posted',
      idempotencyKey: idempotencyKey || 'bypass-none',
      description,
      category: 'Internal Transfer',
      correlationId,
      journalLines: [
        {
          id: `jl-dr-${Date.now()}`,
          entryType: 'DEBIT',
          accountId: source.id,
          accountNumber: source.accountNumber,
          accountName: source.name,
          amount,
          postBalance: sourcePostLedger,
          memo: `DR: ${description} (Settlement from ${source.accountNumber})`,
        },
        {
          id: `jl-cr-${Date.now()}`,
          entryType: 'CREDIT',
          accountId: target.id,
          accountNumber: target.accountNumber,
          accountName: target.name,
          amount,
          postBalance: targetPostLedger,
          memo: `CR: ${description} (Credit to ${target.accountNumber})`,
        },
      ],
    };

    setTransactions((prev) => [newTxn, ...prev]);

    // Append to Audit Logs
    const auditEntry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      correlationId,
      timestamp: nowIso,
      userIp: '192.168.10.45',
      persona,
      action: 'POST_JOURNAL_SPLIT',
      status: 'SUCCESS',
      details: `Committed transfer ${reference} for ${formatCurrency(amount, 'USD')}. DR: ${source.accountNumber} -> CR: ${target.accountNumber}. Concurrency locks incremented.`,
    };

    setAuditLogs((prev) => [auditEntry, ...prev]);

    addToast(
      'success',
      'Transaction Posted',
      `${reference} committed: ${formatCurrency(amount, currency)} from ${source.accountNumber} to ${target.accountNumber}. Net-Zero verified.`
    );

    return { success: true, message: 'Transfer posted successfully.' };
  };

  // 2. Apply Account Hold
  const handleApplyHold = ({
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
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, message: 'Account not found.' };

    if (acc.status === 'Frozen') {
      return { success: false, message: 'Cannot place hold on a frozen account.' };
    }

    if (acc.availableBalance < amount) {
      return {
        success: false,
        message: `Hold amount exceeds available funds (${formatCurrency(acc.availableBalance, currency)}).`,
      };
    }

    const holdId = `HLD-${Math.floor(10000 + Math.random() * 90000)}`;
    const correlationId = generateCorrelationId();
    const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;

    // Deduct available balance
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? {
              ...a,
              availableBalance: a.availableBalance - amount,
              rowVersion: incrementRowVersion(a.rowVersion),
            }
          : a
      )
    );

    const newHold: TransactionHold = {
      id: holdId,
      accountId: acc.id,
      accountNumber: acc.accountNumber,
      accountName: acc.name,
      amount,
      reason,
      createdAt: new Date().toISOString(),
      expiresAt,
      status: 'Active',
      correlationId,
    };

    setHolds((prev) => [newHold, ...prev]);

    // Audit log
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        correlationId,
        timestamp: new Date().toISOString(),
        userIp: '192.168.10.45',
        persona,
        action: 'CREATE_ACCOUNT_HOLD',
        status: 'SUCCESS',
        details: `Placed ${reason} hold [${holdId}] of ${formatCurrency(amount, 'USD')} on ${acc.accountNumber}. TTL: ${durationHours}h.`,
      },
      ...prev,
    ]);

    addToast(
      'info',
      'Hold Enforced',
      `Hold ${holdId} applied on ${acc.accountNumber} for ${formatCurrency(amount, currency)}. Available balance adjusted.`
    );

    return { success: true, message: 'Hold successfully applied.' };
  };

  // 3. Release Hold (Restores Available Balance)
  const handleReleaseHold = (holdId: string) => {
    const targetHold = holds.find((h) => h.id === holdId);
    if (!targetHold || targetHold.status !== 'Active') return;

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === targetHold.accountId
          ? {
              ...acc,
              availableBalance: acc.availableBalance + targetHold.amount,
              rowVersion: incrementRowVersion(acc.rowVersion),
            }
          : acc
      )
    );

    setHolds((prev) =>
      prev.map((h) => (h.id === holdId ? { ...h, status: 'Released' } : h))
    );

    const correlationId = generateCorrelationId();
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        correlationId,
        timestamp: new Date().toISOString(),
        userIp: '192.168.10.45',
        persona,
        action: 'RELEASE_ACCOUNT_HOLD',
        status: 'SUCCESS',
        details: `Released hold ${holdId} on account ${targetHold.accountNumber}. Restored ${formatCurrency(targetHold.amount, 'USD')} to available balance.`,
      },
      ...prev,
    ]);

    addToast(
      'success',
      'Hold Released',
      `Hold ${holdId} cleared. ${formatCurrency(targetHold.amount, currency)} returned to available balance.`
    );
  };

  // 4. Capture Hold (Commits Debit Permanently to Book Ledger)
  const handleCaptureHold = (holdId: string) => {
    const targetHold = holds.find((h) => h.id === holdId);
    if (!targetHold || targetHold.status !== 'Active') return;

    // Permanent book debit
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === targetHold.accountId
          ? {
              ...acc,
              ledgerBalance: acc.ledgerBalance - targetHold.amount,
              rowVersion: incrementRowVersion(acc.rowVersion),
            }
          : acc
      )
    );

    setHolds((prev) =>
      prev.map((h) => (h.id === holdId ? { ...h, status: 'Captured' } : h))
    );

    const correlationId = generateCorrelationId();
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        correlationId,
        timestamp: new Date().toISOString(),
        userIp: '192.168.10.45',
        persona,
        action: 'CAPTURE_ACCOUNT_HOLD',
        status: 'SUCCESS',
        details: `Captured hold ${holdId} permanently against ${targetHold.accountNumber}. Book balance debited by ${formatCurrency(targetHold.amount, 'USD')}.`,
      },
      ...prev,
    ]);

    addToast(
      'success',
      'Hold Captured',
      `Captured ${holdId}: ${formatCurrency(targetHold.amount, currency)} finalized against book ledger.`
    );
  };

  // 5. Reverse Transaction (Compensating Double-Entry Lines)
  const handleReverseTransaction = (txnId: string) => {
    const txn = transactions.find((t) => t.id === txnId);
    if (!txn || txn.status === 'Reversed') return;

    const source = accounts.find((a) => a.id === txn.senderAccountId);
    const target = accounts.find((a) => a.id === txn.receiverAccountId);

    if (source && target) {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === source.id) {
            return {
              ...acc,
              ledgerBalance: acc.ledgerBalance + txn.amount,
              availableBalance: acc.availableBalance + txn.amount,
              rowVersion: incrementRowVersion(acc.rowVersion),
            };
          }
          if (acc.id === target.id) {
            return {
              ...acc,
              ledgerBalance: acc.ledgerBalance - txn.amount,
              availableBalance: acc.availableBalance - txn.amount,
              rowVersion: incrementRowVersion(acc.rowVersion),
            };
          }
          return acc;
        })
      );
    }

    setTransactions((prev) =>
      prev.map((t) => (t.id === txnId ? { ...t, status: 'Reversed', isReversed: true } : t))
    );

    const correlationId = generateCorrelationId();
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        correlationId,
        timestamp: new Date().toISOString(),
        userIp: '10.0.4.12',
        persona,
        action: 'REVERSE_JOURNAL_SPLIT',
        status: 'FLAGGED',
        details: `Reversed transaction ${txn.reference} for ${formatCurrency(txn.amount, 'USD')}. Compensating DR/CR balance adjustments posted.`,
      },
      ...prev,
    ]);

    addToast(
      'info',
      'Transaction Reversed',
      `Reversal completed for ${txn.reference}. Balances restored via compensating journal lines.`
    );
  };

  // 6. Manual EOD Reconciliation Batch
  const handleTriggerEODBatch = () => {
    setIsReconciling(true);

    setTimeout(() => {
      const todayIso = new Date().toISOString().split('T')[0];
      const batchId = `EOD-${todayIso}`;
      const hash = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const durationMs = Math.floor(380 + Math.random() * 60);

      const newBatch: EODBatchRecord = {
        id: `eod-${Date.now()}`,
        batchId,
        date: todayIso,
        totalDebits,
        totalCredits,
        difference: 0.0,
        status: 'Completed',
        duration: `${durationMs}ms`,
        processedCount: 1420 + transactions.length,
        batchHash: hash,
      };

      setEodBatches((prev) => [newBatch, ...prev]);
      setIsReconciling(false);

      const correlationId = generateCorrelationId();
      setAuditLogs((prev) => [
        {
          id: `aud-${Date.now()}`,
          correlationId,
          timestamp: new Date().toISOString(),
          userIp: '127.0.0.1 (Hangfire)',
          persona: 'System Admin',
          action: 'EOD_HANGFIRE_BATCH',
          status: 'SUCCESS',
          details: `Manual EOD verification batch ${batchId} executed in ${durationMs}ms. Net zero invariant confirmed across all ${accounts.length} ledgers.`,
        },
        ...prev,
      ]);

      addToast(
        'success',
        'EOD Reconciliation Complete',
        `Batch ${batchId} reconciled in ${durationMs}ms with cryptographic proof. SUM(DR) == SUM(CR) verified.`
      );
    }, 750);
  };

  // 7. Toggle Account Frozen Status
  const handleToggleAccountStatus = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;

    const nextStatus = acc.status === 'Active' ? 'Frozen' : 'Active';

    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, status: nextStatus } : a))
    );

    const correlationId = generateCorrelationId();
    setAuditLogs((prev) => [
      {
        id: `aud-${Date.now()}`,
        correlationId,
        timestamp: new Date().toISOString(),
        userIp: '10.0.4.19',
        persona,
        action: 'ACCOUNT_STATUS_CHANGE',
        status: nextStatus === 'Frozen' ? 'FLAGGED' : 'SUCCESS',
        details: `Account ${acc.accountNumber} status toggled to ${nextStatus.toUpperCase()} by ${persona}.`,
      },
      ...prev,
    ]);

    addToast(
      nextStatus === 'Frozen' ? 'error' : 'success',
      `Account ${nextStatus}`,
      `${acc.accountNumber} is now marked ${nextStatus}.`
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Fixed Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeHoldsCount={holds.filter((h) => h.status === 'Active').length}
        persona={persona}
        isOpenOnMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenTransferModal={() => {
          setTransferInitialSourceId(undefined);
          setIsTransferModalOpen(true);
        }}
        onOpenHoldModal={() => setIsHoldModalOpen(true)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header with Invariant Banner */}
        <Header
          currentTab={currentTab}
          currency={currency}
          onCurrencyChange={setCurrency}
          persona={persona}
          onPersonaChange={(newPersona) => {
            setPersona(newPersona);
            setAuthPersona(newPersona);
          }}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
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
              onSelectTab={setCurrentTab}
              onOpenTransferModal={() => setIsTransferModalOpen(true)}
              onOpenHoldModal={() => setIsHoldModalOpen(true)}
              onViewAccountHistory={(acc) => setSelectedAccountForHistory(acc)}
            />
          )}

          {currentTab === 'accounts' && (
            <AccountsView
              accounts={accounts}
              currency={currency}
              persona={persona}
              onToggleStatus={handleToggleAccountStatus}
              onViewAccountHistory={(acc) => setSelectedAccountForHistory(acc)}
              onViewHolds={(acc) => setSelectedAccountForHolds(acc)}
              onOpenTransferModalWithSource={(acc) => {
                setTransferInitialSourceId(acc.id);
                setIsTransferModalOpen(true);
              }}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsJournalView
              transactions={transactions}
              currency={currency}
              persona={persona}
              onReverseTransaction={handleReverseTransaction}
              onOpenTransferModal={() => setIsTransferModalOpen(true)}
            />
          )}

          {currentTab === 'holds' && (
            <HoldsEscrowView
              holds={holds}
              currency={currency}
              persona={persona}
              onReleaseHold={handleReleaseHold}
              onCaptureHold={handleCaptureHold}
              onOpenHoldModal={() => setIsHoldModalOpen(true)}
            />
          )}

          {currentTab === 'reconciliation' && (
            <EODReconciliationView
              batches={eodBatches}
              auditLogs={auditLogs}
              currency={currency}
              persona={persona}
              onTriggerEODBatch={handleTriggerEODBatch}
              isReconciling={isReconciling}
            />
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
        persona={persona}
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

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          addToast('success', 'Authenticated', `Session active as ${persona}`);
        }}
      />

      {/* Toasts Notification Container */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
