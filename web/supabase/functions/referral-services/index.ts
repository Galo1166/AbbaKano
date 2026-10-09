import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!supabaseUrl || !anonKey || !rawSecretKeys) {
      console.error("Referral function configuration is incomplete.");
      return jsonResponse({ message: "Referral services are unavailable." }, 500);
    }
    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Referral services are unavailable." }, 500);
    }

    const body = await req.json();
    const action = String(body?.action || "summary");
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    if (action === "program_settings") {
      const { data, error } = await supabaseAdmin
        .from("referral_program_settings")
        .select("enabled, signup_reward_kobo")
        .eq("id", true)
        .single();
      if (error) throw error;
      return jsonResponse({
        enabled: data.enabled,
        signupRewardKobo: Number(data.signup_reward_kobo),
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ message: "Missing authorization." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);

    if (action === "summary") {
      const [{ data, error }, { data: settings, error: settingsError }] = await Promise.all([
        supabaseAdmin.rpc("get_referral_summary", { p_user_id: user.id }),
        supabaseAdmin
          .from("referral_program_settings")
          .select("enabled, signup_reward_kobo")
          .eq("id", true)
          .single(),
      ]);
      if (error) throw error;
      if (settingsError) throw settingsError;
      if (!data) return jsonResponse({ message: "Referral profile not found." }, 404);
      return jsonResponse({
        phone: data.phone || "",
        referralCount: Number(data.referral_count || 0),
        referralEarnings: Number(data.referral_earnings_kobo || 0) / 100,
        referralCommissionBalance:
          Number(data.referral_commission_balance_kobo || 0) / 100,
        referralsEnabled: settings.enabled,
        referralRewardNaira: Number(settings.signup_reward_kobo) / 100,
      });
    }

    if (action === "withdraw") {
      const { data, error } = await supabaseAdmin.rpc(
        "withdraw_referral_commission",
        { p_user_id: user.id },
      );
      if (error) {
        if (error.message.toLowerCase().includes("no referral commission")) {
          return jsonResponse({ message: "No referral commission is available to withdraw." }, 400);
        }
        throw error;
      }
      return jsonResponse({
        reference: data.reference,
        amount: Number(data.amount_kobo) / 100,
        walletBalance: Number(data.wallet_balance_kobo) / 100,
      });
    }

    return jsonResponse({ message: "Unsupported referral action." }, 400);
  } catch (error) {
    console.error("referral-services error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Referral request failed." },
      500,
    );
  }
});
