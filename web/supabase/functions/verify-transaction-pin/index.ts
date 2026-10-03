import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        { message: "Missing authorization" },
        401,
      );
    }

    /*
     * Authenticate the caller.
     */
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

    const body = await req.json();

    const pin = body?.pin;

    /*
     * Same validation rule as the old Express backend:
     * exactly 4 digits.
     */
    if (
      typeof pin !== "string" ||
      !/^\d{4}$/.test(pin)
    ) {
      return jsonResponse(
        {
          message:
            "Enter a valid 4-digit transaction PIN",
        },
        400,
      );
    }

    /*
     * Read the hash and salt server-side only.
     *
     * NEVER return these values to the browser.
     */
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "transaction_pin_hash, transaction_pin_salt",
        )
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "PIN profile lookup failed:",
        profileError,
      );

      return jsonResponse(
        {
          message:
            "Could not verify transaction PIN.",
        },
        500,
      );
    }

    if (
      !profile?.transaction_pin_hash ||
      !profile?.transaction_pin_salt
    ) {
      return jsonResponse(
        {
          message:
            "No transaction PIN is currently set.",
        },
        400,
      );
    }

    /*
     * Node's crypto.scryptSync is not available
     * directly in the same way inside Supabase Edge Functions.
     *
     * We therefore use Web Crypto / Deno-compatible
     * scrypt implementation below.
     */

    const matches = await verifyPinHash(
      pin,
      profile.transaction_pin_salt,
      profile.transaction_pin_hash,
    );

    if (!matches) {
      return jsonResponse(
        {
          message: "Incorrect transaction PIN",
        },
        401,
      );
    }

    return jsonResponse({
      verified: true,
    });
  } catch (error) {
    console.error(
      "verify-transaction-pin error:",
      error,
    );

    return jsonResponse(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not verify transaction PIN.",
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