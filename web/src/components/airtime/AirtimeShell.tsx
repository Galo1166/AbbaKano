"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";

type Network = "MTN" | "AIRTEL" | "GLO" | "9MOBILE";
type Receipt = { status: string; message: string; reference?: string; network: Network; phone: string; amount: number };
const presets = [100, 200, 500, 1000, 2000, 5000, 10000];
const networks: Array<{ id: Network; label: string; color: string; logo: string }> = [
  { id: "MTN", label: "MTN", color: "#ffcc00", logo: "/providers/mtn-logo.png" },
  { id: "AIRTEL", label: "Airtel", color: "#e60000", logo: "/providers/airtel-logo.png" },
  { id: "GLO", label: "Glo", color: "#27a844", logo: "/providers/glo-logo.png" },
  { id: "9MOBILE", label: "9mobile", color: "#84bd00", logo: "/providers/9mobile-logo.png" },
];

function detectNetwork(value: string): Network | null {
  const digits = value.replace(/\D/g, "").replace(/^234/, "0");
  const prefixes: Record<Network, string[]> = { MTN: ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"], AIRTEL: ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912"], GLO: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"], "9MOBILE": ["0809", "0818", "0817", "0909", "0908"] };
  if (digits.length < 4) return null;
  return Object.entries(prefixes).find(([, values]) => values.includes(digits.slice(0, 4)))?.[0] as Network | undefined || null;
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}

function Fingerprint() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 8.5a5 5 0 0 1 8 0M5 12a7 7 0 0 1 14 0M9.5 12a2.5 2.5 0 0 1 5 0v5M12 15v6" /></svg>;
}

function SuccessIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
}

