import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDataPlanToken } from "../_shared/data-plan-token.ts";

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
      payload?.message ||
        `VTU Gate request failed with HTTP ${response.status}`,
    );
  }
  return payload;
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
    const apiKey = Deno.env.get("VTUGATE_API_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    if (!supabaseUrl || !anonKey || !apiKey || !rawSecretKeys) {
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

    const baseUrl = (Deno.env.get("VTU_GATE_BASE_URL") ||
      "https://api.vtugate.com/api/v1").replace(/\/$/, "");
    const servicesResponse = await fetchVtuGate(
      baseUrl,
      apiKey,
      "/fetchallservices",
    );
    const services = (servicesResponse.data || []).filter(
      (service: Record<string, unknown>) =>
        service.service_type === "data" &&
        normalizeNetwork(service.network_name) === network,
    );

    const batches = await Promise.allSettled(
      services.map(async (service: Record<string, unknown>) => {
        const serviceId = String(service.service_id || "");
        if (!/^\d+$/.test(serviceId)) return [];

        const response = await fetchVtuGate(
          baseUrl,
          apiKey,
          "/fetchdataplans",
          { service_id: serviceId },
        );
        const planCategory = normalizeCategory(service.data_type);
        if (category && category !== planCategory) return [];

        const plans = await Promise.all(
          (response.data?.data_plans || []).map(
            async (plan: Record<string, unknown>) => {
              const label = String(plan.name || "").trim();
              const planCode = String(plan.code || "").trim();
              const price = Number(plan.price);
              if (
                !label ||
                !planCode ||
                !Number.isFinite(price) ||
                price <= 0 ||
                price > 100000
              ) {
                return null;
              }

              const selectionToken = await createDataPlanToken(
                {
                  provider: "vtugate",
                  network,
                  label,
                  serviceId,
                  planCode,
                  price,
                },
                signingSecret,
              );
              return {
                label,
                price,
                code: `${serviceId}:${planCode}`,
                category: planCategory,
                provider: "vtugate",
                selectionToken,
              };
            },
          ),
        );
        return plans.filter(
          (plan): plan is Record<string, unknown> => plan !== null,
        );
      }),
    );

    const plans = batches.flatMap((batch) =>
      batch.status === "fulfilled" ? batch.value : [],
    );
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
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
    const allPlans = sortPlans([...plans, ...adminPlans]);
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
