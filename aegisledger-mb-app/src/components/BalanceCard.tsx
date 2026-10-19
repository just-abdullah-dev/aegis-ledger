import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AegisColors, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import { ShieldCheck, Eye, EyeOff, Lock, ArrowUpRight, TrendingUp } from 'lucide-react-native';

interface BalanceCardProps {
  ledgerBalance: number;
  availableBalance: number;
  activeHolds: number;
  currency?: string;
  isPrivacyMode: boolean;
  accountType?: string;
  onTogglePrivacy: () => void;
  onViewHolds?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  ledgerBalance,
  availableBalance,
  activeHolds,
  currency = 'USD',
  isPrivacyMode,
  accountType = 'Primary Treasury',
  onTogglePrivacy,
  onViewHolds,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.shieldPill}>
            <ShieldCheck size={14} color={AegisColors.emerald400} />
            <Text style={styles.shieldPillText}>Double-Entry Core</Text>
          </View>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{accountType}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onTogglePrivacy}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.eyeButton}
          accessibilityLabel="Toggle privacy mode"
        >
          {isPrivacyMode ? (
            <EyeOff size={18} color={AegisColors.textSecondary} />
          ) : (
            <Eye size={18} color={AegisColors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Book Ledger Balance (Large Primary Metric) */}
      <View style={styles.primaryMetricContainer}>
        <Text style={styles.metricLabel}>BOOK LEDGER BALANCE</Text>
        <Text style={styles.primaryAmountText}>
          {formatCurrency(ledgerBalance, currency, isPrivacyMode)}
        </Text>
        <Text style={styles.metricSubtext}>
          Total booked funds settled in primary ledger account
        </Text>
      </View>

      {/* Split Row: Available Liquidity vs Active Holds */}
      <View style={styles.splitGrid}>
        {/* Available Liquidity (Highlighted Green) */}
        <View style={[styles.subCard, styles.availableCard]}>
          <View style={styles.subCardHeader}>
            <TrendingUp size={14} color={AegisColors.emerald400} />
            <Text style={styles.availableLabel}>AVAILABLE LIQUIDITY</Text>
          </View>
          <Text style={styles.availableAmountText}>
            {formatCurrency(availableBalance, currency, isPrivacyMode)}
          </Text>
          <Text style={styles.availableHelpText}>Immediate transfer capacity</Text>
        </View>

        {/* Active Holds Ring-Fenced (Amber / Warning) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onViewHolds}
          style={[styles.subCard, styles.holdsCard]}
        >
          <View style={styles.subCardHeader}>
            <Lock size={14} color={AegisColors.amber400} />
            <Text style={styles.holdsLabel}>ACTIVE HOLDS</Text>
            {onViewHolds && <ArrowUpRight size={12} color={AegisColors.amber400} />}
          </View>
          <Text style={styles.holdsAmountText}>
            {formatCurrency(activeHolds, currency, isPrivacyMode)}
          </Text>
          <Text style={styles.holdsHelpText}>Ring-fenced collateral / risk</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AegisColors.navy800,
    borderRadius: 20,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginVertical: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  shieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AegisColors.emeraldBg,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  shieldPillText: {
    color: AegisColors.emerald400,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  typePill: {
    backgroundColor: AegisColors.navy700,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typePillText: {
    color: AegisColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  eyeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: AegisColors.navy900,
  },
  primaryMetricContainer: {
    marginBottom: Spacing.four,
  },
  metricLabel: {
    color: AegisColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  primaryAmountText: {
    color: AegisColors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  metricSubtext: {
    color: AegisColors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  splitGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  subCard: {
    flex: 1,
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
  },
  availableCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  availableLabel: {
    color: AegisColors.emerald400,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  availableAmountText: {
    color: AegisColors.emerald400,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  availableHelpText: {
    color: AegisColors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  holdsCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  holdsLabel: {
    color: AegisColors.amber400,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  holdsAmountText: {
    color: AegisColors.amber400,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  holdsHelpText: {
    color: AegisColors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
});
