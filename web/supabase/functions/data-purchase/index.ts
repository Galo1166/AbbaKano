import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyDataPlanToken } from "../_shared/data-plan-token.ts";
import { verifyTransactionAuthorization } from "../_shared/transaction-authorization.ts";
import {
  ALRAHUZ_NETWORK_IDS,
  callAlrahuzApi,
  isAlrahuzSuccess,
  isAlrahuzPending,
} from "../_shared/alrahuzdata.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) {
    throw new Error("Invalid transaction PIN salt");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function bytesToHex(value: Uint8Array): string {
  return Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeHexEqual(actual: string, expected: string): boolean {
  if (
    !/^[0-9a-fA-F]+$/.test(actual) ||
    !/^[0-9a-fA-F]+$/.test(expected) ||
    actual.length !== expected.length
  ) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < actual.length; index++) {
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
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
    const input = new Uint8Array(passwordBytes.length + saltBytes.length);
    input.set(passwordBytes);
    input.set(saltBytes, passwordBytes.length);
    const digest = await crypto.subtle.digest("SHA-256", input);
    return safeHexEqual(bytesToHex(new Uint8Array(digest)), expectedHash);
  }

  if (expectedHash.length !== 128) return false;
  const { scrypt } = await import("npm:@noble/hashes@2.4.0/scrypt.js");
  const digest = scrypt(
    new TextEncoder().encode(pin),
    new TextEncoder().encode(salt),
    { N: 16384, r: 8, p: 1, dkLen: 64 },
  );
  if (safeHexEqual(bytesToHex(digest), expectedHash)) return true;

  const legacyDigest = scrypt(
    new TextEncoder().encode(pin),
    hexToBytes(salt),
    { N: 16384, r: 8, p: 1, dkLen: 64 },
  );
  return safeHexEqual(bytesToHex(legacyDigest), expectedHash);
}

