import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, transactionsApi, holdsApi, reportsApi, reconciliationApi, auditApi } from '../lib/api-client';
import { BankAccount, Transaction, TransactionHold, HoldReason, EODBatchRecord, AuditLogEntry } from '../types/ledger';

export const LEDGER_QUERY_KEYS = {
  accounts: ['accounts'] as const,
  summary: ['ledger-summary'] as const,
  health: ['ledger-health'] as const,
  transactions: ['transactions'] as const,
  holds: (accountId?: string) => ['holds', accountId || 'all'] as const,
};

export function useAccountsQuery() {
  return useQuery<BankAccount[]>({
    queryKey: LEDGER_QUERY_KEYS.accounts,
    queryFn: () => accountsApi.getAccounts(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useLedgerSummaryQuery() {
  return useQuery({
    queryKey: LEDGER_QUERY_KEYS.summary,
    queryFn: () => accountsApi.getLedgerSummary(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useHealthQuery() {
  return useQuery({
    queryKey: LEDGER_QUERY_KEYS.health,
    queryFn: () => accountsApi.getHealth(),
    staleTime: 1000 * 15,
  });
}

export function useTransactionsQuery() {
  return useQuery<Transaction[]>({
    queryKey: LEDGER_QUERY_KEYS.transactions,
    queryFn: () => transactionsApi.getTransactions(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 45,
  });
}

export function useHoldsQuery(accountId?: string) {
  return useQuery<TransactionHold[]>({
    queryKey: LEDGER_QUERY_KEYS.holds(accountId),
    queryFn: () => holdsApi.getHolds(accountId),
    staleTime: 1000 * 30,
  });
}

export function useTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      sourceAccountId: string;
      targetAccountId: string;
      amount: number;
      description: string;
      idempotencyKey?: string;
    }) => transactionsApi.postTransfer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.accounts });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.transactions });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.health });
    },
  });
}

export function useApplyHoldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      accountId: string;
      amount: number;
      reason: HoldReason;
      durationHours: number;
    }) => holdsApi.applyHold(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holds'] });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.accounts });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.summary });
    },
  });
}

export function useReleaseHoldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ holdId, accountId }: { holdId: string; accountId?: string }) =>
      holdsApi.releaseHold(holdId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holds'] });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.accounts });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.summary });
    },
  });
}

export function useCaptureHoldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ holdId, accountId }: { holdId: string; accountId?: string }) =>
      holdsApi.captureHold(holdId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holds'] });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.accounts });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.transactions });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.summary });
    },
  });
}

export function useTrialBalanceExportMutation() {
  return useMutation({
    mutationFn: () => reportsApi.downloadTrialBalanceCsv(),
  });
}

export function useReconciliationBatchesQuery() {
  return useQuery<EODBatchRecord[]>({
    queryKey: ['reconciliation-batches'],
    queryFn: () => reconciliationApi.getBatches(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export function useTriggerEODMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reconciliationApi.triggerManualEOD(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-batches'] });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.health });
      queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}

export function useAuditLogsQuery(correlationId?: string, status?: string) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ['audit-logs', correlationId || 'all', status || 'all'],
    queryFn: () => auditApi.getAuditLogs(correlationId, status),
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30,
  });
}
