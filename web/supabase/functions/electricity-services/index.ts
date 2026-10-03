import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDataPlanToken } from "../_shared/data-plan-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const providers = ["AEDC", "IKEDC", "KEDCO", "PHED", "JED"] as const;
const providerAliases: Record<string, string[]> = {
  AEDC: ["aedc"],
  IKEDC: ["ikedc"],
  KEDCO: ["kedco"],
  PHED: ["phed", "portharcourt"],
  JED: ["jed", "jos"],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeProvider(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeName(payload: Record<string, unknown>) {
  const containers = [
    payload.data?.customer,
    payload.data?.customer_details,
    payload.data?.customerDetails,
    payload.data,
    payload.customer,
    payload.result,
    payload,
  ];
  const fields = [
    "customer_name",
    "customerName",
    "name",
    "account_name",
    "accountName",
  ];
  for (const container of containers) {
    if (!container || typeof container !== "object") continue;
    for (const field of fields) {
      const value = (container as Record<string, unknown>)[field];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
}

async function vtuGateRequest(
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
      String(
        payload?.message ||
          `VTU Gate request failed with HTTP ${response.status}.`,
      ),
    );
  }
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ message: "Missing authorization." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    const apiKey = Deno.env.get("VTUGATE_API_KEY");
    if (!supabaseUrl || !anonKey || !rawSecretKeys || !apiKey) {
      console.error("Electricity services function configuration is incomplete.");
      return jsonResponse({ message: "Electricity services are unavailable." }, 500);
    }

    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Electricity services are unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);

    const body = await req.json();
    const provider = normalizeProvider(body?.provider);
    const action = String(body?.action || "");
    const meterNumber = String(body?.meterNumber || "").replace(/\D/g, "");
    if (!providers.includes(provider as typeof providers[number])) {
      return jsonResponse({ message: "Choose a supported electricity provider." }, 400);
    }
    if (!["plans", "verify-meter"].includes(action)) {
      return jsonResponse({ message: "Choose a valid electricity service action." }, 400);
    }
    if (action === "verify-meter" && !/^\d{8,14}$/.test(meterNumber)) {
      return jsonResponse({ message: "Enter a valid meter number." }, 400);
    }

    const baseUrl = (Deno.env.get("VTU_GATE_BASE_URL") ||
      "https://api.vtugate.com/api/v1").replace(/\/$/, "");
    const servicesPayload = await vtuGateRequest(
      baseUrl,
      apiKey,
      "/fetchallservices",
    );
    const acceptedNames = providerAliases[provider];
    const service = (servicesPayload.data || []).find(
      (item: Record<string, unknown>) =>
        item.service_type === "electricity" &&
        acceptedNames.includes(
          normalizeProvider(item.network_name || item.disco).toLowerCase(),
        ),
    );
    const serviceId = String(service?.service_id || "");
    if (!/^\d+$/.test(serviceId)) {
      return jsonResponse(
        { message: `VTU Gate has no ${provider} electricity service configured.` },
        502,
      );
    }

    if (action === "plans") {
      return jsonResponse({
        plans: [{
          label: "Prepaid electricity",
          price: 0,
          code: `${serviceId}:prepaid`,
          category: "Prepaid",
          provider: "vtugate",
        }],
      });
    }

    const verification = await vtuGateRequest(
      baseUrl,
      apiKey,
      "/verifyelectricity",
      {
        service_id: serviceId,
        meter_no: meterNumber,
        disco: provider.toLowerCase(),
      },
    );
    const customerName = normalizeName(verification);
    if (!customerName) {
      return jsonResponse(
        { message: "VTU Gate did not return a verified meter customer name." },
        502,
      );
    }
    const selectionToken = await createDataPlanToken(
      {
        provider: "vtugate",
        network: provider,
        label: "Prepaid electricity",
        serviceId,
        planCode: "prepaid",
        price: 0,
        accountNumber: meterNumber,
      },
      serviceKey,
    );
    return jsonResponse({ customerName, selectionToken });
  } catch (error) {
    console.error("electricity-services error:", error);
    return jsonResponse(
      {
        message: error instanceof Error
          ? error.message
          : "Could not load electricity services.",
      },
      502,
    );
  }
});
