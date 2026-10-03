import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyDataPlanToken } from "../_shared/data-plan-token.ts";
import { verifyTransactionAuthorization } from "../_shared/transaction-authorization.ts";

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

function normalizePhone(value: unknown): string {
  return String(value || "").replace(/\D/g, "").replace(/^234/, "0");
}

function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) {
    throw new Error("Invalid transaction PIN salt.");
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ message: "Missing authorization." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    const apiKey = Deno.env.get("VTUGATE_API_KEY");
    if (!supabaseUrl || !anonKey || !rawSecretKeys || !apiKey) {
      console.error("Cable purchase function configuration is incomplete.");
      return jsonResponse({ message: "Cable TV purchase is unavailable." }, 500);
    }

    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Cable TV purchase is unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);

    const body = await req.json();
    const provider = String(body?.provider || "").trim().toUpperCase();
    const smartcardNumber = String(body?.smartcardNumber || "").replace(/\D/g, "");
    const idempotencyKey = String(body?.idempotencyKey || "").trim();
    const pin = typeof body?.pin === "string" ? body.pin : "";
    const transactionAuthorization =
      typeof body?.transactionAuthorization === "string"
        ? body.transactionAuthorization
        : "";
    const selectionToken =
      typeof body?.selectionToken === "string" ? body.selectionToken : "";

    if (!["DSTV", "GOTV", "STARTIMES"].includes(provider)) {
      return jsonResponse({ message: "Choose a supported cable provider." }, 400);
    }
    if (!/^\d{10}$/.test(smartcardNumber)) {
      return jsonResponse({ message: "Enter a valid 10-digit smartcard number." }, 400);
    }
    if (!/^[A-Za-z0-9._:-]{16,100}$/.test(idempotencyKey)) {
      return jsonResponse({ message: "A valid idempotency key is required." }, 400);
    }

    const selection = await verifyDataPlanToken(
      selectionToken,
      serviceKey,
      provider,
    );
    if (!selection || selection.accountNumber !== smartcardNumber) {
      return jsonResponse(
        { message: "This cable package or smartcard verification expired. Verify it again." },
        400,
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("vtu_transactions")
      .select("id, transaction_type, status, provider_reference")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (existing.transaction_type !== "cable_tv") {
        return jsonResponse({ message: "This idempotency key belongs to another service." }, 409);
      }
      if (existing.status === "success") {
        return jsonResponse({
          status: "success",
          message: "Cable TV subscription already completed.",
          reference: existing.provider_reference || `ABBA-${existing.id}`,
        });
      }
      if (existing.status === "failed") {
        return jsonResponse({
          status: "failed",
          message: "This cable TV request has already failed.",
          reference: existing.provider_reference || `ABBA-${existing.id}`,
        }, 409);
      }
      return jsonResponse({
        status: "pending",
        message: "This cable TV purchase is already being processed.",
        reference: existing.provider_reference || `ABBA-${existing.id}`,
      }, 202);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("phone, transaction_pin_hash, transaction_pin_salt")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    const phone = normalizePhone(profile?.phone || user.user_metadata?.phone);
    if (!/^(?:234|0)\d{10}$/.test(phone)) {
      return jsonResponse({ message: "Add a valid phone number to your profile before purchasing." }, 400);
    }

    if (transactionAuthorization) {
      const authorization = await verifyTransactionAuthorization(
        transactionAuthorization,
        user.id,
        serviceKey,
        { network: provider, phone, selectionToken },
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
        return jsonResponse({ message: "Biometric authorization expired or was already used." }, 403);
      }
    } else {
      if (!/^\d{4}$/.test(pin)) {
        return jsonResponse({ message: "Enter a valid 4-digit transaction PIN." }, 400);
      }
      if (!profile?.transaction_pin_hash || !profile.transaction_pin_salt) {
        return jsonResponse({ message: "Set a transaction PIN before buying cable TV." }, 400);
      }
      if (!(await verifyPinHash(pin, profile.transaction_pin_salt, profile.transaction_pin_hash))) {
        return jsonResponse({ message: "Incorrect transaction PIN." }, 401);
      }
    }

    const { data: reservation, error: reservationError } =
      await supabaseAdmin.rpc("create_cable_reservation", {
        p_user_id: user.id,
        p_provider: provider,
        p_phone_number: phone,
        p_account_number: smartcardNumber,
        p_plan_code: `${selection.serviceId}:${selection.planCode}`,
        p_plan_label: selection.label,
        p_amount_kobo: Math.round(selection.price * 100),
        p_idempotency_key: idempotencyKey,
      });
    if (reservationError) {
      console.error("Cable reservation failed:", reservationError);
      const insufficient = reservationError.message.toLowerCase().includes("insufficient");
      return jsonResponse(
        { message: insufficient ? "Insufficient wallet balance." : "Could not reserve wallet balance." },
        insufficient ? 402 : 500,
      );
    }

    const transactionId = Number(reservation?.transaction_id);
    if (!transactionId) {
      console.error("Invalid cable reservation result:", reservation);
      return jsonResponse({ message: "Could not create cable TV purchase." }, 500);
    }
    if (reservation.status === "already_exists") {
      const successful = reservation.transaction_status === "success";
      return jsonResponse({
        status: successful ? "success" : "pending",
        message: successful
          ? "Cable TV subscription already completed."
          : "This cable TV purchase is already being processed.",
        reference: reservation.provider_reference || `ABBA-${transactionId}`,
      }, successful ? 200 : 202);
    }

    const baseUrl = (Deno.env.get("VTU_GATE_BASE_URL") ||
      "https://api.vtugate.com/api/v1").replace(/\/$/, "");
    let providerResponse: Response;
    let providerPayload: Record<string, unknown> | null;
    try {
      providerResponse = await fetch(`${baseUrl}/buycabletv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          service_id: selection.serviceId,
          phone,
          smartcard_number: smartcardNumber,
          amount: String(selection.price),
          plan_code: selection.planCode,
          plan_name: selection.label,
        }),
        signal: AbortSignal.timeout(15000),
      });
      providerPayload = await providerResponse.json().catch(() => null);
    } catch (providerError) {
      console.error("VTU Gate cable purchase outcome is unknown:", providerError);
      return jsonResponse({
        status: "pending",
        message: "Your cable TV purchase is being checked. Do not submit it again yet.",
        reference: `ABBA-${transactionId}`,
      }, 202);
    }

    if (providerResponse.status >= 500) {
      const { error } = await supabaseAdmin
        .from("vtu_transactions")
        .update({
          provider_response: providerPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId)
        .eq("status", "processing");
      if (error) console.error("Could not record cable provider response:", error);
      return jsonResponse({
        status: "pending",
        message: "Your cable TV purchase is being checked. Do not submit it again yet.",
        reference: `ABBA-${transactionId}`,
      }, 202);
    }

    if (!providerResponse.ok || providerPayload?.status !== true) {
      const rejection = providerPayload || {
        message: `VTU Gate rejected the request with HTTP ${providerResponse.status}.`,
      };
      const { error: releaseError } = await supabaseAdmin.rpc(
        "release_cable_reservation",
        { p_transaction_id: transactionId, p_provider_response: rejection },
      );
      if (releaseError) {
        console.error("Could not release failed cable reservation:", releaseError);
        return jsonResponse({
          message: "Provider rejected the purchase, but wallet release needs support review.",
          reference: `ABBA-${transactionId}`,
        }, 500);
      }
      return jsonResponse({
        message: String(providerPayload?.message || "VTU Gate rejected the cable purchase."),
      }, 400);
    }

    const payloadData = providerPayload.data as Record<string, unknown> | undefined;
    const providerReference = String(
      payloadData?.external_reference ||
        payloadData?.transaction_id ||
        providerPayload.reference ||
        providerPayload.transaction_id ||
        `ABBA-${transactionId}`,
    );
    const { error: settlementError } = await supabaseAdmin.rpc(
      "settle_cable_purchase",
      {
        p_transaction_id: transactionId,
        p_provider_reference: providerReference,
        p_provider_response: providerPayload,
      },
    );
    if (settlementError) {
      console.error("Cable settlement failed:", settlementError);
      return jsonResponse({
        status: "pending",
        message: "Provider accepted the cable request; final wallet settlement is pending review.",
        reference: providerReference,
      }, 202);
    }

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from("wallets")
      .select("balance_kobo")
      .eq("user_id", user.id)
      .maybeSingle();
    if (walletError) console.error("Could not read settled cable wallet balance:", walletError);
    return jsonResponse({
      status: "success",
      message: "Cable TV subscription completed successfully.",
      reference: providerReference,
      balance_kobo: wallet?.balance_kobo,
    }, 201);
  } catch (error) {
    console.error("cable-purchase error:", error);
    return jsonResponse(
      { message: "Could not complete cable TV purchase. Please retry or contact support." },
      500,
    );
  }
});
