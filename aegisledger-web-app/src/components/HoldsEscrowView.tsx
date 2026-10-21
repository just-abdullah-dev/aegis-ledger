import React, { useState, useEffect, useMemo } from 'react';
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
  Check,
  Download,
  RefreshCw,
  Copy,
  Info,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  Lock,
  Layers,
  FileCheck
} from 'lucide-react';
import { TransactionHold, Currency, UserPersona, HoldReason } from '../types/ledger';
import { formatCurrency, formatCountdown } from '../utils/formatters';
import { useHoldsQuery } from '../hooks/useLedgerQueries';

interface HoldsEscrowViewProps {
  holds: TransactionHold[];
  currency: Currency;
  persona: UserPersona;
  onReleaseHold: (holdId: string) => void | Promise<void>;
  onCaptureHold: (holdId: string) => void | Promise<void>;
  onOpenHoldModal: () => void;
}

type SortField = 'id' | 'accountNumber' | 'accountName' | 'amount' | 'expiresAt' | 'reason' | 'status';
type SortOrder = 'asc' | 'desc';

export const HoldsEscrowView: React.FC<HoldsEscrowViewProps> = ({
  holds,
  currency,
  persona,
  onReleaseHold,
  onCaptureHold,
  onOpenHoldModal,
}) => {
  const { data: serverHolds, isError, error, refetch: refetchHolds, isFetching } = useHoldsQuery();
  const effectiveHolds = serverHolds && Array.isArray(serverHolds) && serverHolds.length > 0 
    ? serverHolds 
    : (holds || []);

  // Live ticking countdown state
  const [, setTick] = useState(0);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [expiringSoonOnly, setExpiringSoonOnly] = useState<boolean>(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('expiresAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals state
  const [selectedHoldForDetails, setSelectedHoldForDetails] = useState<TransactionHold | null>(null);
  const [holdToRelease, setHoldToRelease] = useState<TransactionHold | null>(null);
  const [holdToCapture, setHoldToCapture] = useState<TransactionHold | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);

  // Clipboard copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Base filtered holds
  const filteredHolds = useMemo(() => {
    const now = Date.now();
    return effectiveHolds.filter((h) => {
      // Status filter
      if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;

      // Reason filter
      if (reasonFilter !== 'ALL' && h.reason !== reasonFilter) return false;

      // Expiring soon filter (< 2 hours & active)
      if (expiringSoonOnly) {
        if (h.status !== 'Active') return false;
        const remainingMs = h.expiresAt - now;
        if (remainingMs <= 0 || remainingMs > 7200000) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = h.id?.toLowerCase().includes(q);
        const matchesAcc = h.accountNumber?.toLowerCase().includes(q);
        const matchesName = h.accountName?.toLowerCase().includes(q);
        const matchesReason = h.reason?.toLowerCase().includes(q);
        const matchesCorr = h.correlationId?.toLowerCase().includes(q);
        if (!matchesId && !matchesAcc && !matchesName && !matchesReason && !matchesCorr) {
          return false;
        }
      }

      return true;
    });
  }, [effectiveHolds, statusFilter, reasonFilter, expiringSoonOnly, searchQuery]);

  // Sorted holds
  const sortedHolds = useMemo(() => {
    return [...filteredHolds].sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case 'id':
          comp = (a.id || '').localeCompare(b.id || '');
          break;
        case 'accountNumber':
          comp = (a.accountNumber || '').localeCompare(b.accountNumber || '');
          break;
        case 'accountName':
          comp = (a.accountName || '').localeCompare(b.accountName || '');
          break;
        case 'amount':
          comp = (a.amount || 0) - (b.amount || 0);
          break;
        case 'expiresAt':
          comp = (a.expiresAt || 0) - (b.expiresAt || 0);
          break;
        case 'reason':
          comp = (a.reason || '').localeCompare(b.reason || '');
          break;
        case 'status':
          comp = (a.status || '').localeCompare(b.status || '');
          break;
        default:
          comp = 0;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [filteredHolds, sortField, sortOrder]);

  // Paginated holds
  const totalPages = Math.max(1, Math.ceil(sortedHolds.length / (pageSize === 0 ? sortedHolds.length || 1 : pageSize)));
  const paginatedHolds = useMemo(() => {
    if (pageSize === 0) return sortedHolds;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedHolds.slice(startIndex, startIndex + pageSize);
  }, [sortedHolds, currentPage, pageSize]);

  // Aggregate Metrics across all effective holds
  const totalActiveHoldsUSD = useMemo(() => {
    return effectiveHolds
      .filter((h) => h.status === 'Active')
      .reduce((sum, h) => sum + (h.amount || 0), 0);
  }, [effectiveHolds]);

  const totalCapturedHoldsUSD = useMemo(() => {
    return effectiveHolds
      .filter((h) => h.status === 'Captured')
      .reduce((sum, h) => sum + (h.amount || 0), 0);
  }, [effectiveHolds]);

  const activeHoldsCount = useMemo(() => effectiveHolds.filter((h) => h.status === 'Active').length, [effectiveHolds]);
  const releasedHoldsCount = useMemo(() => effectiveHolds.filter((h) => h.status === 'Released').length, [effectiveHolds]);
  const capturedHoldsCount = useMemo(() => effectiveHolds.filter((h) => h.status === 'Captured').length, [effectiveHolds]);

  const expiringSoonCount = useMemo(() => {
    const now = Date.now();
    return effectiveHolds.filter((h) => {
      if (h.status !== 'Active') return false;
      const rem = h.expiresAt - now;
      return rem > 0 && rem <= 7200000; // < 2 hours
    }).length;
  }, [effectiveHolds]);

  const uniqueCustomerAccountsWithHolds = useMemo(() => {
    return new Set(effectiveHolds.filter((h) => h.status === 'Active').map((h) => h.accountNumber)).size;
  }, [effectiveHolds]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'amount' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-amber-500 ml-1 inline" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-amber-500 ml-1 inline" />
    );
  };

  // Export filtered holds to CSV
  const handleExportCsv = () => {
    const headers = [
      'Hold ID',
      'Account Number',
      'Account Legal Name',
      'Held Amount',
      'Currency',
      'Reason',
      'Created At (UTC)',
      'Expires At (UTC)',
      'Status',
      'Correlation ID'
    ];

    const rows = sortedHolds.map((h) => [
      `"${h.id}"`,
      `"${h.accountNumber}"`,
      `"${(h.accountName || '').replace(/"/g, '""')}"`,
      (h.amount || 0).toFixed(2),
      `"${currency}"`,
      `"${h.reason}"`,
      `"${h.createdAt || ''}"`,
      `"${new Date(h.expiresAt).toISOString()}"`,
      `"${h.status}"`,
      `"${h.correlationId || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `AegisLedger_HoldsEscrow_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Execute confirmed release
  const handleConfirmRelease = async () => {
    if (!holdToRelease) return;
    setIsProcessingAction(true);
    try {
      await onReleaseHold(holdToRelease.id);
      setHoldToRelease(null);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Execute confirmed capture
  const handleConfirmCapture = async () => {
    if (!holdToCapture) return;
    setIsProcessingAction(true);
    try {
      await onCaptureHold(holdToCapture.id);
      setHoldToCapture(null);
    } finally {
      setIsProcessingAction(false);
    }
  };

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
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Backend Offline Alert */}
      {isError && (
        <div className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 flex items-start justify-between gap-4 text-red-800 dark:text-red-300 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-bold text-sm">Holds Service Offline</h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                Cannot connect to the AegisLedger balance holds service. Holds cannot be placed or released while backend is unreachable.
              </p>
              <div className="text-[11px] font-mono mt-1 text-red-600 dark:text-red-400 opacity-90">
                {(error as any)?.message || 'Connection refused at backend endpoint.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => refetchHolds()}
            disabled={isFetching}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-red-900 dark:text-red-100 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
          >
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Transaction Holds & Escrow Management</span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Live Ring-Fence Engine
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time hold deductions reserving customer liquidity without mutating core book balance until capture.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Export to CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs cursor-pointer"
            title="Export filtered hold records to standard CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Refresh Data */}
          <button
            onClick={() => refetchHolds()}
            disabled={isFetching}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Refresh holds from SQL Server database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          {/* Apply Hold Button */}
          {persona !== 'Compliance Auditor' && (
            <button
              onClick={onOpenHoldModal}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:bg-amber-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Apply Temporary Hold</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Enforced Holds</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalActiveHoldsUSD, currency)}
          </div>
          <span className="text-[11px] text-slate-400">Ring-fenced from customer withdrawal</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Hold Items</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {activeHoldsCount} Active
          </div>
          <span className="text-[11px] text-slate-400">Across {uniqueCustomerAccountsWithHolds} unique customer ledgers</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Expiring Soon (&lt; 2h)</span>
            <Clock className={`w-4 h-4 ${expiringSoonCount > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400 mt-1">
            {expiringSoonCount} Expiring
          </div>
          <span className="text-[11px] text-slate-400">Automatic background Hangfire release</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Captured Debits</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-purple-600 dark:text-purple-400 mt-1">
            {formatCurrency(totalCapturedHoldsUSD, currency)}
          </div>
          <span className="text-[11px] text-slate-400">{capturedHoldsCount} holds converted to book debits</span>
        </div>
      </div>

      {/* Quick View Filter Tag Pills */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium mr-1 flex items-center gap-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Quick Views:</span>
        </span>

        <button
          onClick={() => {
            setStatusFilter('ALL');
            setExpiringSoonOnly(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'ALL' && !expiringSoonOnly
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs font-semibold'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          All Records ({effectiveHolds.length})
        </button>

        <button
          onClick={() => {
            setStatusFilter('Active');
            setExpiringSoonOnly(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'Active' && !expiringSoonOnly
              ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-2xs'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
          }`}
        >
          Active Holds ({activeHoldsCount})
        </button>

        <button
          onClick={() => {
            setExpiringSoonOnly(!expiringSoonOnly);
            setStatusFilter('Active');
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            expiringSoonOnly
              ? 'bg-red-600 text-white border-red-600 font-semibold shadow-2xs animate-pulse'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100'
          }`}
        >
          Expiring Soon ({expiringSoonCount})
        </button>

        <button
          onClick={() => {
            setStatusFilter('Released');
            setExpiringSoonOnly(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'Released' && !expiringSoonOnly
              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
          }`}
        >
          Released ({releasedHoldsCount})
        </button>

        <button
          onClick={() => {
            setStatusFilter('Captured');
            setExpiringSoonOnly(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'Captured' && !expiringSoonOnly
              ? 'bg-purple-600 text-white border-purple-600 font-semibold shadow-2xs'
              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
          }`}
        >
          Captured ({capturedHoldsCount})
        </button>

        {(searchQuery || statusFilter !== 'ALL' || reasonFilter !== 'ALL' || expiringSoonOnly) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
              setReasonFilter('ALL');
              setExpiringSoonOnly(false);
              setCurrentPage(1);
            }}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline ml-2 cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Holds Table Container */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search hold ID, account #, customer entity, reason..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Reason Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Reason:</span>
              <select
                value={reasonFilter}
                onChange={(e) => {
                  setReasonFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="ALL">All Enforcement Reasons</option>
                <option value="Card Auth Pre-check">Card Auth Pre-check</option>
                <option value="AML Fraud Review">AML Fraud Review</option>
                <option value="Cheque Clearance">Cheque Clearance</option>
                <option value="Escrow Milestone Guarantee">Escrow Milestone Guarantee</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="Active">Active Holds</option>
                <option value="ALL">All Records</option>
                <option value="Released">Released</option>
                <option value="Captured">Captured</option>
              </select>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs font-medium px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer font-mono"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="0">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold select-none">
                <th 
                  onClick={() => handleSort('id')} 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Hold ID</span>
                  {renderSortIndicator('id')}
                </th>
                <th 
                  onClick={() => handleSort('accountNumber')} 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Account Number</span>
                  {renderSortIndicator('accountNumber')}
                </th>
                <th 
                  onClick={() => handleSort('accountName')} 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Legal Customer Entity</span>
                  {renderSortIndicator('accountName')}
                </th>
                <th 
                  onClick={() => handleSort('amount')} 
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Held Amount</span>
                  {renderSortIndicator('amount')}
                </th>
                <th 
                  onClick={() => handleSort('reason')} 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Enforcement Reason</span>
                  {renderSortIndicator('reason')}
                </th>
                <th 
                  onClick={() => handleSort('expiresAt')} 
                  className="py-2.5 px-3 font-mono cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Expiry Countdown (TTL)</span>
                  {renderSortIndicator('expiresAt')}
                </th>
                <th 
                  onClick={() => handleSort('status')} 
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Status</span>
                  {renderSortIndicator('status')}
                </th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedHolds.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No hold records found</p>
                      <p className="text-xs text-slate-500">No security holds match the selected filters or query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedHolds.map((hold) => {
                  const countdown = formatCountdown(hold.expiresAt);
                  const isExpiringSoon = hold.status === 'Active' && countdown.urgency === 'critical';

                  return (
                    <tr
                      key={hold.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedHoldForDetails(hold)}
                            className="hover:text-amber-600 dark:hover:text-amber-400 underline-offset-2 hover:underline cursor-pointer"
                            title="Click to view full Hold Certificate & Audit trail"
                          >
                            {hold.id}
                          </button>
                          <button
                            onClick={(e) => handleCopy(hold.id, `hld-${hold.id}`, e)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                            title="Copy Hold ID"
                          >
                            {copiedKey === `hld-${hold.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>{hold.accountNumber}</span>
                          <button
                            onClick={(e) => handleCopy(hold.accountNumber, `acc-${hold.id}`, e)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition"
                            title="Copy Account Number"
                          >
                            {copiedKey === `acc-${hold.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Info Button */}
                          <button
                            onClick={() => setSelectedHoldForDetails(hold)}
                            className="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            title="Inspect Hold Certificate"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          {hold.status === 'Active' && persona !== 'Compliance Auditor' ? (
                            <>
                              <button
                                onClick={() => setHoldToRelease(hold)}
                                title="Release hold and restore funds to customer available balance"
                                className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3 text-slate-400" />
                                <span>Release</span>
                              </button>

                              <button
                                onClick={() => setHoldToCapture(hold)}
                                title="Permanently capture funds and debit account balance in SQL Server"
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Capture</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium px-1">
                              {hold.status === 'Released' ? 'Released' : 'Finalized'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
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
              {sortedHolds.length === 0 ? 0 : (currentPage - 1) * (pageSize || sortedHolds.length) + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {pageSize === 0 ? sortedHolds.length : Math.min(currentPage * pageSize, sortedHolds.length)}
            </strong>{' '}
            of <strong className="text-slate-800 dark:text-slate-200">{sortedHolds.length}</strong> matching hold items
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
                        ? 'bg-amber-600 text-white font-bold'
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

      {/* Hold Certificate & Audit Details Modal */}
      {selectedHoldForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Balance Hold Certificate</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      {selectedHoldForDetails.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Hold: {selectedHoldForDetails.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHoldForDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-100 flex justify-between items-center">
                <div>
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Ring-Fenced Amount</span>
                  <div className="text-lg font-bold font-mono text-red-600 dark:text-red-400 mt-0.5">
                    {formatCurrency(selectedHoldForDetails.amount, currency)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Reason Code</span>
                  <div className="font-semibold text-xs mt-0.5">{selectedHoldForDetails.reason}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Number:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedHoldForDetails.accountNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Entity Name:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedHoldForDetails.accountName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Correlation ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                    {selectedHoldForDetails.correlationId || 'corr-system-ringfence'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Creation Date:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedHoldForDetails.createdAt ? new Date(selectedHoldForDetails.createdAt).toLocaleString() : 'Active Session'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Expiration Target:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(selectedHoldForDetails.expiresAt).toLocaleString()}
                  </span>
                </div>
                {selectedHoldForDetails.status === 'Active' && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">TTL Remaining:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatCountdown(selectedHoldForDetails.expiresAt).text}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-semibold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Double-Entry Solvency Guarantee</span>
                </div>
                <p className="leading-relaxed">
                  Holds do not create journal debit entries upon inception. Instead, they dynamically ring-fence liquidity:
                  <br />
                  <code className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                    AvailableBalance = LedgerBalance - ActiveHoldsSum
                  </code>
                </p>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
              <button
                onClick={() => setSelectedHoldForDetails(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close Certificate
              </button>

              <button
                onClick={() => handleCopy(JSON.stringify(selectedHoldForDetails, null, 2), 'hold-json')}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition cursor-pointer shadow-xs"
              >
                {copiedKey === 'hold-json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'hold-json' ? 'Copied Audit JSON' : 'Copy Audit JSON'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal: Release Hold */}
      {holdToRelease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Release Account Hold?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {holdToRelease.id} · {holdToRelease.accountNumber}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount to Release:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(holdToRelease.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Customer Account:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{holdToRelease.accountName}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Hold Reason:</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">{holdToRelease.reason}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                Releasing this hold clears the ring-fenced funds and restores immediate liquidity to the customer's available balance in SQL Server.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setHoldToRelease(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRelease}
                disabled={isProcessingAction}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Release</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal: Capture Hold */}
      {holdToCapture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Capture & Finalize Debit?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {holdToCapture.id} · {holdToCapture.accountNumber}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount to Permanently Debit:</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  -{formatCurrency(holdToCapture.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Customer Account:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{holdToCapture.accountName}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Hold Reason:</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">{holdToCapture.reason}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                Capturing this hold permanently deducts {formatCurrency(holdToCapture.amount, currency)} from the customer's Book Ledger Balance and transitions the hold status to CAPTURED.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setHoldToCapture(null)}
                disabled={isProcessingAction}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmCapture}
                disabled={isProcessingAction}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Capture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
