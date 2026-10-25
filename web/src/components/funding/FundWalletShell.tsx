"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { safeErrorMessage } from "@/lib/userFeedback";
import { useThemeMode } from "@/lib/theme";
import {
  fetchVirtualAccounts,
  getCachedVirtualAccounts,
  type VirtualAccount,
  type VirtualAccountIdentity,
} from "@/lib/virtualAccounts";
import { supabase } from "@/lib/supabase";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";

// ---------------------------------------------------------------------------
// IdentityVerificationForm — professional NIN / BVN input component
// ---------------------------------------------------------------------------

interface IdentityVerificationFormProps {
  isDark: boolean;
  identityType: VirtualAccountIdentity["type"];
  identityValue: string;
  accountsError: string;
  accountsLoading: boolean;
  onTypeChange: (type: VirtualAccountIdentity["type"]) => void;
  onValueChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function IdentityVerificationForm({
  isDark,
  identityType,
  identityValue,
  accountsError,
  accountsLoading,
  onTypeChange,
  onValueChange,
  onSubmit,
}: IdentityVerificationFormProps) {
  const [showValue, setShowValue] = useState(false);

  const idMeta = {
    nin: {
      label: "National Identification Number",
      description: "11-digit number on your NIN slip or NIMC card",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
        </svg>
      ),
    },
    bvn: {
      label: "Bank Verification Number",
      description: "11-digit number linked to your bank account",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  } as const;

  const current = idMeta[identityType];
  const filledDigits = identityValue.length;
  const isComplete = filledDigits === 11;

  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-xl overflow-hidden border ${
        isDark ? "border-[#222634] bg-[#0b0e14]" : "border-slate-200 bg-slate-50"
      }`}
    >
      {/* Header */}
      <div className={`flex items-start gap-3 px-4 pt-4 pb-3 border-b ${
        isDark ? "border-[#1a1e2e]" : "border-slate-100"
      }`}>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
        }`}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-extrabold leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            Identity Verification Required
          </h3>
          <p className={`mt-0.5 text-[11px] leading-snug ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            One-time verification to generate your dedicated account
          </p>
        </div>
        <span className={`shrink-0 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
          isDark
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-emerald-200 bg-emerald-50 text-emerald-600"
        }`}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Encrypted
        </span>
      </div>

      <div className="px-4 pt-3 pb-4 space-y-4">
        {/* ID Type Selector */}
        <div>
          <span className={`mb-2 block text-[10px] font-bold uppercase tracking-widest ${
            isDark ? "text-slate-500" : "text-slate-400"
          }`}>
            Select ID Type
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(["nin", "bvn"] as const).map((type) => {
              const meta = idMeta[type];
              const isSelected = identityType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onTypeChange(type)}
                  className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? isDark
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-blue-500 bg-blue-50"
                      : isDark
                        ? "border-[#222634] bg-[#141721] hover:border-[#2e354d]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className={`flex items-center justify-center rounded-lg p-1.5 ${
                      isSelected
                        ? isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
                        : isDark ? "bg-[#1b2030] text-slate-400" : "bg-slate-100 text-slate-500"
                    }`}>
                      {meta.icon}
                    </span>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected ? "border-blue-500 bg-blue-500" : isDark ? "border-[#3a4060]" : "border-slate-300"
                    }`}>
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <div>
                    <span className={`block text-xs font-extrabold ${
                      isSelected
                        ? isDark ? "text-blue-400" : "text-blue-600"
                        : isDark ? "text-slate-200" : "text-slate-700"
                    }`}>
                      {type.toUpperCase()}
                    </span>
                    <span className={`block text-[10px] leading-snug ${
                      isSelected
                        ? isDark ? "text-blue-400/70" : "text-blue-500/80"
                        : isDark ? "text-slate-500" : "text-slate-400"
                    }`}>
                      {meta.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Number Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="fw-identity-number" className={`text-xs font-bold ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}>
              {current.label}
            </label>
            <span className={`text-[10px] font-semibold tabular-nums ${
              isComplete ? "text-emerald-500" : isDark ? "text-slate-500" : "text-slate-400"
            }`}>
              {filledDigits}/11
            </span>
          </div>

          <div className="relative">
            <input
              id="fw-identity-number"
              name="identityNumber"
              type={showValue ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              maxLength={11}
              value={identityValue}
              onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
              className={`w-full rounded-xl border px-3.5 py-3 pr-11 text-base font-mono font-bold tracking-[0.25em] outline-none transition-all ${
                accountsError
                  ? "border-rose-500 focus:border-rose-500"
                  : isComplete
                    ? isDark
                      ? "border-emerald-500/50 focus:border-emerald-500"
                      : "border-emerald-400 focus:border-emerald-500"
                    : isDark
                      ? "border-[#222634] focus:border-blue-500"
                      : "border-slate-200 focus:border-blue-500"
              } ${isDark ? "bg-[#141721] text-white placeholder:text-slate-600" : "bg-white text-slate-900 placeholder:text-slate-400"}`}
              placeholder="• • • • • • • • • • •"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowValue((v) => !v)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md p-1 transition-colors ${
                isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
              }`}
              aria-label={showValue ? "Hide number" : "Show number"}
            >
              {showValue ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Digit progress bar */}
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 11 }).map((_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full transition-all duration-150 ${
                i < filledDigits
                  ? isComplete ? "bg-emerald-500" : "bg-blue-500"
                  : isDark ? "bg-[#222634]" : "bg-slate-200"
              }`} />
            ))}
          </div>
        </div>

        {/* Error */}
        {accountsError && (
          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${
            isDark ? "border-rose-500/20 bg-rose-500/10" : "border-rose-100 bg-rose-50"
          }`} role="alert">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs font-semibold text-rose-500">{accountsError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={accountsLoading || !isComplete}
          className={`w-full rounded-xl px-4 py-3 text-sm font-extrabold text-white transition-all ${
            isComplete && !accountsLoading
              ? "bg-blue-600 hover:bg-blue-500 active:scale-[0.98] shadow-lg shadow-blue-500/20"
              : "cursor-not-allowed bg-blue-600/40"
          }`}
        >
          {accountsLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Verifying &amp; creating account…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Generate Dedicated Account
            </span>
          )}
        </button>

        {/* Security disclaimer */}
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 ${
          isDark ? "bg-[#141721]" : "bg-white border border-slate-100"
        }`}>
          <svg className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className={`text-[10px] leading-snug ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Your {identityType.toUpperCase()} is transmitted directly to Monnify over an encrypted
            connection and is{" "}
            <strong className={isDark ? "text-slate-400" : "text-slate-600"}>never stored</strong>{" "}
            by AbbaKano.
          </p>
        </div>
      </div>
    </form>
  );
}

