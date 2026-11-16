import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callAlrahuzApi,
  isAlrahuzPending,
  isAlrahuzSuccess,
} from "../_shared/alrahuzdata.ts";
import { verifyEducationPlanToken } from "../_shared/education-plan-token.ts";
import { verifyTransactionPinHash } from "../_shared/transaction-pin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonObject = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractPins(payload: JsonObject | null): unknown {
  if (!payload) return null;
  const data = payload.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const dataObject = data as JsonObject;
    const pins = dataObject.pins ?? dataObject.pin;
    if (pins !== undefined) return pins;
  }
  return payload.pins ?? payload.pin ?? null;
}

function hasPins(payload: JsonObject | null): boolean {
  const pins = extractPins(payload);
  return Array.isArray(pins)
    ? pins.length > 0
    : typeof pins === "string" && pins.trim().length > 0;
}

function extractProviderReference(
  payload: JsonObject | null,
  fallback: string,
): string {
  if (!payload) return fallback;
  const data = payload.data && typeof payload.data === "object"
    ? payload.data as JsonObject
    : {};
  const value = payload.ident || data.ident || payload.id || data.id ||
    payload.reference || data.reference;
  return value === undefined || value === null ? fallback : String(value);
}

function providerAccepted(payload: JsonObject | null): boolean {
  if (!payload) return false;
  if (payload.status === true || payload.Status === true) return true;
  const data = payload.data && typeof payload.data === "object"
    ? payload.data as JsonObject
    : {};
  if (data.status === true || data.Status === true) return true;
  return isAlrahuzSuccess(payload) || isAlrahuzSuccess(data);
}

