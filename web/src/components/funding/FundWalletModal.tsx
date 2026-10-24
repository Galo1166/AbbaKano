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
  const [requiresIdentity, setRequiresIdentity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Customer");

  // NIN submission state
  const [ninInput, setNinInput] = useState<string>("");
  const [generating, setGenerating] = useState<boolean>(false);
  const [ninError, setNinError] = useState<string>("");

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

        const result = await fetchVirtualAccounts();
        if (!cancelled) {
          setVirtualAccounts(result.accounts || []);
          setRequiresIdentity(result.requiresIdentity === true);
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

  async function handleGenerateAccounts(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const clean = ninInput.replace(/\D/g, "");
    if (clean.length !== 11) {
      setNinError("Please enter a valid 11-digit NIN.");
      return;
    }
    setGenerating(true);
    setNinError("");
    try {
      const result = await fetchVirtualAccounts({
        type: "nin",
        value: clean,
      });
      setVirtualAccounts(result.accounts || []);
      setRequiresIdentity(result.requiresIdentity === true);
      setToastMessage("Virtual Accounts Ready!");
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err: unknown) {
      setNinError(err instanceof Error ? err.message : "Failed to generate accounts.");
    } finally {
      setGenerating(false);
    }
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
          {virtualAccounts.length > 0
            ? "Transfer to any account below. Your wallet is automatically credited in 15–30 seconds."
            : "Central Bank of Nigeria (CBN) regulations mandate identity verification before generating automated virtual accounts."}
        </p>

        {/* Accounts List OR NIN Verification View */}
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
            /* NIN Prompt View when user has no dedicated accounts yet */
            <div className={`rounded-2xl border p-5 ${
              isDark ? "bg-[#181B25] border-[#222634]" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  CBN & FG Regulatory Compliance
                </span>
              </div>

              <h3 className="text-sm font-bold tracking-tight">Identity Verification Required</h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Central Bank of Nigeria (CBN) regulations mandate your 11-digit National Identity Number (NIN) to automatically provision your dedicated virtual bank accounts.
              </p>

              <form onSubmit={handleGenerateAccounts} className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                  <label htmlFor="nin-input" className={isDark ? "text-slate-400" : "text-slate-500"}>
                    11-Digit NIN Number
                  </label>
                  <span className={ninInput.replace(/\D/g, "").length === 11 ? "text-emerald-400" : "text-slate-500"}>
                    {ninInput.replace(/\D/g, "").length} / 11
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="nin-input"
                    type="text"
                    maxLength={11}
                    value={ninInput}
                    onChange={(e) => {
                      setNinInput(e.target.value.replace(/\D/g, "").slice(0, 11));
                      if (ninError) setNinError("");
                    }}
                    placeholder="Enter your 11-digit NIN"
                    disabled={generating}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono tracking-widest outline-none transition-colors ${
                      isDark
                        ? "bg-[#141721] border-[#2E354B] text-white focus:border-blue-500"
                        : "bg-white border-slate-300 text-slate-900 focus:border-blue-600"
                    }`}
                  />
                  {ninInput.replace(/\D/g, "").length === 11 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </div>

                {ninError && (
                  <div className="mt-2.5 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-400 flex items-center gap-2">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{ninError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={ninInput.replace(/\D/g, "").length !== 11 || generating}
                  className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all cursor-pointer ${
                    ninInput.replace(/\D/g, "").length === 11 && !generating
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                      : "bg-slate-700/40 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {generating ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generating Dedicated Accounts...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Virtual Accounts
                    </>
                  )}
                </button>
              </form>

              <p className={`mt-2.5 text-center text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                🔒 Your NIN is processed securely and encrypted for CBN regulatory compliance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