export function FundWalletShell() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  // ── Initialise from cache synchronously so the page never flickers ────────
  const initialCache = (() => {
    const session = supabase.auth.currentSession;
    if (!session) return null;
    return getCachedVirtualAccounts(session.user.id);
  })();

  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>(
    initialCache?.accounts ?? [],
  );
  const [accountsLoading, setAccountsLoading] = useState(initialCache === null);
  const [accountsError, setAccountsError] = useState("");
  const [requiresIdentity, setRequiresIdentity] = useState(
    initialCache?.requiresIdentity ?? false,
  );
  const [identityType, setIdentityType] = useState<VirtualAccountIdentity["type"]>("nin");
  const [identityValue, setIdentityValue] = useState("");
  const [accountsRetry, setAccountsRetry] = useState(0);
  const [copiedAccountNumber, setCopiedAccountNumber] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");
  const copyFeedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // If the cache was already warm on mount, skip the network fetch entirely
    // (fetchVirtualAccounts will still return cached data, but we'd flash the
    //  loading state before the async call resolves — so we gate it here too).
    const session = supabase.auth.currentSession;
    if (session && getCachedVirtualAccounts(session.user.id)) return;

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
              <IdentityVerificationForm
                isDark={isDark}
                identityType={identityType}
                identityValue={identityValue}
                accountsError={accountsError}
                accountsLoading={accountsLoading}
                onTypeChange={(type) => {
                  setIdentityType(type);
                  setIdentityValue("");
                  setAccountsError("");
                }}
                onValueChange={(val) => {
                  setIdentityValue(val);
                  setAccountsError("");
                }}
                onSubmit={(event) => void submitIdentity(event)}
              />
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
