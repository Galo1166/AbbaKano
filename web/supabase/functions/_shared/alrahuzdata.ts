/**
 * Shared client and utilities for ALRAHUZDATA API (alrahuzdata.com.ng)
 * Built on MSORG developer VTU API specification.
 */

export const ALRAHUZ_BASE_URL = "https://alrahuzdata.com.ng/api";

/**
 * Standard Network ID mappings for Alrahuzdata / MSORG:
 * 1: MTN
 * 2: GLO
 * 3: 9MOBILE
 * 4: AIRTEL
 */
export const ALRAHUZ_NETWORK_IDS: Record<string, number> = {
  MTN: 1,
  GLO: 2,
  "9MOBILE": 3,
  AIRTEL: 4,
};

export interface AlrahuzUserResponse {
  user?: {
    username?: string;
    email?: string;
    phone?: string;
    account_type?: string;
  };
  wallet_balance?: number | string;
  status?: string;
  [key: string]: unknown;
}

export interface AlrahuzTopupRequest {
  network: number;
  amount: number;
  mobile_number: string;
  Ported_number: boolean;
  airtime_type: "VTU" | "Share and Sell";
}

export interface AlrahuzDataRequest {
  network: number;
  mobile_number: string;
  plan: number;
  Ported_number: boolean;
}

export interface AlrahuzApiResponse {
  id?: number | string;
  status?: string;
  Status?: string;
  msg?: string;
  message?: string;
  detail?: string;
  error?: unknown;
  [key: string]: unknown;
}

/**
 * Make an authenticated call to Alrahuzdata API.
 */
export async function callAlrahuzApi<T = AlrahuzApiResponse>(
  endpoint: string,
  options: {
    method?: "GET" | "POST";
    token: string;
    body?: Record<string, unknown>;
    timeoutMs?: number;
  },
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const { method = "GET", token, body, timeoutMs = 30000 } = options;
  const url = `${ALRAHUZ_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Token ${token.trim()}`,
    Accept: "application/json",
  };

  const init: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  };

  if (method === "POST" && body) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, init);
    const data = (await response.json().catch(() => null)) as T | null;

    if (!response.ok) {
      const errObj = data as Record<string, unknown> | null;
      const errorMsg =
        (typeof errObj?.detail === "string" && errObj.detail) ||
        (typeof errObj?.message === "string" && errObj.message) ||
        (typeof errObj?.msg === "string" && errObj.msg) ||
        (errObj?.error ? JSON.stringify(errObj.error) : `HTTP ${response.status}`);

      return {
        ok: false,
        status: response.status,
        data,
        error: errorMsg,
      };
    }

    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 500,
      data: null,
      error: errorMsg,
    };
  }
}

/**
 * Determine whether a purchase/topup response from Alrahuzdata is successful or pending.
 */
export function isAlrahuzSuccess(data: AlrahuzApiResponse | null): boolean {
  if (!data) return false;
  const statusStr = String(data.Status || data.status || "").toLowerCase();
  return statusStr === "successful" || statusStr === "success";
}

export function isAlrahuzPending(data: AlrahuzApiResponse | null): boolean {
  if (!data) return false;
  const statusStr = String(data.Status || data.status || "").toLowerCase();
  return statusStr === "processing" || statusStr === "pending";
}
