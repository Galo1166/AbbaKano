import { createClient } from '@supabase/supabase-js';
import {
  GENERIC_SERVICE_ERROR,
  isServiceFailure,
  reportServiceFailure,
} from "@/lib/userFeedback";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

const rememberDeviceStorageKey = "abbakano-remember-device";

function browserStorageAdapter() {
  function selectedStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    const shouldRemember = window.localStorage.getItem(rememberDeviceStorageKey);
    return shouldRemember === "false" ? window.sessionStorage : window.localStorage;
  }

  return {
    getItem(key: string) {
      if (typeof window === "undefined") return null;
      const preferred = selectedStorage();
      const fallback = preferred === window.localStorage
        ? window.sessionStorage
        : window.localStorage;
      const value = preferred?.getItem(key) ?? fallback.getItem(key);
      if (value !== null && preferred && fallback.getItem(key) !== null) {
        preferred.setItem(key, value);
        fallback.removeItem(key);
      }
      return value;
    },
    setItem(key: string, value: string) {
      const preferred = selectedStorage();
      if (!preferred || typeof window === "undefined") return;
      preferred.setItem(key, value);
      const fallback = preferred === window.localStorage
        ? window.sessionStorage
        : window.localStorage;
      fallback.removeItem(key);
    },
    removeItem(key: string) {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  { auth: { storage: browserStorageAdapter() } },
);

export function setRememberDevicePreference(remember: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(rememberDeviceStorageKey, String(remember));
}

export async function invokeSupabaseFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, { body });
  if (error) {
    const context = "context" in error ? error.context : undefined;
    let message = error.message;
    let status: number | undefined;
    if (context instanceof Response) {
      status = context.status;
      const payload = await context.clone().json().catch(() => null) as
        | { message?: unknown }
        | null;
      if (typeof payload?.message === "string") {
        message = payload.message;
      }
    }
    if (isServiceFailure(message, status)) {
      reportServiceFailure(error);
      throw new Error(GENERIC_SERVICE_ERROR);
    }
    throw new Error(message);
  }
  if (data === null) {
    const error = new Error(`${functionName} returned no response.`);
    reportServiceFailure(error);
    throw new Error(GENERIC_SERVICE_ERROR);
  }
  return data;
}

export async function getWalletBalance(): Promise<number> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Authentication required.");

  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance_kobo")
    .eq("user_id", user.id)
    .single();

  if (walletError) throw walletError;
  return Number(wallet.balance_kobo) / 100;
}