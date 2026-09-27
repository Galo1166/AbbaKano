# AbbaKano Admin Console — Backend Integration Guide & API Specification
**Version:** 2.4.0  
**Target Environment:** Node.js / Express / NestJS / FastAPI / Django / Go  
**Client Protocol:** RESTful JSON over HTTPS (TLS 1.3)  
**Authentication Standard:** Bearer JWT (Access Token + Refresh Token)

---

## 1. Executive Summary & Architecture

The **AbbaKano Admin Console** is a Next.js (App Router), TypeScript, and Tailwind CSS administrative portal designed for high-velocity telecom aggregators (VTU), virtual account reconciliation, and reseller management.

All frontend network calls are encapsulated inside [`app/services/api.ts`](file:///c:/Users/LENOVO/abbakano_admin_panel/app/services/api.ts). The frontend components expect structured, type-safe data models defined in [`app/types/telecom.ts`](file:///c:/Users/LENOVO/abbakano_admin_panel/app/types/telecom.ts).

```
┌─────────────────────────────────┐       HTTPS / JSON       ┌─────────────────────────────────┐
│     AbbaKano Admin Frontend     │ ───────────────────────> │      AbbaKano Core Backend      │
│  (Next.js App Router / React)   │ <─────────────────────── │   (Node / Go / Python / Java)   │
└─────────────────────────────────┘   Bearer JWT Auth Header └─────────────────────────────────┘
                                                                        │
                                                     ┌──────────────────┴──────────────────┐
                                                     ▼                                     ▼
                                          [PostgreSQL / MySQL]                  [Telecom Gateways]
                                          • Reseller Wallets                     • MTN / Airtel / Glo / 9mobile
                                          • Bank Inflow Ledger                   • Bank Virtual Account Webhooks
```

---

## 2. Environment Configuration

To connect the frontend to your live backend server, add or update `.env.local` in the frontend root:

```env
# URL where your backend API is hosted
NEXT_PUBLIC_API_BASE_URL=https://api.abbakano.ng/api/v1

# Optional: set to "false" once live backend endpoints are active
NEXT_PUBLIC_USE_MOCK=false
```

When `NEXT_PUBLIC_API_BASE_URL` is set, `services/api.ts` dispatches requests to this base URL. If unset, it gracefully uses the realistic mock model suite for offline UI verification.

---

## 3. Global Request & Response Envelope

### Standard Request Headers
Every authenticated request dispatched by the frontend includes:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
Accept: application/json
X-AbbaKano-Client: AdminConsole/2.4
```

### Standard Response Envelope (`ApiResponse<T>`)
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "timestamp": "2026-09-26T15:00:00.000Z"
}
```

### Standard Paginated Envelope (`PaginatedResponse<T>`)
```json
{
  "data": [ ... ],
  "total": 14890,
  "page": 1,
  "pageSize": 20,
  "hasNextPage": true
}
```

### Standard Error Envelope
> **Security Requirement:** Never return raw stack traces, database schema details, or SQL queries in the error response. Always return clean, human-readable error messages.

```json
{
  "success": false,
  "error": "The requested transaction reference does not exist.",
  "code": "RESOURCE_NOT_FOUND",
  "timestamp": "2026-09-26T15:00:00.000Z"
}
```

---

## 4. Authentication & Authorization (Superadmin Only)

### `POST /api/v1/auth/login`
Authenticates the Super Administrator. The frontend accepts `email` and `password`.

#### Request Body
```json
{
  "email": "admin@abbakano.ng",
  "password": "Admin@AbbaKano2026!"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "d8f92a10-4c31-4e89-82a1-09...",
    "expiresIn": 86400,
    "user": {
      "id": "superadmin_01",
      "name": "Abba Kano",
      "email": "admin@abbakano.ng",
      "role": "SUPER_ADMIN"
    }
  },
  "timestamp": "2026-09-26T15:00:00.000Z"
}
```

#### Error Response (`401 Unauthorized`)
```json
{
  "success": false,
  "error": "Invalid administrator credentials or unauthorized workstation.",
  "code": "INVALID_CREDENTIALS",
  "timestamp": "2026-09-26T15:00:00.000Z"
}
```

---

## 5. Endpoints Reference & Payloads

### 5.1 Dashboard Overview (`GET /api/v1/dashboard/overview`)
Provides aggregate statistics for the executive dashboard.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "totalVolumeToday": 3254900,
    "netMarginToday": 248600,
    "activeUsers": 1248,
    "totalUsers": 14890,
    "newUsersToday": 84,
    "vtuProviderBalance": 1420500,
    "depositsToday": 4850200,
    "inflowsCount": 412,
    "successRate": 99.2,
    "ordersToday": 3140,
    "carrierBreakdown": {
      "MTN": { "percentage": 52, "amount": 2034060 },
      "AIRTEL": { "percentage": 26, "amount": 1017030 },
      "GLO": { "percentage": 14, "amount": 547970 },
      "9MOBILE": { "percentage": 8, "amount": 312960 }
    }
  }
}
```

---

### 5.2 Reseller Accounts (`/api/v1/customers`)

- `GET /api/v1/customers?page=1&pageSize=20&search=0803...&status=ACTIVE`
- `POST /api/v1/customers/:id/status` (Toggle `ACTIVE` or `BLOCKED`)

#### Reseller Object Schema (`CustomerUser`)
```json
{
  "id": "cust_101",
  "name": "Ibrahim Danbatta",
  "phone": "08031234567",
  "email": "danbatta@gmail.com",
  "walletBalance": 84500.00,
  "virtualAccount": "9901847291",
  "bankName": "Moniepoint",
  "status": "ACTIVE",
  "tier": "TIER_2_RESELLER",
  "totalVolume": 1450200.00,
  "lastActiveAt": "2026-09-26T14:45:00.000Z",
  "createdAt": "2025-11-12T09:30:00.000Z"
}
```
> **Notice:** There is **no KYC status**. Status values are strictly `"ACTIVE" | "BLOCKED"`.

---

### 5.3 Virtual Accounts & Bank Deposits (`/api/v1/inflows`)

- `GET /api/v1/inflows?page=1&pageSize=20&status=SETTLED&bank=Moniepoint`
- `POST /api/v1/inflows/:id/resolve` (Manual phone number match for unmatched inflows)

#### Inflow Record Schema (`InflowRecord`)
```json
{
  "id": "inf_001",
  "customerName": "Usman Garba",
  "virtualAccount": "8120491823",
  "bankName": "Moniepoint",
  "bankRef": "MNFY|20260925|849102",
  "amount": 25000.00,
  "sessionRef": "sess_9901827361",
  "settledAt": "2026-09-26T14:52:10.000Z",
  "status": "SETTLED",
  "resolvedBy": null
}
```
**Status Options:** `"SETTLED" | "PENDING_SETTLEMENT" | "UNMATCHED" | "MANUAL_RESOLVED"`

---

### 5.4 Transactions Master Ledger (`/api/v1/transactions`)

- `GET /api/v1/transactions?page=1&pageSize=20&carrier=MTN&status=SUCCESS&search=080...`
- `POST /api/v1/transactions/:id/retry`

#### Transaction Schema (`Transaction`)
```json
{
  "id": "tx_90182",
  "reference": "VTU-MTN-20260925-0012",
  "customerPhone": "08031234567",
  "customerName": "Ibrahim Danbatta",
  "carrier": "MTN",
  "serviceType": "DATA_BUNDLE",
  "plan": "MTN 1GB SME Data (30 Days)",
  "wholesaleCost": 235.00,
  "sellingPrice": 250.00,
  "profitMargin": 15.00,
  "status": "SUCCESS",
  "gateway": "SIMSERVER_POOL_A",
  "timestamp": "2026-09-26T14:48:22.000Z",
  "receiptUrl": "/receipts/VTU-MTN-20260925-0012.pdf"
}
```

---

### 5.5 Carrier Routing & VTU Gateways (`/api/v1/vtu/routes`)

- `GET /api/v1/vtu/routes`
- `PUT /api/v1/vtu/routes/:id/toggle` (Toggle route between `ACTIVE` and `MAINTENANCE`)

#### Route Object
```json
{
  "id": "route_mtn_sme",
  "carrier": "MTN",
  "pipelineName": "MTN SME Enterprise Link",
  "primaryGateway": "SIMSERVER_NODE_01",
  "secondaryGateway": "DIRECT_VTU_API",
  "isSalesActive": true,
  "currentLatencyMs": 28,
  "successRate": 99.4
}
```

---

### 5.6 Provider Balances & Refills (`/api/v1/providers`)

- `GET /api/v1/providers`
- `POST /api/v1/providers/:id/refill` (Generates dedicated settlement bank details)

#### Refill Request Payload
```json
{
  "amount": 500000.00
}
```

#### Refill Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "transferRef": "TRF84910284",
    "carrier": "MTN",
    "providerName": "MTN Airtime Pool Alpha",
    "refillBankName": "Access Bank",
    "refillAccountNumber": "0128472910",
    "amount": 500000.00
  }
}
```

