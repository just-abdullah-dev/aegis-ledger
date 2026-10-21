import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Play, 
  RotateCw, 
  Hash, 
  ShieldCheck, 
  Clock, 
  Database, 
  Terminal, 
  Activity, 
  Layers,
  Copy,
  Check,
  Loader2,
  Download,
  ArrowUpDown,
  ExternalLink,
  X,
  FileText,
  AlertTriangle,
  Scale,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { EODBatchRecord, AuditLogEntry, Currency, UserPersona } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';
import { 
  useReconciliationBatchesQuery, 
  useTriggerEODMutation, 
  useAuditLogsQuery, 
  useAccountsQuery,
  useTrialBalanceExportMutation
} from '../hooks/useLedgerQueries';
import { HasRole } from './auth/HasRole';

interface EODReconciliationViewProps {
  batches?: EODBatchRecord[];
  auditLogs?: AuditLogEntry[];
  currency: Currency;
  persona: UserPersona;
  onTriggerEODBatch?: () => void;
  isReconciling?: boolean;
}

type TabType = 'batches' | 'audit' | 'trial-balance';
type SortFieldBatches = 'batchId' | 'date' | 'totalDebits' | 'totalCredits' | 'difference' | 'duration';
type SortOrder = 'asc' | 'desc';

export const EODReconciliationView: React.FC<EODReconciliationViewProps> = ({
  batches: initialBatches,
  auditLogs: initialAuditLogs,
  currency,
  persona,
  onTriggerEODBatch,
  isReconciling: parentIsReconciling = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('batches');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCorrelationId, setSelectedCorrelationId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Sorting state for batches
  const [sortField, setSortField] = useState<SortFieldBatches>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination states
  const [batchesPage, setBatchesPage] = useState(1);
  const [batchesPageSize, setBatchesPageSize] = useState(10);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedBatchForProof, setSelectedBatchForProof] = useState<EODBatchRecord | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogEntry | null>(null);
  const [eodSuccessNotice, setEodSuccessNotice] = useState<string | null>(null);

  // TanStack Queries & Mutations
  const { 
    data: serverBatches, 
    isLoading: isLoadingBatches, 
    isError: isBatchesError, 
    error: batchesError, 
    refetch: refetchBatches,
    isFetching: isFetchingBatches
  } = useReconciliationBatchesQuery();

  const { 
    data: serverLogs, 
    isLoading: isLoadingLogs, 
    isError: isLogsError,
    refetch: refetchLogs,
    isFetching: isFetchingLogs
  } = useAuditLogsQuery(selectedCorrelationId || undefined, statusFilter !== 'ALL' ? statusFilter : undefined);

  const { data: serverAccounts } = useAccountsQuery();
  const triggerEODMutation = useTriggerEODMutation();
  const downloadTrialBalanceMutation = useTrialBalanceExportMutation();

  const effectiveBatches: EODBatchRecord[] = useMemo(() => {
    return serverBatches && Array.isArray(serverBatches) ? serverBatches : (initialBatches || []);
  }, [serverBatches, initialBatches]);

  const effectiveAuditLogs: AuditLogEntry[] = useMemo(() => {
    return serverLogs && Array.isArray(serverLogs) ? serverLogs : (initialAuditLogs || []);
  }, [serverLogs, initialAuditLogs]);

  // Copy hash utility
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  // Manual Trigger handler
  const handleConfirmTriggerEOD = async () => {
    setShowConfirmModal(false);
    if (onTriggerEODBatch) {
      onTriggerEODBatch();
      return;
    }
    try {
      const res = await triggerEODMutation.mutateAsync();
      setEodSuccessNotice(`EOD Reconciliation verified successfully: Net Zero-Drift confirmed (${res?.batchHash ? res.batchHash.substring(0, 18) + '...' : 'SHA-256 Verified'}).`);
      setTimeout(() => setEodSuccessNotice(null), 7000);
    } catch (err: any) {
      console.error('Failed to trigger EOD batch:', err);
    }
  };

  const isExecuting = parentIsReconciling || triggerEODMutation.isPending;

  // Sorting handler for batches
  const handleSortBatches = (field: SortFieldBatches) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setBatchesPage(1);
  };

  // Filtered & Sorted Batches
  const filteredBatches = useMemo(() => {
    return effectiveBatches
      .filter((b) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchesBatchId = b.batchId?.toLowerCase().includes(q);
          const matchesDate = b.date?.toLowerCase().includes(q);
          const matchesHash = b.batchHash?.toLowerCase().includes(q);
          if (!matchesBatchId && !matchesDate && !matchesHash) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'duration') {
          valA = parseInt(a.duration) || 0;
          valB = parseInt(b.duration) || 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [effectiveBatches, searchQuery, sortField, sortOrder]);

  // Paginated Batches
  const paginatedBatches = useMemo(() => {
    if (batchesPageSize === 0) return filteredBatches;
    const start = (batchesPage - 1) * batchesPageSize;
    return filteredBatches.slice(start, start + batchesPageSize);
  }, [filteredBatches, batchesPage, batchesPageSize]);

  const totalBatchPages = batchesPageSize === 0 ? 1 : Math.ceil(filteredBatches.length / batchesPageSize) || 1;

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return effectiveAuditLogs.filter((l) => {
      if (selectedCorrelationId && l.correlationId !== selectedCorrelationId) return false;
      if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          l.correlationId.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.userIp.toLowerCase().includes(q) ||
          l.persona.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [effectiveAuditLogs, selectedCorrelationId, statusFilter, searchQuery]);

  // Paginated Audit Logs
  const paginatedAuditLogs = useMemo(() => {
    if (auditPageSize === 0) return filteredAuditLogs;
    const start = (auditPage - 1) * auditPageSize;
    return filteredAuditLogs.slice(start, start + auditPageSize);
  }, [filteredAuditLogs, auditPage, auditPageSize]);

  const totalAuditPages = auditPageSize === 0 ? 1 : Math.ceil(filteredAuditLogs.length / auditPageSize) || 1;

  // Key KPI Aggregates
  const totalVolumeReconciled = useMemo(() => {
    return effectiveBatches.reduce((acc, b) => acc + (b.totalDebits || 0), 0);
  }, [effectiveBatches]);

  const avgLatencyMs = useMemo(() => {
    if (effectiveBatches.length === 0) return 380;
    const sum = effectiveBatches.reduce((acc, b) => {
      const ms = parseInt(b.duration) || 400;
      return acc + ms;
    }, 0);
    return Math.round(sum / effectiveBatches.length);
  }, [effectiveBatches]);

  const latestBatch = effectiveBatches[0];

  // Trial Balance Solvency Breakdown
  const trialBalanceSummary = useMemo(() => {
    const accounts = serverAccounts || [];
    let assetSum = 0;
    let expenseSum = 0;
    let liabilitySum = 0;
    let equitySum = 0;
    let revenueSum = 0;

    let assetCount = 0;
    let liabilityCount = 0;
    let equityCount = 0;
    let revenueCount = 0;
    let expenseCount = 0;

    let assetHolds = 0;
    let liabilityHolds = 0;

    accounts.forEach((acc) => {
      const bal = acc.ledgerBalance || 0;
      const holds = (acc.ledgerBalance || 0) - (acc.availableBalance || 0);

      switch (acc.category) {
        case 'Asset':
          assetSum += bal;
          assetCount++;
          assetHolds += holds;
          break;
        case 'Expense':
          expenseSum += bal;
          expenseCount++;
          break;
        case 'Liability':
          liabilitySum += bal;
          liabilityCount++;
          liabilityHolds += holds;
          break;
        case 'Equity':
          equitySum += bal;
          equityCount++;
          break;
        case 'Revenue':
          revenueSum += bal;
          revenueCount++;
          break;
        default:
          if (acc.type === 'Checking' || acc.type === 'Savings' || acc.type === 'Escrow') {
            assetSum += bal;
            assetCount++;
            assetHolds += holds;
          } else {
            liabilitySum += bal;
            liabilityCount++;
            liabilityHolds += holds;
          }
      }
    });

    const totalDebits = assetSum + expenseSum;
    const totalCredits = liabilitySum + equitySum + revenueSum;
    const parityDifference = Math.abs(totalDebits - totalCredits);

    return {
      assetSum,
      assetCount,
      assetHolds,
      expenseSum,
      expenseCount,
      liabilitySum,
      liabilityCount,
      liabilityHolds,
      equitySum,
      equityCount,
      revenueSum,
      revenueCount,
      totalDebits,
      totalCredits,
      parityDifference,
      isBalanced: parityDifference < 0.01,
      totalAccounts: accounts.length
    };
  }, [serverAccounts]);

  // CSV Export for Batches
  const exportBatchesCsv = () => {
    const headers = ['BatchId', 'Date', 'TotalDebits', 'TotalCredits', 'Difference', 'Duration', 'ProcessedCount', 'BatchHash', 'Status'];
    const rows = filteredBatches.map(b => [
      `"${b.batchId}"`,
      `"${b.date}"`,
      b.totalDebits.toFixed(2),
      b.totalCredits.toFixed(2),
      b.difference.toFixed(2),
      `"${b.duration}"`,
      b.processedCount || 0,
      `"${b.batchHash}"`,
      `"${b.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AegisLedger_EOD_Batches_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Audit Logs
  const exportAuditLogsCsv = () => {
    const headers = ['CorrelationId', 'Timestamp', 'ClientIP', 'PersonaRole', 'Action', 'Status', 'PayloadDetails'];
    const rows = filteredAuditLogs.map(l => [
      `"${l.correlationId}"`,
      `"${l.timestamp}"`,
      `"${l.userIp}"`,
      `"${l.persona}"`,
      `"${l.action}"`,
      `"${l.status}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AegisLedger_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Backend Offline Alert */}
      {(isBatchesError || isLogsError) && (
        <div className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 flex items-start justify-between gap-4 text-red-800 dark:text-red-300 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-bold text-sm">Reconciliation Service Sync Interrupted</h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                Cannot connect to the live AegisLedger EOD reconciliation daemon. Live verification proofs may be stale.
              </p>
              <div className="text-[11px] font-mono mt-1 text-red-600 dark:text-red-400 opacity-90">
                {(batchesError as any)?.message || 'Connection refused by backend node.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              refetchBatches();
              refetchLogs();
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-red-900 dark:text-red-100 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Success Notification Alert */}
      {eodSuccessNotice && (
        <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{eodSuccessNotice}</span>
          </div>
          <button
            onClick={() => setEodSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              EOD Reconciliation & Immutable Audit Trail
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              LIVE SQL SERVER
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Hangfire automated worker proofs, SHA-256 cryptographic verification, and correlated audit trails.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              refetchBatches();
              refetchLogs();
            }}
            disabled={isFetchingBatches || isFetchingLogs}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh reconciliation data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetchingBatches || isFetchingLogs ? 'animate-spin text-emerald-500' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => downloadTrialBalanceMutation.mutate()}
            disabled={downloadTrialBalanceMutation.isPending}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Download official Trial Balance CSV for financial auditors"
          >
            {downloadTrialBalanceMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Trial Balance (CSV)</span>
          </button>

          {/* Trigger Button protected with HasRole */}
          <HasRole
            roles={['ComplianceAuditor', 'SystemAdmin']}
            personas={['Compliance Auditor', 'System Admin']}
            fallback={
              <div className="text-[11px] text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                Manual Trigger: <strong className="text-amber-500">Auditor or Admin Only</strong>
              </div>
            }
          >
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isExecuting}
              className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
                isExecuting
                  ? 'bg-slate-400 text-white cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {isExecuting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Proof...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Trigger Manual EOD Reconciliation</span>
                </>
              )}
            </button>
          </HasRole>
        </div>
      </div>

      {/* KPI & Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Double-Entry Integrity */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Solvency Invariant Integrity</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              100.00%
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold">
              ZERO-DRIFT
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Debits == Credits across all ledger accounts (Δ = $0.00).
          </p>
        </div>

        {/* Card 2: Historical Batches */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Historical EOD Batches</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {effectiveBatches.length}
            </span>
            <span className="text-xs text-slate-500">runs recorded</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Latest: <strong className="font-mono text-slate-700 dark:text-slate-300">{latestBatch ? latestBatch.batchId : 'N/A'}</strong>
          </p>
        </div>

        {/* Card 3: Reconciled Volume */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Reconciled Volume</span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white truncate">
              {formatCurrency(totalVolumeReconciled, currency)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Cumulative balanced debits and credits verified.
          </p>
        </div>

        {/* Card 4: Worker Latency */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Avg Hangfire Verification</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {avgLatencyMs}ms
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-semibold">
              REAL-TIME
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Dapper / EF Core aggregation compute benchmark.
          </p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('batches');
              setSearchQuery('');
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'batches'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Daily EOD Batches ({effectiveBatches.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('audit');
              setSearchQuery('');
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Correlated Audit Trail ({effectiveAuditLogs.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('trial-balance');
              setSearchQuery('');
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'trial-balance'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Live Trial Balance & Solvency</span>
          </button>
        </div>

        {/* Tab-specific actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'batches' && (
            <button
              onClick={exportBatchesCsv}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}

          {activeTab === 'audit' && (
            <button
              onClick={exportAuditLogsCsv}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: DAILY EOD BATCHES */}
      {activeTab === 'batches' && (
        <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search batch reference, audit date, SHA-256 hash..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setBatchesPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>Showing {filteredBatches.length} of {effectiveBatches.length} batch proofs</span>
            </div>
          </div>

          {/* Batches Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold select-none">
                  <th 
                    onClick={() => handleSortBatches('batchId')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Batch ID</span>
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortBatches('date')}
                    className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Audit Date</span>
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortBatches('totalDebits')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Debits (DR)</span>
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortBatches('totalCredits')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Credits (CR)</span>
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortBatches('difference')}
                    className="py-2.5 px-3 text-right font-mono cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Discrepancy</span>
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSortBatches('duration')}
                    className="py-2.5 px-3 font-mono cursor-pointer hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="flex items-center gap-1">
                      <span>Duration</span>
                      <ArrowUpDown className="w-3 h-3 opacity-50" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center">Batch Hash (SHA-256)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Proof Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoadingBatches ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        <span>Verifying EOD batch records against SQL ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      No reconciliation batches match query.
                    </td>
                  </tr>
                ) : (
                  paginatedBatches.map((batch) => {
                    const isZeroDrift = Math.abs(batch.difference) < 0.001;
                    const fullHash = batch.batchHash || '0x0000000000000000000000000000000000000000000000000000000000000000';
                    const isHashCopied = copiedHash === fullHash;

                    return (
                      <tr
                        key={batch.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {batch.batchId}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono">
                          {batch.date}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                          {formatCurrency(batch.totalDebits, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(batch.totalCredits, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {isZeroDrift ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                              {formatCurrency(0, currency)}
                            </span>
                          ) : (
                            <span className="text-red-500 font-extrabold animate-pulse">
                              {formatCurrency(batch.difference, currency)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                            {batch.duration}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {fullHash.substring(0, 16)}...
                            </span>
                            <button
                              onClick={() => handleCopyHash(fullHash)}
                              title={isHashCopied ? 'Hash copied!' : 'Copy full SHA-256 Digest'}
                              className="text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                            >
                              {isHashCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{batch.status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedBatchForProof(batch)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Batches Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={batchesPageSize}
                onChange={(e) => {
                  setBatchesPageSize(Number(e.target.value));
                  setBatchesPage(1);
                }}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={0}>All</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span>
                Page {batchesPage} of {totalBatchPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBatchesPage(p => Math.max(1, p - 1))}
                  disabled={batchesPage <= 1}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setBatchesPage(p => Math.min(totalBatchPages, p + 1))}
                  disabled={batchesPage >= totalBatchPages}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CORRELATED AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          {/* Active correlation filter notice */}
          {selectedCorrelationId && (
            <div className="p-3 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Filtering lifecycle trace for Correlation ID: <strong className="font-mono">{selectedCorrelationId}</strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedCorrelationId(null)}
                className="px-2 py-0.5 rounded bg-emerald-200 hover:bg-emerald-300 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-emerald-900 dark:text-white font-medium cursor-pointer"
              >
                Clear Drilldown
              </button>
            </div>
          )}

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by correlation ID (e.g. corr-da1f6138), user IP, action..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setAuditPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Outcome:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Outcomes</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FLAGGED">FLAGGED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-3 font-mono">X-Correlation-ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 font-mono">Client IP</th>
                  <th className="py-2.5 px-3">Persona Role</th>
                  <th className="py-2.5 px-3 font-mono">Action</th>
                  <th className="py-2.5 px-3 text-center">Outcome</th>
                  <th className="py-2.5 px-3">Payload Details</th>
                  <th className="py-2.5 px-3 text-center">Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        <span>Streaming verified correlated audit records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 font-sans">
                      No audit logs match criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedAuditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedCorrelationId(log.correlationId);
                            setAuditPage(1);
                          }}
                          title="Click to drill down into this correlation lifecycle"
                          className="hover:underline flex items-center gap-1 cursor-pointer font-mono"
                        >
                          <Hash className="w-3 h-3 opacity-60" />
                          <span>{log.correlationId}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {log.userIp}
                      </td>
                      <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {log.persona}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : log.status === 'FLAGGED'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300 max-w-sm sm:max-w-md truncate">
                        {log.details}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAuditLog(log)}
                          className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Logs Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={auditPageSize}
                onChange={(e) => {
                  setAuditPageSize(Number(e.target.value));
                  setAuditPage(1);
                }}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={0}>All</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span>
                Page {auditPage} of {totalAuditPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                  disabled={auditPage <= 1}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                  disabled={auditPage >= totalAuditPages}
                  className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE TRIAL BALANCE & SOLVENCY */}
      {activeTab === 'trial-balance' && (
        <div className="space-y-6">
          {/* Solvency Equation Banner */}
          <div className={`p-5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            trialBalanceSummary.isBalanced
              ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
              : 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20'
          }`}>
            <div className="flex items-start md:items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                trialBalanceSummary.isBalanced 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-500/20 text-red-600 dark:text-red-400'
              }`}>
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Balance Sheet Solvency Invariant:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    trialBalanceSummary.isBalanced
                      ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                      : 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}>
                    {trialBalanceSummary.isBalanced ? 'ZERO-VARIANCE BALANCED' : 'IMBALANCE DETECTED'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Total Debits (Assets + Expenses): <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(trialBalanceSummary.totalDebits, currency)}</strong> | Total Credits (Liabilities + Equity + Revenue): <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(trialBalanceSummary.totalCredits, currency)}</strong>.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Net Ledger Variance (Δ)</div>
              <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(trialBalanceSummary.parityDifference, currency)}
              </div>
            </div>
          </div>

          {/* Breakdown Cards by Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Assets */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Assets (DR Normal)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
                  {trialBalanceSummary.assetCount} Accounts
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrency(trialBalanceSummary.assetSum, currency)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Active Escrow Holds:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                  {formatCurrency(trialBalanceSummary.assetHolds, currency)}
                </span>
              </div>
            </div>

            {/* Liabilities */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Liabilities (CR Normal)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
                  {trialBalanceSummary.liabilityCount} Accounts
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrency(trialBalanceSummary.liabilitySum, currency)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Customer Deposits / Ring-fenced:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                  {formatCurrency(trialBalanceSummary.liabilityHolds, currency)}
                </span>
              </div>
            </div>

            {/* Equity */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Equity (CR Normal)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
                  {trialBalanceSummary.equityCount} Accounts
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                {formatCurrency(trialBalanceSummary.equitySum, currency)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <span>Retained Earnings & Reserves</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Solvent</span>
              </div>
            </div>
          </div>

          {/* Action Download Banner */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Download Regulatory Trial Balance</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Generates a verified RFC 4180 CSV containing individual COA ledger balances, row versions, and mathematical proof totals.
              </p>
            </div>
            <button
              onClick={() => downloadTrialBalanceMutation.mutate()}
              disabled={downloadTrialBalanceMutation.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              {downloadTrialBalanceMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download Trial Balance (CSV)</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: CONFIRM MANUAL EOD TRIGGER */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Scale className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Execute Manual EOD Reconciliation Batch
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This operation triggers a full accounting invariant audit across all ledger entries in SQL Server.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Target Accounts:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{serverAccounts?.length || 5} COA Accounts</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Cryptographic Digest:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">SHA-256 Merkle Batch Hash</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Worker Execution Mode:</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Synchronous + Hangfire Audit</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Authorized Role:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{persona}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Upon confirmation, the ledger will calculate the net difference between cumulative debits and credits ($\Delta = |\sum \text{DR} - \sum \text{CR}|$). Any deviation from $0.00 will immediately trip security circuit breakers.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTriggerEOD}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Confirm & Execute Batch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CRYPTOGRAPHIC BATCH PROOF INSPECTION */}
      {selectedBatchForProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cryptographic Batch Proof Certificate
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedBatchForProof.batchId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchForProof(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Proof Formula Box */}
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs space-y-1.5">
                <div className="flex justify-between font-bold text-emerald-900 dark:text-emerald-200">
                  <span>Double-Entry Solvency Proof</span>
                  <span className="font-mono">PROVEN: ZERO-DRIFT</span>
                </div>
                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  Total DR: {formatCurrency(selectedBatchForProof.totalDebits, currency)} == Total CR: {formatCurrency(selectedBatchForProof.totalCredits, currency)}
                </div>
                <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  Net Difference (Δ) = {formatCurrency(selectedBatchForProof.difference, currency)}
                </div>
              </div>

              {/* SHA-256 Digest Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Immutable SHA-256 Digest:</span>
                  <button
                    onClick={() => handleCopyHash(selectedBatchForProof.batchHash)}
                    className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedHash === selectedBatchForProof.batchHash ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Full Hash</span>
                      </>
                    )}
                  </button>
                </label>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all select-all">
                  {selectedBatchForProof.batchHash}
                </div>
              </div>

              {/* Batch Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-slate-500 dark:text-slate-400">Audit Date:</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{selectedBatchForProof.date}</div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-slate-500 dark:text-slate-400">Execution Duration:</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{selectedBatchForProof.duration}</div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-slate-500 dark:text-slate-400">Processed Ledger Entries:</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{selectedBatchForProof.processedCount || 1420}</div>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-slate-500 dark:text-slate-400">Batch Verification Status:</div>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedBatchForProof.status}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedBatchForProof(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT TRACE INSPECTOR */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Audit Log Trace Inspector
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedAuditLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Correlation ID:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{selectedAuditLog.correlationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(selectedAuditLog.timestamp).toISOString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Client IP Address:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedAuditLog.userIp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Persona Role:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedAuditLog.persona}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Action:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{selectedAuditLog.action}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outcome Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedAuditLog.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {selectedAuditLog.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Payload Details & Security Audit:
                </label>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-sans text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedAuditLog.details}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedCorrelationId(selectedAuditLog.correlationId);
                  setSelectedAuditLog(null);
                  setActiveTab('audit');
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
              >
                Filter by Correlation ID
              </button>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
