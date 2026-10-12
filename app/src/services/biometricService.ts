import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const LOGIN_CREDENTIALS_KEY = 'abbakano.biometric.login';
const TRANSACTION_PIN_KEY = 'abbakano.biometric.transaction-pin';

export async function authenticateBiometric(promptMessage: string) {
  const supported = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!supported || !enrolled) {
    throw new Error('Set up Face ID or fingerprint on this device first.');
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });
  if (!result.success) {
    throw new Error('Biometric verification was not completed.');
  }
}

export async function saveBiometricLogin(identifier: string, password: string) {
  await SecureStore.setItemAsync(
    LOGIN_CREDENTIALS_KEY,
    JSON.stringify({ identifier, password }),
  );
}

export async function getBiometricLogin(): Promise<{ identifier: string; password: string } | null> {
  const value = await SecureStore.getItemAsync(LOGIN_CREDENTIALS_KEY);
  if (!value) return null;
  try {
    const credentials = JSON.parse(value) as { identifier?: unknown; password?: unknown };
    if (typeof credentials.identifier !== 'string' || typeof credentials.password !== 'string') return null;
    return { identifier: credentials.identifier, password: credentials.password };
  } catch {
    return null;
  }
}

export async function clearBiometricLogin() {
  await SecureStore.deleteItemAsync(LOGIN_CREDENTIALS_KEY);
}

export async function saveBiometricTransactionPin(pin: string) {
  await SecureStore.setItemAsync(TRANSACTION_PIN_KEY, pin);
}

export async function getBiometricTransactionPin() {
  return SecureStore.getItemAsync(TRANSACTION_PIN_KEY);
}

export async function clearBiometricTransactionPin() {
  await SecureStore.deleteItemAsync(TRANSACTION_PIN_KEY);
}

const APP_LOCK_ENABLED_KEY = 'abbakano.security.app-lock-enabled';
const BIOMETRICS_ENABLED_KEY = 'abbakano.security.biometrics-enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const supported = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return supported && enrolled;
  } catch {
    return false;
  }
}

export async function isAppLockEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(APP_LOCK_ENABLED_KEY);
    // Defaults to true if user hasn't toggled it off
    return val !== 'false';
  } catch {
    return true;
  }
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(APP_LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function isBiometricsEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
    // Defaults to true if user hasn't toggled it off
    return val !== 'false';
  } catch {
    return true;
  }
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, enabled ? 'true' : 'false');
}

import { supabase, extractFunctionError } from '@/lib/supabase';

export async function checkUserHasPin(): Promise<boolean> {
  const localPin = await getBiometricTransactionPin();
  if (localPin && localPin.length === 4) return true;

  try {
    const { data, error } = await supabase.functions.invoke<{ hasPin?: boolean }>(
      'verify-transaction-pin',
      { body: { action: 'status' } }
    );
    if (!error && data && typeof data.hasPin === 'boolean') {
      return data.hasPin;
    }
    return false;
  } catch {
    return false;
  }
}

export async function verifyAppLockPin(pin: string): Promise<{ success: boolean; noPinSet?: boolean; message?: string }> {
  if (!pin || pin.length !== 4) {
    return { success: false, message: 'Enter a valid 4-digit PIN.' };
  }

  // 1. Check local SecureStore PIN first (fast path)
  const storedPin = await getBiometricTransactionPin();
  if (storedPin && storedPin.length === 4) {
    if (storedPin === pin) {
      return { success: true };
    }
    // Stored PIN exists on device and does not match entered PIN
    return { success: false, message: 'Incorrect PIN. Please try again.' };
  }

  // 2. Validate against Supabase Edge Function 'verify-transaction-pin' if not stored locally
  try {
    const { data, error } = await supabase.functions.invoke<{ verified?: boolean; message?: string }>(
      'verify-transaction-pin',
      { body: { pin } }
    );

    if (error) {
      const errorMsg = await extractFunctionError(error, 'Incorrect PIN. Please try again.');
      if (errorMsg.toLowerCase().includes('no transaction pin is currently set')) {
        return {
          success: false,
          noPinSet: true,
          message: 'No PIN is set on this account. Unlock with biometrics, then tap Set PIN in Profile.',
        };
      }
      return { success: false, message: 'Incorrect PIN. Please try again.' };
    }

    if (data?.verified) {
      // Sync valid PIN to local SecureStore for fast offline/subsequent unlocks
      await saveBiometricTransactionPin(pin);
      return { success: true };
    }

    return { success: false, message: data?.message || 'Incorrect PIN. Please try again.' };
  } catch {
    return { success: false, message: 'Incorrect PIN. Please try again.' };
  }
}

