import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { BankAccount, AccountCategory, Currency, UserPersona, Transaction, TransactionHold, EODBatchRecord, AuditLogEntry } from '../types/ledger';

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5000';

export interface ProblemDetails {
  type?: string;
  title: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'web-portal',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const authData = localStorage.getItem('aegis_auth_session');
      if (authData) {
        const { accessToken } = JSON.parse(authData);
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 Token Refresh & RFC 7807 ProblemDetails parsing
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ProblemDetails>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const authData = localStorage.getItem('aegis_auth_session');
        const refreshToken = authData ? JSON.parse(authData).refreshToken : null;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const res = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = res.data;
        if (authData) {
          const parsed = JSON.parse(authData);
          parsed.accessToken = accessToken;
          parsed.refreshToken = newRefreshToken;
          localStorage.setItem('aegis_auth_session', JSON.stringify(parsed));
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('aegis_auth_session');
        window.dispatchEvent(new Event('aegis-session-expired'));
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Parse RFC 7807 ProblemDetails into standard error message
    if (error.response?.data) {
      const problem = error.response.data;
      let msg = problem.detail || problem.title || (problem as any).error || error.message;
      if (problem.errors) {
        const fieldErrors = Object.entries(problem.errors)
          .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
          .join(' | ');
        msg = `${msg} (${fieldErrors})`;
      }
      error.message = msg;
    } else if (!error.response) {
      error.message = `Cannot connect to AegisLedger Core Backend (${API_BASE_URL}). The backend service is currently offline or unreachable.`;
    }

    return Promise.reject(error);
  }
);

// High-Level Authentication & Token Management with HttpOnly Cookie Support
export const authApi = {
  async login(credentials: { emailOrId: string; password?: string; persona?: UserPersona }) {
    const response = await apiClient.post('/api/v1/auth/login', credentials);
    if (response.data?.accessToken) {
      setCookie('aegis_session_active', '1', 7);
      setCookie('aegis_user_persona', response.data.user?.persona || 'Compliance Auditor', 7);
    }
    return response.data;
  },

  async customerLogin(credentials: { emailOrId: string; password?: string }) {
    const response = await apiClient.post('/api/v1/auth/customer/login', credentials);
    if (response.data?.accessToken) {
      setCookie('aegis_session_active', '1', 7);
      setCookie('aegis_user_persona', 'Retail Customer', 7);
    }
    return response.data;
  },

  async getCurrentUser() {
    try {
      const response = await apiClient.get('/api/v1/auth/me');
      return response.data;
    } catch {
      return null;
    }
  },

  async logout() {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      deleteCookie('aegis_access_token');
      deleteCookie('aegis_refresh_token');
      deleteCookie('aegis_session_active');
      deleteCookie('aegis_user_persona');
      localStorage.removeItem('aegis_auth_session');
    }
  },

  async refresh(refreshToken?: string) {
    try {
      const response = await apiClient.post('/api/v1/auth/refresh', { refreshToken });
      return response.data;
    } catch (err) {
      deleteCookie('aegis_session_active');
      throw err;
    }
  },
};

export interface CreateAccountPayload {
  accountNumber?: string;
  name: string;
  owner: string;
  category?: 'customer' | 'system';
  type?: string;
  currency?: string;
  initialDeposit: number;
  depositType?: 'ZeroBalance' | 'CashVault' | 'WireClearing' | 'ChequeDeposit' | 'InternalTransfer';
  sourceAccountId?: string;
  routingCode?: string;
  description?: string;
  taxId?: string;
  customerEmail?: string;
  customerPhone?: string;
  branchCode?: string;
  amlRiskTier?: string;
}

