"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { useThemeMode } from "@/lib/theme";

interface VirtualAccountItem {
  bankName: string;
  accountNumber: string;
  accountName: string;
  brandColor: string;
  badgeText: string;
  subLabel: string;
  iconType: "moniepoint" | "sterling" | "wema";
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export function FundWalletShell() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [userName, setUserName] = useState("Customer");
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [gatewayExpanded, setGatewayExpanded] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<VirtualAccountItem[]>([]);

  function goHome() {
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    } else {
      router.push("/app");
    }
  }

  useEffect(() => {
    async function loadUserDataAndAccounts() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch profile for user name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        const name = profile?.full_name || user.email?.split("@")[0] || "Customer";
        setUserName(name);

        // Fetch user dedicated virtual accounts from database
        const { data: dbAccounts, error } = await supabase
          .from("virtual_accounts")
          .select("*")
          .eq("user_id", user.id);

        if (!error && dbAccounts && dbAccounts.length > 0) {
          const mapped: VirtualAccountItem[] = dbAccounts.map((acc: any) => {
            const isMoniepoint = /moniepoint/i.test(acc.bank_name || acc.bankName || "");
            const isSterling = /sterling/i.test(acc.bank_name || acc.bankName || "");
            return {
              bankName: acc.bank_name || acc.bankName || "Moniepoint MFB",
              accountNumber: acc.account_number || acc.accountNumber || "8034 991 240",
              accountName: acc.account_name || acc.accountName || `AbbaKano - ${name}`,
              brandColor: isMoniepoint ? "#0047cc" : isSterling ? "#d32f2f" : "#93186c",
              badgeText: isMoniepoint ? "Fastest • Recommended" : isSterling ? "Monnify Dedicated" : "Backup Desk",
              subLabel: isMoniepoint ? "Automated Virtual Gateway • ~15s" : isSterling ? "Monnify Dedicated Reserve Desk" : "Automated Virtual Desk • Instant",
              iconType: isMoniepoint ? "moniepoint" : isSterling ? "sterling" : "wema",
            };
          });
          setAccounts(mapped);
        } else {
          // Monnify 3-Bank Engine default structure matching mobile app FundWalletView.tsx
          setAccounts([
            {
              bankName: "Moniepoint MFB",
              accountNumber: "8034 991 240",
              accountName: `AbbaKano - ${name}`,
              brandColor: "#0047cc",
              badgeText: "Fastest • Recommended",
              subLabel: "Automated Virtual Gateway • ~15s",
              iconType: "moniepoint",
            },
            {
              bankName: "Sterling Bank",
              accountNumber: "9012 384 551",
              accountName: `AbbaKano - ${name}`,
              brandColor: "#d32f2f",
              badgeText: "Monnify Dedicated",
              subLabel: "Monnify Dedicated Reserve Desk",
              iconType: "sterling",
            },
            {
              bankName: "Wema Bank",
              accountNumber: "0129 483 192",
              accountName: `AbbaKano - ${name}`,
              brandColor: "#93186c",
              badgeText: "Backup Desk",
              subLabel: "Automated Virtual Desk • Instant",
              iconType: "wema",
            },
          ]);
        }
      } catch (err) {
        console.error("Could not load accounts:", err);
      }
    }

    void loadUserDataAndAccounts();
  }, []);

  function handleCopy(num: string) {
    const raw = num.replace(/\s/g, "");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(raw);
    }
    setCopiedAccount(raw);
    setTimeout(() => setCopiedAccount(null), 2500);
  }

  async function handlePaystackCheckout(e: FormEvent) {
    e.preventDefault();
    const val = Number(amount);
    if (!Number.isInteger(val) || val < 100 || val > 1000000) {
      setPaymentError("Enter an amount between ₦100 and ₦1,000,000.");
      return;
    }

    setIsStartingPayment(true);
    setPaymentError(null);

    try {
      const { data, error } = await supabase.functions.invoke("initialize-paystack", {
        body: { amount: val },
      });

      if (error) throw error;

      const authUrl = data?.authorization_url || data?.authorizationUrl;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error("Could not initialize Paystack checkout. Please try again.");
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      setPaymentError(err?.message || "Could not start payment. Please try again.");
    } finally {
      setIsStartingPayment(false);
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"
    }`}>
      <WebDesktopSidebar active="home" onNavigate={() => goHome()} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Content Body: Mobile First Centered Viewport */}
        <main className="flex-1 w-full max-w-md sm:max-w-lg mx-auto px-4 pt-3 pb-28">
          {/* Header Bar matching mobile ScreenHeader */}
          <div className="flex items-center gap-3.5 mb-5">
            <button
              type="button"
              onClick={goHome}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-95 cursor-pointer ${
                isDark
                  ? "bg-[#141721] border-[#222634] text-slate-300 hover:text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
              }`}
              aria-label="Go back"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex flex-col min-w-0">
              <h1 className={`text-xl font-extrabold tracking-tight truncate ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                Fund Wallet
              </h1>
              <p className={`text-xs font-semibold truncate ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                Virtual Accounts &amp; Auto-Credit Engine
              </p>
            </div>
          </div>

          {/* Section Header: Monnify Sync Badge */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isDark ? "bg-blue-600/15 text-blue-400" : "bg-blue-50 text-blue-600"
              }`}>
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className={`text-sm sm:text-base font-extrabold truncate ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                Dedicated Virtual Accounts
              </h2>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 whitespace-nowrap shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>MONNIFY SYNC</span>
            </div>
          </div>

          <p className={`text-xs font-medium leading-relaxed mb-4 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            Choose any of your 3 dedicated bank accounts. Transfers reflect automatically in 15 to 30 seconds.
          </p>

          {/* 3 Dedicated Virtual Account Cards */}
          <div className="space-y-3 mb-5">
            {accounts.map((acc, idx) => {
              const rawNum = acc.accountNumber.replace(/\s/g, "");
              const isCopied = copiedAccount === rawNum;

              return (
                <div
                  key={idx}
                  className={`rounded-2xl border p-4 transition-all shadow-2xs ${
                    isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200"
                  }`}
                  style={{
                    borderColor: idx === 0 ? acc.brandColor : undefined,
                  }}
                >
                  {/* Top: Bank Logo + Title + Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs"
                        style={{
                          backgroundColor: `${acc.brandColor}18`,
                          color: acc.brandColor,
                        }}
                      >
                        {acc.iconType === "moniepoint" ? "MP" : acc.iconType === "sterling" ? "SB" : "WB"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs sm:text-sm font-extrabold truncate ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}>
                            {acc.bankName}
                          </span>
                          {idx === 0 && (
                            <span className="rounded-full bg-blue-500/15 text-blue-500 text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wide">
                              Auto
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] block truncate ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}>
                          {acc.subLabel}
                        </span>
                      </div>
                    </div>

                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                      idx === 0
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : isDark
                        ? "bg-slate-800 text-slate-400"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {acc.badgeText}
                    </span>
                  </div>

                  {/* Middle Box: Account Number + Copy Button */}
                  <div className={`rounded-xl p-3 mb-3 border ${
                    isDark ? "bg-[#0b0e14] border-[#1e2330]" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className={`text-[9px] font-bold uppercase tracking-wider block mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Account Number
                    </span>

                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-xl sm:text-2xl font-black tracking-wider truncate ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}>
                        {acc.accountNumber}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopy(acc.accountNumber)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          isCopied
                            ? "bg-emerald-600 text-white"
                            : isDark
                            ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs"
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Bottom: Account Name + Verified Badge */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className={`text-[10px] block ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}>
                        Account Name
                      </span>
                      <span className={`font-bold truncate block ${
                        isDark ? "text-slate-200" : "text-slate-800"
                      }`}>
                        {acc.accountName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Verified</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alternative Gateway Card: Paystack / ATM Card */}
          <div className={`rounded-2xl border overflow-hidden transition-all mb-5 ${
            isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200 shadow-2xs"
          }`}>
            <button
              type="button"
              onClick={() => setGatewayExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between p-4 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isDark ? "bg-blue-600/15 text-blue-400" : "bg-blue-50 text-blue-600"
                }`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className={`text-xs sm:text-sm font-bold block truncate ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}>
                    Debit Card / Paystack Checkout
                  </span>
                  <span className={`text-[11px] block truncate ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Instant funding via ATM Card, USSD or Bank App
                  </span>
                </div>
              </div>

              <svg
                className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                  gatewayExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {gatewayExpanded && (
              <form onSubmit={handlePaystackCheckout} className={`p-4 pt-0 space-y-3.5 border-t ${
                isDark ? "border-[#1e2330]" : "border-slate-100"
              }`}>
                <p className={`text-xs leading-relaxed ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}>
                  Fund with any Nigerian Master, Visa, or Verve card. A 1.5% gateway surcharge applies to card payments.
                </p>

                {/* Preset Chips */}
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Quick Presets
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_AMOUNTS.map((p) => {
                      const isSel = amount === String(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAmount(String(p))}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? "bg-blue-600 text-white shadow-xs"
                              : isDark
                              ? "bg-[#1e2330] text-slate-300 hover:bg-[#252b3b]"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          ₦{p.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Amount Input: 16px font text-base */}
                <div>
                  <label
                    htmlFor="paystack-amount"
                    className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Amount to Topup (₦)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                      ₦
                    </span>
                    <input
                      id="paystack-amount"
                      type="number"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="1000"
                      min="100"
                      max="1000000"
                      className={`w-full rounded-xl border pl-8 pr-4 py-3 text-base font-bold outline-none transition-all ${
                        isDark
                          ? "bg-[#0b0e14] border-[#222634] text-white focus:border-blue-500"
                          : "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600"
                      }`}
                    />
                  </div>
                </div>

                {paymentError && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs font-semibold text-red-500">
                    {paymentError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStartingPayment}
                  className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isStartingPayment ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Connecting Gateway...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Proceed to Paystack (₦{Number(amount || 0).toLocaleString()})</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Security Guarantee Note */}
          <div className={`flex items-start gap-3 rounded-2xl border p-4 ${
            isDark ? "bg-[#141721] border-[#222634]" : "bg-slate-50 border-slate-200"
          }`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isDark ? "bg-blue-600/15 text-blue-400" : "bg-blue-100 text-blue-600"
            }`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className={`text-xs font-bold block ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                Bank-Grade Encryption
              </span>
              <p className={`text-[11px] leading-relaxed mt-0.5 ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}>
                Dedicated virtual accounts are issued by CBN-licensed financial institutions and protected with 256-bit encryption.
              </p>
            </div>
          </div>
        </main>
      </div>

      <WebBottomNav
        active="home"
        onNavigate={(tab) => {
          if (tab === "home") goHome();
          else window.dispatchEvent(new CustomEvent("app-tab-change", { detail: tab }));
        }}
      />
    </div>
  );
}
