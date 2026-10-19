import { create } from 'zustand';
import { UserPersona } from '../types/ledger';
import { authApi } from '../lib/api-client';

export type UserRole = 'BankTeller' | 'ComplianceAuditor' | 'SystemAdmin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  persona: UserPersona;
  role: UserRole;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  initialize: () => void;
  login: (emailOrId: string, password?: string, persona?: UserPersona) => Promise<boolean>;
  logout: () => void;
  setPersona: (persona: UserPersona) => void;
}

const STORAGE_KEY = 'aegis_auth_session';

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  refreshToken: null,

  initialize: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        set({
          isAuthenticated: true,
          user: parsed.user,
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
          isLoading: false,
        });
        return;
      }
    } catch {
      // Ignore
    }

    // Default authenticated mock session for seamless developer experience
    const defaultUser: AuthUser = {
      id: 'usr-compliance-01',
      name: 'Elena Rostova',
      email: 'elena.rostova@aegisledger.bank',
      persona: 'Compliance Auditor',
      role: 'ComplianceAuditor',
    };
    const defaultSession = {
      isAuthenticated: true,
      user: defaultUser,
      accessToken: 'ey.default.aegis.token',
      refreshToken: 'ey.default.refresh.token',
      isLoading: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSession));
    set(defaultSession);
  },

  login: async (emailOrId: string, password = 'password', persona = 'Compliance Auditor') => {
    set({ isLoading: true });
    try {
      const res = await authApi.login({ emailOrId, password, persona });
      const authUser: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        persona: res.user.persona,
        role: res.user.role,
      };

      const sessionData = {
        user: authUser,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));

      set({
        isAuthenticated: true,
        user: authUser,
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        isLoading: false,
      });
      return true;
    } catch (err) {
      console.warn('[useAuthStore] Login failed:', err);
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  },

  setPersona: (persona: UserPersona) => {
    const { user, accessToken, refreshToken } = get();
    if (!user) return;

    let role: UserRole = 'ComplianceAuditor';
    if (persona === 'Bank Teller') role = 'BankTeller';
    if (persona === 'System Admin') role = 'SystemAdmin';

    const updatedUser: AuthUser = {
      ...user,
      persona,
      role,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: updatedUser, accessToken, refreshToken })
    );

    set({ user: updatedUser });
  },
}));
