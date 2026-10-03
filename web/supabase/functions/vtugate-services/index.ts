import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
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

  try {
    const vtugateApiKey = Deno.env.get("VTUGATE_API_KEY");

    if (!vtugateApiKey) {
      return jsonResponse({
        step: "environment",
        error: "VTUGATE_API_KEY is missing",
      }, 500);
    }

    // Confirm the caller is authenticated.
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({
        step: "auth",
        error: "Missing Authorization header",
      }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabasePublishableKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabasePublishableKey) {
      return jsonResponse({
        step: "environment",
        error: "Supabase publishable/anon key is missing",
      }, 500);
    }

    const supabase = createClient(
      supabaseUrl,
      supabasePublishableKey,
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
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse({
        step: "supabase-auth",
        error: userError?.message ?? "No authenticated user",
      }, 401);
    }

    // IMPORTANT:
    // VTUGATE expects POST + form-urlencoded.
    const response = await fetch(
      "https://api.vtugate.com/api/v1/fetchservices",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${vtugateApiKey}`,
          "Accept": "application/json",
        },
        body: new URLSearchParams({
  service_type: "airtime",
}),
      },
    );

    const rawText = await response.text();

    return jsonResponse({
      step: "vtugate-response",
      authenticatedUser: user.id,
      httpStatus: response.status,
      httpOk: response.ok,
      contentType: response.headers.get("content-type"),
      rawResponse: rawText,
    });
  } catch (error) {
    return jsonResponse({
      step: "exception",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    }, 500);
  }
});