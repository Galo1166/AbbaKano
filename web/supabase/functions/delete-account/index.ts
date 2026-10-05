import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  const authorization = req.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return jsonResponse({ message: "Authentication required." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!supabaseUrl || !anonKey || !rawSecretKeys) {
    console.error("Account deletion function configuration is incomplete.");
    return jsonResponse({ message: "Account deletion is temporarily unavailable." }, 500);
  }

  try {
    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Account deletion is temporarily unavailable." }, 500);
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ message: "Your session has expired. Sign in and try again." }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Could not delete account:", deleteError);
      return jsonResponse({
        message: "Your account could not be deleted. Contact support@abbakano.com for help.",
      }, 409);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return jsonResponse({ message: "Account deletion is temporarily unavailable." }, 500);
  }
});
