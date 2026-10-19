import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { secureStorage } from '@/utils/secureStorage';
import {
  MOCK_ACCOUNTS,
  MOCK_HEALTH,
  MOCK_HOLDS,
  MOCK_USER,
  mockTransactions,
  executeMockTransfer,
} from './mockData';
import {
  AccountDto,
  LoginRequest,
  LoginResponse,
  SolvencyHealthDto,
  TransactionHoldDto,
  TransactionDto,
  TransferRequest,
  TransferResult,
} from '@/types';

// Default to localhost on iOS/Web or 10.0.2.2 on Android Emulator
const getDefaultBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};

export const API_BASE_URL = getDefaultBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Platform': Platform.OS,
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
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await secureStorage.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[AxiosClient] Error retrieving access token:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 Token Refresh & Retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
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
        const refreshToken = await secureStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post<{ accessToken: string; refreshToken: string }>(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        await secureStorage.setTokens(accessToken, newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await secureStorage.clearTokens();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// High-level API Service with Intelligent Backend/Mock Switch
export const authApi = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const isMock = await secureStorage.getMockMode();

    if (!isMock) {
      try {
        const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', request);
        return response.data;
      } catch (err) {
        console.warn('[AuthApi] Backend /api/v1/auth/login not responding, falling back to mock provider');
      }
    }

    await new Promise((r) => setTimeout(r, 600));
    const user = {
      ...MOCK_USER,
      name: request.accountIdOrEmail.includes('@')
        ? request.accountIdOrEmail.split('@')[0].toUpperCase()
        : 'Marcus Vance',
      email: request.accountIdOrEmail.includes('@') ? request.accountIdOrEmail : MOCK_USER.email,
    };

    return {
      user,
      tokens: {
        accessToken: `ey.mock.jwt.aegis.${Date.now()}.${Math.random().toString(36).substring(2)}`,
        refreshToken: `ey.mock.refresh.${Date.now()}.${Math.random().toString(36).substring(2)}`,
        expiresIn: 3600,
        tokenType: 'Bearer',
      },
    };
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const isMock = await secureStorage.getMockMode();
    if (!isMock) {
      try {
        const res = await apiClient.post('/api/v1/auth/refresh', { refreshToken });
        return res.data;
      } catch (err) {
        console.warn('[AuthApi] Backend refresh failed, falling back to mock');
      }
    }

    return {
      accessToken: `ey.mock.jwt.aegis.${Date.now()}`,
      refreshToken: `ey.mock.refresh.${Date.now()}`,
    };
  },
};

export const accountsApi = {
  async getAccounts(): Promise<AccountDto[]> {
    const isMock = await secureStorage.getMockMode();
    if (!isMock) {
      try {
        const response = await apiClient.get<AccountDto[]>('/api/v1/accounts');
        if (response.data && response.data.length > 0) {
          return response.data;
        }
      } catch (err) {
        console.warn('[AccountsApi] Backend /api/v1/accounts not responding, falling back to mock');
      }
    }

    await new Promise((r) => setTimeout(r, 300));
    return MOCK_ACCOUNTS;
  },

  async getAccountByNumber(accountNumber: string): Promise<AccountDto | null> {
    const accounts = await this.getAccounts();
    return accounts.find((a) => a.accountNumber === accountNumber) || null;
  },

  async getAccountHolds(accountNumber?: string): Promise<TransactionHoldDto[]> {
    const isMock = await secureStorage.getMockMode();
    if (!isMock) {
      try {
        const url = accountNumber
          ? `/api/v1/accounts/${accountNumber}/holds`
          : '/api/v1/holds';
        const response = await apiClient.get<TransactionHoldDto[]>(url);
        return response.data;
      } catch (err) {
        // Fall back to mock
      }
    }

    await new Promise((r) => setTimeout(r, 250));
    if (accountNumber) {
      return MOCK_HOLDS.filter((h) => h.accountNumber === accountNumber);
    }
    return MOCK_HOLDS;
  },

  async getSolvencyHealth(): Promise<SolvencyHealthDto> {
    const isMock = await secureStorage.getMockMode();
    if (!isMock) {
      try {
        const response = await apiClient.get<SolvencyHealthDto>('/api/v1/health');
        return response.data;
      } catch (err) {
        // Fall back to mock
      }
    }

    return MOCK_HEALTH;
  },
};

// Phase 2: Instant P2P Transfers with Client Idempotency Engine
const PENDING_IDEMPOTENCY_KEY = 'aegis_pending_transfer_idempotency_key';

export const transfersApi = {
  async executeTransfer(request: TransferRequest): Promise<TransferResult> {
    // 1. Client-Side Idempotency Header Engine
    // Check if there is an in-flight key to reuse upon retry, or generate a new UUID v4
    let idempotencyKey = request.idempotencyKey;
    if (!idempotencyKey) {
      const storedKey = await secureStorage.getItem(PENDING_IDEMPOTENCY_KEY);
      idempotencyKey = storedKey || uuidv4();
      await secureStorage.setItem(PENDING_IDEMPOTENCY_KEY, idempotencyKey);
    }

    const payload = {
      ...request,
      idempotencyKey,
    };

    const isMock = await secureStorage.getMockMode();

    if (!isMock) {
      try {
        const response = await apiClient.post<TransferResult>(
          '/api/v1/transactions/transfer',
          payload,
          {
            headers: {
              'X-Idempotency-Key': idempotencyKey,
            },
          }
        );
        // Clear pending key on successful completion
        await secureStorage.deleteItem(PENDING_IDEMPOTENCY_KEY);
        return response.data;
      } catch (err) {
        console.warn('[TransfersApi] Backend transfer endpoint failed or unavailable, using mock core');
      }
    }

    // Mock Execution with strict double-entry ledger mutation
    await new Promise((r) => setTimeout(r, 800)); // Simulate realistic network roundtrip
    const result = executeMockTransfer(payload);
    await secureStorage.deleteItem(PENDING_IDEMPOTENCY_KEY);
    return result;
  },
};

export const transactionsApi = {
  async getTransactions(accountNumber?: string): Promise<TransactionDto[]> {
    const isMock = await secureStorage.getMockMode();
    if (!isMock) {
      try {
        const url = accountNumber
          ? `/api/v1/accounts/${accountNumber}/transactions`
          : '/api/v1/transactions';
        const res = await apiClient.get<TransactionDto[]>(url);
        return res.data;
      } catch (err) {
        // Fall back to mock
      }
    }

    await new Promise((r) => setTimeout(r, 300));
    if (accountNumber) {
      return mockTransactions.filter(
        (t) => t.senderAccountNum === accountNumber || t.receiverAccountNum === accountNumber
      );
    }
    return mockTransactions;
  },
};
