import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTransactionAuthorization } from "../_shared/transaction-authorization.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseSecretKeys = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS")!,
);
const supabaseSecretKey = supabaseSecretKeys.default;

const vtugateApiKey = Deno.env.get("VTUGATE_API_KEY")!;

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
);

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { message: "Method not allowed" },
      405,
    );
  }

  try {
    /*
     * ----------------------------------------------------
     * 1. Authenticate the user
     * ----------------------------------------------------
     */

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        { message: "Missing authorization" },
        401,
      );
    }

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse(
        { message: "Unauthorized" },
        401,
      );
    }

    /*
     * ----------------------------------------------------
     * 2. Read request
     * ----------------------------------------------------
     */

    const body = await req.json();

    const pin = typeof body.pin === "string" ? body.pin : "";
    const transactionAuthorization =
      typeof body.transactionAuthorization === "string"
        ? body.transactionAuthorization
        : "";

    if (!transactionAuthorization && !/^\d{4}$/.test(pin)) {
      return jsonResponse(
        {
          message: "Enter a valid 4-digit transaction PIN",
        },
        400,
      );
    }

    const network = String(body.network || "")
      .trim()
      .toUpperCase();

    const phone = String(body.phone || "")
      .replace(/\D/g, "");

    const amount = Number(body.amount);

    const idempotencyKey = String(
      body.idempotencyKey || "",
    ).trim();

    if (!idempotencyKey) {
      return jsonResponse(
        { message: "Missing idempotency key" },
        400,
      );
    }

    /*
     * ----------------------------------------------------
     * 3. Validate network
     * ----------------------------------------------------
     */

    const allowedNetworks = [
      "MTN",
      "AIRTEL",
      "GLO",
      "9MOBILE",
    ];

    if (!allowedNetworks.includes(network)) {
      return jsonResponse(
        { message: "Unsupported network" },
        400,
      );
    }

    /*
     * ----------------------------------------------------
     * 4. Validate phone
     * ----------------------------------------------------
     */

    if (!/^0\d{10}$/.test(phone)) {
      return jsonResponse(
        {
          message:
            "Enter a valid 11-digit Nigerian phone number.",
        },
        400,
      );
    }

    /*
     * ----------------------------------------------------
     * 5. Validate amount
     * ----------------------------------------------------
     */

    if (
      !Number.isInteger(amount) ||
      amount < 50 ||
      amount > 100000
    ) {
      return jsonResponse(
        {
          message:
            "Airtime amount must be between ₦50 and ₦100,000.",
        },
        400,
      );
    }

    if (!transactionAuthorization) {
      const { data: profile, error: profileError } =
        await supabaseAdmin
          .from("profiles")
          .select("transaction_pin_hash, transaction_pin_salt")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error("PIN lookup failed:", profileError);
        return jsonResponse({ message: "Could not verify transaction PIN." }, 500);
      }

      if (!profile?.transaction_pin_hash || !profile?.transaction_pin_salt) {
        return jsonResponse({ message: "Set a 4-digit transaction PIN first before buying airtime." }, 400);
      }

      if (!(await verifyPinHash(pin, profile.transaction_pin_salt, profile.transaction_pin_hash))) {
        return jsonResponse({ message: "Incorrect transaction PIN" }, 401);
      }
    } else {
      const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      const authorization = await verifyTransactionAuthorization(
        transactionAuthorization,
        user.id,
        secretKeys.default,
        { network, phone, selectionToken: "", purchaseType: "AIRTIME", amount },
      );
      if (!authorization) {
        return jsonResponse({ message: "Biometric authorization failed. Please try again." }, 401);
      }
    }

    /*
     * ----------------------------------------------------
     * 6. Check for duplicate request
     * ----------------------------------------------------
     */

    const { data: existingTransaction } =
      await supabaseAdmin
        .from("vtu_transactions")
        .select(
          `
            id,
            status,
            provider_reference,
            phone_number,
            network,
            amount_kobo
          `,
        )
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingTransaction) {
      return jsonResponse({
        status:
          existingTransaction.status === "success"
            ? "success"
            : existingTransaction.status,
        message:
          existingTransaction.status === "success"
            ? "Airtime purchase already completed."
            : "This airtime request is already being processed.",
        reference:
          existingTransaction.provider_reference ||
          `ABBA-${existingTransaction.id}`,
      });
    }

