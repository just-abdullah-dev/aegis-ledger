import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AegisColors, Spacing } from '@/constants/theme';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { formatCompactCurrency } from '@/utils/formatters';

interface InvariantBannerProps {
  ledgerBalance: number;
  availableBalance: number;
  activeHolds: number;
  currency?: string;
  isVerified?: boolean;
}

export const InvariantBanner: React.FC<InvariantBannerProps> = ({
  ledgerBalance,
  availableBalance,
  activeHolds,
  currency = 'USD',
  isVerified = true,
}) => {
  return (
    <View style={[styles.container, !isVerified && styles.containerError]}>
      <View style={styles.headerRow}>
        <View style={styles.statusPill}>
          {isVerified ? (
            <CheckCircle2 size={16} color={AegisColors.emerald400} />
          ) : (
            <AlertTriangle size={16} color={AegisColors.rose500} />
          )}
          <Text style={[styles.statusTitle, !isVerified && styles.statusTitleError]}>
            Double-Entry Invariant Verified
          </Text>
        </View>

        <View style={styles.zeroDriftTag}>
          <ShieldCheck size={12} color={AegisColors.textMuted} />
          <Text style={styles.zeroDriftText}>Zero Drift</Text>
        </View>
      </View>

      <Text style={styles.formulaEquation}>
        Ledger Balance - Active Holds = Available Balance
      </Text>

      {/* Arithmetic Preview Pill */}
      <View style={styles.arithmeticPill}>
        <Text style={styles.arithmeticText}>
          {formatCompactCurrency(ledgerBalance, currency)}
          <Text style={styles.operator}> - </Text>
          {formatCompactCurrency(activeHolds, currency)}
          <Text style={styles.operator}> = </Text>
          <Text style={styles.resultText}>
            {formatCompactCurrency(availableBalance, currency)}
          </Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    padding: Spacing.three,
    marginVertical: Spacing.two,
  },
  containerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTitle: {
    color: AegisColors.emerald400,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusTitleError: {
    color: AegisColors.rose500,
  },
  zeroDriftTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zeroDriftText: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  formulaEquation: {
    color: AegisColors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 6,
  },
  arithmeticPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
  },
  arithmeticText: {
    color: AegisColors.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  operator: {
    color: AegisColors.textMuted,
  },
  resultText: {
    color: AegisColors.emerald400,
    fontWeight: '700',
  },
});
