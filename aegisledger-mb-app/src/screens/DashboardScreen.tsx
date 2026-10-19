import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AegisColors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/accountStore';
import { useAccounts, useAccountDetails, useSolvencyHealth } from '@/hooks/useAccounts';
import { BalanceCard } from '@/components/BalanceCard';
import { InvariantBanner } from '@/components/InvariantBanner';
import { AccountCard } from '@/components/AccountCard';
import {
  LogOut,
  Send,
  Lock,
  FileText,
  Activity,
  CheckCircle,
  Server,
  User as UserIcon,
} from 'lucide-react-native';

interface DashboardScreenProps {
  onNavigateDetails?: (accountNumber: string) => void;
  onNavigateHolds?: () => void;
  onNavigateTransfer?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateDetails,
  onNavigateHolds,
  onNavigateTransfer,
}) => {
  const { user, logout, isMockMode, setMockMode } = useAuthStore();
  const { selectedAccountNumber, setSelectedAccount, isPrivacyMode, togglePrivacyMode } =
    useAccountStore();

  const {
    accounts,
    isLoading: accountsLoading,
    isRefetching: accountsRefetching,
    refetch: refetchAccounts,
  } = useAccounts();

  const currentAccountNumber = selectedAccountNumber || accounts[0]?.accountNumber || 'ACC-882190-USD';
  const {
    account,
    activeHoldsSum,
    invariantCheckPassed,
    refetch: refetchDetails,
  } = useAccountDetails(currentAccountNumber);

  const { data: healthData } = useSolvencyHealth();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAccounts(), refetchDetails()]);
    setRefreshing(false);
  };

  const activeAccount = account || accounts.find((a) => a.accountNumber === currentAccountNumber) || accounts[0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.userInfo}>
          <View style={styles.avatarCircle}>
            <UserIcon size={16} color={AegisColors.primary400} />
          </View>
          <View>
            <Text style={styles.userNameText}>{user?.name || 'Marcus Vance'}</Text>
            <View style={styles.userTierRow}>
              <Text style={styles.userTierBadge}>{user?.tier || 'Commercial'} Banking</Text>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Solvent</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActionRow}>
          <TouchableOpacity
            style={styles.modeIndicator}
            onPress={() => setMockMode(!isMockMode)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Server size={14} color={isMockMode ? AegisColors.amber400 : AegisColors.emerald400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={logout}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LogOut size={16} color={AegisColors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || accountsRefetching}
            onRefresh={onRefresh}
            tintColor={AegisColors.emerald400}
            colors={[AegisColors.emerald400, AegisColors.primary400]}
          />
        }
      >
        {/* Core Solvency Heartbeat Pill */}
        <View style={styles.heartbeatRow}>
          <View style={styles.heartbeatPill}>
            <Activity size={12} color={AegisColors.emerald400} />
            <Text style={styles.heartbeatText}>
              Core Ledger Solvency:{' '}
              <Text style={styles.heartbeatAccent}>
                {healthData?.solvencyInvariant || 'SUM(Debits) == SUM(Credits)'}
              </Text>
            </Text>
          </View>
          <View style={styles.syncTag}>
            <CheckCircle size={11} color={AegisColors.emerald400} />
            <Text style={styles.syncTagText}>0 Drift</Text>
          </View>
        </View>

        {/* Account Selector Horizontal Carousel */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>SELECT ACCOUNT</Text>
          <Text style={styles.sectionSubtitle}>{accounts.length} active ledgers</Text>
        </View>

        {accountsLoading && accounts.length === 0 ? (
          <ActivityIndicator color={AegisColors.primary400} style={{ marginVertical: 20 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountCarousel}
          >
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id || acc.accountNumber}
                account={acc}
                isSelected={acc.accountNumber === currentAccountNumber}
                isPrivacyMode={isPrivacyMode}
                onSelect={(accNum) => setSelectedAccount(accNum)}
              />
            ))}
          </ScrollView>
        )}

        {/* Primary Balance Card (Book, Available, Holds) */}
        {activeAccount && (
          <BalanceCard
            ledgerBalance={activeAccount.ledgerBalance}
            availableBalance={activeAccount.availableBalance}
            activeHolds={activeHoldsSum}
            currency={activeAccount.currency}
            isPrivacyMode={isPrivacyMode}
            accountType={`${activeAccount.type} (${activeAccount.accountNumber})`}
            onTogglePrivacy={togglePrivacyMode}
            onViewHolds={() => onNavigateHolds?.()}
          />
        )}

        {/* Double-Entry Invariant Banner */}
        {activeAccount && (
          <InvariantBanner
            ledgerBalance={activeAccount.ledgerBalance}
            availableBalance={activeAccount.availableBalance}
            activeHolds={activeHoldsSum}
            currency={activeAccount.currency}
            isVerified={invariantCheckPassed}
          />
        )}

        {/* Quick Enterprise Action Shortcuts */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>ENTERPRISE WORKFLOWS</Text>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigateTransfer?.()}
          >
            <View style={[styles.actionIconContainer, styles.actionTransfer]}>
              <Send size={18} color={AegisColors.primary400} />
            </View>
            <Text style={styles.actionTitle}>P2P Transfer</Text>
            <Text style={styles.actionDesc}>Idempotent settlement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigateHolds?.()}
          >
            <View style={[styles.actionIconContainer, styles.actionHolds]}>
              <Lock size={18} color={AegisColors.amber400} />
            </View>
            <Text style={styles.actionTitle}>Active Holds</Text>
            <Text style={styles.actionDesc}>Ring-fenced funds</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onNavigateDetails?.(currentAccountNumber)}
          >
            <View style={[styles.actionIconContainer, styles.actionDetails]}>
              <FileText size={18} color={AegisColors.emerald400} />
            </View>
            <Text style={styles.actionTitle}>Audit Ledger</Text>
            <Text style={styles.actionDesc}>RowVersion & BIC</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AegisColors.navy950,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: AegisColors.navy800,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AegisColors.navy800,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userNameText: {
    color: AegisColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  userTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  userTierBadge: {
    color: AegisColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: AegisColors.emerald400,
  },
  statusText: {
    color: AegisColors.emerald400,
    fontSize: 11,
    fontWeight: '600',
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeIndicator: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: AegisColors.navy900,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
  },
  logoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: AegisColors.navy900,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  heartbeatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  heartbeatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AegisColors.navy900,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AegisColors.navy800,
  },
  heartbeatText: {
    color: AegisColors.textMuted,
    fontSize: 11,
  },
  heartbeatAccent: {
    color: AegisColors.emerald400,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  syncTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncTagText: {
    color: AegisColors.emerald400,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  sectionSubtitle: {
    color: AegisColors.textMuted,
    fontSize: 11,
  },
  accountCarousel: {
    paddingVertical: 4,
    marginBottom: Spacing.two,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    backgroundColor: AegisColors.navy900,
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: AegisColors.navy800,
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTransfer: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  actionHolds: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  actionDetails: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  actionTitle: {
    color: AegisColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  actionDesc: {
    color: AegisColors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
});
