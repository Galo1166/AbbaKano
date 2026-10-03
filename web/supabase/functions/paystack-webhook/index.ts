import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseSecretKeys = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS")!
);
const supabaseSecretKey = supabaseSecretKeys.default;

const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey
);

async function verifyPaystackSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(paystackSecretKey),
    {
      name: "HMAC",
      hash: "SHA-512",
    },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody)
  );

  const calculatedSignature = Array.from(
    new Uint8Array(signatureBuffer)
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return calculatedSignature === signature;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // IMPORTANT:
    // Read the raw body before JSON parsing.
    const rawBody = await req.text();

    const signature =
      req.headers.get("x-paystack-signature") || "";

    if (!signature) {
      console.error("Missing Paystack signature");

      return new Response(
        JSON.stringify({
          error: "Missing signature",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const validSignature = await verifyPaystackSignature(
      rawBody,
      signature
    );

    if (!validSignature) {
      console.error("Invalid Paystack signature");

      return new Response(
        JSON.stringify({
          error: "Invalid signature",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const event = JSON.parse(rawBody);

    console.log("Paystack webhook event:", event.event);

    // We only process successful charges.
    if (event.event !== "charge.success") {
      return new Response(
        JSON.stringify({
          received: true,
          processed: false,
          event: event.event,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const payment = event.data;

    if (!payment) {
      throw new Error("Missing payment data");
    }

    const reference = payment.reference;
    const amount = Number(payment.amount);
    const currency = payment.currency;

    if (!reference) {
      throw new Error("Missing Paystack reference");
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new Error("Invalid Paystack amount");
    }

    if (currency && currency !== "NGN") {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    console.log("Processing Paystack payment:", {
      reference,
      amount,
      currency,
    });

    // Find the deposit created when payment was initialized.
    const { data: deposit, error: depositError } =
      await supabaseAdmin
        .from("deposits")
        .select("*")
        .eq("reference", reference)
        .eq("provider", "paystack")
        .maybeSingle();

    if (depositError) {
      console.error("Deposit lookup error:", depositError);
      throw depositError;
    }

    if (!deposit) {
      throw new Error(
        `Deposit not found for reference: ${reference}`
      );
    }

    // Verify Paystack amount against our database.
    if (deposit.amount_kobo !== amount) {
      throw new Error(
        `Amount mismatch. Expected ${deposit.amount_kobo}, received ${amount}`
      );
    }

    // Already processed?
    if (deposit.status === "success") {
      console.log(
        `Deposit ${deposit.id} already processed`
      );

      return new Response(
        JSON.stringify({
          received: true,
          processed: false,
          already_processed: true,
          deposit_id: deposit.id,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (deposit.status !== "pending") {
      throw new Error(
        `Deposit ${deposit.id} has unexpected status: ${deposit.status}`
      );
    }

    // Atomically:
    // 1. Lock deposit
    // 2. Lock wallet
    // 3. Credit wallet
    // 4. Create ledger entry
    // 5. Mark deposit successful
    const { data: result, error: processError } =
      await supabaseAdmin.rpc(
        "process_successful_deposit",
        {
          p_deposit_id: deposit.id,
          p_provider_reference:
            payment.id?.toString() || reference,
          p_metadata: event.data,
        }
      );

    if (processError) {
      console.error(
        "Deposit processing error:",
        processError
      );

      throw processError;
    }

    console.log(
      "Deposit processed successfully:",
      result
    );

    return new Response(
      JSON.stringify({
        received: true,
        processed: true,
        result,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Paystack webhook error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});