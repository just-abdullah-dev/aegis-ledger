import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Share,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AegisColors, Spacing } from '@/constants/theme';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccountStore } from '@/store/accountStore';
import { TransactionDto } from '@/types';
import { formatCurrency, formatTimestamp } from '@/utils/formatters';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Share2,
  X,
  ShieldCheck,
  FileText,
  Clock,
  Hash,
  Layers,
} from 'lucide-react-native';

export const TransactionHistoryScreen: React.FC = () => {
  const { selectedAccountNumber, isPrivacyMode } = useAccountStore();
  const { transactions, isLoading, refetch } = useTransactions(selectedAccountNumber);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [selectedTx, setSelectedTx] = useState<TransactionDto | null>(null);

  const filteredTransactions = transactions.filter((tx) => {
    const isDebit = tx.senderAccountNum === selectedAccountNumber;
    const isCredit = tx.receiverAccountNum === selectedAccountNumber;

    // Filter by type
    if (filterType === 'debit' && !isDebit) return false;
    if (filterType === 'credit' && !isCredit) return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.reference.toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q) ||
      tx.senderAccountNum.toLowerCase().includes(q) ||
      tx.receiverAccountNum.toLowerCase().includes(q)
    );
  });

  const handleShareReceipt = async (tx: TransactionDto) => {
    try {
      const receiptText = `================================================
AEGISLEDGER SOVEREIGN TRANSACTION RECEIPT
Reference: ${tx.reference}
Timestamp: ${formatTimestamp(tx.timestamp)}
Status: ${tx.status}
Idempotency Key: ${tx.idempotencyKey}
------------------------------------------------
Sender Account:   ${tx.senderAccountNum}
Receiver Account: ${tx.receiverAccountNum}
Amount:           ${formatCurrency(tx.amount, 'USD')}
Memo:             ${tx.description}
------------------------------------------------
DOUBLE-ENTRY JOURNAL AUDIT:
${tx.journalLines
  .map(
    (jl) =>
      `[${jl.entryType}] Account: ${jl.accountNumber} | Amount: ${formatCurrency(
        jl.amount,
        'USD'
      )} | Post-Balance: ${formatCurrency(jl.postBalance, 'USD')}`
  )
  .join('\n')}
================================================
Zero-Drift Atomic Consensus Verified.`;

      await Share.share({
        message: receiptText,
        title: `Receipt-${tx.reference}`,
      });
    } catch (err) {
      console.warn('Error sharing digital receipt:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Audit Transactions</Text>
          <Text style={styles.headerSub}>Posted Double-Entry Journal Entries</Text>
        </View>
        <View style={styles.shieldBadge}>
          <ShieldCheck size={14} color={AegisColors.emerald400} />
          <Text style={styles.shieldBadgeText}>Immutable</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Search size={16} color={AegisColors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reference, account, or memo..."
            placeholderTextColor={AegisColors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={AegisColors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>
              All Entries
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'debit' && styles.filterChipActive]}
            onPress={() => setFilterType('debit')}
          >
            <ArrowUpRight size={12} color={filterType === 'debit' ? AegisColors.textPrimary : AegisColors.rose500} />
            <Text style={[styles.filterText, filterType === 'debit' && styles.filterTextActive]}>
              Debits (DR)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'credit' && styles.filterChipActive]}
            onPress={() => setFilterType('credit')}
          >
            <ArrowDownLeft size={12} color={filterType === 'credit' ? AegisColors.textPrimary : AegisColors.emerald400} />
            <Text style={[styles.filterText, filterType === 'credit' && styles.filterTextActive]}>
              Credits (CR)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refetch(); }} tintColor={AegisColors.primary400} />}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={32} color={AegisColors.textMuted} />
            <Text style={styles.emptyTitle}>No Matching Transactions</Text>
            <Text style={styles.emptySub}>
              No journal entries found matching current filter or search criteria.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => {
            const isDebit = tx.senderAccountNum === selectedAccountNumber;
            return (
              <TouchableOpacity
                key={tx.id}
                style={styles.txCard}
                activeOpacity={0.75}
                onPress={() => setSelectedTx(tx)}
              >
                <View style={styles.txLeft}>
                  <View
                    style={[
                      styles.txIconCircle,
                      isDebit ? styles.iconDebit : styles.iconCredit,
                    ]}
                  >
                    {isDebit ? (
                      <ArrowUpRight size={16} color={AegisColors.rose500} />
                    ) : (
                      <ArrowDownLeft size={16} color={AegisColors.emerald400} />
                    )}
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text style={styles.txReference}>
                      Ref: {tx.reference} • {formatTimestamp(tx.timestamp)}
                    </Text>
                  </View>
                </View>

                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      isDebit ? styles.amountDebit : styles.amountCredit,
                    ]}
                  >
                    {isDebit ? '-' : '+'}
                    {formatCurrency(tx.amount, 'USD', isPrivacyMode)}
                  </Text>
                  <View style={styles.txStatusBadge}>
                    <Text style={styles.txStatusText}>{tx.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Transaction Detail & Journal Breakdown Drawer / Modal */}
      {selectedTx && (
        <Modal
          visible={!!selectedTx}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedTx(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalBadge}>
                  <Hash size={12} color={AegisColors.primary400} />
                  <Text style={styles.modalBadgeText}>{selectedTx.reference}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedTx(null)}
                  style={styles.closeModalBtn}
                >
                  <X size={18} color={AegisColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalTitle}>{selectedTx.description}</Text>
              <Text style={styles.modalTimestamp}>
                Posted: {formatTimestamp(selectedTx.timestamp)}
              </Text>

              {/* Amount Box */}
              <View style={styles.modalAmountBox}>
                <Text style={styles.modalAmountLabel}>SETTLED AMOUNT</Text>
                <Text style={styles.modalAmountVal}>
                  {formatCurrency(selectedTx.amount, 'USD', isPrivacyMode)}
                </Text>
                <Text style={styles.modalIdemp} numberOfLines={1}>
                  Idempotency Key: {selectedTx.idempotencyKey}
                </Text>
              </View>

              {/* Double-Entry Journal Breakdown */}
              <View style={styles.journalSection}>
                <View style={styles.journalHeader}>
                  <Layers size={14} color={AegisColors.emerald400} />
                  <Text style={styles.journalTitle}>Atomic Journal Legs (DR = CR)</Text>
                </View>

                {selectedTx.journalLines.map((jl) => (
                  <View key={jl.id} style={styles.journalRow}>
                    <View
                      style={[
                        styles.entryTypePill,
                        jl.entryType === 'DEBIT' ? styles.pillDebit : styles.pillCredit,
                      ]}
                    >
                      <Text style={styles.entryTypeText}>{jl.entryType}</Text>
                    </View>
                    <View style={styles.journalAccountInfo}>
                      <Text style={styles.journalAccName} numberOfLines={1}>{jl.accountName}</Text>
                      <Text style={styles.journalAccNum}>{jl.accountNumber}</Text>
                    </View>
                    <View style={styles.journalAmountInfo}>
                      <Text style={styles.journalAmount}>
                        {formatCurrency(jl.amount, 'USD', isPrivacyMode)}
                      </Text>
                      <Text style={styles.journalPostBal}>
                        Bal: {formatCurrency(jl.postBalance, 'USD', isPrivacyMode)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Share Digital Receipt CTA */}
              <TouchableOpacity
                style={styles.shareReceiptBtn}
                onPress={() => handleShareReceipt(selectedTx)}
              >
                <Share2 size={16} color={AegisColors.textPrimary} />
                <Text style={styles.shareReceiptBtnText}>Export Digital Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: AegisColors.navy800,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AegisColors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    color: AegisColors.textSecondary,
    marginTop: 2,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AegisColors.emeraldBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  shieldBadgeText: {
    color: AegisColors.emerald400,
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AegisColors.navy900,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: AegisColors.navy800,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: AegisColors.textPrimary,
    fontSize: 13,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.two,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AegisColors.navy900,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AegisColors.navy800,
  },
  filterChipActive: {
    backgroundColor: AegisColors.navy800,
    borderColor: AegisColors.primary500,
  },
  filterText: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  filterTextActive: {
    color: AegisColors.textPrimary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  emptyContainer: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 16,
    padding: Spacing.five,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AegisColors.navy800,
    marginTop: Spacing.four,
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
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: AegisColors.navy900,
    borderRadius: 14,
    padding: Spacing.three,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: AegisColors.navy800,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  txIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDebit: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  iconCredit: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    color: AegisColors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  txReference: {
    color: AegisColors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  amountDebit: {
    color: AegisColors.rose500,
  },
  amountCredit: {
    color: AegisColors.emerald400,
  },
  txStatusBadge: {
    backgroundColor: AegisColors.navy800,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  txStatusText: {
    color: AegisColors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AegisColors.navy900,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalBadgeText: {
    color: AegisColors.primary400,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  closeModalBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: AegisColors.navy800,
  },
  modalTitle: {
    color: AegisColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: Spacing.two,
  },
  modalTimestamp: {
    color: AegisColors.textMuted,
    fontSize: 11,
    marginTop: 2,
    marginBottom: Spacing.three,
  },
  modalAmountBox: {
    backgroundColor: AegisColors.navy800,
    borderRadius: 14,
    padding: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    marginBottom: Spacing.three,
  },
  modalAmountLabel: {
    color: AegisColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  modalAmountVal: {
    color: AegisColors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 4,
  },
  modalIdemp: {
    color: AegisColors.textMuted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  journalSection: {
    backgroundColor: AegisColors.navy800,
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  journalTitle: {
    color: AegisColors.emerald400,
    fontSize: 11,
    fontWeight: '700',
  },
  journalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: AegisColors.navy700,
  },
  entryTypePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  pillDebit: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  pillCredit: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  entryTypeText: {
    color: AegisColors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
  },
  journalAccountInfo: {
    flex: 1,
  },
  journalAccName: {
    color: AegisColors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  journalAccNum: {
    color: AegisColors.primary400,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  journalAmountInfo: {
    alignItems: 'flex-end',
  },
  journalAmount: {
    color: AegisColors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  journalPostBal: {
    color: AegisColors.textMuted,
    fontSize: 9,
  },
  shareReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AegisColors.primary500,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareReceiptBtnText: {
    color: AegisColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
