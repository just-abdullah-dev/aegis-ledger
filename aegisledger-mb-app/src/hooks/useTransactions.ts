import { useQuery } from '@tanstack/react-query';
import { transactionsApi } from '@/api/axiosClient';
import { TransactionDto } from '@/types';

export function useTransactions(accountNumber?: string) {
  const query = useQuery<TransactionDto[]>({
    queryKey: ['transactions', accountNumber],
    queryFn: () => transactionsApi.getTransactions(accountNumber),
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 45,
  });

  return {
    ...query,
    transactions: query.data ?? [],
  };
}
