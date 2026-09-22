import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { apiPost, apiRequest } from '@/lib/api';

type PasskeyOptionsResponse = Record<string, unknown>;

export function supportsPasskeys(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}

export async function registerPasskey(): Promise<void> {
  if (!supportsPasskeys()) throw new Error('Passkeys are not supported in this browser.');
  const options = await apiRequest<PasskeyOptionsResponse>('/auth/passkey/register/options', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const response = await startRegistration({ optionsJSON: options as never });
  await apiPost('/auth/passkey/register/verify', response);
}

export async function disablePasskey(): Promise<void> {
  await apiRequest('/auth/passkey', { method: 'DELETE' });
}

export async function loginWithPasskey(identifier: string): Promise<void> {
  if (!supportsPasskeys()) throw new Error('Passkeys are not supported in this browser.');
  const options = await apiPost<PasskeyOptionsResponse>('/auth/passkey/login/options', { identifier });
  const response = await startAuthentication({ optionsJSON: options as never });
  await apiPost('/auth/passkey/login/verify', { identifier, response });
}
