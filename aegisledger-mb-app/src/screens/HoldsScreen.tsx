import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AegisColors, Spacing } from '@/constants/theme';
import { useAccountDetails, useAccounts } from '@/hooks/useAccounts';
import { useAccountStore } from '@/store/accountStore';
import { HoldItemCard } from '@/components/HoldItemCard';
import { formatCurrency, formatTimestamp } from '@/utils/formatters';
import { Lock, Info, History, ShieldAlert, CheckCircle, ArrowLeft } from 'lucide-react-native';

interface HoldsScreenProps {
  onBack?: () => void;
}

export const HoldsScreen: React.FC<HoldsScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const { selectedAccountNumber } = useAccountStore();
  const { accounts } = useAccounts();

  const currentAccountNumber = selectedAccountNumber || accounts[0]?.accountNumber || 'ACC-882190-USD';
  const { holds, activeHoldsSum, isRefetching, refetch } = useAccountDetails(currentAccountNumber);
  const { isPrivacyMode } = useAccountStore();

  const activeHolds = holds.filter((h) => h.status === 'Active');
  const historicalHolds = holds.filter((h) => h.status === 'Released' || h.status === 'Captured');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <ArrowLeft size={18} color={AegisColors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIcon}>
            <Lock size={18} color={AegisColors.amber400} />
          </View>
        )}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Holds & Escrow Reserves</Text>
          <Text style={styles.headerSub}>{currentAccountNumber}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={AegisColors.amber400}
          />
        }
      >
        {/* Informational Callout Banner */}
        <View style={styles.infoBanner}>
          <Info size={16} color={AegisColors.primary400} style={styles.infoIcon} />
          <Text style={styles.infoBannerText}>
            Held funds are temporarily deducted from <Text style={styles.bold}>Available Liquidity</Text> while
            remaining on your <Text style={styles.bold}>Book Ledger Balance</Text> pending clearance.
          </Text>
        </View>

        {/* Ring-Fenced Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryLabel}>TOTAL RING-FENCED FUNDS</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(activeHoldsSum, 'USD', isPrivacyMode)}
            </Text>
          </View>
          <View style={styles.summaryPill}>
            <ShieldAlert size={14} color={AegisColors.amber400} />
            <Text style={styles.summaryPillText}>{activeHolds.length} Active</Text>
          </View>
        </View>

        {/* Segmented Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
            onPress={() => setActiveTab('active')}
          >
            <Lock size={14} color={activeTab === 'active' ? AegisColors.amber400 : AegisColors.textMuted} />
            <Text
              style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActive]}
            >
              Active Holds ({activeHolds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
            onPress={() => setActiveTab('history')}
          >
            <History
              size={14}
              color={activeTab === 'history' ? AegisColors.primary400 : AegisColors.textMuted}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'history' && styles.tabButtonTextActive,
              ]}
            >
              Hold History ({historicalHolds.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Active Holds */}
        {activeTab === 'active' && (
          <View style={styles.listSection}>
            {activeHolds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CheckCircle size={32} color={AegisColors.emerald400} />
                <Text style={styles.emptyTitle}>Zero Active Encumbrances</Text>
                <Text style={styles.emptySub}>
                  All ledger funds in this account are 100% liquid and available for payout.
                </Text>
              </View>
            ) : (
              activeHolds.map((hold) => (
                <HoldItemCard key={hold.id} hold={hold} isPrivacyMode={isPrivacyMode} />
              ))
            )}
          </View>
        )}

        {/* Tab 2: Hold History (Released vs Captured) */}
        {activeTab === 'history' && (
          <View style={styles.listSection}>
            {historicalHolds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <History size={32} color={AegisColors.textMuted} />
                <Text style={styles.emptyTitle}>No Historical Hold Records</Text>
                <Text style={styles.emptySub}>
                  Released and captured holds for this account will appear here.
                </Text>
              </View>
            ) : (
              historicalHolds.map((hold) => (
                <View key={hold.id} style={styles.historyCard}>
                  <View style={styles.historyTopRow}>
                    <View>
                      <Text style={styles.historyReason}>{hold.reason}</Text>
                      <Text style={styles.historyId}>Hold ID: {hold.id}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        hold.status === 'Released'
                          ? styles.statusReleased
                          : styles.statusCaptured,
                      ]}
                    >
                      <Text style={styles.statusPillText}>{hold.status}</Text>
                    </View>
                  </View>

                  <View style={styles.historyBottomRow}>
                    <Text style={styles.historyAmount}>
                      {formatCurrency(hold.amount, 'USD', isPrivacyMode)}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatTimestamp(hold.createdAt)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: AegisColors.navy800,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: AegisColors.navy800,
    marginRight: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: AegisColors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: AegisColors.primary400,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.six,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoBannerText: {
    color: AegisColors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  bold: {
    color: AegisColors.textPrimary,
    fontWeight: '700',
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AegisColors.navy900,
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    marginBottom: Spacing.four,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryLabel: {
    color: AegisColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  summaryAmount: {
    color: AegisColors.amber400,
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  summaryPillText: {
    color: AegisColors.amber400,
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: AegisColors.navy900,
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: AegisColors.navy800,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: AegisColors.navy800,
  },
  tabButtonText: {
    color: AegisColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: AegisColors.textPrimary,
    fontWeight: '700',
  },
  listSection: {
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 16,
    padding: Spacing.five,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AegisColors.navy800,
    marginTop: Spacing.two,
  },
  emptyTitle: {
    color: AegisColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    color: AegisColors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  historyCard: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: AegisColors.navy800,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyReason: {
    color: AegisColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  historyId: {
    color: AegisColors.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusReleased: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusCaptured: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },
  statusPillText: {
    color: AegisColors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  historyBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: AegisColors.navy800,
  },
  historyAmount: {
    color: AegisColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  historyDate: {
    color: AegisColors.textMuted,
    fontSize: 11,
  },
});
