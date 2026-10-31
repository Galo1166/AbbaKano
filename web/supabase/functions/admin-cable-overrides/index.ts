import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordAdminAuditEvent as recordAuditEvent } from "../_shared/admin-audit.ts";
import { ALRAHUZ_NETWORK_IDS, callAlrahuzApi } from "../_shared/alrahuzdata.ts";

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

function normalizeNetwork(value: unknown): string {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const supportedProviders = ["DSTV", "GOTV", "STARTIMES", "MTN", "AIRTEL", "GLO", "9MOBILE"];

async function fetchVtuGate(
  baseUrl: string,
  apiKey: string,
  endpoint: string,
  params: Record<string, string> = {},
) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== true) {
    throw new Error(
      payload?.message || `VTU Gate request failed with HTTP ${response.status}`,
    );
  }
  return payload;
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
    const alrahuzToken = Deno.env.get("ALRAHUZDATA_API_TOKEN") || Deno.env.get("ALRAHUZ_API_TOKEN");
    const baseUrl = (Deno.env.get("VTU_GATE_BASE_URL") || "https://api.vtugate.com/api/v1").replace(/\/$/, "");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

    if (!supabaseUrl || !anonKey || !rawSecretKeys) {
      console.error("Admin price overrides function configuration is incomplete.");
      return jsonResponse({ message: "Price overrides are unavailable." }, 500);
    }
    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys && typeof secretKeys === "object" && "default" in secretKeys
      ? secretKeys.default
      : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Price overrides are unavailable." }, 500);
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
    const action = typeof body.action === "string" ? body.action : "";
    const admin = createClient(supabaseUrl, serviceKey);

    // ── 1. LIST OVERRIDES ──────────────────────────────────────
    if (action === "list") {
      let query = admin
        .from("price_overrides")
        .select("id, provider, plan_code, price, enabled, label, created_at, updated_at")
        .order("provider")
        .order("plan_code");

      if (typeof body.provider === "string" && body.provider.trim()) {
        query = query.eq("provider", body.provider.trim().toUpperCase());
      }
      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse({ overrides: data || [] });
    }

    // ── 2. FETCH PROVIDER LIVE DATA PLANS WITH OVERRIDES ──────
    if (action === "fetch_provider_plans") {
      const provider = typeof body.provider === "string" ? body.provider.trim().toUpperCase() : "";
      if (!supportedProviders.includes(provider)) {
        return jsonResponse({ message: "Choose a valid provider." }, 400);
      }
      if (!apiKey && !alrahuzToken) {
        return jsonResponse({ message: "VTU Provider API key is not configured." }, 500);
      }

      let rawPlans: Array<{
        plan_code: string;
        service_id: string;
        name: string;
        category: string;
        cost_price: number;
      }> = [];

      const isMobile = ["MTN", "AIRTEL", "GLO", "9MOBILE"].includes(provider);

      // If ALRAHUZDATA is active:
      if (alrahuzToken && (!apiKey || isMobile)) {
        try {
          const alrahuzUserRes = await callAlrahuzApi<Record<string, unknown>>("/user/", {
            method: "GET",
            token: alrahuzToken,
            timeoutMs: 15000,
          });

          if (alrahuzUserRes.ok && alrahuzUserRes.data) {
            const dataplans = alrahuzUserRes.data.Dataplans as Record<string, unknown> | undefined;
            const networkKey = `${provider}_PLAN`;
            const networkPlansGroup = dataplans?.[networkKey] as Record<string, unknown> | undefined;
            const plansList = (Array.isArray(networkPlansGroup?.ALL)
              ? networkPlansGroup.ALL
              : []) as Record<string, unknown>[];

            rawPlans = plansList
              .map((p) => {
                const planId = String(p.id || p.dataplan_id || "");
                const planType = String(p.plan_type || "GENERAL");
                const sizeLabel = String(p.plan || "");
                const validity = String(p.month_validate || "");
                const displayName = `${sizeLabel} ${planType}${validity ? ` (${validity})` : ""}`;
                return {
                  plan_code: planId,
                  service_id: String(p.network || ALRAHUZ_NETWORK_IDS[provider] || "1"),
                  name: displayName,
                  category: planType.toUpperCase(),
                  cost_price: Number(p.plan_amount || 0),
                };
              })
              .filter((p) => p.plan_code && p.cost_price > 0);
          }
        } catch (alrahuzErr) {
          console.warn("ALRAHUZDATA admin plan fetch error:", alrahuzErr);
        }
      }

      // If VTU Gate is configured and no mobile plans loaded from Alrahuz:
      if (rawPlans.length === 0 && apiKey) {
        const servicesResponse = await fetchVtuGate(baseUrl, apiKey, "/fetchallservices");
        if (isMobile) {
          const services = (servicesResponse.data || []).filter(
            (service: Record<string, unknown>) =>
              service.service_type === "data" &&
              normalizeNetwork(service.network_name) === provider,
          );

          const batches = await Promise.allSettled(
            services.map(async (service: Record<string, unknown>) => {
              const serviceId = String(service.service_id || "");
              if (!/^\d+$/.test(serviceId)) return [];

              const plansResponse = await fetchVtuGate(
                baseUrl,
                apiKey,
                "/fetchdataplans",
                { service_id: serviceId },
              );

              return (plansResponse.data?.data_plans || []).map((p: Record<string, unknown>) => ({
                plan_code: String(p.code || "").trim(),
                service_id: serviceId,
                name: String(p.name || "").trim(),
                category: String(service.data_type || "GENERAL").toUpperCase(),
                cost_price: Number(p.price || 0),
              })).filter((p: { plan_code: string; cost_price: number }) => p.plan_code && p.cost_price > 0);
            }),
          );

          rawPlans = batches.flatMap((b) => (b.status === "fulfilled" ? b.value : []));
        }
      }

      // Fetch DB overrides for this provider
      const { data: dbOverrides, error: dbError } = await admin
        .from("price_overrides")
        .select("id, provider, plan_code, price, enabled, label, updated_at")
        .eq("provider", provider);
      if (dbError) throw dbError;

      const overrideMap = new Map(
        (dbOverrides || []).map((row: { plan_code: string; price: number; enabled?: boolean; id: string; label?: string }) => [
          row.plan_code,
          row,
        ]),
      );

      const combinedPlans = rawPlans.map((p) => {
        const override = overrideMap.get(p.plan_code) || overrideMap.get(`${p.service_id}:${p.plan_code}`);
        const sellingPrice = override && Number.isFinite(override.price) ? Number(override.price) : p.cost_price;
        const enabled = override ? override.enabled === true : false;
        const margin = sellingPrice - p.cost_price;

        return {
          plan_code: p.plan_code,
          service_id: p.service_id,
          name: override?.label || p.name,
          category: p.category,
          cost_price: p.cost_price,
          selling_price: sellingPrice,
          enabled,
          has_override: Boolean(override),
          override_id: override?.id ?? null,
          margin,
        };
      });

      return jsonResponse({ plans: combinedPlans });
    }

    // ── Validate common fields for upsert / delete ───────────
    const provider = typeof body.provider === "string" ? body.provider.trim().toUpperCase() : "";
    const planCode = typeof body.plan_code === "string" ? body.plan_code.trim() : "";
    if (!supportedProviders.includes(provider)) {
      return jsonResponse({ message: `Choose a supported provider (${supportedProviders.join(", ")}).` }, 400);
    }
    if (!planCode) {
      return jsonResponse({ message: "A plan code is required." }, 400);
    }
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (["delete", "upsert"].includes(action) && (reason.length < 5 || reason.length > 500)) {
      return jsonResponse({ message: "Enter a reason of 5 to 500 characters for this price change." }, 400);
    }

    // ── 3. DELETE OVERRIDE ────────────────────────────────────
    if (action === "delete") {
      const { data: existing, error: lookupError } = await admin
        .from("price_overrides")
        .select("id, provider, plan_code, price")
        .eq("provider", provider)
        .eq("plan_code", planCode)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) return jsonResponse({ message: "Override not found." }, 404);
      const { error } = await admin.from("price_overrides").delete().eq("id", existing.id);
      if (error) throw error;
      await recordAuditEvent(admin, user.id, "admin.price_override_deleted", {
        provider: existing.provider,
        planCode: existing.plan_code,
        price: existing.price,
        reason,
      }, req);
      return jsonResponse({ deleted: true });
    }

    // ── 4. UPSERT OVERRIDE ────────────────────────────────────
    if (action === "upsert") {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
        return jsonResponse({ message: "Price must be greater than zero and no more than ₦1,000,000." }, 400);
      }
      const values = {
        provider,
        plan_code: planCode,
        price,
        enabled: typeof body.enabled === "boolean" ? body.enabled : true,
        label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : null,
        updated_at: new Date().toISOString(),
      };
      const { data: previous, error: previousError } = await admin
        .from("price_overrides")
        .select("provider, plan_code, price, enabled, label")
        .eq("provider", provider)
        .eq("plan_code", planCode)
        .maybeSingle();
      if (previousError) throw previousError;
      const { data, error } = await admin
        .from("price_overrides")
        .upsert(values, { onConflict: "provider,plan_code" })
        .select("id, provider, plan_code, price, enabled, label, created_at, updated_at")
        .single();
      if (error) throw error;
      await recordAuditEvent(admin, user.id, "admin.price_override_upserted", {
        provider: data.provider,
        planCode: data.plan_code,
        before: previous,
        after: data,
        price: data.price,
        enabled: data.enabled,
        reason,
      }, req);
      return jsonResponse({ override: data });
    }

    return jsonResponse({ message: "Invalid action." }, 400);
  } catch (error) {
    console.error("admin-cable-overrides error:", error);
    return jsonResponse({ message: error instanceof Error ? error.message : "Could not manage price overrides." }, 500);
  }
});
