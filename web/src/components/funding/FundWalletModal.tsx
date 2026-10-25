"use client";

import React, { useState, useEffect } from "react";
import { useThemeMode } from "@/lib/theme";
import { fetchVirtualAccounts, getCachedVirtualAccounts, type VirtualAccount, type VirtualAccountIdentity } from "@/lib/virtualAccounts";
import { supabase } from "@/lib/supabase";



interface FundWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FundWalletModal({ isOpen, onClose }: FundWalletModalProps) {
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  // ── Initialise from cache synchronously so modal opens instantly ──────────
  // useState lazy initializer: runs exactly once on mount.
  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>(() => {
    const session = supabase.auth.currentSession;
    if (!session) return [];
    return getCachedVirtualAccounts(session.user.id)?.accounts ?? [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const session = supabase.auth.currentSession;
    if (!session) return true;
    return getCachedVirtualAccounts(session.user.id) === null;
  });
  const [error, setError] = useState("");
  const [requiresIdentity, setRequiresIdentity] = useState<boolean>(() => {
    const session = supabase.auth.currentSession;
    if (!session) return false;
    return getCachedVirtualAccounts(session.user.id)?.requiresIdentity ?? false;
  });
  const [identityType, setIdentityType] = useState<VirtualAccountIdentity["type"]>("nin");
  const [identityValue, setIdentityValue] = useState("");
  const [showIdValue, setShowIdValue] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Customer");

  useEffect(() => {
    if (!isOpen) return;

    // Skip the network fetch if the cache is already warm
    const session = supabase.auth.currentSession;
    if (session && getCachedVirtualAccounts(session.user.id)) {
      // Still load user name for the beneficiary label
      void (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (fullName) {
          setUserName(fullName as string);
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.full_name) setUserName(profile.full_name as string);
        }
      })();
      return;
    }

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
          setVirtualAccounts(result.accounts);
          setRequiresIdentity(result.requiresIdentity);
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

  async function submitIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{11}$/.test(identityValue)) {
      setError(`Enter a valid 11-digit ${identityType.toUpperCase()}.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await fetchVirtualAccounts({ type: identityType, value: identityValue });
      setVirtualAccounts(result.accounts);
      setRequiresIdentity(result.requiresIdentity);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your bank account.");
    } finally {
      setIdentityValue("");
      setLoading(false);
    }
  }

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
          ) : requiresIdentity ? (
            /* ---- Identity Verification ---- */
            <form onSubmit={(e) => void submitIdentity(e)} className="space-y-4 py-2">
              {/* Header */}
              <div className={`flex items-start gap-3 rounded-xl border p-3 ${
                isDark ? "border-[#222634] bg-[#181B25]" : "border-slate-100 bg-slate-50"
              }`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
                }`}>
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`text-sm font-extrabold leading-tight ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}>
                    Identity Verification Required
                  </h3>
                  <p className={`mt-0.5 text-[11px] leading-snug ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}>
                    One-time check to generate your dedicated account
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

