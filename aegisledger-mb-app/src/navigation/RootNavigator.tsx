import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  AppState,
  AppStateStatus,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/accountStore';
import { LoginScreen } from '@/screens/LoginScreen';
import { BiometricAuthScreen } from '@/screens/BiometricAuthScreen';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { TransferScreen } from '@/screens/TransferScreen';
import { HoldsScreen } from '@/screens/HoldsScreen';
import { TransactionHistoryScreen } from '@/screens/TransactionHistoryScreen';
import { AccountDetailsScreen } from '@/screens/AccountDetailsScreen';
import { AegisColors, Spacing } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { OfflineBanner } from '@/components/OfflineBanner';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import {
  LayoutDashboard,
  Send,
  Lock,
  History,
  Shield,
} from 'lucide-react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount) => failureCount < 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 30,
    },
  },
});

type ActiveTab = 'dashboard' | 'transfer' | 'holds' | 'history' | 'audit';

export const RootNavigatorContent: React.FC = () => {
  const {
    isAuthenticated,
    isLoading,
    isBiometricLocked,
    isBiometricEnabled,
    initialize,
    lockBiometric,
  } = useAuthStore();

  const { selectedAccountNumber } = useAccountStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [auditAccountNumber, setAuditAccountNumber] = useState<string>('ACC-882190-USD');

  const network = useNetworkStatus();
  const appState = useRef(AppState.currentState);

  // Initialize stored session on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Request & register push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync().catch(() => {});
    }
  }, [isAuthenticated]);

  // AppState listener: require biometric challenge when resuming from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current &&
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (isAuthenticated && isBiometricEnabled) {
          lockBiometric();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, isBiometricEnabled, lockBiometric]);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogo}>
          <Shield size={48} color={AegisColors.primary400} />
        </View>
        <ActivityIndicator size="large" color={AegisColors.emerald400} style={styles.spinner} />
      </View>
    );
  }

  // 1. Not Authenticated -> Show Login
  if (!isAuthenticated) {
    return <LoginScreen onSuccess={() => setActiveTab('dashboard')} />;
  }

  // 2. Biometric Protected & Locked -> Show Biometric Challenge Screen
  if (isBiometricLocked) {
    return <BiometricAuthScreen />;
  }

  // 3. Authenticated & Unlocked -> App Tab Screens with Sovereign Bottom Navigation Bar
  return (
    <View style={styles.appContainer}>
      <OfflineBanner isOffline={!network.isConnected} />
      <View style={styles.screenContainer}>
        {activeTab === 'dashboard' && (
          <DashboardScreen
            onNavigateTransfer={() => setActiveTab('transfer')}
            onNavigateHolds={() => setActiveTab('holds')}
            onNavigateDetails={(accountNum) => {
              setAuditAccountNumber(accountNum);
              setActiveTab('audit');
            }}
          />
        )}

        {activeTab === 'transfer' && (
          <TransferScreen onSuccessDone={() => setActiveTab('history')} />
        )}

        {activeTab === 'holds' && (
          <HoldsScreen onBack={() => setActiveTab('dashboard')} />
        )}

        {activeTab === 'history' && <TransactionHistoryScreen />}

        {activeTab === 'audit' && (
          <AccountDetailsScreen
            accountNumber={auditAccountNumber || selectedAccountNumber}
            onBack={() => setActiveTab('dashboard')}
          />
        )}
      </View>

      {/* Sovereign Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('dashboard')}
          activeOpacity={0.7}
        >
          <LayoutDashboard
            size={20}
            color={activeTab === 'dashboard' ? AegisColors.primary400 : AegisColors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'dashboard' && styles.navLabelActive,
            ]}
          >
            Vault Core
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('transfer')}
          activeOpacity={0.7}
        >
          <Send
            size={20}
            color={activeTab === 'transfer' ? AegisColors.primary400 : AegisColors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'transfer' && styles.navLabelActive,
            ]}
          >
            Transfer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('holds')}
          activeOpacity={0.7}
        >
          <Lock
            size={20}
            color={activeTab === 'holds' ? AegisColors.amber400 : AegisColors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'holds' && [styles.navLabelActive, { color: AegisColors.amber400 }],
            ]}
          >
            Holds
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <History
            size={20}
            color={activeTab === 'history' ? AegisColors.primary400 : AegisColors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'history' && styles.navLabelActive,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('audit')}
          activeOpacity={0.7}
        >
          <Shield
            size={20}
            color={activeTab === 'audit' ? AegisColors.emerald400 : AegisColors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'audit' && [styles.navLabelActive, { color: AegisColors.emerald400 }],
            ]}
          >
            Audit
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const RootNavigator: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigatorContent />
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: AegisColors.navy950,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AegisColors.navy800,
    borderWidth: 2,
    borderColor: AegisColors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 24,
  },
  appContainer: {
    flex: 1,
    backgroundColor: AegisColors.navy950,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: AegisColors.navy900,
    borderTopWidth: 1,
    borderTopColor: AegisColors.navy800,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    height: Platform.OS === 'ios' ? 78 : 64,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navLabel: {
    fontSize: 10,
    color: AegisColors.textMuted,
    fontWeight: '600',
  },
  navLabelActive: {
    color: AegisColors.primary400,
    fontWeight: '700',
  },
});
