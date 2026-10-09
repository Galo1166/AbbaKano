"use client";

import { useEffect, useState } from "react";
import { invokeSupabaseFunction } from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/userFeedback";
import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";

type ReferralUser = {
  phone?: string;
  referralCount?: number;
  referralEarnings?: number;
  referralCommissionBalance?: number;
  referralsEnabled?: boolean;
  referralRewardNaira?: number;
};

export function ReferEarnShell({ initialUser }: { initialUser?: ReferralUser }) {
  const [user, setUser] = useState<ReferralUser | null>(initialUser || null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void invokeSupabaseFunction<ReferralUser>("referral-services", {
      action: "summary",
    }).then((summary) => {
      if (!cancelled) setUser(summary);
    }).catch((error) => {
      if (!cancelled) {
        setMessage(safeErrorMessage(error, "Could not load referral rewards."));
      }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const code = user?.phone?.replace(/\D/g, "") || "";
  const referralReward = user?.referralRewardNaira ?? 100;
  const shareText = `Join me on AbbaKano Data Sub! Use my registered phone number (${code}) as your referral code and get started with instant data and bill payments: https://abbakano.com/register?referralCode=${encodeURIComponent(code)}`;

  async function copyCode() {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareReferral() {
    if (navigator.share) await navigator.share({ title: "Join AbbaKano Data Sub", text: shareText });
    else window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  }

  async function withdraw() {
    setWithdrawing(true); setMessage("");
    try {
      const result = await invokeSupabaseFunction<{
        amount: number;
        walletBalance: number;
      }>("referral-services", { action: "withdraw" });
      setUser((current) => current ? {
        ...current,
        referralCommissionBalance: 0,
      } : current);
      window.dispatchEvent(new Event("dashboard-refresh"));
      setMessage(`N${result.amount} referral commission moved to your wallet successfully.`);
    } catch (error) {
      setMessage(safeErrorMessage(error, "Could not withdraw referral commission."));
    } finally { setWithdrawing(false); }
  }

  if (loading) return <main className="profile-state"><div className="dashboard-spinner" /><p>Loading referral rewards...</p></main>;

  return (
    <CustomerPageLayout active="profile" eyebrow="Referral & Rewards" title="Refer & Earn" subtitle="Invite Friends & Earn Commission">
      <section className="profile-content">
        {user?.referralsEnabled === false && (
          <div className="profile-message" role="status">
            The referral program is currently paused. Existing commission can still be withdrawn.
          </div>
        )}
        {user?.referralsEnabled !== false && (
          <>
            <section className="referral-page-hero"><p className="data-kicker">Unlimited Reseller Rewards</p><h2>Earn N{referralReward.toLocaleString()} For Every Friend You Invite</h2><p>Share your exclusive referral code and earn commission when a friend signs up with it.</p><span>+420 resellers earning daily</span></section>
            <section className="referral-code referral-page-code"><span>Your Referral Code (Phone No)</span><strong>{code || "Unavailable"}</strong><div><button type="button" onClick={() => void copyCode()}>{copied ? "Copied" : "Copy Code"}</button><button type="button" onClick={() => void shareReferral()}>Share Referral</button></div></section>
          </>
        )}
        <div className="referral-stats referral-page-stats"><div><strong>{user?.referralCount || 0}</strong><span>Referred Agents</span></div><div><strong>N{user?.referralEarnings || 0}</strong><span>Total Bonus · All-time</span></div><div><strong>N{user?.referralCommissionBalance || 0}</strong><span>Ready to Claim</span></div></div>
        <div className="referral-actions"><button type="button" onClick={() => void withdraw()} disabled={withdrawing || !(user?.referralCommissionBalance)}>{withdrawing ? "Withdrawing..." : "Withdraw Commission"}</button></div>
        {message && <div className="profile-message" role="status">{message}</div>}
        {user?.referralsEnabled !== false && (
          <section className="referral-steps"><h2>How it works</h2><div><strong>01</strong><span><b>Share Your Phone Number</b>Send your registered number as your referral code.</span></div><div><strong>02</strong><span><b>They Create an Account</b>Your friend signs up using your phone number as the referral code.</span></div><div><strong>03</strong><span><b>Unlock Referral Rewards</b>N{referralReward.toLocaleString()} is credited to your commission balance after their signup.</span></div></section>
        )}
      </section>
    </CustomerPageLayout>
  );
}
