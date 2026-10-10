"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { invokeSupabaseFunction } from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/userFeedback";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { useThemeMode } from "@/lib/theme";

type ReferralUser = {
  phone?: string;
  referralCount?: number;
  referralEarnings?: number;
  referralCommissionBalance?: number;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function ReferEarnShell({ initialUser }: { initialUser?: ReferralUser }) {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";
  const [user, setUser] = useState<ReferralUser | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  function goHome() {
    if (window.location.pathname === "/app") window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    else router.push("/app");
  }

  useEffect(() => {
    let cancelled = false;
    void invokeSupabaseFunction<ReferralUser>("referral-services", {
      action: "summary",
    }).then((summary) => {
      if (!cancelled) setUser(summary);
    }).catch((error) => {
      if (!cancelled) setMessage(safeErrorMessage(error, "Could not load referral rewards."));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const code = user?.phone?.replace(/\D/g, "") || "";
  const shareText = `Join me on AbbaKano Data Sub! Use my registered phone number (${code}) as your referral code and get started with instant data and bill payments: https://abbakano.com/register?referralCode=${encodeURIComponent(code)}`;

  async function copyCode() {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function shareReferral() {
    if (navigator.share) {
      await navigator.share({ title: "Join AbbaKano Data Sub", text: shareText });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
    }
  }

  async function withdraw() {
    setWithdrawing(true);
    setMessage("");
    try {
      const result = await invokeSupabaseFunction<{
        amount: number;
        walletBalance: number;
      }>("referral-services", { action: "withdraw" });
      setUser((current) => current ? { ...current, referralCommissionBalance: 0 } : current);
      window.dispatchEvent(new Event("dashboard-refresh"));
      setMessage(`₦${result.amount} referral commission moved to your wallet successfully.`);
    } catch (error) {
      setMessage(safeErrorMessage(error, "Could not withdraw referral commission."));
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <main className={`min-h-screen transition-colors duration-200 antialiased pb-32 ${isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"}`}>
      <WebDesktopSidebar active="profile" />
      <WebDesktopSidebar active="profile" />

      <div className="mx-auto w-full max-w-md px-4 pt-3 space-y-4">
        {/* Header - Pixel-Matched to Mobile App */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={goHome}
            aria-label="Back to dashboard"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer ${isDark ? "bg-[#141721] border-[#222634] text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className={`text-xl font-extrabold tracking-tight truncate ${isDark ? "text-white" : "text-slate-900"}`}>
              Refer &amp; Earn
            </h1>
            <p className={`text-xs font-semibold truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Invite Friends &amp; Earn Commission
            </p>
          </div>
        </header>

        {message && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-400">
            {message}
          </div>
        )}

        {/* Hero Rewards Card */}
        <section className={`rounded-2xl border p-4 transition-colors ${
          isDark ? "border-[#222634] bg-[#141721]" : "border-slate-200 bg-white shadow-xs"
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500 border border-purple-500/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Unlimited Reseller Rewards</span>
              <h2 className={`text-base font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                Earn ₦100 For Every Friend You Invite
              </h2>
              <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Share your exclusive referral code. When they fund their wallet and purchase their first bundle, you earn instant commission!
              </p>
            </div>
          </div>

          <div className={`mt-3 flex items-center gap-2 pt-2.5 border-t ${isDark ? "border-[#222634]" : "border-slate-100"}`}>
            <div className="flex -space-x-1.5">
              {["MA", "FK", "IB"].map((initials, idx) => (
                <div
                  key={idx}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-white dark:border-slate-900 bg-purple-600 text-[9px] font-bold text-white shadow-2xs"
                >
                  {initials}
                </div>
              ))}
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-bold ${
                isDark ? "border-slate-900 bg-slate-800 text-purple-300" : "border-white bg-slate-100 text-purple-700 shadow-2xs"
              }`}>
                +420
              </div>
            </div>
            <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>resellers earning daily</span>
          </div>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 gap-2.5">
          <div className={`rounded-2xl border p-3.5 transition-colors ${
            isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200 shadow-xs"
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Referred</span>
            <p className={`mt-0.5 font-mono text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
              {user?.referralCount || 0} Agents
            </p>
            <div className={`mt-2 border-t pt-1.5 flex justify-between text-[11px] ${
              isDark ? "border-[#222634] text-slate-400" : "border-slate-100 text-slate-500"
            }`}>
              <span>Total Bonus</span>
              <span className="font-mono font-bold text-purple-500">{formatNaira(user?.referralEarnings || 0)}</span>
            </div>
          </div>

          <div className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-colors ${
            isDark
              ? "border-emerald-500/30 bg-emerald-950/20"
              : "border-emerald-200 bg-emerald-50/70 shadow-xs"
          }`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ready to Claim</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[8px] font-bold text-emerald-600 dark:text-emerald-400">Instant</span>
              </div>
              <p className="mt-0.5 font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                {formatNaira(user?.referralCommissionBalance || 0)}
              </p>
            </div>
            <button
              type="button"
              disabled={Boolean(withdrawing || !user?.referralCommissionBalance)}
              onClick={() => void withdraw()}
              className="mt-2 w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-1.5 text-center text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-40"
            >
              {withdrawing ? "Transferring..." : "Transfer to Wallet"}
            </button>
          </div>
        </section>

        {/* Referral Code Box */}
        <section className={`rounded-2xl border p-3.5 transition-colors ${
          isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200 shadow-xs"
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Your Referral Code (Phone No)
          </span>
          <div className="mt-2 flex gap-2 items-center">
            <div className={`h-11 flex-1 flex items-center px-3.5 rounded-xl border font-mono text-sm sm:text-base font-bold transition-colors ${
              isDark
                ? "bg-[#0b0e14] border-[#1e2330] text-blue-400"
                : "bg-slate-50 border-slate-200 text-blue-600"
            }`}>
              {code || "Unavailable"}
            </div>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer shrink-0"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => void shareReferral()}
              className={`h-11 rounded-xl px-4 text-xs sm:text-sm font-bold transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? "bg-[#181B25] border border-[#222634] text-slate-200 hover:bg-[#1e2330]"
                  : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 shadow-2xs"
              }`}
            >
              Share
            </button>
          </div>
        </section>

        {/* How It Works */}
        <section className={`rounded-2xl border p-3.5 space-y-2.5 transition-colors ${
          isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200 shadow-xs"
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            How it works
          </span>
          {[
            { step: "01", title: "Share Your Phone Number", desc: "Give your registered phone number as your referral code." },
            { step: "02", title: "They Fund & Subscribe", desc: "When your friend signs up and funds their wallet, you earn." },
            { step: "03", title: "Unlock Referral Rewards", desc: "₦100 is credited instantly to your commission balance." },
          ].map((st) => (
            <div
              key={st.step}
              className={`flex gap-2.5 items-start rounded-xl p-2.5 border transition-colors ${
                isDark
                  ? "bg-[#0b0e14] border-[#1e2330]"
                  : "bg-slate-50 border-slate-200 shadow-2xs"
              }`}
            >
              <span className="font-mono text-xs font-black text-purple-500 pt-0.5">{st.step}</span>
              <div>
                <p className={`text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{st.title}</p>
                <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-600"}`}>{st.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <WebBottomNav active="profile" />
    </main>
  );
}
