import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Layers, 
  Lock, 
  Unlock, 
  Building2, 
  ShieldCheck, 
  ShieldAlert,
  ArrowRightLeft,
  FileSpreadsheet,
  Coins,
  Plus,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Info,
  X,
  AlertTriangle,
  UserCheck,
  CreditCard,
  ArrowUpDown,
  SlidersHorizontal,
  HelpCircle
} from 'lucide-react';
import { BankAccount, AccountCategory, Currency, UserPersona } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';
import { useAccountsQuery } from '../hooks/useLedgerQueries';
import { CreateAccountModal } from './modals/CreateAccountModal';
import { CreateAccountPayload } from '../lib/api-client';

interface AccountsViewProps {
  accounts: BankAccount[];
  currency: Currency;
  persona: UserPersona;
  onToggleStatus: (accountId: string, requestedStatus?: 'Active' | 'Frozen' | 'Closed') => void | Promise<void>;
  onViewAccountHistory: (account: BankAccount) => void;
  onViewHolds?: (account: BankAccount) => void;
  onOpenTransferModalWithSource?: (sourceAccount: BankAccount) => void;
  onCreateAccount?: (payload: CreateAccountPayload) => Promise<{ success: boolean; message: string; account?: BankAccount }>;
}

type SortField = 'accountNumber' | 'name' | 'type' | 'ledgerBalance' | 'availableBalance' | 'status' | 'rowVersion';
type SortOrder = 'asc' | 'desc';

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  currency,
  persona,
  onToggleStatus,
  onViewAccountHistory,
  onViewHolds,
  onOpenTransferModalWithSource,
  onCreateAccount,
}) => {
  const { data: serverAccounts, refetch: refetchAccounts, isFetching, isError, error } = useAccountsQuery();
  const effectiveAccounts = serverAccounts && Array.isArray(serverAccounts)
    ? serverAccounts 
    : (accounts || []);

  // Primary Tab: Customer accounts vs System COA
  const [activeTab, setActiveTab] = useState<AccountCategory>('customer');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Frozen' | 'Closed'>('ALL');
  const [onlyWithHolds, setOnlyWithHolds] = useState<boolean>(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('accountNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals & Drawers state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [detailAccount, setDetailAccount] = useState<BankAccount | null>(null);
  const [accountToToggle, setAccountToToggle] = useState<BankAccount | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

  // Clipboard copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Switch tabs & reset page
  const handleTabSwitch = (category: AccountCategory) => {
    setActiveTab(category);
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setOnlyWithHolds(false);
    setCurrentPage(1);
  };

  // Base list of accounts for current category
  const categoryAccounts = useMemo(() => {
    return (effectiveAccounts || []).filter(
      (acc) => (acc.category || '').toLowerCase() === activeTab.toLowerCase()
    );
  }, [effectiveAccounts, activeTab]);

  // Filtered accounts based on search, type, status, and holds filter
  const filteredAccounts = useMemo(() => {
    return categoryAccounts.filter((acc) => {
      // Type filter
      if (typeFilter !== 'ALL' && acc.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && acc.status !== statusFilter) return false;

      // Holds filter
      if (onlyWithHolds && acc.ledgerBalance <= acc.availableBalance) return false;

      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNumber = acc.accountNumber?.toLowerCase().includes(q);
        const matchesName = acc.name?.toLowerCase().includes(q);
        const matchesOwner = acc.owner?.toLowerCase().includes(q);
        const matchesDesc = acc.description?.toLowerCase().includes(q);
        const matchesRouting = acc.routingCode?.toLowerCase().includes(q);
        if (!matchesNumber && !matchesName && !matchesOwner && !matchesDesc && !matchesRouting) {
          return false;
        }
      }
      return true;
    });
  }, [categoryAccounts, typeFilter, statusFilter, onlyWithHolds, searchQuery]);

  // Sorted accounts
  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'accountNumber':
          comparison = (a.accountNumber || '').localeCompare(b.accountNumber || '');
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
        case 'ledgerBalance':
          comparison = (a.ledgerBalance || 0) - (b.ledgerBalance || 0);
          break;
        case 'availableBalance':
          comparison = (a.availableBalance || 0) - (b.availableBalance || 0);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'rowVersion':
          comparison = (a.rowVersion || '').localeCompare(b.rowVersion || '');
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredAccounts, sortField, sortOrder]);

  // Paginated accounts
  const totalPages = Math.max(1, Math.ceil(sortedAccounts.length / (pageSize === 0 ? sortedAccounts.length || 1 : pageSize)));
  const paginatedAccounts = useMemo(() => {
    if (pageSize === 0) return sortedAccounts;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedAccounts.slice(startIndex, startIndex + pageSize);
  }, [sortedAccounts, currentPage, pageSize]);

  // Aggregate Metrics for Current Category
  const totalLedger = useMemo(() => categoryAccounts.reduce((sum, a) => sum + (a.ledgerBalance || 0), 0), [categoryAccounts]);
  const totalAvailable = useMemo(() => categoryAccounts.reduce((sum, a) => sum + (a.availableBalance || 0), 0), [categoryAccounts]);
  const totalHeld = totalLedger - totalAvailable;

  const activeCount = useMemo(() => categoryAccounts.filter((a) => a.status === 'Active').length, [categoryAccounts]);
  const frozenCount = useMemo(() => categoryAccounts.filter((a) => a.status === 'Frozen').length, [categoryAccounts]);
  const holdsCount = useMemo(() => categoryAccounts.filter((a) => a.ledgerBalance > a.availableBalance).length, [categoryAccounts]);

  // Toggle sort direction
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'ledgerBalance' || field === 'availableBalance' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Export current table view to CSV
  const handleExportCsv = () => {
    const headers = [
      'Account Number',
      'Account Name',
      'Legal Owner',
      'Category',
      'Type',
      'Currency',
      'Ledger Balance',
      'Available Balance',
      'Active Holds',
      'Status',
      'Routing Code',
      'RowVersion Token'
    ];

    const rows = sortedAccounts.map((a) => [
      `"${a.accountNumber}"`,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      `"${(a.owner || '').replace(/"/g, '""')}"`,
      `"${a.category}"`,
      `"${a.type}"`,
      `"${a.currency || currency}"`,
      (a.ledgerBalance || 0).toFixed(2),
      (a.availableBalance || 0).toFixed(2),
      ((a.ledgerBalance || 0) - (a.availableBalance || 0)).toFixed(2),
      `"${a.status}"`,
      `"${a.routingCode || '021000021'}"`,
      `"${a.rowVersion}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `AegisLedger_${activeTab.toUpperCase()}_Accounts_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Confirm and execute status toggle (Freeze / Unfreeze)
  const handleConfirmStatusToggle = async () => {
    if (!accountToToggle) return;
    setIsTogglingStatus(true);
    try {
      const nextStatus = accountToToggle.status === 'Active' ? 'Frozen' : 'Active';
      await onToggleStatus(accountToToggle.id, nextStatus);
      setAccountToToggle(null);
    } catch {
      // Error toast is handled by parent onToggleStatus handler
      setAccountToToggle(null);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Checking':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Savings':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Escrow':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Asset':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Liability':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Equity':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'Revenue':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
      case 'Frozen':
        return 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-300 dark:border-red-800';
      case 'Closed':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-3.5 h-3.5 text-emerald-500 ml-1 inline" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-emerald-500 ml-1 inline" />
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Backend Offline Alert Banner */}
      {isError && (
        <div className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 flex items-start justify-between gap-4 text-red-800 dark:text-red-300 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-bold text-sm">Core Ledger Backend Offline</h3>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                Unable to establish a connection with the AegisLedger API server. Account balances cannot be synced and mutations (Freeze/Unfreeze) are blocked until the backend service is started.
              </p>
              <div className="text-[11px] font-mono mt-1 text-red-600 dark:text-red-400 opacity-90">
                {(error as any)?.message || 'Connection refused at backend endpoint.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => refetchAccounts()}
            disabled={isFetching}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-red-900 dark:text-red-100 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Header and Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Accounts & Chart of Accounts (COA)</span>
          
          </h1>
         
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Tab switch buttons */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              onClick={() => handleTabSwitch('customer')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'customer'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Customer Accounts ({effectiveAccounts.filter((a) => a.category === 'customer').length})
            </button>
            <button
              onClick={() => handleTabSwitch('system')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              System Ledgers / COA ({effectiveAccounts.filter((a) => a.category === 'system').length})
            </button>
          </div>

          {/* Export to CSV Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition shadow-2xs cursor-pointer"
            title="Export currently filtered accounts to standard CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Refresh Live Data Button */}
          <button
            onClick={() => refetchAccounts()}
            disabled={isFetching}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Refresh accounts from SQL Server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {/* System Admin: Create New Account Button */}
          {persona === 'System Admin' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow-xs transition-all cursor-pointer"
              title="Open a new customer deposit account or Chart of Accounts ledger (System Admin clearance)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Open New Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip for Current Tab */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Book Ledger Balance</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalLedger, currency)}
          </div>
          <span className="text-[11px] text-slate-400">Sum of all {categoryAccounts.length} {activeTab} accounts</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Available Liquidity</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalAvailable, currency)}
          </div>
          <span className="text-[11px] text-slate-400">
            {totalLedger > 0 ? ((totalAvailable / totalLedger) * 100).toFixed(1) : 100}% liquid for immediate debit
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Security Holds Enforced</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalHeld, currency)}
          </div>
          <span className="text-[11px] text-slate-400">{holdsCount} accounts with active ring-fenced funds</span>
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium mr-1 flex items-center gap-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Quick Views:</span>
        </span>

        <button
          onClick={() => {
            setStatusFilter('ALL');
            setOnlyWithHolds(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'ALL' && !onlyWithHolds
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs font-semibold'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          All {categoryAccounts.length}
        </button>

        <button
          onClick={() => {
            setStatusFilter('Active');
            setOnlyWithHolds(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'Active' && !onlyWithHolds
              ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
          }`}
        >
          Active ({activeCount})
        </button>

        <button
          onClick={() => {
            setStatusFilter('Frozen');
            setOnlyWithHolds(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            statusFilter === 'Frozen' && !onlyWithHolds
              ? 'bg-red-600 text-white border-red-600 font-semibold shadow-2xs'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100'
          }`}
        >
          Frozen ({frozenCount})
        </button>

        <button
          onClick={() => {
            setOnlyWithHolds(!onlyWithHolds);
            setStatusFilter('ALL');
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer border ${
            onlyWithHolds
              ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-2xs'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
          }`}
        >
          With Holds ({holdsCount})
        </button>

        {(searchQuery || typeFilter !== 'ALL' || statusFilter !== 'ALL' || onlyWithHolds) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('ALL');
              setStatusFilter('ALL');
              setOnlyWithHolds(false);
              setCurrentPage(1);
            }}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline ml-2 cursor-pointer"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Controls & Search */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search account #, legal name, owner, routing code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Account Type Selector */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Types</option>
                {activeTab === 'customer' ? (
                  <>
                    <option value="Checking">Checking</option>
                    <option value="Savings">Savings</option>
                    <option value="Escrow">Escrow</option>
                  </>
                ) : (
                  <>
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                  </>
                )}
              </select>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Frozen">Frozen</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs font-medium px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer font-mono"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="0">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold select-none">
                <th 
                  onClick={() => handleSort('accountNumber')} 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Account Number</span>
                  {renderSortIndicator('accountNumber')}
                </th>
                <th 
                  onClick={() => handleSort('name')} 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Account Name / Owner</span>
                  {renderSortIndicator('name')}
                </th>
                <th 
                  onClick={() => handleSort('type')} 
                  className="py-2.5 px-3 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Type</span>
                  {renderSortIndicator('type')}
                </th>
                <th 
                  onClick={() => handleSort('ledgerBalance')} 
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Ledger Balance</span>
                  {renderSortIndicator('ledgerBalance')}
                </th>
                <th 
                  onClick={() => handleSort('availableBalance')} 
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Available Balance</span>
                  {renderSortIndicator('availableBalance')}
                </th>
                <th 
                  onClick={() => handleSort('status')} 
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>Status</span>
                  {renderSortIndicator('status')}
                </th>
                <th 
                  onClick={() => handleSort('rowVersion')} 
                  className="py-2.5 px-3 font-mono cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <span>RowVersion</span>
                  {renderSortIndicator('rowVersion')}
                </th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      {isError ? (
                        <AlertTriangle className="w-8 h-8 text-red-400 dark:text-red-500" />
                      ) : (
                        <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        {isError ? 'Unable to load accounts (Backend Offline)' : 'No accounts match this filter'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isError ? 'Start the .NET backend API server and click "Retry Connection" above.' : 'Try adjusting your search query, type selection, or status filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((account) => {
                  const hasHolds = (account.ledgerBalance || 0) > (account.availableBalance || 0);
                  const holdAmount = (account.ledgerBalance || 0) - (account.availableBalance || 0);

                  return (
                    <tr
                      key={account.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setDetailAccount(account)}
                            className="hover:text-emerald-600 dark:hover:text-emerald-400 underline-offset-2 hover:underline cursor-pointer text-left"
                            title="Click to view complete account details and audit profile"
                          >
                            {account.accountNumber}
                          </button>
                          <button
                            onClick={() => handleCopy(account.accountNumber, `acc-${account.id}`)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                            title="Copy Account Number"
                          >
                            {copiedKey === `acc-${account.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[220px]">
                        <div 
                          onClick={() => setDetailAccount(account)}
                          className="font-semibold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          {account.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {account.owner ? `${account.owner} · ` : ''}Routing: {account.routingCode || '021000021'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getTypeBadgeClass(
                            account.type
                          )}`}
                        >
                          {account.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(account.ledgerBalance, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(account.availableBalance, currency)}
                        </div>
                        {hasHolds && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                            Hold: -{formatCurrency(holdAmount, currency)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(
                            account.status
                          )}`}
                        >
                          {account.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span
                          title="Optimistic concurrency 64-bit token. Increments on every debit/credit commit."
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {account.rowVersion || '0x0001'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Detail Profile */}
                          <button
                            onClick={() => setDetailAccount(account)}
                            className="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            title="Inspect complete KYC & banking details"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          {/* Ledger Entries History */}
                          <button
                            onClick={() => onViewAccountHistory(account)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Open double-entry journal entries for this account"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                            <span>Journal</span>
                          </button>

                          {/* Manage Holds */}
                          {onViewHolds && persona !== 'Compliance Auditor' && (
                            <button
                              onClick={() => onViewHolds(account)}
                              className="px-2 py-1 text-[11px] font-medium rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Inspect & Enforce Balance Holds"
                            >
                              <ShieldAlert className="w-3 h-3 text-amber-500" />
                              <span>Holds</span>
                            </button>
                          )}

                          {/* Initiate Transfer Shortcut */}
                          {onOpenTransferModalWithSource && account.status === 'Active' && persona !== 'Compliance Auditor' && (
                            <button
                              onClick={() => onOpenTransferModalWithSource(account)}
                              className="px-2 py-1 text-[11px] font-medium rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Transfer from this account"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-emerald-500" />
                              <span>Transfer</span>
                            </button>
                          )}

                          {/* System Admin: Freeze / Unfreeze with Safety Modal */}
                          {persona === 'System Admin' && (
                            <button
                              onClick={() => setAccountToToggle(account)}
                              title={account.status === 'Active' ? 'Freeze account (Blocks debits)' : 'Unfreeze account (Restores debits)'}
                              className={`p-1 rounded-md border transition-colors cursor-pointer ${
                                account.status === 'Active'
                                  ? 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300'
                                  : 'border-red-300 dark:border-red-800 text-red-500 bg-red-50/60 dark:bg-red-950/40 hover:bg-red-100'
                              }`}
                            >
                              {account.status === 'Active' ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Results Summary Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {sortedAccounts.length === 0 ? 0 : (currentPage - 1) * (pageSize || sortedAccounts.length) + 1}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {pageSize === 0 ? sortedAccounts.length : Math.min(currentPage * pageSize, sortedAccounts.length)}
            </strong>{' '}
            of <strong className="text-slate-800 dark:text-slate-200">{sortedAccounts.length}</strong> matching accounts
          </div>

          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-xs font-mono font-medium rounded-md transition cursor-pointer ${
                      currentPage === page
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Details & KYC Audit Profile Modal */}
      {detailAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{detailAccount.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(detailAccount.status)}`}>
                      {detailAccount.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Account: {detailAccount.accountNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailAccount(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Financial Liquidity Summary Card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Book Ledger Balance</span>
                  <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                    {formatCurrency(detailAccount.ledgerBalance, currency)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Available Liquid Funds</span>
                  <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(detailAccount.availableBalance, currency)}
                  </div>
                </div>
                {detailAccount.ledgerBalance > detailAccount.availableBalance && (
                  <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-amber-600 dark:text-amber-400 font-medium">
                    <span>Active Enforced Holds:</span>
                    <span className="font-mono font-bold">
                      -{formatCurrency(detailAccount.ledgerBalance - detailAccount.availableBalance, currency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Identification & Clearing Information */}
              <div className="space-y-2.5">
                <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-[10px]">
                  Clearing & Routing Specifications
                </h4>
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <span className="text-slate-400 text-[10px]">Fedwire ABA Routing</span>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {detailAccount.routingCode || '021000021'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Account Classification</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 capitalize">
                      {detailAccount.category} ({detailAccount.type})
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Legal Entity Owner</span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {detailAccount.owner || '—'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Base Currency</span>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {detailAccount.currency || currency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit & Compliance Data */}
              <div className="space-y-2.5">
                <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-[10px]">
                  Audit & Compliance Verification
                </h4>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">RowVersion Token:</span>
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                      {detailAccount.rowVersion || '0x0001'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Account Open Date:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {detailAccount.openedAt ? new Date(detailAccount.openedAt).toLocaleDateString() : 'Active Seed'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Database Engine:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      SQL Server 2022 · Invariant Enforced
                    </span>
                  </div>
                  {detailAccount.description && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 text-[10px]">Ledger Purpose Memo:</span>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                        {detailAccount.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
              <button
                onClick={() => setDetailAccount(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const acc = detailAccount;
                    setDetailAccount(null);
                    onViewAccountHistory(acc);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                  <span>View Journal</span>
                </button>

                {onOpenTransferModalWithSource && detailAccount.status === 'Active' && persona !== 'Compliance Auditor' && (
                  <button
                    onClick={() => {
                      const acc = detailAccount;
                      setDetailAccount(null);
                      onOpenTransferModalWithSource(acc);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Transfer Funds</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal for Freezing / Unfreezing Account */}
      {accountToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                accountToToggle.status === 'Active'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              }`}>
                {accountToToggle.status === 'Active' ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Unlock className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {accountToToggle.status === 'Active' ? 'Freeze Account?' : 'Unfreeze Account?'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {accountToToggle.accountNumber} · {accountToToggle.name}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Available Balance:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(accountToToggle.availableBalance, currency)}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                {accountToToggle.status === 'Active'
                  ? 'Freezing this account immediately blocks all outgoing debit transactions and wire settlements in compliance with regulatory / AML controls. Credits can still be received.'
                  : 'Unfreezing this account restores immediate debit transfer and payment capabilities.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAccountToToggle(null)}
                disabled={isTogglingStatus}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmStatusToggle}
                disabled={isTogglingStatus}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                  accountToToggle.status === 'Active'
                    ? 'bg-red-600 hover:bg-red-500 active:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                }`}
              >
                {isTogglingStatus && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {accountToToggle.status === 'Active' ? 'Confirm Freeze' : 'Confirm Unfreeze'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {onCreateAccount && (
        <CreateAccountModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          accounts={effectiveAccounts}
          currency={currency}
          persona={persona}
          onCreateAccount={async (payload) => {
            const res = await onCreateAccount(payload);
            if (res.success && payload.category) {
              setActiveTab(payload.category);
              setCurrentPage(1);
            }
            return res;
          }}
        />
      )}
    </div>
  );
};
