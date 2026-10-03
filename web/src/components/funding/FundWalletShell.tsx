"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";

type VirtualAccount = { provider?: string; bankName?: string; accountNumber?: string; accountName?: string; status?: "pending" | "active" | "failed"; error?: string | null };

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = { wallet: "M3 7h18v13H3zM3 7l2-4h14l2 4M16 13h5", bank: "M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M2 18h20M12 3l10 5H2l10-5Z", copy: "M8 8h11v12H8zM5 16H4V4h11v1", shield: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" };
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={paths[name] || paths.wallet} /></svg>;
}

export function FundWalletShell() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState<VirtualAccount | null>(null);
  const loading = false;
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [identityType, setIdentityType] = useState<"bvn" | "nin">("bvn");
  const [identityValue, setIdentityValue] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const fundingLockRef = useRef(false);
  const fundingAttemptRef = useRef(0);
  const countdownTimerRef = useRef<number | null>(null);
  const [fundingLocked, setFundingLocked] = useState(false);

  function goHome() {
    if (window.location.pathname === "/app") window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    else router.push("/app");
  }

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

  async function startPaystack(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (fundingLockRef.current) return;

  const value = Number(amount);

  if (
    !Number.isInteger(value) ||
    value < 100 ||
    value > 1_000_000
  ) {
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

    const { data, error } = await supabase.functions.invoke(
      "initialize-paystack",
      {
        body: {
          amount: value,
        },
      }
    );

    if (error) {
      console.error("Edge Function error:", error);
      throw error;
    }

    if (!data?.authorizationUrl) {
      throw new Error("Paystack did not return a checkout URL.");
    }

    window.location.assign(data.authorizationUrl);
  } catch (error) {
    console.error("Paystack initialization error:", error);

    setMessage(
      error instanceof Error
        ? error.message
        : "Could not start Paystack payment."
    );
    releaseFundingLock(attempt);
  }
}

async function createAccount(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!/^\d{11}$/.test(identityValue)) {
    setMessage(
      `Enter a valid 11-digit ${identityType.toUpperCase()}.`
    );
    return;
  }

  setMessage(
    "Dedicated virtual account setup will be connected next."
  );
}

  async function copyAccount() {
    if (!account?.accountNumber) return;
    await navigator.clipboard?.writeText(account.accountNumber); setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  return <main className="fund-page"><WebDesktopSidebar active="home" /><header className="fund-header"><button className="data-back" type="button" onClick={goHome}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" /></svg><span>Dashboard</span></button><p className="data-kicker">Wallet Funding</p><h1>Fund Wallet</h1><p>Virtual Accounts &amp; Auto-Credit Engine</p></header><section className="fund-content"><section className="fund-card paystack-card"><div className="fund-card-heading"><span className="fund-icon"><Icon name="wallet" /></span><div><h2>Fund with Paystack</h2><p>Card, USSD &amp; Bank Transfer</p></div></div><p>Make a secure wallet deposit through Paystack. Minimum ₦100.</p><form className="fund-form" onSubmit={startPaystack}><input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} placeholder="Amount to fund (₦)" inputMode="numeric" /><button className="fund-primary" type="submit" disabled={fundingLocked} aria-busy={fundingLocked}>{fundingLocked && <span className="fund-loading-spinner" aria-hidden="true" />}{fundingLocked ? "Proceeding to Paystack..." : "Proceed to Paystack Checkout"}</button></form></section><section className="fund-section"><div className="fund-section-heading"><div><p className="data-kicker">AUTO-SYNC</p><h2>Dedicated Transfer Accounts</h2></div><span className="fund-icon"><Icon name="bank" /></span></div>{loading ? <div className="fund-empty">Loading your virtual account...</div> : account?.status === "active" ? <div className="account-card"><div className="account-bank"><strong>{account.bankName || "Virtual Bank Account"}</strong><span>Recommended · Automated Virtual Gateway</span></div><p>Account Number</p><div className="account-number"><strong>{account.accountNumber}</strong><button type="button" onClick={() => void copyAccount()} aria-label="Copy account number"><Icon name="copy" />{copied ? "Copied!" : "Copy"}</button></div><div className="account-detail"><span>Beneficiary Account Name</span><strong>{account.accountName || "AbbaKano Wallet"}</strong></div><div className="account-status">Active · Auto-credit enabled</div></div> : <div className="fund-empty"><div className="fund-empty-icon"><Icon name="bank" /></div><h3>{account?.status === "failed" ? "Account creation failed" : "No virtual account yet"}</h3><p>{account?.error || "Create one when you are ready to fund by bank transfer. BVN or NIN is requested only for this account."}</p><button className="fund-secondary" type="button" onClick={() => setShowCreate(true)}>{account?.status === "failed" ? "Try Again" : "Create Virtual Account"}</button></div>}</section><div className="fund-security"><Icon name="shield" /><div><strong>NDPR Compliant &amp; Bank Grade Security</strong><p>Dedicated virtual accounts are issued by CBN-licensed financial institutions and protected with 256-bit encryption.</p></div></div>{message && <div className="fund-message" role="alert">{message}</div>}</section>{showCreate && <div className="data-modal-backdrop"><section className="data-modal fund-modal" role="dialog" aria-modal="true" aria-labelledby="fund-modal-title"><button className="data-modal-close" type="button" onClick={() => setShowCreate(false)} aria-label="Close account creation">x</button><p className="data-kicker">Secure funding</p><h2 id="fund-modal-title">Create Virtual Account</h2><p className="fund-modal-copy">Your identity is requested by the provider only for this dedicated account.</p><div className="identity-choice"><button className={identityType === "bvn" ? "active" : ""} type="button" onClick={() => setIdentityType("bvn")}>BVN</button><button className={identityType === "nin" ? "active" : ""} type="button" onClick={() => setIdentityType("nin")}>NIN</button></div><form className="fund-form" onSubmit={createAccount}><input value={identityValue} onChange={(event) => setIdentityValue(event.target.value.replace(/\D/g, ""))} maxLength={11} placeholder={`Enter 11-digit ${identityType.toUpperCase()}`} inputMode="numeric" /><button className="fund-primary" type="submit" disabled={creating}>{creating ? "Creating account..." : "Create Secure Account"}</button><button className="fund-cancel" type="button" onClick={() => setShowCreate(false)}>Cancel</button></form></section></div>}<WebBottomNav active="home" /></main>;
}
