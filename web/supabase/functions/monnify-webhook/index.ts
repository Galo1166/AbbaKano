import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getMonnifyConfig, verifyMonnifySignature } from "../_shared/monnify.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseSecretKeys = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"
);
const supabaseSecretKey = supabaseSecretKeys.default;

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("monnify-signature") || "";

    const config = await getMonnifyConfig(supabaseAdmin);
    if (!config) {
      console.error("Monnify config not found during webhook processing.");
      return new Response(JSON.stringify({ error: "Monnify not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isValidSignature = await verifyMonnifySignature(
      rawBody,
      signature,
      config.secretKey,
    );

    if (!isValidSignature) {
      console.error("Invalid Monnify webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    console.log("Monnify webhook event:", payload.eventType);

    if (payload.eventType !== "SUCCESSFUL_TRANSACTION") {
      return new Response(
        JSON.stringify({ received: true, processed: false, event: payload.eventType }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const eventData = payload.eventData;
    if (!eventData) {
      throw new Error("Missing Monnify event data");
    }

    const transactionReference = String(
      eventData.transactionReference || eventData.paymentReference || "",
    ).trim();
    const paymentReference = String(eventData.paymentReference || transactionReference).trim();
    const amountPaid = Number(eventData.amountPaid ?? eventData.totalPayable ?? 0);
    const amountKobo = Math.round(amountPaid * 100);

    if (
      !paymentReference ||
      !transactionReference ||
      !Number.isFinite(amountPaid) ||
      !Number.isSafeInteger(amountKobo) ||
      amountKobo <= 0
    ) {
      throw new Error(`Invalid payment details: ref=${paymentReference}, amount=${amountPaid}`);
    }

    const destinationAcc = eventData.destinationAccountInformation;
    const accountNumber = String(destinationAcc?.accountNumber || "").trim();
    const bankName = String(destinationAcc?.bankName || "").trim();
    const productRef = String(eventData.product?.reference || "").trim();

    // Find the user by account number or account reference
    let userAccount = null;
    if (accountNumber) {
      const { data } = await supabaseAdmin
        .from("user_virtual_accounts")
        .select("user_id, bank_name, account_number")
        .eq("account_number", accountNumber)
        .maybeSingle();
      userAccount = data;
    }

    if (!userAccount && productRef) {
      const { data } = await supabaseAdmin
        .from("user_virtual_accounts")
        .select("user_id, bank_name, account_number")
        .eq("account_reference", productRef)
        .limit(1)
        .maybeSingle();
      userAccount = data;
    }

    if (!userAccount) {
      console.error("No user found for Monnify DVA payment:", {
        accountNumber,
        productRef,
        paymentReference,
      });
      // Return 200 so Monnify stops retrying an untracked account, but log error
      return new Response(
        JSON.stringify({ received: true, error: "Virtual account not mapped to user" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const destinationBankName = bankName || userAccount.bank_name || "Monnify Bank";

    // Atomically credit user wallet
    const { data: result, error: processError } = await supabaseAdmin.rpc(
      "process_monnify_dva_deposit",
      {
        p_user_id: userAccount.user_id,
        p_amount_kobo: amountKobo,
        p_provider_reference: transactionReference,
        p_payment_reference: paymentReference,
        p_bank_name: destinationBankName,
        p_account_number: accountNumber || userAccount.account_number,
        p_metadata: {
          ...eventData,
          dedicated_account_number: accountNumber || userAccount.account_number,
          virtual_account_bank_name: destinationBankName,
        },
      },
    );

    if (processError) {
      console.error("Monnify deposit processing error:", processError);
      throw processError;
    }

    console.log("Monnify DVA deposit processed successfully:", result);

    return new Response(
      JSON.stringify({
        status: "success",
        received: true,
        result,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Monnify webhook fatal error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
