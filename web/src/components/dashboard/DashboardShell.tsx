"use client";

export function DashboardLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e14] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="text-xs font-semibold text-slate-400">Loading wallet...</span>
      </div>
    </div>
  );
}



import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DataPurchaseShell } from "@/components/data/DataPurchaseShell";
import { AirtimeShell } from "@/components/airtime/AirtimeShell";
import { HistoryShell } from "@/components/history/HistoryShell";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { CableTVShell } from "@/components/cable/CableTVShell";
import { ElectricityShell } from "@/components/electricity/ElectricityShell";
import { FundWalletShell } from "@/components/funding/FundWalletShell";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { ReferEarnShell } from "@/components/referral/ReferEarnShell";
import { useThemeMode } from "@/lib/theme";

type DashboardData = {
  user: {
    full_name?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    biometrics_enabled?: boolean;
    app_lock_enabled?: boolean;
    has_transaction_pin?: boolean;
    has_passkey?: boolean;
    referralCount?: number;
    referralEarnings?: number;
    referralCommissionBalance?: number;
  };
  balance: number;
  transactions: Array<{
    id?: string | number;
    type?: string;
    label?: string;
    status?: string;
    amount?: number;
    date?: string;
  }>;
};

const VTU_HUB_ITEMS = [
  {
    key: "data",
    title: "Data Bundles",
    subtitle: "SME, Gifting & Corp",
    tab: "bolt",
  },
  {
    key: "airtime",
    title: "Airtime Topup",
    subtitle: "Instant Topup",
    tab: "airtime",
  },
  {
    key: "electricity",
    title: "Electricity",
    subtitle: "AEDC/IKEDC",
    tab: "power",
  },
  {
    key: "cable",
    title: "Cable TV",
    subtitle: "DSTV, GOTV & Star",
    tab: "tv",
  },
];

