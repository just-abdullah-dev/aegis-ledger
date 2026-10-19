import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AegisColors, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import { ShieldCheck, ArrowRight, KeyRound, CheckCircle2, AlertCircle, X } from 'lucide-react-native';

interface TransferConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  senderAccountNum: string;
  senderName: string;
  receiverAccountNum: string;
  amount: number;
  currentAvailableBalance: number;
  idempotencyKey: string;
  description: string;
  currency?: string;
}

export const TransferConfirmationModal: React.FC<TransferConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading,
  senderAccountNum,
  senderName,
  receiverAccountNum,
  amount,
  currentAvailableBalance,
  idempotencyKey,
  description,
  currency = 'USD',
}) => {
  const estimatedFee = 0.0;
  const postTransferAvailable = currentAvailableBalance - amount;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <ShieldCheck size={14} color={AegisColors.primary400} />
              <Text style={styles.badgeText}>Idempotent Settlement Protocol</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isLoading} style={styles.closeBtn}>
              <X size={18} color={AegisColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Confirm Sovereign Payout</Text>
          <Text style={styles.subtitle}>
            Atomic double-entry ledger journal transfer with client-side idempotency protection.
          </Text>

          {/* Amount Display */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>TRANSFER AMOUNT</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(amount, currency)}
            </Text>
            <Text style={styles.feeLabel}>Network Settlement Fee: $0.00 (Zero Drift)</Text>
          </View>

          {/* Transfer Route */}
          <View style={styles.routeBox}>
            <View style={styles.routeEndpoint}>
              <Text style={styles.endpointLabel}>FROM ACCOUNT</Text>
              <Text style={styles.endpointName} numberOfLines={1}>{senderName}</Text>
              <Text style={styles.endpointAcc}>{senderAccountNum}</Text>
            </View>

            <View style={styles.routeArrow}>
              <ArrowRight size={18} color={AegisColors.primary400} />
            </View>

            <View style={styles.routeEndpoint}>
              <Text style={styles.endpointLabel}>TO ACCOUNT</Text>
              <Text style={styles.endpointName} numberOfLines={1}>Recipient Ledger</Text>
              <Text style={styles.endpointAcc}>{receiverAccountNum}</Text>
            </View>
          </View>

          {/* Post-Balance Estimation */}
          <View style={styles.balancePreviewRow}>
            <Text style={styles.balancePreviewLabel}>Post-Transfer Available:</Text>
            <Text style={styles.balancePreviewVal}>
              {formatCurrency(postTransferAvailable, currency)}
            </Text>
          </View>

          {/* Idempotency Key Badge */}
          <View style={styles.idempotencyPill}>
            <KeyRound size={12} color={AegisColors.textMuted} />
            <Text style={styles.idempotencyText} numberOfLines={1}>
              X-Idempotency-Key: {idempotencyKey}
            </Text>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmBtn, isLoading && styles.btnDisabled]}
            onPress={onConfirm}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={AegisColors.textPrimary} />
            ) : (
              <View style={styles.btnContent}>
                <CheckCircle2 size={18} color={AegisColors.textPrimary} />
                <Text style={styles.confirmBtnText}>Authorize & Dispatch Transfer</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: AegisColors.navy900,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  badgeText: {
    color: AegisColors.primary400,
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: AegisColors.navy800,
  },
  title: {
    color: AegisColors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: AegisColors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    marginBottom: Spacing.three,
  },
  amountBox: {
    backgroundColor: AegisColors.navy800,
    borderRadius: 16,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    marginBottom: Spacing.three,
  },
  amountLabel: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  amountValue: {
    color: AegisColors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  feeLabel: {
    color: AegisColors.emerald400,
    fontSize: 12,
    fontWeight: '600',
  },
  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AegisColors.navy800,
    borderRadius: 14,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    marginBottom: Spacing.three,
  },
  routeEndpoint: {
    flex: 1,
  },
  endpointLabel: {
    color: AegisColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  endpointName: {
    color: AegisColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  endpointAcc: {
    color: AegisColors.primary400,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  routeArrow: {
    paddingHorizontal: 8,
  },
  balancePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: Spacing.two,
  },
  balancePreviewLabel: {
    color: AegisColors.textSecondary,
    fontSize: 12,
  },
  balancePreviewVal: {
    color: AegisColors.emerald400,
    fontSize: 13,
    fontWeight: '700',
  },
  idempotencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AegisColors.navy950,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AegisColors.navy800,
    marginBottom: Spacing.four,
  },
  idempotencyText: {
    color: AegisColors.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
    flex: 1,
  },
  confirmBtn: {
    backgroundColor: AegisColors.primary500,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: AegisColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
