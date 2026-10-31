// ============================================================
// AbbaKano Admin Console  -  Data Fetching Service Layer
// Connects to live backend via NEXT_PUBLIC_API_BASE_URL and Supabase Edge Functions.
// ============================================================

import type {
  Transaction,
  InflowRecord,
  ProviderBalance,
  AuditLog,
  StaffMember,
  MarginSetting,
  CustomerUser,
  ProviderFundingOption,
  SupportCase,
  SystemSettings,
  PaginatedResponse,
  ApiResponse,
} from "@admin/types/telecom";
import { apiRequest } from "@/lib/api";
import { invokeSupabaseFunction } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export type MonnifySettings = {
  apiKey: string;
  secretKey: string;
  contractCode: string;
  baseUrl: string;
};

/** Fetch Monnify DVA & Webhook settings */
export async function fetchMonnifySettings(): Promise<MonnifySettings> {
  return apiRequest<MonnifySettings>('/admin/monnify-settings');
}

/** Update Monnify DVA & Webhook settings */
export async function updateMonnifySettings(settings: MonnifySettings): Promise<void> {
  await apiRequest<void>('/admin/monnify-settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}


export type DashboardOverview = {
  totalVolumeToday: number;
  netMarginToday: number | null;
  totalUserBalance?: number;
  activeUsers: number;
  totalUsers: number;
  newUsersToday: number;
  vtuProviderBalance: number | null;
  depositsToday: number;
  inflowsCount: number;
  successRate: number;
  ordersToday: number;
  carrierBreakdown: Record<Carrier, { percentage: number; amount: number }>;
};

export type DashboardTrendPoint = {
  label: string;
  sales: number;
  deposits: number;
};

export type AdminOverviewSnapshot = {
  overview: DashboardOverview;
  transactions: Transaction[];
  trend: DashboardTrendPoint[];
};

export type Carrier =
  | "MTN"
  | "AIRTEL"
  | "GLO"
  | "9MOBILE"
  | "AEDC"
  | "IKEDC"
  | "KEDCO"
  | "PHED"
  | "JED"
  | "DSTV"
  | "GOTV"
  | "STARTIMES"
  | "VTUGATE";

export type MtnGeneralDataPlan = {
  key: string;
  label: string;
  sizeMb: number;
  validityPeriod: "daily" | "weekly" | "monthly";
  sellingPrice: number;
  enabled: boolean;
};

function normalizeCarrierName(value: string | null | undefined): Carrier {
  const normalized = String(value || "").trim().toUpperCase();
  if (["MTN", "AIRTEL", "GLO", "9MOBILE"].includes(normalized)) return normalized as Carrier;
  if (["AEDC", "IKEDC", "KEDCO", "PHED", "JED", "DSTV", "GOTV", "STARTIMES", "VTUGATE"].includes(normalized)) return normalized as Carrier;
  return "VTUGATE";
}

export type AdminSession = {
  admin: {
    id: string;
    username: string;
    full_name: string;
    email: string | null;
    role: string;
    status: string;
  };
  permissions: string[];
};

export async function fetchAdminSession(): Promise<AdminSession> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Sign in to continue.");
  if (user.app_metadata.admin_role !== "super_admin") {
    throw new Error("This account is not authorized for the Admin Portal.");
  }

  return {
    admin: {
      id: user.id,
      username: user.email || user.id,
      full_name: String(user.user_metadata.full_name || user.user_metadata.name || "Super Administrator"),
      email: user.email || null,
      role: "super_admin",
      status: "active",
    },
    permissions: ["*"],
  };
}

export async function logoutAdmin(): Promise<void> {
  let auditError: unknown;
  try {
    await recordAdminSessionEvent("logout");
  } catch (error) {
    auditError = error;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  if (auditError) {
    console.error("Admin signed out but the logout audit event could not be saved:", auditError);
    throw new Error("Signed out, but the logout event could not be saved to the audit log.");
  }
}

type BackendTransaction = {
  id: string;
  type: string;
  plan?: string;
  network: string;
  phone: string;
  amount: number;
  status: string;
  provider: string | null;
  created_at: string;
  username: string;
};

function mapTransaction(transaction: BackendTransaction): Transaction {
  const rawNetwork = String(transaction.network || "").trim();
  const carrier = normalizeCarrierName(rawNetwork || transaction.provider || "VTUGATE");
  const normalizedType = String(transaction.type || "").trim().toUpperCase();
  const serviceType = normalizedType === "DATA"
    ? "DATA_BUNDLE"
    : normalizedType === "AIRTIME"
      ? "AIRTIME"
      : normalizedType === "ELECTRICITY"
        ? "ELECTRICITY"
        : normalizedType === "CABLE_TV" || normalizedType === "CABLETV"
          ? "CABLE_TV"
          : (normalizedType as Transaction["serviceType"]);

  return {
    id: transaction.id,
    reference: transaction.id,
    customerPhone: transaction.phone,
    customerName: transaction.username,
    carrier,
    serviceType,
    plan: transaction.plan || transaction.type,
    wholesaleCost: 0,
    sellingPrice: transaction.amount,
    profitMargin: 0,
    status: transaction.status.toUpperCase() === "PROCESSING"
      ? "PENDING"
      : transaction.status.toUpperCase() as Transaction["status"],
    gateway: transaction.provider || "Unknown provider",
    timestamp: transaction.created_at,
  };
}

// Safe error sanitizer to prevent stack trace or internal leaks
export function sanitizeApiError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const msg = String((error as { message: unknown }).message);
    // Hide database or internal runtime messages
    if (/sql|database|mongo|relation|syntax|connection refused|hsm/i.test(msg)) {
      return "An internal system error occurred. Please contact administrative support.";
    }
    return msg;
  }
  return "Unable to process request. Please check your connection.";
}

