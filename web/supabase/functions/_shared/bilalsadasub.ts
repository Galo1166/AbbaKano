export const BILALSADASUB_BASE_URL = "https://bilalsadasub.com";

export const BILALSADASUB_NETWORK_IDS: Record<string, number> = {
  MTN: 1,
  AIRTEL: 2,
  GLO: 3,
  "9MOBILE": 4,
};

export type BilalSadaSubResponse = Record<string, unknown> & {
  status?: string;
  message?: string;
  "request-id"?: string;
};

export async function callBilalSadaSub<T = BilalSadaSubResponse>(
  path: string,
  options: {
    method?: "GET" | "POST";
    token: string;
    body?: Record<string, unknown>;
    timeoutMs?: number;
  },
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const { method = "GET", token, body, timeoutMs = 30000 } = options;
  const response = await fetch(`${BILALSADASUB_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Token ${token.trim()}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await response.json().catch(() => null) as T | null;
  const payload = data && typeof data === "object"
    ? data as Record<string, unknown>
    : null;
  const error = typeof payload?.message === "string"
    ? payload.message
    : `BilalSadaSub request failed with HTTP ${response.status}.`;

  return {
    ok: response.ok,
    status: response.status,
    data,
    ...(response.ok ? {} : { error }),
  };
}

export function bilalSadaSubStatus(response: BilalSadaSubResponse | null): string {
  return String(response?.status || "").trim().toLowerCase();
}

export function bilalSadaSubTransactionStatus(
  response: BilalSadaSubResponse | null,
): string {
  const data = response?.data && typeof response.data === "object"
    ? response.data as Record<string, unknown>
    : null;
  return String(data?.transaction_status || "")
    .trim()
    .toLowerCase();
}