const { data: reservationResult, error: reservationError } =
  await supabaseAdmin.rpc("create_airtime_reservation", {
    p_user_id: user.id,
    p_network: network,
    p_phone_number: phone,
    p_amount_kobo: amount * 100,
    p_idempotency_key: idempotencyKey,
  });

if (reservationError) {
  console.error(
    "Airtime reservation error:",
    reservationError,
  );

  const message = reservationError.message || "";

  if (message.toLowerCase().includes("insufficient")) {
    return jsonResponse(
      {
        message: "Insufficient wallet balance.",
      },
      400,
    );
  }

  return jsonResponse(
    {
      message: "Could not reserve wallet balance.",
    },
    500,
  );
}

const transactionId =
  Number(reservationResult?.transaction_id);

if (!transactionId) {
  console.error(
    "Invalid reservation result:",
    reservationResult,
  );

  return jsonResponse(
    {
      message: "Could not create Airtime transaction.",
    },
    500,
  );
}
  const serviceIds: Record<string, string> = {
  MTN: "58",
  AIRTEL: "312",
  GLO: "243",
  "9MOBILE": "244",
};

    const serviceId = serviceIds[network];

    if (!serviceId) {
      await supabaseAdmin
        .from("wallet_reservations")
        .update({
          status: "released",
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_id", transactionId)

      await supabaseAdmin
        .from("vtu_transactions")
        .update({
          status: "failed",
          provider_response: {
            message:
              "VTUGATE service ID is not configured for this network.",
          },
          updated_at: new Date().toISOString(),
        })
       .eq("id", transactionId)
      return jsonResponse(
        {
          message:
            `VTUGATE service ID for ${network} is not configured yet.`,
        },
        400,
      );
    }

    /*
     * ----------------------------------------------------
     * 12. Call VTUGATE
     * ----------------------------------------------------
     */

    const vtugateResponse = await fetch(
      "https://api.vtugate.com/api/v1/buyairtime",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
          Authorization: `Bearer ${vtugateApiKey}`,
        },
        body: new URLSearchParams({
          service_id: serviceId,
          phone_number: phone,
          amount: String(amount),
        }),
      },
    );

    const vtugateData = await vtugateResponse.json();

    console.log(
      "VTUGATE response:",
      JSON.stringify(vtugateData),
    );

    /*
     * ----------------------------------------------------
     * 13. Handle VTUGATE failure
     * ----------------------------------------------------
     */

   if (!vtugateResponse.ok || vtugateData?.status !== true) {
      await supabaseAdmin
        .from("wallet_reservations")
        .update({
          status: "released",
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_id", transactionId);

      await supabaseAdmin
        .from("vtu_transactions")
        .update({
          status: "failed",
          provider_response: vtugateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      return jsonResponse(
        {
          message:
            vtugateData?.message ||
            "VTUGATE rejected the airtime request.",
        },
        400,
      );
    }

    /*
     * ----------------------------------------------------
     * 14. Determine provider reference
     * ----------------------------------------------------
     */
const providerReference =
  vtugateData?.data?.external_reference ||
  vtugateData?.data?.transaction_id ||
  vtugateData?.reference ||
  vtugateData?.transaction_id ||
  `ABBA-${transactionId}`;

    /*
     * ----------------------------------------------------
     * 15. Mark transaction successful
     * ----------------------------------------------------
     */

    const { error: transactionUpdateError } =
      await supabaseAdmin
        .from("vtu_transactions")
        .update({
          status: "success",
          provider_reference: providerReference,
          provider_response: vtugateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

    if (transactionUpdateError) {
      console.error(
        "Transaction update failed:",
        transactionUpdateError,
      );

      return jsonResponse(
        {
          message:
            "Airtime was accepted but transaction finalization failed. Please contact support.",
          reference:
            providerReference ||
            `ABBA-${transactionId}`,
        },  
        500,
      );
    }

    /*
     * ----------------------------------------------------
     * 16. Settle reservation
     *
     * IMPORTANT:
     * The wallet itself is not debited here yet.
     *
     * We will move this into an atomic PostgreSQL
     * function so wallet balance + ledger + reservation
     * are updated together.
     * ----------------------------------------------------
     */

   const { data: settlement, error: settlementError } =
  await supabaseAdmin.rpc("settle_airtime_purchase", {
    p_transaction_id: transactionId,
  });

if (settlementError) {
  console.error(
    "Airtime settlement failed:",
    settlementError,
  );

  return jsonResponse(
    {
      message:
        "Airtime was accepted but wallet settlement failed. Please contact support.",
      reference:
        providerReference ||
        `ABBA-${transactionId}`,
    },
    500,
  );
}



  return jsonResponse({
  status: "success",
  message:
    "Airtime recharge completed successfully.",
  reference:
    providerReference ||
    `ABBA-${transactionId}`,
  balance_kobo: settlement?.balance_after_kobo,
});
  } catch (error) {
    console.error("purchase-airtime error:", error);

    return jsonResponse(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not complete airtime purchase.",
      },
      500,
    );
  }
});

async function scryptHash(
  pin: string,
  salt: string,
  saltIsHexBytes = false,
): Promise<string> {
  const { scrypt } = await import(
    "npm:@noble/hashes@2.4.0/scrypt.js"
  );

  const passwordBytes = new TextEncoder().encode(pin);
  const saltBytes = saltIsHexBytes
    ? hexToBytes(salt)
    : saltToBytes(salt);

  const digest = scrypt(passwordBytes, saltBytes, {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 64,
  });

  return bytesToHex(digest);
}

async function verifyPinHash(
  pin: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  if (!/^[0-9a-fA-F]+$/.test(expectedHash)) return false;

  if (expectedHash.length === 64) {
    const passwordBytes = new TextEncoder().encode(pin);
    const saltBytes = hexToBytes(salt);
    const digestInput = new Uint8Array(
      passwordBytes.length + saltBytes.length,
    );

    digestInput.set(passwordBytes, 0);
    digestInput.set(saltBytes, passwordBytes.length);

    const digest = await crypto.subtle.digest(
      "SHA-256",
      digestInput,
    );

    return timingSafeEqualHex(
      bytesToHex(new Uint8Array(digest)),
      expectedHash,
    );
  }

  if (expectedHash.length !== 128) return false;

  const legacyHash = await scryptHash(pin, salt);
  if (timingSafeEqualHex(legacyHash, expectedHash)) return true;

  const byteSaltHash = await scryptHash(pin, salt, true);
  return timingSafeEqualHex(byteSaltHash, expectedHash);
}

function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) {
    throw new Error("Invalid hex salt value");
  }

  const bytes = new Uint8Array(value.length / 2);

  for (let i = 0; i < value.length; i += 2) {
    bytes[i / 2] = Number.parseInt(value.slice(i, i + 2), 16);
  }

  return bytes;
}

function saltToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) {
    throw new Error("Invalid hex salt value");
  }

  return new TextEncoder().encode(value);
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(
  actualHex: string,
  expectedHex: string,
): boolean {
  if (
    typeof actualHex !== "string" ||
    typeof expectedHex !== "string"
  ) {
    return false;
  }

  if (actualHex.length !== expectedHex.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < actualHex.length; i++) {
    result |=
      actualHex.charCodeAt(i) ^
      expectedHex.charCodeAt(i);
  }

  return result === 0;
}