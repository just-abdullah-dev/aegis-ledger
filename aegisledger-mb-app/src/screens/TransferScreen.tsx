import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { AegisColors, Spacing } from '@/constants/theme';
import { useAccountStore } from '@/store/accountStore';
import { useAccounts, useAccountDetails } from '@/hooks/useAccounts';
import { useTransferMutation } from '@/hooks/useTransfers';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { TransferConfirmationModal } from '@/components/TransferConfirmationModal';
import { StepUpBiometricPrompt, HIGH_VALUE_THRESHOLD } from '@/components/StepUpBiometricPrompt';
import { QrScanModal } from '@/components/QrScanModal';
import { AccountQrModal } from '@/components/AccountQrModal';
import { bankingNotifications } from '@/utils/notifications';
import { formatCurrency } from '@/utils/formatters';
import {
  Send,
  QrCode,
  ScanLine,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';

interface TransferScreenProps {
  onSuccessDone?: () => void;
}

export const TransferScreen: React.FC<TransferScreenProps> = ({ onSuccessDone }) => {
  const { selectedAccountNumber } = useAccountStore();
  const { accounts } = useAccounts();

  const currentAccountNumber = selectedAccountNumber || accounts[0]?.accountNumber || 'ACC-882190-USD';
  const { account } = useAccountDetails(currentAccountNumber);

  const [recipientAccount, setRecipientAccount] = useState('ACC-992011-USD');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('Trade Settlement Protocol Batch 84');
  const [validationError, setValidationError] = useState<string | null>(null);

  const network = useNetworkStatus();

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showStepUpModal, setShowStepUpModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showMyQr, setShowMyQr] = useState(false);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState('');

  // Transfer Mutation
  const { mutateAsync: executeTransfer, isPending, isSuccess, data: transferResult, reset } =
    useTransferMutation();

  const availableBalance = account?.availableBalance || 0;
  const parsedAmount = parseFloat(amountStr) || 0;

  // Real-time validation
  useEffect(() => {
    if (!network.isConnected) {
      setValidationError('Network offline. P2P transfers are disabled until connection restores.');
      return;
    }
    if (!amountStr) {
      setValidationError(null);
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid transfer amount greater than $0.');
    } else if (parsedAmount > availableBalance) {
      setValidationError(
        `Transfer amount ($${parsedAmount.toLocaleString()}) exceeds your Available Liquidity ($${availableBalance.toLocaleString()}).`
      );
    } else {
      setValidationError(null);
    }
  }, [amountStr, availableBalance, parsedAmount, network.isConnected]);

  const handleOpenConfirmation = () => {
    if (!network.isConnected) {
      setValidationError('Device is offline. Payouts are disabled.');
      return;
    }
    if (!recipientAccount.trim()) {
      setValidationError('Please provide a recipient account number.');
      return;
    }
    if (recipientAccount.trim() === currentAccountNumber) {
      setValidationError('Sender and recipient accounts cannot be identical.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid amount.');
      return;
    }
    if (parsedAmount > availableBalance) {
      setValidationError('Insufficient available funds.');
      return;
    }

    // Auto-generate UUID v4 idempotency key for this transfer session
    const key = uuidv4();
    setActiveIdempotencyKey(key);

    if (parsedAmount >= HIGH_VALUE_THRESHOLD) {
      setShowStepUpModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const performExecution = async () => {
    try {
      const res = await executeTransfer({
        senderAccountNumber: currentAccountNumber,
        receiverAccountNumber: recipientAccount.trim(),
        amount: parsedAmount,
        description: description.trim() || 'P2P Instant Internal Transfer',
        idempotencyKey: activeIdempotencyKey,
      });
      setShowConfirmModal(false);
      setShowStepUpModal(false);

      // Trigger real-time banking event notification
      bankingNotifications.notifyMoneyReceived(parsedAmount, account?.name || 'Aegis Core');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transfer execution failed.';
      Alert.alert('Transfer Error', msg);
    }
  };

  const handleConfirmPayout = () => {
    performExecution();
  };

  const handleStepUpSuccess = () => {
    setShowStepUpModal(false);
    performExecution();
  };

  const handleResetForNewTransfer = () => {
    reset();
    setAmountStr('');
    setDescription('Trade Settlement Protocol');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Instant P2P Transfer</Text>
              <Text style={styles.headerSub}>Client-Side Idempotency & Zero-Drift Settlement</Text>
            </View>

            <TouchableOpacity style={styles.myQrBtn} onPress={() => setShowMyQr(true)}>
              <QrCode size={18} color={AegisColors.primary400} />
              <Text style={styles.myQrBtnText}>My QR</Text>
            </TouchableOpacity>
          </View>

          {/* Success Screen Card */}
          {isSuccess && transferResult ? (
            <View style={styles.successCard}>
              <View style={styles.successBadge}>
                <CheckCircle2 size={40} color={AegisColors.emerald400} />
              </View>
              <Text style={styles.successTitle}>Transfer Settled Successfully</Text>
              <Text style={styles.successSub}>
                Transaction posted atomically to the double-entry journal.
              </Text>

              <View style={styles.successReceiptBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Reference ID:</Text>
                  <Text style={[styles.receiptVal, styles.mono]}>{transferResult.reference}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Amount Sent:</Text>
                  <Text style={[styles.receiptVal, { color: AegisColors.emerald400 }]}>
                    {formatCurrency(transferResult.amount, 'USD')}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Recipient:</Text>
                  <Text style={[styles.receiptVal, styles.mono]}>{transferResult.receiverAccountNum}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>New Available:</Text>
                  <Text style={styles.receiptVal}>
                    {formatCurrency(transferResult.newSenderAvailableBalance, 'USD')}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Idempotency Key:</Text>
                  <Text style={[styles.receiptVal, styles.mono]} numberOfLines={1}>
                    {transferResult.idempotencyKey.slice(0, 16)}...
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.newTxBtn} onPress={handleResetForNewTransfer}>
                <RefreshCw size={16} color={AegisColors.textPrimary} />
                <Text style={styles.newTxBtnText}>Initiate Another Transfer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Sender Account Card */}
              <View style={styles.senderCard}>
                <View style={styles.senderHeader}>
                  <Text style={styles.senderLabel}>SOURCE LEDGER ACCOUNT</Text>
                  <View style={styles.verifiedTag}>
                    <ShieldCheck size={12} color={AegisColors.emerald400} />
                    <Text style={styles.verifiedTagText}>Active</Text>
                  </View>
                </View>
                <Text style={styles.senderName}>{account?.name || 'Primary Liquidity & Settlement'}</Text>
                <Text style={styles.senderAccNum}>{currentAccountNumber}</Text>

                <View style={styles.availableRow}>
                  <Text style={styles.availableLabel}>Available Liquidity:</Text>
                  <Text style={styles.availableVal}>{formatCurrency(availableBalance, 'USD')}</Text>
                </View>
              </View>

              {/* Recipient Account Input with QR Scanner Button */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>RECIPIENT ACCOUNT NUMBER</Text>
                  <TouchableOpacity
                    style={styles.scanBtn}
                    onPress={() => setShowScanner(true)}
                  >
                    <ScanLine size={14} color={AegisColors.primary400} />
                    <Text style={styles.scanBtnText}>Scan QR</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={recipientAccount}
                    onChangeText={setRecipientAccount}
                    placeholder="e.g. ACC-992011-USD"
                    placeholderTextColor={AegisColors.textMuted}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>

                {/* Counterparty Quick Select Presets */}
                <View style={styles.quickPresetsRow}>
                  <Text style={styles.quickLabel}>Quick Contacts:</Text>
                  <TouchableOpacity
                    style={styles.quickPill}
                    onPress={() => setRecipientAccount('ACC-992011-USD')}
                  >
                    <Text style={styles.quickPillText}>Meridian (992011)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickPill}
                    onPress={() => setRecipientAccount('ACC-104928-USD')}
                  >
                    <Text style={styles.quickPillText}>Escrow (104928)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Transfer Amount Input */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>TRANSFER AMOUNT (USD)</Text>
                  <TouchableOpacity
                    onPress={() => setAmountStr(availableBalance.toString())}
                  >
                    <Text style={styles.maxBtnText}>MAX AVAILABLE</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputWrapper, styles.amountInputWrapper]}>
                  <Text style={styles.dollarSymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    value={amountStr}
                    onChangeText={setAmountStr}
                    placeholder="0.00"
                    placeholderTextColor={AegisColors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DESCRIPTION / LEDGER MEMO</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Reference memo for audit journal"
                    placeholderTextColor={AegisColors.textMuted}
                  />
                </View>
              </View>

              {/* Validation Warning Notice */}
              {validationError && (
                <View style={styles.warningBanner}>
                  <AlertCircle size={16} color={AegisColors.rose500} />
                  <Text style={styles.warningText}>{validationError}</Text>
                </View>
              )}

              {/* Review Transfer CTA */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!amountStr || !!validationError || isPending) && styles.submitBtnDisabled,
                ]}
                onPress={handleOpenConfirmation}
                disabled={!amountStr || !!validationError || isPending}
                activeOpacity={0.85}
              >
                <View style={styles.submitBtnContent}>
                  <Send size={18} color={AegisColors.textPrimary} />
                  <Text style={styles.submitBtnText}>Review & Authorize Payout</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <TransferConfirmationModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPayout}
        isLoading={isPending}
        senderAccountNum={currentAccountNumber}
        senderName={account?.name || 'Primary Liquidity'}
        receiverAccountNum={recipientAccount}
        amount={parsedAmount}
        currentAvailableBalance={availableBalance}
        idempotencyKey={activeIdempotencyKey}
        description={description}
      />

      {/* QR Scanner Modal */}
      <QrScanModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanAccount={(scannedAccount) => setRecipientAccount(scannedAccount)}
      />

      {/* My Account QR Modal */}
      <AccountQrModal
        visible={showMyQr}
        onClose={() => setShowMyQr(false)}
        accountNumber={currentAccountNumber}
        accountName={account?.name || 'Apex Financial Capital LLC'}
      />

      {/* Step-Up High-Value Biometric Authorization Prompt */}
      <StepUpBiometricPrompt
        visible={showStepUpModal}
        amount={parsedAmount}
        onSuccess={handleStepUpSuccess}
        onCancel={() => setShowStepUpModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AegisColors.navy950,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AegisColors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    color: AegisColors.textSecondary,
    marginTop: 2,
  },
  myQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AegisColors.navy800,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
  },
  myQrBtnText: {
    color: AegisColors.primary400,
    fontSize: 12,
    fontWeight: '700',
  },
  senderCard: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 18,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    marginBottom: Spacing.four,
  },
  senderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderLabel: {
    color: AegisColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AegisColors.emeraldBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedTagText: {
    color: AegisColors.emerald400,
    fontSize: 10,
    fontWeight: '700',
  },
  senderName: {
    color: AegisColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  senderAccNum: {
    color: AegisColors.primary400,
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  availableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: AegisColors.navy800,
  },
  availableLabel: {
    color: AegisColors.textSecondary,
    fontSize: 12,
  },
  availableVal: {
    color: AegisColors.emerald400,
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanBtnText: {
    color: AegisColors.primary400,
    fontSize: 12,
    fontWeight: '700',
  },
  maxBtnText: {
    color: AegisColors.emerald400,
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrapper: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    paddingHorizontal: Spacing.three,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSymbol: {
    color: AegisColors.emerald400,
    fontSize: 22,
    fontWeight: '800',
    marginRight: 6,
  },
  input: {
    color: AegisColors.textPrimary,
    fontSize: 14,
    paddingVertical: 12,
    flex: 1,
  },
  amountInput: {
    fontSize: 22,
    fontWeight: '800',
    color: AegisColors.emerald400,
  },
  quickPresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  quickLabel: {
    color: AegisColors.textMuted,
    fontSize: 11,
  },
  quickPill: {
    backgroundColor: AegisColors.navy800,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
  },
  quickPillText: {
    color: AegisColors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AegisColors.roseBg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  warningText: {
    color: AegisColors.rose500,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: AegisColors.primary500,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: AegisColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  successCard: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 20,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AegisColors.emeraldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  successTitle: {
    color: AegisColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  successSub: {
    color: AegisColors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.four,
  },
  successReceiptBox: {
    backgroundColor: AegisColors.navy800,
    borderRadius: 14,
    padding: Spacing.three,
    width: '100%',
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    marginBottom: Spacing.four,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  receiptLabel: {
    color: AegisColors.textMuted,
    fontSize: 12,
  },
  receiptVal: {
    color: AegisColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  mono: {
    fontFamily: 'monospace',
    color: AegisColors.primary400,
  },
  newTxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AegisColors.primary500,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newTxBtnText: {
    color: AegisColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
