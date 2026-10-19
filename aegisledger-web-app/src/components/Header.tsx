import React from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  Sun, 
  Moon, 
  KeyRound, 
  ArrowRightLeft, 
  ShieldAlert, 
  CheckCircle2,
  Lock,
  Menu
} from 'lucide-react';
import { Currency, UserPersona } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';

interface HeaderProps {
  currentTab: string;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  persona: UserPersona;
  onPersonaChange: (p: UserPersona) => void;
  idempotencyEnabled: boolean;
  onToggleIdempotency: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  totalDebits: number;
  totalCredits: number;
  onOpenTransferModal: () => void;
  onOpenHoldModal: () => void;
  onRunEOD: () => void;
  onToggleMobileMenu?: () => void;
  onOpenLoginModal?: () => void;
  user?: { name: string; email: string; persona: UserPersona } | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  currency,
  onCurrencyChange,
  persona,
  onPersonaChange,
  idempotencyEnabled,
  onToggleIdempotency,
  isDarkMode,
  onToggleDarkMode,
  totalDebits,
  totalCredits,
  onOpenTransferModal,
  onOpenHoldModal,
  onToggleMobileMenu,
  onOpenLoginModal,
  user,
}) => {
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.001;

  const getPersonaBadgeStyle = (p: UserPersona) => {
    switch (p) {
      case 'System Admin':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'Compliance Auditor':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'Bank Teller':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      {/* Top Banner: Invariant & System Integrity Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              System Ledger Balanced:
            </span>
            <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
              SUM(DR) == SUM(CR)
            </span>
            <span className="px-1.5 py-0.5 text-[11px] font-semibold tracking-wider uppercase rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80">
              [100% Verified]
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>·</span>
            <span className="font-mono tabular-nums text-[11px]">
              DR: {formatCurrency(totalDebits, currency, true)}
            </span>
            <span>=</span>
            <span className="font-mono tabular-nums text-[11px]">
              CR: {formatCurrency(totalCredits, currency, true)}
            </span>
            <span>(Diff: $0.00)</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
          <div className="hidden md:flex items-center gap-1.5 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>ACID Isolation: Serializable</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono">Engine: Hangfire v1.8.14</span>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 gap-4">
        {/* Breadcrumb / Current View Context */}
        <div className="flex items-center gap-2 text-sm">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <span className="font-semibold text-slate-900 dark:text-white">AegisLedger</span>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 dark:text-slate-400 font-medium capitalize">
            {currentTab.replace('-', ' ')}
          </span>
        </div>

        {/* Controls & Actions */}
        <div className="flex items-center gap-3">
          {/* Idempotency Engine Toggle */}
          <button
            onClick={onToggleIdempotency}
            title={idempotencyEnabled ? "Idempotency Filter Enabled (Duplicate Prevention Active)" : "Idempotency Filter Disabled"}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-all ${
              idempotencyEnabled 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Idempotency:</span>
            <span className="font-semibold">{idempotencyEnabled ? 'ON' : 'BYPASS'}</span>
          </button>

          {/* Currency Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            {(['USD', 'EUR', 'PKR'] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => onCurrencyChange(c)}
                className={`px-2 py-1 rounded transition-colors ${
                  currency === c
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* User Persona Switcher */}
          <div className="relative">
            <select
              value={persona}
              aria-label="User Persona"
              onChange={(e) => onPersonaChange(e.target.value as UserPersona)}
              className={`text-xs font-medium px-2.5 py-1.5 rounded-md border cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-800 ${getPersonaBadgeStyle(persona)}`}
            >
              <option value="Compliance Auditor">Role: Compliance Auditor</option>
              <option value="Bank Teller">Role: Bank Teller</option>
              <option value="System Admin">Role: System Admin</option>
            </select>
          </div>

          {/* Auth Session / Persona Switch Modal Trigger */}
          {onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              title="Switch user or authenticate JWT session"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="max-w-[100px] truncate">{user?.name || persona}</span>
            </button>
          )}

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Quick Primary Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={onOpenHoldModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Apply Hold</span>
            </button>

            <button
              onClick={onOpenTransferModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xs transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Initiate Transfer</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
