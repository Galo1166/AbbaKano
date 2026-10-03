import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");

    /*
     * This is the server-side Supabase secret key.
     *
     * Supabase currently exposes secret keys through
     * SUPABASE_SECRET_KEYS.
     */
    const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");

    if (!secretKeysRaw) {
      throw new Error("SUPABASE_SECRET_KEYS is not configured");
    }

    const secretKeys = JSON.parse(secretKeysRaw);
    const supabaseSecretKey = secretKeys.default;

    if (!supabaseSecretKey) {
      throw new Error("Supabase secret key is not configured");
    }

    if (!paystackSecret) {
      throw new Error("PAYSTACK_SECRET_KEY is not configured");
    }

    /*
     * USER CLIENT
     *
     * Uses the caller's JWT.
     * RLS applies here.
     */
    const supabaseUser = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * ADMIN CLIENT
     *
     * Server-side only.
     * Bypasses RLS.
     *
     * NEVER put this key in browser/mobile code.
     */
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseSecretKey
    );

    const body = await req.json();
    const amount = Number(body?.amount);

    if (
      !Number.isInteger(amount) ||
      amount < 100 ||
      amount > 1_000_000
    ) {
      return new Response(
        JSON.stringify({
          error: "Enter an amount between ₦100 and ₦1,000,000.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Read profile using the authenticated user.
     */
    const { data: profile, error: profileError } =
      await supabaseUser
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

    if (profileError) {
      throw new Error(
        `Could not load your profile: ${profileError.message}`
      );
    }

    const reference =
      `ABK_${Date.now()}_${crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 12)}`;

    const amountKobo = amount * 100;

    /*
     * Create the pending deposit using the ADMIN client.
     *
     * This is intentionally server-side.
     */
    const { data: deposit, error: depositError } =
      await supabaseAdmin
        .from("deposits")
        .insert({
          user_id: user.id,
          reference,
          amount_kobo: amountKobo,
          provider: "paystack",
          status: "pending",
          metadata: {
            email: user.email,
            full_name: profile?.full_name ?? null,
            phone: profile?.phone ?? null,
          },
        })
        .select()
        .single();

    if (depositError) {
      throw new Error(
        `Could not create deposit: ${depositError.message}`
      );
    }

    /*
     * Initialize Paystack.
     *
     * Paystack receives amount in kobo.
     */
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: amountKobo,
          reference,
          metadata: {
            deposit_id: deposit.id,
            user_id: user.id,
          },
        }),
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      /*
       * Paystack failed.
       *
       * Mark our pending deposit as failed.
       */
      await supabaseAdmin
        .from("deposits")
        .update({
          status: "failed",
          metadata: {
            ...(deposit.metadata ?? {}),
            paystack_error:
              paystackData?.message ??
              "Paystack initialization failed",
          },
        })
        .eq("id", deposit.id);

      return new Response(
        JSON.stringify({
          error:
            paystackData?.message ||
            "Could not initialize Paystack payment.",
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Save Paystack's reference/access code.
     */
    const { error: updateError } =
      await supabaseAdmin
        .from("deposits")
        .update({
          provider_reference:
            paystackData?.data?.reference ?? reference,
          metadata: {
            ...(deposit.metadata ?? {}),
            paystack_access_code:
              paystackData?.data?.access_code ?? null,
          },
        })
        .eq("id", deposit.id);

    if (updateError) {
      console.error(
        "Could not update deposit with Paystack data:",
        updateError
      );
    }

    return new Response(
      JSON.stringify({
        authorizationUrl:
          paystackData.data.authorization_url,
        reference,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("initialize-paystack error:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Could not initialize payment.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});