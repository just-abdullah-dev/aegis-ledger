import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  Loader2,
  Play,
  RotateCcw,
  Check
} from 'lucide-react';
import { BankAccount, Currency, TransactionHold, HoldReason } from '../../types/ledger';
import { formatCurrency, formatCountdown } from '../../utils/formatters';
import { 
  useHoldsQuery, 
  useApplyHoldMutation, 
  useReleaseHoldMutation, 
  useCaptureHoldMutation 
} from '../../hooks/useLedgerQueries';

interface AccountHoldsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  account: BankAccount | null;
  currency: Currency;
  onSuccessToast?: (msg: string) => void;
}

export const AccountHoldsDrawer: React.FC<AccountHoldsDrawerProps> = ({
  isOpen,
  onClose,
  account,
  currency,
  onSuccessToast,
}) => {
  // Live ticking countdown state
  const [, setTick] = useState(0);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [holdAmountStr, setHoldAmountStr] = useState('10000');
  const [holdReason, setHoldReason] = useState<HoldReason>('Card Auth Pre-check');
  const [durationHours, setDurationHours] = useState(4);
  const [actionError, setActionError] = useState<string | null>(null);

  // Queries & Mutations
  const { data: holds = [], isLoading, refetch } = useHoldsQuery(account?.id);
  const applyMutation = useApplyHoldMutation();
  const releaseMutation = useReleaseHoldMutation();
  const captureMutation = useCaptureHoldMutation();

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen || !account) return null;

  const handleApplyHoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const amount = parseFloat(holdAmountStr) || 0;
    if (amount <= 0) {
      setActionError('Hold amount must be greater than zero.');
      return;
    }
    if (amount > account.availableBalance) {
      setActionError(`Amount exceeds available funds (${formatCurrency(account.availableBalance, currency)}).`);
      return;
    }

    try {
      await applyMutation.mutateAsync({
        accountId: account.id,
        amount,
        reason: holdReason,
        durationHours,
      });
      setIsApplyModalOpen(false);
      refetch();
      if (onSuccessToast) {
        onSuccessToast(`Applied ${holdReason} hold of ${formatCurrency(amount, currency)}.`);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to apply hold.');
    }
  };

  const handleRelease = async (holdId: string) => {
    setActionError(null);
    try {
      await releaseMutation.mutateAsync({ holdId, accountId: account.id });
      refetch();
      if (onSuccessToast) onSuccessToast(`Hold ${holdId} released.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to release hold.');
    }
  };

  const handleCapture = async (holdId: string) => {
    setActionError(null);
    try {
      await captureMutation.mutateAsync({ holdId, accountId: account.id });
      refetch();
      if (onSuccessToast) onSuccessToast(`Hold ${holdId} captured into posted ledger debit.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to capture hold.');
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
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Account Holds & Liquidity Enforcements
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {account.name} · <span className="font-mono">{account.accountNumber}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account Summary Banner */}
          <div className="p-4 mx-6 mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Book Balance</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {formatCurrency(account.ledgerBalance, currency)}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-500">Active Holds</span>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(account.ledgerBalance - account.availableBalance, currency)}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-500">Available</span>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(account.availableBalance, currency)}
              </p>
            </div>
          </div>

          {actionError && (
            <div className="mx-6 mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Controls Bar */}
          <div className="px-6 py-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active & Pending Holds ({holds.length})
            </h3>
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Apply Hold</span>
            </button>
          </div>

          {/* Holds Table */}
          <div className="flex-1 px-6 pb-6 overflow-y-auto">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs">Fetching active holds...</span>
              </div>
            ) : holds.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No active security holds on this account.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {holds.map((hold) => {
                  const isExpired = Date.now() > hold.expiresAt;
                  const isActionable = hold.status === 'Active';

                  return (
                    <div
                      key={hold.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {hold.id}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getReasonBadge(hold.reason)}`}>
                              {hold.reason}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Placed: {new Date(hold.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {formatCurrency(hold.amount, currency)}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{isExpired ? 'EXPIRED' : formatCountdown(hold.expiresAt).text}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status and Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className={`text-[11px] font-semibold ${
                          hold.status === 'Active' ? 'text-amber-500' : hold.status === 'Captured' ? 'text-blue-500' : 'text-emerald-500'
                        }`}>
                          Status: {hold.status}
                        </span>

                        {isActionable && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRelease(hold.id)}
                              disabled={releaseMutation.isPending}
                              className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Release</span>
                            </button>
                            <button
                              onClick={() => handleCapture(hold.id)}
                              disabled={captureMutation.isPending}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Capture</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Apply Hold Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Apply Account Hold</span>
              </h3>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyHoldSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Hold Amount ({currency})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={holdAmountStr}
                  onChange={(e) => setHoldAmountStr(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Enforcement Reason
                </label>
                <select
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value as HoldReason)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Card Auth Pre-check">Card Auth Pre-check</option>
                  <option value="AML Fraud Review">AML Fraud Review</option>
                  <option value="Cheque Clearance">Cheque Clearance</option>
                  <option value="Escrow Milestone Guarantee">Escrow Milestone Guarantee</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Time-to-Live Duration
                </label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value={1}>1 Hour</option>
                  <option value={4}>4 Hours</option>
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={72}>72 Hours (3 Days)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyMutation.isPending}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  {applyMutation.isPending ? 'Enforcing...' : 'Enforce Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
