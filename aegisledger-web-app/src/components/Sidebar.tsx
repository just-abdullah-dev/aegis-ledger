import React from 'react';
import { 
  LayoutDashboard, 
  Landmark, 
  BookOpenCheck, 
  ShieldAlert, 
  ClipboardCheck, 
  ArrowRightLeft, 
  ShieldCheck, 
  Check, 
  Layers, 
  Server,
  Activity,
  HeartPulse,
  LogOut
} from 'lucide-react';
import { UserPersona } from '../types/ledger';
import { useHealthQuery } from '../hooks/useLedgerQueries';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeHoldsCount: number;
  persona: UserPersona;
  onOpenTransferModal: () => void;
  onOpenHoldModal: () => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeHoldsCount,
  persona,
  onOpenTransferModal,
  onOpenHoldModal,
  isOpenOnMobile = false,
  onCloseMobile,
  onLogout,
}) => {
  const { data: healthData, isError } = useHealthQuery();
  const systemStatus = !isError && healthData?.status ? healthData.status : 'Healthy';
  const navItems = [
    {
      id: 'overview',
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'accounts',
      label: 'Accounts & COA',
      icon: Landmark,
      badge: null,
    },
    {
      id: 'transactions',
      label: 'Double-Entry Journal',
      icon: BookOpenCheck,
      badge: 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
    },
    {
      id: 'holds',
      label: 'Holds & Escrow',
      icon: ShieldAlert,
      badge: activeHoldsCount > 0 ? `${activeHoldsCount} Active` : null,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
    },
    {
      id: 'reconciliation',
      label: 'EOD Audit & Reconcile',
      icon: ClipboardCheck,
      badge: 'EOD',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
    },
    {
      id: 'hangfire',
      label: 'Hangfire Monitor',
      icon: Server,
      badge: 'Admin',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/60 dark:text-purple-300 dark:border-purple-700/60',
    },
  ];

  const isAuditor = persona === 'Compliance Auditor';
  const isTeller = persona === 'Bank Teller';
  const isAdmin = persona === 'System Admin';
  const canPerformOperations = isTeller || isAdmin;

  const visibleNavItems = navItems.filter((item) => {
    if (item.id === 'hangfire') return isAdmin;
    if (item.id === 'reconciliation') return isAuditor || isAdmin;
    if (item.id === 'holds') return isTeller || isAdmin;
    return true;
  });

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenOnMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-screen overflow-hidden transition-all duration-200 md:translate-x-0 md:sticky md:top-0 ${
        isOpenOnMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
      <div className="flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>AegisLedger</span>
              <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ledger Workspaces
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs border-l-2 border-emerald-500 pl-2.5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Actions Shortcuts */}
        {canPerformOperations ? (
          <div className="px-3 pt-3">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quick Operations
            </div>
            <div className="space-y-1.5">
              <button
                onClick={onOpenTransferModal}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 rounded-md transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Initiate Internal Transfer</span>
              </button>
              <button
                onClick={onOpenHoldModal}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60 rounded-md transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Apply Account Hold</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer System Status Card */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-3 bg-slate-50/50 dark:bg-slate-900">
        <div className="p-2.5 rounded-md bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-[11px] space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>System Health</span>
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              {systemStatus}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Active Role</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{persona}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Cluster Status</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">Online · Synced</span>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-white bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Operator</span>
          </button>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Core Consensus Online
          </span>
          <span className="font-mono text-slate-400 dark:text-slate-500">2026.10</span>
        </div>
      </div>
    </aside>
    </>
  );
};
