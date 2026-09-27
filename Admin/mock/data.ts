// ============================================================
// AbbaKano Admin Console — Realistic Mock Data Generators
// All data mirrors production-realistic Nigerian telecom ops.
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
} from "@/types/telecom";

// ─── Utility ─────────────────────────────────────────────────
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function pastTime(hoursBack: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hoursBack);
  return d.toISOString();
}

function ngnRef(): string {
  return `AK${Date.now().toString().slice(-6)}${rand(100, 999)}`;
}

// ─── Transactions ─────────────────────────────────────────────
const nigerianPhones = [
  "08031234567", "08129876543", "07012345678", "09054321098",
  "08011223344", "07088776655", "09011234567", "08023456789",
  "07034567890", "09078901234", "08145678901", "08067890123",
];

const nigerianNames = [
  "Aminu Musa", "Fatima Bello", "Chukwuemeka Eze", "Ngozi Okafor",
  "Abdullahi Yusuf", "Aisha Mohammed", "Emeka Obi", "Chioma Adeyemi",
  "Ibrahim Salisu", "Blessing Eze", "Usman Garba", "Hauwa Sani",
  "Tunde Adebayo", "Kemi Oladele", "Samuel Adesanya", "Grace Okwu",
];

const dataPlans: Record<string, { plan: string; wholesale: number; selling: number }[]> = {
  MTN: [
    { plan: "1GB — 30 Days", wholesale: 220, selling: 250 },
    { plan: "2GB — 30 Days", wholesale: 440, selling: 500 },
    { plan: "5GB — 30 Days", wholesale: 1050, selling: 1200 },
    { plan: "10GB — 30 Days", wholesale: 2100, selling: 2400 },
    { plan: "20GB — 30 Days", wholesale: 3900, selling: 4500 },
    { plan: "50GB — 30 Days", wholesale: 9000, selling: 10500 },
  ],
  AIRTEL: [
    { plan: "1.5GB — 30 Days", wholesale: 290, selling: 350 },
    { plan: "3GB — 30 Days", wholesale: 570, selling: 650 },
    { plan: "6GB — 30 Days", wholesale: 1100, selling: 1300 },
    { plan: "15GB — 30 Days", wholesale: 2600, selling: 3000 },
  ],
  GLO: [
    { plan: "2GB — 30 Days", wholesale: 390, selling: 450 },
    { plan: "4.5GB — 30 Days", wholesale: 850, selling: 1000 },
    { plan: "10GB — 30 Days", wholesale: 1800, selling: 2100 },
  ],
  "9MOBILE": [
    { plan: "1GB — 30 Days", wholesale: 200, selling: 240 },
    { plan: "3GB — 30 Days", wholesale: 560, selling: 650 },
    { plan: "5GB — 30 Days", wholesale: 900, selling: 1050 },
  ],
};

export const mockTransactions: Transaction[] = Array.from({ length: 80 }, (_, i) => {
  const carrier = pick(["MTN", "AIRTEL", "GLO", "9MOBILE"] as const);
  const plans = dataPlans[carrier];
  const planItem = pick(plans);
  const status = pick(
    ["SUCCESS", "SUCCESS", "SUCCESS", "SUCCESS", "SUCCESS", "SUCCESS", "PENDING", "FAILED", "REFUNDED"] as const
  );
  return {
    id: `txn-${1000 + i}`,
    reference: ngnRef(),
    customerPhone: pick(nigerianPhones),
    customerName: pick(nigerianNames),
    carrier,
    serviceType: pick(["DATA_BUNDLE", "AIRTIME"] as const),
    plan: planItem.plan,
    wholesaleCost: planItem.wholesale,
    sellingPrice: planItem.selling,
    profitMargin: planItem.selling - planItem.wholesale,
    status,
    gateway: pick(["MTN Corporate API", "Airtel Direct", "Glo Cloud API", "9mobile Gateway"]),
    timestamp: pastTime(rand(0, 23)),
    receiptUrl: `/receipts/${ngnRef()}.pdf`,
  };
});

