import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AegisColors } from '@/constants/theme';
import { WifiOff, AlertTriangle } from 'lucide-react-native';

interface OfflineBannerProps {
  isOffline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline }) => {
  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <WifiOff size={14} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.bannerText}>
        Offline Mode — Transactions & Payouts Disabled
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: AegisColors.rose500,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  icon: {
    marginRight: 8,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
