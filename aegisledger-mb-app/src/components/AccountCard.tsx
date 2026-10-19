import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AegisColors, Spacing } from '@/constants/theme';
import { AccountDto } from '@/types';
import { maskAccountNumber, formatCurrency } from '@/utils/formatters';
import { Check, Shield, Landmark } from 'lucide-react-native';

interface AccountCardProps {
  account: AccountDto;
  isSelected: boolean;
  isPrivacyMode: boolean;
  onSelect: (accountNumber: string) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isSelected,
  isPrivacyMode,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onSelect(account.accountNumber)}
      style={[styles.container, isSelected && styles.containerSelected]}
    >
      <View style={styles.topRow}>
        <View style={styles.nameContainer}>
          <View style={styles.iconCircle}>
            {account.type === 'Escrow' ? (
              <Shield size={14} color={AegisColors.amber400} />
            ) : (
              <Landmark size={14} color={AegisColors.primary400} />
            )}
          </View>
          <View>
            <Text style={styles.accountName} numberOfLines={1}>
              {account.name}
            </Text>
            <Text style={styles.accountNumber}>
              {maskAccountNumber(account.accountNumber)}
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.selectedBadge}>
            <Check size={12} color={AegisColors.textPrimary} />
          </View>
        )}
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{account.type.toUpperCase()}</Text>
        </View>

        <Text style={styles.balanceText}>
          {formatCurrency(account.availableBalance, account.currency, isPrivacyMode)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AegisColors.navy800,
    borderRadius: 16,
    padding: Spacing.three,
    borderWidth: 1.5,
    borderColor: AegisColors.navy700,
    minWidth: 240,
    marginRight: Spacing.two,
  },
  containerSelected: {
    borderColor: AegisColors.primary400,
    backgroundColor: '#1E293B',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AegisColors.navy900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    color: AegisColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 160,
  },
  accountNumber: {
    color: AegisColors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  selectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: AegisColors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: AegisColors.navy900,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
  },
  typeBadgeText: {
    color: AegisColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceText: {
    color: AegisColors.emerald400,
    fontSize: 14,
    fontWeight: '700',
  },
});