// ─── Inflow Records ───────────────────────────────────────────
export const mockInflows: InflowRecord[] = Array.from({ length: 40 }, (_, i) => ({
  id: `inf-${2000 + i}`,
  customerName: pick(nigerianNames),
  virtualAccount: `${pick(["703", "704", "803", "810"])}${rand(1000000, 9999999)}`,
  bankName: pick(["Moniepoint", "Wema Bank", "Direct Transfer"] as const),
  bankRef: `MNP${rand(100000000, 999999999)}`,
  amount: pick([500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]),
  sessionRef: `SES${ngnRef()}`,
  settledAt: pastTime(rand(0, 12)),
  status: pick(["SETTLED", "SETTLED", "SETTLED", "PENDING_SETTLEMENT", "UNMATCHED"] as const),
}));

// ─── Provider Balances ────────────────────────────────────────
export const mockProviderBalances: ProviderBalance[] = [
  {
    id: "prov-001", providerName: "MTN Corporate API", carrier: "MTN",
    balance: 842000, status: "HEALTHY", estimatedRunwayHours: 72,
    lowBalanceThreshold: 200000, lastRefillAt: pastTime(48),
    refillBankName: "Guaranty Trust Bank", refillAccountNumber: "0123456789",
  },
  {
    id: "prov-002", providerName: "Airtel Direct", carrier: "AIRTEL",
    balance: 175000, status: "LOW_BALANCE", estimatedRunwayHours: 18,
    lowBalanceThreshold: 200000, lastRefillAt: pastTime(96),
    refillBankName: "First Bank of Nigeria", refillAccountNumber: "3012345678",
  },
  {
    id: "prov-003", providerName: "Glo Cloud API", carrier: "GLO",
    balance: 310000, status: "HEALTHY", estimatedRunwayHours: 56,
    lowBalanceThreshold: 100000, lastRefillAt: pastTime(24),
    refillBankName: "Zenith Bank", refillAccountNumber: "1012345678",
  },
  {
    id: "prov-004", providerName: "9mobile Gateway", carrier: "9MOBILE",
    balance: 93500, status: "CRITICAL", estimatedRunwayHours: 9,
    lowBalanceThreshold: 100000, lastRefillAt: pastTime(120),
    refillBankName: "Access Bank", refillAccountNumber: "0712345678",
  },
];

// ─── Audit Logs ───────────────────────────────────────────────
const devices = [
  "Office Laptop (Kano HQ)", "Personal Laptop (Remote)", "Mobile — iOS (Kano)",
  "Tablet — Android (Abuja)", "Desktop PC (Lagos Office)",
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: "aud-001", staffName: "Abba Kano", role: "SUPER_ADMIN",
    action: "MANUAL_WALLET_CREDIT", target: "Customer: Fatima Bello (08129876543)",
    details: "Manual wallet credit of ₦15,000.00 issued after failed data bundle — auto-refund not processed.",
    device: "Office Laptop (Kano HQ)", ipAddress: "197.210.xxx.xxx", timestamp: pastTime(1),
  },
  {
    id: "aud-002", staffName: "Aminu Garba", role: "SUPPORT_AGENT",
    action: "MANUAL_WALLET_CREDIT", target: "Customer: Chukwuemeka Eze (07012345678)",
    details: "Customer credit of ₦8,000.00 approved after WhatsApp complaint — order AK229841.",
    device: "Mobile — iOS (Kano)", ipAddress: "41.190.xxx.xxx", timestamp: pastTime(2),
  },
  {
    id: "aud-003", staffName: "Abba Kano", role: "SUPER_ADMIN",
    action: "MARGIN_UPDATE", target: "MTN Data Margin",
    details: "SME margin updated from ₦25.00/GB to ₦30.00/GB. Gifting margin unchanged.",
    device: "Office Laptop (Kano HQ)", ipAddress: "197.210.xxx.xxx", timestamp: pastTime(4),
  },
  {
    id: "aud-004", staffName: "Kemi Adeyemi", role: "OPERATIONS_MANAGER",
    action: "BANK_ALERT_RESOLVE", target: "Unmatched Inflow: ₦50,000.00 — Wema Bank",
    details: "Manual bank alert resolved and matched to customer Ngozi Okafor after DVA mismatch.",
    device: "Tablet — Android (Abuja)", ipAddress: "102.89.xxx.xxx", timestamp: pastTime(5),
  },
  {
    id: "aud-005", staffName: "Aminu Garba", role: "SUPPORT_AGENT",
    action: "MANUAL_WALLET_CREDIT", target: "Customer: Usman Garba (09078901234)",
    details: "Wallet credit of ₦20,000.00 issued — this is the daily credit limit maximum.",
    device: "Mobile — iOS (Kano)", ipAddress: "41.190.xxx.xxx", timestamp: pastTime(6),
  },
  {
    id: "aud-006", staffName: "Abba Kano", role: "SUPER_ADMIN",
    action: "STAFF_ROLE_CHANGE", target: "Staff: Kemi Adeyemi",
    details: "Role changed from Support Agent to Operations Manager. Permissions updated accordingly.",
    device: "Office Laptop (Kano HQ)", ipAddress: "197.210.xxx.xxx", timestamp: pastTime(8),
  },
  {
    id: "aud-007", staffName: "Abba Kano", role: "SUPER_ADMIN",
    action: "PROVIDER_REFILL", target: "Airtel Direct Provider",
    details: "Provider balance refill initiated: ₦500,000.00 transfer to First Bank of Nigeria 3012345678.",
    device: "Office Laptop (Kano HQ)", ipAddress: "197.210.xxx.xxx", timestamp: pastTime(10),
  },
  {
    id: "aud-008", staffName: "Kemi Adeyemi", role: "OPERATIONS_MANAGER",
    action: "EXPORT_REPORT", target: "Transaction Report — Sept 2026",
    details: "Full transaction CSV export (2,840 records) downloaded for monthly reconciliation.",
    device: "Tablet — Android (Abuja)", ipAddress: "102.89.xxx.xxx", timestamp: pastTime(12),
  },
];

