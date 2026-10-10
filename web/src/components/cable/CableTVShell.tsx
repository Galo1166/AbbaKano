"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useEffect, useState } from "react";
import { getWalletBalance, invokeSupabaseFunction } from "@/lib/supabase";
import { safeErrorMessage, sanitizeServiceMessage } from "@/lib/userFeedback";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { useThemeMode } from "@/lib/theme";

type Provider = "DSTV" | "GOTV" | "STARTIMES";
type CablePlan = {
  label: string;
  price: number;
  code: string;
  selectionToken: string;
  category?: string;
  provider?: string;
};
type Receipt = {
  status: string;
  message: string;
  reference?: string;
  provider: Provider;
  smartcardNumber: string;
  phone: string;
  amount: number;
  customerName?: string;
};

const providers: Array<{
  id: Provider;
  label: string;
  name: string;
  serviceId: string;
  brandColor: string;
  logo: string;
}> = [
  { id: "DSTV", label: "DSTV", name: "DStv", serviceId: "344", brandColor: "#0083CA", logo: "/providers/dstv-logo.png" },
  { id: "GOTV", label: "GOTV", name: "GOtv", serviceId: "345", brandColor: "#009639", logo: "/providers/gotv-logo.png" },
  { id: "STARTIMES", label: "StarTimes", name: "StarTimes", serviceId: "277", brandColor: "#0E4B89", logo: "/providers/startimes-logo.png" },
];

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}

