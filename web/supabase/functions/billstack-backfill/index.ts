import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type BillstackBank,
  createBillstackVirtualAccount,
  getBillstackConfig,
} from "../_shared/billstack.ts";
import { recordAdminAuditEvent } from "../_shared/admin-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BATCH_SIZE = 3;
const BILLSTACK_BANKS: BillstackBank[] = ["9PSB", "SAFEHAVEN", "PROVIDUS"];
type SupabaseAdminClient = ReturnType<typeof createClient<any>>;

type JobStatus = "preparing" | "running" | "completed" | "failed";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getJobProgress(
  supabaseAdmin: SupabaseAdminClient,
  jobId: string,
) {
  const { data: job, error: jobError } = await supabaseAdmin
    .from("billstack_backfill_jobs")
    .select(
      "id, status, total_users, error_message, created_at, updated_at, completed_at",
    )
    .eq("id", jobId)
    .maybeSingle();
  if (jobError) throw jobError;
  if (!job) throw new Error("Billstack backfill job not found.");

  const statuses = [
    "pending",
    "processing",
    "completed",
    "skipped",
    "failed",
  ] as const;
  const counts = await Promise.all(statuses.map(async (status) => {
    const { count, error } = await supabaseAdmin
      .from("billstack_backfill_items")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId)
      .eq("status", status);
    if (error) throw error;
    return [status, count || 0] as const;
  }));
  const itemCounts = Object.fromEntries(counts) as Record<
    (typeof statuses)[number],
    number
  >;
  const { data: recentFailures, error: failuresError } = await supabaseAdmin
    .from("billstack_backfill_items")
    .select("user_id, error_message")
    .eq("job_id", jobId)
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (failuresError) throw failuresError;

  return {
    ...job,
    processed_users: itemCounts.processing + itemCounts.completed +
      itemCounts.skipped + itemCounts.failed,
    completed_users: itemCounts.completed,
    skipped_users: itemCounts.skipped,
    failed_users: itemCounts.failed,
    pending_users: itemCounts.pending,
    processing_users: itemCounts.processing,
    recent_failures: recentFailures || [],
  };
}

