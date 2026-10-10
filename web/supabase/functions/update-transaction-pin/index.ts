import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

function bytesToHex(value: Uint8Array): string {
  return Array.from(value)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(actualHex: string, expectedHex: string): boolean {
  if (typeof actualHex !== "string" || typeof expectedHex !== "string") return false;
  if (actualHex.length !== expectedHex.length) return false;
  let result = 0;
  for (let i = 0; i < actualHex.length; i++) {
    result |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }
  return result === 0;
}

async function scryptHash(pin: string, salt: string, saltIsHexBytes = false): Promise<string> {
  const { scrypt } = await import("npm:@noble/hashes@2.4.0/scrypt.js");
  const passwordBytes = new TextEncoder().encode(pin);
  const saltBytes = saltIsHexBytes ? hexToBytes(salt) : new TextEncoder().encode(salt);
  const digest = scrypt(passwordBytes, saltBytes, {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 64,
  });
  return bytesToHex(digest);
}

async function verifyPinHash(pin: string, salt: string, expectedHash: string): Promise<boolean> {
  if (!/^[0-9a-fA-F]+$/.test(expectedHash)) return false;

  // Modern SHA-256 hash (64 hex characters)
  if (expectedHash.length === 64) {
    if (!/^(?:[0-9a-fA-F]{2})+$/.test(salt)) return false;
    const passwordBytes = new TextEncoder().encode(pin);
    const saltBytes = hexToBytes(salt);
    const digestInput = new Uint8Array(passwordBytes.length + saltBytes.length);
    digestInput.set(passwordBytes, 0);
    digestInput.set(saltBytes, passwordBytes.length);

    const digest = await crypto.subtle.digest("SHA-256", digestInput);
    return timingSafeEqualHex(bytesToHex(new Uint8Array(digest)), expectedHash);
  }

  // Legacy or scrypt hash (128 hex characters)
  if (expectedHash.length !== 128 || !salt) return false;
  const legacyHash = await scryptHash(pin, salt);
  if (timingSafeEqualHex(legacyHash, expectedHash)) return true;

  const byteSaltHash = await scryptHash(pin, salt, true);
  return timingSafeEqualHex(byteSaltHash, expectedHash);
}

async function hashPin(pin: string) {
  const { scrypt } = await import("npm:@noble/hashes@2.4.0/scrypt.js");
  const randomSalt = new Uint8Array(16);
  crypto.getRandomValues(randomSalt);
  const salt = Array.from(randomSalt).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const digest = scrypt(new TextEncoder().encode(pin), new TextEncoder().encode(salt), {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 64,
  });
  return {
    salt,
    hash: Array.from(digest).map((byte) => byte.toString(16).padStart(2, "0")).join(""),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return response({ message: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    let secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!secretKey) {
      try {
        const parsed = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
        if (typeof parsed.default === "string") secretKey = parsed.default;
      } catch {}
    }

    if (!authHeader || !supabaseUrl || !secretKey) {
      return response({ message: "Unable to update your transaction PIN." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey || secretKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return response({ message: "Please sign in again." }, 401);

    const body = await req.json();
    const currentPin = typeof body?.currentPin === "string" ? body.currentPin : "";
    const newPin = typeof body?.newPin === "string" ? body.newPin : "";
    if (!/^\d{4}$/.test(newPin)) return response({ message: "Enter a valid 4-digit transaction PIN." }, 400);

    const admin = createClient(supabaseUrl, secretKey);

    // Fetch existing PIN hash and salt directly from profiles
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("transaction_pin_hash, transaction_pin_salt")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error in update-transaction-pin:", profileError);
      return response({ message: "Could not verify transaction PIN. Please try again." }, 500);
    }

    // If a transaction PIN already exists on this account, verify the current PIN
    if (profile?.transaction_pin_hash && profile?.transaction_pin_salt) {
      if (!currentPin) {
        return response({ message: "Please enter your current transaction PIN." }, 400);
      }
      const matches = await verifyPinHash(currentPin, profile.transaction_pin_salt, profile.transaction_pin_hash);
      if (!matches) {
        return response({ message: "Current transaction PIN is incorrect." }, 401);
      }
    }

    // Generate new secure scrypt hash
    const hashed = await hashPin(newPin);
    const { error: updateError } = await admin.from("profiles").update({
      transaction_pin_hash: hashed.hash,
      transaction_pin_salt: hashed.salt,
    }).eq("id", user.id);

    if (updateError) throw updateError;

    return response({ updated: true });
  } catch (error) {
    console.error("update-transaction-pin error:", error);
    return response({ message: "Unable to update your transaction PIN. Please try again." }, 500);
  }
});
