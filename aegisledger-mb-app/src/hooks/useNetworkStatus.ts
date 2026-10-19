import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: string;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () =>
        setStatus((s) => ({ ...s, isConnected: true, isInternetReachable: true }));
      const handleOffline = () =>
        setStatus((s) => ({ ...s, isConnected: false, isInternetReachable: false }));

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      setStatus({
        isConnected: navigator.onLine,
        isInternetReachable: navigator.onLine,
        connectionType: 'wifi',
      });

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? true,
        connectionType: state.type,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}