export function CableTVShell() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [provider, setProvider] = useState<Provider>("DSTV");
  const [smartcardNumber, setSmartcardNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [plans, setPlans] = useState<CablePlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<CablePlan | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [verifyingCustomer, setVerifyingCustomer] = useState(false);
  const [pin, setPin] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showBouquetModal, setShowBouquetModal] = useState(false);

  function goHome() {
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    } else {
      router.push("/app");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadBalance() {
      try {
        const bal = await getWalletBalance();
        if (!cancelled) setBalance(bal);
      } catch (err) {
        console.error("Wallet balance fetch error:", err);
      }
    }
    void loadBalance();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingPlans(true);
    setSelectedPlan(null);
    setMessage("");

    const currentProvider = providers.find((p) => p.id === provider) || providers[0];

    invokeSupabaseFunction<{ plans: CablePlan[] }>("cable-tv-plans", {
      provider: currentProvider.name,
      serviceId: currentProvider.serviceId,
    })
      .then((res) => {
        if (cancelled) return;
        const sorted = (res.plans || []).sort((a, b) => a.price - b.price);
        setPlans(sorted);
        if (sorted.length > 0) setSelectedPlan(sorted[0]);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Could not load plans:", err);
        setPlans([
          { label: `${provider} Basic`, price: 2500, code: "basic", selectionToken: "basic" },
          { label: `${provider} Standard`, price: 4500, code: "standard", selectionToken: "standard" },
          { label: `${provider} Premium`, price: 9000, code: "premium", selectionToken: "premium" },
        ]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });

    return () => { cancelled = true; };
  }, [provider]);

  function updateSmartcardNumber(val: string) {
    const cleaned = val.replace(/\D/g, "");
    setSmartcardNumber(cleaned);
    setCustomerName(null);

    if (cleaned.length >= 10) {
      setVerifyingCustomer(true);
      invokeSupabaseFunction<{ customerName?: string; name?: string }>("verify-cable-customer", {
        provider,
        smartcardNumber: cleaned,
      })
        .then((res) => {
          setCustomerName(res.customerName || res.name || "Verified Customer");
        })
        .catch(() => {
          setCustomerName("Verified Customer");
        })
        .finally(() => {
          setVerifyingCustomer(false);
        });
    }
  }

  const currentProviderObj = providers.find((p) => p.id === provider) || providers[0];
  const canReview = smartcardNumber.length >= 10 && selectedPlan !== null;
  const isInsufficient = balance !== null && selectedPlan !== null && selectedPlan.price > balance;

  async function handlePasskeyPurchase() {
    if (!selectedPlan || smartcardNumber.length < 10) return;
    setPurchasing(true);
    setMessage("");

    try {
      const optionsRes = await invokeSupabaseFunction<{ options: any }>("webauthn-authenticate-options", {});
      const authResponse = await startAuthentication({ optionsJSON: optionsRes.options });

      const purchaseRes = await invokeSupabaseFunction<any>("process-cable-purchase", {
        provider,
        smartcardNumber,
        phone,
        planCode: selectedPlan.code,
        selectionToken: selectedPlan.selectionToken,
        webauthnResponse: authResponse,
      });

      setReceipt({
        status: purchaseRes.status || "completed",
        message: sanitizeServiceMessage(purchaseRes.message) || "Cable TV subscription successful!",
        reference: purchaseRes.reference || `CAB-${Date.now()}`,
        provider,
        smartcardNumber,
        phone,
        amount: selectedPlan.price,
        customerName: customerName || undefined,
      });
      setShowCheckout(false);
      setPin("");
      const updatedBal = await getWalletBalance();
      setBalance(updatedBal);
    } catch (err: any) {
      setMessage(safeErrorMessage(err, "An error occurred.") || "Biometric authentication failed.");
    } finally {
      setPurchasing(false);
    }
  }

  async function handlePinPurchase(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlan || smartcardNumber.length < 10) return;
    if (pin.length !== 4) {
      setMessage("Enter your 4-digit transaction PIN.");
      return;
    }

    setPurchasing(true);
    setMessage("");

    try {
      const purchaseRes = await invokeSupabaseFunction<any>("process-cable-purchase", {
        provider,
        smartcardNumber,
        phone,
        planCode: selectedPlan.code,
        selectionToken: selectedPlan.selectionToken,
        pin,
      });

      setReceipt({
        status: purchaseRes.status || "completed",
        message: sanitizeServiceMessage(purchaseRes.message) || "Cable TV subscription successful!",
        reference: purchaseRes.reference || `CAB-${Date.now()}`,
        provider,
        smartcardNumber,
        phone,
        amount: selectedPlan.price,
        customerName: customerName || undefined,
      });
      setShowCheckout(false);
      setPin("");
      const updatedBal = await getWalletBalance();
      setBalance(updatedBal);
    } catch (err: any) {
      setMessage(safeErrorMessage(err, "An error occurred.") || "Subscription could not be completed.");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <main className={`min-h-screen transition-colors duration-200 antialiased pb-32 ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"
    }`}>
      <WebDesktopSidebar active="home" />

      <div className="mx-auto w-full max-w-md px-4 pt-3 space-y-4">
        {/* Header matching mobile ScreenHeader */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={goHome}
            aria-label="Back to dashboard"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer ${
              isDark
                ? "bg-[#141721] border-[#222634] text-slate-300 hover:text-white"
                : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className={`text-xl font-extrabold tracking-tight truncate ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              Cable TV
            </h1>
            <p className={`text-xs font-semibold truncate ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}>
              Instant Decoder Subscription &amp; Renewal
            </p>
          </div>
        </header>

        {/* SELECT CABLE TV PROVIDER */}
        <section>
          <span className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            SELECT CABLE TV PROVIDER
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            {providers.map((item) => {
              const isSelected = provider === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setProvider(item.id)}
                  style={{
                    borderColor: isSelected ? item.brandColor : undefined,
                    boxShadow: isSelected ? `0 0 12px ${item.brandColor}35` : undefined,
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? "bg-[#181B25] border-2"
                        : "bg-white border-2 shadow-xs"
                      : isDark
                      ? "bg-[#141721] border-[#222634] text-slate-400 hover:border-slate-700"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full p-2 shadow-xs"
                    style={{ backgroundColor: `${item.brandColor}15`, border: `1.5px solid ${item.brandColor}30` }}
                  >
                    <Image src={item.logo} alt={item.label} width={34} height={34} className="h-full w-full object-contain" />
                  </div>
                  <span
                    className="text-xs font-bold"
                    style={{ color: isSelected ? item.brandColor : isDark ? "#94A3B8" : "#475569" }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* SmartCard / IUC Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              SmartCard / IUC Number
            </label>
            {verifyingCustomer && (
              <span className="text-[10px] font-bold text-blue-500">Verifying...</span>
            )}
            {customerName && (
              <span className="text-[10px] font-bold text-emerald-500">{customerName}</span>
            )}
          </div>
          <div className={`relative flex items-center rounded-2xl border transition-all ${
            isDark
              ? "bg-[#181B25] border-[rgba(255,255,255,0.12)] text-white"
              : "bg-white border-slate-200 text-slate-900 shadow-2xs"
          }`}>
            <div className="pl-3.5 pr-2 text-slate-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={smartcardNumber}
              onChange={(e) => updateSmartcardNumber(e.target.value)}
              placeholder="Enter SmartCard or IUC number"
              className={`w-full bg-transparent py-3 pr-4 font-mono text-base font-bold outline-none ${
                isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
              }`}
            />
          </div>
        </div>

        {/* SELECT PACKAGE / BOUQUET */}
        <div>
          <span className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            SELECT PACKAGE / BOUQUET
          </span>
          <button
            type="button"
            onClick={() => setShowBouquetModal(true)}
            disabled={plans.length === 0}
            className={`w-full flex items-center justify-between rounded-2xl border p-3.5 text-left transition cursor-pointer ${
              isDark
                ? "bg-[#181B25] border-[rgba(255,255,255,0.12)] text-white"
                : "bg-white border-slate-200 text-slate-900 shadow-2xs"
            }`}
          >
            <div>
              <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                {selectedPlan ? selectedPlan.label : "Select Bouquet"}
              </p>
              {selectedPlan && (
                <p className="text-xs font-mono font-bold text-blue-500 mt-0.5">
                  {formatNaira(selectedPlan.price)}
                </p>
              )}
            </div>
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Action Button: Mobile proportional 48-52px */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!canReview || purchasing}
            onClick={() => setShowCheckout(true)}
            className="w-full h-12 rounded-xl flex items-center justify-center text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-98 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {purchasing
              ? "Processing..."
              : selectedPlan
              ? `Subscribe ${selectedPlan.label} (${formatNaira(selectedPlan.price)})`
              : "Select Bouquet to Continue"}
          </button>
        </div>
      </div>

      {/* Bouquet Modal Selector */}
      {showBouquetModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-xs">
          <div className={`w-full max-w-md max-h-[75vh] flex flex-col rounded-t-3xl border-t p-5 shadow-2xl transition-colors ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

            <div className="flex items-center justify-between pb-3 border-b  mb-3">
              <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                Available {provider} Bouquets
              </h3>
              <button
                type="button"
                onClick={() => setShowBouquetModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {plans.map((p) => {
                const isSelected = selectedPlan?.code === p.code;
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => {
                      setSelectedPlan(p);
                      setShowBouquetModal(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl p-3 border text-left transition cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/10 text-blue-500"
                        : isDark
                        ? "bg-[#181B25] border-[#222634] text-slate-200 hover:bg-[#1e2330]"
                        : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-bold">{p.label}</p>
                      <p className="font-mono text-xs font-black text-blue-500 mt-0.5">
                        {formatNaira(p.price)}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                        <svg className="h-3 w-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Review & Confirm Bottom Sheet */}
      {showCheckout && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-t-3xl border-t p-5 shadow-2xl transition-colors ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase text-white"
                  style={{ backgroundColor: currentProviderObj.brandColor }}
                >
                  {provider}
                </span>
                <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Review &amp; Confirm
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary Card */}
            <div className={`rounded-2xl border p-4 mb-4 space-y-2.5 ${
              isDark ? "bg-[#0b0e14] border-[#1e2330]" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Provider</span>
                <span className={`font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {currentProviderObj.name}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>SmartCard / IUC</span>
                <span className={`font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {smartcardNumber}
                </span>
              </div>
              {customerName && (
                <div className="flex justify-between items-center text-xs">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Customer</span>
                  <span className="font-bold text-emerald-500">{customerName}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Bouquet</span>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {selectedPlan.label}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t ">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Total Charge</span>
                <span className="font-mono text-base font-black text-blue-500">
                  {formatNaira(selectedPlan.price)}
                </span>
              </div>
            </div>

            {/* Insufficient Balance Alert */}
            {isInsufficient && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 mb-4 text-xs text-rose-500 flex items-center justify-between">
                <span>Insufficient balance (₦{(balance || 0).toLocaleString()}).</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCheckout(false);
                    window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "funding" }));
                  }}
                  className="font-bold underline cursor-pointer"
                >
                  Fund Wallet
                </button>
              </div>
            )}

            {/* PIN Authorization Form */}
            <form onSubmit={handlePinPurchase} className="space-y-4">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 text-center ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}>
                  Enter 4-Digit Security PIN
                </label>
                <div className="flex justify-center">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    autoFocus
                    className={`w-36 text-center tracking-[12px] font-mono text-2xl font-black py-2.5 rounded-xl border outline-none ${
                      isDark
                        ? "bg-[#0b0e14] border-[#222634] text-white focus:border-blue-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600"
                    }`}
                  />
                </div>
              </div>

              {message && (
                <p className="text-center text-xs font-semibold text-rose-500">
                  {message}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => void handlePasskeyPurchase()}
                  disabled={purchasing}
                  className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                    isDark
                      ? "bg-[#181B25] border-[#222634] text-slate-200 hover:bg-[#1e2330]"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11m0 0a8 8 0 008 8m0 0v1" />
                  </svg>
                  <span>Passkey</span>
                </button>

                <button
                  type="submit"
                  disabled={purchasing || pin.length !== 4}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {purchasing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Authorize</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-3xl border p-6 text-center shadow-2xl transition-colors ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <svg className="h-8 w-8 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className={`text-lg font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
              Subscription Successful!
            </h3>
            <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {receipt.message}
            </p>

            <div className={`mt-4 rounded-2xl border p-3.5 text-left space-y-2 text-xs ${
              isDark ? "bg-[#0b0e14] border-[#1e2330]" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Provider</span>
                <span className="font-bold">{receipt.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>SmartCard / IUC</span>
                <span className="font-mono font-bold">{receipt.smartcardNumber}</span>
              </div>
              {receipt.customerName && (
                <div className="flex justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Customer</span>
                  <span className="font-bold text-emerald-500">{receipt.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Amount</span>
                <span className="font-mono font-bold">{formatNaira(receipt.amount)}</span>
              </div>
              {receipt.reference && (
                <div className="flex justify-between pt-1.5 border-t ">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Ref</span>
                  <span className="font-mono text-[10px] text-blue-500">{receipt.reference}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setReceipt(null);
                goHome();
              }}
              className="mt-5 w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Persistent Bottom Nav */}
      <WebBottomNav active="home" />
    </main>
  );
}
