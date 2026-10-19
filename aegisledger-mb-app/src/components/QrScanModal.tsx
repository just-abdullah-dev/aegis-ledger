import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AegisColors, Spacing } from '@/constants/theme';
import { X, QrCode, Sparkles, AlertCircle, Camera } from 'lucide-react-native';

interface QrScanModalProps {
  visible: boolean;
  onClose: () => void;
  onScanAccount: (accountNumber: string) => void;
}

export const QrScanModal: React.FC<QrScanModalProps> = ({
  visible,
  onClose,
  onScanAccount,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (hasScanned) return;
    setHasScanned(true);

    let accountNumber = data;
    try {
      const parsed = JSON.parse(data);
      if (parsed.aegisAccount) {
        accountNumber = parsed.aegisAccount;
      }
    } catch {
      // plain text string
    }

    onScanAccount(accountNumber);
    onClose();
    setTimeout(() => setHasScanned(false), 1000);
  };

  const handleSimulateScan = (accountNumber: string) => {
    onScanAccount(accountNumber);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={AegisColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Account QR</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Camera View or Permission Prompt */}
        <View style={styles.cameraContainer}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Camera size={44} color={AegisColors.primary400} />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionSub}>
                Enable camera access to scan AegisLedger QR codes on counterpart accounts.
              </Text>
              <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            >
              {/* Scan Reticle Overlay */}
              <View style={styles.overlay}>
                <View style={styles.scanReticle}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <Text style={styles.scanInstruction}>
                  Align QR code within the frame
                </Text>
              </View>
            </CameraView>
          )}
        </View>

        {/* Quick Testing Simulation Tray */}
        <View style={styles.simTray}>
          <View style={styles.simHeader}>
            <Sparkles size={14} color={AegisColors.primary400} />
            <Text style={styles.simTitle}>Quick Test Presets (Simulator / Sandbox):</Text>
          </View>
          <View style={styles.simButtonsRow}>
            <TouchableOpacity
              style={styles.simPill}
              onPress={() => handleSimulateScan('ACC-992011-USD')}
            >
              <Text style={styles.simPillText}>Meridian Clearing</Text>
              <Text style={styles.simPillSub}>ACC-992011-USD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simPill}
              onPress={() => handleSimulateScan('ACC-104928-USD')}
            >
              <Text style={styles.simPillText}>Escrow Vault</Text>
              <Text style={styles.simPillSub}>ACC-104928-USD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: Spacing.three,
    backgroundColor: AegisColors.navy900,
    borderBottomWidth: 1,
    borderBottomColor: AegisColors.navy800,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: AegisColors.navy800,
  },
  headerTitle: {
    color: AegisColors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: AegisColors.navy950,
  },
  permissionTitle: {
    color: AegisColors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  permissionSub: {
    color: AegisColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  grantBtn: {
    backgroundColor: AegisColors.primary500,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  grantBtnText: {
    color: AegisColors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  scanReticle: {
    width: 240,
    height: 240,
    borderRadius: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: AegisColors.primary400,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  scanInstruction: {
    color: AegisColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  simTray: {
    backgroundColor: AegisColors.navy900,
    padding: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: AegisColors.navy800,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.two,
  },
  simTitle: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  simPill: {
    flex: 1,
    backgroundColor: AegisColors.navy800,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
  },
  simPillText: {
    color: AegisColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  simPillSub: {
    color: AegisColors.primary400,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
});
