import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AegisColors, Spacing } from '@/constants/theme';
import { TransactionHoldDto } from '@/types';
import { formatCurrency, formatCountdown, formatTimestamp } from '@/utils/formatters';
import { Lock, Clock, ShieldAlert } from 'lucide-react-native';

interface HoldItemCardProps {
  hold: TransactionHoldDto;
  isPrivacyMode: boolean;
}

export const HoldItemCard: React.FC<HoldItemCardProps> = ({ hold, isPrivacyMode }) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.reasonRow}>
          <View style={styles.iconContainer}>
            <Lock size={14} color={AegisColors.amber400} />
          </View>
          <View>
            <Text style={styles.reasonText}>{hold.reason}</Text>
            <Text style={styles.subtext}>Hold ID: {hold.id}</Text>
          </View>
        </View>

        <Text style={styles.amountText}>
          {formatCurrency(hold.amount, 'USD', isPrivacyMode)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.metaItem}>
          <Clock size={12} color={AegisColors.amber400} />
          <Text style={styles.expiryText}>
            {formatCountdown(hold.expiresAtEpochMs)}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <ShieldAlert size={12} color={AegisColors.textMuted} />
          <Text style={styles.createdAtText}>
            Placed: {formatTimestamp(hold.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AegisColors.navy800,
    borderRadius: 14,
    padding: Spacing.three,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonText: {
    color: AegisColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  subtext: {
    color: AegisColors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  amountText: {
    color: AegisColors.amber400,
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: AegisColors.navy700,
    marginVertical: Spacing.two,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    color: AegisColors.amber400,
    fontSize: 11,
    fontWeight: '600',
  },
  createdAtText: {
    color: AegisColors.textMuted,
    fontSize: 10,
  },
});
