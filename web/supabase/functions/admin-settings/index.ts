import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordAdminAuditEvent } from "../_shared/admin-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const carriers = [
  "MTN",
  "AIRTEL",
  "GLO",
  "9MOBILE",
  "AEDC",
  "IKEDC",
  "KEDCO",
  "PHED",
  "JED",
  "DSTV",
  "GOTV",
  "STARTIMES",
  "VTUGATE",
] as const;

const settingKeys = [
  "appMaintenanceMode",
  "maintenanceMessage",
  "alertPhoneNumbers",
  "lowBalanceThresholdNaira",
  "dualApprovalAmountThreshold",
  "maxSingleManualCredit",
  "vtuGatewayPrimary",
  "vtuGatewayFallback",
] as const;

const marginFields = {
  wholesaleBase: "wholesale_base",
  smeMargin: "sme_margin",
  giftingMargin: "gifting_margin",
  airtimePercent: "airtime_percent",
  isSalesActive: "is_sales_active",
} as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toMargin(row: Record<string, unknown>) {
  return {
    carrier: row.carrier,
    wholesaleBase: Number(row.wholesale_base),
    smeMargin: Number(row.sme_margin),
    giftingMargin: Number(row.gifting_margin),
    airtimePercent: Number(row.airtime_percent),
    isSalesActive: row.is_sales_active,
    lastUpdatedBy: row.updated_by,
    lastUpdatedAt: row.updated_at,
  };
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
      console.error("Admin settings function configuration is incomplete.");
      return jsonResponse({ message: "Admin settings are unavailable." }, 500);
    }

    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey =
      secretKeys && typeof secretKeys === "object" && "default" in secretKeys
        ? secretKeys.default
        : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Admin settings are unavailable." }, 500);
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
      if (!isRecord(parsed)) return jsonResponse({ message: "Invalid request body." }, 400);
      body = parsed;
    } catch {
      return jsonResponse({ message: "Invalid JSON request body." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    if (body.action === "get_margins") {
      const { data, error } = await admin
        .from("admin_margin_settings")
        .select("carrier, wholesale_base, sme_margin, gifting_margin, airtime_percent, is_sales_active, updated_by, updated_at")
        .order("carrier");
      if (error) throw error;
      return jsonResponse({ margins: (data || []).map((row) => toMargin(row)) });
    }

    if (body.action === "update_margin") {
      const carrier = typeof body.carrier === "string" ? body.carrier.trim().toUpperCase() : "";
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!carriers.includes(carrier as (typeof carriers)[number]) || !isRecord(body.update)) {
        return jsonResponse({ message: "Choose a valid carrier and margin update." }, 400);
      }
      if (reason.length < 5 || reason.length > 500) {
        return jsonResponse({ message: "Enter a reason of 5 to 500 characters for this margin change." }, 400);
      }
      const values: Record<string, unknown> = {};
      for (const [field, column] of Object.entries(marginFields)) {
        if (!(field in body.update)) continue;
        const value = body.update[field];
        if (field === "isSalesActive") {
          if (typeof value !== "boolean") {
            return jsonResponse({ message: "Sales status must be true or false." }, 400);
          }
        } else if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < 0 ||
          (field === "airtimePercent" && value > 100)
        ) {
          return jsonResponse({ message: `Enter a valid ${field} value.` }, 400);
        }
        values[column] = value;
      }
      if (Object.keys(values).length === 0) {
        return jsonResponse({ message: "No margin values were provided." }, 400);
      }

      const { data: previous, error: previousError } = await admin
        .from("admin_margin_settings")
        .select("carrier, wholesale_base, sme_margin, gifting_margin, airtime_percent, is_sales_active, updated_by, updated_at")
        .eq("carrier", carrier)
        .maybeSingle();
      if (previousError) throw previousError;
      if (!previous) return jsonResponse({ message: "Margin settings not found." }, 404);

      values.updated_by = user.email || "Super Admin";
      values.updated_at = new Date().toISOString();
      const { data, error } = await admin
        .from("admin_margin_settings")
        .update(values)
        .eq("carrier", carrier)
        .select("carrier, wholesale_base, sme_margin, gifting_margin, airtime_percent, is_sales_active, updated_by, updated_at")
        .single();
      if (error) throw error;
      await recordAdminAuditEvent(admin, user.id, "admin.margin_updated", {
        carrier,
        before: toMargin(previous),
        after: toMargin(data),
        reason,
      }, req);
      return jsonResponse({ success: true, data: toMargin(data), timestamp: data.updated_at });
    }

    if (body.action === "get_settings") {
      const { data, error } = await admin
        .from("admin_system_settings")
        .select("settings")
        .eq("id", true)
        .single();
      if (error) throw error;
      return jsonResponse(data.settings);
    }

    if (body.action === "update_settings") {
      if (!isRecord(body.settings)) {
        return jsonResponse({ message: "Invalid system settings." }, 400);
      }
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 5 || reason.length > 500) {
        return jsonResponse({ message: "Enter a reason of 5 to 500 characters for this settings change." }, 400);
      }
      const updates: Record<string, unknown> = {};
      for (const key of settingKeys) {
        if (!(key in body.settings)) continue;
        const value = body.settings[key];
        if (
          key === "appMaintenanceMode" &&
          typeof value !== "boolean"
        ) {
          return jsonResponse({ message: "Maintenance mode must be true or false." }, 400);
        }
        if (
          ["maintenanceMessage", "vtuGatewayPrimary", "vtuGatewayFallback"].includes(key) &&
          (typeof value !== "string" || value.length > 500)
        ) {
          return jsonResponse({ message: `Enter a valid ${key}.` }, 400);
        }
        if (
          ["lowBalanceThresholdNaira", "dualApprovalAmountThreshold", "maxSingleManualCredit"].includes(key) &&
          (typeof value !== "number" || !Number.isFinite(value) || value < 0)
        ) {
          return jsonResponse({ message: `Enter a valid ${key}.` }, 400);
        }
        if (
          key === "alertPhoneNumbers" &&
          (!Array.isArray(value) ||
            value.length > 20 ||
            value.some((phone) => typeof phone !== "string" || phone.length > 30))
        ) {
          return jsonResponse({ message: "Enter a valid list of alert phone numbers." }, 400);
        }
        updates[key] = value;
      }
      if (Object.keys(updates).length === 0) {
        return jsonResponse({ message: "No system settings were provided." }, 400);
      }

      const { data: current, error: readError } = await admin
        .from("admin_system_settings")
        .select("settings")
        .eq("id", true)
        .single();
      if (readError) throw readError;

      const { data, error } = await admin
        .from("admin_system_settings")
        .update({
          settings: { ...current.settings, ...updates },
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", true)
        .select("settings")
        .single();
      if (error) throw error;
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      for (const key of Object.keys(updates)) {
        if (key === "alertPhoneNumbers") {
          before[key] = "[redacted]";
          after[key] = "[redacted]";
        } else {
          before[key] = current.settings[key];
          after[key] = data.settings[key];
        }
      }
      await recordAdminAuditEvent(admin, user.id, "admin.system_settings_updated", {
        changedKeys: Object.keys(updates),
        before,
        after,
        reason,
      }, req);
      return jsonResponse({
        success: true,
        data: data.settings,
        timestamp: new Date().toISOString(),
      });
    }

    return jsonResponse({ message: "Unsupported admin settings action." }, 400);
  } catch (error) {
    console.error("admin-settings error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Admin settings request failed." },
      500,
    );
  }
});
