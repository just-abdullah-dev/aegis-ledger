import React, { useState, useEffect } from 'react';
import { TransactionHold, BankAccount } from '../../types/ledger';
import { formatCurrency } from '../../utils/formatters';
import { 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Info, 
  Calendar, 
  Lock, 
  AlertTriangle,
  RotateCw
} from 'lucide-react';

interface CustomerHoldsViewProps {
  holds: TransactionHold[];
  accounts: BankAccount[];
  onRefreshData: () => Promise<void>;
}

export const CustomerHoldsView: React.FC<CustomerHoldsViewProps> = ({
  holds,
  accounts,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'history'>('active');
  const [now, setNow] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live timer tick every second for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const accountIds = new Set(accounts.map((a) => a.id));

  // Customer holds (filtered to customer-owned accounts or general)
  const customerHolds = holds.filter((h) => !h.accountId || accountIds.has(h.accountId));

  const activeHolds = customerHolds.filter((h) => h.status === 'Active');
  const historyHolds = customerHolds.filter((h) => h.status === 'Released' || h.status === 'Captured');

  const totalActiveHeld = activeHolds.reduce((sum, h) => sum + (h.amount || 0), 0);

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'CardAuthPreCheck':
        return { label: 'Card Pre-Auth', color: 'bg-blue-950/60 text-blue-300 border-blue-800' };
      case 'AmlFraudReview':
        return { label: 'Compliance Review', color: 'bg-rose-950/60 text-rose-300 border-rose-800' };
      case 'ChequeClearance':
        return { label: 'Cheque Clearance', color: 'bg-indigo-950/60 text-indigo-300 border-indigo-800' };
      case 'EscrowMilestoneGuarantee':
        return { label: 'Escrow Guarantee', color: 'bg-purple-950/60 text-purple-300 border-purple-800' };
      default:
        return { label: reason || 'Collateral Ring-Fence', color: 'bg-amber-950/60 text-amber-300 border-amber-800' };
    }
  };

  const formatCountdown = (expiresAt?: string | number) => {
    if (!expiresAt) return 'No fixed expiry';
    const targetMs = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
    const diff = targetMs - now;
    if (diff <= 0) return 'Pending automatic release';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/30 text-[11px] font-semibold text-amber-400 mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Collateral & Security Ring-Fence</span>
            </div>
            <h1 className="text-2xl font-black text-white">Account Holds & Escrow Inspection</h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Inspect active security holds placed on your accounts. Funds remain on your total Book Balance but are ring-fenced from Available Liquidity.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span>Sync Holds</span>
            </button>
          </div>
        </div>

        {/* Total Held Metric */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">Total Ring-Fenced Collateral:</span>
          <span className="font-mono font-bold text-lg text-amber-400">
            {formatCurrency(totalActiveHeld, 'USD')}
          </span>
        </div>
      </div>

      {/* Educational Banner */}
      <div className="p-4 rounded-2xl border border-blue-900/40 bg-blue-950/20 text-xs text-blue-300 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-blue-200">How Holds Work: </span>
          Held amounts are ring-fenced to safeguard pending transactions (such as card pre-authorizations or escrow milestones). Once the clearance condition is satisfied, the funds automatically return to your Available Liquidity.
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveSubTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'active'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Active Holds ({activeHolds.length})
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Hold History ({historyHolds.length})
        </button>
      </div>

      {/* Tab Content: Active Holds */}
      {activeSubTab === 'active' && (
        <div className="space-y-3">
          {activeHolds.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-900/60 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="font-bold text-sm text-white">No Active Security Holds</div>
              <p className="text-xs text-slate-400">
                100% of your Book Ledger Balance is currently available for liquidity and transfer.
              </p>
            </div>
          ) : (
            activeHolds.map((hold) => {
              const badge = getReasonBadge(hold.reason);
              const relatedAcc = accounts.find((a) => a.id === hold.accountId);
              return (
                <div
                  key={hold.id}
                  className="p-5 rounded-2xl border border-amber-900/40 bg-slate-900/90 shadow-md space-y-3 hover:border-amber-800/80 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="font-mono text-xs text-slate-400 font-bold">
                        Hold ID: {hold.id.slice(0, 18)}...
                      </span>
                    </div>

                    <div className="font-mono font-black text-lg text-amber-400">
                      {formatCurrency(hold.amount, 'USD')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80 font-mono">
                    <div>
                      Account: <strong className="text-slate-200">{relatedAcc ? `${relatedAcc.name} (${relatedAcc.accountNumber})` : 'Primary Account'}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 sm:justify-end text-cyan-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Countdown: {formatCountdown(hold.expiresAt)}</span>
                    </div>
                  </div>

                  {hold.notes && (
                    <div className="text-[11px] text-slate-500 italic">
                      Note: {hold.notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content: Hold History */}
      {activeSubTab === 'history' && (
        <div className="space-y-3">
          {historyHolds.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-900/60 text-xs text-slate-500">
              No historical hold events recorded on this account.
            </div>
          ) : (
            historyHolds.map((hold) => (
              <div
                key={hold.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                      hold.status === 'Released'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {hold.status}
                    </span>
                    <span className="font-bold text-white">{hold.reason}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Hold ID: {hold.id} · Released to Available Balance
                  </div>
                </div>

                <div className="font-mono font-bold text-sm text-slate-300">
                  {formatCurrency(hold.amount, 'USD')}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
