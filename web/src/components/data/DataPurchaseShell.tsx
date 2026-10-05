"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { getWalletBalance, invokeSupabaseFunction } from "@/lib/supabase";
import { safeErrorMessage, sanitizeServiceMessage } from "@/lib/userFeedback";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";

type Network = "MTN" | "AIRTEL" | "GLO" | "9MOBILE";
type Category = "GENERAL" | "SME" | "GIFTING" | "DIRECT";
type Plan = { label: string; price: number; code: string; category?: string; selectionToken?: string; provider?: string; validityPeriod?: "daily" | "weekly" | "monthly"; purchaseAvailable?: boolean };
type Receipt = { status: string; message: string; reference?: string; label: string; network: Network; phone: string };

const networks: Array<{ id: Network; label: string; color: string; logo: string }> = [
  { id: "MTN", label: "MTN", color: "#ffcc00", logo: "/providers/mtn-logo.png" },
  { id: "AIRTEL", label: "Airtel", color: "#e60000", logo: "/providers/airtel-logo.png" },
  { id: "GLO", label: "Glo", color: "#27a844", logo: "/providers/glo-logo.png" },
  { id: "9MOBILE", label: "9mobile", color: "#84bd00", logo: "/providers/9mobile-logo.png" },
];

const categories: Array<{ id: Category; label: string }> = [
  { id: "GENERAL", label: "General" },
  { id: "SME", label: "SME Data" },
  { id: "GIFTING", label: "Gifting" },
  { id: "DIRECT", label: "Direct" },
];

const PLAN_CACHE_TTL_MS = 30_000;
const planCache = new Map<Network, { plans: Plan[]; expiresAt: number }>();
const planRequests = new Map<Network, Promise<Plan[]>>();

function loadCachedPlans(network: Network, forceReload = false) {
  if (forceReload) planCache.delete(network);
  const cachedPlans = planCache.get(network);
  if (cachedPlans && cachedPlans.expiresAt > Date.now()) return Promise.resolve(cachedPlans.plans);
  if (cachedPlans) planCache.delete(network);
  const pendingRequest = planRequests.get(network);
  if (pendingRequest) return pendingRequest;
  const request = invokeSupabaseFunction<{ plans: Plan[] }>("data-services", { network })
    .then((response) => {
      const nextPlans = response.plans;
      planCache.set(network, { plans: nextPlans, expiresAt: Date.now() + PLAN_CACHE_TTL_MS });
      return nextPlans;
    })
    .finally(() => planRequests.delete(network));
  planRequests.set(network, request);
  return request;
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}

function planCapacity(label: string) {
  const match = label.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();
  return amount * (unit === "KB" ? 1 / 1024 : unit === "GB" ? 1024 : unit === "TB" ? 1024 * 1024 : 1);
}

function sortPlans(items: Plan[]) {
  return [...items].sort((a, b) => {
    const capacityDifference = planCapacity(a.label) - planCapacity(b.label);
    if (capacityDifference !== 0) return capacityDifference;
    const priceDifference = a.price - b.price;
    if (priceDifference !== 0) return priceDifference;
    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
  });
}

function detectNetwork(value: string): Network | null {
  const digits = value.replace(/\D/g, "").replace(/^234/, "0");
  const prefixes: Record<Network, string[]> = {
    MTN: ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"],
    AIRTEL: ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912"],
    GLO: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
    "9MOBILE": ["0809", "0818", "0817", "0909", "0908"],
  };
  if (digits.length < 4) return null;
  return Object.entries(prefixes).find(([, values]) => values.includes(digits.slice(0, 4)))?.[0] as Network | undefined || null;
}

