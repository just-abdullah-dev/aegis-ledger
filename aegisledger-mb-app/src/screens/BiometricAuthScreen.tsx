import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AegisColors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { biometricService } from '@/utils/biometrics';
import { maskAccountNumber } from '@/utils/formatters';
import { Fingerprint, Shield, LogOut, RefreshCw } from 'lucide-react-native';

export const BiometricAuthScreen: React.FC = () => {
  const { user, unlockBiometric, logout } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const attemptBiometric = async () => {
    setIsVerifying(true);
    setErrorNotice(null);
    try {
      const success = await unlockBiometric();
      if (!success) {
        setErrorNotice('Biometric verification was not completed. Tap below to retry.');
      }
    } catch (err) {
      setErrorNotice('Biometric verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    // Automatically trigger biometric prompt on screen appearance
    const timer = setTimeout(() => {
      attemptBiometric();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Shield Icon Top */}
        <View style={styles.shieldIconContainer}>
          <Shield size={36} color={AegisColors.primary400} />
        </View>

        <Text style={styles.title}>Aegis Security Guard</Text>
        <Text style={styles.subtitle}>
          Biometric challenge required to resume your confidential banking session
        </Text>

        {/* User Card */}
        <View style={styles.userCard}>
          <Text style={styles.userName}>{user?.name || 'Treasury Officer'}</Text>
          <Text style={styles.accountNumber}>
            {maskAccountNumber(user?.accountNumber || 'ACC-882190-USD')} • {user?.tier || 'Commercial'}
          </Text>
        </View>

        {/* Biometric Icon Scanner */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={attemptBiometric}
          disabled={isVerifying}
          style={styles.scannerWrapper}
        >
          <View style={styles.scannerRing}>
            {isVerifying ? (
              <ActivityIndicator size="large" color={AegisColors.emerald400} />
            ) : (
              <Fingerprint size={64} color={AegisColors.emerald400} />
            )}
          </View>
          <Text style={styles.scannerHint}>
            {isVerifying ? 'Verifying biometrics...' : 'Tap fingerprint sensor to unlock'}
          </Text>
        </TouchableOpacity>

        {errorNotice && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorNotice}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonStack}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={attemptBiometric}
            disabled={isVerifying}
          >
            <RefreshCw size={16} color={AegisColors.textPrimary} />
            <Text style={styles.retryButtonText}>Verify Identity Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LogOut size={16} color={AegisColors.rose500} />
            <Text style={styles.logoutButtonText}>Switch Account or Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AegisColors.navy950,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  shieldIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AegisColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
    borderWidth: 1.5,
    borderColor: AegisColors.navy700,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: AegisColors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: AegisColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 300,
    lineHeight: 18,
  },
  userCard: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    marginTop: Spacing.four,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    alignItems: 'center',
  },
  userName: {
    color: AegisColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  accountNumber: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  scannerWrapper: {
    alignItems: 'center',
    marginVertical: Spacing.five,
  },
  scannerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AegisColors.emerald500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },
  scannerHint: {
    color: AegisColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: Spacing.three,
  },
  errorContainer: {
    backgroundColor: AegisColors.roseBg,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: AegisColors.rose500,
    fontSize: 12,
    textAlign: 'center',
  },
  buttonStack: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.two,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AegisColors.primary500,
    borderRadius: 12,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: AegisColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: AegisColors.rose500,
    fontSize: 13,
    fontWeight: '600',
  },
});
