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

async function recordAuditEvent(
  admin: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  details: Record<string, unknown>,
  request: Request,
) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
  const { error } = await admin.from("admin_audit_logs").insert({
    actor_user_id: userId,
    actor_role: "SUPER_ADMIN",
    action,
    details,
    ip_address: ipAddress,
  });
  if (error) throw error;
}

const networks = ["MTN", "AIRTEL", "GLO", "9MOBILE"];
const categories = ["GENERAL", "SME", "GIFTING", "DIRECT"];
const durations = ["daily", "weekly", "monthly"];

function capacityToMb(value: string) {
  const match = value.trim().toUpperCase().match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  const multiplier = { KB: 0.001, MB: 1, GB: 1000, TB: 1000000 }[match[2] as "KB" | "MB" | "GB" | "TB"];
  const capacityMb = amount * multiplier;
  return Number.isSafeInteger(capacityMb) && capacityMb >= 1 && capacityMb <= 1000000
    ? capacityMb
    : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return jsonResponse({ message: "Missing authorization." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!supabaseUrl || !anonKey || !rawSecretKeys) {
      console.error("Admin VTU plans function configuration is incomplete.");
      return jsonResponse({ message: "VTU plans are unavailable." }, 500);
    }
    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys && typeof secretKeys === "object" && "default" in secretKeys
      ? secretKeys.default
      : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "VTU plans are unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);
    if (user.app_metadata.admin_role !== "super_admin") {
      return jsonResponse({ message: "Super-admin access is required." }, 403);
    }

    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ message: "Invalid request body." }, 400);
    }
    const body = parsed as Record<string, unknown>;
    const action = body.action === "list" || body.action === "create" ||
      body.action === "update" || body.action === "delete" ? body.action : null;
    if (!action) return jsonResponse({ message: "Choose a valid plan action." }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    if (action === "list") {
      const { data, error } = await admin
        .from("admin_vtu_plans")
        .select("id, network, category, capacity, capacity_mb, duration, price_kobo, enabled, created_at, updated_at")
        .order("network")
        .order("category")
        .order("capacity_mb");
      if (error) throw error;
      return jsonResponse({ plans: data || [] });
    }

    const network = typeof body.network === "string" ? body.network.trim().toUpperCase() : "";
    const category = typeof body.category === "string" ? body.category.trim().toUpperCase() : "";
    const duration = typeof body.duration === "string" ? body.duration.trim().toLowerCase() : "";
    const capacity = typeof body.capacity === "string" ? body.capacity.trim().toUpperCase() : "";
    const capacityMb = capacityToMb(capacity);
    const price = Number(body.price);
    if (!networks.includes(network) || !categories.includes(category) || !durations.includes(duration)) {
      return jsonResponse({ message: "Choose a valid network, category, and duration." }, 400);
    }
    if (capacityMb === null) {
      return jsonResponse({ message: "Capacity must use a whole-number size such as 3GB or 3072MB." }, 400);
    }
    if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
      return jsonResponse({ message: "Price must be greater than zero and no more than ₦1,000,000." }, 400);
    }
    const values = {
      network,
      category,
      capacity,
      capacity_mb: capacityMb,
      duration,
      price_kobo: Math.round(price * 100),
      enabled: typeof body.enabled === "boolean" ? body.enabled : true,
      updated_at: new Date().toISOString(),
    };

    if (action === "create") {
      const { data, error } = await admin.from("admin_vtu_plans").insert(values)
        .select("id, network, category, capacity, capacity_mb, duration, price_kobo, enabled, created_at, updated_at")
        .single();
      if (error) throw error;
      await recordAuditEvent(admin, user.id, "admin.vtu_plan_created", {
        planId: data.id,
        network: data.network,
        category: data.category,
        capacity: data.capacity,
        duration: data.duration,
        price: Number(data.price_kobo) / 100,
        enabled: data.enabled,
      }, req);
      return jsonResponse({ plan: data }, 201);
    }

    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return jsonResponse({ message: "A valid plan ID is required." }, 400);
    if (action === "delete") {
      const { data: existingPlan, error: lookupError } = await admin
        .from("admin_vtu_plans")
        .select("id, network, category, capacity, capacity_mb, duration, price_kobo, enabled")
        .eq("id", id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!existingPlan) return jsonResponse({ message: "Plan not found." }, 404);
      const { error } = await admin.from("admin_vtu_plans").delete().eq("id", id);
      if (error) throw error;
      await recordAuditEvent(admin, user.id, "admin.vtu_plan_deleted", {
        planId: existingPlan.id,
        network: existingPlan.network,
        category: existingPlan.category,
        capacity: existingPlan.capacity,
        duration: existingPlan.duration,
        price: Number(existingPlan.price_kobo) / 100,
        enabled: existingPlan.enabled,
      }, req);
      return jsonResponse({ deleted: true });
    }
    const { data, error } = await admin.from("admin_vtu_plans").update(values).eq("id", id)
      .select("id, network, category, capacity, capacity_mb, duration, price_kobo, enabled, created_at, updated_at")
      .single();
    if (error) throw error;
    await recordAuditEvent(admin, user.id, "admin.vtu_plan_updated", {
      planId: data.id,
      network: data.network,
      category: data.category,
      capacity: data.capacity,
      duration: data.duration,
      price: Number(data.price_kobo) / 100,
      enabled: data.enabled,
    }, req);
    return jsonResponse({ plan: data });
  } catch (error) {
    console.error("admin-vtu-plans error:", error);
    return jsonResponse({ message: error instanceof Error ? error.message : "Could not update VTU plans." }, 500);
  }
});
