import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AegisColors, Spacing } from '@/constants/theme';
import { X, Share2, Copy, ShieldCheck } from 'lucide-react-native';

interface AccountQrModalProps {
  visible: boolean;
  onClose: () => void;
  accountNumber: string;
  accountName: string;
}

export const AccountQrModal: React.FC<AccountQrModalProps> = ({
  visible,
  onClose,
  accountNumber,
  accountName,
}) => {
  const qrPayload = JSON.stringify({
    aegisAccount: accountNumber,
    name: accountName,
    protocol: 'aegis-p2p-v1',
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `AegisLedger Deposit Account: ${accountNumber}\nHolder: ${accountName}\nFedWire Routing: 021000021`,
      });
    } catch (err) {
      console.warn('Error sharing account QR:', err);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <ShieldCheck size={14} color={AegisColors.emerald400} />
              <Text style={styles.headerBadgeText}>Verified Ledger Identity</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={AegisColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Account QR Code</Text>
          <Text style={styles.subtitle}>
            Scan with AegisLedger mobile wallet to initiate instant zero-fee settlement
          </Text>

          {/* QR Code Container */}
          <View style={styles.qrContainer}>
            <QRCode
              value={qrPayload}
              size={180}
              color={AegisColors.navy950}
              backgroundColor="#FFFFFF"
            />
          </View>

          {/* Account Details Box */}
          <View style={styles.accountBox}>
            <Text style={styles.nameText}>{accountName}</Text>
            <Text style={styles.accNumText}>{accountNumber}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Share2 size={16} color={AegisColors.textPrimary} />
              <Text style={styles.shareBtnText}>Share Account Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: AegisColors.navy900,
    borderRadius: 24,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.three,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AegisColors.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  headerBadgeText: {
    color: AegisColors.emerald400,
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: AegisColors.navy800,
  },
  title: {
    color: AegisColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: AegisColors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.four,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    marginBottom: Spacing.four,
  },
  accountBox: {
    backgroundColor: AegisColors.navy800,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  nameText: {
    color: AegisColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  accNumText: {
    color: AegisColors.primary400,
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginTop: 2,
  },
  actionsRow: {
    width: '100%',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AegisColors.primary500,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
  },
  shareBtnText: {
    color: AegisColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
