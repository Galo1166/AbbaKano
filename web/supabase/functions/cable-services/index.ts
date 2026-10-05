import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDataPlanToken } from "../_shared/data-plan-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const providers = ["DSTV", "GOTV", "STARTIMES"] as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeProvider(value: unknown): string {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizePhone(value: unknown): string {
  return String(value || "").replace(/\D/g, "").replace(/^234/, "0");
}

function normalizeCustomerName(payload: Record<string, unknown>): string {
  const containers = [
    payload.data?.customer,
    payload.data?.customer_details,
    payload.data?.customerDetails,
    payload.data?.customer_data,
    payload.data?.customerData,
    payload.data,
    payload.customer,
    payload.customer_details,
    payload.customerDetails,
    payload.result,
    payload.content,
    payload,
  ];
  const fields = [
    "smartcard_name",
    "smartcardName",
    "smartcardname",
    "customer_name",
    "customerName",
    "customername",
    "customer_full_name",
    "customerFullName",
    "full_name",
    "fullName",
    "account_name",
    "accountName",
    "name",
  ];

  for (const container of containers) {
    if (typeof container === "string" && container.trim()) return container.trim();
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
      console.error("Cable services function configuration is incomplete.");
      return jsonResponse({ message: "Cable TV verification is unavailable." }, 500);
    }

    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Cable TV verification is unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);

    const body = await req.json();
    const provider = normalizeProvider(body?.provider);
    const smartcardNumber = String(body?.smartcardNumber || "").replace(/\D/g, "");
    if (!providers.includes(provider as typeof providers[number])) {
      return jsonResponse({ message: "Choose a supported cable provider." }, 400);
    }
    if (!/^\d{10}$/.test(smartcardNumber)) {
      return jsonResponse({ message: "Enter a valid 10-digit smartcard number." }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    const phone = normalizePhone(profile?.phone || user.user_metadata?.phone);
    if (!/^(?:234|0)\d{10}$/.test(phone)) {
      return jsonResponse(
        { message: "Add a valid phone number to your profile before verifying a cable account." },
        400,
      );
    }

    const baseUrl = (Deno.env.get("VTU_GATE_BASE_URL") ||
      "https://api.vtugate.com/api/v1").replace(/\/$/, "");

    const providerServiceMap: Record<string, string> = {
      DSTV: "344",
      GOTV: "345",
      STARTIMES: "277",
    };

    let serviceId = String(body?.serviceId || providerServiceMap[provider] || "").trim();
    if (!/^\d+$/.test(serviceId)) {
      const servicesPayload = await vtuGateRequest(
        baseUrl,
        apiKey,
        "/fetchallservices",
      );
      const service = (servicesPayload.data || []).find(
        (item: Record<string, unknown>) =>
          item.service_type === "tv" &&
          normalizeProvider(item.tv_name) === provider,
      );
      serviceId = String(service?.service_id || "");
    }

    if (!/^\d+$/.test(serviceId)) {
      return jsonResponse({ message: `VTU Gate has no ${provider} service configured.` }, 502);
    }

    const verification = await vtuGateRequest(
      baseUrl,
      apiKey,
      "/verifycabletv",
      {
        service_id: serviceId,
        phone,
        smartcard_number: smartcardNumber,
      },
    );
    const customerName = normalizeCustomerName(verification);
    if (!customerName) {
      return jsonResponse({ message: "VTU Gate did not return a cable customer name." }, 502);
    }

    const plans = await Promise.all(
      (verification.data?.cable_plans || []).map(
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
              network: provider,
              label,
              serviceId,
              planCode,
              price,
              accountNumber: smartcardNumber,
            },
            serviceKey,
          );
          return {
            label,
            price,
            code: `${serviceId}:${planCode}`,
            category: "Cable TV",
            provider: "vtugate",
            selectionToken,
          };
        },
      ),
    );

    return jsonResponse({
      customerName,
      accountPhone: phone,
      plans: plans.filter((plan) => plan !== null),
    });
  } catch (error) {
    console.error("cable-services error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not verify cable customer." },
      502,
    );
  }
});
