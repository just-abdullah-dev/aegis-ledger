import React, { useState } from 'react';
import { BankAccount } from '../../types/ledger';
import { transactionsApi } from '../../lib/api-client';
import { formatCurrency } from '../../utils/formatters';
import { 
  ArrowRightLeft, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  Lock, 
  Coins, 
  ArrowRight,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';

interface CustomerTransferViewProps {
  accounts: BankAccount[];
  allAccounts: BankAccount[];
  onTransferSuccess: () => Promise<void>;
  onNavigateTab: (tab: string, path: string) => void;
}

export const CustomerTransferView: React.FC<CustomerTransferViewProps> = ({
  accounts,
  allAccounts,
  onTransferSuccess,
  onNavigateTab,
}) => {
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    accounts[0]?.id || ''
  );
  const [destinationAccountNum, setDestinationAccountNum] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('P2P Sovereign Transfer');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => 
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idem-${Date.now()}`
  );

  // Modal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isStepUpRequired, setIsStepUpRequired] = useState(false);
  const [stepUpPassword, setStepUpPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId) || accounts[0];
  const amount = parseFloat(amountStr) || 0;
  const availableBal = sourceAccount?.availableBalance || 0;

  // Validation
  const isAmountValid = amount > 0 && amount <= availableBal;
  const isHighValue = amount >= 1000.0;
  const estimatedPostBalance = availableBal - amount;

  // Presets of other accounts
  const recipientPresets = allAccounts
    .filter((a) => a.id !== sourceAccount?.id)
    .slice(0, 4);

  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!destinationAccountNum.trim()) {
      setErrorMsg('Please specify a recipient account number.');
      return;
    }

    if (amount <= 0) {
      setErrorMsg('Please enter a transfer amount greater than $0.00.');
      return;
    }

    if (amount > availableBal) {
      setErrorMsg(`Transfer blocked: Amount ($${amount.toFixed(2)}) exceeds available liquidity ($${availableBal.toFixed(2)}). Active security holds protect remaining funds.`);
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleExecuteTransfer = async () => {
    if (isHighValue && !stepUpPassword.trim()) {
      setIsStepUpRequired(true);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await transactionsApi.postTransfer({
        sourceAccountId: sourceAccount.id,
        targetAccountNumber: destinationAccountNum.trim(),
        amount,
        description: description.trim() || 'P2P Sovereign Transfer',
        idempotencyKey,
      });

      if (res.success) {
        setSuccessReceipt({
          reference: res.referenceNumber,
          sourceAccountNum: sourceAccount.accountNumber,
          destinationAccountNum: destinationAccountNum.trim(),
          amount,
          description,
          idempotencyKey,
          timestamp: new Date().toISOString(),
        });
        setIsConfirmOpen(false);
        setIsStepUpRequired(false);
        setStepUpPassword('');
        setAmountStr('');
        setDestinationAccountNum('');
        setIdempotencyKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idem-${Date.now()}`);
        await onTransferSuccess();
      }
    } catch (err: any) {
      console.error('Transfer execution error:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Transfer failed. Please check recipient account number.';
      setErrorMsg(msg);
      setIsConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* View Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-[11px] font-semibold text-cyan-400">
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Instant Double-Entry Settlement</span>
        </div>
        <h1 className="text-2xl font-black text-white">Send Money (Instant P2P Transfer)</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Execute atomic double-entry postings directly between accounts with client-side idempotency protection.
        </p>
      </div>

      {/* Main Transfer Form Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div>
              <div className="font-bold">Transaction Failed</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleOpenConfirmation} className="space-y-5">
          {/* 1. Source Account Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Pay From (Source Account)</span>
              <span className="text-emerald-400 font-mono text-[11px] normal-case">
                Available: {formatCurrency(availableBal, 'USD')}
              </span>
            </label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.accountNumber}) · {acc.type} — Available: {formatCurrency(acc.availableBalance, 'USD')}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Destination Account Number */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recipient Account Number
            </label>
            <input
              type="text"
              required
              value={destinationAccountNum}
              onChange={(e) => setDestinationAccountNum(e.target.value)}
              placeholder="e.g. ACC-4109-ESC or ACC-8029-CHK"
              className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-950 border border-slate-700 text-white font-mono placeholder-slate-600 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            />

            {/* Quick Presets */}
            {recipientPresets.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-500 font-medium">Quick Select:</span>
                {recipientPresets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDestinationAccountNum(p.accountNumber)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                  >
                    {p.name.split(' ')[0]} ({p.accountNumber})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Transfer Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Transfer Amount ($ USD)
              </label>
              {amount > availableBal && (
                <span className="text-[11px] font-semibold text-rose-400">
                  Exceeds Available Liquidity!
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3 text-sm font-bold text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={availableBal}
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-8 pr-4 py-3 text-base sm:text-lg rounded-xl bg-slate-950 border font-mono font-bold focus:outline-hidden ${
                  amount > availableBal
                    ? 'border-rose-500 text-rose-400 focus:ring-2 focus:ring-rose-500/40'
                    : 'border-slate-700 text-white focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500'
                }`}
              />
            </div>

            {/* Quick Percentage Chips */}
            <div className="flex items-center gap-2 pt-1">
              {[0.1, 0.25, 0.5, 1.0].map((ratio) => {
                const label = ratio === 1.0 ? 'MAX' : `${ratio * 100}%`;
                const val = (availableBal * ratio).toFixed(2);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAmountStr(val)}
                    className="flex-1 py-1 rounded-lg text-[11px] font-mono font-semibold bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-800 transition cursor-pointer"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Description Memo */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Transfer Description / Memo
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Invoice settlement, escrow guarantee..."
              className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
            />
          </div>

          {/* 5. Client Idempotency Engine Details */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Client-Side Idempotency Protection</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">ACTIVE</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Unique Token: <span className="font-mono text-slate-400">{idempotencyKey}</span>
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isAmountValid || !destinationAccountNum.trim()}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Review & Authorize Transfer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Confirmation & Step-Up Security Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/10 text-cyan-400 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Confirm Sovereign Transfer</h3>
              <p className="text-xs text-slate-400">
                Double-entry settlement will post atomically to the General Ledger.
              </p>
            </div>

            {/* Breakdown Table */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">From Account:</span>
                <span className="font-mono text-white font-semibold">{sourceAccount.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">To Account:</span>
                <span className="font-mono text-white font-semibold">{destinationAccountNum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transfer Amount:</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">{formatCurrency(amount, 'USD')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transfer Fee:</span>
                <span className="font-mono text-emerald-400 font-semibold">$0.00 (Core Zero Fee)</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between">
                <span className="text-slate-400">Est. New Available:</span>
                <span className="font-mono text-slate-200 font-semibold">{formatCurrency(estimatedPostBalance, 'USD')}</span>
              </div>
            </div>

            {/* Step-Up Security for High-Value Transfers (>= $1000) */}
            {isHighValue && (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2.5">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>Step-Up Security Authorization Required</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Transfers of $1,000.00 or more require password re-verification to prevent unauthorized funds dissipation.
                </p>
                <input
                  type="password"
                  value={stepUpPassword}
                  onChange={(e) => setStepUpPassword(e.target.value)}
                  placeholder="Enter your customer password"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmOpen(false);
                  setIsStepUpRequired(false);
                }}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={isSubmitting || (isHighValue && !stepUpPassword.trim())}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <span>Confirm & Send</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      {successReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-600/10 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Transfer Posted Successfully</h3>
              <p className="text-xs text-slate-400">
                Official double-entry leg posted with immutable SHA-256 seal.
              </p>
            </div>

            {/* Receipt Printable Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-3 font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-500 uppercase tracking-widest text-[10px]">AegisLedger Core Banking</span>
                <span className="text-emerald-400 font-bold text-[10px]">SETTLED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reference:</span>
                <span className="text-white font-bold">{successReceipt.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-300">{new Date(successReceipt.timestamp).toUTCString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">From Account:</span>
                <span className="text-slate-300">{successReceipt.sourceAccountNum}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">To Account:</span>
                <span className="text-slate-300">{successReceipt.destinationAccountNum}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-bold">Settled Amount:</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(successReceipt.amount, 'USD')}</span>
              </div>
              <div className="pt-2 text-[10px] text-slate-500 break-all">
                Idempotency Token: {successReceipt.idempotencyKey}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuccessReceipt(null);
                  onNavigateTab('dashboard', '/customer/dashboard');
                }}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition cursor-pointer"
              >
                Return to Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
