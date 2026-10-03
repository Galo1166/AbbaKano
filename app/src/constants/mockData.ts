import { SCREEN_ASSETS } from "../../assets/screenAssets";
import { TelcoNetworkId } from "./telco";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  kycTier: "Tier 1" | "Tier 2" | "Tier 3";
  tierLabel: string;
  agentDiscount: number; // percentage
  referralCode: string;
  referralCount: number;
  referralEarnings: number;
  notificationCount: number;
  avatarUrl: string;
}

export interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  logoColor?: string;
  feeInfo?: string;
  recommended?: boolean;
}

export interface DataPlan {
  id: string;
  network: TelcoNetworkId;
  type: "SME" | "CORPORATE" | "DIRECT";
  dataAmount: string;
  validity: string;
  price: number;
  resellerDiscount: number;
}

export interface UtilityBiller {
  id: string;
  category: "ELECTRICITY" | "CABLE_TV" | "EDUCATION";
  name: string;
  code: string;
  logo?: any;
  brandColor?: string;
  packages?: { id: string; name: string; price: number }[];
}

export type TransactionStatus = "SUCCESSFUL" | "PENDING" | "FAILED";
export type TransactionType =
  | "DATA"
  | "AIRTIME"
  | "ELECTRICITY"
  | "CABLE_TV"
  | "FUND_WALLET";

export interface TransactionRecord {
  id: string;
  reference: string;
  type: TransactionType;
  title: string;
  description: string;
  amount: number;
  fee: number;
  status: TransactionStatus;
  date: string;
  timestamp: number;
  network?: TelcoNetworkId;
  recipient: string;
  billerName?: string;
  token?: string; // e.g. for electricity or exam pin
  units?: string;
}

export interface KycTierInfo {
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  title: string;
  dailyLimit: string;
  maxWalletBalance: string;
  virtualAccounts: boolean;
  status: "active" | "pending" | "locked";
  requirements: string[];
}

export const MOCK_USER: UserProfile = {
  id: "USR-803499",
  name: "Spectre Techie",
  email: "sadiqibraheem43@gmail.com",
  phone: "+234 803 459 2811",
  kycTier: "Tier 2",
  tierLabel: "VIP RESELLER",
  agentDiscount: 2.5,
  referralCode: "08034592811",
  referralCount: 18,
  referralEarnings: 3600,
  notificationCount: 2,
  avatarUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAQGzGuMlukEu7Y1WXBP9MeUgeFjuWx1xNaT6IuGbjFV4Sv3vJSZ4NsJaDU4J3Mh20ULxuZ3MhJQjs8odVBnUs9Zch7nvsHNYT3rmsGLaMObMpqru1cRHQsqh_wnLvBPy55wlvA8_fm9Y1c62guuBWqv1ejjq-FM0vgEWBwN7KGQCbNKvXVD1VXTWH2TAfz-YxhsdkvujbwtkcS209czQc8CMPfQ6RTxYiKIalDkwYp3LdtQKNqEwnURw",
};

export const MOCK_VIRTUAL_ACCOUNTS: VirtualAccount[] = [
  {
    bankName: "Moniepoint MFB",
    accountNumber: "8034 991 240",
    accountName: "AbbaKano - Usman Bello",
    feeInfo: "0% > ₦2,000 • Bank transfers reflect within 15–30 seconds",
    recommended: true,
  },
  {
    bankName: "Wema Bank / ALAT",
    accountNumber: "0284 119 552",
    accountName: "AbbaKano - Usman Bello",
    feeInfo: "Backup Virtual Desk • Instant auto-credit reflect (< 30s)",
  },
];

