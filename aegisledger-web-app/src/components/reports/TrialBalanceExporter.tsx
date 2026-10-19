import React, { useState } from 'react';
import { Download, FileSpreadsheet, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useTrialBalanceExportMutation } from '../../hooks/useLedgerQueries';

interface TrialBalanceExporterProps {
  className?: string;
  onSuccess?: () => void;
}

export const TrialBalanceExporter: React.FC<TrialBalanceExporterProps> = ({
  className = '',
  onSuccess,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const exportMutation = useTrialBalanceExportMutation();

  const handleDownload = async () => {
    setErrorMessage(null);
    try {
      await exportMutation.mutateAsync();
      setDownloadSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to download trial balance CSV');
    }
  };

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      <button
        onClick={handleDownload}
        disabled={exportMutation.isPending}
        title="Export Dapper Net-Zero Trial Balance CSV Report"
        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
      >
        {exportMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : downloadSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-white" />
        ) : (
          <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
        )}
        <span>
          {exportMutation.isPending
            ? 'Generating CSV...'
            : downloadSuccess
            ? 'Report Downloaded'
            : 'Export Trial Balance (CSV)'}
        </span>
        <Download className="w-3.5 h-3.5 ml-0.5 opacity-80" />
      </button>

      {errorMessage && (
        <div className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
