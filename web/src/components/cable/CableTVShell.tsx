"use client";

import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";

type Provider = "DSTV" | "GOTV" | "STARTIMES";
type CablePlan = { label: string; price: number; code: string; selectionToken: string; category?: string; provider?: string };
type Receipt = { status: string; message: string; reference?: string; provider: Provider; smartcardNumber: string; phone: string; amount: number; customerName?: string };

const providers: Array<{ id: Provider; label: string }> = [
  { id: "DSTV", label: "DSTV" },
  { id: "GOTV", label: "GOTV" },
  { id: "STARTIMES", label: "Startimes" },
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

export function CableTVShell() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("DSTV");
  const [smartcardNumber, setSmartcardNumber] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [plans, setPlans] = useState<CablePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<CablePlan | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [pin, setPin] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
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
    const smartcard = smartcardNumber.replace(/\D/g, '');
    if (smartcard.length !== 10) {
      setPlans([]);
      setSelectedPlan(null);
      setCustomerName('');
      setMessage('');
      return;
    }

    let active = true;
    setPlans([]);
    setSelectedPlan(null);
    setCustomerName('');
    setMessage('');

    const timer = window.setTimeout(() => {
      void apiRequest<{ customerName?: string; plans?: CablePlan[] }>('/vtu/verify-cable', {
        method: 'POST',
        body: JSON.stringify({ provider: provider.toLowerCase(), smartcardNumber: smartcard }),
      }).then((response) => {
        if (!active) return;
        const nextPlans = (response.plans || []).filter((plan) => typeof plan?.selectionToken === 'string' && plan.selectionToken.length > 0);
        setPlans(nextPlans);
        setCustomerName(response.customerName || 'Customer verified');
        if (nextPlans.length > 0) setSelectedPlan(nextPlans[0]);
        else setSelectedPlan(null);
      }).catch((error) => {
        if (!active) return;
        setPlans([]);
        setSelectedPlan(null);
        setCustomerName('');
        setMessage(error instanceof ApiError ? error.message : 'Could not verify cable customer.');
      });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [provider, smartcardNumber]);

  const validPhone = /^(?:\+?234|0)\d{10}$/.test(accountPhone.replace(/\s+/g, ''));
  const validSmartcard = smartcardNumber.replace(/\D/g, '').length === 10;
  const canReview = validSmartcard && validPhone && Boolean(selectedPlan && typeof selectedPlan.selectionToken === 'string' && selectedPlan.selectionToken.length > 0);

  function goHome() {
    if (window.location.pathname === '/app') {
      window.dispatchEvent(new CustomEvent('app-tab-change', { detail: 'home' }));
      return;
    }
    router.push('/app');
  }

  async function purchase(transactionAuthorization?: string) {
    if (!selectedPlan || !canReview || (!transactionAuthorization && !/^\d{4}$/.test(pin))) {
      setMessage('Enter a valid smartcard and 4-digit transaction PIN.');
      return;
    }

    setPurchasing(true);
    setMessage('');

    try {
      const result = await apiRequest<{ status?: string; message?: string; reference?: string }>('/vtu/cable_tv', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          network: provider,
          phone: accountPhone.replace(/[^\d]/g, ''),
          smartcardNumber: smartcardNumber.replace(/\D/g, ''),
          amount: selectedPlan.price,
          planToken: selectedPlan.selectionToken,
          ...(transactionAuthorization ? { transactionAuthorization } : { pin }),
        }),
      });

      setShowCheckout(false);
      setReceipt({
        status: result.status === 'pending' ? 'pending' : 'success',
        message: result.message || 'Cable TV purchase submitted successfully.',
        reference: result.reference,
        provider,
        smartcardNumber: smartcardNumber.replace(/\D/g, ''),
        phone: accountPhone.replace(/[^\d]/g, ''),
        amount: selectedPlan.price,
        customerName,
      });
      setPin('');
      window.dispatchEvent(new Event('dashboard-refresh'));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Could not complete cable TV purchase.');
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
        <h1>Cable TV</h1>
        <p>Pay DStv, GOtv and Startimes renewals</p>
      </header>

      <section className="airtime-content">
        <div className="data-section-heading">
          <span>SELECT PROVIDER</span>
          <small>{provider}</small>
        </div>
        <div className="network-grid">
          {providers.map((item) => (
            <button className={`network-card${provider === item.id ? ' selected' : ''}`} type="button" onClick={() => setProvider(item.id)} key={item.id}>
              <span className="network-logo" style={{ backgroundColor: '#8b5cf6' }}><span>{item.label.slice(0, 2)}</span></span>
              <span>{item.label}</span>
              {provider === item.id && <i />}
            </button>
          ))}
        </div>

        <label className="data-phone-label">
          Smartcard Number
          <input value={smartcardNumber} onChange={(event) => setSmartcardNumber(event.target.value.replace(/\D/g, ''))} placeholder="Enter 10-digit smartcard number" inputMode="numeric" maxLength={10} />
        </label>

        {customerName && <div className="profile-message">Customer: {customerName}</div>}

        <div className="airtime-presets-heading">AVAILABLE PACKAGES</div>
        <div className="airtime-presets">
          {plans.length > 0 ? plans.map((plan) => (
            <button className={selectedPlan?.selectionToken === plan.selectionToken ? 'active' : ''} type="button" onClick={() => setSelectedPlan(plan)} key={plan.selectionToken}>{plan.label}<br />{formatNaira(plan.price)}</button>
          )) : <button type="button" className="active" disabled>No package available</button>}
        </div>

        {message && <div className="data-message error" role="alert">{message}</div>}

        <button className="airtime-submit" type="button" disabled={!canReview || purchasing} onClick={() => setShowCheckout(true)}>{purchasing ? 'Processing...' : `Pay ${selectedPlan ? formatNaira(selectedPlan.price) : 'Package'}`}</button>
      </section>

      {showCheckout && selectedPlan && (
        <div className="data-modal-backdrop" role="presentation">
          <section className="data-modal review-modal" role="dialog" aria-modal="true" aria-labelledby="cable-checkout-title">
            <button className="data-modal-close" type="button" onClick={() => setShowCheckout(false)} aria-label="Close checkout">x</button>
            <p className="data-kicker">Review &amp; Confirm</p>
            <h2 id="cable-checkout-title">Transaction Summary</h2>
            <div className="total-due"><span>Total Amount Due</span><strong>{formatNaira(selectedPlan.price)}</strong></div>
            <div className="transaction-summary">
              <div><span>Service</span><strong>{provider} {selectedPlan.label}</strong></div>
              <div><span>Smartcard Number</span><strong>{smartcardNumber}</strong></div>
              <div><span>Customer</span><strong>{customerName || 'Verified customer'}</strong></div>
              <div><span>Current Wallet Balance</span><strong>{balance === null ? 'Loading...' : formatNaira(balance)}</strong></div>
              <div><span>Balance After Transaction</span><strong>{balance === null ? 'Loading...' : formatNaira(balance - selectedPlan.price)}</strong></div>
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
          <section className="data-modal receipt-modal airtime-receipt" role="dialog" aria-modal="true" aria-labelledby="cable-receipt-title">
            <div className={`receipt-mark ${receipt.status}`}>{receipt.status === 'pending' ? '...' : <SuccessIcon />}</div>
            <p className="data-kicker">{receipt.status === 'pending' ? 'Transaction Pending' : 'Transaction Successful'}</p>
            <h2 id="cable-receipt-title">{receipt.provider} Subscription</h2>
            <p className="receipt-lead">{receipt.customerName ? `Customer: ${receipt.customerName}` : 'Cable subscription verified.'}</p>
            <div className="airtime-receipt-amount"><span>AMOUNT PAID</span><strong>{formatNaira(receipt.amount)}</strong></div>
            <div className="transaction-summary airtime-receipt-details">
              <div><span>Reference ID</span><strong>{receipt.reference || 'Pending'}</strong></div>
              <div><span>Smartcard</span><strong>{receipt.smartcardNumber}</strong></div>
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
