type AuditClient = {
  from: (table: "admin_audit_logs") => {
    insert: (values: {
      actor_user_id: string;
      actor_role: string;
      action: string;
      details: Record<string, unknown>;
      ip_address: string | null;
    }) => PromiseLike<{ error: unknown }>;
  };
};

export async function recordAdminAuditEvent(
  admin: AuditClient,
  actorUserId: string,
  action: string,
  details: Record<string, unknown>,
  request: Request,
) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || null;
  const { error } = await admin.from("admin_audit_logs").insert({
    actor_user_id: actorUserId,
    actor_role: "SUPER_ADMIN",
    action,
    details,
    ip_address: ipAddress,
  });
  if (error) {
    console.error(`Could not record admin audit event "${action}":`, error);
    throw new Error("The action completed, but its audit record could not be saved.");
  }
}
