// @ts-expect-error Deno resolves this remote module at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");

if (!supabaseUrl || !secretKeysRaw) {
  throw new Error("Registration service is not configured.");
}

let secretKeys: { default?: string };
try {
  secretKeys = JSON.parse(secretKeysRaw);
} catch {
  throw new Error("Registration service is not configured.");
}

if (typeof secretKeys.default !== "string" || !secretKeys.default) {
  throw new Error("Registration service is not configured.");
}

const supabaseAdmin = createClient(supabaseUrl, secretKeys.default);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("234")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  if (!/^[789]\d{9}$/.test(local)) return null;
  return { local: `0${local}`, international: `+234${local}` };
}

function referralPhoneCandidates(referralCode: string) {
  const digits = referralCode.replace(/\D/g, "");
  if (digits.startsWith("234")) {
    const local = `0${digits.slice(3)}`;
    return [digits, local, `+${digits}`];
  }
  if (digits.startsWith("0")) {
    const internationalDigits = `234${digits.slice(1)}`;
    return [digits, internationalDigits, `+${internationalDigits}`];
  }
  return digits ? [digits] : [];
}

async function hashPin(pin: string) {
  const { scrypt } = await import(
    "npm:@noble/hashes@2.4.0/scrypt.js"
  );

  const passwordBytes = new TextEncoder().encode(pin);
  const randomSalt = new Uint8Array(16);

  crypto.getRandomValues(randomSalt);

  const salt = Array.from(randomSalt)
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");

  const digest = scrypt(passwordBytes, new TextEncoder().encode(salt), {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: 64,
  });

  const hash = Array.from(digest)
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");

  return {
    hash,
    salt,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      { message: "Method not allowed" },
      405
    );
  }

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) {
      return json({ message: "Invalid registration request." }, 400);
    }

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const phoneInput =
      typeof body.phone === "string"
        ? body.phone
        : "";
    const phone = normalizePhone(phoneInput);

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const pin =
      typeof body.pin === "string"
        ? body.pin
        : "";

    const referralCode =
      typeof body.referralCode === "string"
        ? body.referralCode.trim()
        : "";

    if (!fullName) {
      return json(
        {
          message:
            "Full name is required.",
        },
        400
      );
    }

    if (!phone) {
      return json(
        {
          message:
            "Enter a valid Nigerian phone number.",
        },
        400
      );
    }

    if (!email) {
      return json(
        {
          message:
            "Email address is required.",
        },
        400
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return json(
        {
          message:
            "Enter a valid email address.",
        },
        400
      );
    }

    if (password.length < 8) {
      return json(
        {
          message:
            "Password must be at least 8 characters.",
        },
        400
      );
    }

    if (!/^\d{4}$/.test(pin)) {
      return json(
        {
          message:
            "Transaction PIN must be exactly 4 digits.",
        },
        400
      );
    }

    const referralPhones = referralPhoneCandidates(referralCode);
    if (referralCode && referralPhones.length === 0) {
      return json(
        {
          message: "Referral phone number was not found.",
        },
        400
      );
    }

    const phoneCandidates = supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", phone.local)
      .maybeSingle();
    const referralCandidates = referralCode
      ? supabaseAdmin
          .from("profiles")
          .select("id")
          .in("phone", referralPhones)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [
      { data: existingProfile, error: profileLookupError },
      { data: referrerProfile, error: referralLookupError },
    ] = await Promise.all([phoneCandidates, referralCandidates]);

    if (profileLookupError || referralLookupError) {
      console.error("Registration preflight failed:", {
        profileLookupError,
        referralLookupError,
      });

      return json(
        {
          message: "Could not check your registration details.",
        },
        500
      );
    }

    if (existingProfile) {
      return json(
        {
          message:
            "An account with this phone number already exists.",
        },
        409
      );
    }

    if (referralCode && !referrerProfile) {
      return json(
        {
          message: "Referral phone number was not found.",
        },
        400
      );
    }

    // Hash transaction PIN.
    const { hash, salt } =
      await hashPin(pin);

    // Create Supabase Auth user.
    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        phone: phone.international,
        phone_confirm: true,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: phone.local,
          referral_code:
            referralCode || null,
        },
      });

    if (authError || !authData.user) {
      console.error(
        "Auth creation error:",
        authError
      );

      return json(
        {
          message:
            authError?.message ||
            "Could not create your account.",
        },
        authError?.status || 400
      );
    }

    const userId = authData.user.id;

    // The database trigger should have created
    // the profile and wallet automatically.
    const {
      error: profileUpdateError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        transaction_pin_hash: hash,
        transaction_pin_salt: salt,
      })
      .eq("id", userId);

    if (profileUpdateError) {
      console.error(
        "Profile update error:",
        profileUpdateError
      );

      // Roll back Auth user if profile setup fails.
      await supabaseAdmin.auth.admin.deleteUser(
        userId
      );

      return json(
        {
          message:
            "Could not finish setting up your account.",
        },
        500
      );
    }

    if (referralCode) {
      const { data: referralResult, error: referralError } =
        await supabaseAdmin.rpc("award_referral_signup_commission", {
          p_referred_user_id: userId,
          p_referral_phone: referralCode,
        });

      if (referralError || referralResult?.status === "invalid_referral") {
        if (referralError) {
          console.error("Referral signup processing failed:", referralError);
        }
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteUserError) {
          console.error("Could not roll back registration after referral failure:", deleteUserError);
          return json(
            { message: "Could not finish setting up your account. Contact support before trying again." },
            500,
          );
        }
        return json(
          {
            message: referralError
              ? "Could not apply the referral code."
              : "Referral phone number was not found.",
          },
          referralError ? 500 : 400,
        );
      }
    }

    return json({
      success: true,
      message:
        "Account created successfully.",
    });
  } catch (error) {
    console.error(
      "register-user error:",
      error
    );

    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not create your account.",
      },
      500
    );
  }
});