import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

export async function invokeSupabaseFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, { body });
  if (error) {
    const context = "context" in error ? error.context : undefined;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null) as
        | { message?: unknown }
        | null;
      if (typeof payload?.message === "string") {
        throw new Error(payload.message);
      }
    }
    throw new Error(error.message);
  }
  if (data === null) throw new Error(`${functionName} returned no response.`);
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