export function DashboardShell() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [hiddenBalance, setHiddenBalance] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const { theme, toggleTheme } = useThemeMode();
  const [activeTab, setActiveTab] = useState("home");
  const isDark = theme === "dark";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateDashboard() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session) {
          setErrorMessage("Your login session has expired. Please sign in again.");
          return;
        }

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          setErrorMessage("Your login session is not available. Please sign in again.");
          return;
        }

        const [profileResult, walletResult, transactionsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select(`
              full_name,
              phone,
              role,
              status,
              biometrics_enabled,
              app_lock_enabled
            `)
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("wallets")
            .select("balance_kobo, currency")
            .eq("user_id", user.id)
            .maybeSingle(),

          supabase
            .from("wallet_ledger")
            .select(`
              id,
              entry_type,
              amount_kobo,
              balance_before_kobo,
              balance_after_kobo,
              description,
              metadata,
              created_at
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (cancelled) return;

        const profile = profileResult.data;
        const wallet = walletResult.data;

        const transactions = (transactionsResult.data || []).map((transaction) => ({
          id: transaction.id,
          type: transaction.entry_type,
          label: transaction.description || transaction.entry_type,
          status: "completed",
          amount: Number(transaction.amount_kobo) / 100,
          date: new Date(transaction.created_at).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        }));

        setData({
          user: {
            full_name: profile?.full_name || "",
            email: user.email || "",
            phone: profile?.phone || "",
            biometrics_enabled: profile?.biometrics_enabled,
            app_lock_enabled: profile?.app_lock_enabled,
          },
          balance: Number(wallet?.balance_kobo || 0) / 100,
          transactions,
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Dashboard loading error:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load your wallet."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrateDashboard();

    return () => {
      cancelled = true;
    };
  }, [reloadKey, router]);

  useEffect(() => {
    function handleTabChange(event: Event) {
      const tab = (event as CustomEvent<string>).detail;
      if (tab === "data" || tab === "vtu") setActiveTab("bolt");
      else if (tab === "electricity") setActiveTab("power");
      else if (tab === "cable-tv") setActiveTab("tv");
      else if (tab === "fund-wallet") setActiveTab("funding");
      else if (tab === "account") setActiveTab("profile");
      else if (tab === "ledger") setActiveTab("history");
      else setActiveTab(tab);
    }
    window.addEventListener("app-tab-change", handleTabChange);
    return () => window.removeEventListener("app-tab-change", handleTabChange);
  }, []);

  useEffect(() => {
    function refreshDashboard() {
      setReloadKey((current) => current + 1);
    }
    window.addEventListener("dashboard-refresh", refreshDashboard);
    return () => window.removeEventListener("dashboard-refresh", refreshDashboard);
  }, []);

  const firstName =
    data?.user.full_name?.split(" ")[0] ||
    data?.user.fullName?.split(" ")[0] ||
    "Tester";

  const formattedBalance = (data?.balance || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Loading wallet...</span>
        </div>
      </div>
    );
  }

  // Active sub-page views
  if (activeTab === "bolt") return <DataPurchaseShell />;
  if (activeTab === "airtime") return <AirtimeShell />;
  if (activeTab === "power" || activeTab === "electricity") return <ElectricityShell />;
  if (activeTab === "tv" || activeTab === "cable-tv") return <CableTVShell />;
  if (activeTab === "funding" || activeTab === "fund-wallet") return <FundWalletShell />;
  if (activeTab === "history") return <HistoryShell initialTransactions={data?.transactions || []} />;
  if (activeTab === "profile") return <ProfileShell initialUser={data?.user} />;
  if (activeTab === "referral") return <ReferEarnShell initialUser={data?.user} />;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"}`}>
      {/* Persistent Desktop Sidebar */}
      <WebDesktopSidebar
        active="home"
        onNavigate={(tab) => setActiveTab(tab === "data" ? "bolt" : tab)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 w-full max-w-md sm:max-w-lg mx-auto px-4 pt-5 pb-28">
          {/* === 1. WELCOME & TOP ACTION BUTTONS === */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Logo Container */}
              <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border p-1 shadow-xs ${
                isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200"
              }`}>
                <Image
                  src="/branding/logo.png"
                  alt="AbbaKano DataSub"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>

              {/* Welcome Info */}
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Welcome back,
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xl font-extrabold tracking-tight truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                    {firstName}
                  </span>
                  <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-9 3V5a1.5 1.5 0 013 0v4m0-4a1.5 1.5 0 013 0v4m0-4a1.5 1.5 0 013 0v6.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Support Button */}
              <Link
                href="/support"
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? "bg-[#161922] border-[#222634] text-slate-400 hover:text-white"
                    : "bg-[#ebf0f7] border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
                aria-label="Contact Support"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6M3 18a2 2 0 002 2h2v-6H5a2 2 0 00-2 2zm18 0a2 2 0 01-2 2h-2v-6h2a2 2 0 012 2z" />
                </svg>
              </Link>

              {/* Theme Toggler */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                  isDark
                    ? "bg-[#161922] border-[#222634] text-blue-500 hover:text-blue-400"
                    : "bg-[#ebf0f7] border-slate-200 text-blue-600 hover:text-blue-700"
                }`}
                aria-label="Toggle Theme"
              >
                {isDark ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="4" strokeWidth="2" />
                    <path strokeWidth="2" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
                {/* Badge (A / D / L) */}
                <span className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black border ${
                  isDark
                    ? "bg-blue-600/30 border-blue-500 text-blue-400"
                    : "bg-blue-100 border-blue-600 text-blue-600"
                }`}>
                  {isDark ? "D" : "L"}
                </span>
              </button>
            </div>
          </div>

          {/* === 2. MASTER WALLET CARD === */}
          <div className={`rounded-2xl border p-4.5 sm:p-5 mb-5 shadow-xs transition-all ${
            isDark
              ? "bg-[#141721] border-[#222634]"
              : "bg-gradient-to-br from-[#FFFFFF] via-[#F0F5FF] to-[#E4EDFD] border-[rgba(37,99,235,0.16)] shadow-[0_4px_12px_rgba(37,99,235,0.08)]"
          }`}>
            {/* Header: Label + Instant Active */}
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                WALLET BALANCE
              </span>

              <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                isDark
                  ? "bg-[#083321] border-[#105436] text-[#10b981]"
                  : "bg-[#d1fae5] border-[#a7f3d0] text-[#059669]"
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Instant Active</span>
              </div>
            </div>

            {/* Balance Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-baseline">
                <span className={`text-2xl font-extrabold mr-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                  ₦
                </span>
                <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  {hiddenBalance ? "••••••••" : formattedBalance}
                </span>
              </div>

              {/* Eye Button */}
              <button
                type="button"
                onClick={() => setHiddenBalance((curr) => !curr)}
                className={`p-1.5 transition-colors cursor-pointer ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
                aria-label={hiddenBalance ? "Show balance" : "Hide balance"}
              >
                {hiddenBalance ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Wallet Actions (2 Buttons) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Fund Wallet */}
              <button
                type="button"
                onClick={() => setActiveTab("funding")}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-3 text-xs sm:text-sm font-bold text-white shadow-xs transition-opacity hover:opacity-90 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Fund Wallet</span>
              </button>

              {/* Instant Sub */}
              <button
                type="button"
                onClick={() => setActiveTab("bolt")}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-bold transition-colors active:scale-95 cursor-pointer whitespace-nowrap ${
                  isDark
                    ? "bg-[#1a2236] border-[#1e293b] text-blue-500 hover:bg-[#202b44]"
                    : "bg-[#dbeafe] border-blue-200 text-[#2563EB] hover:bg-blue-100"
                }`}
              >
                <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Instant Sub</span>
              </button>
            </div>
          </div>

          {/* === 3. VTU HUB (2x2 GRID) === */}
          <div className="mb-5">
            {/* Header: VTU Hub + Services */}
            <div className="flex items-baseline justify-between mb-3">
              <h2 className={`text-base sm:text-lg font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                VTU Hub
              </h2>
              <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Services
              </span>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {VTU_HUB_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.tab)}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all active:scale-95 cursor-pointer min-h-[105px] ${
                    isDark
                      ? "bg-[#141721] border-[#222634] hover:border-slate-700"
                      : "bg-white border-slate-200 hover:border-blue-300 shadow-2xs"
                  }`}
                >
                  {/* Icon Box */}
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-2.5 ${
                    isDark ? "bg-[rgba(37,99,235,0.12)] text-blue-500" : "bg-[#eff6ff] text-blue-600"
                  }`}>
                    {item.key === "data" && (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.343 9.343c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                    )}
                    {item.key === "airtime" && (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    )}
                    {item.key === "electricity" && (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="7" strokeWidth="2" />
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 10V7l-3 4h2v3l3-4h-2z" />
                      </svg>
                    )}
                    {item.key === "cable" && (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="3" y="7" width="18" height="13" rx="2" strokeWidth="2" />
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 3l-4 4-4-4" />
                      </svg>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <span className={`text-xs sm:text-sm font-bold mb-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>
                    {item.title}
                  </span>
                  <span className={`text-[11px] leading-tight ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {item.subtitle}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* === 4. 24/7 RESOLUTION DESK ROW === */}
          <div className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 mb-5 ${
            isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200 shadow-2xs"
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              {/* Green Icon Box */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(0,208,132,0.12)] text-[#00d084]">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>

              {/* Title & Subtitle */}
              <div className="flex flex-col min-w-0">
                <span className={`text-xs sm:text-sm font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                  24/7 Resolution Desk
                </span>
                <span className={`text-[11px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  WhatsApp, Phone Calls &amp; Email Support
                </span>
              </div>
            </div>

            {/* Amber Help Button */}
            <a
              href="https://wa.me/2348133339850?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20with%20my%20account."
              target="_blank"
              rel="noreferrer"
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#d97706] hover:bg-[#b45309] px-4 text-xs sm:text-sm font-bold text-white shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 18v-6a9 9 0 0118 0v6M3 18a2 2 0 002 2h2v-6H5a2 2 0 00-2 2zm18 0a2 2 0 01-2 2h-2v-6h2a2 2 0 012 2z" />
              </svg>
              <span>Help</span>
            </a>
          </div>
        </main>
      </div>

      {/* === 5. BOTTOM NAVIGATION BAR === */}
      <WebBottomNav
        active="home"
        onNavigate={(tab) => {
          if (tab === "data") setActiveTab("bolt");
          else setActiveTab(tab);
        }}
      />
    </div>
  );
}
