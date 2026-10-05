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
      console.error("Admin users function configuration is incomplete.");
      return jsonResponse({ message: "Admin users are unavailable." }, 500);
    }

    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys && typeof secretKeys === "object" && "default" in secretKeys
      ? secretKeys.default
      : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Admin users are unavailable." }, 500);
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

    const page = Number.isInteger(body.page) ? Number(body.page) : 1;
    const pageSize = Number.isInteger(body.pageSize) ? Number(body.pageSize) : 15;
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return jsonResponse({ message: "Invalid page or page size." }, 400);
    }

    const status = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
    if (status && status !== "ACTIVE" && status !== "BLOCKED") {
      return jsonResponse({ message: "Invalid account status filter." }, 400);
    }
    const search = typeof body.search === "string" ? body.search.trim() : "";
    if (search.length > 120) {
      return jsonResponse({ message: "Search term is too long." }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "update_status") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const nextStatus = typeof body.status === "string" ? body.status.toLowerCase() : "";
      if (!/^[0-9a-f-]{36}$/i.test(userId) || !["active", "blocked"].includes(nextStatus)) {
        return jsonResponse({ message: "Invalid account status update." }, 400);
      }

      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("role, status")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile || profile.role !== "user") {
        return jsonResponse({ message: "Customer account not found." }, 404);
      }

      const banDuration = nextStatus === "blocked" ? "876000h" : "none";
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { ban_duration: banDuration },
      );
      if (authUpdateError) throw authUpdateError;

      const { error: statusUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ status: nextStatus })
        .eq("id", userId);
      if (statusUpdateError) {
        const rollbackDuration = profile.status === "blocked" ? "876000h" : "none";
        const { error: rollbackError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { ban_duration: rollbackDuration },
        );
        if (rollbackError) {
          console.error("Could not roll back customer auth ban after status update failed:", rollbackError);
        }
        throw statusUpdateError;
      }

      return jsonResponse({ status: nextStatus });
    }

    if (action === "adjust_wallet") {
      const userId = typeof body.userId === "string" ? body.userId : "";
      const amountKobo = body.amountKobo;
      const direction = typeof body.direction === "string" ? body.direction : "";
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      const adjustmentId = typeof body.adjustmentId === "string" ? body.adjustmentId : "";
      if (
        !/^[0-9a-f-]{36}$/i.test(userId) ||
        !Number.isSafeInteger(amountKobo) ||
        Number(amountKobo) <= 0 ||
        !["credit", "debit"].includes(direction) ||
        !reason ||
        reason.length > 500 ||
        !/^[0-9a-f-]{36}$/i.test(adjustmentId)
      ) {
        return jsonResponse({ message: "Invalid wallet adjustment." }, 400);
      }

      const { data, error } = await supabaseAdmin.rpc("admin_adjust_user_wallet", {
        p_user_id: userId,
        p_admin_user_id: user.id,
        p_amount_kobo: amountKobo,
        p_direction: direction,
        p_reason: reason,
        p_adjustment_id: adjustmentId,
      });
      if (error) throw error;
      return jsonResponse(data);
    }

    if (action) {
      return jsonResponse({ message: "Unsupported admin user action." }, 400);
    }

    const { data, error } = await supabaseAdmin.rpc("get_admin_users", {
      p_page: page,
      p_page_size: pageSize,
      p_search: search || null,
      p_status: status || null,
    });
    if (error) throw error;
    if (
      !data || typeof data !== "object" || !Array.isArray(data.users) ||
      !data.metrics || typeof data.metrics !== "object"
    ) {
      throw new Error("Admin users query returned an invalid result.");
    }
    return jsonResponse(data);
  } catch (error) {
    console.error("admin-users error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not load admin users." },
      500,
    );
  }
});
