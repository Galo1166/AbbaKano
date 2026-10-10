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

type Network = "MTN" | "AIRTEL" | "GLO" | "9MOBILE";
type Receipt = {
  status: string;
  message: string;
  reference?: string;
  network: Network;
  phone: string;
  amount: number;
};

const presets = [100, 200, 500, 1000, 2000, 5000, 10000];

const networks: Array<{ id: Network; label: string; color: string; logo: string }> = [
  { id: "MTN", label: "MTN", color: "#FFCC00", logo: "/providers/mtn-logo.png" },
  { id: "AIRTEL", label: "Airtel", color: "#E60000", logo: "/providers/airtel-logo.png" },
  { id: "GLO", label: "Glo", color: "#00843D", logo: "/providers/glo-logo.png" },
  { id: "9MOBILE", label: "9mobile", color: "#84BD00", logo: "/providers/9mobile-logo.png" },
];

function detectNetwork(value: string): Network | null {
  const digits = value.replace(/\D/g, "").replace(/^234/, "0");
  const prefixes: Record<Network, string[]> = {
    MTN: ["0803", "0806", "0703", "0706", "0813", "0816", "0810", "0814", "0903", "0906", "0913", "0916"],
    AIRTEL: ["0802", "0808", "0708", "0812", "0701", "0902", "0901", "0904", "0907", "0912"],
    GLO: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
    "9MOBILE": ["0809", "0818", "0817", "0909", "0908"],
  };
  if (digits.length < 4) return null;
  return (Object.entries(prefixes).find(([, values]) => values.includes(digits.slice(0, 4)))?.[0] as Network | undefined) || null;
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}