// ─── Staff Members ────────────────────────────────────────────
export const mockStaffMembers: StaffMember[] = [
  {
    id: "stf-001", name: "Abba Kano", email: "abba@abbakano.com",
    phone: "08032119044", role: "SUPER_ADMIN", singleCreditLimit: 0,
    dualApprovalThreshold: 0, status: "ACTIVE",
    joinedAt: "2023-01-01T00:00:00.000Z", lastActiveAt: pastTime(0),
    permissions: [
      "Full system access", "Approve all wallet credits",
      "Update carrier margins", "Manage staff roles",
      "Toggle maintenance mode", "Access all audit logs",
      "Provider balance refills", "Export all reports",
    ],
  },
  {
    id: "stf-002", name: "Aminu Garba", email: "aminu@abbakano.com",
    phone: "08099887766", role: "SUPPORT_AGENT", singleCreditLimit: 20000,
    dualApprovalThreshold: 50000, status: "ACTIVE",
    joinedAt: "2024-03-15T00:00:00.000Z", lastActiveAt: pastTime(1),
    permissions: [
      "View customer profiles", "Issue manual wallet credits (up to ₦20,000)",
      "Resolve support cases", "View transaction history",
      "Retry failed dispatches",
    ],
  },
  {
    id: "stf-003", name: "Kemi Adeyemi", email: "kemi@abbakano.com",
    phone: "07011223344", role: "OPERATIONS_MANAGER", singleCreditLimit: 50000,
    dualApprovalThreshold: 100000, status: "ACTIVE",
    joinedAt: "2023-08-20T00:00:00.000Z", lastActiveAt: pastTime(3),
    permissions: [
      "Full customer management", "Manual bank alert resolution",
      "View and filter all transactions", "Issue credits up to ₦50,000",
      "Generate operations reports", "VTU dispatch management",
    ],
  },
  {
    id: "stf-004", name: "Ibrahim Musa", email: "ibrahim@abbakano.com",
    phone: "09012345678", role: "VIEWER", singleCreditLimit: 0,
    dualApprovalThreshold: 0, status: "SUSPENDED",
    joinedAt: "2025-01-10T00:00:00.000Z", lastActiveAt: pastTime(72),
    permissions: ["View-only access to dashboard overview", "Read transaction logs (no exports)"],
  },
];

