import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTransactionAuthorization } from "../_shared/transaction-authorization.ts";
import {
  ALRAHUZ_NETWORK_IDS,
  callAlrahuzApi,
  isAlrahuzSuccess,
  isAlrahuzPending,
} from "../_shared/alrahuzdata.ts";
import {
  BILALSADASUB_NETWORK_IDS,
  bilalSadaSubStatus,
  bilalSadaSubTransactionStatus,
  callBilalSadaSub,
  type BilalSadaSubResponse,
} from "../_shared/bilalsadasub.ts";

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

const alrahuzToken = Deno.env.get("ALRAHUZDATA_API_TOKEN") || Deno.env.get("ALRAHUZ_API_TOKEN") || "";

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

    const bilalToken = Deno.env.get("BILALSADASUB_API_TOKEN") || "";
    const { data: settingsRow, error: settingsError } = await supabaseAdmin
      .from("admin_system_settings")
      .select("settings")
      .eq("id", true)
      .single();
    if (settingsError) {
      console.error("Could not load active airtime provider:", settingsError);
      return jsonResponse({ message: "Could not verify the active airtime provider." }, 500);
    }
    const chosenProvider = String(settingsRow.settings?.airtimeProviderPrimary || "ALRAHUZDATA")
      .toUpperCase();
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

    const { data: existingTransaction, error: existingTransactionError } =
      await supabaseAdmin
        .from("vtu_transactions")
        .select("id, transaction_type, status, provider_reference, provider")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
    if (existingTransactionError) {
      console.error("Airtime idempotency lookup failed:", existingTransactionError);
      return jsonResponse({ message: "Could not check this purchase request." }, 500);
    }
    if (existingTransaction) {
      if (existingTransaction.transaction_type !== "airtime") {
        return jsonResponse({ message: "This idempotency key was used for another purchase." }, 409);
      }
      if (
        existingTransaction.status === "processing" &&
        existingTransaction.provider === "bilalsadasub" &&
        existingTransaction.provider_reference &&
        bilalToken.trim()
      ) {
        let requeryResponse: BilalSadaSubResponse | null = null;
        let requeryHttpStatus: number | null = null;
        try {
          const result = await callBilalSadaSub<BilalSadaSubResponse>(
            `/api/requery/${encodeURIComponent(existingTransaction.provider_reference)}`,
            { token: bilalToken, timeoutMs: 15000 },
          );
          requeryResponse = result.data;
          requeryHttpStatus = result.status;
        } catch (requeryError) {
          console.error("BilalSadaSub airtime requery outcome is unknown:", requeryError);
        }
        const status = bilalSadaSubTransactionStatus(requeryResponse);
        if (status === "success") {
          const { error: settlementError } = await supabaseAdmin.rpc(
            "settle_airtime_purchase",
            {
              p_transaction_id: existingTransaction.id,
              p_provider_reference: existingTransaction.provider_reference,
              p_provider_response: requeryResponse,
            },
          );
          if (settlementError) {
            console.error("BilalSadaSub airtime requery settlement failed:", settlementError);
            return jsonResponse({
              status: "pending",
              message: "Your airtime purchase is being checked. Do not submit it again yet.",
              reference: existingTransaction.provider_reference,
            }, 202);
          }
          return jsonResponse({
            status: "success",
            message: "Airtime recharge completed successfully.",
            reference: existingTransaction.provider_reference,
          });
        }
        if (
          status === "failed" ||
          (requeryHttpStatus === 404 && bilalSadaSubStatus(requeryResponse) === "fail")
        ) {
          const { error: releaseError } = await supabaseAdmin.rpc(
            "release_airtime_reservation",
            {
              p_transaction_id: existingTransaction.id,
              p_provider_response: requeryResponse,
            },
          );
          if (releaseError) {
            console.error("BilalSadaSub failed airtime requery release failed:", releaseError);
            return jsonResponse({
              status: "pending",
              message: "The provider rejected the purchase, but wallet release needs support review.",
              reference: existingTransaction.provider_reference,
            }, 202);
          }
          return jsonResponse({
            status: "failed",
            message: "BilalSadaSub rejected the airtime purchase and the reserved balance was released.",
            reference: existingTransaction.provider_reference,
          });
        }
      }
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

      // A biometric authorization is single-use.  Without consuming its
      // challenge here, the signed authorization could be replayed until it
      // expires with fresh idempotency keys.
      const { data: consumed, error: consumeError } = await supabaseAdmin
        .from("passkey_challenges")
        .delete()
        .eq("user_id", user.id)
        .eq("challenge", authorization.challenge)
        .eq("purpose", "transaction")
        .not("verified_at", "is", null)
        .gt("expires_at", new Date().toISOString())
        .select("user_id")
        .maybeSingle();

      if (consumeError || !consumed) {
        if (consumeError) {
          console.error("Passkey authorization consume failed:", consumeError);
        }
        return jsonResponse(
          { message: "Biometric authorization has expired or was already used." },
          403,
        );
      }
    }

    if (!["ALRAHUZDATA", "BILALSADASUB"].includes(chosenProvider)) {
      return jsonResponse({ message: "The configured airtime provider is not supported." }, 500);
    }
    if (chosenProvider === "ALRAHUZDATA" && !alrahuzToken) {
      return jsonResponse({ message: "ALRAHUZDATA API token is not configured." }, 503);
    }
    if (chosenProvider === "BILALSADASUB" && !bilalToken.trim()) {
      return jsonResponse({ message: "BILALSADASUB_API_TOKEN is not configured." }, 503);
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
    /*
     * ----------------------------------------------------
    * 12. Send through ALRAHUZDATA
     * ----------------------------------------------------
     */

    let providerData: Record<string, unknown> | null = null;
    let providerReference = `ABBA-${transactionId}`;
    let isSuccess = false;
    let isPending = false;
    let providerNeedsReconciliation = false;
    let failureMessage = "Provider rejected the airtime request.";

    if (chosenProvider === "ALRAHUZDATA") {
      const alrahuzNetworkId = ALRAHUZ_NETWORK_IDS[network];
      if (!alrahuzNetworkId) {
        await supabaseAdmin.rpc("release_airtime_reservation", {
          p_transaction_id: transactionId,
          p_provider_response: {
            message: `ALRAHUZDATA network ID for ${network} is not configured.`,
          },
        });
        return jsonResponse(
          { message: `ALRAHUZDATA does not support network: ${network}` },
          400,
        );
      }

      console.log(`Dispatching airtime to ALRAHUZDATA: network=${alrahuzNetworkId}, amount=${amount}, phone=${phone}`);
      const alrahuzResult = await callAlrahuzApi<Record<string, unknown>>("/topup/", {
        method: "POST",
        token: alrahuzToken,
        body: {
          network: alrahuzNetworkId,
          amount,
          mobile_number: phone,
          Ported_number: true,
          airtime_type: "VTU",
        },
        timeoutMs: 45000,
      });

      providerData = alrahuzResult.data || { error: alrahuzResult.error };
      isSuccess = alrahuzResult.ok && isAlrahuzSuccess(alrahuzResult.data);
      isPending = isAlrahuzPending(alrahuzResult.data);
      providerNeedsReconciliation =
        (!alrahuzResult.ok && alrahuzResult.status >= 500) ||
        (!isSuccess && isPending);
      failureMessage =
        alrahuzResult.error ||
        String(alrahuzResult.data?.message || alrahuzResult.data?.msg || alrahuzResult.data?.detail || "ALRAHUZDATA rejected the airtime request.");

      if (alrahuzResult.data?.id) {
        providerReference = String(alrahuzResult.data.id);
      }
    } else {
      const networkId = BILALSADASUB_NETWORK_IDS[network];
      const requestId = `ABBA-AIRTIME-${transactionId}`;
      if (!networkId) {
        await supabaseAdmin.rpc("release_airtime_reservation", {
          p_transaction_id: transactionId,
          p_provider_response: { message: `BilalSadaSub does not support network: ${network}` },
        });
        return jsonResponse({ message: `BilalSadaSub does not support network: ${network}` }, 400);
      }
      providerReference = requestId;
      const { error: requestIdSaveError } = await supabaseAdmin
        .from("vtu_transactions")
        .update({
          provider_reference: providerReference,
          service_provider: "bilalsadasub",
          provider: "bilalsadasub",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId)
        .eq("status", "processing");
      if (requestIdSaveError) {
        console.error("Could not save BilalSadaSub airtime request ID:", requestIdSaveError);
        return jsonResponse({
          status: "pending",
          message: "Your airtime purchase is being checked. Do not submit it again yet.",
          reference: providerReference,
        }, 202);
      }
      try {
        const bilalResult = await callBilalSadaSub<BilalSadaSubResponse>("/api/topup", {
          method: "POST",
          token: bilalToken,
          body: {
            network: networkId,
            phone: `234${phone.slice(1)}`,
            plan_type: "VTU",
            amount,
            "request-id": requestId,
          },
          timeoutMs: 45000,
        });
        providerData = bilalResult.data;
        const status = bilalSadaSubStatus(bilalResult.data);
        isSuccess = status === "success";
        isPending = status !== "success" && status !== "fail" && status !== "failed";
        providerNeedsReconciliation = isPending;
        failureMessage = bilalResult.error ||
          String(bilalResult.data?.message || "BilalSadaSub rejected the airtime request.");
        if (typeof bilalResult.data?.reference === "string" && bilalResult.data.reference) {
          providerReference = bilalResult.data.reference;
        }
      } catch (providerError) {
        console.error("BilalSadaSub airtime purchase outcome is unknown:", providerError);
        providerNeedsReconciliation = true;
      }
    }

    console.log(`${chosenProvider} response:`, JSON.stringify(providerData));

    if (providerNeedsReconciliation) {
      const { error: pendingUpdateError } = await supabaseAdmin
        .from("vtu_transactions")
        .update({
          provider_reference: providerReference,
          provider_response: providerData,
          service_provider: chosenProvider.toLowerCase(),
          provider: chosenProvider.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId)
        .eq("status", "processing");
      if (pendingUpdateError) {
        console.error("Could not save pending ALRAHUZDATA airtime response:", pendingUpdateError);
      }
      return jsonResponse({
        status: "pending",
        message: "Your airtime purchase is being checked. Do not submit it again yet.",
        reference: providerReference,
      }, 202);
    }

    /*
     * ----------------------------------------------------
     * 13. Handle Provider Failure
     * ----------------------------------------------------
     */

    if (!isSuccess && !isPending) {
      const { error: releaseError } = await supabaseAdmin.rpc(
        "release_airtime_reservation",
        {
          p_transaction_id: transactionId,
          p_provider_response: providerData,
        },
      );
      if (releaseError) {
        console.error("Airtime reservation release failed:", releaseError);
        return jsonResponse({ message: "The provider rejected this request, but the reserved balance could not be released. Please contact support." }, 500);
      }

      return jsonResponse(
        {
          ...(chosenProvider === "BILALSADASUB" ? { status: "failed" } : {}),
          message: failureMessage,
        },
        chosenProvider === "BILALSADASUB" ? 200 : 400,
      );
    }

    /*
     * ----------------------------------------------------
     * 14. Save provider acceptance
     * ----------------------------------------------------
     */

    const { data: updatedTransaction, error: transactionUpdateError } =
      await supabaseAdmin
        .from("vtu_transactions")
        .update({
          provider_reference: providerReference,
          provider_response: providerData,
          service_provider: chosenProvider.toLowerCase(),
          provider: chosenProvider.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId)
        .eq("status", "processing")
        .select("id")
        .maybeSingle();

    if (transactionUpdateError || !updatedTransaction) {
      console.error(
        "Transaction update failed:",
        transactionUpdateError || "Transaction is no longer processing.",
      );

      return jsonResponse(
        {
          message:
            "Airtime was accepted and is being finalized. Do not submit it again yet.",
          reference:
            providerReference ||
            `ABBA-${transactionId}`,
        },
        202,
      );
    }

    /*
     * ----------------------------------------------------
     * 16. Settle reservation
     *
     * Wallet, ledger, reservation, and transaction status
     * are updated atomically by the database function.
     * ----------------------------------------------------
     */

    const { data: settlement, error: settlementError } =
      await supabaseAdmin.rpc("settle_airtime_purchase", {
        p_transaction_id: transactionId,
        p_provider_reference: providerReference,
        p_provider_response: providerData,
      });

    if (settlementError) {
      console.error(
        "Airtime settlement failed:",
        settlementError,
      );

      return jsonResponse(
        {
          message:
            "Airtime was accepted and is being finalized. Do not submit it again yet.",
          reference:
            providerReference ||
            `ABBA-${transactionId}`,
        },
        202,
      );
    }

    return jsonResponse({
      status: "success",
      message: "Airtime recharge completed successfully.",
      reference: providerReference || `ABBA-${transactionId}`,
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