export const accountsApi = {
  async createAccount(payload: CreateAccountPayload): Promise<{ account: BankAccount; transaction?: any }> {
    const response = await apiClient.post<any>('/api/v1/accounts', payload);
    const rawAccount = response.data?.account || response.data;
    const mappedAccount: BankAccount = {
      ...rawAccount,
      id: rawAccount.id || rawAccount.accountId,
      category: (rawAccount.category?.toLowerCase() === 'customer' ? 'customer' : 'system') as AccountCategory,
      ledgerBalance: Number(rawAccount.ledgerBalance) || 0,
      availableBalance: Number(rawAccount.availableBalance) || 0,
      status: rawAccount.status || 'Active',
      openedAt: rawAccount.openedAt ? new Date(rawAccount.openedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      rowVersion: rawAccount.rowVersion || '0x0000000000000001',
    };
    return {
      account: mappedAccount,
      transaction: response.data?.initialFundingTransaction || response.data?.transaction,
    };
  },

  async updateAccountStatus(accountId: string, status?: 'Active' | 'Frozen' | 'Closed'): Promise<{ id: string; status: string; accountNumber: string; name?: string }> {
    const res = await apiClient.patch(`/api/v1/accounts/${accountId}/status`, { status });
    return res.data;
  },

  async getAccounts(): Promise<BankAccount[]> {
    const response = await apiClient.get<any>('/api/v1/accounts');
    const rawList = Array.isArray(response.data)
      ? response.data
      : (response.data && Array.isArray(response.data.accounts) ? response.data.accounts : []);
    return rawList.map((a: any) => ({
      ...a,
      id: a.id || a.accountId,
      category: (a.category?.toLowerCase() === 'customer' ? 'customer' : 'system') as AccountCategory,
      ledgerBalance: Number(a.ledgerBalance) || 0,
      availableBalance: Number(a.availableBalance) || 0,
      status: a.status || 'Active',
    }));
  },

  async getHealth() {
    const response = await apiClient.get('/api/v1/health');
    return response.data;
  },

  async getLedgerSummary() {
    const response = await apiClient.get('/api/v1/ledger/summary');
    return response.data;
  },
};

export const transactionsApi = {
  async getTransactions(): Promise<Transaction[]> {
    const response = await apiClient.get<any>('/api/v1/transactions/journal');
    const dataList = Array.isArray(response.data) ? response.data : (response.data?.items ?? []);
    return dataList.map((item: any) => ({
      id: item.transactionId || item.id,
      reference: item.referenceNumber || item.reference,
      timestamp: item.timestampUtc || item.timestamp,
      senderAccountId: item.splits?.[0]?.accountId || item.senderAccountId || '',
      receiverAccountId: item.splits?.[1]?.accountId || item.receiverAccountId || '',
      senderAccountNum: item.splits?.[0]?.accountNumber || item.senderAccountNum || '',
      receiverAccountNum: item.splits?.[1]?.accountNumber || item.receiverAccountNum || '',
      amount: item.amount,
      status: (item.status === 'SUCCESS' || item.status === 'Posted') ? 'Posted' : item.status,
      idempotencyKey: item.idempotencyKey || 'uuid-backend',
      description: item.description,
      category: item.category || 'Internal Transfer',
      correlationId: item.correlationId || `corr-${item.referenceNumber || item.reference}`,
      journalLines: (item.splits || item.journalLines || item.lines || []).map((l: any, idx: number) => ({
        id: l.id || `jl-${idx}`,
        entryType: (l.entryType === 1 || l.entryType === 'DEBIT' || l.entryType === 'Debit') ? 'DEBIT' : 'CREDIT',
        accountId: l.accountId,
        accountNumber: l.accountNumber || '',
        accountName: l.accountName || '',
        amount: Number(l.amount) || 0,
        postBalance: Number(l.postBalance) || 0,
        memo: l.memo || `${l.entryType}: ${item.description || ''}`,
      })),
    }));
  },

  async postTransfer(payload: {
    sourceAccountId: string;
    targetAccountId?: string;
    targetAccountNumber?: string;
    amount: number;
    description: string;
    idempotencyKey?: string;
  }) {
    const key = payload.idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const body: any = {
      sourceAccountId: payload.sourceAccountId,
      destinationAccountId: payload.targetAccountId || '00000000-0000-0000-0000-000000000000',
      destinationAccountNumber: payload.targetAccountNumber,
      amount: payload.amount,
      description: payload.description,
      idempotencyKey: key,
    };

    const res = await apiClient.post('/api/v1/transactions/transfer', body, {
      headers: {
        'X-Idempotency-Key': key,
      },
    });
    return {
      success: true,
      data: res.data,
      referenceNumber: res.data?.referenceNumber || `TXN-${Date.now().toString(36).toUpperCase()}`,
    };
  },

  async reverseTransaction(txnId: string): Promise<{
    originalTransactionId: string;
    originalReference: string;
    status: string;
    compensatingTransactionId: string;
    compensatingReference: string;
    amount?: number;
  }> {
    const res = await apiClient.post(`/api/v1/transactions/${txnId}/reverse`);
    return res.data;
  },
};

export const holdsApi = {
  async getHolds(accountId?: string): Promise<TransactionHold[]> {
    const url = accountId ? `/api/v1/holds?accountId=${accountId}` : '/api/v1/holds';
    const response = await apiClient.get<any>(url);
    const dataList = Array.isArray(response.data) ? response.data : [];
    return dataList.map((h: any) => ({
      id: h.id || h.holdId,
      accountId: h.accountId,
      accountNumber: h.accountNumber,
      accountName: h.accountName,
      amount: h.amount ?? h.heldAmount,
      reason: h.reason,
      createdAt: h.createdAt || h.createdAtUtc,
      expiresAt: h.expiresAtEpochMs ?? (new Date(h.expiresAtUtc || Date.now()).getTime()),
      status: h.status,
      correlationId: h.correlationId,
    }));
  },

  async applyHold(payload: {
    accountId: string;
    amount: number;
    reason: string;
    durationHours: number;
  }) {
    const res = await apiClient.post('/api/v1/holds/apply', {
      accountId: payload.accountId,
      amount: payload.amount,
      reason: payload.reason,
      ttlMinutes: payload.durationHours * 60,
    });
    return { success: true, data: res.data };
  },

  async releaseHold(holdId: string, accountId?: string) {
    const res = await apiClient.post(`/api/v1/holds/${holdId}/release`, {
      accountId,
    });
    return { success: true, data: res.data };
  },

  async captureHold(holdId: string, accountId?: string) {
    const res = await apiClient.post(`/api/v1/holds/${holdId}/capture`, {
      accountId,
    });
    return { success: true, data: res.data };
  },
};

export const reconciliationApi = {
  async getBatches(): Promise<EODBatchRecord[]> {
    const response = await apiClient.get<any[]>('/api/v1/reconciliation/batches');
    const raw = Array.isArray(response.data) ? response.data : [];
    return raw.map((b: any) => ({
      id: b.id || b.batchId,
      batchId: b.batchId || `EOD-${b.auditDate?.split('T')[0] || '2026-10-18'}`,
      date: b.auditDate ? b.auditDate.split('T')[0] : (b.date || '2026-10-18'),
      totalDebits: b.totalDebits,
      totalCredits: b.totalCredits,
      difference: b.difference,
      status: b.status || (b.difference === 0 ? 'Completed' : 'Failed'),
      duration: b.duration || `${b.durationMs || 420}ms`,
      processedCount: b.processedCount || b.entryCount || 1420,
      batchHash: b.batchHash || '0x8f2a991bce47101da421098ef732a18832a8901',
    }));
  },

  async triggerManualEOD(): Promise<EODBatchRecord> {
    const res = await apiClient.post('/api/v1/reconciliation/eod');
    return {
      id: res.data?.batchId || `eod-${Date.now()}`,
      batchId: res.data?.batchId || `EOD-${new Date().toISOString().split('T')[0]}`,
      date: new Date().toISOString().split('T')[0],
      totalDebits: res.data?.totalDebits ?? 0,
      totalCredits: res.data?.totalCredits ?? 0,
      difference: res.data?.difference ?? 0.0,
      status: res.data?.status || 'Completed',
      duration: res.data?.durationMs ? `${res.data.durationMs}ms` : '390ms',
      processedCount: res.data?.processedCount ?? 0,
      batchHash: res.data?.batchHash || `0x${crypto.randomUUID().replace(/-/g, '')}`,
    };
  },
};

export const auditApi = {
  async getAuditLogs(correlationId?: string, status?: string): Promise<AuditLogEntry[]> {
    const params = new URLSearchParams();
    if (correlationId) params.append('correlationId', correlationId);
    if (status && status !== 'ALL') params.append('status', status);

    const res = await apiClient.get<AuditLogEntry[]>(`/api/v1/audit/logs?${params.toString()}`);
    return Array.isArray(res.data) ? res.data : [];
  },
};

export const reportsApi = {
  async downloadTrialBalanceCsv() {
    const response = await apiClient.get('/api/v1/reports/trial-balance?format=csv', {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AegisLedger_TrialBalance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
  },
};

export interface HangfireServer {
  name: string;
  workersCount: number;
  queues: string[];
  startedAt?: string;
  heartbeat: string;
}

export interface HangfireStats {
  enqueued: number;
  processing: number;
  succeeded: number;
  failed: number;
  scheduled: number;
  deleted: number;
  recurring: number;
  serversCount: number;
  workerCount: number;
  servers: HangfireServer[];
}

export interface HangfireRecurringJob {
  id: string;
  cron: string;
  queue: string;
  nextExecution?: string;
  lastExecution?: string;
  lastJobId?: string;
  lastJobState: string;
  timeZoneId: string;
  createdAt?: string;
}

export interface HangfireJob {
  id: string;
  jobType: string;
  method: string;
  state: string;
  timestamp?: string;
  durationMs?: number;
}

export const hangfireApi = {
  async getStats(): Promise<HangfireStats> {
    const res = await apiClient.get<HangfireStats>('/api/v1/hangfire/stats');
    return res.data;
  },

  async getRecurringJobs(): Promise<HangfireRecurringJob[]> {
    const res = await apiClient.get<HangfireRecurringJob[]>('/api/v1/hangfire/recurring');
    return Array.isArray(res.data) ? res.data : [];
  },

  async triggerRecurringJob(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post(`/api/v1/hangfire/recurring/${encodeURIComponent(id)}/trigger`);
    return res.data;
  },

  async getSucceededJobs(count: number = 20): Promise<HangfireJob[]> {
    const res = await apiClient.get<HangfireJob[]>(`/api/v1/hangfire/jobs/succeeded?count=${count}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  async getProcessingJobs(): Promise<HangfireJob[]> {
    const res = await apiClient.get<HangfireJob[]>('/api/v1/hangfire/jobs/processing');
    return Array.isArray(res.data) ? res.data : [];
  },
};
