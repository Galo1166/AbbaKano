import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type BillstackBank,
  createBillstackVirtualAccount,
  getBillstackConfig,
} from "../_shared/billstack.ts";
import { createMonnifyReservedAccount, getMonnifyConfig } from "../_shared/monnify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  try {
    const requestBody: unknown = await req.json().catch(() => null);
    if (!requestBody || typeof requestBody !== "object" || Array.isArray(requestBody)) {
      return jsonResponse({ message: "Invalid request body" }, 400);
    }
    const body = requestBody as Record<string, unknown>;
    const bvn = typeof body.bvn === "string" ? body.bvn.trim() : "";
    const nin = typeof body.nin === "string" ? body.nin.trim() : "";

    if (
      (body.bvn !== undefined && typeof body.bvn !== "string") ||
      (body.nin !== undefined && typeof body.nin !== "string") ||
      (bvn && nin) ||
      (bvn && !/^\d{11}$/.test(bvn)) ||
      (nin && !/^\d{11}$/.test(nin))
    ) {
      return jsonResponse(
        { message: "Enter one valid 11-digit BVN or NIN." },
        400,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ message: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

    if (!supabaseUrl || !anonKey || !rawSecretKeys) {
      return jsonResponse({ message: "Service temporarily unavailable" }, 500);
    }

    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey =
      secretKeys && typeof secretKeys === "object" && "default" in secretKeys
        ? secretKeys.default
        : null;

    if (typeof serviceKey !== "string" || !serviceKey) {
      return jsonResponse({ message: "Service temporarily unavailable" }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // 1. Fetch existing virtual accounts from database
    const { data: existingAccounts, error: fetchError } = await supabaseAdmin
      .from("user_virtual_accounts")
      .select("id, bank_name, bank_code, account_number, account_name, provider, created_at")
      .eq("user_id", user.id)
      .order("bank_name");

    if (fetchError) {
      console.error("Fetch virtual accounts error:", fetchError);
      throw fetchError;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    const fullName = profile?.full_name || user.user_metadata?.full_name || "Customer";
    const email = user.email || "";
    const phone = profile?.phone || user.user_metadata?.phone || "";

    const customer = { id: user.id, fullName, email, phone };
    const identity = { bvn: bvn || undefined, nin: nin || undefined };
    const accounts = existingAccounts || [];
    const billstackConfig = await getBillstackConfig(supabaseAdmin);
    const accountWarnings: string[] = [];

    if (billstackConfig) {
      const savedBillstackBanks = new Set(
        accounts
          .filter((account) => account.provider === "billstack")
          .map((account) => String(account.bank_code || "").toUpperCase()),
      );
      const billstackBanks: BillstackBank[] = [
        ...(bvn || nin ? ["PALMPAY" as const] : []),
        "9PSB",
        "SAFEHAVEN",
        "PROVIDUS",
      ];

      await Promise.all(
        billstackBanks
          .filter((bank) => !savedBillstackBanks.has(bank))
          .map(async (bank) => {
            try {
              await createBillstackVirtualAccount(
                supabaseAdmin,
                billstackConfig,
                customer,
                bank,
                identity,
              );
            } catch (error) {
              console.error(`Billstack ${bank} account provisioning failed:`, error);
              if (bank !== "PROVIDUS") {
                accountWarnings.push(`Could not create your ${bank} account. Other accounts may still be available.`);
              }
            }
          }),
      );
    }

    const hasMonnifyAccounts = accounts.some((account) => account.provider === "monnify");
    if ((bvn || nin) && !hasMonnifyAccounts) {
      try {
        const monnifyConfig = await getMonnifyConfig(supabaseAdmin);
        if (monnifyConfig) {
          const createdMonnifyAccounts = await createMonnifyReservedAccount(
            supabaseAdmin,
            customer,
            identity,
          );
          if (createdMonnifyAccounts.length === 0) {
            throw new Error("Monnify did not return any virtual accounts.");
          }
        }
      } catch (error) {
        console.error("Monnify account provisioning failed:", error);
        accountWarnings.push("Could not create your Monnify account. Other accounts may still be available.");
      }
    }

    const { data: allAccounts, error: allAccountsError } = await supabaseAdmin
      .from("user_virtual_accounts")
      .select("id, bank_name, bank_code, account_number, account_name, provider, created_at")
      .eq("user_id", user.id)
      .order("bank_name");
    if (allAccountsError) throw allAccountsError;

    if (!allAccounts?.length && !bvn && !nin) {
      return jsonResponse({ accounts: [], requiresIdentity: true });
    }
    if (!allAccounts?.length) {
      const message = accountWarnings.length
        ? `We could not create any dedicated accounts. ${accountWarnings.join(" ")}`
        : "No virtual account provider is configured. Configure Billstack or Monnify.";
      throw new Error(message);
    }

    return jsonResponse({ accounts: allAccounts, accountWarnings });
  } catch (error) {
    console.error("virtual-accounts error:", error);
    return jsonResponse(
      {
        message: error instanceof Error ? error.message : "Could not load virtual accounts.",
        accounts: [],
      },
      500,
    );
  }
});
