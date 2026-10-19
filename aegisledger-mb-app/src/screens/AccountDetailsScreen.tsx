import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AegisColors, Spacing } from '@/constants/theme';
import { useAccountDetails } from '@/hooks/useAccounts';
import { useAccountStore } from '@/store/accountStore';
import { HoldItemCard } from '@/components/HoldItemCard';
import { formatCurrency, formatTimestamp } from '@/utils/formatters';
import { ArrowLeft, Shield, Hash, Calendar, Building, Lock } from 'lucide-react-native';

interface AccountDetailsScreenProps {
  accountNumber: string;
  onBack: () => void;
}

export const AccountDetailsScreen: React.FC<AccountDetailsScreenProps> = ({
  accountNumber,
  onBack,
}) => {
  const { account, holds, activeHoldsSum, isLoading } = useAccountDetails(accountNumber);
  const { isPrivacyMode } = useAccountStore();

  if (isLoading || !account) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AegisColors.primary400} />
          <Text style={styles.loadingText}>Fetching ledger audit trail...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color={AegisColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Ledger Audit</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Identity Card */}
        <View style={styles.mainCard}>
          <View style={styles.typeBadgeRow}>
            <View style={styles.badgePill}>
              <Shield size={12} color={AegisColors.emerald400} />
              <Text style={styles.badgeText}>{account.type.toUpperCase()}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                account.status === 'Active' ? styles.statusActive : styles.statusFrozen,
              ]}
            >
              <Text style={styles.statusBadgeText}>{account.status}</Text>
            </View>
          </View>

          <Text style={styles.accountName}>{account.name}</Text>
          <Text style={styles.accountNumText}>{account.accountNumber}</Text>
          <Text style={styles.ownerText}>Owner: {account.owner}</Text>

          {/* Balance Summary Row */}
          <View style={styles.balanceGrid}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>BOOK LEDGER</Text>
              <Text style={styles.balanceVal}>
                {formatCurrency(account.ledgerBalance, account.currency, isPrivacyMode)}
              </Text>
            </View>

            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>AVAILABLE LIQUIDITY</Text>
              <Text style={[styles.balanceVal, { color: AegisColors.emerald400 }]}>
                {formatCurrency(account.availableBalance, account.currency, isPrivacyMode)}
              </Text>
            </View>
          </View>
        </View>

        {/* Ledger Metadata Details */}
        <View style={styles.metaCard}>
          <Text style={styles.metaSectionTitle}>METADATA & SETTLEMENT SPECS</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaIcon}>
              <Building size={14} color={AegisColors.textSecondary} />
            </View>
            <Text style={styles.metaLabel}>Routing Code (FedWire):</Text>
            <Text style={styles.metaValue}>{account.routingCode || '021000021'}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaIcon}>
              <Hash size={14} color={AegisColors.textSecondary} />
            </View>
            <Text style={styles.metaLabel}>RowVersion ETag:</Text>
            <Text style={[styles.metaValue, styles.mono]}>{account.rowVersion}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaIcon}>
              <Calendar size={14} color={AegisColors.textSecondary} />
            </View>
            <Text style={styles.metaLabel}>Opened Date:</Text>
            <Text style={styles.metaValue}>{formatTimestamp(account.openedAt)}</Text>
          </View>
        </View>

        {/* Active Holds Section */}
        <View style={styles.holdsHeaderRow}>
          <View style={styles.holdsHeaderLeft}>
            <Lock size={16} color={AegisColors.amber400} />
            <Text style={styles.holdsHeaderTitle}>Active Ring-Fenced Holds</Text>
          </View>
          <Text style={styles.holdsTotalText}>
            Total: {formatCurrency(activeHoldsSum, account.currency, isPrivacyMode)}
          </Text>
        </View>

        {holds.length === 0 ? (
          <View style={styles.emptyHoldsContainer}>
            <Text style={styles.emptyHoldsText}>No active funds currently held or restricted.</Text>
          </View>
        ) : (
          holds.map((h) => <HoldItemCard key={h.id} hold={h} isPrivacyMode={isPrivacyMode} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AegisColors.navy950,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: AegisColors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: AegisColors.navy800,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: AegisColors.navy800,
  },
  headerTitle: {
    color: AegisColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.six,
  },
  mainCard: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 18,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    marginBottom: Spacing.three,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AegisColors.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: AegisColors.emerald400,
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusFrozen: {
    backgroundColor: AegisColors.roseBg,
  },
  statusBadgeText: {
    color: AegisColors.emerald400,
    fontSize: 11,
    fontWeight: '600',
  },
  accountName: {
    color: AegisColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  accountNumText: {
    color: AegisColors.primary400,
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  ownerText: {
    color: AegisColors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  balanceGrid: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: AegisColors.navy800,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    color: AegisColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  balanceVal: {
    color: AegisColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  metaCard: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: AegisColors.navy800,
    marginBottom: Spacing.three,
  },
  metaSectionTitle: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metaIcon: {
    width: 22,
    alignItems: 'center',
  },
  metaLabel: {
    color: AegisColors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  metaValue: {
    color: AegisColors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  mono: {
    fontFamily: 'monospace',
    color: AegisColors.primary400,
  },
  holdsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  holdsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  holdsHeaderTitle: {
    color: AegisColors.amber400,
    fontSize: 13,
    fontWeight: '700',
  },
  holdsTotalText: {
    color: AegisColors.amber400,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyHoldsContainer: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 12,
    padding: Spacing.four,
    alignItems: 'center',
  },
  emptyHoldsText: {
    color: AegisColors.textMuted,
    fontSize: 12,
  },
});
