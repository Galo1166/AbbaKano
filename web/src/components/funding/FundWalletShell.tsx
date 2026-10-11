"use client";

import React, { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, invokeSupabaseFunction } from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/userFeedback";
import { useThemeMode } from "@/lib/theme";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000];

export function FundWalletShell() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [amount, setAmount] = useState<string>("2000");
  const [fundingLocked, setFundingLocked] = useState(false);
  const [message, setMessage] = useState("");
  const fundingLockRef = useRef(false);
  const fundingAttemptRef = useRef(0);
  const countdownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current !== null) {
        window.clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  function releaseFundingLock(attempt: number) {
    if (fundingAttemptRef.current !== attempt) return;

    fundingLockRef.current = false;
    setFundingLocked(false);

    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }

  function goHome() {
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    } else {
      router.push("/app");
    }
  }

  async function handlePaystackCheckout(e: FormEvent) {
    e.preventDefault();
    if (fundingLockRef.current) return;

    const value = Number(amount);
    if (!Number.isInteger(value) || value < 100 || value > 1_000_000) {
      setMessage("Enter an amount between ₦100 and ₦1,000,000.");
      return;
    }

    setMessage("");
    fundingLockRef.current = true;
    setFundingLocked(true);
    const attempt = ++fundingAttemptRef.current;
    const unlockAt = Date.now() + 30_000;

    countdownTimerRef.current = window.setInterval(() => {
      if (fundingAttemptRef.current !== attempt) return;
      const remaining = Math.ceil((unlockAt - Date.now()) / 1000);
      if (remaining <= 0) {
        releaseFundingLock(attempt);
      }
    }, 1000);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setMessage("Your session has expired. Please log in again.");
        releaseFundingLock(attempt);
        router.push("/login");
        return;
      }

      const data = await invokeSupabaseFunction<{ authorizationUrl?: string }>(
        "initialize-paystack",
        { amount: value },
      );

      if (!data?.authorizationUrl) {
        throw new Error("Paystack did not return a checkout URL.");
      }

      window.location.assign(data.authorizationUrl);
    } catch (error) {
      console.error("Paystack initialization error:", error);
      setMessage(safeErrorMessage(error, "Could not start Paystack payment."));
      releaseFundingLock(attempt);
    }
  }

  return (
    <div className={`min-h-screen pb-24 transition-colors ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-slate-50 text-slate-900"
    }`}>
      <WebDesktopSidebar active="home" />

      <div className="mx-auto max-w-md px-4 pt-4 sm:pt-6">
        {/* Top Header */}
        <header className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goHome}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer ${
                isDark
                  ? "bg-[#141721] border-[#222634] text-slate-300 hover:text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
              }`}
              aria-label="Back to home"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className={`text-xl font-extrabold tracking-tight truncate ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                Fund Wallet
              </h1>
              <p className={`text-xs font-semibold truncate ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                Instant Account Top-Up
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-500 shrink-0">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span>PAYSTACK</span>
          </div>
        </header>

        <main className="space-y-4">
          {/* Primary Paystack Funding Card */}
          <div className={`rounded-3xl border shadow-sm overflow-hidden transition-all ${
            isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200"
          }`}>
            {/* Card Header */}
            <div className="p-4 sm:p-5 pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs font-black text-sm">
                    PS
                  </div>
                  <div>
                    <h2 className={`text-base font-extrabold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}>
                      Paystack Secure Gateway
                    </h2>
                    <p className={`text-xs ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Instant credit via Card, USSD or Transfer
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  Instant
                </span>
              </div>

              <p className={`text-xs leading-relaxed mt-2 ${
                isDark ? "text-slate-300" : "text-slate-600"
              }`}>
                Fund your wallet securely with any Nigerian Master, Visa, or Verve card, or through Paystack automated bank transfer.
              </p>
            </div>

            {/* Funding Form */}
            <form onSubmit={handlePaystackCheckout} className={`p-4 sm:p-5 pt-0 space-y-4 border-t ${
              isDark ? "border-[#1e2330]" : "border-slate-100"
            }`}>
              {/* Preset Chips */}
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  Quick Amount Presets
                </span>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {PRESET_AMOUNTS.map((p) => {
                    const isSel = amount === String(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setAmount(String(p))}
                        className={`rounded-xl py-2 text-xs font-extrabold transition-all cursor-pointer text-center ${
                          isSel
                            ? "bg-blue-600 text-white shadow-sm"
                            : isDark
                            ? "bg-[#181B25] border border-[#222634] text-slate-300 hover:bg-[#1e2330]"
                            : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        ₦{p >= 1000 ? `${p / 1000}k` : p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <label
                  htmlFor="paystack-amount"
                  className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Enter Amount (₦)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 pointer-events-none">
                    ₦
                  </span>
                  <input
                    id="paystack-amount"
                    type="number"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="2000"
                    min="100"
                    max="1000000"
                    className={`w-full rounded-2xl border pl-10 pr-4 py-3 text-lg font-mono font-black outline-none transition-all ${
                      isDark
                        ? "bg-[#0b0e14] border-[#222634] text-white focus:border-blue-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600"
                    }`}
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div className={`rounded-2xl border p-3.5 space-y-2 text-xs ${
                isDark ? "bg-[#0b0e14] border-[#1e2330]" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex justify-between items-center">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Top-up Amount</span>
                  <span className={`font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    ₦{Number(amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Gateway Processing Fee</span>
                  <span className="text-emerald-500 font-bold">₦0.00 (Free)</span>
                </div>
                <div className={`flex justify-between items-center pt-2 border-t font-black text-sm ${
                  isDark ? "border-[#1e2330] text-blue-400" : "border-slate-200 text-blue-600"
                }`}>
                  <span>Total Debit</span>
                  <span className="font-mono">₦{Number(amount || 0).toLocaleString()}</span>
                </div>
              </div>

              {message && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-semibold text-rose-500">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={fundingLocked || !amount || Number(amount) < 100}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {fundingLocked ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Connecting Paystack...</span>
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
          </div>

          {/* Monnify Virtual Accounts Notice */}
          <div className={`rounded-2xl border p-4 transition-all ${
            isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200"
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className={`text-xs font-bold block ${
                  isDark ? "text-white" : "text-slate-900"
                }`}>
                  Bank Transfer Notice
                </span>
                <p className={`text-[11px] leading-relaxed mt-1 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  Dedicated virtual accounts (Moniepoint, Sterling &amp; Wema) will be available once our automated Monnify integration is live. Please use the Paystack card and transfer option above for instant wallet top-up.
                </p>
              </div>
            </div>
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
                Payments processed securely via Paystack with 256-bit SSL encryption. We do not store your card details.
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
