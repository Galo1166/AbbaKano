import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

interface ForgotPasswordViewProps {
  onBackToLogin: () => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  onBackToLogin,
}) => {
  const { theme: Palette } = useApp();
  const { isPasswordRecovery, requestPasswordReset, updatePassword } = useAuth();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submitRecoveryRequest = async () => {
    const value = email.trim().toLowerCase();
    if (!value.includes('@')) {
      setMessage('Password recovery is currently available by email only.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await requestPasswordReset(value);
      setMessage('If an account exists for this email, recovery instructions have been sent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send recovery instructions.');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (newPassword.length < 8 || newPassword !== confirmPassword) {
      setMessage('Enter matching passwords with at least 8 characters.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await updatePassword(newPassword);
      Alert.alert('Password updated', 'Your password has been reset securely.', [
        { text: 'Sign in', onPress: onBackToLogin },
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onBackToLogin} style={styles.backButton} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={22} color={Palette.onSurface} />
          <Text style={styles.backText}>Back to sign in</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="lock-reset" size={30} color={Palette.primary} />
          </View>
          <Text style={styles.title}>Account Recovery</Text>
          <Text style={styles.subtitle}>
            {isPasswordRecovery
              ? 'Choose a new password for your account.'
              : 'Recover your account securely using your registered email.'}
          </Text>
        </View>

        {message ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        {isPasswordRecovery ? (
          <View style={styles.card}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              placeholder="Enter a new password"
              placeholderTextColor={Palette.onSurfaceMuted}
              secureTextEntry
              autoComplete="new-password"
            />
            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              placeholder="Confirm your new password"
              placeholderTextColor={Palette.onSurfaceMuted}
              secureTextEntry
              autoComplete="new-password"
            />
            <Pressable
              onPress={() => void submitNewPassword()}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Updating password...' : 'Update password'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Registered email address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="Enter your email address"
              placeholderTextColor={Palette.onSurfaceMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Text style={styles.helper}>
              We will send a secure recovery link to this email. Open the link in the app to choose a new password.
            </Text>
            <Pressable
              onPress={() => void submitRecoveryRequest()}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Sending recovery link...' : 'Send recovery link'}
              </Text>
            </Pressable>
          </View>
        )}

        {!isPasswordRecovery ? (
          <Pressable onPress={onBackToLogin} style={styles.footerButton}>
            <Text style={styles.footerText}>Remembered your details? </Text>
            <Text style={styles.footerLink}>Back to sign in</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

function getStyles(Palette: ReturnType<typeof useApp>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: Palette.canvas },
    content: { flexGrow: 1, padding: 24, paddingTop: 20 },
    backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    backText: { color: Palette.onSurface, fontSize: 14, fontWeight: '600' },
    header: { alignItems: 'center', marginTop: 44, marginBottom: 28 },
    iconCircle: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Palette.primary + '18',
      marginBottom: 16,
    },
    title: { color: Palette.onSurface, fontSize: 26, fontWeight: '800' },
    subtitle: {
      color: Palette.onSurfaceMuted,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 330,
    },
    messageBox: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Palette.primary + '55',
      backgroundColor: Palette.primary + '12',
      padding: 12,
      marginBottom: 16,
    },
    messageText: { color: Palette.onSurface, fontSize: 13, lineHeight: 19 },
    card: {
      backgroundColor: Palette.surface,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: Palette.outline,
    },
    label: { color: Palette.onSurface, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 8 },
    input: {
      height: 50,
      borderWidth: 1,
      borderColor: Palette.outline,
      borderRadius: 10,
      paddingHorizontal: 14,
      color: Palette.onSurface,
      fontSize: 15,
      backgroundColor: Palette.canvas,
    },
    helper: { color: Palette.onSurfaceMuted, fontSize: 12, lineHeight: 18, marginTop: 12 },
    primaryButton: {
      height: 50,
      borderRadius: 10,
      backgroundColor: Palette.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    primaryButtonText: { color: Palette.onPrimary, fontSize: 14, fontWeight: '800' },
    disabled: { opacity: 0.6 },
    footerButton: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { color: Palette.onSurfaceMuted, fontSize: 13 },
    footerLink: { color: Palette.primary, fontSize: 13, fontWeight: '700' },
  });
}
