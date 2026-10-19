import { create } from 'zustand';
import { User } from '@/types';
import { secureStorage, KEYS } from '@/utils/secureStorage';
import { authApi } from '@/api/axiosClient';
import { biometricService } from '@/utils/biometrics';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isBiometricLocked: boolean;
  isBiometricEnabled: boolean;
  isMockMode: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (accountIdOrEmail: string, password: string, enableBiometric?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  unlockBiometric: () => Promise<boolean>;
  lockBiometric: () => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  setMockMode: (enabled: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  isBiometricLocked: false,
  isBiometricEnabled: false,
  isMockMode: false,
  user: null,
  accessToken: null,
  refreshToken: null,

  initialize: async () => {
    try {
      set({ isLoading: true });
      const [accessToken, refreshToken, biometricEnabledStr, mockMode] = await Promise.all([
        secureStorage.getAccessToken(),
        secureStorage.getRefreshToken(),
        secureStorage.getItem(KEYS.BIOMETRIC_ENABLED),
        secureStorage.getMockMode(),
      ]);

      const isBiometricEnabled = biometricEnabledStr === 'true';

      if (accessToken) {
        const userDataStr = await secureStorage.getItem(KEYS.USER_DATA);
        const user = userDataStr ? JSON.parse(userDataStr) : null;

        set({
          isAuthenticated: true,
          accessToken,
          refreshToken,
          user,
          isBiometricEnabled,
          // If biometric is enabled on stored session, start locked until biometric check
          isBiometricLocked: isBiometricEnabled,
          isMockMode: mockMode,
          isLoading: false,
        });
      } else {
        set({
          isAuthenticated: false,
          isBiometricEnabled,
          isMockMode: mockMode,
          isLoading: false,
        });
      }
    } catch (err) {
      console.warn('[AuthStore] Initialization failed:', err);
      set({ isLoading: false });
    }
  },

  login: async (accountIdOrEmail: string, password: string, enableBiometric = false) => {
    try {
      set({ isLoading: true });
      const response = await authApi.login({ accountIdOrEmail, password });

      const { user, tokens } = response;

      await secureStorage.setTokens(tokens.accessToken, tokens.refreshToken);
      await secureStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));

      if (enableBiometric) {
        await secureStorage.setBiometricEnabled(true);
      }

      set({
        isAuthenticated: true,
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isBiometricEnabled: enableBiometric,
        isBiometricLocked: false,
        isLoading: false,
      });

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Invalid credentials';
      set({ isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  logout: async () => {
    try {
      await secureStorage.clearTokens();
    } catch (err) {
      console.warn('[AuthStore] Logout error:', err);
    }
    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      isBiometricLocked: false,
    });
  },

  unlockBiometric: async () => {
    const { isBiometricEnabled } = get();
    if (!isBiometricEnabled) {
      set({ isBiometricLocked: false });
      return true;
    }

    const result = await biometricService.authenticate('Unlock AegisLedger Wallet');
    if (result.success) {
      set({ isBiometricLocked: false });
      return true;
    }
    return false;
  },

  lockBiometric: () => {
    const { isBiometricEnabled, isAuthenticated } = get();
    if (isAuthenticated && isBiometricEnabled) {
      set({ isBiometricLocked: true });
    }
  },

  setBiometricEnabled: async (enabled: boolean) => {
    await secureStorage.setBiometricEnabled(enabled);
    set({ isBiometricEnabled: enabled });
  },

  setMockMode: async (enabled: boolean) => {
    await secureStorage.setMockMode(enabled);
    set({ isMockMode: enabled });
  },
}));
