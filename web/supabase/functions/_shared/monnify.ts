import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface MonnifyConfig {
  apiKey: string;
  secretKey: string;
  contractCode: string;
  baseUrl: string;
}

export interface VirtualAccountItem {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

let cachedAccessToken: {
  token: string;
  expiresAt: number;
  configKey: string;
} | null = null;

export async function getMonnifyConfig(
  supabaseAdmin?: ReturnType<typeof createClient>,
): Promise<MonnifyConfig | null> {
  let apiKey = Deno.env.get("MONNIFY_API_KEY") || "";
  let secretKey = Deno.env.get("MONNIFY_SECRET_KEY") || "";
  let contractCode = Deno.env.get("MONNIFY_CONTRACT_CODE") || "";
  let baseUrl = (Deno.env.get("MONNIFY_BASE_URL") || "")
    .trim()
    .replace(/\/$/, "");

  // If not in env, check admin_system_settings in database
  if ((!apiKey || !secretKey || !contractCode) && supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from("admin_system_settings")
        .select("settings")
        .eq("id", true)
        .maybeSingle();
      if (data?.settings?.monnify) {
        const m = data.settings.monnify;
        if (!apiKey && m.apiKey) apiKey = String(m.apiKey).trim();
        if (!secretKey && m.secretKey) secretKey = String(m.secretKey).trim();
        if (!contractCode && m.contractCode) contractCode = String(m.contractCode).trim();
        if (!baseUrl && m.baseUrl) {
          baseUrl = String(m.baseUrl).trim().replace(/\/$/, "");
        }
      }
    } catch (err) {
      console.warn("Could not load Monnify settings from database:", err);
    }
  }

  if (!apiKey || !secretKey || !contractCode) {
    return null;
  }

  baseUrl ||= "https://api.monnify.com";
  return { apiKey, secretKey, contractCode, baseUrl };
}

export async function getMonnifyAccessToken(config: MonnifyConfig): Promise<string> {
  const configKey = `${config.baseUrl}:${config.apiKey}:${config.secretKey}`;
  if (
    cachedAccessToken &&
    cachedAccessToken.configKey === configKey &&
    cachedAccessToken.expiresAt > Date.now()
  ) {
    return cachedAccessToken.token;
  }

  const credentials = btoa(`${config.apiKey}:${config.secretKey}`);
  const response = await fetch(`${config.baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.requestSuccessful !== true || !payload?.responseBody?.accessToken) {
    throw new Error(
      payload?.responseMessage || `Monnify authentication failed (HTTP ${response.status})`,
    );
  }

  const token = String(payload.responseBody.accessToken);
  const expiresInSeconds = Number(payload.responseBody.expiresIn) || 3500;
  cachedAccessToken = {
    token,
    expiresAt: Date.now() + (expiresInSeconds - 300) * 1000,
    configKey,
  };

  return token;
}

export async function createMonnifyReservedAccount(
  supabaseAdmin: ReturnType<typeof createClient>,
  user: { id: string; fullName: string; email: string; phone: string },
  identity: { bvn?: string; nin?: string },
): Promise<VirtualAccountItem[]> {
  const config = await getMonnifyConfig(supabaseAdmin);
  if (!config) {
    throw new Error("Monnify is not configured.");
  }

  const accessToken = await getMonnifyAccessToken(config);
  const accountReference = `ABBA-${user.id.replace(/-/g, "").slice(0, 16)}`;

  const body = {
    accountReference,
    accountName: `ABBA KANO INVESTMENTS LMITED-${(user.fullName || "Customer").trim().split(/\s+/)[0].toUpperCase()},
    currencyCode: "NGN",
    contractCode: config.contractCode,
    customerEmail: user.email,
    customerName: user.fullName,
    getAllAvailableBanks: true,
    ...(identity.bvn ? { bvn: identity.bvn } : {}),
    ...(identity.nin ? { nin: identity.nin } : {}),
  };

  const response = await fetch(
    `${config.baseUrl}/api/v2/bank-transfer/reserved-accounts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.requestSuccessful !== true) {
    throw new Error(
      payload?.responseMessage ||
        `Monnify reserved account creation failed (HTTP ${response.status})`,
    );
  }

  const accountsRaw = payload.responseBody?.accounts || [];
  if (!Array.isArray(accountsRaw) || accountsRaw.length === 0) {
    throw new Error("Monnify did not return any virtual accounts.");
  }

  const items: VirtualAccountItem[] = [];

  for (const acc of accountsRaw) {
    const bankName = String(acc.bankName || "").trim();
    const bankCode = String(acc.bankCode || "").trim();
    const accountNumber = String(acc.accountNumber || "").trim();
    const accountName = String(
      payload.responseBody?.accountName || `ABBA KANO INVESTMENTS LMITED-${(user.fullName || "Customer").trim().split(/\s+/)[0].toUpperCase()},
    ).trim();

    if (!bankName || !accountNumber) continue;

    items.push({ bankName, bankCode, accountNumber, accountName });

    const { error: saveError } = await supabaseAdmin
      .from("user_virtual_accounts")
      .upsert(
        {
          user_id: user.id,
          account_reference: accountReference,
          bank_name: bankName,
          bank_code: bankCode,
          account_number: accountNumber,
          account_name: accountName,
          provider: "monnify",
          metadata: acc,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,bank_name,account_number" },
      );
    if (saveError) {
      throw new Error(`Could not save the Monnify virtual account: ${saveError.message}`);
    }
  }

  if (items.length === 0) {
    throw new Error("Monnify returned virtual accounts with incomplete details.");
  }

  return items;
}

export async function verifyMonnifySignature(
  rawBody: string,
  signature: string,
  secretKey: string,
): Promise<boolean> {
  if (!signature || !secretKey) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(rawBody),
  );

  const computed = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed.toLowerCase() === signature.toLowerCase();
}