async function loadUserDetails(
  supabaseAdmin: SupabaseAdminClient,
  userId: string,
) {
  const [
    { data: authResult, error: authError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin
      .from("profiles")
      .select("role, full_name, phone")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (authError) throw authError;
  if (profileError) throw profileError;
  if (!authResult.user || profile?.role !== "user") {
    return { skip: true as const };
  }

  const user = authResult.user;
  return {
    skip: false as const,
    customer: {
      id: user.id,
      fullName: profile.full_name || user.user_metadata?.full_name ||
        user.user_metadata?.name || "Customer",
      email: user.email || "",
      phone: profile.phone || user.phone || user.user_metadata?.phone || "",
    },
  };
}

async function enqueueUsers(
  supabaseAdmin: SupabaseAdminClient,
  jobId: string,
) {
  const pageSize = 1000;
  let offset = 0;
  let totalUsers = 0;

  while (true) {
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "user")
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!profiles?.length) break;

    for (let start = 0; start < profiles.length; start += 500) {
      const users = profiles.slice(start, start + 500).map((profile) => ({
        job_id: jobId,
        user_id: profile.id,
      }));
      const { error: insertError } = await supabaseAdmin
        .from("billstack_backfill_items")
        .upsert(users, {
          onConflict: "job_id,user_id",
          ignoreDuplicates: true,
        });
      if (insertError) throw insertError;
    }

    totalUsers += profiles.length;
    offset += profiles.length;
    if (profiles.length < pageSize) break;
  }

  const { error: updateError } = await supabaseAdmin
    .from("billstack_backfill_jobs")
    .update({
      status: "running" satisfies JobStatus,
      total_users: totalUsers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (updateError) throw updateError;
}

async function processUser(
  supabaseAdmin: SupabaseAdminClient,
  billstackConfig: NonNullable<Awaited<ReturnType<typeof getBillstackConfig>>>,
  jobId: string,
  itemId: number,
  userId: string,
) {
  let status: "completed" | "skipped" | "failed" = "completed";
  const failureMessages: string[] = [];

  try {
    const userDetails = await loadUserDetails(supabaseAdmin, userId);
    if (userDetails.skip) {
      status = "skipped";
    } else {
      const { data: existingAccounts, error: accountsError } =
        await supabaseAdmin
          .from("user_virtual_accounts")
          .select("bank_code")
          .eq("user_id", userId)
          .eq("provider", "billstack");
      if (accountsError) throw accountsError;

      const savedBanks = new Set(
        (existingAccounts || []).map((account) =>
          String(account.bank_code || "").toUpperCase()
        ),
      );
      const missingBanks = BILLSTACK_BANKS.filter((bank) =>
        !savedBanks.has(bank)
      );
      if (missingBanks.length === 0) {
        status = "skipped";
      } else {
        const results = await Promise.allSettled(
          missingBanks.map((bank) =>
            createBillstackVirtualAccount(
              supabaseAdmin,
              billstackConfig,
              userDetails.customer,
              bank,
            )
          ),
        );
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            const message = result.reason instanceof Error
              ? result.reason.message
              : "Unknown Billstack error.";
            failureMessages.push(`${missingBanks[index]}: ${message}`);
          }
        });
        if (failureMessages.length > 0) status = "failed";
      }
    }
  } catch (error) {
    status = "failed";
    failureMessages.push(
      error instanceof Error
        ? error.message
        : "Unknown account provisioning error.",
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("billstack_backfill_items")
    .update({
      status,
      error_message: failureMessages.length > 0
        ? failureMessages.join(" ").slice(0, 1000)
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("job_id", jobId);
  if (updateError) throw updateError;
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
    if (!supabaseUrl || !anonKey || !rawSecretKeys) {
      return jsonResponse({ message: "Backfill service is unavailable." }, 500);
    }

    const secretKeys: unknown = JSON.parse(rawSecretKeys);
    const serviceKey =
      secretKeys && typeof secretKeys === "object" && "default" in secretKeys
        ? secretKeys.default
        : null;
    if (typeof serviceKey !== "string" || !serviceKey) {
      return jsonResponse({ message: "Backfill service is unavailable." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await userClient.auth
      .getUser();
    if (authError || !user) {
      return jsonResponse({ message: "Unauthorized." }, 401);
    }
    if (user.app_metadata.admin_role !== "super_admin") {
      return jsonResponse({ message: "Super-admin access is required." }, 403);
    }

    const requestBody: unknown = await req.json().catch(() => null);
    if (
      !requestBody || typeof requestBody !== "object" ||
      Array.isArray(requestBody)
    ) {
      return jsonResponse({ message: "Invalid request body." }, 400);
    }
    const body = requestBody as Record<string, unknown>;
    const action = body.action;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    if (action === "start") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 5 || reason.length > 500) {
        return jsonResponse({
          message: "Enter a reason of 5 to 500 characters.",
        }, 400);
      }

      const billstackConfig = await getBillstackConfig(supabaseAdmin);
      if (!billstackConfig) {
        return jsonResponse({
          message: "Billstack is not configured on the server.",
        }, 503);
      }

      const { data: activeJob, error: activeJobError } = await supabaseAdmin
        .from("billstack_backfill_jobs")
        .select("id, status")
        .in("status", ["preparing", "running"])
        .maybeSingle();
      if (activeJobError) throw activeJobError;
      if (activeJob) {
        return jsonResponse({
          job: await getJobProgress(supabaseAdmin, activeJob.id),
        });
      }

      const { data: newJob, error: createJobError } = await supabaseAdmin
        .from("billstack_backfill_jobs")
        .insert({ requested_by: user.id, status: "preparing" })
        .select("id")
        .single();
      if (createJobError) {
        const { data: racedJob, error: racedJobError } = await supabaseAdmin
          .from("billstack_backfill_jobs")
          .select("id")
          .in("status", ["preparing", "running"])
          .maybeSingle();
        if (racedJobError) throw racedJobError;
        if (racedJob) {
          return jsonResponse({
            job: await getJobProgress(supabaseAdmin, racedJob.id),
          });
        }
        throw createJobError;
      }

      try {
        await enqueueUsers(supabaseAdmin, newJob.id);
        await recordAdminAuditEvent(
          supabaseAdmin,
          user.id,
          "admin.billstack_backfill_started",
          { jobId: newJob.id, reason },
          req,
        );
      } catch (error) {
        await supabaseAdmin
          .from("billstack_backfill_jobs")
          .update({
            status: "failed",
            error_message: error instanceof Error
              ? error.message.slice(0, 1000)
              : "Could not prepare job.",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", newJob.id);
        throw error;
      }

      return jsonResponse({
        job: await getJobProgress(supabaseAdmin, newJob.id),
      });
    }

    if (action === "latest") {
      const { data: latestJob, error: latestJobError } = await supabaseAdmin
        .from("billstack_backfill_jobs")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestJobError) throw latestJobError;
      return jsonResponse({
        job: latestJob
          ? await getJobProgress(supabaseAdmin, latestJob.id)
          : null,
      });
    }

    const jobId = typeof body.jobId === "string" ? body.jobId : "";
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) {
      return jsonResponse(
        { message: "A valid backfill job ID is required." },
        400,
      );
    }

    if (action === "status") {
      return jsonResponse({ job: await getJobProgress(supabaseAdmin, jobId) });
    }
    if (action !== "process") {
      return jsonResponse({ message: "Unknown backfill action." }, 400);
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from("billstack_backfill_jobs")
      .select("id, status")
      .eq("id", jobId)
      .maybeSingle();
    if (jobError) throw jobError;
    if (!job) {
      return jsonResponse(
        { message: "Billstack backfill job not found." },
        404,
      );
    }
    if (job.status === "preparing") {
      return jsonResponse({ job: await getJobProgress(supabaseAdmin, jobId) });
    }
    if (job.status === "failed" || job.status === "completed") {
      return jsonResponse({ job: await getJobProgress(supabaseAdmin, jobId) });
    }

    const billstackConfig = await getBillstackConfig(supabaseAdmin);
    if (!billstackConfig) {
      return jsonResponse({
        message: "Billstack is not configured on the server.",
      }, 503);
    }

    const { data: items, error: claimError } = await supabaseAdmin.rpc(
      "claim_billstack_backfill_items",
      { p_job_id: jobId, p_batch_size: BATCH_SIZE },
    );
    if (claimError) throw claimError;

    await Promise.all(
      (items || []).map((item: { item_id: number; user_id: string }) =>
        processUser(
          supabaseAdmin,
          billstackConfig,
          jobId,
          item.item_id,
          item.user_id,
        )
      ),
    );

    let progress = await getJobProgress(supabaseAdmin, jobId);
    if (progress.pending_users === 0 && progress.processing_users === 0) {
      const { error: finishError } = await supabaseAdmin
        .from("billstack_backfill_jobs")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("status", "running");
      if (finishError) throw finishError;
      progress = await getJobProgress(supabaseAdmin, jobId);
    }

    return jsonResponse({ job: progress });
  } catch (error) {
    console.error("billstack-backfill error:", error);
    return jsonResponse(
      {
        message: error instanceof Error
          ? error.message
          : "Could not process Billstack backfill.",
      },
      500,
    );
  }
});