function normalizePhone(value: unknown): string {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.replace(/^234/, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ message: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    const alrahuzToken = Deno.env.get("ALRAHUZDATA_API_TOKEN") || Deno.env.get("ALRAHUZ_API_TOKEN") || "";
    if (!supabaseUrl || !anonKey || !rawSecretKeys || !alrahuzToken) {
      console.error("Data purchase function configuration is incomplete.");
      return jsonResponse({ message: "Data purchase is temporarily unavailable." }, 500);
    }

    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Data purchase is temporarily unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized" }, 401);

    const body = await req.json();
    const network = String(body?.network || "").trim().toUpperCase();
    const phone = normalizePhone(body?.phone);
    const idempotencyKey = String(body?.idempotencyKey || "").trim();
    const pin = typeof body?.pin === "string" ? body.pin : "";
    const transactionAuthorization =
      typeof body?.transactionAuthorization === "string"
        ? body.transactionAuthorization
        : "";
    const planToken =
      typeof body?.selectionToken === "string" ? body.selectionToken : "";

    if (!["MTN", "AIRTEL", "GLO", "9MOBILE"].includes(network)) {
      return jsonResponse({ message: "Choose a supported network." }, 400);
    }
    if (!/^0\d{10}$/.test(phone)) {
      return jsonResponse({ message: "Enter a valid 11-digit phone number." }, 400);
    }
    if (!/^[A-Za-z0-9._:-]{16,100}$/.test(idempotencyKey)) {
      return jsonResponse({ message: "A valid idempotency key is required." }, 400);
    }

    const selection = await verifyDataPlanToken(
      planToken,
      serviceKey,
      network,
    );
    if (!selection || selection.provider !== "alrahuzdata") {
      return jsonResponse({
        message: "This data plan is no longer available. Reload plans and choose again.",
      }, 400);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("vtu_transactions")
      .select("id, transaction_type, status, provider, provider_reference, provider_response")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingError) {
      console.error("Data idempotency lookup failed:", existingError);
      return jsonResponse({ message: "Could not check this purchase request." }, 500);
    }
    if (existing) {
      if (existing.transaction_type !== "data") {
        return jsonResponse({ message: "This idempotency key was used for another purchase." }, 409);
      }
      if (existing.status === "success") {
        return jsonResponse({
          status: "success",
          message: "Data purchase already completed.",
          reference: existing.provider_reference || `ABBA-${existing.id}`,
        });
      }
      if (existing.status === "failed") {
        return jsonResponse({
          status: "failed",
          message: "This data purchase request has already failed.",
          reference: existing.provider_reference || `ABBA-${existing.id}`,
        }, 409);
      }
      const previousProviderResponse = existing.provider_response;
      if (
        existing.status === "processing" &&
        existing.provider === "alrahuzdata" &&
        existing.provider_reference &&
        previousProviderResponse &&
        typeof previousProviderResponse === "object" &&
        !Array.isArray(previousProviderResponse) &&
        isAlrahuzSuccess(previousProviderResponse as Record<string, unknown>)
      ) {
        const { error: retrySettlementError } = await supabaseAdmin.rpc(
          "settle_data_purchase",
          {
            p_transaction_id: existing.id,
            p_provider_reference: existing.provider_reference,
            p_provider_response: previousProviderResponse,
          },
        );
        if (retrySettlementError) {
          console.error("Data purchase settlement retry failed:", retrySettlementError);
          return jsonResponse({
            status: "pending",
            message: "Your data purchase is being checked. Do not submit it again yet.",
            reference: existing.provider_reference,
          }, 202);
        }

        const { data: ledgerEntry, error: ledgerLookupError } = await supabaseAdmin
          .from("wallet_ledger")
          .select("metadata")
          .eq("user_id", user.id)
          .eq("transaction_id", existing.id)
          .maybeSingle();
        if (ledgerLookupError || !ledgerEntry) {
          console.error(
            "Could not load the retried data ledger entry:",
            ledgerLookupError || "Ledger entry was not found.",
          );
        } else {
          const existingMetadata =
            ledgerEntry.metadata &&
            typeof ledgerEntry.metadata === "object" &&
            !Array.isArray(ledgerEntry.metadata)
              ? ledgerEntry.metadata
              : {};
          const { error: ledgerUpdateError } = await supabaseAdmin
            .from("wallet_ledger")
            .update({
              description: selection.label,
              metadata: {
                ...existingMetadata,
                plan_label: selection.label,
                plan_code: `${selection.serviceId}:${selection.planCode}`,
              },
            })
            .eq("user_id", user.id)
            .eq("transaction_id", existing.id);
          if (ledgerUpdateError) {
            console.error("Could not save retried data plan details to the ledger:", ledgerUpdateError);
          }
        }

        const { data: wallet, error: walletError } = await supabaseAdmin
          .from("wallets")
          .select("balance_kobo")
          .eq("user_id", user.id)
          .maybeSingle();
        if (walletError) {
          console.error("Could not load wallet after data settlement retry:", walletError);
          return jsonResponse({
            status: "success",
            message: "Data purchase completed successfully.",
            reference: existing.provider_reference,
          }, 200);
        }
        return jsonResponse({
          status: "success",
          message: "Data purchase completed successfully.",
          reference: existing.provider_reference,
          balance_kobo: wallet?.balance_kobo,
        });
      }
      return jsonResponse({
        status: "pending",
        message: "This data purchase is already being processed.",
        reference: existing.provider_reference || `ABBA-${existing.id}`,
      }, 202);
    }

    if (transactionAuthorization) {
      const authorization = await verifyTransactionAuthorization(
        transactionAuthorization,
        user.id,
        serviceKey,
        { network, phone, selectionToken: planToken },
      );
      if (!authorization) {
        return jsonResponse({ message: "Biometric authorization expired. Try again." }, 403);
      }

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
        if (consumeError) console.error("Passkey authorization consume failed:", consumeError);
        return jsonResponse({ message: "Biometric authorization has expired or was already used." }, 403);
      }
    } else {
      if (!/^\d{4}$/.test(pin)) {
        return jsonResponse({ message: "Enter a valid 4-digit transaction PIN." }, 400);
      }
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("transaction_pin_hash, transaction_pin_salt")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        console.error("Data PIN profile lookup failed:", profileError);
        return jsonResponse({ message: "Could not verify transaction PIN." }, 500);
      }
      if (!profile?.transaction_pin_hash || !profile?.transaction_pin_salt) {
        return jsonResponse({ message: "Set a transaction PIN before buying data." }, 400);
      }
      if (!(await verifyPinHash(pin, profile.transaction_pin_salt, profile.transaction_pin_hash))) {
        return jsonResponse({ message: "Incorrect transaction PIN." }, 401);
      }
    }

    const amountKobo = Math.round(selection.price * 100);
    const providerCode = `${selection.serviceId}:${selection.planCode}`;
    const { data: reservation, error: reservationError } =
      await supabaseAdmin.rpc("create_data_reservation", {
        p_user_id: user.id,
        p_network: network,
        p_phone_number: phone,
        p_service_provider: selection.provider,
        p_plan_code: providerCode,
        p_amount_kobo: amountKobo,
        p_idempotency_key: idempotencyKey,
      });

    if (reservationError) {
      console.error("Data reservation failed:", reservationError);
      const message = reservationError.message.toLowerCase().includes("insufficient")
        ? "Insufficient wallet balance."
        : "Could not reserve wallet balance.";
      return jsonResponse({ message }, message.startsWith("Insufficient") ? 402 : 500);
    }

    const transactionId = Number(reservation?.transaction_id);
    if (!transactionId) {
      console.error("Invalid data reservation result:", reservation);
      return jsonResponse({ message: "Could not create data purchase." }, 500);
    }
    if (reservation.status === "already_exists") {
      return jsonResponse({
        status: reservation.transaction_status === "success" ? "success" : "pending",
        message: reservation.transaction_status === "success"
          ? "Data purchase already completed."
          : "This data purchase is already being processed.",
        reference: reservation.provider_reference || `ABBA-${transactionId}`,
      }, reservation.transaction_status === "success" ? 200 : 202);
    }

    let providerPayload: Record<string, unknown> | null = null;
    let providerReference = `ABBA-${transactionId}`;
    let providerPending = false;

    if (selection.provider === "alrahuzdata") {
      if (!alrahuzToken) {
        return jsonResponse({ message: "ALRAHUZDATA API token is not configured." }, 500);
      }
      const alrahuzNetwork = Number(selection.serviceId) || ALRAHUZ_NETWORK_IDS[network] || 1;
      const alrahuzPlan = Number(selection.planCode);

      console.log(`Dispatching data to ALRAHUZDATA: network=${alrahuzNetwork}, plan=${alrahuzPlan}, phone=${phone}`);
      let alrahuzRes;
      try {
        alrahuzRes = await callAlrahuzApi<Record<string, unknown>>("/data/", {
          method: "POST",
          token: alrahuzToken,
          body: {
            network: alrahuzNetwork,
            mobile_number: phone,
            plan: alrahuzPlan,
            Ported_number: true,
          },
          timeoutMs: 45000,
        });
      } catch (providerError) {
        console.error("ALRAHUZDATA data purchase outcome is unknown:", providerError);
        return jsonResponse({
          status: "pending",
          message: "Your data purchase is being checked. Do not submit it again yet.",
          reference: `ABBA-${transactionId}`,
        }, 202);
      }

      providerPayload = alrahuzRes.data || { error: alrahuzRes.error };

      if (!alrahuzRes.ok && alrahuzRes.status >= 500) {
        await supabaseAdmin
          .from("vtu_transactions")
          .update({
            provider_response: providerPayload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId)
          .eq("status", "processing");
        return jsonResponse({
          status: "pending",
          message: "Your data purchase is being checked. Do not submit it again yet.",
          reference: `ABBA-${transactionId}`,
        }, 202);
      }

      const isSuccess = alrahuzRes.ok && isAlrahuzSuccess(alrahuzRes.data);
      const isPending = isAlrahuzPending(alrahuzRes.data);
      providerPending = !isSuccess && isPending;

      if (!isSuccess && !isPending) {
        const rejection = providerPayload || {
          message: alrahuzRes.error || "ALRAHUZDATA rejected the data purchase.",
        };
        const { error: releaseError } = await supabaseAdmin.rpc(
          "release_data_reservation",
          {
            p_transaction_id: transactionId,
            p_provider_response: rejection,
          },
        );
        if (releaseError) {
          console.error("Could not release failed data reservation:", releaseError);
          return jsonResponse({
            message: "Provider rejected the purchase, but wallet release needs support review.",
            reference: `ABBA-${transactionId}`,
          }, 500);
        }
        return jsonResponse({
          message: String(
            alrahuzRes.error ||
            alrahuzRes.data?.message ||
            alrahuzRes.data?.msg ||
            alrahuzRes.data?.detail ||
            "ALRAHUZDATA rejected the data purchase.",
          ),
        }, 400);
      }

      if (alrahuzRes.data?.id) {
        providerReference = String(alrahuzRes.data.id);
      }
    }

    const { error: providerResponseSaveError } = await supabaseAdmin
      .from("vtu_transactions")
      .update({
        provider_reference: providerReference,
        provider_response: providerPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .eq("status", "processing");
    if (providerResponseSaveError) {
      console.error("Could not save accepted data provider response:", providerResponseSaveError);
      return jsonResponse({
        status: "pending",
        message: "Your data purchase is being checked. Do not submit it again yet.",
        reference: providerReference,
      }, 202);
    }

    if (providerPending) {
      return jsonResponse({
        status: "pending",
        message: "Your data purchase is being checked. Do not submit it again yet.",
        reference: providerReference,
      }, 202);
    }

    const { data: settlementData, error: settlementError } = await supabaseAdmin.rpc(
      "settle_data_purchase",
      {
        p_transaction_id: transactionId,
        p_provider_reference: providerReference,
        p_provider_response: providerPayload,
      },
    );

    if (settlementError) {
      console.error("Data purchase settlement failed:", settlementError);
      return jsonResponse({
        status: "pending",
        message: "Your data purchase is being finalized. Do not submit it again yet.",
        reference: providerReference,
      }, 202);
    }
    const finalBalanceKobo = (settlementData as { balance_after_kobo?: number } | null)?.balance_after_kobo;

    const { data: ledgerEntry, error: ledgerLookupError } = await supabaseAdmin
      .from("wallet_ledger")
      .select("metadata")
      .eq("user_id", user.id)
      .eq("transaction_id", transactionId)
      .maybeSingle();
    if (ledgerLookupError || !ledgerEntry) {
      console.error(
        "Could not load the settled data ledger entry:",
        ledgerLookupError || "Ledger entry was not found.",
      );
    } else {
      const existingMetadata =
        ledgerEntry.metadata &&
        typeof ledgerEntry.metadata === "object" &&
        !Array.isArray(ledgerEntry.metadata)
          ? ledgerEntry.metadata
          : {};
      const { error: ledgerUpdateError } = await supabaseAdmin
        .from("wallet_ledger")
        .update({
          description: selection.label,
          metadata: {
            ...existingMetadata,
            plan_label: selection.label,
            plan_code: providerCode,
          },
        })
        .eq("user_id", user.id)
        .eq("transaction_id", transactionId);
      if (ledgerUpdateError) {
        console.error("Could not save data plan details to the ledger:", ledgerUpdateError);
      }
    }

    const { data: wallet } = await supabaseAdmin
      .from("wallets")
      .select("balance_kobo")
      .eq("user_id", user.id)
      .maybeSingle();

    return jsonResponse({
      status: "success",
      message: "Data purchase completed successfully.",
      reference: providerReference,
      balance_kobo: finalBalanceKobo ?? wallet?.balance_kobo,
    }, 201);
  } catch (error) {
    console.error("data-purchase error:", error);
    return jsonResponse(
      { message: "Could not complete data purchase. Please retry or contact support." },
      500,
    );
  }
});
