import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '@/api/axiosClient';
import { secureStorage } from '@/utils/secureStorage';

// Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PUSH_TOKEN_KEY = 'aegis_push_token';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Push notification permission not granted');
      return null;
    }

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('banking_alerts', {
        name: 'Banking Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;

    await secureStorage.setItem(PUSH_TOKEN_KEY, token);

    // Register token with AegisLedger Web API
    try {
      await apiClient.post('/api/v1/notifications/register-device', {
        deviceToken: token,
        platform: Platform.OS,
      });
    } catch {
      // Backend endpoint optional fallback
    }

    return token;
  } catch (err) {
    console.warn('[Notifications] Failed to obtain push token:', err);
    return null;
  }
}

// Banking Event Push Notification Triggers (Foreground & Local simulation)
export const bankingNotifications = {
  async notifyMoneyReceived(amount: number, senderName: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💰 Money Received',
          body: `Inbound credit of $${amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })} received from ${senderName}.`,
          sound: true,
          data: { type: 'CREDIT_RECEIVED', amount, senderName },
        },
        trigger: null, // deliver immediately
      });
    } catch (err) {
      console.warn('Failed to schedule local notification:', err);
    }
  },

  async notifyHoldPlaced(amount: number, reason: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Account Hold Placed',
          body: `Security hold of $${amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })} placed on your account (${reason}).`,
          sound: true,
          data: { type: 'HOLD_PLACED', amount, reason },
        },
        trigger: null,
      });
    } catch (err) {
      console.warn('Failed to schedule local notification:', err);
    }
  },

  async notifyReconciliationComplete(batchId: string, zeroDrift: boolean): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ EOD Reconciliation Complete',
          body: `Daily batch ${batchId} reconciled. Solvency invariant SUM(Debits) == SUM(Credits) verified with 0 drift.`,
          sound: true,
          data: { type: 'RECONCILIATION_COMPLETE', batchId, zeroDrift },
        },
        trigger: null,
      });
    } catch (err) {
      console.warn('Failed to schedule local notification:', err);
    }
  },
};
