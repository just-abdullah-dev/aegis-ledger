import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEYS = {
  ACCESS_TOKEN: 'aegis_access_token',
  REFRESH_TOKEN: 'aegis_refresh_token',
  USER_DATA: 'aegis_user_data',
  BIOMETRIC_ENABLED: 'aegis_biometric_enabled',
  MOCK_MODE: 'aegis_mock_mode',
} as const;

class StorageService {
  private memoryFallback: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        } else {
          this.memoryFallback.set(key, value);
        }
      } else {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
    } catch (err) {
      console.warn(`[SecureStorage] Error setting key ${key}:`, err);
      this.memoryFallback.set(key, value);
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return this.memoryFallback.get(key) ?? null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn(`[SecureStorage] Error getting key ${key}:`, err);
      return this.memoryFallback.get(key) ?? null;
    }
  }

  async deleteItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        this.memoryFallback.delete(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (err) {
      console.warn(`[SecureStorage] Error deleting key ${key}:`, err);
      this.memoryFallback.delete(key);
    }
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      this.setItem(KEYS.ACCESS_TOKEN, accessToken),
      this.setItem(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    return this.getItem(KEYS.ACCESS_TOKEN);
  }

  async getRefreshToken(): Promise<string | null> {
    return this.getItem(KEYS.REFRESH_TOKEN);
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      this.deleteItem(KEYS.ACCESS_TOKEN),
      this.deleteItem(KEYS.REFRESH_TOKEN),
      this.deleteItem(KEYS.USER_DATA),
    ]);
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await this.setItem(KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  }

  async getBiometricEnabled(): Promise<boolean> {
    const val = await this.getItem(KEYS.BIOMETRIC_ENABLED);
    return val === 'true';
  }

  async setMockMode(enabled: boolean): Promise<void> {
    await this.setItem(KEYS.MOCK_MODE, enabled ? 'true' : 'false');
  }

  async getMockMode(): Promise<boolean> {
    const val = await this.getItem(KEYS.MOCK_MODE);
    return val === 'true';
  }
}

export const secureStorage = new StorageService();
export { KEYS };