export const MOCK_DATA_PLANS: DataPlan[] = [
  // MTN SME (exact Stitch prices)
  {
    id: "mtn-sme-1gb",
    network: "MTN",
    type: "SME",
    dataAmount: "1.0 GB",
    validity: "30 Days",
    price: 260,
    resellerDiscount: 10,
  },
  {
    id: "mtn-sme-2gb",
    network: "MTN",
    type: "SME",
    dataAmount: "2.0 GB",
    validity: "30 Days",
    price: 520,
    resellerDiscount: 15,
  },
  {
    id: "mtn-sme-5gb",
    network: "MTN",
    type: "SME",
    dataAmount: "5.0 GB",
    validity: "30 Days",
    price: 1300,
    resellerDiscount: 30,
  },
  {
    id: "mtn-sme-10gb",
    network: "MTN",
    type: "SME",
    dataAmount: "10.0 GB",
    validity: "30 Days",
    price: 2600,
    resellerDiscount: 60,
  },
  // MTN Corporate Gifting
  {
    id: "mtn-corp-5gb",
    network: "MTN",
    type: "CORPORATE",
    dataAmount: "5.0 GB Corporate Gifting",
    validity: "30 Days",
    price: 1250,
    resellerDiscount: 30,
  },
  {
    id: "mtn-corp-10gb",
    network: "MTN",
    type: "CORPORATE",
    dataAmount: "10.0 GB Corporate Gifting",
    validity: "30 Days",
    price: 2500,
    resellerDiscount: 60,
  },
  // MTN Direct
  {
    id: "mtn-direct-2gb",
    network: "MTN",
    type: "DIRECT",
    dataAmount: "2.5 GB",
    validity: "30 Days",
    price: 590,
    resellerDiscount: 10,
  },
  // Airtel SME
  {
    id: "airtel-sme-1gb",
    network: "AIRTEL",
    type: "SME",
    dataAmount: "1.0 GB SME",
    validity: "30 Days",
    price: 270,
    resellerDiscount: 5,
  },
  {
    id: "airtel-sme-2gb",
    network: "AIRTEL",
    type: "SME",
    dataAmount: "2.0 GB SME",
    validity: "30 Days",
    price: 540,
    resellerDiscount: 10,
  },
  {
    id: "airtel-direct-1gb",
    network: "AIRTEL",
    type: "DIRECT",
    dataAmount: "1.0 GB Direct",
    validity: "30 Days",
    price: 300,
    resellerDiscount: 0,
  },
  {
    id: "airtel-sme-5gb",
    network: "AIRTEL",
    type: "SME",
    dataAmount: "5.0 GB SME",
    validity: "30 Days",
    price: 1350,
    resellerDiscount: 25,
  },
  // Glo Data
  {
    id: "glo-sme-1gb",
    network: "GLO",
    type: "SME",
    dataAmount: "1.0 GB Special",
    validity: "30 Days",
    price: 250,
    resellerDiscount: 10,
  },
  {
    id: "glo-sme-2gb",
    network: "GLO",
    type: "SME",
    dataAmount: "2.0 GB Special",
    validity: "30 Days",
    price: 500,
    resellerDiscount: 20,
  },
  {
    id: "glo-sme-5gb",
    network: "GLO",
    type: "SME",
    dataAmount: "5.0 GB Special",
    validity: "30 Days",
    price: 1250,
    resellerDiscount: 50,
  },
  // 9mobile Data
  {
    id: "9mob-sme-1gb",
    network: "9MOBILE",
    type: "SME",
    dataAmount: "1.0 GB SME",
    validity: "30 Days",
    price: 240,
    resellerDiscount: 10,
  },
  {
    id: "9mob-sme-2gb",
    network: "9MOBILE",
    type: "SME",
    dataAmount: "2.0 GB SME",
    validity: "30 Days",
    price: 480,
    resellerDiscount: 20,
  },
  {
    id: "9mob-sme-5gb",
    network: "9MOBILE",
    type: "SME",
    dataAmount: "5.0 GB SME",
    validity: "30 Days",
    price: 1200,
    resellerDiscount: 50,
  },
];

export const MOCK_ELECTRICITY_DISCOS: UtilityBiller[] = [
  {
    id: "kedco",
    category: "ELECTRICITY",
    name: "KEDCO (Kano Electricity)",
    code: "KEDCO",
  },
  {
    id: "ikedc",
    category: "ELECTRICITY",
    name: "IKEDC (Ikeja Electric)",
    code: "IKEDC",
  },
  {
    id: "ekedc",
    category: "ELECTRICITY",
    name: "EKEDC (Eko Electric)",
    code: "EKEDC",
  },
  {
    id: "aedc",
    category: "ELECTRICITY",
    name: "AEDC (Abuja Electricity)",
    code: "AEDC",
  },
  {
    id: "ibedc",
    category: "ELECTRICITY",
    name: "IBEDC (Ibadan Electricity)",
    code: "IBEDC",
  },
  {
    id: "eedc",
    category: "ELECTRICITY",
    name: "EEDC (Enugu Electricity)",
    code: "EEDC",
  },
  {
    id: "phed",
    category: "ELECTRICITY",
    name: "PHED (Port Harcourt Electric)",
    code: "PHED",
  },
  {
    id: "jed",
    category: "ELECTRICITY",
    name: "JED (Jos Electricity)",
    code: "JED",
  },
  {
    id: "kaedco",
    category: "ELECTRICITY",
    name: "KAEDCO (Kaduna Electric)",
    code: "KAEDCO",
  },
];

