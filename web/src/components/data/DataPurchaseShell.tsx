"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { getWalletBalance, invokeSupabaseFunction } from "@/lib/supabase";
import { safeErrorMessage, sanitizeServiceMessage } from "@/lib/userFeedback";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { useThemeMode } from "@/lib/theme";

type Network = "MTN" | "AIRTEL" | "GLO" | "9MOBILE";
type Category = "GENERAL" | "SME" | "GIFTING" | "DIRECT";

type Plan = {
  label: string;
  price: number;
  code: string;
  category?: string;
  selectionToken?: string;
  provider?: string;
  validityPeriod?: "daily" | "weekly" | "monthly";
  purchaseAvailable?: boolean;
};

type Receipt = {
  status: string;
  message: string;
  reference?: string;
  label: string;
  network: Network;
  phone: string;
};

interface ParsedPlanInfo {
  capacity: string;
  validity: string;
  tag: string | null;
  rawLabel: string;
}

function parsePlanInfo(rawLabel: string, fallbackValidity?: string): ParsedPlanInfo {
  const label = (rawLabel || "").trim();

  const speedMatch = label.match(/(\d+(?:\.\d+)?)\s*(MBPS|GBPS|KBPS)/i);
  const sizeMatch = label.match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB)/i);

  let capacity = "";
  if (speedMatch) {
    capacity = `${speedMatch[1]} ${speedMatch[2].toUpperCase()}`;
  } else if (sizeMatch) {
    capacity = `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`;
  } else {
    const underscoreMatch = label.match(/(\d+)\s*(mb|gb)/i);
    if (underscoreMatch) {
      capacity = `${underscoreMatch[1]} ${underscoreMatch[2].toUpperCase()}`;
    } else {
      capacity = label.replace(/[_-]/g, " ").split(/\s+/).slice(0, 2).join(" ") || "Data";
    }
  }

  const valMatch = label.match(/(\d+\s*(?:day|days|month|months|hrs|hours|wk|wks|weeks?))/i);
  let validity = valMatch ? valMatch[0] : (fallbackValidity && fallbackValidity !== "Available" ? fallbackValidity : "30 Days");
  validity = validity.replace(/(\d+)\s*days?/i, (_m, d) => `${d} ${d === "1" ? "Day" : "Days"}`);

  let tag: string | null = null;
  if (/awoof/i.test(label)) tag = "AWOOF";
  else if (/odu/i.test(label)) tag = "ODU";
  else if (/share/i.test(label)) tag = "SHARE";
  else if (/broad\s*band/i.test(label)) tag = "BROADBAND";

  return { capacity, validity, tag, rawLabel: label };
}

const networks: Array<{ id: Network; label: string; color: string; logo: string }> = [
  { id: "MTN", label: "MTN", color: "#FFCC00", logo: "/providers/mtn-logo.png" },
  { id: "AIRTEL", label: "Airtel", color: "#E60000", logo: "/providers/airtel-logo.png" },
  { id: "GLO", label: "Glo", color: "#00843D", logo: "/providers/glo-logo.png" },
  { id: "9MOBILE", label: "9mobile", color: "#84BD00", logo: "/providers/9mobile-logo.png" },
];

const categories: Array<{ id: Category; label: string }> = [
  { id: "GENERAL", label: "General" },
  { id: "SME", label: "SME Data" },
  { id: "GIFTING", label: "Corp Gifting" },
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

function detectCarrierFromPhone(input: string): Network | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 4) return null;
  const prefix = digits.startsWith("234") ? `0${digits.slice(3, 6)}` : digits.slice(0, 4);

  if (/^(0803|0806|0703|0706|0813|0816|0810|0814|0903|0906|0913|0916)/.test(prefix)) return "MTN";
  if (/^(0802|0808|0708|0812|0701|0902|0901|0907|0912)/.test(prefix)) return "AIRTEL";
  if (/^(0805|0807|0705|0815|0811|0905|0915)/.test(prefix)) return "GLO";
  if (/^(0809|0818|0817|0909|0908)/.test(prefix)) return "9MOBILE";
  return null;
}

