import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Layers, 
  Lock, 
  Unlock, 
  ExternalLink, 
  Building2, 
  ShieldCheck, 
  ShieldAlert,
  ArrowRightLeft,
  FileSpreadsheet,
  Coins
} from 'lucide-react';
import { BankAccount, AccountCategory, Currency, UserPersona } from '../types/ledger';
import { formatCurrency } from '../utils/formatters';
import { useAccountsQuery } from '../hooks/useLedgerQueries';

interface AccountsViewProps {
  accounts: BankAccount[];
  currency: Currency;
  persona: UserPersona;
  onToggleStatus: (accountId: string) => void;
  onViewAccountHistory: (account: BankAccount) => void;
  onViewHolds?: (account: BankAccount) => void;
  onOpenTransferModalWithSource?: (sourceAccount: BankAccount) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  currency,
  persona,
  onToggleStatus,
  onViewAccountHistory,
  onViewHolds,
  onOpenTransferModalWithSource,
}) => {
  const { data: serverAccounts } = useAccountsQuery();
  const effectiveAccounts = accounts.length > 0 ? accounts : (serverAccounts ?? []);

  const [activeTab, setActiveTab] = useState<AccountCategory>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredAccounts = effectiveAccounts.filter((acc) => {
    if (acc.category !== activeTab) return false;
    if (typeFilter !== 'ALL' && acc.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        acc.accountNumber.toLowerCase().includes(q) ||
        acc.name.toLowerCase().includes(q) ||
        acc.owner.toLowerCase().includes(q) ||
        acc.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalLedger = filteredAccounts.reduce((sum, a) => sum + a.ledgerBalance, 0);
  const totalAvailable = filteredAccounts.reduce((sum, a) => sum + a.availableBalance, 0);
  const totalHeld = totalLedger - totalAvailable;

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header and Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Accounts & Chart of Accounts (COA)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Enterprise general ledger chart, customer deposit liabilities, and optimistic RowVersion tokens.
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('customer');
              setTypeFilter('ALL');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'customer'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Customer Accounts ({accounts.filter((a) => a.category === 'customer').length})
          </button>
          <button
            onClick={() => {
              setActiveTab('system');
              setTypeFilter('ALL');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'system'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            System Ledgers / COA ({accounts.filter((a) => a.category === 'system').length})
          </button>
        </div>
      </div>

      {/* Summary KPI Strip for Current Tab */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Book Ledger Balance</span>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
            {formatCurrency(totalLedger, currency)}
          </div>
          <span className="text-[11px] text-slate-400">Sum of all active account ledger balances</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Available Liquidity</span>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalAvailable, currency)}
          </div>
          <span className="text-[11px] text-slate-400">Liquid immediately for debit settlement</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Security Holds Enforced</span>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalHeld, currency)}
          </div>
          <span className="text-[11px] text-slate-400">Book minus available hold difference</span>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search account #, legal name, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Account Types</option>
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
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Account Number</th>
                <th className="py-2.5 px-3">Account Name / Owner</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Ledger Balance</th>
                <th className="py-2.5 px-3 text-right">Available Balance</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 font-mono">RowVersion Token</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No accounts found matching filter query.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => {
                  const hasHolds = account.ledgerBalance > account.availableBalance;
                  const holdAmount = account.ledgerBalance - account.availableBalance;

                  return (
                    <tr
                      key={account.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {account.accountNumber}
                      </td>
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {account.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {account.owner} · Routing: {account.routingCode}
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
                          <div className="text-[10px] text-amber-600 dark:text-amber-400">
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
                          {account.rowVersion}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewAccountHistory(account)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                            <span>Ledger Entries</span>
                          </button>

                          {onViewHolds && (
                            <button
                              onClick={() => onViewHolds(account)}
                              className="px-2 py-1 text-[11px] font-medium rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Inspect & Manage Holds"
                            >
                              <ShieldAlert className="w-3 h-3 text-amber-500" />
                              <span>Holds</span>
                            </button>
                          )}

                          {onOpenTransferModalWithSource && account.status === 'Active' && (
                            <button
                              onClick={() => onOpenTransferModalWithSource(account)}
                              className="px-2 py-1 text-[11px] font-medium rounded-md border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Transfer from this account"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-emerald-500" />
                              <span>Transfer</span>
                            </button>
                          )}

                          {persona !== 'Bank Teller' && (
                            <button
                              onClick={() => onToggleStatus(account.id)}
                              title={account.status === 'Active' ? 'Freeze account' : 'Unfreeze account'}
                              className={`p-1 rounded-md border transition-colors ${
                                account.status === 'Active'
                                  ? 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500'
                                  : 'border-red-300 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40'
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
      </div>
    </div>
  );
};
