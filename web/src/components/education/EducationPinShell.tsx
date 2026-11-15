"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { getWalletBalance, invokeSupabaseFunction } from "@/lib/supabase";
import { safeErrorMessage, sanitizeServiceMessage } from "@/lib/userFeedback";
import { useThemeMode } from "@/lib/theme";

type EducationProduct = {
  id: string;
  name: string;
  amount: number;
  selectionToken: string;
};

type EducationExam = {
  slug: string;
  name: string;
  products: EducationProduct[];
};

type JambVariation = {
  code: string;
  name: string;
};

type CatalogResponse = {
  exams: EducationExam[];
  jambVariations: JambVariation[];
  jambVariationsAvailable?: boolean;
};

type PurchaseResponse = {
  status?: "success" | "pending" | "failed" | string;
  message?: string;
  reference?: string;
  pins?: unknown;
  balance_kobo?: number;
};

type Receipt = {
  examName: string;
  productName: string;
  quantity: number;
  amount: number;
  reference?: string;
  pins: unknown;
};

type PendingOrder = {
  signature: string;
  reference: string;
  message: string;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);
}

function displayPins(pins: unknown): string[] {
  const values = Array.isArray(pins) ? pins : [pins];
  return values.flatMap((value) => {
    if (typeof value === "string" || typeof value === "number") {
      return [String(value)];
    }
    if (!value || typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    const pin = record.pin ?? record.pin_number ?? record.pin_code;
    const serial = record.serial ?? record.serial_number;
    if (pin !== undefined && serial !== undefined) {
      return [`PIN: ${String(pin)}    Serial: ${String(serial)}`];
    }
    if (pin !== undefined) return [`PIN: ${String(pin)}`];
    return [JSON.stringify(value)];
  });
}

export function EducationPinShell() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [selectedExamSlug, setSelectedExamSlug] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [profileId, setProfileId] = useState("");
  const [variationCode, setVariationCode] = useState("");
  const [jambCustomerName, setJambCustomerName] = useState("");
  const [pin, setPin] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [validatingJamb, setValidatingJamb] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const selectedExam = catalog?.exams.find((exam) => exam.slug === selectedExamSlug);
  const selectedProduct = selectedExam?.products.find((product) =>
    product.id === selectedProductId
  );
  const isJamb = Boolean(selectedExam && /jamb/i.test(`${selectedExam.slug} ${selectedExam.name}`));
  const total = (selectedProduct?.amount || 0) * quantity;
  const isInsufficient = balance !== null && total > balance;
  const canReview = Boolean(selectedProduct) &&
    (!isJamb || (profileId.length === 10 && Boolean(variationCode) && Boolean(jambCustomerName)));
  const orderSignature = selectedProduct
    ? JSON.stringify([selectedProduct.id, quantity, profileId, variationCode])
    : "";
  const currentPendingOrder = pendingOrder?.signature === orderSignature
    ? pendingOrder
    : null;
  const isSameOrderPending = Boolean(currentPendingOrder);
  const pendingReference = currentPendingOrder?.reference || "";
  const displayVariation = catalog?.jambVariations.find((item) => item.code === variationCode);
  const pinsForReceipt = useMemo(
    () => receipt ? displayPins(receipt.pins) : [],
    [receipt],
  );

  function goHome() {
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    } else {
      router.push("/app");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const services = await invokeSupabaseFunction<CatalogResponse>(
          "education-services",
          { action: "catalog" },
        );
        if (cancelled) return;
        const exams = services.exams.filter((exam) => exam.products.length > 0);
        setCatalog({ ...services, exams });
        setSelectedExamSlug(exams[0]?.slug || "");
        setSelectedProductId(exams[0]?.products[0]?.id || "");
        try {
          setBalance(await getWalletBalance());
        } catch (balanceError) {
          console.error("Could not load wallet balance for education purchase:", balanceError);
          setMessage("Wallet balance is unavailable. You can still continue; balance will be checked securely at checkout.");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(safeErrorMessage(error, "Could not load education PIN services."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function chooseExam(slug: string) {
    const exam = catalog?.exams.find((item) => item.slug === slug);
    setSelectedExamSlug(slug);
    setSelectedProductId(exam?.products[0]?.id || "");
    setQuantity(1);
    setJambCustomerName("");
    setProfileId("");
    setVariationCode("");
    setMessage("");
    setIdempotencyKey("");
  }

  function updateJambDetails(nextProfileId: string, nextVariationCode: string) {
    setProfileId(nextProfileId.replace(/\D/g, "").slice(0, 10));
    setVariationCode(nextVariationCode);
    setJambCustomerName("");
    setMessage("");
    setIdempotencyKey("");
  }

  async function validateJambProfile() {
    if (!/^\d{10}$/.test(profileId) || !variationCode) {
      setMessage("Enter a 10-digit JAMB profile ID and choose a variation.");
      return;
    }
    setValidatingJamb(true);
    setMessage("");
    try {
      const result = await invokeSupabaseFunction<{
        valid: boolean;
        customerName: string;
      }>("education-services", {
        action: "validate_jamb",
        profileId,
        variationCode,
      });
      setJambCustomerName(result.customerName);
    } catch (error) {
      setJambCustomerName("");
      setMessage(safeErrorMessage(error, "Could not verify the JAMB profile."));
    } finally {
      setValidatingJamb(false);
    }
  }

  async function handlePurchase(event: FormEvent) {
    event.preventDefault();
    if (!selectedExam || !selectedProduct || !idempotencyKey) return;
    if (pin.length !== 4) {
      setMessage("Enter your 4-digit transaction PIN.");
      return;
    }

    setPurchasing(true);
    setMessage("");
    try {
      const result = await invokeSupabaseFunction<PurchaseResponse>("education-purchase", {
        selectionToken: selectedProduct.selectionToken,
        idempotencyKey,
        quantity,
        pin,
        ...(isJamb ? { profileId, variationCode } : {}),
      });
      if (result.status === "pending") {
        setPendingOrder({
          signature: orderSignature,
          reference: result.reference || "",
          message: sanitizeServiceMessage(result.message || "Your purchase is being checked.") ||
            "Your purchase is being checked. Do not submit it again yet.",
        });
        setMessage(
          sanitizeServiceMessage(result.message || "Your purchase is being checked.") ||
            "Your purchase is being checked. Do not submit it again yet.",
        );
        setPin("");
        return;
      }
      if (result.status !== "success") {
        setMessage(sanitizeServiceMessage(result.message || "The purchase could not be completed."));
        return;
      }

      setReceipt({
        examName: selectedExam.name,
        productName: selectedProduct.name,
        quantity,
        amount: total,
        reference: result.reference,
        pins: result.pins,
      });
      setShowCheckout(false);
      setPin("");
      setIdempotencyKey("");
      try {
        setBalance(await getWalletBalance());
      } catch (balanceError) {
        console.error("Could not refresh wallet balance after education purchase:", balanceError);
      }
    } catch (error) {
      setMessage(safeErrorMessage(error, "Could not complete the education PIN purchase."));
    } finally {
      setPurchasing(false);
    }
  }

  const inputClass = `w-full rounded-2xl border px-3.5 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 ${
    isDark
      ? "bg-[#181B25] border-[#2b3040] text-white placeholder-slate-500"
      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs"
  }`;

  return (
    <main className={`min-h-screen pb-32 transition-colors duration-200 antialiased ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"
    }`}>
      <WebDesktopSidebar active="home" />
      <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-3">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={goHome}
            aria-label="Back to dashboard"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-95 ${
              isDark
                ? "bg-[#141721] border-[#222634] text-slate-300 hover:text-white"
                : "bg-white border-slate-200 text-slate-700 shadow-2xs hover:text-slate-900"
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m15 19-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight">Education PINs</h1>
            <p className={`truncate text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Purchase exam pins securely from your wallet
            </p>
          </div>
        </header>

        <section>
          <label htmlFor="education-exam" className={`mb-1.5 block text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            Select examination
          </label>
          <select
            id="education-exam"
            className={inputClass}
            value={selectedExamSlug}
            disabled={loading || !catalog?.exams.length}
            onChange={(event) => chooseExam(event.target.value)}
          >
            {loading && <option value="">Loading exams...</option>}
            {!loading && !catalog?.exams.length && <option value="">No exams available</option>}
            {catalog?.exams.map((exam) => (
              <option key={exam.slug} value={exam.slug}>{exam.name}</option>
            ))}
          </select>
        </section>

        <section>
          <label htmlFor="education-product" className={`mb-1.5 block text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
            Select PIN type
          </label>
          <select
            id="education-product"
            className={inputClass}
            value={selectedProductId}
            disabled={!selectedExam?.products.length}
            onChange={(event) => {
              setSelectedProductId(event.target.value);
              setQuantity(1);
              setIdempotencyKey("");
              setMessage("");
            }}
          >
            {selectedExam?.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — {formatNaira(product.amount)}
              </option>
            ))}
          </select>
        </section>

        {isJamb && (
          <section className={`space-y-3 rounded-2xl border p-4 ${
            isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200 shadow-2xs"
          }`}>
            <div>
              <h2 className="text-sm font-extrabold">JAMB profile details</h2>
              <p className={`mt-0.5 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Verify your profile before purchasing.
              </p>
            </div>
            <label className="block">
              <span className={`mb-1.5 block text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                10-digit profile ID
              </span>
              <input
                className={inputClass}
                inputMode="numeric"
                maxLength={10}
                value={profileId}
                onChange={(event) => updateJambDetails(event.target.value, variationCode)}
                placeholder="Enter JAMB profile ID"
              />
            </label>
            <label className="block">
              <span className={`mb-1.5 block text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                Examination type
              </span>
              {catalog?.jambVariationsAvailable === false && (
                <p className="mb-1.5 text-xs text-amber-600" role="status">
                  JAMB examination types are temporarily unavailable. Other education PINs are still available.
                </p>
              )}
              <select
                className={inputClass}
                value={variationCode}
                disabled={!catalog?.jambVariations.length}
                onChange={(event) => updateJambDetails(profileId, event.target.value)}
              >
                <option value="">Select a variation</option>
                {catalog?.jambVariations.map((variation) => (
                  <option key={variation.code} value={variation.code}>{variation.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void validateJambProfile()}
              disabled={validatingJamb || !/^\d{10}$/.test(profileId) || !variationCode}
              className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs font-extrabold text-blue-500 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {validatingJamb ? "Verifying profile..." : jambCustomerName ? `Verified: ${jambCustomerName}` : "Verify JAMB profile"}
            </button>
          </section>
        )}

        {!isJamb && (
          <section>
            <label htmlFor="education-quantity" className={`mb-1.5 block text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              Quantity
            </label>
            <select
              id="education-quantity"
              className={inputClass}
              value={quantity}
              onChange={(event) => {
                setQuantity(Number(event.target.value));
                setIdempotencyKey("");
                setMessage("");
              }}
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>{count}</option>
              ))}
            </select>
          </section>
        )}

        {(message || isSameOrderPending) && !showCheckout && (
          <div className={`rounded-xl border p-3 text-xs font-semibold ${
            isSameOrderPending
              ? "border-amber-500/25 bg-amber-500/10 text-amber-600"
              : "border-rose-500/20 bg-rose-500/10 text-rose-500"
          }`} role="status">
            <p>{currentPendingOrder?.message || message}</p>
            {pendingReference && <p className="mt-1 font-mono">Reference: {pendingReference}</p>}
          </div>
        )}

        <section className={`rounded-2xl border p-4 ${
          isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200 shadow-2xs"
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={isDark ? "text-slate-400" : "text-slate-500"}>Wallet balance</span>
            <span className="font-mono font-bold">{balance === null ? "—" : formatNaira(balance)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-500/15 pt-3">
            <span className="text-sm font-extrabold">Total</span>
            <span className="font-mono text-lg font-black text-blue-500">
              {selectedProduct ? formatNaira(total) : "—"}
            </span>
          </div>
        </section>

        <button
          type="button"
          disabled={!canReview || loading || purchasing || isSameOrderPending}
          onClick={() => {
            setIdempotencyKey(crypto.randomUUID());
            setPin("");
            setMessage("");
            setShowCheckout(true);
          }}
          className="h-12 w-full rounded-xl bg-blue-600 text-sm font-extrabold text-white shadow-md transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Loading exam services..." : isSameOrderPending
            ? "Purchase pending — check transaction history"
            : isJamb && !jambCustomerName
            ? "Verify JAMB profile to continue"
            : selectedProduct ? `Continue · ${formatNaira(total)}` : "Select a PIN type"}
        </button>

        {showCheckout && selectedExam && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-xs">
            <div className={`w-full max-w-md rounded-t-3xl border-t p-5 shadow-2xl ${
              isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold">Review &amp; confirm</h2>
                  <p className={`mt-0.5 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {selectedExam.name} · {selectedProduct.name}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close checkout"
                  onClick={() => setShowCheckout(false)}
                  className="rounded-full p-2 text-slate-400 hover:text-blue-500"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>

              <div className={`mb-4 space-y-2 rounded-2xl border p-4 text-xs ${
                isDark ? "bg-[#0b0e14] border-[#1e2330]" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex justify-between gap-3">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Quantity</span>
                  <span className="font-bold">{quantity}</span>
                </div>
                {isJamb && (
                  <>
                    <div className="flex justify-between gap-3">
                      <span className={isDark ? "text-slate-400" : "text-slate-500"}>Profile ID</span>
                      <span className="font-mono font-bold">{profileId}</span>
                    </div>
                    {displayVariation && (
                      <div className="flex justify-between gap-3">
                        <span className={isDark ? "text-slate-400" : "text-slate-500"}>Variation</span>
                        <span className="font-bold">{displayVariation.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <span className={isDark ? "text-slate-400" : "text-slate-500"}>Candidate</span>
                      <span className="font-bold text-emerald-500">{jambCustomerName}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t border-slate-500/15 pt-2 text-sm">
                  <span className="font-bold">Total</span>
                  <span className="font-mono font-black text-blue-500">{formatNaira(total)}</span>
                </div>
              </div>

              {isInsufficient ? (
                <div className="space-y-3">
                  <p className="rounded-xl bg-rose-500/10 p-3 text-center text-xs font-semibold text-rose-500">
                    Your wallet balance is not enough for this purchase.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCheckout(false);
                      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "funding" }));
                    }}
                    className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white"
                  >
                    Fund wallet
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePurchase} className="space-y-3">
                  <label className="block">
                    <span className={`mb-2 block text-center text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Enter 4-digit transaction PIN
                    </span>
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={4}
                      value={pin}
                      onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                      placeholder="••••"
                      className={`mx-auto block w-36 rounded-xl border py-2.5 text-center font-mono text-2xl font-black tracking-[12px] outline-none focus:border-blue-500 ${
                        isDark ? "bg-[#0b0e14] border-[#222634] text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={purchasing || pin.length !== 4 || isSameOrderPending}
                    className="flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 text-xs font-extrabold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {purchasing ? "Processing securely..." : `Authorize ${formatNaira(total)}`}
                  </button>
                  {(message || isSameOrderPending) && (
                    <p className={`text-center text-xs font-semibold ${pendingReference ? "text-amber-500" : "text-rose-500"}`} role="status">
                      {currentPendingOrder?.message || message}
                      {pendingReference && <span className="mt-1 block font-mono">Reference: {pendingReference}</span>}
                    </p>
                  )}
                  {pendingReference && (
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className={`w-full rounded-xl border py-2.5 text-xs font-bold ${
                        isDark ? "border-[#2b3040] text-slate-300" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      Close — check transaction history later
                    </button>
                  )}
                </form>
              )}
            </div>
          </div>
        )}

        {receipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className={`max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border p-6 text-center shadow-2xl ${
              isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
            }`}>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-extrabold">Purchase successful</h2>
              <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Your education PIN is ready.
              </p>
              <div className={`mt-4 space-y-2 rounded-2xl border p-3.5 text-left text-xs ${
                isDark ? "bg-[#0b0e14] border-[#1e2330]" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex justify-between gap-3">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Exam</span>
                  <span className="text-right font-bold">{receipt.examName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>PIN type</span>
                  <span className="text-right font-bold">{receipt.productName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Amount</span>
                  <span className="font-mono font-bold">{formatNaira(receipt.amount)}</span>
                </div>
                <div className="flex justify-between gap-3">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Quantity</span>
                <span className="font-bold">{receipt.quantity}</span>
                </div>
                {receipt.reference && (
                  <div className="flex justify-between gap-3 border-t border-slate-500/15 pt-2">
                    <span className={isDark ? "text-slate-400" : "text-slate-500"}>Reference</span>
                    <span className="break-all text-right font-mono text-[10px] text-blue-500">{receipt.reference}</span>
                  </div>
                )}
              </div>
              {pinsForReceipt.length > 0 && (
                <div className={`mt-3 rounded-2xl border p-3.5 text-left ${
                  isDark ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
                }`}>
                  <h3 className="mb-2 text-xs font-extrabold text-emerald-600">Your PIN details</h3>
                  <ul className="space-y-2">
                    {pinsForReceipt.map((item, index) => (
                      <li key={`${index}-${item}`} className="break-all font-mono text-xs font-bold">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setReceipt(null);
                  goHome();
                }}
                className="mt-5 h-11 w-full rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md transition hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      <WebBottomNav active="home" />
    </main>
  );
}
