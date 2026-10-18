import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

  try {
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

    if (existingAccounts && existingAccounts.length > 0) {
      return jsonResponse({ accounts: existingAccounts });
    }

    // 2. If user doesn't have accounts yet, try to generate them now
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    const fullName = profile?.full_name || user.user_metadata?.full_name || "Customer";
    const email = user.email || "";
    const phone = profile?.phone || user.user_metadata?.phone || "";

    const createdAccounts = await createMonnifyReservedAccount(supabaseAdmin, {
      id: user.id,
      fullName,
      email,
      phone,
    });

    return jsonResponse({ accounts: createdAccounts });
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
