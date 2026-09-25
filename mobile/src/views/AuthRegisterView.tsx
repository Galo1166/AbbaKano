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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { SCREEN_ASSETS } from '../../assets/screenAssets';
import { apiPost } from '@/lib/api';
import { saveTransactionPin } from '@/lib/biometricAuth';

interface AuthRegisterViewProps {
  onRegisterSuccess: () => void;
  onLoginPress: () => void;
}

export const AuthRegisterView: React.FC<AuthRegisterViewProps> = ({
  onRegisterSuccess,
  onLoginPress,
}) => {
  const { theme: Palette, updateUserProfile } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showReferral, setShowReferral] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detect network from phone
  const detectNetwork = (p: string): string => {
    if (p.startsWith('0803') || p.startsWith('0806') || p.startsWith('0703')) return 'MTN';
    if (p.startsWith('0802') || p.startsWith('0902') || p.startsWith('0701')) return 'AIRTEL';
    if (p.startsWith('0805') || p.startsWith('0705') || p.startsWith('0905')) return 'GLO';
    if (p.startsWith('0809') || p.startsWith('0909') || p.startsWith('0908')) return '9mobile';
    return '';
  };
  const detectedNetwork = detectNetwork(phone.replace(/\s/g, ''));

  const handleRegister = () => {
    setErrorMessage(null);
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your phone number (mandatory).');
      return;
    }
    if (email.trim() && !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMessage('Transaction PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMessage('Transaction PINs do not match.');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('Please accept the Terms of Service to continue.');
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        await apiPost('/signup', {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password,
          pin,
          referralCode: referralCode.trim() || undefined,
        });
        await saveTransactionPin(pin).catch(() => {});
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not create your account.');
        setLoading(false);
        return;
      }

      setLoading(false);
      updateUserProfile({
        name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        referralCode: phone.trim().replace(/[^0-9]/g, ''),
      });
      setFullName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPin('');
      setConfirmPin('');
      setReferralCode('');
      setTermsAccepted(false);
      onRegisterSuccess();
    })();
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandEmblemBox}>
              <Image
                source={SCREEN_ASSETS.logoEmblem}
                style={styles.brandEmblemImage}
                resizeMode="cover"
              />
            </View>
            <View>
              <Text style={styles.brandLabel}>ABBAKANO DATA SUB</Text>
              <Text style={styles.brandSubLabel}>Fast & Reliable VTU Portal</Text>
            </View>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.body}>
            Open a secure account for discounted data bundles, instant airtime, and zero transaction delays.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          {errorMessage && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={18} color="#EF4444" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputBox}>
              <MaterialIcons name="person" size={20} color={Palette.onSurfaceMuted} />
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={(t) => {
                  setFullName(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter full name"
                placeholderTextColor={Palette.onSurfaceMuted}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <View style={styles.labelWithBadgeRow}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Mandatory</Text>
              </View>
            </View>
            <View style={styles.inputBox}>
              <View style={styles.countryFlag}>
                <Text style={styles.countryFlagText}>+234</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={phone}
                onChangeText={(t) => {
                  setPhone(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter phone number"
                placeholderTextColor={Palette.onSurfaceMuted}
                keyboardType="phone-pad"
              />
              {detectedNetwork !== '' && (
                <View style={[
                  styles.networkDetectedBadge,
                  {
                    backgroundColor: detectedNetwork === 'MTN' ? '#FFCC00' :
                    detectedNetwork === 'AIRTEL' ? '#E60000' :
                    detectedNetwork === 'GLO' ? '#27A844' : '#84BD00'
                  }
                ]}>
                  <Text style={[styles.networkDetectedText, { color: (detectedNetwork === 'MTN' || detectedNetwork === '9mobile') ? '#000000' : '#FFFFFF' }]}>
                    {detectedNetwork}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <View style={styles.labelWithBadgeRow}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>Optional</Text>
              </View>
            </View>
            <View style={styles.inputBox}>
              <MaterialIcons name="mail-outline" size={20} color={Palette.onSurfaceMuted} />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter email address"
                placeholderTextColor={Palette.onSurfaceMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputBox}>
              <MaterialIcons name="lock-outline" size={20} color={Palette.onSurfaceMuted} />
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter password (min. 6 characters)"
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

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputBox}>
              <MaterialIcons name="lock-outline" size={20} color={Palette.onSurfaceMuted} />
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Re-enter password"
                placeholderTextColor={Palette.onSurfaceMuted}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <Pressable hitSlop={8} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={Palette.onSurfaceMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Transaction PIN (4 digits) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelWithBadgeRow}>
              <Text style={styles.inputLabel}>Transaction PIN</Text>
              <Text style={styles.pinHint}>4 digits for wallet security</Text>
            </View>
            <View style={styles.inputBox}>
              <MaterialIcons name="dialpad" size={20} color={Palette.onSurfaceMuted} />
              <TextInput
                style={styles.textInput}
                value={pin}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, '').slice(0, 4);
                  setPin(cleaned);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter 4-digit PIN"
                placeholderTextColor={Palette.onSurfaceMuted}
                keyboardType="number-pad"
                secureTextEntry={!showPin}
                maxLength={4}
              />
              <Pressable hitSlop={8} onPress={() => setShowPin(!showPin)}>
                <MaterialIcons
                  name={showPin ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={Palette.onSurfaceMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Confirm Transaction PIN */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Transaction PIN</Text>
            <View style={styles.inputBox}>
              <MaterialIcons name="dialpad" size={20} color={Palette.onSurfaceMuted} />
              <TextInput
                style={styles.textInput}
                value={confirmPin}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^0-9]/g, '').slice(0, 4);
                  setConfirmPin(cleaned);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Re-enter 4-digit PIN"
                placeholderTextColor={Palette.onSurfaceMuted}
                keyboardType="number-pad"
                secureTextEntry={!showConfirmPin}
                maxLength={4}
              />
              <Pressable hitSlop={8} onPress={() => setShowConfirmPin(!showConfirmPin)}>
                <MaterialIcons
                  name={showConfirmPin ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={Palette.onSurfaceMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Referral Code (Expandable) */}
          <Pressable
            style={styles.referralToggle}
            onPress={() => setShowReferral(!showReferral)}
          >
            <MaterialIcons name="redeem" size={18} color={Palette.secondary} />
            <Text style={styles.referralToggleText}>Have a Referral Code (Phone No)?</Text>
            <MaterialIcons
              name={showReferral ? 'expand-less' : 'expand-more'}
              size={18}
              color={Palette.onSurfaceMuted}
            />
          </Pressable>

          {showReferral && (
            <View style={styles.inputBox}>
              <MaterialIcons name="phone" size={20} color={Palette.secondary} />
              <TextInput
                style={styles.textInput}
                value={referralCode}
                onChangeText={setReferralCode}
                placeholder="Enter referrer's phone number"
                placeholderTextColor={Palette.onSurfaceMuted}
                keyboardType="phone-pad"
              />
              <View style={styles.bonusBadge}>
                <Text style={styles.bonusBadgeText}>₦100 BONUS</Text>
              </View>
            </View>
          )}

          {/* Terms */}
          <Pressable
            style={styles.termsRow}
            onPress={() => {
              setTermsAccepted(!termsAccepted);
              if (errorMessage) setErrorMessage(null);
            }}
          >
            <View style={[styles.checkBox, termsAccepted && styles.checkBoxActive]}>
              {termsAccepted && <MaterialIcons name="check" size={13} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </Pressable>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Pressable
            style={({ pressed }) => [
              styles.registerBtn,
              (!termsAccepted || !fullName || !phone || !password || !confirmPassword || !pin || !confirmPin) && styles.registerBtnDisabled,
              pressed && termsAccepted && { opacity: 0.88 },
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerBtnText}>
              {loading ? 'Creating Account...' : 'Register & Get Started'}
            </Text>
            {!loading && <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />}
          </Pressable>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?{' '}</Text>
            <Pressable onPress={onLoginPress} hitSlop={8}>
              <Text style={styles.loginLink}>Sign In</Text>
            </Pressable>
          </View>

          <View style={styles.secureNote}>
            <MaterialIcons name="lock" size={14} color={Palette.onSurfaceMuted} />
            <Text style={styles.secureNoteText}>
              256-bit secure registration. We never share your data.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  kvContainer: { flex: 1, backgroundColor: Palette.canvas },
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.eight,
    gap: Spacing.five,
  },

  // Header
  header: { gap: Spacing.three },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  brandEmblemBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  brandEmblemImage: {
    width: '100%',
    height: '100%',
  },
  brandLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.secondary,
    fontFamily: Typography.family,
    letterSpacing: 0.8,
  },
  brandSubLabel: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  body: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    lineHeight: 20,
  },

  // Form
  formSection: { gap: Spacing.three },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: Rounded.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: Typography.family,
    flex: 1,
  },
  inputGroup: { gap: 4 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    marginBottom: 2,
  },
  labelWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  requiredBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Rounded.sm,
  },
  requiredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: Typography.family,
    letterSpacing: 0.3,
  },
  optionalBadge: {
    backgroundColor: Palette.surfaceHigh,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Rounded.sm,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
    letterSpacing: 0.3,
  },
  pinHint: {
    fontSize: 11,
    color: Palette.onSurfaceMuted,
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
    gap: Spacing.two,
  },
  countryFlag: {
    backgroundColor: Palette.surfaceHigh,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Rounded.sm,
  },
  countryFlagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Palette.onSurface,
    fontFamily: Typography.family,
    fontWeight: '500',
  },
  networkDetectedBadge: {
    borderRadius: Rounded.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  networkDetectedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
    fontFamily: Typography.family,
  },
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  referralToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.secondary,
    fontFamily: Typography.family,
    flex: 1,
  },
  bonusBadge: {
    backgroundColor: 'rgba(238,152,0,0.15)',
    borderRadius: Rounded.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bonusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.secondary,
    fontFamily: Typography.family,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginTop: 4,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Palette.borderHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkBoxActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  termsText: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: Palette.primary,
    fontWeight: '700',
  },

  // CTA
  ctaSection: { gap: Spacing.three },
  registerBtn: {
    height: 52,
    backgroundColor: Palette.primaryContainer,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: Palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  registerBtnDisabled: {
    opacity: 0.5,
  },
  registerBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
    fontFamily: Typography.family,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  secureNoteText: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
    textAlign: 'center',
  },
});
