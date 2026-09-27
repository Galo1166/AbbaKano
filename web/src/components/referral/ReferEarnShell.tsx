"use client";

import { useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";

type ReferralUser = { phone?: string; referralCount?: number; referralEarnings?: number; referralCommissionBalance?: number };

export function ReferEarnShell({ initialUser }: { initialUser?: ReferralUser }) {
  const [user, setUser] = useState<ReferralUser | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (initialUser) return;
    let cancelled = false;
    void apiRequest<{ user: ReferralUser }>("/me").then((response) => {
      if (!cancelled) setUser(response.user);
    }).catch((error) => {
      if (!cancelled) setMessage(error instanceof ApiError ? error.message : "Could not load referral rewards.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialUser]);

  const code = user?.phone?.replace(/\D/g, "") || "";
  const shareText = `Join me on AbbaKano Data Sub! Use my registered phone number (${code}) as your referral code and get started with instant data and bill payments: https://abbakano.com/r/${code}`;

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
      await apiRequest("/referrals/commission/withdraw", { method: "POST", body: JSON.stringify({}) });
      setUser((current) => current ? { ...current, referralCommissionBalance: 0 } : current);
      setMessage("Referral commission moved to your wallet successfully.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not withdraw referral commission.");
    } finally { setWithdrawing(false); }
  }

  if (loading) return <main className="profile-state"><div className="dashboard-spinner" /><p>Loading referral rewards...</p></main>;

  return (
    <CustomerPageLayout active="profile" eyebrow="Referral & Rewards" title="Refer & Earn" subtitle="Invite Friends & Earn Commission">
      <section className="profile-content">
        <section className="referral-page-hero"><p className="data-kicker">Unlimited Reseller Rewards</p><h2>Earn N100 For Every Friend You Invite</h2><p>Share your exclusive referral code and earn commission when your friends fund and subscribe.</p><span>+420 resellers earning daily</span></section>
        <div className="referral-stats referral-page-stats"><div><strong>{user?.referralCount || 0}</strong><span>Referred Agents</span></div><div><strong>N{user?.referralEarnings || 0}</strong><span>Total Bonus · All-time</span></div><div><strong>N{user?.referralCommissionBalance || 0}</strong><span>Ready to Claim</span></div></div>
        <section className="referral-code referral-page-code"><span>Your Referral Code (Phone No)</span><strong>{code || "Unavailable"}</strong><div><button type="button" onClick={() => void copyCode()}>{copied ? "Copied" : "Copy Code"}</button><button type="button" onClick={() => void shareReferral()}>Share Referral</button></div></section>
        <div className="referral-actions"><button type="button" onClick={() => void withdraw()} disabled={withdrawing || !(user?.referralCommissionBalance)}>{withdrawing ? "Withdrawing..." : "Withdraw Commission"}</button></div>
        {message && <div className="profile-message" role="status">{message}</div>}
        <section className="referral-steps"><h2>How it works</h2><div><strong>01</strong><span><b>Share Your Phone Number</b>Send your registered number as your referral code.</span></div><div><strong>02</strong><span><b>They Fund &amp; Subscribe</b>Your friend creates an account and completes a purchase.</span></div><div><strong>03</strong><span><b>Unlock Referral Rewards</b>You receive N100 instantly into your commission balance.</span></div></section>
      </section>
    </CustomerPageLayout>
  );
}
