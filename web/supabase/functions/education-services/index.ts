import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAlrahuzApi } from "../_shared/alrahuzdata.ts";
import { createEducationPlanToken } from "../_shared/education-plan-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonObject = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function extractList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const object = asObject(payload);
  if (!object) return [];
  for (const key of ["results", "billers", "products", "variations", "data"]) {
    const value = object[key];
    if (Array.isArray(value)) return value;
    const nested = asObject(value);
    if (nested) {
      const list = extractList(nested);
      if (list.length > 0) return list;
    }
  }
  return [];
}

function hasNextPage(payload: unknown): boolean {
  const object = asObject(payload);
  if (!object) return false;
  if (object.next) return true;
  return hasNextPage(object.data);
}

async function fetchAllPages(
  endpoint: string,
  token: string,
  baseUrl?: string,
): Promise<JsonObject[]> {
  const records: JsonObject[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const separator = endpoint.includes("?") ? "&" : "?";
    const result = await callAlrahuzApi<unknown>(
      `${endpoint}${separator}page=${page}`,
      { token, baseUrl },
    );
    if (!result.ok || !result.data) {
      throw new Error(
        result.error || "Could not load the ALRAHUZDATA education catalog.",
      );
    }
    const batch = extractList(result.data).map(asObject).filter(
      (item): item is JsonObject => item !== null,
    );
    records.push(...batch);
    if (!hasNextPage(result.data) || batch.length === 0) return records;
  }
  throw new Error("The ALRAHUZDATA education catalog has too many pages.");
}

function extractCustomerName(payload: unknown): string {
  const object = asObject(payload);
  if (!object) return "";
  const containers = [
    object.data,
    object.result,
    object.customer,
    object,
  ];
  for (const containerValue of containers) {
    const container = asObject(containerValue);
    if (!container) continue;
    for (const key of ["customer_name", "customerName", "name", "full_name"]) {
      const value = container[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
}

async function validateJambProfile(
  token: string,
  profileId: string,
  variationCode: string,
) {
  const query = new URLSearchParams({
    profile_id: profileId,
    variation_code: variationCode,
  });
  const result = await callAlrahuzApi<JsonObject>(
    `/api/validatejamb/?${query.toString()}`,
    {
      token,
      baseUrl: "https://alrahuzdata.com.ng",
    },
  );
  const payload = result.data;
  const statusValue = payload?.status ?? payload?.Status;
  if (
    !result.ok ||
    statusValue === false ||
    (typeof statusValue === "string" &&
      ["failed", "error", "invalid"].includes(statusValue.toLowerCase()))
  ) {
    throw new Error(
      result.error ||
        String(
          payload?.message || payload?.msg ||
            "Could not verify the JAMB profile.",
        ),
    );
  }
  const customerName = extractCustomerName(payload);
  if (!customerName) {
    throw new Error(
      "ALRAHUZDATA did not return a verified JAMB customer name.",
    );
  }
  return customerName;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, 405);
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ message: "Missing authorization." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    const alrahuzToken = Deno.env.get("ALRAHUZDATA_API_TOKEN") ||
      Deno.env.get("ALRAHUZ_API_TOKEN") || "";
    if (!supabaseUrl || !anonKey || !rawSecretKeys || !alrahuzToken) {
      console.error("Education services function configuration is incomplete.");
      return jsonResponse(
        { message: "Education PIN service is unavailable." },
        500,
      );
    }

    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey =
      secretKeys && typeof secretKeys === "object" && "default" in secretKeys
        ? secretKeys.default
        : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      return jsonResponse(
        { message: "Education PIN service is unavailable." },
        500,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth
      .getUser();
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }

    const body: unknown = await req.json().catch(() => null);
    const request = asObject(body);
    if (!request) {
      return jsonResponse({ message: "Invalid request body." }, 400);
    }

    if (request.action === "validate_jamb") {
      const profileId = typeof request.profileId === "string"
        ? request.profileId.trim()
        : "";
      const variationCode = typeof request.variationCode === "string"
        ? request.variationCode.trim()
        : "";
      if (
        !/^\d{10}$/.test(profileId) ||
        !/^[a-z0-9_-]{1,40}$/i.test(variationCode)
      ) {
        return jsonResponse({
          message:
            "Enter a valid 10-digit JAMB profile ID and choose a variation.",
        }, 400);
      }
      const customerName = await validateJambProfile(
        alrahuzToken,
        profileId,
        variationCode,
      );
      return jsonResponse({ valid: true, customerName });
    }

    if (request.action !== "catalog") {
      return jsonResponse(
        { message: "Unknown education services action." },
        400,
      );
    }

    const billers = await fetchAllPages(
      "/v1/billers/?category=education",
      alrahuzToken,
    );
    const exams = await Promise.all(billers.map(async (biller) => {
      const slug = String(biller.slug || "").trim();
      const name = String(biller.name || biller.title || "").trim();
      if (!/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(slug) || !name) return null;

      const products = await fetchAllPages(
        `/v1/billers/${encodeURIComponent(slug)}/products/`,
        alrahuzToken,
      );
      const normalizedProducts = await Promise.all(
        products.map(async (product) => {
          const id = String(product.id ?? "").trim();
          const productName = String(product.name || product.title || "")
            .trim();
          const price = Number(product.amount ?? product.price);
          if (
            !id ||
            id.length > 100 ||
            !productName ||
            !Number.isFinite(price) ||
            price <= 0 ||
            price > 100000
          ) return null;

          const selectionToken = await createEducationPlanToken(
            {
              billerSlug: slug,
              billerName: name,
              productId: id,
              productName,
              unitPrice: price,
            },
            serviceKey,
          );
          return { id, name: productName, amount: price, selectionToken };
        }),
      );
      return {
        slug,
        name,
        products: normalizedProducts.filter((product) => product !== null),
      };
    }));

    let jambVariations: JsonObject[] = [];
    let jambVariationsAvailable = true;
    try {
      jambVariations = await fetchAllPages(
        "/ajax/jamb_variations/",
        alrahuzToken,
        "https://alrahuzdata.com.ng",
      );
    } catch (error) {
      jambVariationsAvailable = false;
      console.error("Could not load ALRAHUZDATA JAMB variations:", error);
    }

    return jsonResponse({
      exams: exams.filter((exam) => exam !== null),
      jambVariationsAvailable,
      jambVariations: jambVariations.map((variation) => ({
        code: String(
          variation.variation_code || variation.code || variation.value || "",
        ).trim(),
        name: String(
          variation.variation_name || variation.name || variation.label || "",
        ).trim(),
      })).filter((variation) =>
        /^[a-z0-9_-]{1,40}$/i.test(variation.code) && variation.name
      ),
    });
  } catch (error) {
    console.error("education-services error:", error);
    return jsonResponse({
      message: error instanceof Error
        ? error.message
        : "Could not load education PIN services.",
    }, 502);
  }
});
