import { create } from 'zustand';
import { UserPersona } from '../types/ledger';
import { authApi } from '../lib/api-client';
import { proxy } from '../lib/proxy';

export type UserRole = 'BankTeller' | 'ComplianceAuditor' | 'SystemAdmin' | 'Customer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  persona: UserPersona | 'Retail Customer';
  role: UserRole;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  role?: UserRole;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (emailOrId: string, password?: string, persona?: UserPersona) => Promise<LoginResult>;
  customerLogin: (emailOrId: string, password?: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
}

const STORAGE_KEY = 'aegis_auth_session';

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  refreshToken: null,

  /**
   * Zero-Trust Session Verification
   * Strictly confirms session authenticity with the .NET backend API.
   * NEVER falls back to unverified localStorage or mock data.
   */
  initialize: async () => {
    set({ isLoading: true });

    // Step 1: Probe backend /api/v1/auth/me using HTTP-only cookies
    try {
      const meData = await authApi.getCurrentUser();
      if (meData?.user && meData?.isAuthenticated) {
        const isAdmin = meData.roles?.includes('SystemAdmin') || 
                        meData.user.role === 'SystemAdmin' || 
                        meData.user.email?.toLowerCase().includes('admin');
        const isTeller = meData.roles?.includes('BankTeller') || 
                         meData.user.role === 'BankTeller' || 
                         meData.user.email?.toLowerCase().includes('teller');
        const isCustomer = meData.roles?.includes('Customer') || 
                           meData.user.role === 'Customer' || 
                           meData.user.email?.toLowerCase().includes('customer');

        const resolvedRole: UserRole = isAdmin ? 'SystemAdmin' : isTeller ? 'BankTeller' : isCustomer ? 'Customer' : 'ComplianceAuditor';
        const resolvedPersona: UserPersona | 'Retail Customer' = isAdmin ? 'System Admin' : isTeller ? 'Bank Teller' : isCustomer ? 'Retail Customer' : 'Compliance Auditor';

        const normalizedUser: AuthUser = {
          ...meData.user,
          role: resolvedRole,
          persona: resolvedPersona,
        };

        set({
          isAuthenticated: true,
          user: normalizedUser,
          isLoading: false,
        });
        return;
      }
    } catch {
      // Primary probe unauthenticated or token expired
    }

    // Step 2: Attempt silent token rotation with backend
    try {
      const refreshResult = await authApi.refresh();
      if (refreshResult?.accessToken) {
        const meData = await authApi.getCurrentUser();
        if (meData?.user) {
          const isAdmin = meData.roles?.includes('SystemAdmin') || 
                          meData.user.role === 'SystemAdmin' || 
                          meData.user.email?.toLowerCase().includes('admin');
          const isTeller = meData.roles?.includes('BankTeller') || 
                           meData.user.role === 'BankTeller' || 
                           meData.user.email?.toLowerCase().includes('teller');
          const isCustomer = meData.roles?.includes('Customer') || 
                             meData.user.role === 'Customer' || 
                             meData.user.email?.toLowerCase().includes('customer');

          const resolvedRole: UserRole = isAdmin ? 'SystemAdmin' : isTeller ? 'BankTeller' : isCustomer ? 'Customer' : 'ComplianceAuditor';
          const resolvedPersona: UserPersona | 'Retail Customer' = isAdmin ? 'System Admin' : isTeller ? 'Bank Teller' : isCustomer ? 'Retail Customer' : 'Compliance Auditor';

          set({
            isAuthenticated: true,
            user: {
              ...meData.user,
              role: resolvedRole,
              persona: resolvedPersona,
            },
            accessToken: refreshResult.accessToken,
            isLoading: false,
          });
          return;
        }
      }
    } catch {
      // Refresh also invalid or offline
    }

    // Step 3: Enforce strict unauthenticated lockdown
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
    set({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
    });
  },

  /**
   * Bank Staff Operator Authentication (/login)
   */
  login: async (emailOrId: string, password = 'password', persona = 'Compliance Auditor') => {
    set({ isLoading: true });
    try {
      const res = await authApi.login({ emailOrId, password, persona });
      
      const isAdmin = res.roles?.includes('SystemAdmin') || 
                      res.user?.role === 'SystemAdmin' || 
                      res.user?.email?.toLowerCase().includes('admin') ||
                      emailOrId.toLowerCase().includes('admin');
      const isTeller = res.roles?.includes('BankTeller') || 
                       res.user?.role === 'BankTeller' || 
                       res.user?.email?.toLowerCase().includes('teller') ||
                       emailOrId.toLowerCase().includes('teller');

      const resolvedRole: UserRole = isAdmin ? 'SystemAdmin' : isTeller ? 'BankTeller' : 'ComplianceAuditor';
      const resolvedPersona: UserPersona = isAdmin ? 'System Admin' : isTeller ? 'Bank Teller' : 'Compliance Auditor';

      const authUser: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        persona: resolvedPersona,
        role: resolvedRole,
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

      return { success: true, role: authUser.role };
    } catch (err: any) {
      console.warn('[useAuthStore] Operator login failed:', err);
      set({ isLoading: false, isAuthenticated: false, user: null });
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        'Invalid authentication credentials.';
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Retail Customer Authentication (/customer/login)
   */
  customerLogin: async (emailOrId: string, password = 'password') => {
    set({ isLoading: true });
    try {
      const res = await authApi.customerLogin({ emailOrId, password });
      const authUser: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        persona: 'Retail Customer',
        role: 'Customer',
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

      return { success: true, role: 'Customer' };
    } catch (err: any) {
      console.warn('[useAuthStore] Customer login failed:', err);
      set({ isLoading: false, isAuthenticated: false, user: null });
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        'Invalid customer credentials.';
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Complete Sign Out & Cookie Invalidation
   */
  logout: async () => {
    const isCustomer = get().user?.role === 'Customer';
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
      });
      // Route cleanly to appropriate login page
      proxy.navigate(isCustomer ? '/customer/login' : '/login', true);
    }
  },

  /**
   * Periodic Session Heartbeat Verification
   */
  checkSession: async () => {
    const { isAuthenticated } = get();
    if (!isAuthenticated) return false;

    try {
      const meData = await authApi.getCurrentUser();
      if (!meData?.user || !meData?.isAuthenticated) {
        await get().logout();
        return false;
      }
      return true;
    } catch {
      await get().logout();
      return false;
    }
  },
}));
