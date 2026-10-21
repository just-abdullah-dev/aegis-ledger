import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export type AppRoute = 
  | '/login' 
  | '/customer/login' 
  | '/customer/dashboard' 
  | '/customer/accounts'
  | '/'
  | '/accounts-and-coa'
  | '/accounts'
  | '/transactions'
  | '/holds'
  | '/reconciliation'
  | '/hangfire'
  | string;

export interface RouteEvaluation {
  allowed: boolean;
  redirectPath?: string;
  reason?: string;
}

export const TAB_ROUTE_MAP: Record<string, string> = {
  overview: '/',
  accounts: '/accounts-and-coa',
  transactions: '/transactions',
  holds: '/holds',
  reconciliation: '/reconciliation',
  hangfire: '/hangfire',
};

export const ROUTE_TAB_MAP: Record<string, string> = {
  '/': 'overview',
  '/accounts-and-coa': 'accounts',
  '/accounts': 'accounts',
  '/transactions': 'transactions',
  '/holds': 'holds',
  '/reconciliation': 'reconciliation',
  '/hangfire': 'hangfire',
};

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/': ['SystemAdmin', 'BankTeller', 'ComplianceAuditor'],
  '/accounts-and-coa': ['SystemAdmin', 'BankTeller', 'ComplianceAuditor'],
  '/accounts': ['SystemAdmin', 'BankTeller', 'ComplianceAuditor'],
  '/transactions': ['SystemAdmin', 'BankTeller', 'ComplianceAuditor'],
  '/holds': ['BankTeller', 'SystemAdmin'],
  '/reconciliation': ['ComplianceAuditor', 'SystemAdmin'],
  '/hangfire': ['SystemAdmin'],
};

function normalizeRole(role?: string): string {
  if (!role) return 'ComplianceAuditor';
  if (role === 'System Admin' || role === 'SystemAdmin') return 'SystemAdmin';
  if (role === 'Bank Teller' || role === 'BankTeller') return 'BankTeller';
  if (role === 'Retail Customer' || role === 'Customer') return 'Customer';
  if (role === 'Compliance Auditor' || role === 'ComplianceAuditor') return 'ComplianceAuditor';
  return role;
}

/**
 * Modern Client-Side Routing and Security Proxy
 * Acts as the centralized navigation middleware and auth route guard.
 */
export const proxy = {
  getPath(): string {
    if (typeof window === 'undefined') return '/';
    const path = window.location.pathname || '/';
    // Remove trailing slash if longer than 1 character
    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1);
    }
    return path;
  },

  navigate(to: string, replace = false): void {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === to) return;

    if (replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    window.dispatchEvent(new Event('aegis-navigation'));
  },

  isCustomerPath(path: string): boolean {
    return path.startsWith('/customer');
  },

  isPublicAuthPath(path: string): boolean {
    return path === '/login' || path === '/customer/login';
  },

  tabToPath(tab: string): string {
    return TAB_ROUTE_MAP[tab] || '/';
  },

  pathToTab(path: string): string {
    return ROUTE_TAB_MAP[path] || 'overview';
  },

  /**
   * Route Guard: Evaluates if a given path is permissible for current auth & role state.
   */
  evaluateRoute(
    path: string, 
    isAuthenticated: boolean, 
    rawRole?: string
  ): RouteEvaluation {
    const role = normalizeRole(rawRole);
    const isCustomer = role === 'Customer';

    // 1. Unauthenticated Visitor
    if (!isAuthenticated) {
      if (path === '/customer/login' || path === '/login') {
        return { allowed: true };
      }
      if (this.isCustomerPath(path)) {
        return { allowed: false, redirectPath: '/customer/login', reason: 'Customer authentication required.' };
      }
      return { allowed: false, redirectPath: '/login', reason: 'Authentication required to access Core Banking operations.' };
    }

    // 2. Authenticated Retail Customer
    if (isCustomer) {
      if (this.isPublicAuthPath(path) || path === '/') {
        return { allowed: false, redirectPath: '/customer/dashboard' };
      }
      if (this.isCustomerPath(path)) {
        return { allowed: true };
      }
      // Prohibit customer from accessing bank operator portal pages directly via URL
      return { 
        allowed: false, 
        redirectPath: '/customer/dashboard', 
        reason: 'Retail Customers cannot access Core Banking enterprise operator consoles.' 
      };
    }

    // 3. Authenticated Bank Operator (Teller, Auditor, Admin)
    if (this.isPublicAuthPath(path) || this.isCustomerPath(path)) {
      return { allowed: false, redirectPath: '/' };
    }

    // Canonicalize /accounts to /accounts-and-coa
    if (path === '/accounts') {
      return { allowed: true, redirectPath: '/accounts-and-coa' };
    }

    // Check specific role authorization for internal bank portal routes
    const allowedRoles = ROUTE_PERMISSIONS[path];
    if (allowedRoles) {
      if (allowedRoles.includes(role)) {
        return { allowed: true };
      } else {
        return { 
          allowed: false, 
          redirectPath: '/', 
          reason: `Access Prohibited (403): Your role [${role}] is not authorized to access [${path}].` 
        };
      }
    }

    // Unrecognized route: fallback to root dashboard
    return { allowed: false, redirectPath: '/', reason: 'Unknown route. Redirected to Dashboard Overview.' };
  }
};

/**
 * Hook to consume the proxy router in React components.
 * Automatically synchronizes with browser back/forward and programmatic navigation.
 */
export function useProxyRouter(onAccessDenied?: (reason: string) => void) {
  const [currentPath, setCurrentPath] = useState<string>(proxy.getPath());
  const { isAuthenticated, user, isLoading } = useAuthStore();

  const handleRouteCheck = useCallback(() => {
    const path = proxy.getPath();
    setCurrentPath(path);

    if (isLoading) return;

    const evaluation = proxy.evaluateRoute(path, isAuthenticated, user?.role);
    if (!evaluation.allowed && evaluation.redirectPath && evaluation.redirectPath !== path) {
      if (evaluation.reason && onAccessDenied) {
        onAccessDenied(evaluation.reason);
      }
      proxy.navigate(evaluation.redirectPath, true);
      setCurrentPath(evaluation.redirectPath);
    } else if (evaluation.allowed && evaluation.redirectPath && evaluation.redirectPath !== path) {
      // Alias redirect (e.g. /accounts -> /accounts-and-coa)
      proxy.navigate(evaluation.redirectPath, true);
      setCurrentPath(evaluation.redirectPath);
    }
  }, [isAuthenticated, user?.role, isLoading, onAccessDenied]);

  useEffect(() => {
    const onLocationChange = () => handleRouteCheck();
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('aegis-navigation', onLocationChange);

    handleRouteCheck();

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('aegis-navigation', onLocationChange);
    };
  }, [handleRouteCheck]);

  return {
    currentPath,
    navigate: proxy.navigate,
    tabToPath: proxy.tabToPath,
    pathToTab: proxy.pathToTab,
    isCustomerRoute: proxy.isCustomerPath(currentPath),
    isLoginRoute: currentPath === '/login',
    isCustomerLoginRoute: currentPath === '/customer/login',
  };
}
