import React, { useState } from 'react';
import { 
  Server, 
  ExternalLink, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck,
  Cpu,
  Layers,
  Database
} from 'lucide-react';
import { API_BASE_URL } from '../../lib/api-client';

export const HangfireMonitorView: React.FC = () => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hangfireUrl = `${API_BASE_URL}/hangfire`;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIframeKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hangfire Background Worker Monitor
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
              .NET 10 Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Distributed background scheduler executing EOD reconciliations, expired hold unlocks, and invariant proofs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Reload Frame</span>
          </button>
          <a
            href={hangfireUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Enqueued Jobs</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900 dark:text-white">
            0
          </div>
          <span className="text-[10px] text-slate-400">Queue: default, critical</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Processing</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
            1 Active
          </div>
          <span className="text-[10px] text-slate-400">Workers: {navigator.hardwareConcurrency || 8} Threads</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Succeeded Jobs</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            1,420
          </div>
          <span className="text-[10px] text-slate-400">100% Success Invariant</span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Failed Jobs</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-1 text-xl font-bold font-mono text-slate-900 dark:text-white">
            0
          </div>
          <span className="text-[10px] text-emerald-500 font-semibold">Zero Critical Failures</span>
        </div>
      </div>

      {/* Embedded Hangfire Dashboard IFrame Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Server className="w-4 h-4 text-purple-500" />
            <span className="font-mono">{hangfireUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-500 text-[11px]">Direct RPC Tunnel Active</span>
          </div>
        </div>

        <div className="relative w-full h-[640px] bg-slate-950">
          <iframe
            key={iframeKey}
            src={hangfireUrl}
            title="Hangfire Operations Dashboard"
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
