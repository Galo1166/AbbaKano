"use client";

import React, { useState, useEffect } from "react";
import { useThemeMode } from "@/lib/theme";
import { fetchVirtualAccounts, type VirtualAccount } from "@/lib/virtualAccounts";
import { supabase } from "@/lib/supabase";

interface FundWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FundWalletModal({ isOpen, onClose }: FundWalletModalProps) {
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Customer");

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fund-wallet-title"
    >
      <div
        className={`relative w-full max-w-md rounded-3xl border shadow-2xl p-5 sm:p-6 transition-all animate-in zoom-in-95 duration-200 overflow-hidden ${
          isDark
            ? "bg-[#141721] border-[#222634] text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Toast Pill */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold shadow-lg bg-emerald-500/10 border-emerald-500/20 text-emerald-400 backdrop-blur-md">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-inherit">
          <div>
            <h2 id="fund-wallet-title" className="text-lg font-extrabold tracking-tight">
              Fund Wallet
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Dedicated Virtual Accounts
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors cursor-pointer ${
              isDark
                ? "bg-[#1C1F29] border-[#222634] text-slate-400 hover:text-white"
                : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
            aria-label="Close modal"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className={`text-xs mt-3 mb-4 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Transfer to any account below. Your wallet is automatically credited in 15–30 seconds.
        </p>

        {/* Accounts List */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-xs text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Loading dedicated virtual accounts...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-500">
              {error}
            </div>
          ) : virtualAccounts.length > 0 ? (
            virtualAccounts.map((account) => {
              const beneficiaryName = `AbbaKano - ${userName} (${account.bankName})`;

              return (
                <div
                  key={`${account.bankName}-${account.accountNumber}`}
                  className={`rounded-2xl border p-4 transition-colors ${
                    isDark ? "bg-[#181B25] border-[#222634]" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  {/* Bank Header Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                        isDark ? "bg-[#1C1F29] border-[#222634] text-blue-400" : "bg-white border-slate-200 text-blue-600"
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
                  <div className={`rounded-xl border p-3 ${
                    isDark ? "bg-[#1C1F29] border-[#222634]" : "bg-white border-slate-200"
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
                            : "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
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
            <div className="py-8 text-center text-xs text-slate-400">
              No dedicated accounts available. Please try again in a moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
