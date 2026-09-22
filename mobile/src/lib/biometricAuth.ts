import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, apiPost } from '@/lib/api';

const DEVICE_TOKEN_KEY = 'abbakano.device.token';
const TRANSACTION_PIN_KEY = 'abbakano.transaction.pin';

export function supportsBiometrics(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
  if (!supportsBiometrics()) return false;
  const hardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hardware || !enrolled) return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    fallbackLabel: 'Use device PIN',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function registerBiometricDevice(): Promise<void> {
  if (!supportsBiometrics()) return;
  const response = await apiPost<{ deviceToken: string }>('/auth/device/register', {
    platform: Platform.OS,
  });
  await SecureStore.setItemAsync(DEVICE_TOKEN_KEY, response.deviceToken, {
    requireAuthentication: true,
  });
}

export async function disableBiometricDevice(): Promise<void> {
  if (supportsBiometrics()) {
    await apiRequest('/auth/device', { method: 'DELETE' });
    await SecureStore.deleteItemAsync(DEVICE_TOKEN_KEY);
  }
}

export async function biometricLogin(): Promise<boolean> {
  if (!await authenticateBiometric('Sign in to AbbaKano')) return false;
  const deviceToken = await SecureStore.getItemAsync(DEVICE_TOKEN_KEY, {
    requireAuthentication: true,
  });
  if (!deviceToken) return false;
  await apiRequest('/auth/device/login', {
    method: 'POST',
    headers: { Authorization: `Bearer ${deviceToken}` },
    body: JSON.stringify({}),
  });
  return true;
}

export async function saveTransactionPin(pin: string): Promise<void> {
  if (!supportsBiometrics()) return;
  await SecureStore.setItemAsync(TRANSACTION_PIN_KEY, pin, {
    requireAuthentication: true,
  });
}

export async function getBiometricTransactionPin(): Promise<string | null> {
  if (!await authenticateBiometric('Authorize purchase')) return null;
  try {
    return await SecureStore.getItemAsync(TRANSACTION_PIN_KEY, {
      requireAuthentication: true,
    });
  } catch {
    return null;
  }
}
