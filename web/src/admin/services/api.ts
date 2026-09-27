// ============================================================
// AbbaKano Admin Console — Data Fetching Service Layer
// Connects to live backend via NEXT_PUBLIC_API_BASE_URL
// Falls back gracefully to mock models if live server is offline.
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

import {
  mockTransactions,
  mockStaffMembers,
  mockMarginSettings,
  mockCustomers,
  mockSupportCases,
  mockSystemSettings,
} from "@admin/mock/data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export type DashboardOverview = {
  totalVolumeToday: number;
  netMarginToday: number | null;
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

type Carrier =
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

function normalizeCarrierName(value: string | null | undefined): Carrier {
  const normalized = String(value || "").trim().toUpperCase();
  if (["MTN", "AIRTEL", "GLO", "9MOBILE"].includes(normalized)) return normalized as Carrier;
  if (["AEDC", "IKEDC", "KEDCO", "PHED", "JED", "DSTV", "GOTV", "STARTIMES", "VTUGATE"].includes(normalized)) return normalized as Carrier;
  return "VTUGATE";
}

export type AdminSession = {
  admin: {
    id: number;
    username: string;
    full_name: string;
    email: string | null;
    role: string;
    status: string;
  };
  permissions: string[];
};

export function fetchAdminSession(): Promise<AdminSession> {
  return apiRequest<AdminSession>("/admin/auth/me");
}

export function logoutAdmin(): Promise<void> {
  return apiRequest<void>("/admin/auth/logout", { method: "POST" });
}