export function DataPurchaseShell() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [network, setNetwork] = useState<Network>("MTN");
  const [category, setCategory] = useState<Category>("GENERAL");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  function goHome() {
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    } else {
      router.push("/app");
    }
  }

  function chooseNetwork(net: Network) {
    setNetwork(net);
    setSelectedPlan(null);
  }

  function choosePhone(val: string) {
    setPhone(val);
    const autoDetected = detectCarrierFromPhone(val);
    if (autoDetected && autoDetected !== network) {
      setNetwork(autoDetected);
      setSelectedPlan(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function fetchBalance() {
      try {
        const bal = await getWalletBalance();
        if (!cancelled) setBalance(bal);
      } catch (err) {
        console.error("Wallet balance fetch error:", err);
      }
    }
    void fetchBalance();
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage("");

    loadCachedPlans(network)
      .then((loaded) => {
        if (cancelled) return;
        const sorted = [...loaded].sort((a, b) => {
          const capA = planCapacity(a.label);
          const capB = planCapacity(b.label);
          if (capA !== capB) return capA - capB;
          return a.price - b.price;
        });
        setPlans(sorted);
        setLoading(false);

        const inCurrentCat = sorted.filter((p) => (p.category || "GENERAL").toUpperCase() === category);
        if (inCurrentCat.length > 0) {
          setSelectedPlan(inCurrentCat[0]);
        } else if (sorted.length > 0) {
          setSelectedPlan(sorted[0]);
        } else {
          setSelectedPlan(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(safeErrorMessage(err, "An error occurred."));
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [network, reloadKey]);

  const availablePlans = plans.filter((p) => {
    const planCat = (p.category || "GENERAL").toUpperCase();
    return planCat === category;
  });

  const currentNetworkObj = networks.find((n) => n.id === network) || networks[0];
  const detectedNetwork = detectCarrierFromPhone(phone);
  const validPhone = phone.replace(/\D/g, "").length === 11;
  const isPurchaseUnavailable = Boolean(selectedPlan && selectedPlan.purchaseAvailable === false);
  const isReadyToBuy = Boolean(selectedPlan && validPhone && !loading && !isPurchaseUnavailable);

  function openCheckout() {
    if (!validPhone) {
      setErrorMessage("Enter an 11-digit phone number first.");
      return;
    }
    if (!selectedPlan) {
      setErrorMessage("Please select a data plan.");
      return;
    }
    setErrorMessage("");
    setShowCheckout(true);
  }

  async function handlePasskeyPurchase() {
    if (!selectedPlan || !validPhone) return;
    setPurchasing(true);
    setErrorMessage("");

    try {
      const optionsRes = await invokeSupabaseFunction<{ options: any }>("webauthn-authenticate-options", {});
      const authResponse = await startAuthentication({ optionsJSON: optionsRes.options });

      const purchaseRes = await invokeSupabaseFunction<any>("process-data-purchase", {
        network,
        planCode: selectedPlan.code,
        selectionToken: selectedPlan.selectionToken,
        phone,
        webauthnResponse: authResponse,
      });

      setReceipt({
        status: purchaseRes.status || "completed",
        message: sanitizeServiceMessage(purchaseRes.message) || "Data purchase successful!",
        reference: purchaseRes.reference || `DATA-${Date.now()}`,
        label: selectedPlan.label,
        network,
        phone,
      });
      setShowCheckout(false);
      setPin("");
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setErrorMessage(safeErrorMessage(err, "An error occurred.") || "Biometric authentication failed.");
    } finally {
      setPurchasing(false);
    }
  }

  async function handlePinPurchase(e: FormEvent) {
    e.preventDefault();
    if (!selectedPlan || !validPhone) return;
    if (pin.length !== 4) {
      setErrorMessage("Enter your 4-digit transaction PIN.");
      return;
    }

    setPurchasing(true);
    setErrorMessage("");

    try {
      const purchaseRes = await invokeSupabaseFunction<any>("process-data-purchase", {
        network,
        planCode: selectedPlan.code,
        selectionToken: selectedPlan.selectionToken,
        phone,
        pin,
      });

      setReceipt({
        status: purchaseRes.status || "completed",
        message: sanitizeServiceMessage(purchaseRes.message) || "Data purchase successful!",
        reference: purchaseRes.reference || `DATA-${Date.now()}`,
        label: selectedPlan.label,
        network,
        phone,
      });
      setShowCheckout(false);
      setPin("");
      setReloadKey((k) => k + 1);
    } catch (err: any) {
      setErrorMessage(safeErrorMessage(err, "An error occurred.") || "Purchase could not be completed.");
    } finally {
      setPurchasing(false);
    }
  }

  const parsedActivePlan = selectedPlan ? parsePlanInfo(selectedPlan.label, selectedPlan.validityPeriod) : null;
  const isInsufficient = balance !== null && selectedPlan !== null && balance < selectedPlan.price;

  return (
    <main className={`min-h-screen transition-colors duration-200 antialiased pb-32 ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"
    }`}>
      <WebDesktopSidebar active="data" />

      <div className="mx-auto w-full max-w-md px-4 pt-3 space-y-4">
        {/* Header Bar matching mobile ScreenHeader */}
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
              Buy Data Bundle
            </h1>
            <p className={`text-xs font-semibold truncate ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}>
              Instant SME, Gifting &amp; Corporate Data
            </p>
          </div>
        </header>

        {/* Section 1: Carrier Selector */}
        <section>
          <span className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            SELECT NETWORK OPERATOR
          </span>
          <div className="grid grid-cols-4 gap-2">
            {networks.map((item) => {
              const isSelected = network === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseNetwork(item.id)}
                  style={{
                    borderColor: isSelected ? item.color : undefined,
                    boxShadow: isSelected ? `0 0 12px ${item.color}35` : undefined,
                  }}
                  className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 transition-all cursor-pointer ${
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
                    className="flex h-11 w-11 items-center justify-center rounded-full p-1.5 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  >
                    <Image src={item.logo} alt={item.label} width={30} height={30} className="h-full w-full object-contain" />
                  </div>
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: isSelected ? item.color : isDark ? "#94A3B8" : "#475569",
                    }}
                  >
                    {item.label}
                  </span>
                  {isSelected && (
                    <span
                      className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2"
                      style={{
                        backgroundColor: item.color,
                        boxShadow: `0 0 6px ${item.color}`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Segmented Category Tabs - Grid 4 Columns (No Wrap) */}
        <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl border transition-colors ${
          isDark
            ? "bg-[#181B25] border-[rgba(255,255,255,0.08)]"
            : "bg-slate-100 border-slate-200"
        }`}>
          {categories.map((item) => {
            const isActive = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCategory(item.id);
                  const inCat = plans.filter((p) => (p.category || "GENERAL").toUpperCase() === item.id);
                  if (inCat.length > 0) setSelectedPlan(inCat[0]);
                  else setSelectedPlan(null);
                }}
                className={`py-2 px-1 text-center text-[11px] sm:text-xs font-bold rounded-lg transition-all truncate whitespace-nowrap cursor-pointer ${
                  isActive
                    ? isDark
                      ? "bg-[#1C1F29] text-blue-400 shadow-xs border border-[rgba(255,255,255,0.06)] font-extrabold"
                      : "bg-white text-blue-600 shadow-xs border border-slate-200/80 font-extrabold"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Section 3: Beneficiary Phone Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              Beneficiary Phone Number
            </label>
            {detectedNetwork && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold border"
                style={{
                  backgroundColor: `${currentNetworkObj.color}15`,
                  borderColor: `${currentNetworkObj.color}40`,
                  color: currentNetworkObj.color,
                }}
              >
                {detectedNetwork}
              </span>
            )}
          </div>
          <div
            className={`relative flex items-center rounded-2xl border transition-all ${
              isDark
                ? "bg-[#181B25] border-[rgba(255,255,255,0.12)] text-white"
                : "bg-white border-slate-200 text-slate-900 shadow-2xs"
            }`}
            style={{
              borderColor: detectedNetwork ? currentNetworkObj.color : undefined,
              boxShadow: detectedNetwork ? `0 0 10px ${currentNetworkObj.color}25` : undefined,
            }}
          >
            <div className="pl-3.5 pr-2" style={{ color: currentNetworkObj.color }}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={phone}
              onChange={(e) => choosePhone(e.target.value)}
              placeholder="Enter 11-digit phone number"
              className={`w-full bg-transparent py-3 pr-9 font-mono text-base font-bold outline-none ${
                isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
              }`}
            />
            {phone && (
              <button
                type="button"
                onClick={() => setPhone("")}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Section 4: Available Plans Grid */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              {loading
                ? "LOADING PLANS..."
                : `AVAILABLE ${network} ${category} PLANS (${availablePlans.length})`}
            </span>
          </div>

          {errorMessage && (
            <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-500">
              <span>{errorMessage}</span>
              <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-bold underline cursor-pointer">
                Retry
              </button>
            </div>
          )}

          {!loading && !errorMessage && availablePlans.length === 0 && (
            <div className={`rounded-2xl border border-dashed py-10 text-center ${
              isDark ? "border-[#222634] bg-[#141721] text-slate-400" : "border-slate-300 bg-white text-slate-500"
            }`}>
              <p className="text-xs font-semibold">No {category.toLowerCase()} plans currently available for {network}.</p>
            </div>
          )}

          {/* 3-Column Grid of Plan Cards matching mobile layout */}
          <div className="grid grid-cols-3 gap-2">
            {availablePlans.map((plan) => {
              const isSelected = selectedPlan?.code === plan.code;
              const parsed = parsePlanInfo(plan.label, plan.validityPeriod);

              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    borderColor: isSelected ? currentNetworkObj.color : undefined,
                  }}
                  className={`relative flex flex-col items-center justify-between rounded-xl p-2.5 min-h-[105px] border transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? "bg-[#181B25] border-2 shadow-sm"
                        : "bg-white border-2 shadow-xs"
                      : isDark
                      ? "bg-[#141721] border-[#222634] hover:border-slate-700"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {/* Selected Indicator Checkmark */}
                  {isSelected && (
                    <div
                      className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-slate-950 font-black shadow-xs"
                      style={{ backgroundColor: currentNetworkObj.color }}
                    >
                      <svg className="h-2.5 w-2.5 stroke-slate-950 stroke-[3]" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Top Tag Badge */}
                  {parsed.tag ? (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide truncate max-w-[90%] ${
                      isSelected
                        ? "bg-blue-500/15 text-blue-500"
                        : isDark
                        ? "bg-[#1e2330] text-slate-400"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {parsed.tag}
                    </span>
                  ) : (
                    <div className="h-4" />
                  )}

                  {/* Middle: Plan Capacity + Validity */}
                  <div className="text-center w-full my-1">
                    <span
                      className="block text-xs sm:text-sm font-extrabold truncate"
                      style={{ color: isSelected ? currentNetworkObj.color : isDark ? "#FFFFFF" : "#0F172A" }}
                    >
                      {parsed.capacity}
                    </span>
                    <span className={`block text-[10px] font-medium mt-0.5 truncate ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}>
                      {parsed.validity}
                    </span>
                  </div>

                  {/* Bottom: Price Box */}
                  <div className={`w-full rounded-lg py-1 px-1.5 text-center transition-colors ${
                    isDark ? "bg-[#0b0e14]" : "bg-slate-100"
                  }`}>
                    <span className={`text-[11px] sm:text-xs font-black font-mono block truncate ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}>
                      {formatNaira(plan.price)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Floating Buy Bar above bottom nav */}
      {selectedPlan && parsedActivePlan && (
        <div className={`fixed bottom-20 left-4 right-4 max-w-md mx-auto z-20 flex items-center justify-between gap-3 rounded-2xl border p-3.5 shadow-xl transition-all ${
          isDark
            ? "bg-[#141721]/95 border-[#222634] text-white backdrop-blur-md"
            : "bg-white/95 border-slate-200 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md"
        }`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-slate-950"
                style={{ backgroundColor: currentNetworkObj.color }}
              >
                {network}
              </span>
              <span className={`text-xs font-extrabold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                {parsedActivePlan.capacity} ({parsedActivePlan.validity})
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs font-black" style={{ color: currentNetworkObj.color }}>
              {formatNaira(selectedPlan.price)} <span className={`font-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>→ {phone || "Phone"}</span>
            </p>
          </div>

          <button
            type="button"
            disabled={Boolean(purchasing || isPurchaseUnavailable || !validPhone)}
            onClick={openCheckout}
            style={{ backgroundColor: currentNetworkObj.color }}
            className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black text-slate-950 uppercase tracking-wider shadow-md transition-transform hover:brightness-105 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <span>Buy Data</span>
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </button>
        </div>
      )}

      {/* Bottom Sheet Review & Confirm Modal */}
      {showCheckout && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-t-3xl border-t p-5 shadow-2xl transition-colors ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            {/* Modal Pill Handle */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-950"
                  style={{ backgroundColor: currentNetworkObj.color }}
                >
                  {network}
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
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Selected Plan</span>
                <span className={`font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {selectedPlan.label}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Recipient Phone</span>
                <span className={`font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {phone}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t ">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Debit Amount</span>
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

              {errorMessage && (
                <p className="text-center text-xs font-semibold text-rose-500">
                  {errorMessage}
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
              Transaction Successful!
            </h3>
            <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {receipt.message}
            </p>

            <div className={`mt-4 rounded-2xl border p-3.5 text-left space-y-2 text-xs ${
              isDark ? "bg-[#0b0e14] border-[#1e2330]" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Carrier</span>
                <span className="font-bold">{receipt.network}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Data Bundle</span>
                <span className="font-bold">{receipt.label}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Recipient</span>
                <span className="font-mono font-bold">{receipt.phone}</span>
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

      {/* Persistent Bottom Navigation */}
      <WebBottomNav active="data" />
    </main>
  );
}
