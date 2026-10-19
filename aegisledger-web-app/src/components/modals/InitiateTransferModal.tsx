import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRightLeft, 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Lock,
  Loader2
} from 'lucide-react';
import { BankAccount, Currency, UserPersona } from '../../types/ledger';
import { formatCurrency } from '../../utils/formatters';
import { useTransferMutation } from '../../hooks/useLedgerQueries';

interface InitiateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  currency: Currency;
  persona: UserPersona;
  idempotencyEngineActive?: boolean;
  onExecuteTransfer?: (params: {
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    description: string;
    idempotencyKey: string;
  }) => { success: boolean; message: string };
  initialSourceAccountId?: string;
  onSuccessToast?: (ref: string, amount: number, srcNum: string, dstNum: string) => void;
}

export const InitiateTransferModal: React.FC<InitiateTransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currency,
  persona,
  idempotencyEngineActive = true,
  onExecuteTransfer,
  initialSourceAccountId,
  onSuccessToast,
}) => {
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('5000');
  const [description, setDescription] = useState<string>('Inter-account corporate operating settlement');
  const [useIdempotency, setUseIdempotency] = useState<boolean>(true);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const transferMutation = useTransferMutation();

  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(crypto.randomUUID());
      setErrorMsg('');
      const defaultSource = initialSourceAccountId || (accounts.length > 0 ? accounts[0].id : '');
      const defaultTarget = accounts.length > 1 ? accounts[1].id : '';
      setSourceId(defaultSource);
      setTargetId(defaultTarget !== defaultSource ? defaultTarget : (accounts[2]?.id || ''));
    }
  }, [isOpen, accounts, initialSourceAccountId]);

  if (!isOpen) return null;

  const sourceAccount = accounts.find((a) => a.id === sourceId);
  const targetAccount = accounts.find((a) => a.id === targetId);
  const transferAmount = parseFloat(amountStr) || 0;

  // Real-time validations
  const isSourceFrozen = sourceAccount?.status === 'Frozen';
  const isTargetFrozen = targetAccount?.status === 'Frozen';
  const hasInsufficientFunds = sourceAccount ? transferAmount > sourceAccount.availableBalance : false;
  const isSameAccount = sourceId === targetId;
  const isValidAmount = transferAmount > 0;

  const canSubmit = 
    isValidAmount && 
    !hasInsufficientFunds && 
    !isSameAccount && 
    !isSourceFrozen && 
    !isTargetFrozen &&
    !transferMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !sourceAccount || !targetAccount) return;

    setErrorMsg('');
    const keyToSend = useIdempotency ? idempotencyKey : 'bypass-none';

    try {
      // 1. Dispatch backend mutation with UUID v4 idempotency key
      const result = await transferMutation.mutateAsync({
        sourceAccountId: sourceAccount.id,
        targetAccountId: targetAccount.id,
        amount: transferAmount,
        description,
        idempotencyKey: keyToSend,
      });

      // 2. Also invoke state updater if provided for immediate synchronous balance reflect
      if (onExecuteTransfer) {
        onExecuteTransfer({
          sourceAccountId: sourceAccount.id,
          targetAccountId: targetAccount.id,
          amount: transferAmount,
          description,
          idempotencyKey: keyToSend,
        });
      }

      if (onSuccessToast) {
        onSuccessToast(
          result.referenceNumber || `TXN-${Date.now().toString(36).toUpperCase()}`,
          transferAmount,
          sourceAccount.accountNumber,
          targetAccount.accountNumber
        );
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch transaction transfer.');
    }
  };

  const handleRegenerateKey = () => {
    setIdempotencyKey(crypto.randomUUID());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Initiate Internal Transfer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atomic dual-leg double-entry posting with strict row-versioning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Source Account Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Debit Source Account (DR Leg)
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} — {acc.name} ({formatCurrency(acc.availableBalance, currency)} Avail)
                  {acc.status === 'Frozen' ? ' [FROZEN]' : ''}
                </option>
              ))}
            </select>
            {sourceAccount && (
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Book: {formatCurrency(sourceAccount.ledgerBalance, currency)}</span>
                <span className={hasInsufficientFunds ? 'text-red-500 font-bold' : 'text-emerald-500'}>
                  Available: {formatCurrency(sourceAccount.availableBalance, currency)}
                </span>
              </div>
            )}
          </div>

          {/* Destination Account Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Credit Target Account (CR Leg)
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} disabled={acc.id === sourceId}>
                  {acc.accountNumber} — {acc.name} ({acc.category})
                  {acc.status === 'Frozen' ? ' [FROZEN]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Amount and Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Amount ({currency})
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Settlement Currency
              </label>
              <input
                type="text"
                disabled
                value={currency}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Transfer Memo / Journal Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Automated vendor payroll clearance"
              required
            />
          </div>

          {/* Idempotency Key Section */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Idempotency Key (UUID v4)</span>
              </div>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={useIdempotency}
                  onChange={(e) => setUseIdempotency(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                <span>Attach X-Idempotency-Key</span>
              </label>
            </div>

            {useIdempotency ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                />
                <button
                  type="button"
                  onClick={handleRegenerateKey}
                  className="p-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors flex items-center gap-1"
                  title="Generate new UUID v4"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>UUID</span>
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Bypassing idempotency may trigger duplicate executions under network retries.
              </p>
            )}
          </div>

          {/* Validation Feedback */}
          {hasInsufficientFunds && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Insufficient Available Balance in Debit account.</span>
            </div>
          )}
          {isSameAccount && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Source and destination accounts must be different.</span>
            </div>
          )}
          {(isSourceFrozen || isTargetFrozen) && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 font-semibold">
              <Lock className="w-4 h-4" />
              <span>Cannot execute transfer involving a FROZEN account.</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={transferMutation.isPending}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting Atomic Legs...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Commit Double-Entry Legs</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Re-export as alias for compatibility
export const InternalTransferModal = InitiateTransferModal;
