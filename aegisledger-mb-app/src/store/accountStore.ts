import { create } from 'zustand';
import { Currency } from '@/types';

interface AccountStoreState {
  selectedAccountNumber: string;
  displayCurrency: Currency;
  isPrivacyMode: boolean; // Hide/show balances (fintech stealth toggle)

  setSelectedAccount: (accountNumber: string) => void;
  setDisplayCurrency: (currency: Currency) => void;
  togglePrivacyMode: () => void;
}

export const useAccountStore = create<AccountStoreState>((set) => ({
  selectedAccountNumber: 'ACC-882190-USD',
  displayCurrency: 'USD',
  isPrivacyMode: false,

  setSelectedAccount: (accountNumber: string) => set({ selectedAccountNumber: accountNumber }),
  setDisplayCurrency: (currency: Currency) => set({ displayCurrency: currency }),
  togglePrivacyMode: () => set((state) => ({ isPrivacyMode: !state.isPrivacyMode })),
}));
