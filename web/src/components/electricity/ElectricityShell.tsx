"use client";

import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useEffect, useState } from "react";
import { getWalletBalance, invokeSupabaseFunction, supabase } from "@/lib/supabase";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";

type Provider = "AEDC" | "IKEDC" | "KEDCO" | "PHED" | "JED";
type ServicePlan = { label: string; price: number; code: string; category?: string; provider?: string };
type Receipt = { status: string; message: string; reference?: string; provider: Provider; meterNumber: string; phone: string; amount: number; customerName?: string };
type MeterVerification = "idle" | "checking" | "verified" | "error";

const providers: Array<{ id: Provider; label: string }> = [
  { id: "AEDC", label: "AEDC" },
  { id: "IKEDC", label: "IKEDC" },
  { id: "KEDCO", label: "KEDCO" },
  { id: "PHED", label: "PHED" },
  { id: "JED", label: "JED" },
];

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount || 0);
}

function Fingerprint() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 8.5a5 5 0 0 1 8 0M5 12a7 7 0 0 1 14 0M9.5 12a2.5 2.5 0 0 1 5 0v5M12 15v6" /></svg>;
}

function SuccessIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
}

export function ElectricityShell() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("AEDC");
  const [meterNumber, setMeterNumber] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [amount, setAmount] = useState("500");
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ServicePlan | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [meterVerification, setMeterVerification] = useState<MeterVerification>("idle");
  const [verifiedSelectionToken, setVerifiedSelectionToken] = useState("");
  const [message, setMessage] = useState("");
  const [pin, setPin] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    void getWalletBalance()
      .then(setBalance)
      .catch((error: unknown) => console.error("Electricity wallet balance load failed:", error));

    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (error) throw error;
      if (!data.user) throw new Error("Authentication required.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      setAccountPhone(String(profile?.phone || ""));
    }).catch((error: unknown) => {
      console.error("Electricity profile load failed:", error);
      setMessage("Could not load your profile phone number. Refresh and try again.");
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      setPlansLoading(true);
      setPlans([]);
      setSelectedPlan(null);
      setMessage("");
      try {
        const response = await invokeSupabaseFunction<{ plans: ServicePlan[] }>(
          "electricity-services",
          { action: "plans", provider },
        );
        if (cancelled) return;
        const nextPlans = (response.plans || []).filter((plan) => Boolean(plan?.code));
        setPlans(nextPlans);
        if (nextPlans.length > 0) setSelectedPlan(nextPlans[0]);
        else setSelectedPlan(null);
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Could not load electricity plans.");
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    }

    void loadPlans();
    return () => { cancelled = true; };
  }, [provider]);

  useEffect(() => {
    let cancelled = false;
    const meter = meterNumber.replace(/\D/g, "");
    if (!/^\d{8,14}$/.test(meter)) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setMeterVerification("checking");
      setCustomerName("");
      setVerifiedSelectionToken("");
      void invokeSupabaseFunction<{ customerName: string; selectionToken: string }>(
        "electricity-services",
        { action: "verify-meter", provider, meterNumber: meter },
      ).then((response) => {
        if (cancelled) return;
        setCustomerName(response.customerName);
        setVerifiedSelectionToken(response.selectionToken);
        setMeterVerification("verified");
      }).catch((error: unknown) => {
        if (cancelled) return;
        setCustomerName("");
        setVerifiedSelectionToken("");
        setMeterVerification("error");
        setMessage(error instanceof Error ? error.message : "Could not verify this electricity meter.");
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [meterNumber, provider]);

  const numericAmount = Number(amount) || 0;
  const validPhone = /^(?:\+?234|0)\d{10}$/.test(accountPhone.replace(/\s+/g, ""));
  const validMeter = /^\d{8,14}$/.test(meterNumber.replace(/\D/g, ""));
  const validAmount = Number.isInteger(numericAmount) && numericAmount >= 50 && numericAmount <= 100000;
  const canReview = validMeter && validPhone && validAmount &&
    meterVerification === "verified" && Boolean(verifiedSelectionToken && selectedPlan);

  function chooseProvider(nextProvider: Provider) {
    setProvider(nextProvider);
    setCustomerName("");
    setVerifiedSelectionToken("");
    setMeterVerification("idle");
    setMessage("");
  }

  function changeMeter(value: string) {
    setMeterNumber(value.replace(/\D/g, "").slice(0, 14));
    setCustomerName("");
    setVerifiedSelectionToken("");
    setMeterVerification("idle");
    setMessage("");
  }

  function goHome() {
    if (window.location.pathname === '/app') {
      window.dispatchEvent(new CustomEvent('app-tab-change', { detail: 'home' }));
      return;
    }
    router.push('/app');
  }

  async function purchase(transactionAuthorization?: string) {
    if (!selectedPlan || !verifiedSelectionToken || !canReview || (!transactionAuthorization && !/^\d{4}$/.test(pin))) {
      setMessage('Enter a valid meter number, amount and 4-digit transaction PIN.');
      return;
    }

    setPurchasing(true);
    setMessage('');

    try {
      const result = await invokeSupabaseFunction<{
        status?: string;
        message?: string;
        reference?: string;
        balance_kobo?: number;
      }>("electricity-purchase", {
        provider,
        meterNumber: meterNumber.replace(/\D/g, ""),
        amount: numericAmount,
        selectionToken: verifiedSelectionToken,
        idempotencyKey: crypto.randomUUID(),
        ...(transactionAuthorization ? { transactionAuthorization } : { pin }),
      });

      setShowCheckout(false);
      setReceipt({
        status: result.status === 'pending' ? 'pending' : 'success',
        message: result.message || 'Electricity purchase submitted successfully.',
        reference: result.reference,
        provider,
        meterNumber: meterNumber.replace(/\D/g, ''),
        phone: accountPhone.replace(/[^\d]/g, ''),
        amount: numericAmount,
        customerName,
      });
      if (typeof result.balance_kobo === "number") {
        setBalance(result.balance_kobo / 100);
      }
      setPin('');
      window.dispatchEvent(new Event('dashboard-refresh'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete electricity purchase.');
    } finally {
      setPurchasing(false);
    }
  }

  async function authorizeBiometric() {
    if (!verifiedSelectionToken) {
      setMessage("Verify the meter before authorizing the purchase.");
      return;
    }
    setPurchasing(true);
    setMessage('');
    try {
      const options = await invokeSupabaseFunction<Record<string, unknown>>(
        "passkey-auth",
        {
          action: "transaction-options",
          purchase: {
            network: provider,
            phone: accountPhone.replace(/\D/g, "").replace(/^234/, "0"),
            selectionToken: verifiedSelectionToken,
            amount: numericAmount,
          },
        },
      );
      const response = await startAuthentication({ optionsJSON: options as never });
      const authorization = await invokeSupabaseFunction<{ transactionAuthorization: string }>(
        "passkey-auth",
        { action: "transaction-verify", response },
      );
      await purchase(authorization.transactionAuthorization);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Biometric authorization was not completed.');
      setPurchasing(false);
    }
  }

  return (
    <main className="airtime-page">
      <WebDesktopSidebar active="data" />
      <header className="airtime-header">
        <button className="data-back" type="button" onClick={goHome}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" /></svg><span>Dashboard</span></button>
        <p className="data-kicker">VTU Hub</p>
        <h1>Electricity Bill</h1>
        <p>Prepaid electricity top-up and bill settlement</p>
      </header>

      <section className="airtime-content">
        <div className="data-section-heading">
          <span>SELECT DISTRIBUTION COMPANY</span>
          <small>{provider}</small>
        </div>
        <div className="network-grid">
          {providers.map((item) => (
            <button className={`network-card${provider === item.id ? ' selected' : ''}`} type="button" onClick={() => chooseProvider(item.id)} key={item.id}>
              <span className="network-logo" style={{ backgroundColor: '#f59e0b' }}><span>{item.label.slice(0, 2)}</span></span>
              <span>{item.label}</span>
              {provider === item.id && <i />}
            </button>
          ))}
        </div>

        <label className="data-phone-label">
          Meter Number
          <input value={meterNumber} onChange={(event) => changeMeter(event.target.value)} placeholder="Enter 8–14 digit meter number" inputMode="numeric" maxLength={14} minLength={8} />
        </label>

        {meterVerification === "checking" && <div className="profile-message" role="status">Verifying meter...</div>}
        {customerName && <div className="profile-message">Customer: {customerName}</div>}

        <label className="airtime-amount-label">
          Amount (NGN)
          <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="Enter amount (min. N50)" inputMode="numeric" />
        </label>

        <div className="airtime-presets-heading">PLAN TYPE</div>
        <div className="airtime-presets">
          {plans.length > 0 ? plans.map((plan) => (
            <button className={selectedPlan?.code === plan.code ? 'active' : ''} type="button" onClick={() => setSelectedPlan(plan)} key={plan.code}>{plan.label}</button>
          )) : <button type="button" className="active" disabled>{plansLoading ? "Loading plan..." : "No plan loaded"}</button>}
        </div>

        {message && <div className="data-message error" role="alert">{message}</div>}

        <button className="airtime-submit" type="button" disabled={!canReview || purchasing} onClick={() => setShowCheckout(true)}>{purchasing ? 'Processing...' : `Pay ${formatNaira(numericAmount)}`}</button>
      </section>

      {showCheckout && selectedPlan && (
        <div className="data-modal-backdrop" role="presentation">
          <section className="data-modal review-modal" role="dialog" aria-modal="true" aria-labelledby="electricity-checkout-title">
            <button className="data-modal-close" type="button" onClick={() => setShowCheckout(false)} aria-label="Close checkout">x</button>
            <p className="data-kicker">Review &amp; Confirm</p>
            <h2 id="electricity-checkout-title">Transaction Summary</h2>
            <div className="total-due"><span>Total Amount Due</span><strong>{formatNaira(numericAmount)}</strong></div>
            <div className="transaction-summary">
              <div><span>Service</span><strong>{provider} Electricity</strong></div>
              <div><span>Meter Number</span><strong>{meterNumber.replace(/\D/g, '')}</strong></div>
              <div><span>Customer</span><strong>{customerName || 'Verified customer'}</strong></div>
              <div><span>Current Wallet Balance</span><strong>{balance === null ? 'Loading...' : formatNaira(balance)}</strong></div>
              <div><span>Balance After Transaction</span><strong>{balance === null ? 'Loading...' : formatNaira(balance - numericAmount)}</strong></div>
            </div>
            <form className="data-pin-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void purchase(); }}>
              <label>
                Transaction PIN
                <div className="pin-authorization-row">
                  <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} placeholder="Enter 4-digit PIN" />
                  <button className="biometric-action" type="button" onClick={() => void authorizeBiometric()} aria-label="Authorize with biometrics" title="Authorize with biometrics"><Fingerprint /></button>
                </div>
              </label>
              <button className="data-purchase-button" type="submit" disabled={purchasing}>{purchasing ? 'Processing...' : 'Confirm & Authorize PIN'}</button>
            </form>
          </section>
        </div>
      )}

      {receipt && (
        <div className="data-modal-backdrop" role="presentation">
          <section className="data-modal receipt-modal airtime-receipt" role="dialog" aria-modal="true" aria-labelledby="electricity-receipt-title">
            <div className={`receipt-mark ${receipt.status}`}>{receipt.status === 'pending' ? '...' : <SuccessIcon />}</div>
            <p className="data-kicker">{receipt.status === 'pending' ? 'Transaction Pending' : 'Transaction Successful'}</p>
            <h2 id="electricity-receipt-title">{receipt.provider} Electricity</h2>
            <p className="receipt-lead">{receipt.customerName ? `Customer: ${receipt.customerName}` : 'Meter verified and prepared for payment.'}</p>
            <div className="airtime-receipt-amount"><span>AMOUNT PAID</span><strong>{formatNaira(receipt.amount)}</strong></div>
            <div className="transaction-summary airtime-receipt-details">
              <div><span>Reference ID</span><strong>{receipt.reference || 'Pending'}</strong></div>
              <div><span>Meter Number</span><strong>{receipt.meterNumber}</strong></div>
              <div><span>Status</span><strong className="receipt-complete">{receipt.status === 'pending' ? 'PENDING' : 'COMPLETED'}</strong></div>
            </div>
            <button className="receipt-done-button" type="button" onClick={() => { setReceipt(null); goHome(); }}>Back to Dashboard</button>
          </section>
        </div>
      )}

      <WebBottomNav active="data" />
    </main>
  );
}