---

### 5.7 Support Cases & Customer Wallet Credits (`/api/v1/support`)

- `GET /api/v1/support/cases`
- `POST /api/v1/support/cases/:id/credit`

#### Manual Wallet Credit Request Payload
```json
{
  "customerId": "cust_101",
  "amount": 5000.00,
  "reason": "Failed MTN 10GB bundle delivery - upstream carrier timeout",
  "approvedBy": "Abba Kano"
}
```

#### Dual Authorization Requirement
- Any credit amount **≤ ₦50,000.00** can be approved directly by Support Agents.
- Any credit amount **> ₦50,000.00** requires confirmation by a **SUPER_ADMIN**.
- The backend should reject any single credit transaction **> ₦500,000.00** as a hard safety ceiling.

---

### 5.8 System Settings & Wholesale Margins (`/api/v1/settings`)

- `GET /api/v1/settings/margins`
- `PUT /api/v1/settings/margins`
- `GET /api/v1/settings/system`
- `PUT /api/v1/settings/system`

#### Margin Setting Object
```json
{
  "carrier": "MTN",
  "wholesaleBase": 230.00,
  "smeMargin": 20.00,
  "giftingMargin": 35.00,
  "airtimePercent": 2.5,
  "isSalesActive": true,
  "lastUpdatedBy": "Amina Yusuf"
}
```