              {/* ID Type Cards */}
              <div>
                <span className={`mb-2 block text-[10px] font-bold uppercase tracking-widest ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}>
                  Select ID Type
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(["nin", "bvn"] as const).map((type) => {
                    const isSelected = identityType === type;
                    const icons = {
                      nin: (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
                        </svg>
                      ),
                      bvn: (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      ),
                    };
                    const descs = {
                      nin: "11-digit NIN slip / NIMC",
                      bvn: "11-digit bank-linked number",
                    };
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => { setIdentityType(type); setIdentityValue(""); setError(""); }}
                        className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? isDark ? "border-blue-500 bg-blue-500/10" : "border-blue-500 bg-blue-50"
                            : isDark ? "border-[#222634] bg-[#1C1F29] hover:border-[#2e354d]" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className={`flex items-center justify-center rounded-lg p-1.5 ${
                            isSelected
                              ? isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
                              : isDark ? "bg-[#252B3D] text-slate-400" : "bg-slate-100 text-slate-500"
                          }`}>
                            {icons[type]}
                          </span>
                          <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                            isSelected ? "border-blue-500 bg-blue-500" : isDark ? "border-[#3a4060]" : "border-slate-300"
                          }`}>
                            {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div>
                          <span className={`block text-xs font-extrabold ${
                            isSelected ? isDark ? "text-blue-400" : "text-blue-600" : isDark ? "text-slate-200" : "text-slate-700"
                          }`}>
                            {type.toUpperCase()}
                          </span>
                          <span className={`block text-[10px] leading-snug ${
                            isSelected ? isDark ? "text-blue-400/70" : "text-blue-500/80" : isDark ? "text-slate-500" : "text-slate-400"
                          }`}>
                            {descs[type]}
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
                  <label htmlFor="modal-identity-number" className={`text-xs font-bold ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}>
                    {identityType === "nin" ? "National Identification Number" : "Bank Verification Number"}
                  </label>
                  <span className={`text-[10px] font-semibold tabular-nums ${
                    identityValue.length === 11 ? "text-emerald-500" : isDark ? "text-slate-500" : "text-slate-400"
                  }`}>
                    {identityValue.length}/11
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="modal-identity-number"
                    name="identityNumber"
                    type={showIdValue ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={11}
                    value={identityValue}
                    onChange={(e) => { setIdentityValue(e.target.value.replace(/\D/g, "").slice(0, 11)); setError(""); }}
                    className={`w-full rounded-xl border px-3.5 py-3 pr-11 text-base font-mono font-bold tracking-[0.25em] outline-none transition-all ${
                      error
                        ? "border-rose-500 focus:border-rose-500"
                        : identityValue.length === 11
                          ? isDark ? "border-emerald-500/50 focus:border-emerald-500" : "border-emerald-400 focus:border-emerald-500"
                          : isDark ? "border-[#222634] focus:border-blue-500" : "border-slate-200 focus:border-blue-500"
                    } ${isDark ? "bg-[#181B25] text-white placeholder:text-slate-600" : "bg-white text-slate-900 placeholder:text-slate-400"}`}
                    placeholder="• • • • • • • • • • •"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowIdValue((v) => !v)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md p-1 transition-colors ${
                      isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
                    }`}
                    aria-label={showIdValue ? "Hide number" : "Show number"}
                  >
                    {showIdValue ? (
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
                {/* Progress dots */}
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full transition-all duration-150 ${
                      i < identityValue.length
                        ? identityValue.length === 11 ? "bg-emerald-500" : "bg-blue-500"
                        : isDark ? "bg-[#222634]" : "bg-slate-200"
                    }`} />
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${
                  isDark ? "border-rose-500/20 bg-rose-500/10" : "border-rose-100 bg-rose-50"
                }`} role="alert">
                  <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-semibold text-rose-500">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || identityValue.length !== 11}
                className={`w-full rounded-xl px-4 py-3 text-sm font-extrabold text-white transition-all ${
                  identityValue.length === 11 && !loading
                    ? "bg-blue-600 hover:bg-blue-500 active:scale-[0.98] shadow-lg shadow-blue-500/20"
                    : "cursor-not-allowed bg-blue-600/40"
                }`}
              >
                {loading ? (
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

              {/* Security note */}
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2.5 ${
                isDark ? "bg-[#181B25]" : "bg-slate-50 border border-slate-100"
              }`}>
                <svg className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className={`text-[10px] leading-snug ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  Your {identityType.toUpperCase()} is sent directly to Monnify over an encrypted connection and is{" "}
                  <strong className={isDark ? "text-slate-400" : "text-slate-600"}>never stored</strong>{" "}
                  by AbbaKano.
                </p>
              </div>
            </form>
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
            /* Empty state when accounts are not yet provisioned */
            <div className={`rounded-2xl border p-5 text-center ${
              isDark ? "bg-[#181B25] border-[#222634]" : "bg-slate-50 border-slate-200"
            }`}>
              <p className={`text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Your dedicated bank account details are not available yet. Please try again shortly.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  fetchVirtualAccounts()
                    .then((res) => {
                      setVirtualAccounts(res.accounts || []);
                      setRequiresIdentity(res.requiresIdentity === true);
                    })
                    .catch((err) => setError(err instanceof Error ? err.message : "Failed to load accounts."))
                    .finally(() => setLoading(false));
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 cursor-pointer"
              >
                Refresh Accounts
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
