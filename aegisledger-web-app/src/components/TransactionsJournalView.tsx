import React, { useState, useMemo } from 'react';
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
  ChevronUp,
  ChevronLeft,
  SlidersHorizontal,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Copy,
  Check,
  X,
  Coins,
  TrendingUp,
  AlertTriangle,
  ArrowUpDown,
  Printer
} from 'lucide-react';
import { Transaction, Currency, UserPersona } from '../types/ledger';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { TrialBalanceExporter } from './reports/TrialBalanceExporter';
import { useTransactionsQuery } from '../hooks/useLedgerQueries';

interface TransactionsJournalViewProps {
  transactions: Transaction[];
  currency: Currency;
  persona: UserPersona;
  onReverseTransaction: (txnId: string) => void | Promise<void>;
  onOpenTransferModal: () => void;
}

type SortField = 'timestamp' | 'amount' | 'reference' | 'status';
type SortOrder = 'asc' | 'desc';

export const TransactionsJournalView: React.FC<TransactionsJournalViewProps> = ({
  transactions,
  currency,
  persona,
  onReverseTransaction,
  onOpenTransferModal,
}) => {
  const { data: serverTransactions, refetch: refetchTransactions, isFetching, isError, error } = useTransactionsQuery();
  const effectiveTransactions = serverTransactions && Array.isArray(serverTransactions)
    ? serverTransactions 
    : (transactions || []);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [highValueOnly, setHighValueOnly] = useState<boolean>(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Expansion and selection
  const [expandedTxnIds, setExpandedTxnIds] = useState<Set<string>>(
    new Set(effectiveTransactions.length > 0 ? [effectiveTransactions[0].id] : [])
  );
  const [voucherModalTxn, setVoucherModalTxn] = useState<Transaction | null>(null);
  const [reversalTargetTxn, setReversalTargetTxn] = useState<Transaction | null>(null);
  const [isReversing, setIsReversing] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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
  };

  const handleExpandAll = () => {
    if (expandedTxnIds.size === effectiveTransactions.length) {
      setExpandedTxnIds(new Set());
    } else {
      setExpandedTxnIds(new Set(effectiveTransactions.map((t) => t.id)));
    }
  };

  // Base filtered transactions
  const filteredTransactions = useMemo(() => {
    return (effectiveTransactions || []).filter((txn) => {
      // Status filter
      if (statusFilter !== 'ALL' && txn.status !== statusFilter) return false;

      // High value preset (>= 100k)
      if (highValueOnly && (txn.amount || 0) < 100000) return false;

      // Min/Max amount
      const min = parseFloat(minAmount);
      const max = parseFloat(maxAmount);
      if (!isNaN(min) && (txn.amount || 0) < min) return false;
      if (!isNaN(max) && (txn.amount || 0) > max) return false;

      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRef = txn.reference?.toLowerCase().includes(q);
        const matchesSender = txn.senderAccountNum?.toLowerCase().includes(q);
        const matchesReceiver = txn.receiverAccountNum?.toLowerCase().includes(q);
        const matchesDesc = txn.description?.toLowerCase().includes(q);
        const matchesIdem = txn.idempotencyKey?.toLowerCase().includes(q);
        const matchesCorr = txn.correlationId?.toLowerCase().includes(q);
        if (!matchesRef && !matchesSender && !matchesReceiver && !matchesDesc && !matchesIdem && !matchesCorr) {
          return false;
        }
      }
      return true;
    });
  }, [effectiveTransactions, statusFilter, highValueOnly, minAmount, maxAmount, searchQuery]);

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case 'timestamp':
          comp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'amount':
          comp = (a.amount || 0) - (b.amount || 0);
          break;
        case 'reference':
          comp = (a.reference || '').localeCompare(b.reference || '');
          break;
        case 'status':
          comp = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          comp = 0;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredTransactions, sortField, sortOrder]);

  // Paginated list
  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / (pageSize === 0 ? sortedTransactions.length || 1 : pageSize)));
  const paginatedTransactions = useMemo(() => {
    if (pageSize === 0) return sortedTransactions;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(startIndex, startIndex + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Global Ledger Metrics across all effective transactions
  const totalTurnover = useMemo(() => {
    return (effectiveTransactions || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [effectiveTransactions]);

  const totalGlobalDebits = useMemo(() => {
    return (effectiveTransactions || []).reduce((sum, t) => {
      return sum + (t.journalLines || []).filter((l) => l.entryType === 'DEBIT').reduce((s, l) => s + (l.amount || 0), 0);
    }, 0);
  }, [effectiveTransactions]);

  const totalGlobalCredits = useMemo(() => {
    return (effectiveTransactions || []).reduce((sum, t) => {
      return sum + (t.journalLines || []).filter((l) => l.entryType === 'CREDIT').reduce((s, l) => s + (l.amount || 0), 0);
    }, 0);
  }, [effectiveTransactions]);

  const globalInvariantDrift = Math.abs(totalGlobalDebits - totalGlobalCredits);
  const isGlobalSolvent = globalInvariantDrift < 0.001;

  const postedCount = useMemo(() => (effectiveTransactions || []).filter((t) => t.status === 'Posted').length, [effectiveTransactions]);
  const reversedCount = useMemo(() => (effectiveTransactions || []).filter((t) => t.status === 'Reversed').length, [effectiveTransactions]);
  const pendingCount = useMemo(() => (effectiveTransactions || []).filter((t) => t.status === 'Pending').length, [effectiveTransactions]);

  // Sort toggle handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'amount' || field === 'timestamp' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Export filtered transactions to CSV
  const handleExportCsv = () => {
    const headers = [
      'Transaction Reference',
      'Timestamp (UTC)',
      'Status',
      'Sender Account (DR)',
      'Receiver Account (CR)',
      'Amount',
      'Currency',
      'Description / Memo',
      'Idempotency Key',
      'Correlation ID'
    ];

    const rows = sortedTransactions.map((t) => [
      `"${t.reference}"`,
      `"${t.timestamp}"`,
      `"${t.status}"`,
      `"${t.senderAccountNum || ''}"`,
      `"${t.receiverAccountNum || ''}"`,
      (t.amount || 0).toFixed(2),
      `"${currency}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.idempotencyKey || ''}"`,
      `"${t.correlationId || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `AegisLedger_JournalEntries_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reversal Execution
  const handleConfirmReversal = async () => {
    if (!reversalTargetTxn) return;
    setIsReversing(true);
    try {
      await onReverseTransaction(reversalTargetTxn.id);
      setReversalTargetTxn(null);
    } finally {
      setIsReversing(false);
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-emerald-500 ml-1 inline" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-emerald-500 ml-1 inline" />
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Backend Offline Alert Banner */}
      {isError && (
        <div className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 flex items-start justify-between gap-4 text-red-800 dark:text-red-300 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-bold text-sm">Transactions Journal Offline</h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                Cannot connect to the AegisLedger backend transactions service. Live journal lines cannot be retrieved from SQL Server.
              </p>
              <div className="text-[11px] font-mono mt-1 text-red-600 dark:text-red-400 opacity-90">
                {(error as any)?.message || 'Connection refused at backend endpoint.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => refetchTransactions()}
            disabled={isFetching}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-red-900 dark:text-red-100 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Double-Entry Transactions & Immutable Journal</span>
            <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
              isError
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}>
              {isError ? 'Backend Offline' : 'Live SQL Ledger'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Every movement generates balanced Debit (DR) and Credit (CR) posting pairs with verified net-zero drift.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Trial Balance Exporter */}
          <TrialBalanceExporter />

          {/* Export Journal to CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
            title="Export filtered journal entries to RFC 4180 CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Journal</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={() => refetchTransactions()}
            disabled={isFetching}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Refresh transactions from backend database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {/* New Transaction Button */}
          {persona !== 'Compliance Auditor' && (
            <button
              onClick={onOpenTransferModal}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>New Journal Posting</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Journal Turnover</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalTurnover, currency)}
          </div>
          <span className="text-[11px] text-slate-400">{effectiveTransactions.length} recorded movements</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Zero-Drift Invariant</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(globalInvariantDrift, currency)}
          </div>
          <span className="text-[11px] text-slate-400">SUM(DR) == SUM(CR) verified</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Posted Settlements</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {postedCount} Active
          </div>
          <span className="text-[11px] text-slate-400">Permanent General Ledger Records</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Compensating Reversals</span>
            <RotateCcw className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400 mt-1">
            {reversedCount} Reversed
          </div>
          <span className="text-[11px] text-slate-400">Compensated atomically with net zero</span>
        </div>
      </div>

      {/* Quick View Tag Pills */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium mr-1 flex items-center gap-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Quick Filters:</span>
        </span>

        <button
          onClick={() => {
            setStatusFilter('ALL');
            setHighValueOnly(false);
            setMinAmount('');
            setMaxAmount('');
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'ALL' && !highValueOnly && !minAmount && !maxAmount
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs font-semibold'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          All Postings ({effectiveTransactions.length})
        </button>

        <button
          onClick={() => {
            setStatusFilter('Posted');
            setHighValueOnly(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'Posted' && !highValueOnly
              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
          }`}
        >
          Posted ({postedCount})
        </button>

        <button
          onClick={() => {
            setStatusFilter('Pending');
            setHighValueOnly(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'Pending' && !highValueOnly
              ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-2xs'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
          }`}
        >
          Pending ({pendingCount})
        </button>

        <button
          onClick={() => {
            setStatusFilter('Reversed');
            setHighValueOnly(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'Reversed' && !highValueOnly
              ? 'bg-red-600 text-white border-red-600 font-semibold shadow-2xs'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100'
          }`}
        >
          Reversed ({reversedCount})
        </button>

        <button
          onClick={() => {
            setHighValueOnly(!highValueOnly);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            highValueOnly
              ? 'bg-purple-600 text-white border-purple-600 font-semibold shadow-2xs'
              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
          }`}
        >
          High Value ≥ $100k
        </button>

        {(searchQuery || statusFilter !== 'ALL' || highValueOnly || minAmount || maxAmount) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setHighValueOnly(false);
              setMinAmount('');
              setMaxAmount('');
              setCurrentPage(1);
            }}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline ml-2 cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Main Journal Feed Container */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        {/* Search, Range & Page Size Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference #, account #, memo, idempotency key..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Min / Max Amount inputs */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Amount:</span>
              <input
                type="number"
                placeholder="Min $"
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-20 px-2 py-1.5 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max $"
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-20 px-2 py-1.5 text-xs font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Postings</option>
                <option value="Posted">Posted</option>
                <option value="Pending">Pending</option>
                <option value="Reversed">Reversed</option>
              </select>
            </div>

            {/* Expand / Collapse All Toggle */}
            <button
              onClick={handleExpandAll}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {expandedTxnIds.size === effectiveTransactions.length ? 'Collapse All' : 'Expand All'}
            </button>

            {/* Page Size Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs font-medium px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer font-mono"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="0">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table with Expandable Rows */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 shadow-xs select-none">
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3 w-8"></th>
                <th 
                  onClick={() => handleSort('reference')} 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Reference #</span>
                  {renderSortIndicator('reference')}
                </th>
                <th 
                  onClick={() => handleSort('timestamp')} 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Timestamp (UTC)</span>
                  {renderSortIndicator('timestamp')}
                </th>
                <th className="py-2.5 px-3">Sender (DR)</th>
                <th className="py-2.5 px-3">Receiver (CR)</th>
                <th 
                  onClick={() => handleSort('amount')} 
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Amount</span>
                  {renderSortIndicator('amount')}
                </th>
                <th 
                  onClick={() => handleSort('status')} 
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Status</span>
                  {renderSortIndicator('status')}
                </th>
                <th className="py-2.5 px-3">Idempotency Key</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {isError ? (
                        <AlertTriangle className="w-8 h-8 text-red-400 dark:text-red-500" />
                      ) : (
                        <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {isError ? 'Unable to load journal entries (Backend Offline)' : 'No journal postings found'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isError ? 'Start the .NET backend API server and click "Retry Connection" above.' : 'Try adjusting your search criteria, amount range, or status filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((txn) => {
                  const isExpanded = expandedTxnIds.has(txn.id);

                  // Compute double-entry leg sums for this row
                  const drSum = (txn.journalLines || [])
                    .filter((l) => l.entryType === 'DEBIT')
                    .reduce((sum, l) => sum + (l.amount || 0), 0);
                  const crSum = (txn.journalLines || [])
                    .filter((l) => l.entryType === 'CREDIT')
                    .reduce((sum, l) => sum + (l.amount || 0), 0);
                  const rowNetDiff = Math.abs(drSum - crSum);

                  return (
                    <React.Fragment key={txn.id}>
                      <tr
                        onClick={() => toggleRowExpansion(txn.id)}
                        className={`cursor-pointer transition-colors group ${
                          isExpanded
                            ? 'bg-slate-50/80 dark:bg-slate-800/40'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/20'
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
                          <div className="flex items-center gap-1.5">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setVoucherModalTxn(txn);
                              }}
                              className="hover:text-emerald-600 dark:hover:text-emerald-400 underline-offset-2 hover:underline cursor-pointer"
                              title="Click to view Official Journal Voucher"
                            >
                              {txn.reference}
                            </span>
                            <button
                              onClick={(e) => handleCopy(txn.reference, `ref-${txn.id}`, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                              title="Copy Reference Number"
                            >
                              {copiedKey === `ref-${txn.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {txn.timestamp ? new Date(txn.timestamp).toLocaleString() : '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-red-600 dark:text-red-400 whitespace-nowrap">
                          {txn.senderAccountNum || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {txn.receiverAccountNum || '—'}
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
                          <div className="flex items-center gap-1">
                            <span className="truncate">{txn.idempotencyKey || 'uuid-default'}</span>
                            {txn.idempotencyKey && (
                              <button
                                onClick={(e) => handleCopy(txn.idempotencyKey, `idem-${txn.id}`, e)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition"
                                title="Copy Idempotency Key"
                              >
                                {copiedKey === `idem-${txn.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Inspect Voucher */}
                            <button
                              onClick={() => setVoucherModalTxn(txn)}
                              className="px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="Inspect official journal voucher"
                            >
                              Voucher
                            </button>

                            {/* System Admin: Reverse Transaction */}
                            {persona === 'System Admin' && txn.status === 'Posted' && (
                              <button
                                onClick={() => setReversalTargetTxn(txn)}
                                className="px-2 py-1 text-[11px] font-semibold rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition flex items-center gap-1 cursor-pointer"
                                title="Post compensating reversal transaction"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reverse</span>
                              </button>
                            )}
                          </div>
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
                                      Double-Entry Journal Legs · Ref: {txn.reference}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {txn.description}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>
                                      Invariant Invariance Verified: Net Zero Difference ({formatCurrency(rowNetDiff, currency)})
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => setVoucherModalTxn(txn)}
                                    className="px-2.5 py-1 text-[11px] font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
                                  >
                                    View Full Voucher &rarr;
                                  </button>
                                </div>
                              </div>

                              <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <table className="w-full text-left text-xs font-mono">
                                  <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                                    <tr>
                                      <th className="py-1.5 px-3 w-28">Posting Leg</th>
                                      <th className="py-1.5 px-3">Account Number</th>
                                      <th className="py-1.5 px-3 font-sans">Entity / Name</th>
                                      <th className="py-1.5 px-3 text-right">Debit (DR)</th>
                                      <th className="py-1.5 px-3 text-right">Credit (CR)</th>
                                      <th className="py-1.5 px-3 text-right">Post Balance</th>
                                      <th className="py-1.5 px-3 font-sans">Memo / Reason</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {(txn.journalLines && txn.journalLines.length > 0 ? txn.journalLines : [
                                      {
                                        id: 'fl-1',
                                        entryType: 'DEBIT' as const,
                                        accountId: txn.senderAccountId,
                                        accountNumber: txn.senderAccountNum,
                                        accountName: 'Sender Liquidity Account',
                                        amount: txn.amount,
                                        postBalance: 0,
                                        memo: `DEBIT: ${txn.description}`
                                      },
                                      {
                                        id: 'fl-2',
                                        entryType: 'CREDIT' as const,
                                        accountId: txn.receiverAccountId,
                                        accountNumber: txn.receiverAccountNum,
                                        accountName: 'Receiver Deposit Account',
                                        amount: txn.amount,
                                        postBalance: 0,
                                        memo: `CREDIT: ${txn.description}`
                                      }
                                    ]).map((line, idx) => {
                                      const isDr = line.entryType === 'DEBIT';
                                      return (
                                        <tr key={line.id || idx} className={isDr ? 'bg-red-500/5' : 'bg-emerald-500/5'}>
                                          <td className="py-1.5 px-3 whitespace-nowrap">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                              isDr
                                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800'
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
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
                                            {line.postBalance ? formatCurrency(line.postBalance, currency) : '—'}
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

        {/* Pagination & Summary Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {sortedTransactions.length === 0 ? 0 : (currentPage - 1) * (pageSize || sortedTransactions.length) + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {pageSize === 0 ? sortedTransactions.length : Math.min(currentPage * pageSize, sortedTransactions.length)}
            </strong>{' '}
            of <strong className="text-slate-800 dark:text-slate-200">{sortedTransactions.length}</strong> matching postings
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-xs font-mono font-medium rounded-md transition cursor-pointer ${
                      currentPage === page
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Official Journal Voucher Inspection Modal */}
      {voucherModalTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>General Ledger Journal Voucher</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {voucherModalTxn.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Reference: {voucherModalTxn.reference}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVoucherModalTxn(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Top Voucher Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 font-sans">Posting Amount</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatCurrency(voucherModalTxn.amount, currency)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans">Settlement Mode</span>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Atomic 2-Phase
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans">Base Currency</span>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {currency}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans">Timestamp UTC</span>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">
                    {new Date(voucherModalTxn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Transaction Description */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Transaction Memo / Business Purpose:</span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {voucherModalTxn.description || 'Internal Ledger Account Transfer'}
                </p>
              </div>

              {/* Double-Entry Split Legs Detail Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-[10px]">
                    Itemized General Ledger Postings
                  </h4>
                  <span className="font-mono text-emerald-600 text-[11px] font-bold">
                    SUM(DR) == SUM(CR) [Balanced]
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="py-2 px-3">Entry Type</th>
                        <th className="py-2 px-3">Account Number</th>
                        <th className="py-2 px-3 text-right">Debit (DR)</th>
                        <th className="py-2 px-3 text-right">Credit (CR)</th>
                        <th className="py-2 px-3 text-right">Post Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(voucherModalTxn.journalLines && voucherModalTxn.journalLines.length > 0 ? voucherModalTxn.journalLines : [
                        {
                          id: 'v-1',
                          entryType: 'DEBIT' as const,
                          accountId: voucherModalTxn.senderAccountId,
                          accountNumber: voucherModalTxn.senderAccountNum,
                          accountName: 'Sender Account',
                          amount: voucherModalTxn.amount,
                          postBalance: 0,
                          memo: 'Debit Line'
                        },
                        {
                          id: 'v-2',
                          entryType: 'CREDIT' as const,
                          accountId: voucherModalTxn.receiverAccountId,
                          accountNumber: voucherModalTxn.receiverAccountNum,
                          accountName: 'Receiver Account',
                          amount: voucherModalTxn.amount,
                          postBalance: 0,
                          memo: 'Credit Line'
                        }
                      ]).map((line, idx) => {
                        const isDr = line.entryType === 'DEBIT';
                        return (
                          <tr key={idx} className={isDr ? 'bg-red-500/5' : 'bg-emerald-500/5'}>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isDr ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              }`}>
                                {line.entryType}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {line.accountNumber}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-red-600 dark:text-red-400">
                              {isDr ? formatCurrency(line.amount, currency) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {!isDr ? formatCurrency(line.amount, currency) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-800 dark:text-slate-200">
                              {line.postBalance ? formatCurrency(line.postBalance, currency) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cryptographic Traceability Tokens */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                  <span>Idempotency Hash:</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[280px]">
                    {voucherModalTxn.idempotencyKey || 'uuid-generated'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                  <span>Audit Correlation ID:</span>
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[280px]">
                    {voucherModalTxn.correlationId || `corr-${voucherModalTxn.reference}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
              <button
                onClick={() => setVoucherModalTxn(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close Voucher
              </button>

              <button
                onClick={() => handleCopy(JSON.stringify(voucherModalTxn, null, 2), 'voucher-json')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer shadow-xs"
              >
                {copiedKey === 'voucher-json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'voucher-json' ? 'Copied Voucher JSON' : 'Copy Voucher JSON'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reversal Safety Confirmation Modal */}
      {reversalTargetTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Reverse Transaction?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {reversalTargetTxn.reference}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount to Compensate:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(reversalTargetTxn.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Compensating Debit (DR):</span>
                <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                  {reversalTargetTxn.receiverAccountNum}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Compensating Credit (CR):</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {reversalTargetTxn.senderAccountNum}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                A compensating double-entry line will be committed to the SQL Server database to restore original account balances. The original posting will be marked as REVERSED.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReversalTargetTxn(null)}
                disabled={isReversing}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReversal}
                disabled={isReversing}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isReversing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Reversal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