export function AirtimeShell() {
  const router = useRouter();
  const [network, setNetwork] = useState<Network | null>(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("500");
  const [balance, setBalance] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    void apiRequest<{ balance: number }>("/wallet").then((response) => setBalance(response.balance)).catch(() => {});
  }, []);

  const numericAmount = Number(amount);
  const detected = detectNetwork(phone);
  const selectedNetwork = detected || network;
  const validPhone = phone.replace(/\D/g, "").length === 11;
  const validAmount = Number.isInteger(numericAmount) && numericAmount >= 50 && numericAmount <= 100000;

  function goHome() {
    if (window.location.pathname === "/app") window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    else router.push("/app");
  }

  function updatePhone(value: string) {
    setPhone(value);
    const next = detectNetwork(value);
    if (next) setNetwork(next);
  }

  async function purchase(transactionAuthorization?: string) {
    if (!selectedNetwork || !validPhone || !validAmount || (!transactionAuthorization && !/^\d{4}$/.test(pin))) { setMessage("Select a network, enter an 11-digit phone number, and authorize the payment."); return; }
    setPurchasing(true); setMessage("");
    try {
      const result = await apiRequest<{ status?: string; message?: string; reference?: string }>("/vtu/airtime", { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ network: selectedNetwork, phone, amount: numericAmount, ...(transactionAuthorization ? { transactionAuthorization } : { pin }) }) });
      setShowCheckout(false); setReceipt({ status: result.status === "pending" ? "pending" : "success", message: result.message || "Airtime recharge submitted successfully.", reference: result.reference, network: selectedNetwork, phone, amount: numericAmount }); setPin(""); window.dispatchEvent(new Event("dashboard-refresh"));
    } catch (error) { setMessage(error instanceof ApiError ? error.message : "Could not complete airtime recharge."); }
    finally { setPurchasing(false); }
  }

  async function authorizeBiometric() {
    setPurchasing(true); setMessage("");
    try {
      const options = await apiRequest<Record<string, unknown>>("/auth/passkey/transaction/options", { method: "POST", body: JSON.stringify({}) });
      const response = await startAuthentication({ optionsJSON: options as never });
      const authorization = await apiRequest<{ transactionAuthorization: string }>("/auth/passkey/transaction/verify", { method: "POST", body: JSON.stringify({ response }) });
      await purchase(authorization.transactionAuthorization);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Biometric authorization was not completed.");
      setPurchasing(false);
    }
  }

  return (
    <main className="airtime-page"><WebDesktopSidebar />
      <header className="airtime-header"><button className="airtime-back" type="button" onClick={goHome}>Dashboard</button><p className="data-kicker">VTU Hub</p><h1>Airtime Topup</h1><p>Instant VTU Airtime Recharge</p></header>
      <section className="airtime-content">
        <div className="data-section-heading"><span>SELECT PROVIDER</span><small>{detected ? `${detected} detected` : "Choose a network"}</small></div>
        <div className="network-grid">{networks.map((item) => <button className={`network-card${selectedNetwork === item.id ? " selected" : ""}`} type="button" onClick={() => setNetwork(item.id)} key={item.id}><span className="network-logo" style={{ backgroundColor: item.color }}><Image src={item.logo} alt="" width={31} height={31} /></span><span>{item.label}</span>{selectedNetwork === item.id && <i />}</button>)}</div>
        <label className="data-phone-label">Recipient Phone Number<input value={phone} onChange={(event) => updatePhone(event.target.value)} placeholder="Enter phone number" inputMode="tel" /></label>
        <label className="airtime-amount-label">Amount<input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} placeholder="Enter amount (min. N50)" inputMode="numeric" /></label>
        <div className="airtime-presets-heading">OR SELECT AMOUNT</div>
        <div className="airtime-presets">{presets.map((preset) => <button className={Number(amount) === preset ? "active" : ""} type="button" onClick={() => setAmount(String(preset))} key={preset}>{formatNaira(preset)}</button>)}</div>
        {message && <div className="data-message error" role="alert">{message}</div>}
        <button className="airtime-submit" type="button" disabled={!selectedNetwork || !validPhone || !validAmount || purchasing} onClick={() => { setMessage(""); setShowCheckout(true); }}>{purchasing ? "Processing..." : !validAmount ? "Enter an amount from N50" : !validPhone ? "Enter 11-digit phone number" : `Pay ${formatNaira(numericAmount)}`}</button>
      </section>
      {showCheckout && selectedNetwork && <div className="data-modal-backdrop"><section className="data-modal review-modal" role="dialog" aria-modal="true" aria-labelledby="airtime-checkout-title"><button className="data-modal-close" type="button" onClick={() => setShowCheckout(false)} aria-label="Close checkout">x</button><p className="data-kicker">Review &amp; Confirm</p><h2 id="airtime-checkout-title">Transaction Summary</h2><div className="total-due"><span>TOTAL AMOUNT DUE</span><strong>{formatNaira(numericAmount)}</strong></div><div className="transaction-summary"><div><span>Service</span><strong>{selectedNetwork} Airtime Recharge</strong></div><div><span>Beneficiary / Recipient</span><strong>{phone}</strong></div><div><span>Payment Method</span><strong>AbbaKano Main Wallet</strong></div><div><span>Current Wallet Balance</span><strong>{balance === null ? "Loading..." : formatNaira(balance)}</strong></div><div><span>Balance After Transaction</span><strong>{balance === null ? "Loading..." : formatNaira(balance - numericAmount)}</strong></div></div><form className="data-pin-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void purchase(); }}><label>Transaction PIN<div className="pin-authorization-row"><input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} placeholder="Enter 4-digit PIN" /><button className="biometric-action" type="button" onClick={() => void authorizeBiometric()} aria-label="Authorize with biometrics" title="Authorize with biometrics"><Fingerprint /></button></div></label><button className="data-purchase-button" type="submit" disabled={purchasing}>{purchasing ? "Processing..." : "Confirm & Authorize PIN"}</button></form></section></div>}
      {receipt && <div className="data-modal-backdrop"><section className="data-modal receipt-modal airtime-receipt" role="dialog" aria-modal="true" aria-labelledby="airtime-receipt-title"><div className={`receipt-mark ${receipt.status}`}>{receipt.status === "pending" ? "..." : <SuccessIcon />}</div><p className="data-kicker">{receipt.status === "pending" ? "Transaction Pending" : "Transaction Successful"}</p><h2 id="airtime-receipt-title">{receipt.network} Airtime Recharge</h2><p className="receipt-lead">{receipt.status === "pending" ? receipt.message : "Payment processed and delivered instantly"}</p><div className="airtime-receipt-amount"><span>AMOUNT PAID</span><strong>{formatNaira(receipt.amount)}</strong></div><div className="transaction-summary airtime-receipt-details"><div><span>Reference ID</span><strong>{receipt.reference || "Pending"}</strong></div><div><span>Beneficiary</span><strong>{receipt.phone}</strong></div><div><span>Payment Method</span><strong>AbbaKano Wallet</strong></div><div><span>Status</span><strong className="receipt-complete">{receipt.status === "pending" ? "PENDING" : "COMPLETED"}</strong></div></div><button className="receipt-done-button" type="button" onClick={() => setReceipt(null)}>Done</button></section></div>}
      <WebBottomNav active="home" />
    </main>
  );
}