function providerExplicitlyRejected(payload: JsonObject | null): boolean {
  if (!payload) return false;
  if (payload.status === false || payload.Status === false) return true;
  const data = payload.data && typeof payload.data === "object"
    ? payload.data as JsonObject
    : {};
  const status = payload.status ?? payload.Status ?? data.status ?? data.Status;
  return data.status === false ||
    data.Status === false ||
    (typeof status === "string" &&
      ["failed", "error", "rejected", "unsuccessful"].includes(
        status.toLowerCase(),
      ));
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
    if (!authorization) {
      return jsonResponse({ message: "Missing authorization." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    const alrahuzToken = Deno.env.get("ALRAHUZDATA_API_TOKEN") ||
      Deno.env.get("ALRAHUZ_API_TOKEN") || "";
    if (!supabaseUrl || !anonKey || !rawSecretKeys || !alrahuzToken) {
      console.error("Education purchase function configuration is incomplete.");
      return jsonResponse(
        { message: "Education PIN purchase is unavailable." },
        500,
      );
    }

    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey =
      secretKeys && typeof secretKeys === "object" && "default" in secretKeys
        ? secretKeys.default
        : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      return jsonResponse(
        { message: "Education PIN purchase is unavailable." },
        500,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth
      .getUser();
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    const parsedBody: unknown = await req.json().catch(() => null);
    if (
      !parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)
    ) {
      return jsonResponse({ message: "Invalid request body." }, 400);
    }
    const body = parsedBody as JsonObject;
    const selectionToken = typeof body.selectionToken === "string"
      ? body.selectionToken
      : "";
    const idempotencyKey = typeof body.idempotencyKey === "string"
      ? body.idempotencyKey.trim()
      : "";
    const pin = typeof body.pin === "string" ? body.pin : "";
    const quantity = Number(body.quantity);
    const profileId = typeof body.profileId === "string"
      ? body.profileId.trim()
      : "";
    const variationCode = typeof body.variationCode === "string"
      ? body.variationCode.trim()
      : "";

    if (!/^[A-Za-z0-9._:-]{16,100}$/.test(idempotencyKey)) {
      return jsonResponse(
        { message: "A valid idempotency key is required." },
        400,
      );
    }
    if (!/^\d{4}$/.test(pin)) {
      return jsonResponse(
        { message: "Enter your 4-digit transaction PIN." },
        400,
      );
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
      return jsonResponse(
        { message: "Choose a quantity between 1 and 10." },
        400,
      );
    }

    const selection = await verifyEducationPlanToken(
      selectionToken,
      serviceKey,
    );
    if (!selection) {
      return jsonResponse({
        message:
          "This education product is no longer available. Reload the catalog and try again.",
      }, 400);
    }
    const isJamb = /jamb/i.test(
      `${selection.billerSlug} ${selection.billerName}`,
    );
    if (isJamb && quantity !== 1) {
      return jsonResponse({
        message: "JAMB profile pins can only be purchased one at a time.",
      }, 400);
    }
    if (
      isJamb &&
      (!/^\d{10}$/.test(profileId) ||
        !/^[a-z0-9_-]{1,40}$/i.test(variationCode))
    ) {
      return jsonResponse({
        message: "Enter a valid JAMB profile ID and choose a variation.",
      }, 400);
    }
    if (!isJamb && (profileId || variationCode)) {
      return jsonResponse({
        message: "JAMB details are only valid for a JAMB purchase.",
      }, 400);
    }

    const amount = selection.unitPrice * quantity;
    const amountKobo = Math.round(amount * 100);
    if (
      !Number.isSafeInteger(amountKobo) || amountKobo <= 0 || amount > 100000
    ) {
      return jsonResponse(
        { message: "The education PIN amount is invalid." },
        400,
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("vtu_transactions")
      .select(
        "id, transaction_type, status, provider_reference, provider_response",
      )
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (existing.transaction_type !== "education_pin") {
        return jsonResponse({
          message: "This idempotency key was used for another purchase.",
        }, 409);
      }
      if (existing.status === "success") {
        return jsonResponse({
          status: "success",
          message: "Education PIN purchase already completed.",
          reference: existing.provider_reference || `ABBA-${existing.id}`,
          pins: extractPins(existing.provider_response),
        });
      }
      if (existing.status === "failed") {
        return jsonResponse({
          status: "failed",
          message: "This education PIN purchase has already failed.",
          reference: existing.provider_reference || `ABBA-${existing.id}`,
        }, 409);
      }
      return jsonResponse({
        status: "pending",
        message:
          "This education PIN purchase is already being processed. Do not submit it again yet.",
        reference: existing.provider_reference || `ABBA-${existing.id}`,
      }, 202);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("phone, transaction_pin_hash, transaction_pin_salt")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.transaction_pin_hash || !profile.transaction_pin_salt) {
      return jsonResponse({
        message: "Set a transaction PIN before buying an education PIN.",
      }, 400);
    }
    if (
      !(await verifyTransactionPinHash(
        pin,
        profile.transaction_pin_salt,
        profile.transaction_pin_hash,
      ))
    ) {
      return jsonResponse({ message: "Incorrect transaction PIN." }, 401);
    }

    let jambCustomerName = "";
    if (isJamb) {
      const jambQuery = new URLSearchParams({
        profile_id: profileId,
        variation_code: variationCode,
      });
      const validation = await callAlrahuzApi<JsonObject>(
        `/api/validatejamb/?${jambQuery.toString()}`,
        { token: alrahuzToken, baseUrl: "https://alrahuzdata.com.ng" },
      );
      const validationStatus = validation.data?.status ??
        validation.data?.Status;
      if (
        !validation.ok ||
        validationStatus === false ||
        (typeof validationStatus === "string" &&
          ["failed", "error", "invalid"].includes(
            validationStatus.toLowerCase(),
          ))
      ) {
        return jsonResponse({
          message: validation.error ||
            String(
              validation.data?.message || validation.data?.msg ||
                "Could not verify the JAMB profile.",
            ),
        }, 400);
      }
      const validationData = validation.data?.data &&
          typeof validation.data.data === "object"
        ? validation.data.data as JsonObject
        : validation.data;
      jambCustomerName = String(
        validationData?.customer_name ||
          validationData?.customerName ||
          validationData?.name ||
          "",
      ).trim();
      if (!jambCustomerName) {
        return jsonResponse({
          message: "ALRAHUZDATA did not return a verified JAMB customer name.",
        }, 502);
      }
    }

    const providerPlanCode = `${selection.billerSlug}:${selection.productId}`;
    const { data: reservation, error: reservationError } = await supabaseAdmin
      .rpc("create_education_reservation", {
        p_user_id: user.id,
        p_exam_name: selection.billerName,
        p_phone_number: profile.phone || user.phone || "",
        p_account_number: isJamb ? profileId : null,
        p_plan_code: providerPlanCode,
        p_plan_label: selection.productName,
        p_quantity: quantity,
        p_amount_kobo: amountKobo,
        p_idempotency_key: idempotencyKey,
      });
    if (reservationError) {
      console.error("Education PIN reservation failed:", reservationError);
      const insufficient = reservationError.message.toLowerCase().includes(
        "insufficient",
      );
      return jsonResponse({
        message: insufficient
          ? "Insufficient wallet balance."
          : "Could not reserve wallet balance.",
      }, insufficient ? 402 : 500);
    }

    const transactionId = Number(reservation?.transaction_id);
    if (!transactionId) {
      console.error("Invalid education PIN reservation result.");
      return jsonResponse({
        message: "Could not create education PIN purchase.",
      }, 500);
    }
    if (reservation.status === "already_exists") {
      const successful = reservation.transaction_status === "success";
      return jsonResponse({
        status: successful ? "success" : "pending",
        message: successful
          ? "Education PIN purchase already completed."
          : "This education PIN purchase is already being processed.",
        reference: reservation.provider_reference || `ABBA-${transactionId}`,
        ...(successful
          ? { pins: extractPins(reservation.provider_response) }
          : {}),
      }, successful ? 200 : 202);
    }

    const providerBody: JsonObject = {
      exam_name: selection.billerName,
      quantity,
      ...(isJamb
        ? {
          profile_id: profileId,
          variation_code: variationCode,
          customer_name: jambCustomerName,
        }
        : {}),
    };
    const providerResult = await callAlrahuzApi<JsonObject>("/epin/", {
      method: "POST",
      token: alrahuzToken,
      body: providerBody,
      timeoutMs: 45000,
    });
    const providerPayload = providerResult.data;
    const providerReference = extractProviderReference(
      providerPayload,
      `ABBA-${transactionId}`,
    );
    const accepted = providerResult.ok &&
      (providerAccepted(providerPayload) || hasPins(providerPayload));
    const pending = providerResult.status >= 500 ||
      (providerResult.ok && (
        isAlrahuzPending(providerPayload) ||
        (!accepted && !providerExplicitlyRejected(providerPayload))
      ));

    if (!accepted && !pending) {
      const rejection = providerPayload || {
        message: providerResult.error ||
          "ALRAHUZDATA rejected the education PIN purchase.",
      };
      const { error: releaseError } = await supabaseAdmin.rpc(
        "release_education_reservation",
        {
          p_transaction_id: transactionId,
          p_provider_response: rejection,
        },
      );
      if (releaseError) {
        console.error(
          "Could not release failed education PIN reservation:",
          releaseError,
        );
        return jsonResponse({
          message:
            "Provider rejected the purchase, but wallet release needs support review.",
          reference: `ABBA-${transactionId}`,
        }, 500);
      }
      return jsonResponse({
        message: providerResult.error ||
          String(
            providerPayload?.message || providerPayload?.msg ||
              "ALRAHUZDATA rejected the education PIN purchase.",
          ),
      }, 400);
    }

    const { error: responseSaveError } = await supabaseAdmin
      .from("vtu_transactions")
      .update({
        provider_reference: providerReference,
        provider_response: providerPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .eq("status", "processing");
    if (responseSaveError) {
      console.error(
        "Could not save accepted education PIN response:",
        responseSaveError,
      );
      return jsonResponse({
        status: "pending",
        message:
          "Your education PIN purchase is being checked. Do not submit it again yet.",
        reference: providerReference,
      }, 202);
    }

    if (pending) {
      return jsonResponse({
        status: "pending",
        message:
          "Your education PIN purchase is being checked. Do not submit it again yet.",
        reference: providerReference,
      }, 202);
    }

    const { data: settlement, error: settlementError } = await supabaseAdmin
      .rpc(
        "settle_education_purchase",
        {
          p_transaction_id: transactionId,
          p_provider_reference: providerReference,
          p_provider_response: providerPayload,
        },
      );
    if (settlementError) {
      console.error("Education PIN settlement failed:", settlementError);
      return jsonResponse({
        status: "pending",
        message:
          "The provider accepted your order; wallet settlement is still being finalized.",
        reference: providerReference,
      }, 202);
    }

    return jsonResponse({
      status: "success",
      message: "Education PIN purchase completed successfully.",
      reference: providerReference,
      pins: extractPins(providerPayload),
      balance_kobo: settlement?.balance_after_kobo,
    }, 201);
  } catch (error) {
    console.error("education-purchase error:", error);
    return jsonResponse({
      message:
        "Could not complete the education PIN purchase. Please retry or contact support.",
    }, 500);
  }
});
