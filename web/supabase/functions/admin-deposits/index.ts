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
      console.error("Admin deposits function configuration is incomplete.");
      return jsonResponse({ message: "Admin deposits are unavailable." }, 500);
    }

    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys && typeof secretKeys === "object" && "default" in secretKeys
      ? secretKeys.default
      : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Admin deposits are unavailable." }, 500);
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

    if (body.action === "mark_failed") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (typeof body.depositId !== "string" || !/^[1-9]\d*$/.test(body.depositId)) {
        return jsonResponse({ message: "A valid deposit ID is required." }, 400);
      }
      if (reason.length < 5 || reason.length > 500) {
        return jsonResponse({ message: "Enter a reason of 5 to 500 characters for failing this deposit." }, 400);
      }
      const depositId = Number(body.depositId);
      if (!Number.isSafeInteger(depositId)) {
        return jsonResponse({ message: "A valid deposit ID is required." }, 400);
      }
      const supabaseAdmin = createClient(supabaseUrl, serviceKey);
      const { data, error } = await supabaseAdmin.rpc("admin_fail_pending_deposit", {
        p_deposit_id: depositId,
        p_actor_user_id: user.id,
        p_reason: reason,
      });
      if (error) throw error;
      if (!data || typeof data !== "object" || typeof data.success !== "boolean") {
        throw new Error("Deposit status update returned an invalid result.");
      }
      if (!data.success) {
        return jsonResponse({ message: data.message }, data.message === "Deposit not found." ? 404 : 409);
      }
      return jsonResponse(data);
    }
    if (body.action !== undefined) {
      return jsonResponse({ message: "Unsupported deposit action." }, 400);
    }

    const page = Number.isInteger(body.page) ? Number(body.page) : 1;
    const pageSize = Number.isInteger(body.pageSize) ? Number(body.pageSize) : 20;
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return jsonResponse({ message: "Invalid page or page size." }, 400);
    }

    const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
    if (status && !["pending", "success", "failed"].includes(status)) {
      return jsonResponse({ message: "Invalid deposit status filter." }, 400);
    }
    const search = typeof body.search === "string" ? body.search.trim() : "";
    if (search.length > 120) {
      return jsonResponse({ message: "Search term is too long." }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabaseAdmin.rpc("get_admin_deposits", {
      p_page: page,
      p_page_size: pageSize,
      p_status: status || null,
      p_search: search || null,
    });
    if (error) throw error;
    if (!data || typeof data !== "object" || !Array.isArray(data.deposits)) {
      throw new Error("Admin deposits query returned an invalid result.");
    }
    return jsonResponse(data);
  } catch (error) {
    console.error("admin-deposits error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not load admin deposits." },
      500,
    );
  }
});
