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
