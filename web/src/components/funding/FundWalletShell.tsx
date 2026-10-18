"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useThemeMode } from "@/lib/theme";
import { fetchVirtualAccounts, type VirtualAccount } from "@/lib/virtualAccounts";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";

export function FundWalletShell() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Customer");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !cancelled) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
          if (fullName) {
            setUserName(fullName);
          } else {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", user.id)
              .maybeSingle();
            if (profile?.full_name && !cancelled) {
              setUserName(profile.full_name);
            }
          }
        }

        const accounts = await fetchVirtualAccounts();
        if (!cancelled) {
          setVirtualAccounts(accounts);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load dedicated accounts.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  function goHome() {
    router.push("/app");
  }

  async function copyToClipboard(accountNumber: string, bankName: string) {
    try {
      await navigator.clipboard.writeText(accountNumber.replace(/\s/g, ""));
      const shortBank = bankName.replace(/bank/i, "").trim();
      const message = shortBank ? `${shortBank} Copied to Clipboard` : "Copied to Clipboard";
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 2000);
    } catch {
      setToastMessage("Copied to Clipboard");
      setTimeout(() => setToastMessage(null), 2000);
    }
  }

  return (
    <div className={`min-h-screen pb-24 transition-colors ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-slate-50 text-slate-900"
    }`}>
      <WebDesktopSidebar active="home" />

      {/* Floating Toast Pill */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-xl bg-emerald-500/15 border-emerald-500/30 text-emerald-400 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="mx-auto max-w-md px-4 pt-4 sm:pt-6">
        {/* Header */}
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
                Dedicated Virtual Accounts
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AUTO-SYNC</span>
          </span>
        </header>

        <p className={`text-xs mb-4 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Transfer to any dedicated bank account below. Your wallet is automatically credited in 15–30 seconds.
        </p>

        {/* Dedicated Accounts List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-xs text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Loading dedicated virtual accounts...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-500">
              {error}
            </div>
          ) : virtualAccounts.length > 0 ? (
            virtualAccounts.map((account) => {
              const beneficiaryName = `AbbaKano - ${userName} (${account.bankName})`;

              return (
                <div
                  key={`${account.bankName}-${account.accountNumber}`}
                  className={`rounded-2xl border p-4 transition-colors ${
                    isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  {/* Bank Header Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                        isDark ? "bg-[#1C1F29] border-[#222634] text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600"
                      }`}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold tracking-wide uppercase">
                        {account.bankName}
                      </h3>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Auto-Credit
                    </span>
                  </div>

                  {/* Account Number Box */}
                  <div className={`rounded-xl border p-3.5 ${
                    isDark ? "bg-[#181B25] border-[#222634]" : "bg-slate-50 border-slate-200"
                  }`}>
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      Account Number
                    </span>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="font-mono text-xl sm:text-2xl font-black tracking-widest text-blue-500">
                        {account.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyToClipboard(account.accountNumber, account.bankName)}
                        className={`flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors cursor-pointer ${
                          isDark
                            ? "bg-[#252B3D] border-[#2E354B] text-slate-200 hover:bg-[#2E364E]"
                            : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100 shadow-2xs"
                        }`}
                        aria-label={`Copy ${account.bankName} account number`}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Beneficiary Name Row */}
                  <div className="mt-2.5 px-1">
                    <span className={`block text-[10px] font-semibold uppercase tracking-wider ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}>
                      Beneficiary Account Name
                    </span>
                    <p className={`mt-0.5 text-xs font-bold truncate ${
                      isDark ? "text-slate-200" : "text-slate-800"
                    }`}>
                      {beneficiaryName}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              No dedicated accounts available. Please try again shortly.
            </div>
          )}
        </div>
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
