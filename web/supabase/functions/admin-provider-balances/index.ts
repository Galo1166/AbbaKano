import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callAlrahuzApi,
  type AlrahuzUserResponse,
} from "../_shared/alrahuzdata.ts";

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

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function alrahuzResponseRecords(response: JsonRecord): JsonRecord[] {
  const records: JsonRecord[] = [];
  const pending: Array<{ value: unknown; depth: number }> = [{ value: response, depth: 0 }];

  while (pending.length > 0) {
    const current = pending.pop()!;
    if (current.depth > 6) continue;

    if (Array.isArray(current.value)) {
      for (const value of current.value) {
        pending.push({ value, depth: current.depth + 1 });
      }
      continue;
    }

    if (!isRecord(current.value)) continue;
    records.push(current.value);
    for (const value of Object.values(current.value)) {
      if (value && typeof value === "object") {
        pending.push({ value, depth: current.depth + 1 });
      }
    }
  }

  return records;
}

function normalizeAlrahuzKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function firstValue(records: JsonRecord[], keys: string[]): unknown {
  for (const key of keys) {
    const normalizedKey = normalizeAlrahuzKey(key);
    for (const record of records) {
      const value = Object.entries(record).find(([recordKey]) =>
        normalizeAlrahuzKey(recordKey) === normalizedKey
      )?.[1];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }
  return undefined;
}

function alrahuzFundingOptions(response: JsonRecord) {
  const records = alrahuzResponseRecords(response);
  const accountNumber = firstValue(records, [
    "virtual_account_number",
    "virtualAccountNumber",
    "account_number",
    "accountNumber",
    "account_no",
    "accountNo",
  ]);
  const accountName = firstValue(records, [
    "virtual_account_name",
    "virtualAccountName",
    "account_name",
    "accountName",
  ]);
  const bankName = firstValue(records, [
    "virtual_account_bank",
    "virtualAccountBank",
    "bank_name",
    "bankName",
  ]);
  const resolvedAccountNumber = typeof accountNumber === "string" ||
      typeof accountNumber === "number"
    ? String(accountNumber)
    : Deno.env.get("ALRAHUZDATA_DVA_ACCOUNT_NUMBER");
  const resolvedAccountName = typeof accountName === "string"
    ? accountName
    : Deno.env.get("ALRAHUZDATA_DVA_ACCOUNT_NAME");
  const resolvedBankName = typeof bankName === "string"
    ? bankName
    : Deno.env.get("ALRAHUZDATA_DVA_BANK_NAME");

  return resolvedAccountNumber && resolvedAccountName
    ? [{
        id: "alrahuzdata-dva",
        name: "ALRAHUZDATA DVA",
        fee: "Use this account to fund ALRAHUZDATA",
        status: "Configured",
        accountNumber: resolvedAccountNumber,
        accountName: resolvedAccountName,
        bankName: resolvedBankName || undefined,
      }]
    : [];
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
    const alrahuzToken = Deno.env.get("ALRAHUZDATA_API_TOKEN") || Deno.env.get("ALRAHUZ_API_TOKEN");
    if (!supabaseUrl || !anonKey || (!apiKey && !alrahuzToken)) {
      console.error("Admin provider balances function configuration is incomplete.");
      return jsonResponse({ message: "Provider balance lookup is not configured." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);
    if (user.app_metadata.admin_role !== "super_admin") {
      return jsonResponse({ message: "Super-admin access is required." }, 403);
    }

    const requestBody: unknown = await req.json().catch(() => ({}));
    if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
      return jsonResponse({ message: "Invalid request body." }, 400);
    }
    if ("provider" in requestBody && typeof requestBody.provider !== "string") {
      return jsonResponse({ message: "Invalid provider." }, 400);
    }
    const requestedProvider = "provider" in requestBody
      ? requestBody.provider.toUpperCase()
      : "";
    if (requestedProvider && !["VTUGATE", "ALRAHUZDATA"].includes(requestedProvider)) {
      return jsonResponse({ message: "Unsupported provider." }, 400);
    }

    const defaultLowBalanceThreshold = Number(
      Deno.env.get("VTUGATE_LOW_BALANCE_THRESHOLD_NAIRA") ||
        Deno.env.get("VTU_GATE_LOW_BALANCE_THRESHOLD_NAIRA") ||
        500000,
    );

    if (requestedProvider === "ALRAHUZDATA" || (!requestedProvider && alrahuzToken && !apiKey)) {
      if (!alrahuzToken) {
        return jsonResponse({ message: "ALRAHUZDATA API token is not configured." }, 503);
      }

      const alrahuzResult = await callAlrahuzApi<AlrahuzUserResponse>("/user/", {
        method: "GET",
        token: alrahuzToken,
      });

      if (!alrahuzResult.ok || !alrahuzResult.data) {
        return jsonResponse(
          { message: alrahuzResult.error || "Could not load ALRAHUZDATA balance." },
          502,
        );
      }

      const records = alrahuzResponseRecords(alrahuzResult.data);
      const rawBal = firstValue(records, [
        "wallet_balance",
        "walletBalance",
        "balance",
        "available_balance",
        "availableBalance",
      ]);
      const balanceValue = typeof rawBal === "string"
        ? rawBal.trim().replace(/,/g, "").replace(/^₦\s*/, "")
        : rawBal;
      const balance = typeof balanceValue === "number" || typeof balanceValue === "string"
        ? Number(balanceValue)
        : NaN;
      if (!Number.isFinite(balance)) {
        throw new Error("ALRAHUZDATA returned an invalid balance.");
      }
      const alrahuzThreshold = Number(
        Deno.env.get("ALRAHUZDATA_LOW_BALANCE_THRESHOLD_NAIRA") || defaultLowBalanceThreshold,
      );
      if (!Number.isFinite(alrahuzThreshold) || alrahuzThreshold < 0) {
        throw new Error("The ALRAHUZDATA low-balance threshold is invalid.");
      }

      return jsonResponse({
        provider: "ALRAHUZDATA",
        providerName: "ALRAHUZDATA",
        balance,
        currency: "NGN",
        status: balance <= 0 ? "CRITICAL" : balance <= alrahuzThreshold ? "LOW_BALANCE" : "HEALTHY",
        lastCheckedAt: new Date().toISOString(),
        lowBalanceThreshold: alrahuzThreshold,
        source: "ALRAHUZDATA user",
        fundingOptions: alrahuzFundingOptions(alrahuzResult.data),
      });
    }

    if (!apiKey) {
      return jsonResponse({ message: "VTUGATE API key is not configured." }, 503);
    }

    if (requestedProvider && requestedProvider !== "VTUGATE") {
      return jsonResponse({ message: "Unsupported provider." }, 400);
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
