"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { safeErrorMessage } from "@/lib/userFeedback";
import { useThemeMode } from "@/lib/theme";
import {
  fetchVirtualAccounts,
  type VirtualAccount,
  type VirtualAccountIdentity,
} from "@/lib/virtualAccounts";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";

export function FundWalletShell() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");
  const [requiresIdentity, setRequiresIdentity] = useState(false);
  const [identityType, setIdentityType] = useState<VirtualAccountIdentity["type"]>("nin");
  const [identityValue, setIdentityValue] = useState("");
  const [accountsRetry, setAccountsRetry] = useState(0);
  const [copiedAccountNumber, setCopiedAccountNumber] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");
  const copyFeedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadVirtualAccounts() {
      setAccountsLoading(true);
      setAccountsError("");

      try {
        const result = await fetchVirtualAccounts();
        if (!cancelled) {
          setVirtualAccounts(result.accounts);
          setRequiresIdentity(result.requiresIdentity);
        }
      } catch (error) {
        if (!cancelled) {
          setAccountsError(safeErrorMessage(error, "Could not load your bank account details."));
        }
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    }

    void loadVirtualAccounts();
    return () => {
      cancelled = true;
    };
  }, [accountsRetry]);

  async function submitIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{11}$/.test(identityValue)) {
      setAccountsError(`Enter a valid 11-digit ${identityType.toUpperCase()}.`);
      return;
    }

    setAccountsLoading(true);
    setAccountsError("");
    try {
      const result = await fetchVirtualAccounts({
        type: identityType,
        value: identityValue,
      });
      setVirtualAccounts(result.accounts);
      setRequiresIdentity(result.requiresIdentity);
    } catch (error) {
      setAccountsError(safeErrorMessage(error, "Could not create your bank account."));
    } finally {
      setIdentityValue("");
      setAccountsLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  function goHome() {
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    } else {
      router.push("/app");
    }
  }

  async function copyAccountNumber(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopyError("");
      setCopiedAccountNumber(accountNumber);
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
      copyFeedbackTimerRef.current = window.setTimeout(() => {
        setCopiedAccountNumber(null);
        copyFeedbackTimerRef.current = null;
      }, 1800);
    } catch (error) {
      console.error("Virtual account copy error:", error);
      setCopyError("Could not copy the account number. Please select and copy it manually.");
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

        </header>

        <main className="space-y-4">
          {/* Dedicated Virtual Accounts */}
          <div className={`rounded-2xl border p-4 transition-all ${
            isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200"
          }`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
                }`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm3 8h3" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className={`text-sm font-extrabold ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}>
                    Dedicated Transfer Accounts
                  </h2>
                  <p className={`text-[11px] ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}>
                    Transfer to automatically fund your wallet
                  </p>
                </div>
              </div>
              {!accountsLoading && virtualAccounts.length > 0 && (
                <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                  AUTO-SYNC
                </span>
              )}
            </div>

            {accountsLoading ? (
              <div className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
                isDark ? "bg-[#0b0e14] text-slate-400" : "bg-slate-50 text-slate-500"
              }`} role="status">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                Loading your bank account details...
              </div>
            ) : requiresIdentity ? (
              <form
                onSubmit={(event) => void submitIdentity(event)}
                className={`space-y-3 rounded-xl p-3 ${
                  isDark ? "bg-[#0b0e14]" : "bg-slate-50"
                }`}
              >
                <div>
                  <h3 className={`text-sm font-bold ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}>
                    Verify your identity to create your account
                  </h3>
                  <p className={`mt-1 text-xs leading-relaxed ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Choose one ID and enter its 11-digit number. It is sent securely to Monnify to request your dedicated account and is not saved by AbbaKano.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {(["nin", "bvn"] as const).map((type) => (
                    <label
                      key={type}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-semibold ${
                        identityType === type
                          ? "border-blue-500 bg-blue-500/10 text-blue-500"
                          : isDark
                            ? "border-[#222634] text-slate-300"
                            : "border-slate-200 text-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="identityType"
                        value={type}
                        checked={identityType === type}
                        onChange={() => {
                          setIdentityType(type);
                          setIdentityValue("");
                          setAccountsError("");
                        }}
                      />
                      {type.toUpperCase()}
                    </label>
                  ))}
                </div>

                <label
                  htmlFor="identity-number"
                  className={`block text-xs font-semibold ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  {identityType.toUpperCase()} number
                </label>
                <input
                  id="identity-number"
                  name="identityNumber"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={11}
                  value={identityValue}
                  onChange={(event) => {
                    setIdentityValue(event.target.value.replace(/\D/g, "").slice(0, 11));
                    setAccountsError("");
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm tracking-widest outline-none focus:border-blue-500 ${
                    isDark
                      ? "border-[#222634] bg-[#141721] text-white placeholder:text-slate-500"
                      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                  }`}
                  placeholder={`Enter 11-digit ${identityType.toUpperCase()}`}
                  required
                />
                {accountsError && (
                  <p className="text-xs font-medium text-rose-500" role="alert">
                    {accountsError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={accountsLoading || identityValue.length !== 11}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Create dedicated account
                </button>
              </form>
            ) : accountsError ? (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                <p className="text-xs font-medium text-rose-500" role="alert">{accountsError}</p>
                <button
                  type="button"
                  onClick={() => setAccountsRetry((attempt) => attempt + 1)}
                  className="mt-2 text-xs font-bold text-blue-500 hover:text-blue-400"
                >
                  Try again
                </button>
              </div>
            ) : virtualAccounts.length > 0 ? (
              <div className="space-y-3">
                {virtualAccounts.map((account) => (
                  <div
                    key={`${account.bankName}:${account.accountNumber}`}
                    className={`rounded-xl border p-3 ${
                      isDark ? "bg-[#0b0e14] border-[#222634]" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className={`truncate text-sm font-bold ${
                          isDark ? "text-white" : "text-slate-900"
                        }`}>
                          {account.bankName}
                        </h3>
                        <p className={`mt-0.5 text-[10px] ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}>
                          Dedicated virtual account
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                        AUTO-SYNC
                      </span>
                    </div>

                    <div className={`mt-3 rounded-lg border p-3 ${
                      isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200"
                    }`}>
                      <span className={`block text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}>
                        Account Number
                      </span>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className={`break-all font-mono text-lg font-extrabold tracking-wide ${
                          isDark ? "text-blue-400" : "text-blue-600"
                        }`}>
                          {account.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => void copyAccountNumber(account.accountNumber)}
                          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-colors ${
                            isDark
                              ? "border-[#222634] bg-[#1b2030] text-slate-200 hover:bg-[#252b3d]"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                          aria-label={`Copy ${account.bankName} account number`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 8V5a2 2 0 012-2h9a2 2 0 012 2v9a2 2 0 01-2 2h-3M5 8h9a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2z" />
                          </svg>
                          {copiedAccountNumber === account.accountNumber ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className={`block text-[10px] font-semibold ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}>
                        Beneficiary Account Name
                      </span>
                      <p className={`mt-0.5 break-words text-xs font-bold ${
                        isDark ? "text-slate-200" : "text-slate-800"
                      }`}>
                        {account.accountName}
                      </p>
                    </div>
                  </div>
                ))}
                <p className={`text-[11px] leading-relaxed ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}>
                  Transfer to any account above. Your wallet will be credited automatically after the transfer is confirmed.
                </p>
                {copyError && (
                  <p className="text-xs font-medium text-rose-500" role="alert">{copyError}</p>
                )}
              </div>
            ) : (
              <div className={`rounded-xl p-3 text-xs leading-relaxed ${
                isDark ? "bg-[#0b0e14] text-slate-400" : "bg-slate-50 text-slate-600"
              }`}>
                Your dedicated bank account details are not available yet. Please try again shortly.
                <button
                  type="button"
                  onClick={() => setAccountsRetry((attempt) => attempt + 1)}
                  className="ml-1 font-bold text-blue-500 hover:text-blue-400"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* Funding Information */}
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
                Automatic Wallet Funding
              </span>
              <p className={`text-[11px] leading-relaxed mt-0.5 ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}>
                Your wallet will be credited automatically once your bank transfer is confirmed.
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
