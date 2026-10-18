import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return jsonResponse({ message: "Missing authorization." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!supabaseUrl || !anonKey || !rawSecretKeys) {
      console.error("Wallet summary function configuration is incomplete.");
      return jsonResponse({ message: "Wallet summary is temporarily unavailable." }, 500);
    }

    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      return jsonResponse({ message: "Wallet summary is temporarily unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: wallet, error: walletError }, { data: holds, error: holdsError }] =
      await Promise.all([
        admin.from("wallets").select("balance_kobo, currency").eq("user_id", user.id).maybeSingle(),
        admin.from("wallet_reservations").select("amount_kobo").eq("user_id", user.id).eq("status", "held"),
      ]);
    if (walletError || holdsError) throw walletError || holdsError;

    const postedBalanceKobo = Number(wallet?.balance_kobo || 0);
    const heldBalanceKobo = (holds || []).reduce(
      (total, hold) => total + Number(hold.amount_kobo || 0),
      0,
    );

    return jsonResponse({
      postedBalanceKobo,
      heldBalanceKobo,
      availableBalanceKobo: Math.max(0, postedBalanceKobo - heldBalanceKobo),
      currency: wallet?.currency || "NGN",
    });
  } catch (error) {
    console.error("wallet-summary error:", error);
    return jsonResponse({ message: "Could not load your wallet summary." }, 500);
  }
});
