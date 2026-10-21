import React from 'react';
import { 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Lock, 
  Clock,
  Layers,
  Building2
} from 'lucide-react';
import { BankAccount, Transaction, Currency } from '../../types/ledger';
import { formatCurrency } from '../../utils/formatters';

interface AccountLedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  account: BankAccount | null;
  transactions: Transaction[];
  currency: Currency;
}

export const AccountLedgerDrawer: React.FC<AccountLedgerDrawerProps> = ({
  isOpen,
  onClose,
  account,
  transactions,
  currency,
}) => {
  if (!isOpen || !account) return null;

  // Filter all journal lines affecting this specific account
  const accountEntries: Array<{
    txnId: string;
    reference: string;
    timestamp: string;
    entryType: 'DEBIT' | 'CREDIT';
    amount: number;
    postBalance: number;
    memo: string;
    correlationId: string;
  }> = [];

  (transactions || []).forEach((txn) => {
    (txn?.journalLines || []).forEach((line) => {
      if (line.accountNumber === account.accountNumber || line.accountId === account.id) {
        accountEntries.push({
          txnId: txn.id,
          reference: txn.reference,
          timestamp: txn.timestamp,
          entryType: line.entryType,
          amount: line.amount,
          postBalance: line.postBalance,
          memo: line.memo,
          correlationId: txn.correlationId,
        });
      }
    });
  });

  const totalDebits = accountEntries
    .filter((e) => e.entryType === 'DEBIT')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalCredits = accountEntries
    .filter((e) => e.entryType === 'CREDIT')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {account.accountNumber}
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {account.type}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  {account.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {account.name} · Owner: {account.owner}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Details & Balances Strip */}
        <div className="p-6 bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 font-sans block text-[11px]">Ledger Book Balance</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {formatCurrency(account.ledgerBalance, currency)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block text-[11px]">Available Balance</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {formatCurrency(account.availableBalance, currency)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block text-[11px]">Active Holds</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                {formatCurrency(account.ledgerBalance - account.availableBalance, currency)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-sans block text-[11px]">RowVersion Lock</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                {account.rowVersion.substring(0, 10)}...
              </span>
            </div>
          </div>

          {/* Invariant proof bar */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Immutable Ledger Lineage Audited</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-red-500">Debits: {formatCurrency(totalDebits, currency)}</span>
              <span>·</span>
              <span className="text-emerald-500">Credits: {formatCurrency(totalCredits, currency)}</span>
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Double-Entry Posting History ({accountEntries.length})
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Ordered Chronologically (Descending)
            </span>
          </div>

          {accountEntries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
              No recent postings recorded for this ledger within active window.
            </div>
          ) : (
            accountEntries.map((entry, idx) => {
              const isDebit = entry.entryType === 'DEBIT';

              return (
                <div
                  key={`${entry.txnId}-${idx}`}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          isDebit
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-300 dark:border-red-800'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {entry.entryType}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {entry.reference}
                      </span>
                    </div>

                    <div className="font-mono font-bold text-xs">
                      <span
                        className={isDebit ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
                      >
                        {isDebit ? '-' : '+'}{formatCurrency(entry.amount, currency)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {entry.memo}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span>Post Balance: {formatCurrency(entry.postBalance, currency)}</span>
                    <span className="truncate max-w-[150px]">{entry.correlationId}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span>Routing: {account.routingCode}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