#### System Settings Object
```json
{
  "appMaintenanceMode": false,
  "maintenanceMessage": "System maintenance in progress. Deliveries will resume shortly.",
  "lowBalanceThresholdNaira": 100000.00,
  "dualApprovalAmountThreshold": 50000.00,
  "alertPhoneNumbers": ["08031234567", "08099887766"]
}
```

---

### 5.9 Audit Trail (`/api/v1/audit-logs`)

- `GET /api/v1/audit-logs?page=1&pageSize=30`

#### Audit Log Record
```json
{
  "id": "log_001",
  "staffName": "Abba Kano",
  "role": "SUPER_ADMIN",
  "action": "MANUAL_WALLET_CREDIT",
  "details": "Credited ₦5,000.00 to Usman Garba (08031234567)",
  "ipAddress": "102.89.44.18",
  "device": "Chrome on Windows",
  "timestamp": "2026-09-26T14:30:15.000Z"
}
```

---

## 6. Defensive Security & Webhook Best Practices

### 6.1 Bank Webhook Signature Verification (Moniepoint / Wema / Providus)
All incoming bank deposit webhooks must verify the HMAC SHA-256 signature in the header before updating user wallets:

```typescript
import crypto from "crypto";

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
```

### 6.2 Idempotency on Credit Operations
Every wallet credit and provider refill must include an idempotency key (such as `bankRef` or `sessionRef`) in a `UNIQUE` database constraint to prevent duplicate balance additions from network retries.

### 6.3 Input Validation Rules
- **Phone Numbers:** Nigerian MSISDN format `^(\+234|0)[789][01]\d{8}$`
- **Amounts:** Must be strictly positive numbers (`> 0`). Reject negative numbers and `NaN`.
- **Wholesale Margins:** Must be positive (`>= 0`).

---

## 7. Quick Start Checklist for Backend Developer

1. [ ] Configure CORS to allow `http://localhost:3000` and your production admin domain.
2. [ ] Implement `POST /api/v1/auth/login` returning JWT access token with `SUPER_ADMIN` role check.
3. [ ] Set `NEXT_PUBLIC_API_BASE_URL` in the frontend `.env.local` to point to your backend.
4. [ ] Run `npm run dev` in the frontend and test the live login flow.
5. [ ] Connect remaining endpoints following the request/response payloads in Section 5.
