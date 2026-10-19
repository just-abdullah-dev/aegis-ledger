import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transfersApi } from '@/api/axiosClient';
import { TransferRequest, TransferResult } from '@/types';
import { ACCOUNT_QUERY_KEYS } from './useAccounts';

export function useTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation<TransferResult, Error, TransferRequest>({
    mutationFn: (request: TransferRequest) => transfersApi.executeTransfer(request),
    onSuccess: () => {
      // Invalidate accounts and transactions to refresh live balances across dashboard and details
      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['holds'] });
    },
  });
}