// ─── Margin Settings ──────────────────────────────────────────
export const mockMarginSettings: MarginSetting[] = [
  {
    carrier: "MTN", wholesaleBase: 220, smeMargin: 30, giftingMargin: 25,
    airtimePercent: 3.5, isSalesActive: true, lastUpdatedBy: "Abba Kano",
    lastUpdatedAt: pastTime(4),
  },
  {
    carrier: "AIRTEL", wholesaleBase: 195, smeMargin: 28, giftingMargin: 22,
    airtimePercent: 3.0, isSalesActive: true, lastUpdatedBy: "Abba Kano",
    lastUpdatedAt: pastTime(48),
  },
  {
    carrier: "GLO", wholesaleBase: 195, smeMargin: 25, giftingMargin: 20,
    airtimePercent: 2.8, isSalesActive: true, lastUpdatedBy: "Kemi Adeyemi",
    lastUpdatedAt: pastTime(72),
  },
  {
    carrier: "9MOBILE", wholesaleBase: 200, smeMargin: 22, giftingMargin: 18,
    airtimePercent: 2.5, isSalesActive: false, lastUpdatedBy: "Abba Kano",
    lastUpdatedAt: pastTime(120),
  },
];

// ─── Customers ────────────────────────────────────────────────
export const mockCustomers: CustomerUser[] = Array.from({ length: 50 }, (_, i) => ({
  id: `cus-${3000 + i}`,
  name: pick(nigerianNames),
  phone: pick(nigerianPhones),
  email: `user${3000 + i}@example.com`,
  walletBalance: rand(0, 50000),
  totalTransactions: rand(5, 200),
  totalSpent: rand(10000, 2000000),
  status: pick(["ACTIVE", "ACTIVE", "ACTIVE", "BLOCKED"] as const),
  joinedAt: pastTime(rand(100, 5000)),
  lastTransactionAt: pastTime(rand(0, 48)),
  referralCode: `REF${rand(10000, 99999)}`,
  dvAccount: `703${rand(1000000, 9999999)}`,
}));

// ─── Support Cases ────────────────────────────────────────────
export const mockSupportCases: SupportCase[] = [
  {
    id: "sup-001", ticketRef: "#SP-2214", customerName: "Fatima Bello",
    customerPhone: "08129876543", channel: "WHATSAPP",
    issue: "Data bundle deducted but not delivered — MTN 5GB order",
    status: "IN_PROGRESS", priority: "HIGH",
    assignedTo: "Aminu Garba", creditAmount: 1200,
    createdAt: pastTime(2), resolvedAt: undefined,
  },
  {
    id: "sup-002", ticketRef: "#SP-2213", customerName: "Emeka Obi",
    customerPhone: "08023456789", channel: "WHATSAPP",
    issue: "Wallet funded ₦10,000 but balance not reflecting",
    status: "RESOLVED", priority: "URGENT",
    assignedTo: "Kemi Adeyemi", creditAmount: 10000,
    createdAt: pastTime(5), resolvedAt: pastTime(4),
  },
  {
    id: "sup-003", ticketRef: "#SP-2212", customerName: "Ngozi Okafor",
    customerPhone: "09054321098", channel: "WHATSAPP",
    issue: "Airtime purchase failed but wallet was debited",
    status: "OPEN", priority: "MEDIUM",
    assignedTo: undefined, creditAmount: undefined,
    createdAt: pastTime(3),
  },
  {
    id: "sup-004", ticketRef: "#SP-2211", customerName: "Usman Garba",
    customerPhone: "09078901234", channel: "WHATSAPP",
    issue: "Requesting account unblock — suspended in error",
    status: "ESCALATED", priority: "HIGH",
    assignedTo: "Abba Kano", creditAmount: undefined,
    createdAt: pastTime(8),
  },
  {
    id: "sup-005", ticketRef: "#SP-2210", customerName: "Hauwa Sani",
    customerPhone: "08145678901", channel: "WHATSAPP",
    issue: "Glo 10GB data plan not working after purchase",
    status: "RESOLVED", priority: "LOW",
    assignedTo: "Aminu Garba", creditAmount: 2100,
    createdAt: pastTime(10), resolvedAt: pastTime(9),
  },
];

// ─── System Settings ──────────────────────────────────────────
export const mockSystemSettings: SystemSettings = {
  appMaintenanceMode: false,
  maintenanceMessage: "We are currently performing scheduled maintenance. Service will resume shortly. Thank you for your patience.",
  alertPhoneNumbers: ["08032119044", "08099887766"],
  lowBalanceThresholdNaira: 100000,
  dualApprovalAmountThreshold: 50000,
  maxSingleManualCredit: 20000,
  vtuGatewayPrimary: "MTN Corporate API",
  vtuGatewayFallback: "VTU-Africa Aggregator",
};