export function AirtimeShell() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [network, setNetwork] = useState<Network>("MTN");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("500");
  const [pin, setPin] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

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

  function updatePhone(value: string) {
    setPhone(value);
    const detectedNet = detectNetwork(value);
    if (detectedNet && detectedNet !== network) {
      setNetwork(detectedNet);
    }
  }

  const detected = detectNetwork(phone);
  const selectedNetwork = network;
  const currentNetworkObj = networks.find((n) => n.id === selectedNetwork) || networks[0];
  const numericAmount = Number(amount || 0);
  const validPhone = phone.replace(/\D/g, "").length === 11;
  const validAmount = numericAmount >= 50 && numericAmount <= 50000;
  const isInsufficient = balance !== null && numericAmount > balance;

  async function handlePasskeyPurchase() {
    if (!validPhone || !validAmount) return;
    setPurchasing(true);
    setMessage("");

    try {
      const optionsRes = await invokeSupabaseFunction<{ options: any }>("webauthn-authenticate-options", {});
      const authResponse = await startAuthentication({ optionsJSON: optionsRes.options });

      const purchaseRes = await invokeSupabaseFunction<any>("process-airtime-purchase", {
        network: selectedNetwork,
        phone,
        amount: numericAmount,
        idempotencyKey,
        webauthnResponse: authResponse,
      });

      setReceipt({
        status: purchaseRes.status || "completed",
        message: sanitizeServiceMessage(purchaseRes.message) || "Airtime recharge successful!",
        reference: purchaseRes.reference || `AIR-${Date.now()}`,
        network: selectedNetwork,
        phone,
        amount: numericAmount,
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
    if (!validPhone || !validAmount) return;
    if (pin.length !== 4) {
      setMessage("Enter your 4-digit transaction PIN.");
      return;
    }

    setPurchasing(true);
    setMessage("");

    try {
      const purchaseRes = await invokeSupabaseFunction<any>("process-airtime-purchase", {
        network: selectedNetwork,
        phone,
        amount: numericAmount,
        pin,
        idempotencyKey,
      });

      setReceipt({
        status: purchaseRes.status || "completed",
        message: sanitizeServiceMessage(purchaseRes.message) || "Airtime recharge successful!",
        reference: purchaseRes.reference || `AIR-${Date.now()}`,
        network: selectedNetwork,
        phone,
        amount: numericAmount,
      });
      setShowCheckout(false);
      setPin("");
      const updatedBal = await getWalletBalance();
      setBalance(updatedBal);
    } catch (err: any) {
      setMessage(safeErrorMessage(err, "An error occurred.") || "Airtime purchase could not be completed.");
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
        {/* Screen Header matching mobile ScreenHeader */}
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
              Airtime Topup
            </h1>
            <p className={`text-xs font-semibold truncate ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}>
              Instant VTU Airtime Recharge
            </p>
          </div>
        </header>

        {/* SELECT NETWORK OPERATOR Section */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              SELECT NETWORK OPERATOR
            </span>
            {detected && (
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold border"
                style={{
                  backgroundColor: `${currentNetworkObj.color}15`,
                  borderColor: `${currentNetworkObj.color}40`,
                  color: currentNetworkObj.color,
                }}
              >
                {detected} DETECTED
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {networks.map((item) => {
              const isSelected = selectedNetwork === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNetwork(item.id)}
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
                      className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Beneficiary Mobile Number */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              Beneficiary Mobile Number
            </label>
            {detected && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold border"
                style={{
                  backgroundColor: `${currentNetworkObj.color}15`,
                  borderColor: `${currentNetworkObj.color}40`,
                  color: currentNetworkObj.color,
                }}
              >
                {detected}
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
              borderColor: currentNetworkObj.color,
              boxShadow: `0 0 10px ${currentNetworkObj.color}25`,
            }}
          >
            <div className="pl-3.5 pr-2" style={{ color: currentNetworkObj.color }}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={11}
              value={phone}
              onChange={(e) => updatePhone(e.target.value)}
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

        {/* Preferred Amount */}
        <div>
          <label className={`block mb-1.5 text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            Preferred Amount (₦)
          </label>
          <div className={`relative flex items-center rounded-2xl border transition-all ${
            isDark
              ? "bg-[#181B25] border-[rgba(255,255,255,0.12)] text-white"
              : "bg-white border-slate-200 text-slate-900 shadow-2xs"
          }`}>
            <span className="pl-4 font-mono text-base font-bold text-slate-400">₦</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter amount"
              className={`w-full bg-transparent py-3 pl-2 pr-9 font-mono text-base font-bold outline-none ${
                isDark ? "text-white placeholder-slate-500" : "text-slate-900 placeholder-slate-400"
              }`}
            />
            {amount && (
              <button
                type="button"
                onClick={() => setAmount("")}
                className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <p className={`mt-1 text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Amount: {formatNaira(numericAmount || 0)}
          </p>
        </div>

        {/* SELECT QUICK PRESET - Horizontal Scroll Chips */}
        <section>
          <span className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            SELECT QUICK PRESET
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {presets.map((preset) => {
              const isSelected = numericAmount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  style={{
                    borderColor: isSelected ? currentNetworkObj.color : undefined,
                  }}
                  className={`shrink-0 rounded-2xl border px-4 py-2.5 font-mono text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? "bg-[#181B25] border-2 shadow-xs"
                        : "bg-white border-2 shadow-xs"
                      : isDark
                      ? "bg-[#141721] border-[#222634] text-slate-300 hover:border-slate-700"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <span style={{ color: isSelected ? currentNetworkObj.color : undefined }}>
                    {formatNaira(preset)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Action Button: Mobile proportional 48-52px */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!validPhone || !validAmount || purchasing}
            onClick={() => {
              setMessage("");
              setIdempotencyKey(crypto.randomUUID());
              setShowCheckout(true);
            }}
            className="w-full h-12 rounded-xl flex items-center justify-center text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-98 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {purchasing
              ? "Processing..."
              : !validAmount
              ? "Enter Amount from ₦50"
              : !validPhone
              ? "Enter 11-digit phone number"
              : `Recharge ${formatNaira(numericAmount)}`}
          </button>
        </div>
      </div>

      {/* Review & Confirm Bottom Sheet */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-t-3xl border-t p-5 shadow-2xl transition-colors ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-950"
                  style={{ backgroundColor: currentNetworkObj.color }}
                >
                  {selectedNetwork}
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

            {/* Summary Box */}
            <div className={`rounded-2xl border p-4 mb-4 space-y-2.5 ${
              isDark ? "bg-[#0b0e14] border-[#1e2330]" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Service</span>
                <span className={`font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {selectedNetwork} VTU Airtime
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Phone Number</span>
                <span className={`font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {phone}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t ">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Recharge Amount</span>
                <span className="font-mono text-base font-black text-blue-500">
                  {formatNaira(numericAmount)}
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

            {/* PIN Authorization */}
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

      {/* Transaction Receipt */}
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
              Recharge Successful!
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
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Amount</span>
                <span className="font-mono font-bold">{formatNaira(receipt.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Phone</span>
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

      {/* WebBottomNav */}
      <WebBottomNav active="home" />
    </main>
  );
}
