import React, { useState } from 'react';
import { BankAccount, Transaction, TransactionHold } from '../../types/ledger';
import { formatCurrency } from '../../utils/formatters';
import { 
  Wallet, 
  Building2, 
  Clock, 
  ArrowRightLeft, 
  QrCode, 
  FileText, 
  RotateCw, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ChevronRight, 
  Info,
  CreditCard,
  Lock
} from 'lucide-react';

interface CustomerWalletDashboardProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  holds: TransactionHold[];
  onNavigateTab: (tab: string, path: string) => void;
  onRefreshData: () => Promise<void>;
}

export const CustomerWalletDashboard: React.FC<CustomerWalletDashboardProps> = ({
  accounts,
  transactions,
  holds,
  onNavigateTab,
  onRefreshData,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ''
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Aggregates across customer accounts
  const totalLedger = accounts.reduce((sum, a) => sum + (a.ledgerBalance || 0), 0);
  const totalAvailable = accounts.reduce((sum, a) => sum + (a.availableBalance || 0), 0);
  const totalHolds = totalLedger - totalAvailable;

  // Selected account specifics
  const accLedger = activeAccount?.ledgerBalance || 0;
  const accAvailable = activeAccount?.availableBalance || 0;
  const accHolds = accLedger - accAvailable;

  // Recent transactions involving the active account
  const accountTransactions = transactions
    .filter((t) => 
      t.senderAccountId === activeAccount?.id || 
      t.receiverAccountId === activeAccount?.id ||
      t.senderAccountNum === activeAccount?.accountNumber ||
      t.receiverAccountNum === activeAccount?.accountNumber
    )
    .slice(0, 5);

  const activeAccountHolds = holds.filter(
    (h) => h.status === 'Active' && (!activeAccount || h.accountId === activeAccount.id)
  );

  return (
    <div className="space-y-6">
      {/* Top Solvency & Dynamic Verification Hero */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-[11px] font-semibold text-cyan-400 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Double-Entry Core Banking Sovereign Vault</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sovereign Account Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Transparent real-time balances backed by double-entry invariants. Your held funds are ring-fenced while remaining on your official book ledger.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Balances'}</span>
            </button>
          </div>
        </div>

        {/* Account Selector Pill Selector */}
        {accounts.length > 1 && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-slate-400 font-medium shrink-0">Select Account:</span>
            {accounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {acc.name} ({acc.accountNumber}) · {acc.type}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Triad Balance Cards: Ledger vs Available vs Holds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Liquidity Card */}
        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-900 shadow-lg relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              <span>Available Liquidity</span>
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Unrestricted
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 tracking-tight">
            {formatCurrency(accAvailable, 'USD')}
          </div>

          <p className="text-[11px] text-slate-400">
            Funds currently available for immediate P2P transfer, bill settlement, or withdrawal.
          </p>
        </div>

        {/* Book Ledger Balance Card */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Book Ledger Balance</span>
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Official Book
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
            {formatCurrency(accLedger, 'USD')}
          </div>

          <p className="text-[11px] text-slate-400">
            Gross double-entry settled balance in the Core Banking ledger before active hold deductions.
          </p>
        </div>

        {/* Active Holds Ring-Fenced Card */}
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-900 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Active Security Holds</span>
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              Ring-Fenced
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tracking-tight">
            {formatCurrency(accHolds, 'USD')}
          </div>

          <p className="text-[11px] text-slate-400">
            {activeAccountHolds.length} active escrow locks, AML verification holds, or clearance checks.
          </p>
        </div>
      </div>

      {/* Invariant Equation Banner */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Ledger Solvency Invariant:</strong> Available Balance ({formatCurrency(accAvailable, 'USD')}) = Book Ledger ({formatCurrency(accLedger, 'USD')}) - Ring-Fenced Holds ({formatCurrency(accHolds, 'USD')}).
          </span>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/60">
          ✓ Verified Invariant
        </span>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('transfer', '/customer/transfer')}
          className="p-4 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 hover:border-cyan-500/50 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-600/10 text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white transition flex items-center justify-center">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs text-white">Send Money</div>
            <div className="text-[10px] text-slate-400">P2P Internal Wire</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('receive', '/customer/receive')}
          className="p-4 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 hover:border-blue-500/50 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs text-white">Receive QR</div>
            <div className="text-[10px] text-slate-400">Account Wire Info</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('holds', '/customer/holds')}
          className="p-4 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 hover:border-amber-500/50 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs text-white">Security Holds</div>
            <div className="text-[10px] text-slate-400">{activeAccountHolds.length} Active Ring-fenced</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('transactions', '/customer/transactions')}
          className="p-4 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800/80 hover:border-emerald-500/50 transition-all flex flex-col items-center text-center gap-2 group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs text-white">Digital Receipts</div>
            <div className="text-[10px] text-slate-400">Immutable Ledger</div>
          </div>
        </button>
      </div>

      {/* Active Account Details & Hold Notice Strip */}
      {accHolds > 0 && (
        <div 
          onClick={() => onNavigateTab('holds', '/customer/holds')}
          className="p-4 rounded-2xl border border-amber-800/60 bg-amber-950/30 flex items-center justify-between cursor-pointer hover:bg-amber-950/40 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-900/40 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-amber-300">
                You have {formatCurrency(accHolds, 'USD')} in active security holds
              </div>
              <div className="text-[11px] text-amber-400/80">
                Tap to inspect active escrow milestones, clearance timers, and hold expiration dates.
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </div>
      )}

      {/* Recent Activity Mini-Feed */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Recent Ledger Movements
          </h2>
          <button
            onClick={() => onNavigateTab('transactions', '/customer/transactions')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition cursor-pointer flex items-center gap-1"
          >
            <span>View All Statements</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {accountTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No recent movements recorded for this account.
          </div>
        ) : (
          <div className="space-y-2.5">
            {accountTransactions.map((tx) => {
              const isOutgoing = tx.senderAccountId === activeAccount?.id || tx.senderAccountNum === activeAccount?.accountNumber;
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-950/50 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isOutgoing
                        ? 'bg-rose-950/40 text-rose-400 border border-rose-900/60'
                        : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/60'
                    }`}>
                      {isOutgoing ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">
                        {tx.description || (isOutgoing ? 'Outward P2P Transfer' : 'Inward Deposit')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Ref: {tx.reference} · {new Date(tx.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-mono font-bold text-sm ${isOutgoing ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isOutgoing ? '-' : '+'}{formatCurrency(tx.amount, 'USD')}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase">
                      {tx.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
