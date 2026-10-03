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

function normalize(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return jsonResponse({ message: "Missing authorization." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("VTUGATE_API_KEY");
    const baseUrl = (Deno.env.get("VTUGATE_BASE_URL") || "https://api.vtugate.com/api/v1").replace(/\/$/, "");
    if (!supabaseUrl || !anonKey || !apiKey) {
      console.error("Admin VTU services function configuration is incomplete.");
      return jsonResponse({ message: "VTU services are unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);
    if (user.app_metadata.admin_role !== "super_admin") {
      return jsonResponse({ message: "Super-admin access is required." }, 403);
    }

    const response = await fetch(`${baseUrl}/fetchallservices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.status !== true) {
      throw new Error(String(payload?.message || `VTU Gate request failed with HTTP ${response.status}.`));
    }

    const services = (Array.isArray(payload.data) ? payload.data : [])
      .map((service: Record<string, unknown>) => ({
        id: String(service.service_id || ""),
        type: normalize(service.service_type),
        network: normalize(service.network_name || service.network || service.tv_name || service.disco),
        name: String(service.name || service.service_name || service.tv_name || service.network_name || service.disco || "VTU service"),
      }))
      .filter((service: { id: string }) => /^\d+$/.test(service.id));

    return jsonResponse({
      provider: "VTUGATE",
      checkedAt: new Date().toISOString(),
      services,
    });
  } catch (error) {
    console.error("admin-vtu-services error:", error);
    return jsonResponse({
      message: error instanceof Error ? error.message : "Could not load VTU services.",
    }, 502);
  }
});
