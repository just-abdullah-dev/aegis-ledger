import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Lock
} from 'lucide-react';
import { BankAccount, Currency, HoldReason } from '../../types/ledger';
import { formatCurrency } from '../../utils/formatters';

interface ApplyHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  currency: Currency;
  onApplyHold: (params: {
    accountId: string;
    amount: number;
    reason: HoldReason;
    durationHours: number;
  }) => { success: boolean; message: string };
  initialAccountId?: string;
}

export const ApplyHoldModal: React.FC<ApplyHoldModalProps> = ({
  isOpen,
  onClose,
  accounts,
  currency,
  onApplyHold,
  initialAccountId,
}) => {
  const customerAccounts = accounts.filter((a) => a.category === 'customer');

  const [accountId, setAccountId] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('25000');
  const [reason, setReason] = useState<HoldReason>('Card Auth Pre-check');
  const [durationHours, setDurationHours] = useState<number>(4);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      const defaultAcc = initialAccountId || (customerAccounts.length > 0 ? customerAccounts[0].id : '');
      setAccountId(defaultAcc);
    }
  }, [isOpen, customerAccounts, initialAccountId]);

  if (!isOpen) return null;

  const targetAccount = accounts.find((a) => a.id === accountId);
  const holdAmount = parseFloat(amountStr) || 0;

  const hasInsufficientAvailable = targetAccount ? holdAmount > targetAccount.availableBalance : false;
  const isAccountFrozen = targetAccount?.status === 'Frozen';
  const isValidAmount = holdAmount > 0;

  const canSubmit = isValidAmount && !hasInsufficientAvailable && !isAccountFrozen;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const result = onApplyHold({
      accountId,
      amount: holdAmount,
      reason,
      durationHours,
    });

    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.message);
    }
  };

  const newAvailable = targetAccount ? Math.max(0, targetAccount.availableBalance - holdAmount) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Apply Account Hold
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reserve funds temporarily from Available Balance without mutating Book Ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Account selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Target Customer Account</span>
              {targetAccount && (
                <span className="font-mono text-[11px] text-slate-500">
                  Available: {formatCurrency(targetAccount.availableBalance, currency)}
                </span>
              )}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              {customerAccounts.map((acc) => (
                <option key={acc.id} value={acc.id} disabled={acc.status === 'Frozen'}>
                  {acc.accountNumber} — {acc.name} (Book: {formatCurrency(acc.ledgerBalance, currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Hold Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Hold Amount ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">$</span>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-7 pr-4 py-2 text-sm font-mono font-bold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {hasInsufficientAvailable && (
              <p className="text-[11px] text-red-500">
                Hold amount exceeds available funds ({formatCurrency(targetAccount?.availableBalance || 0, currency)}).
              </p>
            )}
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Regulatory / Operational Hold Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as HoldReason)}
              className="w-full text-xs font-medium px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="Card Auth Pre-check">Card Auth Pre-check (Pre-authorization lock)</option>
              <option value="AML Fraud Review">AML Fraud Review (OFAC / FinCEN SAR Investigation)</option>
              <option value="Cheque Clearance">Cheque Clearance (Interbank settlement float)</option>
              <option value="Escrow Milestone Guarantee">Escrow Milestone Guarantee (Contractual escrow bond)</option>
            </select>
          </div>

          {/* Duration TTL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Automatic Expiry Window (Time to Live)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '30 Mins', hours: 0.5 },
                { label: '2 Hours', hours: 2 },
                { label: '6 Hours', hours: 6 },
                { label: '24 Hours', hours: 24 },
              ].map((item) => (
                <button
                  key={item.hours}
                  type="button"
                  onClick={() => setDurationHours(item.hours)}
                  className={`py-1.5 text-xs font-semibold rounded-md border transition-all ${
                    durationHours === item.hours
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-400 dark:border-amber-700'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Balance Impact Preview */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
            <div className="font-sans font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
              Expected Post-Hold Balances:
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Book Ledger Balance:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(targetAccount?.ledgerBalance || 0, currency)} (Unchanged)
              </span>
            </div>
            <div className="flex justify-between text-amber-600 dark:text-amber-400 border-t border-slate-200 dark:border-slate-800 pt-1">
              <span>New Available Balance:</span>
              <span className="font-bold">
                {formatCurrency(newAvailable, currency)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`px-5 py-2 text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 ${
                canSubmit
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Enforce Hold</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
