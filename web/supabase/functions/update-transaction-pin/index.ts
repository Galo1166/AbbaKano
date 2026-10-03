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

async function hashPin(pin: string) {
  const { scrypt } = await import("npm:@noble/hashes@2.4.0/scrypt.js");
  const randomSalt = new Uint8Array(16);
  crypto.getRandomValues(randomSalt);
  const salt = Array.from(randomSalt).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const digest = scrypt(new TextEncoder().encode(pin), new TextEncoder().encode(salt), {
    N: 16384, r: 8, p: 1, dkLen: 64,
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
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    if (!authHeader || !supabaseUrl || !anonKey || typeof secretKeys.default !== "string") {
      return response({ message: "Unable to update your transaction PIN." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return response({ message: "Please sign in again." }, 401);

    const body = await req.json();
    const currentPin = typeof body?.currentPin === "string" ? body.currentPin : "";
    const newPin = typeof body?.newPin === "string" ? body.newPin : "";
    if (!/^\d{4}$/.test(newPin)) return response({ message: "Enter a valid 4-digit transaction PIN." }, 400);

    if (currentPin) {
      const verification = await fetch(`${supabaseUrl}/functions/v1/verify-transaction-pin`, {
        method: "POST",
        headers: { Authorization: authHeader, apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ pin: currentPin }),
      });
      if (!verification.ok) return response({ message: "Your current transaction PIN is incorrect." }, 401);
    }

    const hashed = await hashPin(newPin);
    const admin = createClient(supabaseUrl, secretKeys.default);
    const { error } = await admin.from("profiles").update({
      transaction_pin_hash: hashed.hash,
      transaction_pin_salt: hashed.salt,
    }).eq("id", user.id);
    if (error) throw error;
    return response({ updated: true });
  } catch (error) {
    console.error("update-transaction-pin error:", error);
    return response({ message: "Unable to update your transaction PIN. Please try again." }, 500);
  }
});
