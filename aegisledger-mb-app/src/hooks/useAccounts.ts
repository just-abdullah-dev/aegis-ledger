import { useQuery } from '@tanstack/react-query';
import { accountsApi } from '@/api/axiosClient';
import { AccountDto, TransactionHoldDto, SolvencyHealthDto } from '@/types';

export const ACCOUNT_QUERY_KEYS = {
  all: ['accounts'] as const,
  detail: (accountNumber: string) => ['accounts', accountNumber] as const,
  holds: (accountNumber?: string) => ['holds', accountNumber] as const,
  health: ['solvency-health'] as const,
};

export function useAccounts() {
  const query = useQuery<AccountDto[]>({
    queryKey: ACCOUNT_QUERY_KEYS.all,
    queryFn: () => accountsApi.getAccounts(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Auto refresh every 60s
  });

  const accounts = query.data ?? [];

  const metrics = accounts.reduce(
    (acc, account) => {
      acc.totalLedger += account.ledgerBalance;
      acc.totalAvailable += account.availableBalance;
      return acc;
    },
    { totalLedger: 0, totalAvailable: 0 }
  );

  const totalHolds = metrics.totalLedger - metrics.totalAvailable;
  const isInvariantVerified = Math.abs(metrics.totalLedger - totalHolds - metrics.totalAvailable) < 0.001;

  return {
    ...query,
    accounts,
    totalLedger: metrics.totalLedger,
    totalAvailable: metrics.totalAvailable,
    totalHolds,
    isInvariantVerified,
  };
}

export function useAccountDetails(accountNumber: string) {
  const accountsQuery = useAccounts();
  const account = accountsQuery.accounts.find((a) => a.accountNumber === accountNumber) ?? null;

  const holdsQuery = useQuery<TransactionHoldDto[]>({
    queryKey: ACCOUNT_QUERY_KEYS.holds(accountNumber),
    queryFn: () => accountsApi.getAccountHolds(accountNumber),
    staleTime: 1000 * 30,
  });

  const activeHoldsSum = (holdsQuery.data ?? [])
    .filter((h) => h.status === 'Active')
    .reduce((sum, h) => sum + h.amount, 0);

  const expectedAvailable = account ? account.ledgerBalance - activeHoldsSum : 0;
  const invariantCheckPassed = account
    ? Math.abs(account.ledgerBalance - activeHoldsSum - account.availableBalance) < 0.01
    : true;

  return {
    account,
    holds: holdsQuery.data ?? [],
    activeHoldsSum,
    expectedAvailable,
    invariantCheckPassed,
    isLoading: accountsQuery.isLoading || holdsQuery.isLoading,
    isRefetching: accountsQuery.isRefetching || holdsQuery.isRefetching,
    refetch: async () => {
      await Promise.all([accountsQuery.refetch(), holdsQuery.refetch()]);
    },
  };
}

export function useSolvencyHealth() {
  return useQuery<SolvencyHealthDto>({
    queryKey: ACCOUNT_QUERY_KEYS.health,
    queryFn: () => accountsApi.getSolvencyHealth(),
    staleTime: 1000 * 15,
  });
}
