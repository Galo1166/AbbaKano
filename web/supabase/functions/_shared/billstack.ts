import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface BillstackConfig {
  secretKey: string;
  baseUrl: string;
}

export interface BillstackVirtualAccount {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

const BILLSTACK_BANKS = ["9PSB", "SAFEHAVEN", "PROVIDUS", "PALMPAY"] as const;
export type BillstackBank = (typeof BILLSTACK_BANKS)[number];

export async function getBillstackConfig(
  supabaseAdmin?: ReturnType<typeof createClient<any>>,
): Promise<BillstackConfig | null> {
  let secretKey = Deno.env.get("BILLSTACK_SECRET_KEY")?.trim() || "";

  if (!secretKey && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("admin_system_settings")
      .select("settings")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(`Could not load Billstack settings: ${error.message}`);

    const billstack = data?.settings?.billstack;
    if (billstack && typeof billstack.secretKey === "string") {
      secretKey = billstack.secretKey.trim();
    }
  }

  if (!secretKey) return null;

  return {
    secretKey,
    baseUrl: (Deno.env.get("BILLSTACK_BASE_URL") || "https://api.billstack.co/v2")
      .trim()
      .replace(/\/+$/, ""),
  };
}

export async function createBillstackVirtualAccount(
  supabaseAdmin: ReturnType<typeof createClient<any>>,
  config: BillstackConfig,
  user: { id: string; fullName: string; email: string; phone: string },
  bank: BillstackBank,
  identity?: { bvn?: string; nin?: string },
): Promise<BillstackVirtualAccount> {
  if (!user.email || !user.phone) {
    throw new Error("A customer email and phone number are required to create Billstack accounts.");
  }

  const [firstName, ...lastNameParts] = user.fullName.trim().split(/\s+/).filter(Boolean);
  const first = firstName || "Customer";
  const last = lastNameParts.join(" ") || first;
  const accountReference = `ABBA-${user.id.replace(/-/g, "")}-${bank.toLowerCase()}`;
  const idType = identity?.bvn ? "bvn" : identity?.nin ? "nin" : "";
  const idNumber = identity?.bvn || identity?.nin || "";

  const response = await fetch(
    `${config.baseUrl}/thirdparty/generateVirtualAccount/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reference: accountReference,
        email: user.email,
        phone: user.phone,
        firstName: first,
        lastName: last,
        bank,
        ...(bank === "PALMPAY" ? { idType, idNumber } : {}),
      }),
      signal: AbortSignal.timeout(20000),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== true) {
    throw new Error(
      payload?.message || `Billstack account creation failed (HTTP ${response.status}).`,
    );
  }

  const account = Array.isArray(payload.data?.account) ? payload.data.account[0] : null;
  const bankName = String(account?.bank_name || "").trim();
  const bankCode = bank;
  const accountNumber = String(account?.account_number || "").trim();
  const accountName = String(account?.account_name || "").trim();
  const returnedReference = String(payload.data?.reference || "").trim();

  if (!bankName || !accountNumber || !accountName || !returnedReference) {
    throw new Error("Billstack returned an account with incomplete details.");
  }

  const { error: saveError } = await supabaseAdmin
    .from("user_virtual_accounts")
    .upsert(
      {
        user_id: user.id,
        account_reference: returnedReference,
        bank_name: bankName,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
        provider: "billstack",
        metadata: { ...account, request_reference: accountReference },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,bank_name,account_number" },
    );
  if (saveError) {
    throw new Error(`Could not save the Billstack virtual account: ${saveError.message}`);
  }

  return { bankName, bankCode, accountNumber, accountName };
}

export async function verifyBillstackSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secretKey: string,
): Promise<boolean> {
  if (!/^\d+$/.test(timestamp) || !/^[a-f\d]{64}$/i.test(signature) || !secretKey) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 300
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${rawBody}`),
    ),
  );
  const expected = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");

  let difference = expected.length ^ signature.length;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ (signature.toLowerCase().charCodeAt(index) || 0);
  }
  return difference === 0;
}
