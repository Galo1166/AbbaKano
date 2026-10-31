import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordAdminAuditEvent } from "../_shared/admin-audit.ts";

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
      console.error("Admin audit logs function configuration is incomplete.");
      return jsonResponse({ message: "Audit logs are unavailable." }, 500);
    }

    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys && typeof secretKeys === "object" && "default" in secretKeys
      ? secretKeys.default
      : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Audit logs are unavailable." }, 500);
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

    if (body.recordEvent !== undefined) {
      if (!["login", "logout", "page_view"].includes(String(body.recordEvent))) {
        return jsonResponse({ message: "Invalid admin session event." }, 400);
      }
      const path = typeof body.path === "string" ? body.path : "";
      if (
        body.recordEvent === "page_view" &&
        (!/^\/admin(?:\/[a-zA-Z0-9._~-]+)*$/.test(path) || path === "/admin/login")
      ) {
        return jsonResponse({ message: "Invalid admin page path." }, 400);
      }
      const supabaseAdmin = createClient(supabaseUrl, serviceKey);
      await recordAdminAuditEvent(
        supabaseAdmin,
        user.id,
        body.recordEvent === "page_view" ? "admin.page_view" : `admin.${body.recordEvent}`,
        {
          ...(body.recordEvent === "page_view" ? { path } : {}),
          userAgent: req.headers.get("user-agent")?.slice(0, 500) || "unknown",
        },
        req,
      );
      return jsonResponse({ success: true });
    }

    const page = Number.isInteger(body.page) ? Number(body.page) : 1;
    const pageSize = Number.isInteger(body.pageSize) ? Number(body.pageSize) : 30;
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return jsonResponse({ message: "Invalid page or page size." }, 400);
    }
    const action = typeof body.action === "string" ? body.action.trim() : "";
    if (action && !/^[a-zA-Z0-9._-]{1,80}$/.test(action)) {
      return jsonResponse({ message: "Invalid audit action filter." }, 400);
    }
    const search = typeof body.search === "string" ? body.search.trim() : "";
    if (search.length > 120) {
      return jsonResponse({ message: "Search term is too long." }, 400);
    }
    const stream = typeof body.stream === "string" ? body.stream : "all";
    if (!["all", "admin", "user"].includes(stream)) {
      return jsonResponse({ message: "Invalid audit stream." }, 400);
    }
    const from = typeof body.from === "string" ? body.from : "";
    const to = typeof body.to === "string" ? body.to : "";
    const isValidDate = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return jsonResponse({ message: "Invalid audit date filter." }, 400);
    }
    if (from && to && from > to) {
      return jsonResponse({ message: "The start date must be on or before the end date." }, 400);
    }
    const actorRole = typeof body.actorRole === "string" ? body.actorRole.trim().toUpperCase() : "";
    if (actorRole && !/^[A-Z_]{1,40}$/.test(actorRole)) {
      return jsonResponse({ message: "Invalid actor role filter." }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabaseAdmin.rpc("get_admin_audit_logs", {
      p_page: page,
      p_page_size: pageSize,
      p_action: action || null,
      p_search: search || null,
      p_stream: stream,
      p_from: from || null,
      p_to: to || null,
      p_actor_role: actorRole || null,
    });
    if (error) throw error;
    if (
      !data || typeof data !== "object" || !Array.isArray(data.auditLogs) ||
      typeof data.total !== "number" || typeof data.page !== "number" ||
      typeof data.pageSize !== "number" || !data.metrics ||
      typeof data.metrics !== "object" ||
      typeof data.metrics.totalEvents !== "number" ||
      typeof data.metrics.depositEvents !== "number" ||
      typeof data.metrics.vtuEvents !== "number" ||
      typeof data.metrics.adminEvents !== "number" ||
      !Array.isArray(data.actions) ||
      !Array.isArray(data.roles)
    ) {
      throw new Error("Audit log query returned an invalid result.");
    }
    return jsonResponse(data);
  } catch (error) {
    console.error("admin-audit-logs error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not load audit logs." },
      500,
    );
  }
});
