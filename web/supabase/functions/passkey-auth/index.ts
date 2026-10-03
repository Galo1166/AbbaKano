import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@14.0.2";
import { verifyDataPlanToken } from "../_shared/data-plan-token.ts";
import { createTransactionAuthorization } from "../_shared/transaction-authorization.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StoredCredential = {
  id: string;
  public_key: string;
  counter: number;
  transports: string[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function normalizePhone(value: unknown): string {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.replace(/^234/, "0");
}

function webAuthnConfig() {
  const origin = Deno.env.get("WEBAUTHN_ORIGIN");
  const rpId = Deno.env.get("WEBAUTHN_RP_ID");
  if (!origin || !rpId) {
    throw new Error("WEBAUTHN_ORIGIN and WEBAUTHN_RP_ID must be configured.");
  }

  const parsedOrigin = new URL(origin);
  if (
    parsedOrigin.origin !== origin ||
    parsedOrigin.pathname !== "/" ||
    parsedOrigin.search ||
    parsedOrigin.hash
  ) {
    throw new Error("WEBAUTHN_ORIGIN must be an origin without a path.");
  }
  if (
    parsedOrigin.protocol !== "https:" &&
    parsedOrigin.hostname !== "localhost"
  ) {
    throw new Error("WEBAUTHN_ORIGIN must use HTTPS.");
  }
  if (
    parsedOrigin.hostname !== rpId &&
    !parsedOrigin.hostname.endsWith(`.${rpId}`)
  ) {
    throw new Error("WEBAUTHN_RP_ID must match the configured web origin.");
  }
  return { origin, rpId };
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
    if (!supabaseUrl || !anonKey || !rawSecretKeys) {
      console.error("Passkey function configuration is incomplete.");
      return jsonResponse({ message: "Passkey authorization is unavailable." }, 500);
    }

    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (typeof serviceKey !== "string" || !serviceKey) {
      console.error("Supabase service key is not configured.");
      return jsonResponse({ message: "Passkey authorization is unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ message: "Unauthorized" }, 401);

    const body = await req.json();
    const action = body?.action;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    if (action === "status") {
      const { count, error } = await supabaseAdmin
        .from("passkey_credentials")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (error) throw error;
      return jsonResponse({ hasPasskey: (count || 0) > 0 });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin
        .from("passkey_credentials")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    const { origin, rpId } = webAuthnConfig();

    if (action === "register-options") {
      const { data: credentials, error } = await supabaseAdmin
        .from("passkey_credentials")
        .select("id, transports")
        .eq("user_id", user.id);
      if (error) throw error;

      const options = await generateRegistrationOptions({
        rpName: "AbbaKano",
        rpID: rpId,
        userID: new TextEncoder().encode(user.id),
        userName: user.email || user.id,
        userDisplayName:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : user.email || "AbbaKano user",
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "required",
        },
        excludeCredentials: (credentials || []).map((credential) => ({
          id: credential.id,
          transports: credential.transports || [],
        })),
      });

      const { error: challengeError } = await supabaseAdmin
        .from("passkey_challenges")
        .upsert({
          user_id: user.id,
          challenge: options.challenge,
          purpose: "registration",
          metadata: {},
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          verified_at: null,
        }, { onConflict: "user_id" });
      if (challengeError) throw challengeError;
      return jsonResponse(options);
    }

    if (action === "register-verify") {
      const response = body?.response;
      if (!response || typeof response.id !== "string") {
        return jsonResponse({ message: "Invalid passkey registration response." }, 400);
      }

      const { data: challenge, error: challengeError } = await supabaseAdmin
        .from("passkey_challenges")
        .select("challenge")
        .eq("user_id", user.id)
        .eq("purpose", "registration")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (challengeError) throw challengeError;
      if (!challenge) {
        return jsonResponse({ message: "Passkey registration expired. Try again." }, 400);
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: true,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return jsonResponse({ message: "Passkey registration could not be verified." }, 400);
      }

      const credential = verification.registrationInfo.credential;
      const { error: insertError } = await supabaseAdmin
        .from("passkey_credentials")
        .insert({
          id: credential.id,
          user_id: user.id,
          public_key: encodeBase64Url(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports || response.response?.transports || [],
        });
      if (insertError) {
        if (insertError.code === "23505") {
          return jsonResponse({ message: "This passkey is already registered." }, 409);
        }
        throw insertError;
      }

      const { error: deleteChallengeError } = await supabaseAdmin
        .from("passkey_challenges")
        .delete()
        .eq("user_id", user.id)
        .eq("purpose", "registration");
      if (deleteChallengeError) throw deleteChallengeError;
      return jsonResponse({ verified: true });
    }

    if (action === "transaction-options") {
      const network = String(body?.purchase?.network || "").trim().toUpperCase();
      const phone = normalizePhone(body?.purchase?.phone);
      const selectionToken =
        typeof body?.purchase?.selectionToken === "string"
          ? body.purchase.selectionToken
          : "";
      const purchaseType = String(body?.purchase?.purchaseType || "DATA").toUpperCase();
      const amount = body?.purchase?.amount;
      const electricityPurchase = ["AEDC", "IKEDC", "KEDCO", "PHED", "JED"]
        .includes(network);
      if (
        !["MTN", "AIRTEL", "GLO", "9MOBILE", "DSTV", "GOTV", "STARTIMES", "AEDC", "IKEDC", "KEDCO", "PHED", "JED"]
          .includes(network)
      ) {
        return jsonResponse({ message: "Choose a supported network." }, 400);
      }
      if (!/^0\d{10}$/.test(phone)) {
        return jsonResponse({ message: "Enter a valid 11-digit phone number." }, 400);
      }
      if (purchaseType !== "AIRTIME" && !(await verifyDataPlanToken(selectionToken, serviceKey, network))) {
        return jsonResponse({ message: "This data plan is no longer available. Reload plans." }, 400);
      }
      if (
        electricityPurchase &&
        (typeof amount !== "number" ||
          !Number.isInteger(amount) ||
          amount < 50 ||
          amount > 100000)
      ) {
        return jsonResponse({ message: "Enter an electricity amount between N50 and N100,000." }, 400);
      }
      const purchase = {
        network,
        phone,
        selectionToken,
        purchaseType,
        ...(electricityPurchase ? { amount } : {}),
      };

      const { data: credentials, error } = await supabaseAdmin
        .from("passkey_credentials")
        .select("id, transports")
        .eq("user_id", user.id);
      if (error) throw error;
      if (!credentials?.length) {
        return jsonResponse({ message: "No passkey is registered for this account." }, 404);
      }

      const options = await generateAuthenticationOptions({
        rpID: rpId,
        userVerification: "required",
        allowCredentials: credentials.map((credential) => ({
          id: credential.id,
          transports: credential.transports || [],
        })),
      });

      const { error: challengeError } = await supabaseAdmin
        .from("passkey_challenges")
        .upsert({
          user_id: user.id,
          challenge: options.challenge,
          purpose: "transaction",
          metadata: purchase,
          expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
          verified_at: null,
        }, { onConflict: "user_id" });
      if (challengeError) throw challengeError;
      return jsonResponse(options);
    }

    if (action === "transaction-verify") {
      const response = body?.response;
      if (!response || typeof response.id !== "string") {
        return jsonResponse({ message: "Invalid biometric authorization response." }, 400);
      }

      const { data: challenge, error: challengeError } = await supabaseAdmin
        .from("passkey_challenges")
        .select("challenge, metadata")
        .eq("user_id", user.id)
        .eq("purpose", "transaction")
        .is("verified_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (challengeError) throw challengeError;
      if (!challenge) {
        return jsonResponse({ message: "Biometric authorization expired. Try again." }, 400);
      }
      const purchase = challenge.metadata as {
        network?: unknown;
        phone?: unknown;
        selectionToken?: unknown;
        amount?: unknown;
        purchaseType?: unknown;
      } | null;
      const electricityPurchase = typeof purchase?.network === "string" &&
        ["AEDC", "IKEDC", "KEDCO", "PHED", "JED"].includes(purchase.network);
      if (
        !purchase ||
        typeof purchase.network !== "string" ||
        typeof purchase.phone !== "string" ||
        typeof purchase.selectionToken !== "string" ||
        (electricityPurchase &&
          (typeof purchase.amount !== "number" ||
            !Number.isInteger(purchase.amount) ||
            Number(purchase.amount) < 50 ||
            Number(purchase.amount) > 100000)) ||
        (purchase.purchaseType !== "AIRTIME" && !(await verifyDataPlanToken(
          purchase.selectionToken,
          serviceKey,
          purchase.network,
        )))
      ) {
        return jsonResponse({ message: "The authorized data purchase is invalid. Try again." }, 400);
      }

      const { data: credential, error: credentialError } = await supabaseAdmin
        .from("passkey_credentials")
        .select("id, public_key, counter, transports")
        .eq("id", response.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (credentialError) throw credentialError;
      if (!credential) return jsonResponse({ message: "Passkey is not registered." }, 401);

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: true,
        credential: {
          id: credential.id,
          publicKey: decodeBase64Url(credential.public_key),
          counter: Number(credential.counter),
          transports: credential.transports || [],
        },
      });
      if (!verification.verified) {
        return jsonResponse({ message: "Biometric authorization failed." }, 401);
      }

      const { data: updatedCredential, error: updateCredentialError } =
        await supabaseAdmin
          .from("passkey_credentials")
          .update({ counter: verification.authenticationInfo.newCounter })
          .eq("id", credential.id)
          .eq("user_id", user.id)
          .eq("counter", credential.counter)
          .select("id")
          .maybeSingle();
      if (updateCredentialError) throw updateCredentialError;
      if (!updatedCredential) {
        return jsonResponse({ message: "Passkey was used concurrently. Try again." }, 409);
      }

      const { data: updatedChallenge, error: updateChallengeError } =
        await supabaseAdmin
          .from("passkey_challenges")
          .update({ verified_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("challenge", challenge.challenge)
          .eq("purpose", "transaction")
          .is("verified_at", null)
          .gt("expires_at", new Date().toISOString())
          .select("user_id")
          .maybeSingle();
      if (updateChallengeError) throw updateChallengeError;
      if (!updatedChallenge) {
        return jsonResponse({ message: "Biometric authorization expired. Try again." }, 400);
      }

      const transactionAuthorization = await createTransactionAuthorization(
        {
          userId: user.id,
          challenge: challenge.challenge,
          purchase: {
            network: purchase.network,
            phone: purchase.phone,
            selectionToken: purchase.selectionToken,
            ...(electricityPurchase ? { amount: Number(purchase.amount) } : {}),
          },
        },
        serviceKey,
      );
      return jsonResponse({ transactionAuthorization });
    }

    return jsonResponse({ message: "Unsupported passkey action." }, 400);
  } catch (error) {
    console.error("passkey-auth error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Passkey request failed." },
      500,
    );
  }
});
