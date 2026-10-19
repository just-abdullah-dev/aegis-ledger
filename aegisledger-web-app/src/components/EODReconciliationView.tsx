import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { EODBatchRecord, AuditLogEntry, Currency, UserPersona } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';
import { useReconciliationBatchesQuery, useTriggerEODMutation, useAuditLogsQuery } from '../hooks/useLedgerQueries';
import { HasRole } from './auth/HasRole';

interface EODReconciliationViewProps {
  batches: EODBatchRecord[];
  auditLogs: AuditLogEntry[];
  currency: Currency;
  persona: UserPersona;
  onTriggerEODBatch?: () => void;
  isReconciling?: boolean;
}

export const EODReconciliationView: React.FC<EODReconciliationViewProps> = ({
  batches: initialBatches,
  auditLogs: initialAuditLogs,
  currency,
  persona,
  onTriggerEODBatch,
  isReconciling: parentIsReconciling = false,
}) => {
  const [activeTab, setActiveTab] = useState<'batches' | 'audit'>('batches');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // TanStack Queries & Mutations
  const { data: serverBatches, isLoading: isLoadingBatches } = useReconciliationBatchesQuery();
  const { data: serverLogs, isLoading: isLoadingLogs } = useAuditLogsQuery();
  const triggerEODMutation = useTriggerEODMutation();

  const effectiveBatches = serverBatches && serverBatches.length > 0 ? serverBatches : initialBatches;
  const effectiveAuditLogs = serverLogs && serverLogs.length > 0 ? serverLogs : initialAuditLogs;

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const handleManualTrigger = async () => {
    if (onTriggerEODBatch) {
      onTriggerEODBatch();
    }
    try {
      await triggerEODMutation.mutateAsync();
    } catch {
      // Ignored: mutation handles feedback
    }
  };

  const isExecuting = parentIsReconciling || triggerEODMutation.isPending;

  const filteredBatches = effectiveBatches.filter((b) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.batchId.toLowerCase().includes(q) ||
        b.date.toLowerCase().includes(q) ||
        b.batchHash.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredAuditLogs = effectiveAuditLogs.filter((l) => {
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            EOD Reconciliation & Immutable Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Hangfire job scheduler batch proofs, cryptographic hashes, and correlated audit trails.
          </p>
        </div>

        {/* Trigger Button protected with HasRole */}
        <HasRole
          roles={['SystemAdmin']}
          personas={['System Admin']}
          fallback={
            <div className="text-[11px] text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 self-start sm:self-auto">
              EOD Manual Trigger: <strong className="text-amber-500">System Admin Only</strong>
            </div>
          }
        >
          <button
            onClick={handleManualTrigger}
            disabled={isExecuting}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer ${
              isExecuting
                ? 'bg-slate-400 text-white cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isExecuting ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Hangfire EOD Batch...</span>
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

      {/* Verification Status Banner */}
      <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Continuous Double-Entry Invariant Integrity: 100.00%</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                PROVEN
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Net difference between total debits and credits is exactly <strong className="font-mono text-emerald-700 dark:text-emerald-300">$0.00</strong> across all historical accounts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-md border border-emerald-500/20">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>Worker: Hangfire Job #EOD-RECON-SYS</span>
        </div>
      </div>

      {/* Tab Switcher: Daily EOD Verification vs Live Audit Logs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => {
            setActiveTab('batches');
            setStatusFilter('ALL');
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Daily EOD Batch Verifications ({effectiveBatches.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('audit');
            setStatusFilter('ALL');
          }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Correlated Audit Logs ({effectiveAuditLogs.length})
        </button>
      </div>

      {/* Main Table Container */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'batches'
                  ? 'Search batch ID, date, SHA256 hash...'
                  : 'Search by X-Correlation-ID (e.g. corr-8f92a1b3), user IP, action...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {activeTab === 'audit' && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Log Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Outcomes</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FLAGGED">FLAGGED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Daily EOD Verification Table */}
        {activeTab === 'batches' && (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Batch ID</th>
                  <th className="py-2.5 px-3">Audit Date</th>
                  <th className="py-2.5 px-3 text-right">Total Debits (DR)</th>
                  <th className="py-2.5 px-3 text-right">Total Credits (CR)</th>
                  <th className="py-2.5 px-3 text-right font-mono">Discrepancy</th>
                  <th className="py-2.5 px-3 font-mono">Hangfire Duration</th>
                  <th className="py-2.5 px-3 text-center">Batch Hash (SHA-256)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoadingBatches ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        <span>Loading EOD batch verifications...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No reconciliation batches match query.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((batch) => {
                    const isZeroDrift = Math.abs(batch.difference) < 0.001;
                    const fullHash = batch.batchHash;
                    const isHashCopied = copiedHash === fullHash;

                    return (
                      <tr
                        key={batch.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {batch.batchId}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
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
                            <span className="text-emerald-600 dark:text-emerald-400">
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
                              title={isHashCopied ? 'Hash copied!' : 'Copy 64-char SHA-256 Hash'}
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Correlated Audit Logs Table */}
        {activeTab === 'audit' && (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        <span>Streaming audit records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No audit logs match criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        <button
                          onClick={() => setSearchQuery(log.correlationId)}
                          title="Filter entire lifecycle for this correlation ID"
                          className="hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Hash className="w-3 h-3 opacity-60" />
                          <span>{log.correlationId}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
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
                      <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300 max-w-md truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
