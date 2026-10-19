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
  Database,
  LockKeyhole,
  Server
} from 'lucide-react';
import { UserPersona } from '../types/ledger';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  activeHoldsCount: number;
  persona: UserPersona;
  onOpenTransferModal: () => void;
  onOpenHoldModal: () => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
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
}) => {
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
    },
    {
      id: 'hangfire',
      label: 'Hangfire Monitor',
      icon: Server,
      badge: 'Admin',
      badgeColor: 'bg-purple-900/60 text-purple-300 border border-purple-700/60',
    },
  ];

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

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 min-h-screen transition-transform duration-200 md:translate-x-0 md:static ${
        isOpenOnMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
      <div>
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>AegisLedger</span>
              <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                v2.6
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Core Banking & Double-Entry</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Ledger Workspaces
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs border-l-2 border-emerald-500 pl-2.5'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
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
        <div className="px-3 pt-3">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Quick Operations
          </div>
          <div className="space-y-1.5">
            <button
              onClick={onOpenTransferModal}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-300 hover:text-emerald-200 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 rounded-md transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Initiate Internal Transfer</span>
            </button>
            <button
              onClick={onOpenHoldModal}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 rounded-md transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Apply Account Hold</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer System Status Card */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="p-2.5 rounded-md bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>Isolation Level</span>
            <span className="font-mono text-emerald-400">SERIALIZABLE</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Optimistic Locking</span>
            <span className="font-mono text-slate-300">RowVersion (64b)</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Active Persona</span>
            <span className="font-semibold text-slate-200 truncate max-w-[100px]">{persona}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Core Consensus Online
          </span>
          <span className="font-mono text-slate-400">2026.10</span>
        </div>
      </div>
    </aside>
    </>
  );
};
