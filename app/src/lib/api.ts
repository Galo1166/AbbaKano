import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Default URLs:
// - Android Emulator: 10.0.2.2 maps to host machine localhost:3000
// - Production: https://abbakano.onrender.com
const DEFAULT_DEV_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const DEFAULT_PROD_URL = 'https://abbakano.onrender.com';

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? DEFAULT_DEV_URL : DEFAULT_PROD_URL)
).replace(/\/$/, '');

let authTokenValue: string | null = null;

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function setAuthToken(token: string | null): void {
  authTokenValue = token;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    if (token) localStorage.setItem('abbakano_auth_token', token);
    else localStorage.removeItem('abbakano_auth_token');
    return;
  }
  void (token
    ? SecureStore.setItemAsync('abbakano_auth_token', token)
    : SecureStore.deleteItemAsync('abbakano_auth_token'));
}

export async function getAuthToken(): Promise<string | null> {
  if (authTokenValue) return authTokenValue;
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem('abbakano_auth_token');
  }
  return SecureStore.getItemAsync('abbakano_auth_token');
}

export function clearAuthToken(): void {
  setAuthToken(null);
}

export function createIdempotencyKey(): string {
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `android-${Date.now()}-${randomPart}`;
}

export async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  // Identify native client to backend
  headers.set('X-Client-Platform', 'android');

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach Bearer token if user is authenticated
  const token = await getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Provide idempotency key for mutations if not provided
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', createIdempotencyKey());
  }

  const endpoint = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let payload: any;
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => ({}));
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && payload.message
        ? payload.message
        : typeof payload === 'string' && payload.length > 0
        ? payload
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  // Automatically store returned authToken on login/signup
  if (typeof payload === 'object' && payload !== null && payload.authToken) {
    setAuthToken(payload.authToken);
  }

  return payload as T;
}

export const api = {
  get: <T = any>(path: string, init?: RequestInit) =>
    apiRequest<T>(path, { ...init, method: 'GET' }),

  post: <T = any>(path: string, body?: any, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(path: string, body?: any, init?: RequestInit) =>
    apiRequest<T>(path, {
      ...init,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(path: string, init?: RequestInit) =>
    apiRequest<T>(path, { ...init, method: 'DELETE' }),
};
