"use client";

import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";

type Provider = "AEDC" | "IKEDC" | "KEDCO" | "PHED" | "JED";
type ServicePlan = { label: string; price: number; code: string; selectionToken: string; category?: string; provider?: string };
type Receipt = { status: string; message: string; reference?: string; provider: Provider; meterNumber: string; phone: string; amount: number; customerName?: string };

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
  const [message, setMessage] = useState("");
  const [pin, setPin] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    void apiRequest<{ balance: number }>('/wallet')
      .then((response) => setBalance(response.balance))
      .catch(() => {});

    void apiRequest<{ user?: { phone?: string } }>('/me')
      .then((response) => setAccountPhone(String(response.user?.phone || "")))
      .catch(() => setAccountPhone(""));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPlans() {
      setPlans([]);
      setSelectedPlan(null);
      try {
        const response = await apiRequest<{ plans: ServicePlan[] }>(`/vtu/service-plans?service=electricity&provider=${provider.toLowerCase()}&meterType=prepaid`);
        if (cancelled) return;
        const nextPlans = (response.plans || []).filter((plan) => typeof plan?.selectionToken === 'string' && plan.selectionToken.length > 0);
        setPlans(nextPlans);
        if (nextPlans.length > 0) setSelectedPlan(nextPlans[0]);
        else setSelectedPlan(null);
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof ApiError ? error.message : 'Could not load electricity plans.');
        }
      }
    }

    void loadPlans();
    return () => { cancelled = true; };
  }, [provider]);

  useEffect(() => {
    const meter = meterNumber.replace(/\D/g, "");
    if (meter.length < 8) {
      setCustomerName("");
      return;
    }

    const timer = window.setTimeout(() => {
      void apiRequest<{ customerName?: string }>('/vtu/verify-electricity', {
        method: 'POST',
        body: JSON.stringify({ provider: provider.toLowerCase(), meterNumber: meter }),
      }).then((response) => {
        setCustomerName(response.customerName || 'Verified customer');
      }).catch(() => setCustomerName(""));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [meterNumber, provider]);

  const numericAmount = Number(amount) || 0;
  const validPhone = /^(?:\+?234|0)\d{10}$/.test(accountPhone.replace(/\s+/g, ""));
  const validMeter = meterNumber.replace(/\D/g, "").length >= 8;
  const validAmount = Number.isInteger(numericAmount) && numericAmount >= 50 && numericAmount <= 100000;
  const canReview = validMeter && validPhone && validAmount && Boolean(selectedPlan && typeof selectedPlan.selectionToken === 'string' && selectedPlan.selectionToken.length > 0);

  function goHome() {
    if (window.location.pathname === '/app') {
      window.dispatchEvent(new CustomEvent('app-tab-change', { detail: 'home' }));
      return;
    }
    router.push('/app');
  }

  async function purchase(transactionAuthorization?: string) {
    if (!selectedPlan || !canReview || (!transactionAuthorization && !/^\d{4}$/.test(pin))) {
      setMessage('Enter a valid meter number, amount and 4-digit transaction PIN.');
      return;
    }

    setPurchasing(true);
    setMessage('');

    try {
      const result = await apiRequest<{ status?: string; message?: string; reference?: string }>('/vtu/electricity', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          network: provider,
          phone: accountPhone.replace(/[^\d]/g, ''),
          meterNumber: meterNumber.replace(/\D/g, ''),
          amount: numericAmount,
          planToken: selectedPlan.selectionToken,
          ...(transactionAuthorization ? { transactionAuthorization } : { pin }),
        }),
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
      setPin('');
      window.dispatchEvent(new Event('dashboard-refresh'));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Could not complete electricity purchase.');
    } finally {
      setPurchasing(false);
    }
  }

  async function authorizeBiometric() {
    setPurchasing(true);
    setMessage('');
    try {
      const options = await apiRequest<Record<string, unknown>>('/auth/passkey/transaction/options', { method: 'POST', body: JSON.stringify({}) });
      const response = await startAuthentication({ optionsJSON: options as never });
      const authorization = await apiRequest<{ transactionAuthorization: string }>('/auth/passkey/transaction/verify', { method: 'POST', body: JSON.stringify({ response }) });
      await purchase(authorization.transactionAuthorization);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Biometric authorization was not completed.');
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
            <button className={`network-card${provider === item.id ? ' selected' : ''}`} type="button" onClick={() => setProvider(item.id)} key={item.id}>
              <span className="network-logo" style={{ backgroundColor: '#f59e0b' }}><span>{item.label.slice(0, 2)}</span></span>
              <span>{item.label}</span>
              {provider === item.id && <i />}
            </button>
          ))}
        </div>

        <label className="data-phone-label">
          Meter Number
          <input value={meterNumber} onChange={(event) => setMeterNumber(event.target.value.replace(/\D/g, ''))} placeholder="Enter meter number" inputMode="numeric" />
        </label>

        {customerName && <div className="profile-message">Customer: {customerName}</div>}

        <label className="airtime-amount-label">
          Amount (NGN)
          <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="Enter amount (min. N50)" inputMode="numeric" />
        </label>

        <div className="airtime-presets-heading">PLAN TYPE</div>
        <div className="airtime-presets">
          {plans.length > 0 ? plans.map((plan) => (
            <button className={selectedPlan?.selectionToken === plan.selectionToken ? 'active' : ''} type="button" onClick={() => setSelectedPlan(plan)} key={plan.selectionToken}>{plan.label}</button>
          )) : <button type="button" className="active" disabled>No plan loaded</button>}
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
