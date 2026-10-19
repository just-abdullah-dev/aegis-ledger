import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter, 
  ArrowRightLeft, 
  Coins, 
  AlertTriangle,
  RotateCcw,
  Check
} from 'lucide-react';
import { TransactionHold, Currency, UserPersona } from '../types/ledger';
import { formatCurrency, formatCountdown } from '../utils/formatters';

interface HoldsEscrowViewProps {
  holds: TransactionHold[];
  currency: Currency;
  persona: UserPersona;
  onReleaseHold: (holdId: string) => void;
  onCaptureHold: (holdId: string) => void;
  onOpenHoldModal: () => void;
}

export const HoldsEscrowView: React.FC<HoldsEscrowViewProps> = ({
  holds,
  currency,
  persona,
  onReleaseHold,
  onCaptureHold,
  onOpenHoldModal,
}) => {
  // Live ticking countdown state
  const [, setTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredHolds = holds.filter((h) => {
    if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        h.id.toLowerCase().includes(q) ||
        h.accountNumber.toLowerCase().includes(q) ||
        h.accountName.toLowerCase().includes(q) ||
        h.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalActiveHoldsUSD = holds
    .filter((h) => h.status === 'Active')
    .reduce((sum, h) => sum + h.amount, 0);

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'AML Fraud Review':
        return 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800';
      case 'Card Auth Pre-check':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'Cheque Clearance':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'Escrow Milestone Guarantee':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transaction Holds & Escrow Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time hold deductions reserving customer liquidity without mutating core book balance until capture.
          </p>
        </div>

        <button
          onClick={onOpenHoldModal}
          className="px-3.5 py-2 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Apply Temporary Hold</span>
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Enforced Holds</span>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalActiveHoldsUSD, currency)}
          </div>
          <span className="text-[11px] text-slate-400">Currently ring-fenced from customer withdrawal</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Hold Items</span>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {holds.filter((h) => h.status === 'Active').length} Items
          </div>
          <span className="text-[11px] text-slate-400">Across {new Set(holds.filter(h => h.status === 'Active').map(h => h.accountNumber)).size} unique customer ledgers</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Auto-Expiry Settlement</span>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            ISO 20022 TTL
          </div>
          <span className="text-[11px] text-slate-400">Automatic background release on timer zero</span>
        </div>
      </div>

      {/* Holds Table Container */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search hold ID, account #, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Active">Active Holds</option>
              <option value="ALL">All Records</option>
              <option value="Released">Released</option>
              <option value="Captured">Captured</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Hold ID</th>
                <th className="py-2.5 px-3">Account Number</th>
                <th className="py-2.5 px-3">Legal Customer Entity</th>
                <th className="py-2.5 px-3 text-right">Held Amount</th>
                <th className="py-2.5 px-3">Enforcement Reason</th>
                <th className="py-2.5 px-3 font-mono">Expiry Countdown Timer</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredHolds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No hold records found for selected filter.
                  </td>
                </tr>
              ) : (
                filteredHolds.map((hold) => {
                  const countdown = formatCountdown(hold.expiresAt);

                  return (
                    <tr
                      key={hold.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {hold.id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {hold.accountNumber}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap max-w-[200px] truncate">
                        {hold.accountName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">
                        {formatCurrency(hold.amount, currency)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getReasonBadge(
                            hold.reason
                          )}`}
                        >
                          {hold.reason}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                        {hold.status === 'Active' ? (
                          <div
                            className={`flex items-center gap-1.5 text-xs font-semibold ${
                              countdown.urgency === 'critical'
                                ? 'text-red-600 dark:text-red-400 animate-pulse'
                                : countdown.urgency === 'warn'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{countdown.text}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            hold.status === 'Active'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : hold.status === 'Released'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                          }`}
                        >
                          {hold.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {hold.status === 'Active' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onReleaseHold(hold.id)}
                              title="Cancel hold and restore available balance"
                              className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-400" />
                              <span>Release Hold</span>
                            </button>

                            <button
                              onClick={() => onCaptureHold(hold.id)}
                              title="Permanently capture funds and debit account balance"
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Capture Hold</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Finalized</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
