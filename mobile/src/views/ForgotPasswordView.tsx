import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { SCREEN_ASSETS } from '../../assets/screenAssets';
import { apiPost } from '@/lib/api';

interface ForgotPasswordViewProps {
  onBackToLogin: () => void;
  onCodeSent?: (channel: string, target: string) => void;
}

type ResetType = 'password' | 'pin';
type VerificationChannel = 'sms' | 'whatsapp' | 'email';

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  onBackToLogin,
  onCodeSent,
}) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [resetType, setResetType] = useState<ResetType>('password');
  const [identity, setIdentity] = useState('803 459 2811');
  const [selectedChannel, setSelectedChannel] = useState<VerificationChannel>('sms');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');

  const handleSendCode = async () => {
    if (!identity.trim()) {
      Alert.alert('Required', 'Please enter your registered phone number or email.');
      return;
    }
    if (selectedChannel !== 'email' || !identity.includes('@')) {
      Alert.alert('Email recovery required', 'Password recovery is currently available by email only.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiPost<{ message: string }>('/password-reset/request', { email: identity.trim() });
      setLoading(false);
      setCodeSent(true);
      if (onCodeSent) {
        onCodeSent(selectedChannel, identity);
      }
      Alert.alert('Recovery request submitted', response.message);
    } catch (error) {
      setLoading(false);
      Alert.alert('Could not request recovery', error instanceof Error ? error.message : 'Please try again later.');
    }
  };

  const handleResetComplete = () => {
    Alert.alert(
      'Recovery not available yet',
      'The recovery request was recorded, but OTP verification and password/PIN replacement still need to be enabled on the backend.',
      [{ text: 'Back to sign in', onPress: onBackToLogin }]
    );
  };

  const openHelpDesk = () => {
    Linking.openURL('https://wa.me/2348034592811?text=Hello%20AbbaKano%20Support%2C%20I%20need%20account%20recovery%20assistance');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.kvContainer}
    >
      {/* Top Frosted Bar with Back Button */}
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          onPress={onBackToLogin}
          hitSlop={12}
        >
          <MaterialIcons name="arrow-back" size={22} color={Palette.onSurface} />
        </Pressable>

        <View style={styles.brandTitleCol}>
          <Text style={styles.brandSubtitle}>ABBAKANO DATA SUB</Text>
          <Text style={styles.brandTitle}>Account Recovery</Text>
        </View>

        <View style={styles.logoEmblemContainer}>
          <Image
            source={SCREEN_ASSETS.logoEmblem}
            style={styles.logoEmblem}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* === RESET TYPE SEGMENTED CONTROL === */}
        <View style={styles.segmentCard}>
          <Pressable
            style={[
              styles.segmentTab,
              resetType === 'password' && styles.segmentTabActive,
            ]}
            onPress={() => setResetType('password')}
          >
            <MaterialIcons
              name="lock-reset"
              size={22}
              color={resetType === 'password' ? Palette.primary : Palette.onSurfaceMuted}
            />
            <Text
              style={[
                styles.segmentTabTitle,
                resetType === 'password' && styles.segmentTabTitleActive,
              ]}
            >
              Account Password
            </Text>
            <Text style={styles.segmentTabSubtitle}>For App Sign-In</Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentTab,
              resetType === 'pin' && styles.segmentTabActive,
            ]}
            onPress={() => setResetType('pin')}
          >
            <MaterialIcons
              name="pin"
              size={22}
              color={resetType === 'pin' ? Palette.primary : Palette.onSurfaceMuted}
            />
            <Text
              style={[
                styles.segmentTabTitle,
                resetType === 'pin' && styles.segmentTabTitleActive,
              ]}
            >
              Transaction PIN
            </Text>
            <Text style={styles.segmentTabSubtitle}>4-Digit Wallet PIN</Text>
          </Pressable>
        </View>

        {!codeSent ? (
          <>
            {/* === IDENTITY INPUT === */}
            <View style={styles.inputSection}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Registered Phone or Email</Text>
                <View style={styles.autoVerifiedBadge}>
                  <View style={styles.pingDot} />
                  <Text style={styles.autoVerifiedText}>Auto-Verified</Text>
                </View>
              </View>

              <View style={styles.identityInputBox}>
                <View style={styles.prefixGroup}>
                  <MaterialIcons name="contact-phone" size={20} color={Palette.primary} />
                  <Text style={styles.prefixText}>+234</Text>
                </View>
                <TextInput
                  style={styles.identityInput}
                  value={identity}
                  onChangeText={setIdentity}
                  placeholder="Enter phone number or email"
                  placeholderTextColor={Palette.onSurfaceMuted}
                  keyboardType="phone-pad"
                />
                <View style={styles.carrierChip}>
                  <View style={styles.carrierDot} />
                  <Text style={styles.carrierText}>MTN</Text>
                </View>
              </View>
            </View>

            {/* === CHANNELS SELECTION === */}
            <View style={styles.channelSection}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Send Verification Code via</Text>
                <Text style={styles.helperText}>Select 1 option</Text>
              </View>

              <View style={styles.channelGroup}>
                {/* Option 1: SMS */}
                <Pressable
                  style={[
                    styles.channelCard,
                    selectedChannel === 'sms' && styles.channelCardActive,
                  ]}
                  onPress={() => setSelectedChannel('sms')}
                >
                  <View style={styles.channelLeft}>
                    <View style={[styles.channelIconBox, styles.smsIconBox]}>
                      <MaterialIcons name="sms" size={22} color={Palette.primary} />
                    </View>
                    <View style={styles.channelInfo}>
                      <View style={styles.channelTitleRow}>
                        <Text style={styles.channelTitle}>SMS Verification OTP</Text>
                        <View style={styles.instantBadge}>
                          <Text style={styles.instantBadgeText}>Instant 10s</Text>
                        </View>
                      </View>
                      <Text style={styles.channelTarget}>+234 803 *** 2811</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.indicatorCircle,
                      selectedChannel === 'sms' && styles.indicatorCircleActive,
                    ]}
                  >
                    {selectedChannel === 'sms' && (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                </Pressable>

                {/* Option 2: WhatsApp */}
                <Pressable
                  style={[
                    styles.channelCard,
                    selectedChannel === 'whatsapp' && styles.channelCardActive,
                  ]}
                  onPress={() => setSelectedChannel('whatsapp')}
                >
                  <View style={styles.channelLeft}>
                    <View style={[styles.channelIconBox, styles.waIconBox]}>
                      <MaterialIcons name="chat" size={22} color={Palette.secondary} />
                    </View>
                    <View style={styles.channelInfo}>
                      <View style={styles.channelTitleRow}>
                        <Text style={styles.channelTitle}>WhatsApp Direct Code</Text>
                        <View style={styles.highDeliveryBadge}>
                          <Text style={styles.highDeliveryBadgeText}>High Delivery</Text>
                        </View>
                      </View>
                      <Text style={styles.channelTarget}>+234 803 *** 2811</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.indicatorCircle,
                      selectedChannel === 'whatsapp' && styles.indicatorCircleActive,
                    ]}
                  >
                    {selectedChannel === 'whatsapp' && (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                </Pressable>

                {/* Option 3: Email */}
                <Pressable
                  style={[
                    styles.channelCard,
                    selectedChannel === 'email' && styles.channelCardActive,
                  ]}
                  onPress={() => setSelectedChannel('email')}
                >
                  <View style={styles.channelLeft}>
                    <View style={[styles.channelIconBox, styles.emailIconBox]}>
                      <MaterialIcons name="mail" size={22} color={Palette.primary} />
                    </View>
                    <View style={styles.channelInfo}>
                      <View style={styles.channelTitleRow}>
                        <Text style={styles.channelTitle}>Email Recovery Link</Text>
                      </View>
                      <Text style={styles.channelTarget}>usm***kano@gmail.com</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.indicatorCircle,
                      selectedChannel === 'email' && styles.indicatorCircleActive,
                    ]}
                  >
                    {selectedChannel === 'email' && (
                      <MaterialIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                </Pressable>
              </View>
            </View>

            {/* === ENCRYPTED SECURITY NOTE === */}
            <View style={styles.securityCard}>
              <View style={styles.securityIconBox}>
                <MaterialIcons name="lock" size={18} color={Palette.tertiary} />
              </View>
              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>256-Bit Encrypted Recovery</Text>
                <Text style={styles.securityBody}>
                  Never share your reset code or OTP with anyone. AbbaKano administrative staff will never request your credentials.
                </Text>
              </View>
            </View>

            {/* === SEND CODE CTA === */}
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                loading && { opacity: 0.7 },
                pressed && { opacity: 0.88 },
              ]}
              onPress={handleSendCode}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? 'Sending Recovery Code...' : 'Send Recovery Code'}
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </Pressable>
          </>
        ) : (
          /* === STAGE 2: ENTER OTP & NEW SECRET === */
          <View style={styles.stageTwoSection}>
            <View style={styles.stageTwoHeader}>
              <MaterialIcons name="mark-email-read" size={36} color={Palette.primary} />
              <Text style={styles.stageTwoTitle}>Enter Verification Code</Text>
              <Text style={styles.stageTwoSubtitle}>
                We sent a 6-digit OTP to your {selectedChannel.toUpperCase()} contact.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>6-Digit OTP Code</Text>
              <View style={styles.inputBox}>
                <MaterialIcons name="dialpad" size={20} color={Palette.onSurfaceMuted} />
                <TextInput
                  style={styles.textInput}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="Enter 6-digit OTP code"
                  placeholderTextColor={Palette.onSurfaceMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {resetType === 'password' ? 'New Password' : 'New 4-Digit PIN'}
              </Text>
              <View style={styles.inputBox}>
                <MaterialIcons name="lock" size={20} color={Palette.onSurfaceMuted} />
                <TextInput
                  style={styles.textInput}
                  value={newSecret}
                  onChangeText={setNewSecret}
                  placeholder={resetType === 'password' ? 'Enter new password (min. 6 characters)' : 'Enter new 4-digit PIN'}
                  placeholderTextColor={Palette.onSurfaceMuted}
                  secureTextEntry
                  keyboardType={resetType === 'pin' ? 'number-pad' : 'default'}
                  maxLength={resetType === 'pin' ? 4 : 32}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {resetType === 'password' ? 'Confirm New Password' : 'Confirm New PIN'}
              </Text>
              <View style={styles.inputBox}>
                <MaterialIcons name="lock-clock" size={20} color={Palette.onSurfaceMuted} />
                <TextInput
                  style={styles.textInput}
                  value={confirmSecret}
                  onChangeText={setConfirmSecret}
                  placeholder={resetType === 'password' ? 'Re-enter new password' : 'Re-enter new 4-digit PIN'}
                  placeholderTextColor={Palette.onSurfaceMuted}
                  secureTextEntry
                  keyboardType={resetType === 'pin' ? 'number-pad' : 'default'}
                  maxLength={resetType === 'pin' ? 4 : 32}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
              onPress={handleResetComplete}
            >
              <Text style={styles.primaryBtnText}>
                {resetType === 'password' ? 'Update Password & Sign In' : 'Set PIN & Complete'}
              </Text>
              <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.resendBtn}
              onPress={() => {
                Alert.alert('Code Resent', 'A new verification code has been generated.');
              }}
            >
              <Text style={styles.resendText}>Didn't receive code? Resend OTP</Text>
            </Pressable>
          </View>
        )}

        {/* Back to Sign In Link */}
        <View style={styles.footerLinkRow}>
          <Text style={styles.footerMuted}>Remember your credentials? </Text>
          <Pressable onPress={onBackToLogin} hitSlop={8}>
            <Text style={styles.footerLinkBold}>Back to Sign In</Text>
          </Pressable>
        </View>

        {/* === HELP DESK WHATSAPP CARD === */}
        <View style={styles.helpDeskCard}>
          <View style={styles.helpDeskLeft}>
            <View style={styles.agentAvatarBox}>
              <MaterialIcons name="support-agent" size={24} color={Palette.tertiary} />
              <View style={styles.agentOnlineDot} />
            </View>
            <View>
              <Text style={styles.helpDeskTitle}>Locked out or phone lost?</Text>
              <Text style={styles.helpDeskSubtitle}>Chat directly with an agent</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.helpDeskBtn, pressed && { opacity: 0.85 }]}
            onPress={openHelpDesk}
          >
            <Text style={styles.helpDeskBtnText}>Help Desk</Text>
            <MaterialIcons name="open-in-new" size={14} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  kvContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  topBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    backgroundColor: Palette.canvas,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Rounded.xl,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  brandTitleCol: {
    flex: 1,
    marginLeft: Spacing.three,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.secondary,
    letterSpacing: 0.8,
    fontFamily: Typography.family,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  logoEmblemContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  logoEmblem: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
  },

  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },

  // Segment Card
  segmentCard: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    padding: 4,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Rounded.lg,
  },
  segmentTabActive: {
    backgroundColor: Palette.surfaceHigh,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.35)',
  },
  segmentTabTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
    marginTop: 4,
  },
  segmentTabTitleActive: {
    color: Palette.onSurface,
  },
  segmentTabSubtitle: {
    fontSize: 10,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    marginTop: 2,
    opacity: 0.85,
  },

  // Input Section
  inputSection: {
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  helperText: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
  },
  autoVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.tertiary,
  },
  autoVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.tertiary,
    fontFamily: Typography.family,
  },
  identityInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.borderHigh,
    gap: Spacing.two,
  },
  prefixGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRightWidth: 1,
    borderRightColor: Palette.border,
    paddingRight: Spacing.two,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  identityInput: {
    flex: 1,
    fontSize: 15,
    color: Palette.onSurface,
    fontFamily: Typography.family,
    fontWeight: '600',
  },
  carrierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Rounded.full,
  },
  carrierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFCC00',
  },
  carrierText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFCC00',
    fontFamily: Typography.family,
  },

  // Channels
  channelSection: {
    gap: Spacing.two,
  },
  channelGroup: {
    gap: Spacing.two,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  channelCardActive: {
    backgroundColor: Palette.surface,
    borderColor: Palette.primary,
    borderWidth: 1.5,
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  channelIconBox: {
    width: 44,
    height: 44,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsIconBox: {
    backgroundColor: 'rgba(37,99,235,0.15)',
  },
  waIconBox: {
    backgroundColor: 'rgba(238,152,0,0.15)',
  },
  emailIconBox: {
    backgroundColor: Palette.surfaceHigh,
  },
  channelInfo: {
    flex: 1,
    gap: 2,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  instantBadge: {
    backgroundColor: 'rgba(0,208,132,0.15)',
    borderRadius: Rounded.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  instantBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.tertiary,
    fontFamily: Typography.family,
  },
  highDeliveryBadge: {
    backgroundColor: 'rgba(238,152,0,0.15)',
    borderRadius: Rounded.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  highDeliveryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.secondary,
    fontFamily: Typography.family,
  },
  channelTarget: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  indicatorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.two,
  },
  indicatorCircleActive: {
    backgroundColor: Palette.primary,
  },

  // Security Note
  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  securityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,208,132,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  securityInfo: {
    flex: 1,
    gap: 2,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  securityBody: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    lineHeight: 16,
  },

  // CTA
  primaryBtn: {
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
    marginTop: Spacing.two,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },

  // Stage 2
  stageTwoSection: {
    gap: Spacing.four,
  },
  stageTwoHeader: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  stageTwoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  stageTwoSubtitle: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    textAlign: 'center',
  },
  inputGroup: {
    gap: Spacing.two,
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
    fontWeight: '600',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  resendText: {
    fontSize: 13,
    color: Palette.primary,
    fontFamily: Typography.family,
    fontWeight: '700',
  },

  // Footer Link
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  footerMuted: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  footerLinkBold: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.primary,
    fontFamily: Typography.family,
  },

  // Help Desk
  helpDeskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceLowest,
    borderRadius: Rounded.xl,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
    marginTop: Spacing.two,
  },
  helpDeskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  agentAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  agentOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.tertiary,
    borderWidth: 1.5,
    borderColor: Palette.canvas,
  },
  helpDeskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  helpDeskSubtitle: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  helpDeskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Rounded.full,
  },
  helpDeskBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A0E17',
    fontFamily: Typography.family,
  },
});
