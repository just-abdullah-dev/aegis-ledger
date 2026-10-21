import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sun, 
  Moon, 
  KeyRound, 
  ArrowRightLeft, 
  ShieldAlert, 
  Menu, 
  LogOut, 
  MoreVertical, 
  User, 
  Coins, 
  Check, 
  Sparkles,
  Server,
  Activity,
  HeartPulse,
  Info
} from 'lucide-react';
import { Currency, UserPersona } from '../types/ledger';
import { useHealthQuery } from '../hooks/useLedgerQueries';

interface HeaderProps {
  currentTab: string;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  persona: UserPersona;
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
  onLogout?: () => void;
  user?: { id?: string; name: string; email: string; persona: UserPersona | string; role?: string } | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  currency,
  onCurrencyChange,
  persona,
  idempotencyEnabled,
  onToggleIdempotency,
  isDarkMode,
  onToggleDarkMode,
  onOpenTransferModal,
  onOpenHoldModal,
  onToggleMobileMenu,
  onLogout,
  user,
}) => {
  const { data: healthData, isError, isLoading } = useHealthQuery();

  const isBackendLive = !isError && Boolean(healthData) && (healthData.status === 'Healthy' || healthData.status === 'online');
  const isRedisLive = isBackendLive && (healthData?.services?.redis?.status === 'online' || healthData?.services?.redis?.status === 'Connected');
  const isHangfireLive = isBackendLive && (healthData?.services?.hangfire?.status === 'online' || healthData?.services?.hangfire?.status === 'Active');

  // Dropdown states for 3 dots menu and user avatar
  const [isDotsOpen, setIsDotsOpen] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const dotsRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dotsRef.current && !dotsRef.current.contains(e.target as Node)) {
        setIsDotsOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setIsAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPersonaBadgeStyle = (p: UserPersona) => {
    switch (p) {
      case 'System Admin':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'Compliance Auditor':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'Bank Teller':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = user?.name || (
    persona === 'System Admin' ? 'System Admin' :
    persona === 'Bank Teller' ? 'Bank Teller' :
    'Compliance Auditor'
  );

  const displayEmail = user?.email || (
    persona === 'System Admin' ? 'admin@aegisledger.bank' :
    persona === 'Bank Teller' ? 'teller@aegisledger.bank' :
    'auditor@aegisledger.bank'
  );

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      {/* Top Banner: Service Health & Connectivity Status Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-1 text-xs bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200/60 dark:border-slate-800/60">
        {/* Left Side: System Health Summary */}
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
         
          <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-slate-400">
            Authenticated Role: <strong className="text-slate-800 dark:text-slate-200">{persona}</strong>
          </span>
        </div>

        {/* Right Side: Live Service Health Indicators */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Frontend */}
          <div className="flex items-center gap-1.5 py-0.5" title="Client application live">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Frontend</span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">·</span>

          {/* Backend */}
          <div className="flex items-center gap-1.5 py-0.5" title={isBackendLive ? '.NET 10 API healthy' : 'Cannot reach backend server'}>
            <span className={`inline-flex rounded-full h-2 w-2 ${
              isLoading ? 'bg-amber-400 animate-pulse' : isBackendLive ? 'bg-emerald-500' : 'bg-red-500'
            }`}></span>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Backend</span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">·</span>

          {/* Redis */}
          <div className="flex items-center gap-1.5 py-0.5" title={isRedisLive ? 'Redis cache connected' : 'Cache service unreachable'}>
            <span className={`inline-flex rounded-full h-2 w-2 ${isRedisLive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Redis</span>
          </div>

          <span className="text-slate-300 dark:text-slate-700">·</span>

          {/* Hangfire */}
          <div className="flex items-center gap-1.5 py-0.5" title={isHangfireLive ? 'Background worker active' : 'Worker process not responding'}>
            <span className={`inline-flex rounded-full h-2 w-2 ${isHangfireLive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Hangfire</span>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 gap-4">
        {/* Left Side: Breadcrumb / View Context */}
        <div className="flex items-center gap-2 text-sm">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
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

        {/* Right Side Controls & Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Primary Actions based on role */}
          {persona !== 'Compliance Auditor' ? (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={onOpenHoldModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Apply Hold</span>
              </button>

              <button
                onClick={onOpenTransferModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xs transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Initiate Transfer</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Audit Oversight Mode</span>
            </div>
          )}

          {/* 1. Three Dots Dropdown Menu (Idempotency, Currency, Theme Switcher, Info) */}
          <div 
            ref={dotsRef} 
            className="relative"
            onMouseEnter={() => setIsDotsOpen(true)}
            onMouseLeave={() => setIsDotsOpen(false)}
          >
            <button
              onClick={() => setIsDotsOpen((prev) => !prev)}
              aria-label="Configuration & Preferences"
              title="Portal options & telemetry"
              className={`p-2 rounded-lg border transition cursor-pointer ${
                isDotsOpen
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Card */}
            {isDotsOpen && (
              <div className="absolute right-0 top-full w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3 z-50 space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                    Portal Settings
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">v1.0.0</span>
                </div>

                {/* Idempotency Filter Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Idempotency Engine</span>
                    </span>
                    <button
                      onClick={onToggleIdempotency}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold font-mono border transition cursor-pointer ${
                        idempotencyEnabled
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {idempotencyEnabled ? 'ON (ACTIVE)' : 'BYPASS'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500">
                    Prevents accidental duplicate debit/credit postings using client correlation tokens.
                  </p>
                </div>

                {/* Currency Switcher */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      <Coins className="w-3.5 h-3.5 text-blue-500" />
                      <span>Display Currency</span>
                    </span>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-semibold">
                      {(['USD', 'EUR', 'PKR'] as Currency[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => onCurrencyChange(c)}
                          className={`px-2 py-0.5 rounded transition cursor-pointer ${
                            currency === c
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dark / Light Theme Mode Switcher */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      {isDarkMode ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                      <span>Theme Appearance</span>
                    </span>
                    <button
                      onClick={onToggleDarkMode}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer font-semibold text-[11px]"
                    >
                      {isDarkMode ? (
                        <>
                          <Moon className="w-3 h-3 text-indigo-400" />
                          <span>Dark Mode</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-3 h-3 text-amber-500" />
                          <span>Light Mode</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Consensus Telemetry Info */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Engine:</span>
                    <span className="font-mono text-emerald-500 font-medium">.NET 10 / C# 14</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ledger Invariant:</span>
                    <span className="font-mono text-emerald-500 font-medium">SUM(DR) == SUM(CR)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. User Avatar Dropdown (Profile Info & Sign Out) */}
          <div 
            ref={avatarRef} 
            className="relative"
            onMouseEnter={() => setIsAvatarOpen(true)}
            onMouseLeave={() => setIsAvatarOpen(false)}
          >
            <button
              onClick={() => setIsAvatarOpen((prev) => !prev)}
              aria-label="User profile & session"
              title={`${displayName} (${persona})`}
              className={`flex items-center gap-2 p-1 rounded-full border transition cursor-pointer ${
                isAvatarOpen
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {getInitials(displayName)}
                </div>
                {/* Status Dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
            </button>

            {/* Avatar Dropdown Card */}
            {isAvatarOpen && (
              <div className="absolute right-0 top-full w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3 z-50 space-y-3 text-xs">
                {/* Profile Header */}
                <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md">
                    {getInitials(displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {displayName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {displayEmail}
                    </div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getPersonaBadgeStyle(persona)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{persona}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Details */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Account ID:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px] truncate max-w-[120px]">
                      {user?.id || 'usr-authenticated'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auth Standard:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 text-[10px]">
                      HMAC-SHA256 JWT
                    </span>
                  </div>
                </div>

                {/* Sign Out Button */}
                {onLogout && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setIsAvatarOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out Operator</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
