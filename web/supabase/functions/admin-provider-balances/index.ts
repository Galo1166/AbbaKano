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

function fundingOptions() {
  const payvesselAccount = Deno.env.get("VTU_GATE_PAYVESSEL_ACCOUNT");
  const payvesselName = Deno.env.get("VTU_GATE_PAYVESSEL_ACCOUNT_NAME");
  const paymentpointAccount = Deno.env.get("VTU_GATE_PAYMENTPOINT_ACCOUNT");
  const paymentpointName = Deno.env.get("VTU_GATE_PAYMENTPOINT_ACCOUNT_NAME");

  return [
    ...(payvesselAccount && payvesselName
      ? [{
          id: "payvessel",
          name: "Payvessel",
          fee: "₦32 fee",
          status: "Configured",
          accountNumber: payvesselAccount,
          accountName: payvesselName,
          bankName: "9Payment Service Bank",
        }]
      : []),
    ...(paymentpointAccount && paymentpointName
      ? [{
          id: "paymentpoint",
          name: "PaymentPoint",
          fee: "0.55% fee",
          status: "Configured",
          accountNumber: paymentpointAccount,
          accountName: paymentpointName,
          bankName: "PalmPay",
        }]
      : []),
  ];
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
    const apiKey = Deno.env.get("VTUGATE_API_KEY") || Deno.env.get("VTU_GATE_API_KEY");
    if (!supabaseUrl || !anonKey || !apiKey) {
      console.error("Admin provider balances function configuration is incomplete.");
      return jsonResponse({ message: "VTUGATE balance lookup is not configured." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);
    if (user.app_metadata.admin_role !== "super_admin") {
      return jsonResponse({ message: "Super-admin access is required." }, 403);
    }

    const baseUrl = (Deno.env.get("VTUGATE_BASE_URL") ||
      Deno.env.get("VTU_GATE_BASE_URL") ||
      "https://api.vtugate.com/api/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/accountdetails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(),
      signal: AbortSignal.timeout(15000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object" || !("status" in payload) || payload.status !== true) {
      const providerMessage = payload && typeof payload === "object" && "message" in payload &&
          typeof payload.message === "string"
        ? payload.message
        : "Could not load VTUGATE account details.";
      console.error("VTUGATE account details request failed.", response.status);
      return jsonResponse({ message: providerMessage }, 502);
    }

    const account = "data" in payload && payload.data && typeof payload.data === "object"
      ? payload.data
      : null;
    if (!account) {
      throw new Error("VTUGATE returned invalid account details.");
    }
    const balance = Number(
      "balance" in account ? account.balance :
        "available_balance" in account ? account.available_balance :
        "wallet_balance" in account ? account.wallet_balance :
        "amount" in account ? account.amount : NaN,
    );
    if (!Number.isFinite(balance)) {
      throw new Error("VTUGATE returned an invalid account balance.");
    }

    const lowBalanceThreshold = Number(
      Deno.env.get("VTUGATE_LOW_BALANCE_THRESHOLD_NAIRA") ||
        Deno.env.get("VTU_GATE_LOW_BALANCE_THRESHOLD_NAIRA") ||
        500000,
    );
    if (!Number.isFinite(lowBalanceThreshold) || lowBalanceThreshold < 0) {
      throw new Error("The VTUGATE low-balance threshold is invalid.");
    }

    return jsonResponse({
      provider: "VTUGATE",
      providerName: "VTUGATE",
      balance,
      currency: "NGN",
      status: balance <= 0 ? "CRITICAL" : balance <= lowBalanceThreshold ? "LOW_BALANCE" : "HEALTHY",
      lastCheckedAt: new Date().toISOString(),
      lowBalanceThreshold,
      source: "VTUGATE accountdetails",
      fundingOptions: fundingOptions(),
    });
  } catch (error) {
    console.error("admin-provider-balances error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Could not load VTUGATE balance." },
      502,
    );
  }
});