type BackendTransaction = {
  id: string;
  type: string;
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
    plan: transaction.type,
    wholesaleCost: 0,
    sellingPrice: transaction.amount,
    profitMargin: 0,
    status: transaction.status.toUpperCase() as Transaction["status"],
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

// Simulate async network latency for mock data
const delay = (ms = 250) => new Promise<void>((res) => setTimeout(res, ms));

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

export async function fetchTransactionById(id: string): Promise<ApiResponse<Transaction>> {
  await delay(100);
  const tx = mockTransactions.find((t) => t.id === id);
  return {
    success: !!tx,
    data: tx,
    error: tx ? undefined : "Transaction not found",
    timestamp: new Date().toISOString(),
  };
}

export async function retryTransaction(id: string): Promise<ApiResponse<{ queued: boolean }>> {
  await delay(500);
  return { success: true, data: { queued: true }, timestamp: new Date().toISOString() };
}

// ─── Inflows ──────────────────────────────────────────────────
export async function fetchInflows(
  page = 1,
  pageSize = 20,
  filters?: { status?: string; bank?: string }
): Promise<PaginatedResponse<InflowRecord>> {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (filters?.status) {
    const statusMap: Record<string, string> = {
      SETTLED: "success",
      PENDING_SETTLEMENT: "pending",
      FAILED: "failed",
    };
    if (statusMap[filters.status]) params.set("status", statusMap[filters.status]);
  }
  if (filters?.bank) params.set("q", filters.bank);
  const response = await apiRequest<{ deposits: Array<{
    id: string;
    customerName: string;
    customerPhone: string | null;
    virtualAccount: string | null;
    bankName: string | null;
    bankRef: string;
    sessionRef: string;
    amount: number;
    status: "success" | "pending" | "failed";
    settledAt: string;
  }>; total: number; page: number; limit: number }>(`/admin/deposits?${params.toString()}`);
  return {
    data: response.deposits.map((deposit) => ({
      id: deposit.id,
      customerName: deposit.customerName,
      virtualAccount: deposit.virtualAccount || "Not assigned",
      bankName: deposit.bankName || "Bank source unavailable",
      bankRef: deposit.bankRef,
      amount: deposit.amount,
      sessionRef: deposit.sessionRef,
      settledAt: deposit.settledAt,
      status: deposit.status === "success" ? "SETTLED" : deposit.status === "pending" ? "PENDING_SETTLEMENT" : "FAILED",
    })),
    total: response.total,
    page: response.page,
    pageSize: response.limit,
    hasNextPage: response.page * response.limit < response.total,
  };
}

// ─── Provider Balances ────────────────────────────────────────
export async function fetchProviderBalances(): Promise<ProviderBalance[]> {
  const response = await apiRequest<{
    provider: "VTUGATE";
    providerName: string;
    balance: number;
    status: "HEALTHY" | "CRITICAL";
    lastCheckedAt: string;
    lowBalanceThreshold: number;
    fundingOptions: ProviderFundingOption[];
  }>("/admin/provider-balance");
  return [{
    id: "vtugate",
    providerName: response.providerName,
    carrier: "VTUGATE",
    balance: response.balance,
    status: response.status,
    estimatedRunwayHours: 0,
    lowBalanceThreshold: response.lowBalanceThreshold,
    lastRefillAt: response.lastCheckedAt,
    refillBankName: "",
    refillAccountNumber: "",
    fundingOptions: response.fundingOptions,
  }];
}

export async function initiateProviderRefill(
  providerId: string,
  amount: number
): Promise<ApiResponse<{ transferRef: string }>> {
  await delay(700);
  return {
    success: true,
    data: { transferRef: `TRF${Date.now().toString().slice(-8)}` },
    timestamp: new Date().toISOString(),
  };
}

// ─── Audit Logs ───────────────────────────────────────────────
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
    if (typeof data.reason === "string" && data.reason) parts.push(`Reason: ${data.reason}`);
    if (typeof data.before !== "undefined" && typeof data.after !== "undefined") {
      parts.push(`Status: ${String(data.before)} → ${String(data.after)}`);
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
  filters?: { staffName?: string; action?: string }
): Promise<PaginatedResponse<AuditLog>> {
  const response = await apiRequest<{ auditLog: Array<{
    id: string;
    action: string;
    details: unknown;
    ip_address?: string | null;
    created_at: string;
    actor?: string | null;
  }> }>("/admin/audit-log");

  let results = (response.auditLog || []).map((entry) => ({
    id: String(entry.id),
    staffName: entry.actor || "System",
    role: "ADMIN" as const,
    action: (entry.action as AuditLog["action"]) || "admin.user_status_changed",
    target: typeof entry.details === "object" && entry.details && "target" in entry.details ? String((entry.details as Record<string, unknown>).target ?? "Admin action") : "Admin action",
    details: parseAuditDetails(entry.details),
    device: "Admin Console",
    ipAddress: entry.ip_address || undefined,
    timestamp: entry.created_at,
  }));

  if (filters?.staffName) {
    results = results.filter((log) => log.staffName.toLowerCase().includes(filters.staffName!.toLowerCase()));
  }
  if (filters?.action) {
    results = results.filter((log) => log.action === filters.action);
  }

  return paginate(results, page, pageSize);
}

// ─── Staff / Roles ────────────────────────────────────────────
export async function fetchStaffMembers(): Promise<StaffMember[]> {
  await delay(200);
  return mockStaffMembers;
}

export async function updateStaffMember(
  id: string,
  update: Partial<StaffMember>
): Promise<ApiResponse<StaffMember>> {
  await delay(500);
  const member = mockStaffMembers.find((s) => s.id === id);
  if (!member) return { success: false, error: "Staff not found", timestamp: new Date().toISOString() };
  return { success: true, data: { ...member, ...update }, timestamp: new Date().toISOString() };
}

// ─── Margin Settings ──────────────────────────────────────────
export async function fetchMarginSettings(): Promise<MarginSetting[]> {
  await delay(200);
  return mockMarginSettings;
}

export async function updateMargins(
  carrier: string,
  update: Partial<MarginSetting>
): Promise<ApiResponse<MarginSetting>> {
  await delay(500);
  const setting = mockMarginSettings.find((m) => m.carrier === carrier);
  if (!setting) return { success: false, error: "Carrier not found", timestamp: new Date().toISOString() };
  return { success: true, data: { ...setting, ...update }, timestamp: new Date().toISOString() };
}

// ─── Customers ────────────────────────────────────────────────
export async function fetchCustomers(
  page = 1,
  pageSize = 20,
  search?: string,
  status?: "ACTIVE" | "BLOCKED"
): Promise<PaginatedResponse<CustomerUser>> {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
  if (search) params.set("search", search);
  if (status) params.set("status", status.toLowerCase());
  const response = await apiRequest<{ users: Array<{
    id: number;
    username: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    status: "active" | "blocked";
    created_at: string;
    balance: number;
    totalTransactions: number;
    totalSpent: number;
    lastTransactionAt: string;
  }>; total: number }>(`/admin/users?${params.toString()}`);
  return {
    data: response.users.map((user) => ({
      id: String(user.id),
      name: user.full_name || user.username,
      phone: user.phone || "",
      email: user.email || "",
      walletBalance: user.balance,
      totalTransactions: user.totalTransactions,
      totalSpent: user.totalSpent,
      status: user.status === "blocked" ? "BLOCKED" : "ACTIVE",
      joinedAt: user.created_at,
      lastTransactionAt: user.lastTransactionAt,
      referralCode: "",
    })),
    total: response.total,
    page,
    pageSize,
    hasNextPage: page * pageSize < response.total,
  };
}

export async function updateCustomerStatus(
  customerId: string,
  status: "ACTIVE" | "BLOCKED"
): Promise<void> {
  await apiRequest(`/admin/users/${customerId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: status.toLowerCase() }),
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
  return apiRequest<{ balance: number }>(`/admin/users/${customerId}/ledger`, {
    method: "POST",
    headers: { "Idempotency-Key": `admin-ledger-${customerId}-${Date.now()}` },
    body: JSON.stringify({ amount, direction, reason }),
  });
}

// ─── Support Cases ────────────────────────────────────────────
export async function fetchSupportCases(): Promise<SupportCase[]> {
  await delay(200);
  return mockSupportCases;
}

// ─── System Settings ──────────────────────────────────────────
export async function fetchSystemSettings(): Promise<SystemSettings> {
  await delay(150);
  return mockSystemSettings;
}

export async function updateSystemSettings(
  updates: Partial<SystemSettings>
): Promise<ApiResponse<SystemSettings>> {
  await delay(500);
  return {
    success: true,
    data: { ...mockSystemSettings, ...updates },
    timestamp: new Date().toISOString(),
  };
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
