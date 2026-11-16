import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getBillstackConfig,
  verifyBillstackSignature,
} from "../_shared/billstack.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseSecretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const supabaseSecretKey = supabaseSecretKeys.default;
const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("x-wiaxy-timestamp") || "";
    const signature = req.headers.get("x-wiaxy-signature-256") || "";
    const config = await getBillstackConfig(supabaseAdmin);
    if (!config) {
      console.error("Billstack config not found during webhook processing.");
      return jsonResponse({ error: "Billstack not configured" }, 500);
    }

    if (!(await verifyBillstackSignature(rawBody, timestamp, signature, config.secretKey))) {
      console.error("Invalid or expired Billstack webhook signature.");
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    const payload = JSON.parse(rawBody);
    if (payload.event !== "PAYMENT_NOTIFICATION") {
      return jsonResponse({ status: true, message: "successful" });
    }

    const eventData = payload.data;
    if (eventData?.type !== "RESERVED_ACCOUNT_TRANSACTION") {
      return jsonResponse({ status: true, message: "successful" });
    }

    const accountReference = String(
      eventData.reference || eventData.merchant_reference || "",
    ).trim();
    const accountNumber = String(eventData.account?.account_number || "").trim();
    const transactionReference = String(
      eventData.transaction_ref || eventData.wiaxy_ref || "",
    ).trim();
    const providerReference = String(
      eventData.wiaxy_ref || eventData.transaction_ref || "",
    ).trim();
    const amount = Number(eventData.amount);
    const amountKobo = Math.round(amount * 100);

    if (
      !accountReference ||
      !transactionReference ||
      !providerReference ||
      !Number.isFinite(amount) ||
      !Number.isSafeInteger(amountKobo) ||
      amountKobo <= 0
    ) {
      throw new Error("Billstack payment notification has incomplete or invalid payment details.");
    }

    let userAccount: {
      user_id: string;
      bank_name: string;
      account_number: string;
    } | null = null;
    if (accountNumber) {
      const { data, error } = await supabaseAdmin
        .from("user_virtual_accounts")
        .select("user_id, bank_name, account_number")
        .eq("provider", "billstack")
        .eq("account_number", accountNumber)
        .limit(2);
      if (error) throw error;
      if (data.length > 1) {
        throw new Error("Billstack account number is mapped to multiple accounts.");
      }
      userAccount = data[0] || null;
    }

    if (!userAccount && accountReference) {
      const { data, error } = await supabaseAdmin
        .from("user_virtual_accounts")
        .select("user_id, bank_name, account_number")
        .eq("provider", "billstack")
        .eq("account_reference", accountReference)
        .limit(10);
      if (error) throw error;

      const eventBankName = String(eventData.account?.bank_name || "").trim().toLowerCase();
      const referenceMatches = data || [];
      if (referenceMatches.length === 1) {
        userAccount = referenceMatches[0];
      } else if (eventBankName) {
        const bankMatches = referenceMatches.filter(
          (account) => account.bank_name.trim().toLowerCase() === eventBankName,
        );
        if (bankMatches.length === 1) userAccount = bankMatches[0];
      }
    }

    if (!userAccount) {
      console.error("No user found for Billstack virtual account payment:", {
        accountReference,
        accountNumber,
        transactionReference,
      });
      throw new Error("Billstack payment could not be matched to a unique virtual account.");
    }

    const bankName = String(eventData.account?.bank_name || userAccount.bank_name || "Billstack");
    const { data: result, error: processError } = await supabaseAdmin.rpc(
      "process_billstack_dva_deposit",
      {
        p_user_id: userAccount.user_id,
        p_amount_kobo: amountKobo,
        p_provider_reference: providerReference,
        p_payment_reference: transactionReference,
        p_bank_name: bankName,
        p_account_number: accountNumber || userAccount.account_number,
        p_metadata: {
          ...eventData,
          dedicated_account_reference: accountReference,
          dedicated_account_number: accountNumber || userAccount.account_number,
          virtual_account_bank_name: bankName,
        },
      },
    );
    if (processError) throw processError;

    return jsonResponse({ status: true, message: "successful", result });
  } catch (error) {
    console.error("Billstack webhook processing error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal error" },
      500,
    );
  }
});
