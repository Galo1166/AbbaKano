const DEFAULT_API_URL = 'http://localhost:3000';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

let csrfTokenValue: string | undefined;
let authTokenValue: string | undefined;

function storedAuthToken(): string | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  return localStorage.getItem('abbakano_auth_token') || undefined;
}

function saveAuthToken(token: string): void {
  authTokenValue = token;
  if (typeof localStorage !== 'undefined') localStorage.setItem('abbakano_auth_token', token);
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  return document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function csrfToken(): string | undefined {
  return csrfTokenValue || getCookie('csrf');
}

export function clearAuthToken(): void {
  authTokenValue = undefined;
  if (typeof localStorage !== 'undefined') localStorage.removeItem('abbakano_auth_token');
}

export function hasAuthToken(): boolean {
  return Boolean(authTokenValue || storedAuthToken());
}

async function refreshCsrfToken(): Promise<string | undefined> {
  const response = await fetch(`${API_URL}/csrf`, { credentials: 'include' });
  if (!response.ok) return undefined;

  const data = await response.json() as { csrfToken?: unknown };
  csrfTokenValue = typeof data.csrfToken === 'string' ? data.csrfToken : undefined;
  return csrfTokenValue;
}

export function createIdempotencyKey(): string {
  const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `mobile-${randomPart}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const method = (init.method || 'GET').toUpperCase();
  const authToken = authTokenValue || storedAuthToken();
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
  let token = csrfToken();
  if (!token && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    token = await refreshCsrfToken();
  }
  if (token && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers.set('X-CSRF-Token', token);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  const data = await parseResponse(response);

  if (typeof data === 'object' && data !== null) {
    if ('csrfToken' in data && typeof data.csrfToken === 'string') {
      csrfTokenValue = data.csrfToken;
    }
    if ('authToken' in data && typeof data.authToken === 'string') {
      saveAuthToken(data.authToken);
    }
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'message' in data
      ? String(data.message)
      : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, body: unknown, options: { idempotencyKey?: string } = {}): Promise<T> {
  const headers = new Headers();
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);

  return apiRequest<T>(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