export const MOCK_CABLE_PROVIDERS: UtilityBiller[] = [
  {
    id: "dstv",
    category: "CABLE_TV",
    name: "DStv Subscription",
    code: "DSTV",
    logo: SCREEN_ASSETS.dstvLogo,
    brandColor: "#00A3E0",
    packages: [
      { id: "dstv-padi", name: "DStv Padi", price: 3600 },
      { id: "dstv-yanga", name: "DStv Yanga", price: 5100 },
      { id: "dstv-confam", name: "DStv Confam", price: 9300 },
      { id: "dstv-compact", name: "DStv Compact", price: 15700 },
      { id: "dstv-compact-plus", name: "DStv Compact Plus", price: 25000 },
      { id: "dstv-premium", name: "DStv Premium", price: 37000 },
    ],
  },
  {
    id: "gotv",
    category: "CABLE_TV",
    name: "GOtv Subscription",
    code: "GOTV",
    logo: SCREEN_ASSETS.gotvLogo,
    brandColor: "#00833E",
    packages: [
      { id: "gotv-smallie", name: "GOtv Smallie (Monthly)", price: 1575 },
      { id: "gotv-jinja", name: "GOtv Jinja", price: 3300 },
      { id: "gotv-jolli", name: "GOtv Jolli", price: 4850 },
      { id: "gotv-max", name: "GOtv Max", price: 7200 },
      { id: "gotv-supa", name: "GOtv Supa", price: 9600 },
      { id: "gotv-supa-plus", name: "GOtv Supa Plus", price: 15700 },
    ],
  },
  {
    id: "startimes",
    category: "CABLE_TV",
    name: "StarTimes Subscription",
    code: "STARTIMES",
    logo: SCREEN_ASSETS.startimesLogo,
    brandColor: "#FF6F00",
    packages: [
      { id: "star-nova", name: "StarTimes Nova", price: 1700 },
      { id: "star-basic", name: "StarTimes Basic", price: 3300 },
      { id: "star-smart", name: "StarTimes Smart", price: 4200 },
      { id: "star-classic", name: "StarTimes Classic", price: 5000 },
      { id: "star-super", name: "StarTimes Super", price: 7500 },
    ],
  },
];

