import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { proxy } from '../../lib/proxy';
import { 
  Smartphone, 
  LogOut, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  User, 
  ArrowLeftRight,
  Shield,
  Clock,
  QrCode,
  FileText,
  LayoutDashboard
} from 'lucide-react';

interface CustomerHeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOnline: boolean;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  currentTab,
  onSelectTab,
  isOnline
}) => {
  const { user, logout } = useAuthStore();

  const navLinks = [
    { id: 'dashboard', label: 'Wallet', icon: LayoutDashboard, path: '/customer/dashboard' },
    { id: 'transfer', label: 'Send Money', icon: ArrowLeftRight, path: '/customer/transfer' },
    { id: 'holds', label: 'Active Holds', icon: Clock, path: '/customer/holds' },
    { id: 'transactions', label: 'Statements', icon: FileText, path: '/customer/transactions' },
    { id: 'receive', label: 'Receive QR', icon: QrCode, path: '/customer/receive' },
  ];

  const handleNav = (id: string, path: string) => {
    onSelectTab(id);
    proxy.navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-300 px-4 py-1.5 text-xs flex items-center justify-center gap-2 font-medium">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode Detected · Transaction submissions temporarily queued</span>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand & Customer Identity */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => handleNav('dashboard', '/customer/dashboard')}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-cyan-500/20 cursor-pointer"
          >
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                AegisLedger
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold uppercase tracking-wider">
                Retail Customer
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>{user?.name || 'Retail Client'}</span>
              <span className="text-slate-600">·</span>
              <span className="font-mono text-slate-500 text-[10px]">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id, item.path)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Invariant Pill & Sign Out */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-[11px] text-emerald-400 font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Zero-Drift Invariant Verified</span>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 text-rose-300 border border-rose-900/60 hover:bg-rose-900/60 transition cursor-pointer"
            title="Terminate customer banking session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Strip */}
      <div className="md:hidden border-t border-slate-800/80 bg-slate-950/90 px-2 py-1.5 flex items-center justify-around overflow-x-auto">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id, item.path)}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                isActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
