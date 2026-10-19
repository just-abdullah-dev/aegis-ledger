import { create } from 'zustand';
import { Currency, BankAccount } from '../types/ledger';

interface LedgerStoreState {
  currentTab: string;
  currency: Currency;
  searchQuery: string;
  accountTypeFilter: string;
  selectedAccountForHistory: BankAccount | null;
  idempotencyEnabled: boolean;
  isTransferModalOpen: boolean;
  isHoldModalOpen: boolean;
  transferInitialSourceId?: string;

  // Actions
  setCurrentTab: (tab: string) => void;
  setCurrency: (currency: Currency) => void;
  setSearchQuery: (query: string) => void;
  setAccountTypeFilter: (filter: string) => void;
  setSelectedAccountForHistory: (account: BankAccount | null) => void;
  setIdempotencyEnabled: (enabled: boolean) => void;
  setIsTransferModalOpen: (open: boolean, initialSourceId?: string) => void;
  setIsHoldModalOpen: (open: boolean) => void;
}

export const useLedgerStore = create<LedgerStoreState>((set) => ({
  currentTab: 'overview',
  currency: 'USD',
  searchQuery: '',
  accountTypeFilter: 'ALL',
  selectedAccountForHistory: null,
  idempotencyEnabled: true,
  isTransferModalOpen: false,
  isHoldModalOpen: false,
  transferInitialSourceId: undefined,

  setCurrentTab: (tab: string) => set({ currentTab: tab }),
  setCurrency: (currency: Currency) => set({ currency }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setAccountTypeFilter: (accountTypeFilter: string) => set({ accountTypeFilter }),
  setSelectedAccountForHistory: (account: BankAccount | null) =>
    set({ selectedAccountForHistory: account }),
  setIdempotencyEnabled: (idempotencyEnabled: boolean) => set({ idempotencyEnabled }),
  setIsTransferModalOpen: (open: boolean, initialSourceId?: string) =>
    set({ isTransferModalOpen: open, transferInitialSourceId: initialSourceId }),
  setIsHoldModalOpen: (open: boolean) => set({ isHoldModalOpen: open }),
}));
