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
    return new Response("ok", { headers: corsHeaders });
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
      console.error("Admin overview function configuration is incomplete.");
      return jsonResponse({ message: "Admin overview is unavailable." }, 500);
    }
    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Admin overview is unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);
    if (user.app_metadata.admin_role !== "super_admin") {
      return jsonResponse({ message: "Super-admin access is required." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const requestedDays = Number(body?.days);
    const days = requestedDays === 7 || requestedDays === 30 ? requestedDays : 1;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabaseAdmin.rpc(
      "get_admin_overview_snapshot",
      { p_days: days },
    );
    if (error) throw error;
    if (!data || typeof data !== "object") {
      throw new Error("Admin overview query returned an invalid result.");
    }
    return jsonResponse(data);
  } catch (error) {
    console.error("admin-overview error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not load admin overview." },
      500,
    );
  }
});
