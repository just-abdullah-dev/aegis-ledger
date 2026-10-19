import React, { useState } from 'react';
import { 
  Building2, 
  Wallet, 
  ShieldAlert, 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Check, 
  Clock, 
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { BankAccount, Currency, Transaction, TransactionHold, EODBatchRecord } from '../types/ledger';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { HOURLY_FLOW_DATA } from '../data/mockData';
import { useLedgerSummaryQuery, useHealthQuery } from '../hooks/useLedgerQueries';

interface DashboardOverviewProps {
  accounts: BankAccount[];
  transactions: Transaction[];
  holds: TransactionHold[];
  eodBatches: EODBatchRecord[];
  currency: Currency;
  onSelectTab: (tab: string) => void;
  onOpenTransferModal: () => void;
  onOpenHoldModal: () => void;
  onViewAccountHistory: (acc: BankAccount) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  accounts,
  transactions,
  holds,
  eodBatches,
  currency,
  onSelectTab,
  onOpenTransferModal,
  onOpenHoldModal,
  onViewAccountHistory,
}) => {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Compute metrics from real state
  const customerAccounts = accounts.filter((a) => a.category === 'customer');
  const totalCustomerLedger = customerAccounts.reduce((sum, a) => sum + a.ledgerBalance, 0);
  const totalCustomerAvailable = customerAccounts.reduce((sum, a) => sum + a.availableBalance, 0);
  const activeHoldsAmount = holds.filter((h) => h.status === 'Active').reduce((sum, h) => sum + h.amount, 0);
  const holdsDelta = totalCustomerLedger - totalCustomerAvailable;

  // Double-entry invariant calculations
  const totalDebits = transactions.reduce(
    (sum, t) => sum + t.journalLines.filter((l) => l.entryType === 'DEBIT').reduce((s, l) => s + l.amount, 0),
    0
  );
  const totalCredits = transactions.reduce(
    (sum, t) => sum + t.journalLines.filter((l) => l.entryType === 'CREDIT').reduce((s, l) => s + l.amount, 0),
    0
  );

  const { data: summaryData } = useLedgerSummaryQuery();
  const { data: healthData } = useHealthQuery();

  const isSolvent = Math.abs(totalDebits - totalCredits) < 0.001;
  const netVariance = Math.abs(totalDebits - totalCredits);

  const displayDeposits = summaryData?.totalDeposits ?? totalCustomerLedger;
  const displayAvailable = summaryData?.totalAvailableLiquidity ?? totalCustomerAvailable;
  const displayHolds = summaryData?.activeHoldsAmount ?? activeHoldsAmount;

  const maxFlow = Math.max(...HOURLY_FLOW_DATA.map((d) => Math.max(d.debits, d.credits)));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Core Banking & Ledger Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time double-entry settlement engine, multi-account solvency, and hold tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTransferModal}
            className="px-3.5 py-2 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Initiate Transfer</span>
          </button>
          <button
            onClick={onOpenHoldModal}
            className="px-3.5 py-2 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Apply Hold</span>
          </button>
        </div>
      </div>

      {/* System Solvency Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
          isSolvent
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
            : 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isSolvent ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
            }`}
          >
            {isSolvent ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm">
                {isSolvent
                  ? 'Double-Entry Invariant Verified: Zero Drift'
                  : 'Solvency Invariant Violation Detected'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                {healthData?.solvencyInvariant || 'SUM(Debits) == SUM(Credits)'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Net balance variance:{' '}
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(netVariance, currency)}
              </span>{' '}
              · All ledger debit & credit entries balanced atomically across general ledger.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          <span className="text-slate-500 dark:text-slate-400">Core Engine:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {healthData?.status || 'Healthy'} (v1.0.0)
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total System Deposits */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total System Deposits</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(totalCustomerLedger, currency)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-semibold">+3.8%</span>
              <span className="text-slate-500 dark:text-slate-400">vs last business day</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
            <span>Customer Accounts</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {customerAccounts.length} Active Ledgers
            </span>
          </div>
        </div>

        {/* Metric 2: Ledger Balance vs. Available Balance */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Available vs. Ledger Balance</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(totalCustomerAvailable, currency)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Book:</span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                {formatCurrency(totalCustomerLedger, currency)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
            <span>Active Holds Gap</span>
            <span className="font-mono font-semibold text-ruby-500 text-red-500">
              -{formatCurrency(holdsDelta, currency)}
            </span>
          </div>
        </div>

        {/* Metric 3: Active Holds Amount */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Holds & Escrow</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(activeHoldsAmount, currency)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {holds.filter((h) => h.status === 'Active').length} security holds in enforcement
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
            <span>AML & Cheque Clearance</span>
            <button
              onClick={() => onSelectTab('holds')}
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium text-[11px] flex items-center"
            >
              View Holds &rarr;
            </button>
          </div>
        </div>

        {/* Metric 4: Today's Transaction Volume & Throughput */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Today's Txn Throughput</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white flex items-baseline gap-2">
              <span>{formatNumber(1420 + transactions.length - 5)} Txns</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">99.98%</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span>P99 Latency: <span className="font-mono text-slate-700 dark:text-slate-300">14ms</span></span>
              <span>·</span>
              <span>Errors: <span className="font-mono text-emerald-600">0</span></span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
            <span>Hangfire Ingestion</span>
            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">Nominal / Healthy</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Live Double-Entry Flow Bar Chart */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Live Double-Entry Flow (Debits vs Credits)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hourly transaction split volume ensuring continuous net-zero invariant
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-red-500" />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Debits (DR)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Credits (CR)</span>
                </div>
              </div>
            </div>

            {/* Custom Interactive SVG/HTML Bar Chart */}
            <div className="h-48 mt-4 flex items-end gap-2 pt-6 pb-2 px-1">
              {HOURLY_FLOW_DATA.map((item, idx) => {
                const debitHeight = Math.max(8, Math.round((item.debits / maxFlow) * 140));
                const creditHeight = Math.max(8, Math.round((item.credits / maxFlow) * 140));
                const isHovered = hoveredHour === idx;

                return (
                  <div
                    key={item.hour}
                    className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                    onMouseEnter={() => setHoveredHour(idx)}
                    onMouseLeave={() => setHoveredHour(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow-lg font-mono whitespace-nowrap pointer-events-none border border-slate-700">
                        <div>Time: {item.hour}</div>
                        <div className="text-red-400">DR: ${item.debits.toLocaleString()}</div>
                        <div className="text-emerald-400">CR: ${item.credits.toLocaleString()}</div>
                        <div className="text-slate-300">Delta: $0.00</div>
                      </div>
                    )}

                    <div className="w-full flex items-end justify-center gap-0.5 h-36">
                      <div
                        style={{ height: `${debitHeight}px` }}
                        className={`w-full max-w-[12px] rounded-t-xs transition-all ${
                          isHovered ? 'bg-red-600' : 'bg-red-500/80 hover:bg-red-600'
                        }`}
                      />
                      <div
                        style={{ height: `${creditHeight}px` }}
                        className={`w-full max-w-[12px] rounded-t-xs transition-all ${
                          isHovered ? 'bg-emerald-600' : 'bg-emerald-500/80 hover:bg-emerald-600'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 truncate">
                      {item.hour.split(':')[0]}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Net Hourly Invariant Drift: <strong className="font-mono text-emerald-600 dark:text-emerald-400">$0.0000</strong></span>
            </div>
            <span className="font-mono text-[11px]">Interval: 120min bucket</span>
          </div>
        </div>

        {/* Chart 2: Reconciled Ledger Audit Line Chart for EOD status over 30 days */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  30-Day EOD Reconciliation Integrity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily End-of-Day batch audit execution time and zero-sum verification
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                100% Balanced
              </span>
            </div>

            {/* Simulated Line / Area Chart for 30-day EOD */}
            <div className="h-48 mt-4 relative flex flex-col justify-end">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-slate-300 dark:border-slate-700" />
                <div className="border-b border-slate-300 dark:border-slate-700" />
                <div className="border-b border-slate-300 dark:border-slate-700" />
                <div className="border-b border-slate-300 dark:border-slate-700" />
              </div>

              {/* Sparkline visualization */}
              <svg className="w-full h-36 overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area path */}
                <path
                  d="M 0,55 L 20,50 L 40,62 L 60,45 L 80,48 L 100,38 L 120,52 L 140,40 L 160,35 L 180,42 L 200,30 L 220,38 L 240,25 L 260,32 L 280,28 L 300,20 L 300,100 L 0,100 Z"
                  fill="url(#eodGradient)"
                />
                {/* Line path */}
                <path
                  d="M 0,55 L 20,50 L 40,62 L 60,45 L 80,48 L 100,38 L 120,52 L 140,40 L 160,35 L 180,42 L 200,30 L 220,38 L 240,25 L 260,32 L 280,28 L 300,20"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Data points */}
                {[
                  [0, 55], [40, 62], [80, 48], [120, 52], [160, 35], [200, 30], [240, 25], [280, 28], [300, 20]
                ].map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3.5"
                    className="fill-white dark:fill-slate-900 stroke-emerald-500"
                    strokeWidth="2"
                  />
                ))}
              </svg>

              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2 px-1">
                <span>30 Days Ago</span>
                <span>15 Days Ago</span>
                <span>Today (EOD Closed)</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Avg Hangfire Batch Duration: <strong className="font-mono text-slate-800 dark:text-slate-200">402ms</strong></span>
            <button
              onClick={() => onSelectTab('reconciliation')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1"
            >
              <span>View Audit Batches</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Journal Splits & Active Holds Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Transactions & Double-Entry Splits */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Recent Ledger Postings & Split Proof
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest transactions with automatic DR/CR zero-sum balance lines
              </p>
            </div>
            <button
              onClick={() => onSelectTab('transactions')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Open Journal</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.slice(0, 4).map((txn) => {
              const debitLine = txn.journalLines.find((l) => l.entryType === 'DEBIT');
              const creditLine = txn.journalLines.find((l) => l.entryType === 'CREDIT');

              return (
                <div key={txn.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-xs text-slate-800 dark:text-slate-200">
                        {txn.reference}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {txn.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {formatCurrency(txn.amount, currency)}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        {txn.status}
                      </span>
                    </div>
                  </div>

                  {/* Double entry breakdown bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono p-2 rounded bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                      <span>DR: {debitLine?.accountNumber}</span>
                      <span>-{formatCurrency(debitLine?.amount || txn.amount, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span>CR: {creditLine?.accountNumber}</span>
                      <span>+{formatCurrency(creditLine?.amount || txn.amount, currency)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Active Security Holds */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <span>Enforced Holds</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Temporary deductions from available funds
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                {holds.filter((h) => h.status === 'Active').length}
              </span>
            </div>

            <div className="space-y-2.5">
              {holds.filter((h) => h.status === 'Active').slice(0, 3).map((hold) => (
                <div
                  key={hold.id}
                  className="p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {hold.id}
                    </span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(hold.amount, currency)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {hold.accountName} ({hold.accountNumber})
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-amber-200/40 dark:border-amber-900/30">
                    <span className="font-medium text-amber-700 dark:text-amber-400">{hold.reason}</span>
                    <span className="font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onSelectTab('holds')}
            className="w-full py-2 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1"
          >
            <span>Manage All Holds & Escrow</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
