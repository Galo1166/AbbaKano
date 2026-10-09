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
    const authorization = req.headers.get("Authorization");
    if (!authorization) return jsonResponse({ message: "Missing authorization." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!supabaseUrl || !anonKey || !rawSecretKeys) {
      console.error("Admin referral settings configuration is incomplete.");
      return jsonResponse({ message: "Referral settings are unavailable." }, 500);
    }

    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys && typeof secretKeys === "object" &&
        "default" in secretKeys
      ? secretKeys.default
      : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Referral settings are unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);
    if (user.app_metadata.admin_role !== "super_admin") {
      return jsonResponse({ message: "Super-admin access is required." }, 403);
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return jsonResponse({ message: "Invalid request body." }, 400);
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse({ message: "Invalid JSON request body." }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "get") {
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

    if (action === "update") {
      if (typeof body.enabled !== "boolean") {
        return jsonResponse({ message: "Referral enabled must be a boolean." }, 400);
      }
      if (
        !Number.isSafeInteger(body.signupRewardKobo) ||
        Number(body.signupRewardKobo) < 1
      ) {
        return jsonResponse({ message: "Enter a valid referral reward amount." }, 400);
      }

      const { data, error } = await supabaseAdmin
        .from("referral_program_settings")
        .update({
          enabled: body.enabled,
          signup_reward_kobo: Number(body.signupRewardKobo),
          updated_at: new Date().toISOString(),
        })
        .eq("id", true)
        .select("enabled, signup_reward_kobo")
        .single();
      if (error) throw error;
      return jsonResponse({
        enabled: data.enabled,
        signupRewardKobo: Number(data.signup_reward_kobo),
      });
    }

    return jsonResponse({ message: "Unsupported referral settings action." }, 400);
  } catch (error) {
    console.error("admin-referral-settings error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Referral settings request failed." },
      500,
    );
  }
});
