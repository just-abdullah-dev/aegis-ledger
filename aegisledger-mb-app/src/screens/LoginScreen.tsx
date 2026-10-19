import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AegisColors, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { biometricService } from '@/utils/biometrics';
import {
  Shield,
  Lock,
  Mail,
  Fingerprint,
  CheckCircle2,
  Server,
  Zap,
} from 'lucide-react-native';

interface LoginScreenProps {
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [accountIdOrEmail, setAccountIdOrEmail] = useState('marcus.vance@apexcapital.io');
  const [password, setPassword] = useState('AegisLedger2026!#');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, isLoading, isMockMode, setMockMode } = useAuthStore();

  useEffect(() => {
    (async () => {
      const caps = await biometricService.checkCapabilities();
      setBiometricAvailable(caps.hasHardware && caps.isEnrolled);
      if (caps.hasHardware && caps.isEnrolled) {
        setEnableBiometric(true);
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!accountIdOrEmail.trim() || !password.trim()) {
      setErrorMessage('Please enter both Account/Email and Password.');
      return;
    }

    setErrorMessage(null);
    const result = await login(accountIdOrEmail.trim(), password, enableBiometric);
    if (result.success) {
      onSuccess?.();
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleSelectPreset = (accountNum: string, email: string) => {
    setAccountIdOrEmail(email);
    setPassword('AegisLedger2026!#');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoShield}>
              <Shield size={38} color={AegisColors.primary400} />
            </View>
            <Text style={styles.brandTitle}>AEGIS<Text style={styles.brandAccent}>LEDGER</Text></Text>
            <Text style={styles.brandSubtitle}>
              Double-Entry Sovereign Banking & Liquidity Engine
            </Text>

            {/* Live API / Mock Engine Toggle */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setMockMode(!isMockMode)}
              style={styles.modePill}
            >
              <Server size={12} color={isMockMode ? AegisColors.amber400 : AegisColors.emerald400} />
              <Text style={styles.modeText}>
                {isMockMode ? 'Mock Simulation Mode' : 'Live Core API (ASP.NET 10)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Secure Core Login</Text>

            {errorMessage && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Email / Account Number Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ACCOUNT ID OR CORPORATE EMAIL</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color={AegisColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={accountIdOrEmail}
                  onChangeText={setAccountIdOrEmail}
                  placeholder="name@apexcapital.io or ACC-882190-USD"
                  placeholderTextColor={AegisColors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD / API PASSPHRASE</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color={AegisColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••••••"
                  placeholderTextColor={AegisColors.textMuted}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Biometric Toggle Switch */}
            <View style={styles.biometricRow}>
              <View style={styles.biometricInfo}>
                <Fingerprint size={20} color={AegisColors.emerald400} />
                <View>
                  <Text style={styles.biometricTitle}>FaceID / Biometric Protection</Text>
                  <Text style={styles.biometricSub}>
                    {biometricAvailable
                      ? 'Secure device hardware authentication'
                      : 'Simulated biometric for local development'}
                  </Text>
                </View>
              </View>
              <Switch
                value={enableBiometric}
                onValueChange={setEnableBiometric}
                trackColor={{ false: AegisColors.navy700, true: AegisColors.emerald900 }}
                thumbColor={enableBiometric ? AegisColors.emerald400 : AegisColors.textSecondary}
              />
            </View>

            {/* Login CTA */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={AegisColors.textPrimary} />
              ) : (
                <View style={styles.buttonContent}>
                  <CheckCircle2 size={18} color={AegisColors.textPrimary} />
                  <Text style={styles.loginButtonText}>Authenticate & Open Wallet</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Quick Demo Presets */}
            <View style={styles.presetsContainer}>
              <View style={styles.presetHeader}>
                <Zap size={13} color={AegisColors.primary400} />
                <Text style={styles.presetLabel}>1-Tap Demo Account Presets:</Text>
              </View>
              <View style={styles.presetButtonsRow}>
                <TouchableOpacity
                  style={styles.presetPill}
                  onPress={() => handleSelectPreset('ACC-882190-USD', 'marcus.vance@apexcapital.io')}
                >
                  <Text style={styles.presetPillText}>Treasury</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetPill}
                  onPress={() => handleSelectPreset('ACC-104928-USD', 'escrow.trustee@apexcapital.io')}
                >
                  <Text style={styles.presetPillText}>Escrow Vault</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetPill}
                  onPress={() => handleSelectPreset('ACC-552140-USD', 'retail.user@apexcapital.io')}
                >
                  <Text style={styles.presetPillText}>Retail</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AegisColors.navy950,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  logoShield: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: AegisColors.navy800,
    borderWidth: 1.5,
    borderColor: AegisColors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: AegisColors.textPrimary,
    letterSpacing: 1.5,
  },
  brandAccent: {
    color: AegisColors.primary400,
  },
  brandSubtitle: {
    fontSize: 12,
    color: AegisColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AegisColors.navy800,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: Spacing.three,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
  },
  modeText: {
    fontSize: 11,
    color: AegisColors.textSecondary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: AegisColors.navy900,
    borderRadius: 24,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: AegisColors.textPrimary,
    marginBottom: Spacing.three,
  },
  errorBanner: {
    backgroundColor: AegisColors.roseBg,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.two,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: AegisColors.rose500,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  inputLabel: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AegisColors.navy800,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    paddingHorizontal: Spacing.three,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: AegisColors.textPrimary,
    paddingVertical: 12,
    fontSize: 14,
  },
  biometricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    marginVertical: Spacing.two,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: AegisColors.navy800,
  },
  biometricInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  biometricTitle: {
    color: AegisColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  biometricSub: {
    color: AegisColors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  loginButton: {
    backgroundColor: AegisColors.primary500,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: AegisColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  presetsContainer: {
    marginTop: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderColor: AegisColors.navy800,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  presetLabel: {
    color: AegisColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    flex: 1,
    backgroundColor: AegisColors.navy800,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AegisColors.navy700,
    alignItems: 'center',
  },
  presetPillText: {
    color: AegisColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
