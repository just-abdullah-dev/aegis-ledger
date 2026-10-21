import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { 
  useAccountsQuery, 
  useTransactionsQuery, 
  useHoldsQuery 
} from '../hooks/useLedgerQueries';
import { proxy, useProxyRouter } from '../lib/proxy';
import { CustomerHeader } from './customer/CustomerHeader';
import { CustomerWalletDashboard } from './customer/CustomerWalletDashboard';
import { CustomerTransferView } from './customer/CustomerTransferView';
import { CustomerHoldsView } from './customer/CustomerHoldsView';
import { CustomerTransactionsView } from './customer/CustomerTransactionsView';
import { CustomerReceiveView } from './customer/CustomerReceiveView';

export const CustomerPortalView: React.FC = () => {
  const { currentPath } = useProxyRouter();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Queries
  const { data: accounts, refetch: refetchAccounts } = useAccountsQuery();
  const { data: transactions, refetch: refetchTransactions } = useTransactionsQuery();
  const { data: holds, refetch: refetchHolds } = useHoldsQuery();

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchAccounts(),
      refetchTransactions(),
      refetchHolds(),
    ]);
  };

  // Derive active tab from URL path
  const getTabFromPath = (path: string): string => {
    if (path.includes('/transfer')) return 'transfer';
    if (path.includes('/holds')) return 'holds';
    if (path.includes('/transactions')) return 'transactions';
    if (path.includes('/receive')) return 'receive';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<string>(() => getTabFromPath(currentPath));

  useEffect(() => {
    setActiveTab(getTabFromPath(currentPath));
  }, [currentPath]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNavigateTab = (tab: string, path: string) => {
    setActiveTab(tab);
    proxy.navigate(path);
  };

  // Filter accounts for customer
  const allAccs = accounts || [];
  const customerAccounts = allAccs.filter((a) => a.category === 'customer');
  const displayAccounts = customerAccounts.length > 0 ? customerAccounts : allAccs.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header */}
      <CustomerHeader
        currentTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isOnline={isOnline}
      />

      {/* Main View Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <CustomerWalletDashboard
            accounts={displayAccounts}
            transactions={transactions || []}
            holds={holds || []}
            onNavigateTab={handleNavigateTab}
            onRefreshData={handleRefreshAll}
          />
        )}

        {activeTab === 'transfer' && (
          <CustomerTransferView
            accounts={displayAccounts}
            allAccounts={allAccs}
            onTransferSuccess={handleRefreshAll}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {activeTab === 'holds' && (
          <CustomerHoldsView
            holds={holds || []}
            accounts={displayAccounts}
            onRefreshData={handleRefreshAll}
          />
        )}

        {activeTab === 'transactions' && (
          <CustomerTransactionsView
            transactions={transactions || []}
            accounts={displayAccounts}
          />
        )}

        {activeTab === 'receive' && (
          <CustomerReceiveView
            accounts={displayAccounts}
          />
        )}
      </main>
    </div>
  );
};
