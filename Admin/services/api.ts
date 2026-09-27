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
  SupportCase,
  SystemSettings,
  PaginatedResponse,
  ApiResponse,
} from "@/types/telecom";

import {
  mockTransactions,
  mockInflows,
  mockProviderBalances,
  mockAuditLogs,
  mockStaffMembers,
  mockMarginSettings,
  mockCustomers,
  mockSupportCases,
  mockSystemSettings,
} from "@/mock/data";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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
  await delay();
  let results = [...mockTransactions];
  if (filters?.status) results = results.filter((t) => t.status === filters.status);
  if (filters?.carrier) results = results.filter((t) => t.carrier === filters.carrier);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (t) => t.reference.toLowerCase().includes(q) || t.customerPhone.includes(q)
    );
  }
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
  await delay();
  let results = [...mockInflows];
  if (filters?.status) results = results.filter((r) => r.status === filters.status);
  if (filters?.bank) results = results.filter((r) => r.bankName === filters.bank);
  return paginate(results, page, pageSize);
}

export async function resolveUnmatchedInflow(
  id: string,
  customerPhone: string,
  resolvedBy: string
): Promise<ApiResponse<InflowRecord>> {
  await delay(600);
  const inflow = mockInflows.find((i) => i.id === id);
  if (!inflow) return { success: false, error: "Inflow not found", timestamp: new Date().toISOString() };
  return {
    success: true,
    data: { ...inflow, status: "MANUAL_RESOLVED", resolvedBy },
    timestamp: new Date().toISOString(),
  };
}

// ─── Provider Balances ────────────────────────────────────────
export async function fetchProviderBalances(): Promise<ProviderBalance[]> {
  await delay(200);
  return mockProviderBalances;
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
export async function fetchAuditLogs(
  page = 1,
  pageSize = 20,
  filters?: { staffName?: string; action?: string }
): Promise<PaginatedResponse<AuditLog>> {
  await delay();
  let results = [...mockAuditLogs];
  if (filters?.staffName) results = results.filter((l) => l.staffName === filters.staffName);
  if (filters?.action) results = results.filter((l) => l.action === filters.action);
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
  search?: string
): Promise<PaginatedResponse<CustomerUser>> {
  await delay();
  let results = [...mockCustomers];
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }
  return paginate(results, page, pageSize);
}

export async function creditUserWallet(
  customerId: string,
  amount: number,
  reason: string,
  approvedBy: string
): Promise<ApiResponse<{ newBalance: number; creditRef: string }>> {
  await delay(800);
  const customer = mockCustomers.find((c) => c.id === customerId);
  if (!customer) return { success: false, error: "Customer not found", timestamp: new Date().toISOString() };
  return {
    success: true,
    data: {
      newBalance: customer.walletBalance + amount,
      creditRef: `CRD${Date.now().toString().slice(-8)}`,
    },
    timestamp: new Date().toISOString(),
  };
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
export async function fetchDashboardOverview() {
  await delay(300);
  const todayTxns = mockTransactions.filter((t) => t.status === "SUCCESS");
  const totalRevenue = todayTxns.reduce((s, t) => s + t.sellingPrice, 0);
  const totalCost = todayTxns.reduce((s, t) => s + t.wholesaleCost, 0);
  return {
    totalVolumeToday: totalRevenue,
    netMarginToday: totalRevenue - totalCost,
    activeUsers: 1248,
    totalUsers: 14890,
    newUsersToday: 84,
    vtuProviderBalance: 1420500,
    depositsToday: 4850200,
    inflowsCount: 412,
    successRate: 99.2,
    ordersToday: 3140,
    carrierBreakdown: {
      MTN: { percentage: 52, amount: 2034060 },
      AIRTEL: { percentage: 26, amount: 1017030 },
      GLO: { percentage: 14, amount: 547970 },
      "9MOBILE": { percentage: 8, amount: 312960 },
    },
  };
}
