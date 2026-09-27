import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { apiPost, ApiError } from '@/lib/api';
import { PaletteType, Typography } from '@/constants/theme';
import { authenticateBiometric } from '@/lib/biometricAuth';

type AppLockScreenProps = { theme: PaletteType; onUnlock: () => void };

export const AppLockScreen: React.FC<AppLockScreenProps> = ({ theme, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const submit = async (value: string) => {
    if (value.length !== 4 || checking) return;
    setChecking(true);
    setErrorMessage('');
    try {
      await apiPost('/me/app-lock/verify', { pin: value });
      onUnlock();
    } catch (error) {
      setErrorMessage(error instanceof ApiError && error.status !== 401 ? error.message : 'Wrong PIN');
      setPin('');
    } finally {
      setChecking(false);
    }
  };
  const press = (key: string) => {
    if (key === 'fingerprint') {
      if (checking) return;
      setChecking(true);
      void authenticateBiometric('Unlock AbbaKano').then((authenticated) => {
        if (authenticated) onUnlock();
      }).finally(() => setChecking(false));
      return;
    }
    if (key === 'backspace') return setPin((current) => current.slice(0, -1));
    setErrorMessage('');
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) void submit(next);
  };
  return <View style={[styles.container, { backgroundColor: theme.canvas }]}>
    <MaterialIcons name="lock" size={42} color={theme.primary} />
    <Text style={[styles.title, { color: theme.onSurface }]}>App Locked</Text>
    <Text style={[styles.subtitle, { color: theme.onSurfaceVariant }]}>Enter your 4-digit PIN to continue</Text>
    <View style={styles.dots}>{[0, 1, 2, 3].map((index) => <View key={index} style={[styles.dot, { borderColor: theme.primary }, pin.length > index && { backgroundColor: theme.primary }]} />)}</View>
    {checking && <View style={styles.checkingRow}><ActivityIndicator size="small" color={theme.primary} /><Text style={[styles.checkingText, { color: theme.onSurfaceVariant }]}>Verifying PIN...</Text></View>}
    {errorMessage && <Text style={[styles.errorText, { color: theme.error }]}>{errorMessage}</Text>}
    <View style={styles.pad}>{['1','2','3','4','5','6','7','8','9','fingerprint','0','backspace'].map((key) => <Pressable key={key} onPress={() => press(key)} disabled={checking} style={styles.key}>{key === 'fingerprint' ? <MaterialIcons name="fingerprint" size={28} color={theme.onSurface} /> : key === 'backspace' ? <MaterialIcons name="backspace" size={22} color={theme.onSurface} /> : <Text style={[styles.digit, { color: theme.onSurface }]}>{key}</Text>}</Pressable>)}</View>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', fontFamily: Typography.family },
  subtitle: { fontSize: 14, fontFamily: Typography.family, marginBottom: 14 },
  checkingRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checkingText: { fontSize: 13, fontFamily: Typography.family },
  errorText: { fontSize: 13, fontWeight: '700', fontFamily: Typography.family, marginBottom: 8 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pad: { width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  key: { width: 76, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  digit: { fontSize: 26, fontWeight: '600' },
});