// ============================================================
// AbbaKano Admin Console — TypeScript Domain Models
// Designed for zero-refactor backend API integration.
// Replace mock service returns with fetch('/api/...') calls.
// ============================================================

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
export type ServiceType = "DATA_BUNDLE" | "AIRTIME" | "ELECTRICITY" | "CABLE_TV" | "EXAM_PIN";
export type TransactionStatus = "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED";
export type InflowStatus = "SETTLED" | "PENDING_SETTLEMENT" | "FAILED";
export type StaffRole = "SUPER_ADMIN" | "SUPPORT_AGENT" | "OPERATIONS_MANAGER" | "VIEWER" | "ADMIN" | "SYSTEM";
export type StaffStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";
export type ProviderStatus = "HEALTHY" | "LOW_BALANCE" | "CRITICAL" | "OFFLINE";
export type AuditAction =
  | "MANUAL_WALLET_CREDIT"
  | "MARGIN_UPDATE"
  | "STAFF_ROLE_CHANGE"
  | "MAINTENANCE_MODE_TOGGLE"
  | "PROVIDER_REFILL"
  | "TRANSACTION_REFUND"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT_REPORT"
  | "BANK_ALERT_RESOLVE"
  | "admin.user_status_changed"
  | "admin.ledger_adjusted"
  | "admin.funds_added"
  | "admin.logout"
  | "agent.status_changed"
  | "deposit.settled"
  | "deposit.status_changed"
  | "vtu.settled"
  | "vtu.status_changed"
  | "admin.vtu_plan_created"
  | "admin.vtu_plan_updated"
  | "admin.vtu_plan_deleted";

// ─── Transaction ──────────────────────────────────────────────
export interface Transaction {
  id: string;
  reference: string;
  customerPhone: string;
  customerName: string;
  carrier: Carrier;
  serviceType: ServiceType;
  plan: string;
  wholesaleCost: number;      // Amount AbbaKano pays upstream
  sellingPrice: number;       // Amount customer paid
  profitMargin: number;       // sellingPrice - wholesaleCost
  status: TransactionStatus;
  gateway: string;
  timestamp: string;          // ISO 8601
  receiptUrl?: string;
}

// ─── Bank Deposit / Inflow ────────────────────────────────────
export interface InflowRecord {
  id: string;
  customerName: string;
  virtualAccount: string;     // DVA number (e.g. Moniepoint/Wema)
  bankName: string;
  bankRef: string;            // Bank session reference
  amount: number;
  sessionRef: string;
  settledAt: string;          // ISO 8601
  status: InflowStatus;
  resolvedBy?: string;        // Staff name for manual resolution
}

// ─── Provider Balance ─────────────────────────────────────────
export interface ProviderBalance {
  id: string;
  providerName: string;
  carrier: Carrier;
  balance: number;
  status: ProviderStatus;
  estimatedRunwayHours: number;
  lowBalanceThreshold: number;
  lastRefillAt: string;
  refillBankName: string;
  refillAccountNumber: string;
  fundingOptions?: ProviderFundingOption[];
}

export interface ProviderFundingOption {
  id: string;
  name: string;
  fee: string;
  status: string;
  accountNumber: string;
  accountName: string;
  bankName?: string;
}

// ─── Audit Log ────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  staffName: string;
  role: StaffRole;
  action: AuditAction;
  target: string;             // e.g. "Customer: 08031234567" or "MTN Margin"
  details: string;            // Human-readable description
  device: string;             // e.g. "Office Laptop (Kano HQ)"
  ipAddress?: string;
  timestamp: string;
}

// ─── Staff Member ─────────────────────────────────────────────
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  singleCreditLimit: number;  // Max manual credit without dual approval
  dualApprovalThreshold: number;
  status: StaffStatus;
  joinedAt: string;
  lastActiveAt: string;
  permissions: string[];
}

// ─── Margin Settings ──────────────────────────────────────────
export interface MarginSetting {
  carrier: Carrier;
  wholesaleBase: number;      // Cost per GB from upstream (₦)
  smeMargin: number;          // Margin added for SME customers (₦)
  giftingMargin: number;      // Margin added for gifting (₦)
  airtimePercent: number;     // Airtime commission % (0-100)
  isSalesActive: boolean;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

// ─── Customer / User ─────────────────────────────────────────
export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  walletBalance: number;
  totalTransactions: number;
  totalSpent: number;
  status: "ACTIVE" | "BLOCKED";
  joinedAt: string;
  lastTransactionAt: string;
  referralCode: string;
  dvAccount?: string;         // Assigned DVA virtual account
}

// ─── Support Case ─────────────────────────────────────────────
export interface SupportCase {
  id: string;
  ticketRef: string;
  customerName: string;
  customerPhone: string;
  channel: "WHATSAPP" | "EMAIL" | "CALL";
  issue: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignedTo?: string;
  creditAmount?: number;      // If manual credit was issued
  createdAt: string;
  resolvedAt?: string;
}

// ─── System Settings ──────────────────────────────────────────
export interface SystemSettings {
  appMaintenanceMode: boolean;
  maintenanceMessage: string;
  alertPhoneNumbers: string[];
  lowBalanceThresholdNaira: number;
  dualApprovalAmountThreshold: number;
  maxSingleManualCredit: number;
  vtuGatewayPrimary: string;
  vtuGatewayFallback: string;
}

// ─── API Response Wrappers ────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
