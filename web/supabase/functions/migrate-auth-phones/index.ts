import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("234")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  if (!/^[789]\d{9}$/.test(local)) return null;
  return `+234${local}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ message: "Method not allowed." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const serviceKey = secretKeys.default;
    const authorization = req.headers.get("Authorization");
    if (!url || !anonKey || typeof serviceKey !== "string" || !authorization) {
      return json({ message: "Migration is unavailable." }, 500);
    }

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: callerError } = await caller.auth.getUser();
    if (callerError || user?.app_metadata.admin_role !== "super_admin") {
      return json({ message: "Super-admin access is required." }, 403);
    }

    const admin = createClient(url, serviceKey);
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, phone")
      .not("phone", "is", null);
    if (profileError) throw profileError;

    const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    const authByPhone = new Map(
      users.users.filter((item) => item.phone).map((item) => [item.phone as string, item.id]),
    );
    const result = { updated: 0, skipped: 0, invalid: [] as string[], conflicts: [] as string[] };

    for (const profile of profiles || []) {
      const phone = normalizePhone(String(profile.phone || ""));
      if (!phone) {
        result.invalid.push(profile.id);
        continue;
      }
      const authUser = users.users.find((item) => item.id === profile.id);
      if (!authUser) {
        result.skipped++;
        continue;
      }
      const owner = authByPhone.get(phone);
      if (owner && owner !== profile.id) {
        result.conflicts.push(profile.id);
        continue;
      }
      if (authUser.phone === phone) {
        result.skipped++;
        continue;
      }
      const { error } = await admin.auth.admin.updateUserById(profile.id, {
        phone,
        phone_confirm: true,
      });
      if (error) throw new Error(`Could not migrate ${profile.id}: ${error.message}`);
      authByPhone.set(phone, profile.id);
      result.updated++;
    }
    return json(result);
  } catch (error) {
    console.error("migrate-auth-phones error:", error);
    return json({ message: error instanceof Error ? error.message : "Phone migration failed." }, 500);
  }
});
