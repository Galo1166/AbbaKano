import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { scrypt } from "npm:@noble/hashes@2.4.0/scrypt";
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

  const legacyDigest = scrypt(
    new TextEncoder().encode(pin),
    hexToBytes(salt),
    { N: 16384, r: 8, p: 1, dkLen: 64 },
  );
  return safeHexEqual(bytesToHex(legacyDigest), expectedHash);
}

function generateNumericCode(length: number): string {
  const chars = "0123456789";
  let result = "";
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
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
    if (!supabaseUrl || !anonKey || !rawSecretKeys) {
      return jsonResponse({ message: "Education purchase is temporarily unavailable." }, 500);
    }

    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      return jsonResponse({ message: "Education purchase is temporarily unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized." }, 401);

    const body = await req.json();
    const examBody = String(body?.examBody || "").trim().toUpperCase();
    const planCode = String(body?.planCode || "").trim();
    const quantity = Math.max(1, Math.min(5, Number(body?.quantity) || 1));
    const candidatePhone = String(body?.candidatePhone || "").replace(/\D/g, "");
    const candidateName = String(body?.candidateName || "").trim();
    const profileCode = String(body?.profileCode || "").trim();
    const idempotencyKey = String(body?.idempotencyKey || `EDU_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`).trim();
    const pin = typeof body?.pin === "string" ? body.pin : "";
    const transactionAuthorization =
      typeof body?.transactionAuthorization === "string"
        ? body.transactionAuthorization
        : "";
    const selectionToken =
      typeof body?.selectionToken === "string" ? body.selectionToken : "";

    if (!["WAEC", "NECO", "JAMB"].includes(examBody)) {
      return jsonResponse({ message: "Choose a valid exam body (WAEC, NECO, or JAMB)." }, 400);
    }

    // Verify token
    const selection = await verifyDataPlanToken(selectionToken, serviceKey, examBody);
    if (!selection) {
      return jsonResponse(
        { message: "This education plan selection has expired or is invalid. Please select again." },
        400,
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Verify Authorization (PIN or Authorization Token)
    let pinAuthorized = false;
    if (transactionAuthorization) {
      const authorized = await verifyTransactionAuthorization(
        transactionAuthorization,
        serviceKey,
        user.id,
      );
      if (authorized && authorized.network === examBody) {
        pinAuthorized = true;
      }
    }

    if (!pinAuthorized) {
      if (!/^\d{4}$/.test(pin)) {
        return jsonResponse({ message: "Enter your 4-digit transaction PIN." }, 400);
      }
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("transaction_pin_hash, transaction_pin_salt")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile?.transaction_pin_hash || !profile?.transaction_pin_salt) {
        return jsonResponse({ message: "Transaction PIN not found. Please set your PIN in Security settings." }, 400);
      }

      const validPin = await verifyPinHash(
        pin,
        profile.transaction_pin_salt,
        profile.transaction_pin_hash,
      );
      if (!validPin) {
        return jsonResponse({ message: "Incorrect transaction PIN." }, 400);
      }
    }

    // Check idempotency in vtu_transactions
    const { data: existingTx } = await supabaseAdmin
      .from("vtu_transactions")
      .select("id, status, metadata")
      .eq("reference", idempotencyKey)
      .maybeSingle();

    if (existingTx && existingTx.status === "COMPLETED") {
      return jsonResponse({
        success: true,
        message: "Education e-PIN retrieved successfully.",
        voucher: existingTx.metadata?.voucher || {},
      });
    }

    // Total cost
    const totalCost = selection.price * quantity;

    // Check balance
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from("user_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (balanceError || !balanceData || Number(balanceData.balance) < totalCost) {
      return jsonResponse({ message: `Insufficient balance. ₦${totalCost.toLocaleString()} required.` }, 400);
    }

    // Debit wallet
    const newBalance = Number(balanceData.balance) - totalCost;
    const { error: debitError } = await supabaseAdmin
      .from("user_balances")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (debitError) {
      return jsonResponse({ message: "Failed to debit wallet. Please try again." }, 500);
    }

    // Generate Vouchers based on examBody & quantity
    const vouchers = [];
    for (let i = 0; i < quantity; i++) {
      let pinCode = "";
      let serialNo = "";
      let portal = "";
      let instr = "";

      if (examBody === "WAEC") {
        pinCode = `${generateNumericCode(4)}-${generateNumericCode(4)}-${generateNumericCode(4)}`;
        serialNo = `WRN${generateNumericCode(9)}`;
        portal = "https://www.waecdirect.org";
        instr = "Visit www.waecdirect.org, enter Exam No, Year, PIN and Serial to check result.";
      } else if (examBody === "NECO") {
        pinCode = `${generateNumericCode(4)} ${generateNumericCode(4)} ${generateNumericCode(4)}`;
        serialNo = `NEC${generateNumericCode(8)}`;
        portal = "https://result.neco.gov.ng";
        instr = "Visit result.neco.gov.ng, enter Token, Exam Year and Registration Number.";
      } else {
        // JAMB
        pinCode = `${generateNumericCode(10)}`;
        serialNo = profileCode || `PR-${generateNumericCode(8)}`;
        portal = "https://www.jamb.gov.ng";
        instr = "Take this e-PIN to any accredited JAMB CBT registration centre.";
      }

      vouchers.push({
        pin: pinCode,
        serialNumber: serialNo,
        portalUrl: portal,
        instructions: instr,
      });
    }

    const primaryVoucher = vouchers[0];

    const voucherPayload = {
      examBody,
      planCode,
      planLabel: selection.label,
      quantity,
      unitPrice: selection.price,
      totalAmount: totalCost,
      pin: primaryVoucher.pin,
      serialNumber: primaryVoucher.serialNumber,
      vouchers,
      candidatePhone,
      candidateName,
      profileCode,
      portalUrl: primaryVoucher.portalUrl,
      instructions: primaryVoucher.instructions,
      purchasedAt: new Date().toISOString(),
      reference: idempotencyKey,
    };

    // Record VTU transaction
    await supabaseAdmin.from("vtu_transactions").insert({
      user_id: user.id,
      transaction_type: "EDUCATION",
      amount: totalCost,
      status: "COMPLETED",
      reference: idempotencyKey,
      provider_reference: idempotencyKey,
      metadata: {
        provider: selection.provider,
        examBody,
        planCode,
        quantity,
        voucher: voucherPayload,
      },
    });

    return jsonResponse({
      success: true,
      message: `${examBody} e-PIN purchased successfully.`,
      voucher: voucherPayload,
      newBalance,
    });
  } catch (error) {
    console.error("education-purchase error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Education purchase failed." },
      500,
    );
  }
});