export const MOCK_TRANSACTIONS: TransactionRecord[] = [
  // TODAY, 25 FEB
  {
    id: "tx-001",
    reference: "ABK-DATA-0225001",
    type: "DATA",
    title: "MTN 5.0GB Data Bundle",
    description: "0803 459 2811",
    amount: 1300,
    fee: 0,
    status: "SUCCESSFUL",
    date: "Today, 25 Feb • 14:22",
    timestamp: Date.now() - 3600000,
    network: "MTN",
    recipient: "0803 459 2811",
  },
  {
    id: "tx-002",
    reference: "ABK-FUND-0225002",
    type: "FUND_WALLET",
    title: "Wallet Top-Up",
    description: "Via Moniepoint Transfer",
    amount: 5000,
    fee: 0,
    status: "SUCCESSFUL",
    date: "Today, 25 Feb • 10:04",
    timestamp: Date.now() - 21600000,
    recipient: "Moniepoint 8034 991 240",
  },
  // YESTERDAY, 24 FEB
  {
    id: "tx-003",
    reference: "ABK-DATA-0224003",
    type: "DATA",
    title: "Airtel 2.0GB Data",
    description: "0902 118 7644",
    amount: 550,
    fee: 0,
    status: "SUCCESSFUL",
    date: "Yesterday, 24 Feb • 19:45",
    timestamp: Date.now() - 86400000,
    network: "AIRTEL",
    recipient: "0902 118 7644",
  },
  {
    id: "tx-004",
    reference: "ABK-ELEC-0224004",
    type: "ELECTRICITY",
    title: "Ikeja Electric Prepaid",
    description: "Token: 4491-0923-8821",
    amount: 3000,
    fee: 0,
    status: "SUCCESSFUL",
    date: "Yesterday, 24 Feb • 12:18",
    timestamp: Date.now() - 100800000,
    recipient: "0142 8839 201",
    billerName: "IKEDC (Ikeja Electric)",
    token: "4491-0923-8821",
    units: "~40.8 kWh",
  },
  // Earlier Feb 2025 transactions (to make outflow ₦18,450 / 28 debits, inflow ₦25,000 / 5 deposits)
  {
    id: "tx-005",
    reference: "ABK-DATA-0223005",
    type: "DATA",
    title: "MTN 2.0GB SME Data",
    description: "0814 892 0142",
    amount: 520,
    fee: 0,
    status: "SUCCESSFUL",
    date: "23 Feb • 11:24",
    timestamp: Date.now() - 172800000,
    network: "MTN",
    recipient: "0814 892 0142",
  },
  {
    id: "tx-006",
    reference: "ABK-FUND-0222006",
    type: "FUND_WALLET",
    title: "Wallet Top-Up",
    description: "Via Moniepoint Transfer",
    amount: 8000,
    fee: 0,
    status: "SUCCESSFUL",
    date: "22 Feb • 09:10",
    timestamp: Date.now() - 259200000,
    recipient: "Moniepoint 8034 991 240",
  },
  {
    id: "tx-007",
    reference: "ABK-DATA-0222007",
    type: "DATA",
    title: "Airtel 1GB Direct Data",
    description: "0902 341 8899",
    amount: 300,
    fee: 0,
    status: "SUCCESSFUL",
    date: "22 Feb • 16:31",
    timestamp: Date.now() - 280000000,
    network: "AIRTEL",
    recipient: "0902 341 8899",
  },
  {
    id: "tx-008",
    reference: "ABK-DATA-0221008",
    type: "DATA",
    title: "Glo 2.0GB Special",
    description: "0805 543 2211",
    amount: 500,
    fee: 0,
    status: "SUCCESSFUL",
    date: "21 Feb • 14:55",
    timestamp: Date.now() - 345600000,
    network: "GLO",
    recipient: "0805 543 2211",
  },
  {
    id: "tx-009",
    reference: "ABK-DATA-0220009",
    type: "DATA",
    title: "MTN 5.0GB SME Data",
    description: "0803 459 2811",
    amount: 1300,
    fee: 0,
    status: "SUCCESSFUL",
    date: "20 Feb • 10:03",
    timestamp: Date.now() - 432000000,
    network: "MTN",
    recipient: "0803 459 2811",
  },
  {
    id: "tx-010",
    reference: "ABK-FUND-0220010",
    type: "FUND_WALLET",
    title: "Wallet Top-Up",
    description: "Via Moniepoint Transfer",
    amount: 5000,
    fee: 0,
    status: "SUCCESSFUL",
    date: "20 Feb • 08:45",
    timestamp: Date.now() - 450000000,
    recipient: "Moniepoint 8034 991 240",
  },
  {
    id: "tx-011",
    reference: "ABK-ELEC-0219011",
    type: "ELECTRICITY",
    title: "IKEDC Electricity Token",
    description: "Meter: 0142 8839 201",
    amount: 5000,
    fee: 0,
    status: "SUCCESSFUL",
    date: "19 Feb • 14:22",
    timestamp: Date.now() - 518400000,
    recipient: "0142 8839 201",
    billerName: "IKEDC (Ikeja Electric)",
    token: "3312-8847-1209-0019",
    units: "~68.4 kWh",
  },
  {
    id: "tx-012",
    reference: "ABK-DATA-0218012",
    type: "DATA",
    title: "MTN 10.0GB SME Data",
    description: "0814 892 0142",
    amount: 2600,
    fee: 0,
    status: "SUCCESSFUL",
    date: "18 Feb • 09:11",
    timestamp: Date.now() - 604800000,
    network: "MTN",
    recipient: "0814 892 0142",
  },
  {
    id: "tx-013",
    reference: "ABK-FUND-0215013",
    type: "FUND_WALLET",
    title: "Wallet Top-Up",
    description: "Via Wema Bank Transfer",
    amount: 7000,
    fee: 0,
    status: "SUCCESSFUL",
    date: "15 Feb • 11:30",
    timestamp: Date.now() - 864000000,
    recipient: "Wema 0284 119 552",
  },
];

export const MOCK_KYC_TIERS: KycTierInfo[] = [
  {
    tier: "Tier 1",
    title: "Basic Starter",
    dailyLimit: "₦50,000 / day",
    maxWalletBalance: "₦100,000",
    virtualAccounts: false,
    status: "active",
    requirements: [
      "Phone number verified",
      "Email confirmation",
      "Full name as per bank",
    ],
  },
  {
    tier: "Tier 2",
    title: "Verified Agent (Current)",
    dailyLimit: "₦500,000 / day",
    maxWalletBalance: "₦2,000,000",
    virtualAccounts: true,
    status: "active",
    requirements: [
      "Verified BVN / NIN",
      "Automated Dedicated Virtual Bank Accounts",
      "2.5% Reseller discount enabled",
    ],
  },
  {
    tier: "Tier 3",
    title: "VIP Master Distributor",
    dailyLimit: "Unlimited",
    maxWalletBalance: "Unlimited",
    virtualAccounts: true,
    status: "pending",
    requirements: [
      "CAC Business Certificate",
      "Proof of Utility Address",
      "Direct Telco API key & Sub-agent Portal",
    ],
  },
];
