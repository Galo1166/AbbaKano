import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDataPlanToken } from "../_shared/data-plan-token.ts";
import { ALRAHUZ_NETWORK_IDS, callAlrahuzApi } from "../_shared/alrahuzdata.ts";
import { applyDisplayCapacity, formatDataCapacity } from "../_shared/data-capacity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const planCache = new Map<
  string,
  { expiresAt: number; plans: Record<string, unknown>[] }
>();

let alrahuzUserDataCache: { data: Record<string, unknown>; expiresAt: number } | null = null;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeNetwork(value: unknown): string {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeCategory(value: unknown): "GENERAL" | "SME" | "GIFTING" | "DIRECT" {
  const category = String(value || "").toLowerCase();
  if (category.includes("direct")) return "DIRECT";
  if (category.includes("sme")) return "SME";
  if (category.includes("gift") || category.includes("corp")) return "GIFTING";
  return "GENERAL";
}

function capacityInMb(label: string): number {
  const match = label.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();
  const multiplier = unit === "KB"
    ? 1 / 1024
    : unit === "GB"
      ? 1024
      : unit === "TB"
        ? 1024 * 1024
        : 1;
  return amount * multiplier;
}

function durationRank(label: string): number {
  const value = label.toLowerCase();
  if (/\b(hour|hourly)\b/.test(value)) return 1;
  if (/\b(day|daily)\b/.test(value)) return 2;
  if (/\b(week|weekly)\b/.test(value)) return 3;
  if (/\b(month|monthly|30\s*days?)\b/.test(value)) return 4;
  if (/\b(quarter|quarterly|90\s*days?)\b/.test(value)) return 5;
  if (/\b(year|yearly|annual)\b/.test(value)) return 6;
  return 99;
}

function sortPlans(plans: Record<string, unknown>[]) {
  return [...plans].sort((left, right) => {
    const capacityDifference =
      capacityInMb(String(left.label || "")) - capacityInMb(String(right.label || ""));
    if (capacityDifference !== 0) return capacityDifference;

    const durationDifference =
      durationRank(String(left.label || "")) - durationRank(String(right.label || ""));
    if (durationDifference !== 0) return durationDifference;

    const priceDifference = Number(left.price || 0) - Number(right.price || 0);
    if (priceDifference !== 0) return priceDifference;

    return String(left.label || "").localeCompare(String(right.label || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ message: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const alrahuzToken = Deno.env.get("ALRAHUZDATA_API_TOKEN") || Deno.env.get("ALRAHUZ_API_TOKEN");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!supabaseUrl || !anonKey || !alrahuzToken || !rawSecretKeys) {
      console.error("Data service function configuration is incomplete.");
      return jsonResponse({ message: "Data plans are temporarily unavailable." }, 500);
    }
    const secretKeys = JSON.parse(rawSecretKeys);
    const signingSecret = secretKeys.default;
    if (typeof signingSecret !== "string" || !signingSecret) {
      console.error("Supabase signing key is not configured.");
      return jsonResponse({ message: "Data plans are temporarily unavailable." }, 500);
    }
    const serviceKey = signingSecret;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const network = normalizeNetwork(body?.network);
    const category = body?.category
      ? normalizeCategory(body.category)
      : null;
    if (!["MTN", "AIRTEL", "GLO", "9MOBILE"].includes(network)) {
      return jsonResponse({ message: "Choose a supported network" }, 400);
    }

    const cacheKey = `${network}:${category || "ALL"}`;
    const cached = planCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return jsonResponse({ plans: cached.plans });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Batch-load all custom price overrides for this mobile network
    const { data: overrides } = await supabaseAdmin
      .from("price_overrides")
      .select("plan_code, price, enabled, label, display_capacity")
      .eq("provider", network);
    const overrideMap = new Map(
      (overrides || []).map((row: {
        plan_code: string;
        price: number;
        enabled?: boolean;
        label?: string;
        display_capacity?: string | null;
      }) => [
        row.plan_code,
        {
          price: Number(row.price),
          enabled: row.enabled !== false,
          label: row.label,
          display_capacity: row.display_capacity || null,
        },
      ]),
    );

    const plans: Record<string, unknown>[] = [];

    if (alrahuzToken) {
      try {
        let alrahuzData: Record<string, unknown> | null = null;
        if (alrahuzUserDataCache && alrahuzUserDataCache.expiresAt > Date.now()) {
          alrahuzData = alrahuzUserDataCache.data;
        } else {
          const userRes = await callAlrahuzApi<Record<string, unknown>>("/user/", {
            method: "GET",
            token: alrahuzToken,
            timeoutMs: 15000,
          });
          if (userRes.ok && userRes.data) {
            alrahuzData = userRes.data;
            alrahuzUserDataCache = { data: alrahuzData, expiresAt: Date.now() + 300000 };
          }
        }

        if (alrahuzData) {
          const dataplans = alrahuzData.Dataplans as Record<string, unknown> | undefined;
          const networkKey = `${network}_PLAN`;
          const networkPlansGroup = dataplans?.[networkKey] as Record<string, unknown> | undefined;
          const rawPlans = (Array.isArray(networkPlansGroup?.ALL)
            ? networkPlansGroup.ALL
            : []) as Record<string, unknown>[];

          const networkId = String(ALRAHUZ_NETWORK_IDS[network] || "1");

          for (const item of rawPlans) {
            const planId = String(item.id || item.dataplan_id || "");
            if (!planId) continue;

            const planType = String(item.plan_type || "GENERAL");
            const planCategory = normalizeCategory(planType);
            if (category && category !== planCategory) continue;

            const apiPrice = Number(item.plan_amount || 0);
            if (!Number.isFinite(apiPrice) || apiPrice <= 0) continue;

            const override =
              overrideMap.get(planId) ||
              overrideMap.get(`${networkId}:${planId}`) ||
              overrideMap.get(`alrahuz:${planId}`);

            // ALL plans are turned OFF by default until the admin explicitly enables/edits them
            if (!override || override.enabled !== true) {
              continue;
            }

            const finalPrice =
              override && Number.isFinite(override.price) && override.price > 0
                ? override.price
                : apiPrice;

            const sizeClean = String(item.plan || "").replace(/\.0+(GB|MB|TB|KB)/i, "$1");
            const validityClean = String(item.month_validate || "")
              .replace(/\{.*?\}/g, "")
              .replace(/validity/i, "")
              .trim();
            const baseLabel =
              override?.label ||
              `${sizeClean} ${planType}${validityClean ? ` - ${validityClean}` : ""}`;
            const displayCapacity =
              override?.display_capacity || formatDataCapacity(sizeClean);
            const displayLabel = applyDisplayCapacity(baseLabel, displayCapacity);

            const selectionToken = await createDataPlanToken(
              {
                provider: "alrahuzdata",
                network,
                label: displayLabel,
                serviceId: networkId,
                planCode: planId,
                price: finalPrice,
              },
              signingSecret,
            );

            plans.push({
              label: displayLabel,
              price: finalPrice,
              code: `alrahuz:${planId}`,
              category: planCategory,
              provider: "alrahuzdata",
              selectionToken,
            });
          }
        }
      } catch (alrahuzErr) {
        console.warn("ALRAHUZDATA live plan fetch error:", alrahuzErr);
      }
    }
    const { data: catalogPlans, error: catalogError } = await supabaseAdmin
      .from("admin_vtu_plans")
      .select("id, network, category, capacity, capacity_mb, duration, price_kobo, enabled")
      .eq("network", network)
      .eq("enabled", true)
      .order("capacity_mb");
    if (catalogError) {
      console.error("Admin data plan catalog load failed:", catalogError);
      throw new Error("Could not load data plans right now.");
    }

    const adminPlans = (catalogPlans || []).map((plan) => ({
      label: `${plan.capacity} - ${plan.duration}`,
      price: Number(plan.price_kobo) / 100,
      code: `admin:${plan.id}`,
      category: plan.category,
      provider: "admin-catalog",
      purchaseAvailable: false,
    }));
    const alrahuzPlans = plans.filter((plan) => plan.provider === "alrahuzdata");
    const allPlans = sortPlans([...alrahuzPlans, ...adminPlans]);
    if (allPlans.length === 0) {
      return jsonResponse({
        plans: [],
        message: "No data plans are currently available for this network and category.",
      });
    }

    const filteredPlans = category
      ? sortPlans(allPlans.filter((plan) => String(plan.category).toUpperCase() === category))
      : allPlans;
    planCache.set(cacheKey, { plans: filteredPlans, expiresAt: Date.now() + 30000 });
    return jsonResponse({ plans: filteredPlans });
  } catch (error) {
    console.error("data-services error:", error);
    return jsonResponse(
      { message: "Could not load data plans right now." },
      502,
    );
  }
});
