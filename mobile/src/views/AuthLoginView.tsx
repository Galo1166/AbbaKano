import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { SCREEN_ASSETS } from '../../assets/screenAssets';
import { apiPost } from '@/lib/api';
import { biometricLogin, registerBiometricDevice } from '@/lib/biometricAuth';
import { loginWithPasskey, supportsPasskeys } from '@/lib/passkey';

interface AuthLoginViewProps {
  onLoginSuccess: () => Promise<void>;
  onRegisterPress: () => void;
  onForgotPasswordPress: () => void;
}

export const AuthLoginView: React.FC<AuthLoginViewProps> = ({
  onLoginSuccess,
  onRegisterPress,
  onForgotPasswordPress,
}) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      await apiPost('/login', { identifier, password });
      await registerBiometricDevice().catch(() => {});
      setIdentifier('');
      setPassword('');
      await onLoginSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      if (supportsPasskeys()) {
        if (!identifier.trim()) throw new Error('Enter your phone number or email first.');
        await loginWithPasskey(identifier.trim());
      } else {
        const authenticated = await biometricLogin();
        if (!authenticated) throw new Error('Biometric authentication is not available on this device.');
      }
      await onLoginSuccess();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not sign in with biometrics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.kvContainer}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* === HEADER WITH EMBLEM === */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Image
              source={SCREEN_ASSETS.logoEmblem}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.headerTitle}>Sign In</Text>
          <View style={styles.headerSubtitleRow}>
            <Text style={styles.headerSubtitle}>Welcome Back</Text>
            <MaterialCommunityIcons name="hand-wave-outline" size={18} color={Palette.secondaryLight} />
          </View>
          <Text style={styles.headerBody}>
            Sign in to access your wallet and purchase instant data.
          </Text>
          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </View>

        {/* === FORM === */}
        <View style={styles.formSection}>
          {/* Mobile Number or Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile Number or Email</Text>
            <View style={styles.inputBox}>
              <MaterialIcons
                name={
                  identifier.includes('@')
                    ? 'mail-outline'
                    : /^\d+$/.test(identifier.replace(/\s+/g, ''))
                    ? 'phone'
                    : 'person-outline'
                }
                size={20}
                color={Palette.onSurfaceMuted}
              />
              <TextInput
                style={styles.textInput}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Enter phone number or email"
                placeholderTextColor={Palette.onSurfaceMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {identifier.length > 0 && (
                <Pressable hitSlop={8} onPress={() => setIdentifier('')}>
                  <MaterialIcons name="cancel" size={18} color={Palette.onSurfaceMuted} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <Pressable onPress={onForgotPasswordPress} hitSlop={8}>
                <Text style={styles.forgotLink}>Forgot Password?</Text>
              </Pressable>
            </View>
            <View style={styles.inputBox}>
              <MaterialIcons name="lock" size={20} color={Palette.onSurfaceMuted} />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Palette.onSurfaceMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable hitSlop={8} onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={Palette.onSurfaceMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Remember Device Toggle */}
          <Pressable
            style={styles.rememberRow}
            onPress={() => setRememberDevice(!rememberDevice)}
          >
            <View style={[styles.checkBox, rememberDevice && styles.checkBoxActive]}>
              {rememberDevice && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.rememberText}>Remember this device</Text>
          </Pressable>
        </View>

        {/* === CTA === */}
        <View style={styles.ctaSection}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              loading && styles.btnLoading,
              pressed && { opacity: 0.88 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <View style={styles.securedRow}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="verified-user" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.securedText}>{loading ? 'Signing in...' : 'Secured Sign In to Wallet'}</Text>
            </View>
            {!loading && <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />}
          </Pressable>

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Biometrics */}
          <Pressable style={styles.biometricBtn} onPress={() => void handleBiometricLogin()} disabled={loading}>
            <MaterialIcons name="fingerprint" size={24} color={Palette.primary} />
            <Text style={styles.biometricBtnText}>Sign In with Biometrics</Text>
          </Pressable>
        </View>

        {/* === FOOTER LINKS === */}
        <View style={styles.footerLinks}>
          <Text style={styles.footerText}>Don't have an account?{' '}</Text>
          <Pressable onPress={onRegisterPress} hitSlop={8}>
            <Text style={styles.footerLink}>Register Now</Text>
          </Pressable>
        </View>

        <View style={styles.supportRow}>
          <Text style={styles.footerText}>Need help?{' '}</Text>
          <MaterialIcons name="chat" size={14} color={Palette.tertiary} />
          <Text style={styles.supportLink}> Contact WhatsApp Support</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  kvContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.eight,
    gap: Spacing.six,
  },

  // Header
  header: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    textAlign: 'center',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    textAlign: 'center',
  },
  headerBody: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: Palette.error,
    textAlign: 'center',
    fontFamily: Typography.family,
    fontSize: 13,
  },

  // Form
  formSection: {
    gap: Spacing.four,
  },
  inputGroup: {
    gap: Spacing.two,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    borderColor: Palette.borderHigh,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Palette.onSurface,
    fontFamily: Typography.family,
    fontWeight: '500',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
    fontFamily: Typography.family,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Palette.borderHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  rememberText: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },

  // CTA
  ctaSection: {
    gap: Spacing.four,
  },
  primaryBtn: {
    height: 52,
    backgroundColor: Palette.primaryContainer,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    elevation: 4,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  btnLoading: {
    opacity: 0.7,
    justifyContent: 'center',
  },
  securedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.border,
  },
  orText: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
  },
  biometricBtn: {
    height: 52,
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Palette.borderHigh,
  },
  biometricBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
    fontFamily: Typography.family,
  },
  supportRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportLink: {
    fontSize: 13,
    color: Palette.tertiary,
    fontFamily: Typography.family,
    fontWeight: '600',
  },
});
