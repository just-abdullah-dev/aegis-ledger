import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { BiometricCapability } from '@/types';

export class BiometricService {
  async checkCapabilities(): Promise<BiometricCapability> {
    if (Platform.OS === 'web') {
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
      };
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const supportedTypes: BiometricCapability['supportedTypes'] = types.map((t) => {
        switch (t) {
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'FACIAL_RECOGNITION';
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'FINGERPRINT';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'IRIS';
          default:
            return 'UNKNOWN';
        }
      });

      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
      };
    } catch (err) {
      console.warn('[Biometrics] Error checking capabilities:', err);
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
      };
    }
  }

  async authenticate(promptMessage: string = 'Verify your identity for AegisLedger'): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (Platform.OS === 'web') {
      // In web development / browser sandbox, simulate successful biometric after short delay
      return { success: true };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Use Device PIN / Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || 'Authentication canceled or failed' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Biometric authentication failed';
      return { success: false, error: message };
    }
  }
}

export const biometricService = new BiometricService();