// Retrieve authorization headers safely from client session
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-AbbaKano-Client": "AdminConsole/2.4",
  };
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("abbakano_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

function paginate<T>(arr: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  return {
    data: arr.slice(start, start + pageSize),
    total: arr.length,
    page,
    pageSize,
    hasNextPage: start + pageSize < arr.length,
  };
}

// ─── Transactions ─────────────────────────────────────────────
export async function fetchTransactions(
  page = 1,
  pageSize = 20,
  filters?: { status?: string; carrier?: string; search?: string }
): Promise<PaginatedResponse<Transaction>> {
  const params = new URLSearchParams();
  if (filters?.status) {
    const normalizedStatus = filters.status.toUpperCase();
    params.set(
      "status",
      normalizedStatus === "SUCCESS"
        ? "success"
        : normalizedStatus === "PENDING"
          ? "pending"
          : normalizedStatus === "FAILED"
            ? "failed"
            : normalizedStatus === "REFUNDED"
              ? "refunded"
              : filters.status.toLowerCase()
    );
  }
  if (filters?.carrier && filters.carrier !== "ALL") {
    params.set("carrier", filters.carrier.toLowerCase());
  }
  if (filters?.search) {
    params.set("q", filters.search);
  }
  const response = await apiRequest<{ transactions: BackendTransaction[] }>(
    `/admin/transactions?${params.toString()}`
  );
  const results = response.transactions.map(mapTransaction);
  return paginate(results, page, pageSize);
}

export type AdminTransactionMetrics = {
  stalledDisputed: number;
  refunded: number;
  queued: number;
};

export async function fetchAdminTransactions(
  page: number,
  pageSize: number,
  filters: { status?: string; carrier?: string; search?: string },
): Promise<PaginatedResponse<Transaction> & { metrics: AdminTransactionMetrics }> {
  const response = await invokeSupabaseFunction<{
    transactions: BackendTransaction[];
    total: number;
    metrics: AdminTransactionMetrics;
  }>("admin-transactions", {
    page,
    pageSize,
    status: filters.status || null,
    carrier: filters.carrier || null,
    search: filters.search || null,
  });
  const data = response.transactions.map(mapTransaction);
  return {
    data,
    total: response.total,
    page,
    pageSize,
    hasNextPage: page * pageSize < response.total,
    metrics: response.metrics,
  };
}

export type AdminVtuService = {
  id: string;
  type: string;
  network: string;
  name: string;
};

export async function fetchAdminVtuServices(): Promise<{
  provider: string;
  checkedAt: string;
  services: AdminVtuService[];
}> {
  return invokeSupabaseFunction<{
    provider: string;
    checkedAt: string;
    services: AdminVtuService[];
  }>("admin-vtu-services", {});
}

export type AdminVtuPlan = {
  id: number;
  network: "MTN" | "AIRTEL" | "GLO" | "9MOBILE";
  category: "GENERAL" | "SME" | "GIFTING" | "DIRECT";
  capacity: string;
  capacity_mb: number;
  duration: "daily" | "weekly" | "monthly";
  price_kobo: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export async function manageAdminVtuPlans(
  payload: Record<string, unknown>,
): Promise<{ plans?: AdminVtuPlan[]; plan?: AdminVtuPlan; deleted?: boolean }> {
  return invokeSupabaseFunction("admin-vtu-plans", payload);
}

export type PriceOverride = {
  id: string;
  provider: "DSTV" | "GOTV" | "STARTIMES" | "MTN" | "AIRTEL" | "GLO" | "9MOBILE";
  plan_code: string;
  price: number;
  enabled: boolean;
  label?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProviderLivePlan = {
  plan_code: string;
  service_id: string;
  name: string;
  display_capacity: string | null;
  default_display_capacity: string | null;
  has_custom_display_capacity: boolean;
  category: string;
  cost_price: number;
  selling_price: number;
  enabled: boolean;
  has_override: boolean;
  override_id: string | null;
  margin: number;
};

export async function managePriceOverrides(
  payload: Record<string, unknown>,
): Promise<{
  overrides?: PriceOverride[];
  override?: PriceOverride;
  plans?: ProviderLivePlan[];
  deleted?: boolean;
}> {
  return invokeSupabaseFunction("admin-cable-overrides", payload);
}

// Backwards-compatible aliases
export const manageCablePriceOverrides = managePriceOverrides;
export type CablePriceOverride = PriceOverride;

export async function fetchMtnGeneralDataPlans(): Promise<MtnGeneralDataPlan[]> {
  const response = await apiRequest<{ plans: MtnGeneralDataPlan[] }>("/admin/vtu-data-plans/mtn-general");
  return response.plans;
}

export async function saveMtnGeneralDataPlan(
  plan: Pick<MtnGeneralDataPlan, "key" | "validityPeriod" | "sellingPrice" | "enabled">
): Promise<MtnGeneralDataPlan> {
  const response = await apiRequest<{ plan: MtnGeneralDataPlan }>(`/admin/vtu-data-plans/mtn-general/${plan.key}`, {
    method: "PATCH",
    body: JSON.stringify({
      validityPeriod: plan.validityPeriod,
      sellingPrice: plan.sellingPrice,
      enabled: plan.enabled,
    }),
  });
  return response.plan;
}

export async function fetchTransactionById(id: string): Promise<ApiResponse<Transaction>> {
  const response = await invokeSupabaseFunction<{ transactions: BackendTransaction[] }>(
    "admin-transactions",
    { page: 1, pageSize: 1, search: id },
  );
  const tx = response.transactions.find((transaction) => transaction.id === id);
  return {
    success: !!tx,
    data: tx ? mapTransaction(tx) : undefined,
    error: tx ? undefined : "Transaction not found",
    timestamp: new Date().toISOString(),
  };
}

export async function retryTransaction(id: string): Promise<ApiResponse<{ queued: boolean }>> {
  return apiRequest<ApiResponse<{ queued: boolean }>>(`/admin/transactions/${id}/retry`, {
    method: "POST",
  });
}

// ─── Inflows ──────────────────────────────────────────────────
export async function fetchInflows(
  page = 1,
  pageSize = 20,
  filters?: { status?: string; bank?: string; search?: string }
): Promise<PaginatedResponse<InflowRecord> & {
  metrics: { totalCount: number; totalAmount: number; settledAmount: number; failedCount: number };
}> {
  const statusMap: Record<string, string> = {
    SETTLED: "success",
    PENDING_SETTLEMENT: "pending",
    FAILED: "failed",
  };
  const response = await invokeSupabaseFunction<{
    deposits: Array<{
    id: string;
    customer_name: string;
    customer_phone: string;
    virtual_account: string;
    bank_name: string;
    bank_reference: string;
    session_reference: string;
    amount: number;
    status: "success" | "pending" | "failed";
    created_at: string;
    settled_at: string;
  }>;
    total: number;
    page: number;
    pageSize: number;
    metrics: { totalCount: number; totalAmount: number; settledAmount: number; failedCount: number };
  }>("admin-deposits", {
    page,
    pageSize,
    status: filters?.status ? statusMap[filters.status] || null : null,
    search: filters?.search || filters?.bank || null,
  });
  return {
    data: response.deposits.map((deposit) => ({
      id: deposit.id,
      customerName: deposit.customer_name,
      virtualAccount: deposit.virtual_account,
      bankName: deposit.bank_name,
      bankRef: deposit.bank_reference,
      sessionRef: deposit.session_reference,
      amount: deposit.amount,
      settledAt: deposit.settled_at || deposit.created_at,
      status: deposit.status === "success" ? "SETTLED" : deposit.status === "pending" ? "PENDING_SETTLEMENT" : "FAILED",
    })),
    total: response.total,
    page: response.page,
    pageSize: response.pageSize,
    hasNextPage: response.page * response.pageSize < response.total,
    metrics: response.metrics,
  };
}

export async function markDepositFailed(id: string, reason: string): Promise<void> {
  await invokeSupabaseFunction<{ success: boolean }>("admin-deposits", {
    action: "mark_failed",
    depositId: id,
    reason,
  });
}

// ─── Provider Balances ────────────────────────────────────────
export async function fetchProviderBalances(): Promise<ProviderBalance[]> {
  const providerNames = ["VTUGATE", "ALRAHUZDATA"] as const;
  return Promise.all(providerNames.map(async (provider) => {
    const identity = provider === "VTUGATE"
      ? { id: "vtugate", providerName: "VTUGATE", carrier: "VTUGATE" as const }
      : { id: "alrahuzdata", providerName: "ALRAHUZDATA", carrier: "ALRAHUZDATA" as const };
    try {
      const response = await invokeSupabaseFunction<{
        provider: "VTUGATE" | "ALRAHUZDATA";
        providerName: string;
        balance: number;
        status: ProviderBalance["status"];
        lastCheckedAt: string;
        lowBalanceThreshold: number;
        fundingOptions: ProviderFundingOption[];
      }>("admin-provider-balances", { provider });
      return {
        ...identity,
        balance: response.balance,
        status: response.status,
        estimatedRunwayHours: 0,
        lowBalanceThreshold: response.lowBalanceThreshold,
        lastRefillAt: response.lastCheckedAt,
        refillBankName: "",
        refillAccountNumber: "",
        fundingOptions: response.fundingOptions,
      };
    } catch (error) {
      return {
        ...identity,
        balance: null,
        status: "OFFLINE" as const,
        estimatedRunwayHours: 0,
        lowBalanceThreshold: 0,
        lastRefillAt: new Date().toISOString(),
        refillBankName: "",
        refillAccountNumber: "",
        error: error instanceof Error ? error.message : `Could not load ${provider} balance.`,
        fundingOptions: [],
      };
    }
  }));
}

export async function initiateProviderRefill(
  providerId: string,
  amount: number
): Promise<ApiResponse<{ transferRef: string }>> {
  return apiRequest<ApiResponse<{ transferRef: string }>>(`/admin/providers/${providerId}/refill`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

// ─── Audit Logs ───────────────────────────────────────────────
export async function recordAdminSessionEvent(event: "login" | "logout"): Promise<void> {
  await invokeSupabaseFunction<{ success: boolean }>("admin-audit-logs", {
    recordEvent: event,
  });
}

export async function recordAdminPageView(path: string): Promise<void> {
  await invokeSupabaseFunction<{ success: boolean }>("admin-audit-logs", {
    recordEvent: "page_view",
    path,
  });
}

function parseAuditDetails(details: unknown): string {
  if (!details) return "Administrative action recorded";
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details) as Record<string, unknown>;
      return parseAuditDetails(parsed);
    } catch {
      return details;
    }
  }
  if (typeof details === "object") {
    const data = details as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof data.target === "string" && data.target) parts.push(`Target: ${data.target}`);
    if (typeof data.planId !== "undefined") parts.push(`Plan ID: ${String(data.planId)}`);
    if (typeof data.network === "string") parts.push(`Network: ${data.network}`);
    if (typeof data.category === "string") parts.push(`Category: ${data.category}`);
    if (typeof data.capacityMb !== "undefined") parts.push(`Capacity: ${String(data.capacityMb)} MB`);
    if (typeof data.duration === "string") parts.push(`Duration: ${data.duration}`);
    if (typeof data.reference === "string") parts.push(`Reference: ${data.reference}`);
    if (typeof data.transactionType === "string") parts.push(`Service: ${data.transactionType}`);
    if (typeof data.reason === "string" && data.reason) parts.push(`Reason: ${data.reason}`);
    if (typeof data.before !== "undefined" && typeof data.after !== "undefined") {
      parts.push(`Status: ${String(data.before)} → ${String(data.after)}`);
    }
    if (typeof data.previousStatus === "string" && typeof data.status === "string") {
      parts.push(`Status: ${data.previousStatus} → ${data.status}`);
    } else if (typeof data.status === "string") {
      parts.push(`Status: ${data.status}`);
    }
    if (typeof data.amount !== "undefined") parts.push(`Amount: ₦${Number(data.amount).toLocaleString()}`);
    if (typeof data.direction === "string") parts.push(`${data.direction === "credit" ? "Credited" : "Debited"} wallet`);
    if (typeof data.userId !== "undefined") parts.push(`User ID: ${String(data.userId)}`);
    return parts.length ? parts.join(" • ") : JSON.stringify(data);
  }
  return String(details);
}

export async function fetchAuditLogs(
  page = 1,
  pageSize = 20,
  filters?: {
    staffName?: string;
    action?: string;
    search?: string;
    stream?: "all" | "user" | "admin";
    from?: string;
    to?: string;
    actorRole?: string;
  }
): Promise<PaginatedResponse<AuditLog> & {
  metrics: { totalEvents: number; depositEvents: number; vtuEvents: number; adminEvents: number };
  actions: string[];
  roles: string[];
}> {
  const response = await invokeSupabaseFunction<{
    auditLogs?: Array<{
      id: string;
      actor_user_id?: string | null;
      action: string;
      details: unknown;
      ip_address?: string | null;
      created_at: string;
      actor?: string | null;
      role?: string | null;
    }>;
    total?: number;
    page?: number;
    pageSize?: number;
    actions?: unknown;
    roles?: unknown;
    metrics?: Partial<Record<"totalEvents" | "depositEvents" | "vtuEvents" | "adminEvents", number>>;
  }>("admin-audit-logs", {
    page,
    pageSize,
    action: filters?.action || null,
    search: filters?.search || filters?.staffName || null,
    stream: filters?.stream || "all",
    from: filters?.from || null,
    to: filters?.to || null,
    actorRole: filters?.actorRole || null,
  });

  if (!Array.isArray(response.auditLogs)) {
    throw new Error("Audit log response did not contain a valid event list.");
  }

  const results = response.auditLogs.map((entry) => ({
    id: String(entry.id),
    actorUserId: entry.actor_user_id || undefined,
    staffName: entry.actor || "System",
    role: (entry.role?.toUpperCase() || "SYSTEM") as AuditLog["role"],
    action: entry.action as AuditLog["action"],
    target: typeof entry.details === "object" && entry.details && "target" in entry.details ? String((entry.details as Record<string, unknown>).target ?? "Admin action") : "Admin action",
    details: parseAuditDetails(entry.details),
    rawDetails: entry.details,
    device: entry.role?.toUpperCase() === "SYSTEM" ? "Supabase event trigger" : "Admin Console",
    ipAddress: entry.ip_address || undefined,
    timestamp: entry.created_at,
  }));
  const total = typeof response.total === "number" && Number.isFinite(response.total)
    ? response.total
    : results.length;
  const responseMetrics = response.metrics || {};
  const metricValue = (key: "totalEvents" | "depositEvents" | "vtuEvents" | "adminEvents") =>
    typeof responseMetrics[key] === "number" && Number.isFinite(responseMetrics[key])
      ? responseMetrics[key]
      : 0;
  const actions = Array.isArray(response.actions)
    ? response.actions.filter((action): action is string => typeof action === "string")
    : [...new Set(results.map((entry) => entry.action))];
  const roles = Array.isArray(response.roles)
    ? response.roles.filter((role): role is string => typeof role === "string")
    : [...new Set(results.map((entry) => entry.role))];

  return {
    data: results,
    total,
    page: response.page ?? page,
    pageSize: response.pageSize ?? pageSize,
    hasNextPage: (response.page ?? page) * (response.pageSize ?? pageSize) < total,
    metrics: {
      totalEvents: metricValue("totalEvents"),
      depositEvents: metricValue("depositEvents"),
      vtuEvents: metricValue("vtuEvents"),
      adminEvents: metricValue("adminEvents"),
    },
    actions,
    roles,
  };
}

// ─── Staff / Roles ────────────────────────────────────────────
export async function fetchStaffMembers(): Promise<StaffMember[]> {
  const response = await apiRequest<{ staff: StaffMember[] }>("/admin/staff");
  return response.staff;
}

export async function updateStaffMember(
  id: string,
  update: Partial<StaffMember>
): Promise<ApiResponse<StaffMember>> {
  return apiRequest<ApiResponse<StaffMember>>(`/admin/staff/${id}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

// ─── Margin Settings ──────────────────────────────────────────
export async function fetchMarginSettings(): Promise<MarginSetting[]> {
  const response = await invokeSupabaseFunction<{ margins: MarginSetting[] }>(
    "admin-settings",
    { action: "get_margins" },
  );
  return response.margins;
}

export async function updateMargins(
  carrier: string,
  update: Partial<MarginSetting>,
  reason: string,
): Promise<ApiResponse<MarginSetting>> {
  return invokeSupabaseFunction<ApiResponse<MarginSetting>>("admin-settings", {
    action: "update_margin",
    carrier,
    update,
    reason,
  });
}

// ─── Customers ────────────────────────────────────────────────
export async function fetchCustomers(
  page = 1,
  pageSize = 20,
  search?: string,
  status?: "ACTIVE" | "BLOCKED"
): Promise<PaginatedResponse<CustomerUser> & { metrics: { active: number; blocked: number } }> {
  const response = await invokeSupabaseFunction<{
    users: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      status: "active" | "blocked";
      created_at: string;
      wallet_balance: number;
      total_transactions: number;
      total_spent: number;
      last_transaction_at: string;
    }>;
    total: number;
    metrics: { active: number; blocked: number };
  }>("admin-users", {
    page,
    pageSize,
    search: search || null,
    status: status || null,
  });
  return {
    data: response.users.map((user) => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      walletBalance: user.wallet_balance,
      totalTransactions: user.total_transactions,
      totalSpent: user.total_spent,
      status: user.status === "blocked" ? "BLOCKED" : "ACTIVE",
      joinedAt: user.created_at,
      lastTransactionAt: user.last_transaction_at,
      referralCode: "",
    })),
    total: response.total,
    page,
    pageSize,
    hasNextPage: page * pageSize < response.total,
    metrics: response.metrics,
  };
}

export async function updateCustomerStatus(
  customerId: string,
  status: "ACTIVE" | "BLOCKED",
  reason: string,
): Promise<void> {
  await invokeSupabaseFunction("admin-users", {
    action: "update_status",
    userId: customerId,
    status: status.toLowerCase(),
    reason,
  });
}

export async function creditUserWallet(
  customerId: string,
  amount: number,
  reason: string,
  approvedBy: string
): Promise<ApiResponse<{ newBalance: number; creditRef: string }>> {
  const response = await apiRequest<{ balance: number }>(`/admin/users/${customerId}/ledger`, {
    method: "POST",
    headers: { "Idempotency-Key": `admin-ledger-${customerId}-${Date.now()}` },
    body: JSON.stringify({ amount, direction: "credit", reason }),
  });
  return {
    success: true,
    data: {
      newBalance: response.balance,
      creditRef: "backend-ledger",
    },
    timestamp: new Date().toISOString(),
  };
}

export async function adjustCustomerWallet(
  customerId: string,
  amount: number,
  direction: "credit" | "debit",
  reason: string
): Promise<{ balance: number }> {
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) {
    throw new Error("Enter a valid wallet adjustment amount.");
  }

  const response = await invokeSupabaseFunction<{ balance_kobo: number }>("admin-users", {
    action: "adjust_wallet",
    userId: customerId,
    amountKobo: Math.round(amount * 100),
    direction,
    reason,
    adjustmentId: crypto.randomUUID(),
  });
  return { balance: response.balance_kobo / 100 };
}

// ─── Support Cases ────────────────────────────────────────────
export async function fetchSupportCases(): Promise<SupportCase[]> {
  const response = await apiRequest<{ cases: SupportCase[] }>("/admin/support/cases");
  return response.cases;
}

// ─── System Settings ──────────────────────────────────────────
export async function fetchSystemSettings(): Promise<SystemSettings> {
  return invokeSupabaseFunction<SystemSettings>("admin-settings", {
    action: "get_settings",
  });
}

export async function updateSystemSettings(
  updates: Partial<SystemSettings>,
  reason: string,
): Promise<ApiResponse<SystemSettings>> {
  return invokeSupabaseFunction<ApiResponse<SystemSettings>>("admin-settings", {
    action: "update_settings",
    settings: updates,
    reason,
  });
}

// ─── Dashboard Overview ───────────────────────────────────────
export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const [summaryResponse, todayResponse, transactionsResponse] = await Promise.all([
    apiRequest<{ summary: { users: number; activeUsers: number; transactions: number; successful: number } }>(
      "/admin/dashboard/summary"
    ),
    apiRequest<{ today: { transactions: number; volume: number; activeUsers: number; depositsVolume: number } }>(
      "/admin/dashboard/today"
    ),
    apiRequest<{ transactions: BackendTransaction[] }>("/admin/transactions?status=success"),
  ]);
  const carrierTotals = transactionsResponse.transactions.reduce<Record<Carrier, number>>(
    (totals, transaction) => {
      const carrier = normalizeCarrierName(transaction.network || transaction.provider || "VTUGATE");
      totals[carrier] = (totals[carrier] || 0) + transaction.amount;
      return totals;
    },
    { MTN: 0, AIRTEL: 0, GLO: 0, "9MOBILE": 0, AEDC: 0, IKEDC: 0, KEDCO: 0, PHED: 0, JED: 0, DSTV: 0, GOTV: 0, STARTIMES: 0, VTUGATE: 0 }
  );
  const totalCarrierVolume = Object.values(carrierTotals).reduce((total, amount) => total + amount, 0);

  return {
    totalVolumeToday: todayResponse.today.volume,
    netMarginToday: null,
    activeUsers: todayResponse.today.activeUsers,
    totalUsers: summaryResponse.summary.users,
    newUsersToday: 0,
    vtuProviderBalance: null,
    depositsToday: todayResponse.today.depositsVolume,
    inflowsCount: 0,
    successRate: summaryResponse.summary.transactions
      ? Number(((summaryResponse.summary.successful / summaryResponse.summary.transactions) * 100).toFixed(1))
      : 0,
    ordersToday: todayResponse.today.transactions,
    carrierBreakdown: (Object.keys(carrierTotals) as Carrier[]).reduce((breakdown, carrier) => {
      breakdown[carrier] = {
        percentage: totalCarrierVolume ? Math.round((carrierTotals[carrier] / totalCarrierVolume) * 100) : 0,
        amount: carrierTotals[carrier],
      };
      return breakdown;
    }, {} as DashboardOverview["carrierBreakdown"]),
  };
}

export async function fetchAdminOverviewSnapshot(days: 1 | 7 | 30): Promise<AdminOverviewSnapshot> {
  const response = await invokeSupabaseFunction<{
    overview: DashboardOverview;
    transactions: BackendTransaction[];
    trend: DashboardTrendPoint[];
  }>("admin-overview", { days });
  return {
    overview: response.overview,
    transactions: response.transactions.map(mapTransaction),
    trend: response.trend,
  };
}