export function DataPurchaseShell({ onTabChange }: { onTabChange?: (tab: "home" | "data" | "history" | "profile") => void }) {
  const router = useRouter();
  const [network, setNetwork] = useState<Network>("MTN");
  const [category, setCategory] = useState<Category>("GENERAL");
  const [phone, setPhone] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [pin, setPin] = useState("");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const phoneDigits = phone.replace(/\D/g, "");
  const validPhone = /^(?:0\d{10}|234\d{10})$/.test(phoneDigits);

  useEffect(() => {
    let cancelled = false;
    void getWalletBalance().then((balance) => {
      if (!cancelled) setWalletBalance(balance);
    }).catch((error: unknown) => {
      if (!cancelled) console.error("Data wallet balance load failed:", error);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      setLoading(true);
      setErrorMessage("");
      try {
        const nextPlans = await loadCachedPlans(network, reloadKey > 0);
        if (cancelled) return;
        setPlans(sortPlans(nextPlans));
      } catch (error) {
        if (cancelled) return;
        setPlans([]);
        setErrorMessage(safeErrorMessage(error, "Could not load plans right now."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPlans();
    return () => { cancelled = true; };
  }, [network, reloadKey]);

  const availablePlans = plans.filter((plan) => {
    const planCategory = (plan.category || "GENERAL").toUpperCase();
    return planCategory === category;
  });
  const detectedNetwork = detectNetwork(phone);

  function chooseNetwork(nextNetwork: Network) {
    setNetwork(nextNetwork);
    setSelectedPlan(null);
  }

  function goHome() {
    if (window.location.pathname === "/app") window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    else router.push("/app");
  }

  function choosePhone(value: string) {
    const normalized = value.replace(/\D/g, "").slice(0, 11);
    setPhone(normalized);
    setSelectedPlan(null);
    const detected = detectNetwork(normalized);
    if (detected) chooseNetwork(detected);
  }

  function openCheckout() {
    if (!selectedPlan || !validPhone || selectedPlan.purchaseAvailable === false) return;
    setPurchaseMessage("");
    setPin("");
    setShowCheckout(true);
  }

  async function executePurchase(transactionAuthorization?: string) {
    if (selectedPlan?.purchaseAvailable === false) {
      setPurchaseMessage("This plan is listed by the administrator but is not yet connected to a provider purchase route.");
      setPurchasing(false);
      return;
    }
    if (!selectedPlan || phone.replace(/\D/g, "").length < 11 || (!transactionAuthorization && !/^\d{4}$/.test(pin))) {
      setPurchaseMessage("Enter a valid phone number and 4-digit transaction PIN.");
      setPurchasing(false);
      return;
    }
    setPurchasing(true);
    setPurchaseMessage("");
    try {
      if (!selectedPlan.selectionToken) {
        throw new Error("This data plan has expired. Reload plans and choose again.");
      }
      const result = await invokeSupabaseFunction<{
        message?: string;
        status?: string;
        reference?: string;
        balance_kobo?: number;
      }>("data-purchase", {
        network,
        phone,
        selectionToken: selectedPlan.selectionToken,
        idempotencyKey: crypto.randomUUID(),
        ...(transactionAuthorization ? { transactionAuthorization } : { pin }),
      });
      setShowCheckout(false);
      setReceipt({ status: result.status?.toLowerCase() === "pending" ? "pending" : "success", message: sanitizeServiceMessage(result.message || "Data purchase submitted successfully."), reference: result.reference, label: selectedPlan.label, network, phone });
      if (typeof result.balance_kobo === "number") {
        setWalletBalance(result.balance_kobo / 100);
      }
      window.dispatchEvent(new Event("dashboard-refresh"));
      setPin("");
    } catch (error) {
      setPurchaseMessage(safeErrorMessage(error, "Could not complete this purchase."));
    } finally {
      setPurchasing(false);
    }
  }

  async function submitPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await executePurchase();
  }

  async function authorizeBiometric() {
    setPurchasing(true);
    setPurchaseMessage("");
    try {
      const options = await invokeSupabaseFunction<Record<string, unknown>>(
        "passkey-auth",
        {
          action: "transaction-options",
          purchase: {
            network,
            phone,
            selectionToken: selectedPlan?.selectionToken,
          },
        },
      );
      const response = await startAuthentication({ optionsJSON: options as never });
      const authorization = await invokeSupabaseFunction<{ transactionAuthorization: string }>(
        "passkey-auth",
        { action: "transaction-verify", response },
      );
      await executePurchase(authorization.transactionAuthorization);
    } catch (error) {
      setPurchaseMessage(safeErrorMessage(error, "Biometric authorization was not completed."));
      setPurchasing(false);
    }
  }

  return (
    <main className="data-page"><WebDesktopSidebar active="data" />
      <header className="data-header"><button className="data-back" type="button" onClick={goHome}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" /></svg><span>Dashboard</span></button><div><p className="data-kicker">VTU Hub</p><h1>Buy Data Bundle</h1><p>Instant SME, Gifting &amp; Corporate Data</p></div></header>
      <section className="data-content">
        <div className="data-section-heading"><span>SELECT PROVIDER</span><small>{detectedNetwork ? `${detectedNetwork} detected` : "Choose a network"}</small></div>
        <div className="network-grid">{networks.map((item) => <button className={`network-card${network === item.id ? " selected" : ""}`} type="button" onClick={() => chooseNetwork(item.id)} key={item.id}><span className="network-logo" style={{ backgroundColor: item.color }}><Image src={item.logo} alt="" width={31} height={31} /></span><span>{item.label}</span>{network === item.id && <i />}</button>)}</div>

        <div className="data-tabs" role="tablist" aria-label="Data plan category">{categories.map((item) => <button className={category === item.id ? "active" : ""} type="button" role="tab" aria-selected={category === item.id} onClick={() => { setCategory(item.id); setSelectedPlan(null); }} key={item.id}>{item.label}</button>)}</div>
        <label className="data-phone-label">Recipient Phone Number {detectedNetwork && <small style={{ color: networks.find((item) => item.id === detectedNetwork)?.color }}>{detectedNetwork}</small>}<input value={phone} onChange={(event) => choosePhone(event.target.value)} placeholder="Enter 11-digit phone number" inputMode="numeric" maxLength={11} /></label>

        <div className="data-plans-heading"><span>AVAILABLE {network} {category} PLANS</span>{loading && <small>LOADING PLANS...</small>}</div>
        {errorMessage && <div className="data-message error" role="alert">{errorMessage}<button type="button" onClick={() => setReloadKey((current) => current + 1)}>Retry</button></div>}
        {!loading && !errorMessage && availablePlans.length === 0 && <div className="data-empty">No {category.toLowerCase()} plans are currently available for {network}.</div>}
        {!loading && !errorMessage && availablePlans.length > 0 && <div className="airtime-presets">{availablePlans.map((plan) => <button className={selectedPlan?.code === plan.code ? "active" : ""} type="button" aria-pressed={selectedPlan?.code === plan.code} onClick={() => setSelectedPlan(plan)} key={`${plan.code}-${plan.label}`}>{plan.label}{plan.validityPeriod ? ` · ${plan.validityPeriod[0].toUpperCase()}${plan.validityPeriod.slice(1)}` : ""}<br />{formatNaira(plan.price)}</button>)}</div>}
        {!loading && !errorMessage && network === "MTN" && category === "GENERAL" && availablePlans.some((plan) => plan.purchaseAvailable === false) && <p className="data-empty">MTN General plans can be viewed now. Purchases will be enabled when the new data provider is connected.</p>}
        <button className="airtime-submit" type="button" disabled={!validPhone || !selectedPlan || selectedPlan.purchaseAvailable === false || loading || purchasing} onClick={openCheckout}>{purchasing ? "Processing..." : selectedPlan?.purchaseAvailable === false ? "Purchases coming soon" : selectedPlan ? `Pay ${formatNaira(selectedPlan.price)}` : "Select a data plan"}</button>
      </section>

      {showCheckout && selectedPlan && <div className="data-modal-backdrop" role="presentation"><section className="data-modal review-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><button className="data-modal-close" type="button" onClick={() => setShowCheckout(false)} aria-label="Close checkout">x</button><p className="data-kicker">Review &amp; Confirm</p><h2 id="checkout-title">Transaction Summary</h2><div className="total-due"><span>TOTAL AMOUNT DUE</span><strong>{formatNaira(selectedPlan.price)}</strong></div><div className="transaction-summary"><div><span>Service</span><strong>{network} {selectedPlan.label}</strong></div><div><span>Beneficiary / Recipient</span><strong>{phone || "Not provided"}</strong></div><div><span>Package / Plan</span><strong>{selectedPlan.label}</strong></div><div><span>Payment Method</span><strong>AbbaKano Main Wallet</strong></div><div><span>Current Wallet Balance</span><strong>{walletBalance === null ? "—" : formatNaira(walletBalance)}</strong></div><div><span>Balance After Transaction</span><strong>{walletBalance === null ? "—" : formatNaira(walletBalance - selectedPlan.price)}</strong></div></div><form className="data-pin-form" onSubmit={submitPurchase}><label>Transaction PIN<div className="pin-authorization-row"><input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="Enter 4-digit PIN" autoComplete="current-password" /><button className="biometric-action" type="button" onClick={() => void authorizeBiometric()} disabled={purchasing} aria-label="Authorize with biometrics" title="Authorize with biometrics"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7.5 8.5a6 6 0 0 1 9 0M5 12a7 7 0 0 1 14 0M9.5 12a2.5 2.5 0 0 1 5 0v5M12 14.5V20M8 16v1a4 4 0 0 0 8 0v-1" /></svg></button></div></label>{purchaseMessage && <div className="data-message error" role="alert">{purchaseMessage}</div>}<button className="data-purchase-button" type="submit" disabled={purchasing}>{purchasing ? "Processing..." : "Confirm & Authorize PIN"}</button></form></section></div>}
      {receipt && <div className="data-modal-backdrop" role="presentation"><section className="data-modal receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title"><div className={`receipt-mark ${receipt.status}`} aria-hidden="true">{receipt.status === "pending" ? "..." : "✓"}</div><p className="data-kicker">{receipt.status === "pending" ? "Transaction pending" : "Transaction successful"}</p><h2 id="receipt-title">{receipt.label}</h2><div className="checkout-summary"><span>{receipt.network} Data<br />{receipt.phone}</span></div><p className="receipt-message">{receipt.message}</p>{receipt.reference && <p className="receipt-reference">Reference: <strong>{receipt.reference}</strong></p>}<button className="data-purchase-button" type="button" onClick={() => { setReceipt(null); goHome(); }}>Back to Dashboard</button></section></div>}
      <WebBottomNav active="data" onNavigate={onTabChange} />
    </main>
  );
}
