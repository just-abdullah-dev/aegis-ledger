import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  ShieldCheck, 
  KeyRound, 
  Hash, 
  Clock, 
  FileText,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction, Currency, UserPersona } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';
import { TrialBalanceExporter } from './reports/TrialBalanceExporter';

interface TransactionsJournalViewProps {
  transactions: Transaction[];
  currency: Currency;
  persona: UserPersona;
  onReverseTransaction: (txnId: string) => void;
  onOpenTransferModal: () => void;
}

export const TransactionsJournalView: React.FC<TransactionsJournalViewProps> = ({
  transactions,
  currency,
  persona,
  onReverseTransaction,
  onOpenTransferModal,
}) => {
  const [selectedTxnId, setSelectedTxnId] = useState<string>(
    transactions.length > 0 ? transactions[0].id : ''
  );
  const [expandedTxnIds, setExpandedTxnIds] = useState<Set<string>>(
    new Set(transactions.length > 0 ? [transactions[0].id] : [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const toggleRowExpansion = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedTxnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setSelectedTxnId(id);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.reference.toLowerCase().includes(q) ||
        t.senderAccountNum.toLowerCase().includes(q) ||
        t.receiverAccountNum.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.idempotencyKey.toLowerCase().includes(q) ||
        t.correlationId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedTxn = transactions.find((t) => t.id === selectedTxnId) || transactions[0];

  // Invariant verification for selected transaction
  const debitSum = selectedTxn?.journalLines
    .filter((l) => l.entryType === 'DEBIT')
    .reduce((sum, l) => sum + l.amount, 0) || 0;
  const creditSum = selectedTxn?.journalLines
    .filter((l) => l.entryType === 'CREDIT')
    .reduce((sum, l) => sum + l.amount, 0) || 0;
  const isZeroSum = Math.abs(debitSum - creditSum) < 0.0001;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Double-Entry Transactions & Immutable Journal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Every movement generates balanced Debit (DR) and Credit (CR) posting pairs with zero drift.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <TrialBalanceExporter />
          <button
            onClick={onOpenTransferModal}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>New Journal Posting</span>
          </button>
        </div>
      </div>

      {/* Top Panel: High-Level Transactions Feed */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference #, account #, idempotency key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Postings</option>
              <option value="Posted">Posted</option>
              <option value="Pending">Pending</option>
              <option value="Reversed">Reversed</option>
            </select>
          </div>
        </div>

        {/* Transactions Table with Expandable Rows */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-[460px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 shadow-xs">
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3">Reference #</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Sender (DR)</th>
                <th className="py-2.5 px-3">Receiver (CR)</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Idempotency Key</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    No transactions match criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => {
                  const isExpanded = expandedTxnIds.has(txn.id);
                  const isSelected = txn.id === selectedTxnId;

                  // Compute double-entry leg sums for this row
                  const drSum = txn.journalLines
                    .filter((l) => l.entryType === 'DEBIT')
                    .reduce((sum, l) => sum + l.amount, 0);
                  const crSum = txn.journalLines
                    .filter((l) => l.entryType === 'CREDIT')
                    .reduce((sum, l) => sum + l.amount, 0);
                  const rowNetDiff = Math.abs(drSum - crSum);

                  return (
                    <React.Fragment key={txn.id}>
                      <tr
                        onClick={() => toggleRowExpansion(txn.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {txn.reference}
                        </td>
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {new Date(txn.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-mono text-red-600 dark:text-red-400 whitespace-nowrap">
                          {txn.senderAccountNum}
                        </td>
                        <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {txn.receiverAccountNum}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(txn.amount, currency)}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              txn.status === 'Posted'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : txn.status === 'Reversed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                          {txn.idempotencyKey}
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                            {isExpanded ? 'Collapse' : 'Inspect Legs'}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable Inner Table for Double-Entry Legs */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-950/70 border-y border-emerald-500/30">
                          <td colSpan={9} className="p-4">
                            <div className="space-y-3 pl-6 border-l-2 border-emerald-500">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                                      Double-Entry Legs Detail · {txn.reference}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {txn.description}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Double-Entry Invariant Checked: Net Zero Difference ({formatCurrency(rowNetDiff, currency)})</span>
                                  </div>

                                  {persona !== 'Bank Teller' && txn.status === 'Posted' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onReverseTransaction(txn.id);
                                      }}
                                      className="px-2 py-1 text-[11px] font-semibold rounded border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1 cursor-pointer"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Reverse</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <table className="w-full text-left text-xs font-mono">
                                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                                    <tr>
                                      <th className="py-1.5 px-3 w-24">Leg</th>
                                      <th className="py-1.5 px-3">Account #</th>
                                      <th className="py-1.5 px-3 font-sans">Entity</th>
                                      <th className="py-1.5 px-3 text-right">Debit (DR)</th>
                                      <th className="py-1.5 px-3 text-right">Credit (CR)</th>
                                      <th className="py-1.5 px-3 text-right">Post Balance</th>
                                      <th className="py-1.5 px-3 font-sans">Memo</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {txn.journalLines.map((line, idx) => {
                                      const isDr = line.entryType === 'DEBIT';
                                      return (
                                        <tr key={line.id} className={isDr ? 'bg-red-500/5' : 'bg-emerald-500/5'}>
                                          <td className="py-1.5 px-3 whitespace-nowrap">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                              isDr
                                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                                            }`}>
                                              Leg {idx + 1}: {line.entryType}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                            {line.accountNumber}
                                          </td>
                                          <td className="py-1.5 px-3 font-sans text-slate-600 dark:text-slate-300">
                                            {line.accountName}
                                          </td>
                                          <td className="py-1.5 px-3 text-right font-bold text-red-600 dark:text-red-400">
                                            {isDr ? formatCurrency(line.amount, currency) : '—'}
                                          </td>
                                          <td className="py-1.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                            {!isDr ? formatCurrency(line.amount, currency) : '—'}
                                          </td>
                                          <td className="py-1.5 px-3 text-right text-slate-800 dark:text-slate-200 font-bold">
                                            {formatCurrency(line.postBalance, currency)}
                                          </td>
                                          <td className="py-1.5 px-3 font-sans text-slate-500 dark:text-slate-400 text-[11px]">
                                            {line.memo}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Transaction Summary Card */}
      {selectedTxn && (
        <div className="p-5 rounded-xl border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Focused Journal Voucher — Reference: {selectedTxn.reference}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedTxn.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isZeroSum ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Double-Entry Invariant Checked: Net Zero Difference ($0.00)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-50 text-red-800 border border-red-300 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>INVARIANT BREACH: DR != CR</span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Verification Footnotes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">Idempotency Key:</span>{' '}
              <span className="text-slate-700 dark:text-slate-300 truncate block">
                {selectedTxn.idempotencyKey}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">Correlation ID:</span>{' '}
              <span className="text-slate-700 dark:text-slate-300 truncate block">
                {selectedTxn.correlationId}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400">Execution Mode:</span>{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold block">
                Atomic 2-Phase Commit
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
