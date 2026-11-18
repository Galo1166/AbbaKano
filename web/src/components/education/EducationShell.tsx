"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/lib/theme";
import { invokeSupabaseFunction } from "@/lib/supabase";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";

interface EducationProduct {
  id: string;
  name: string;
  amount: number;
  selectionToken: string;
}

interface ExamGroup {
  slug: string;
  name: string;
  products: EducationProduct[];
}

interface PurchaseResult {
  reference: string;
  examName: string;
  productName: string;
  quantity: number;
  pins: Array<{ pin: string; serial?: string }>;
}

function getExamLogo(slugOrName: string) {
  if (/neco/i.test(slugOrName)) return "/images/education/neco-logo.jpg";
  return "/images/education/waec-logo.png";
}

export function EducationShell({ onBack }: { onBack?: () => void }) {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState<boolean>(true);
  const [exams, setExams] = useState<ExamGroup[]>([]);
  const [selectedExamSlug, setSelectedExamSlug] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const [pin, setPin] = useState<string>("");
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleBack = onBack || (() => router.push("/dashboard"));

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await invokeSupabaseFunction<{ exams?: ExamGroup[] }>(
          "education-services",
          { action: "catalog" }
        );

        if (cancelled) return;

        const rawList = Array.isArray(res?.exams) ? res.exams : [];
        // Strictly exclude JAMB and empty groups
        const available = rawList.filter(
          (e) => !/jamb/i.test(`${e.slug} ${e.name}`) && e.products && e.products.length > 0
        );

        setExams(available);
        if (available.length > 0) {
          setSelectedExamSlug(available[0].slug);
          setSelectedProductId(available[0].products[0]?.id || "");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Failed to load education services.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentExam = exams.find((e) => e.slug === selectedExamSlug);
  const currentProducts = currentExam?.products || [];
  const currentProduct = currentProducts.find((p) => p.id === selectedProductId) || currentProducts[0];

  const handleExamChange = (slug: string) => {
    setSelectedExamSlug(slug);
    const target = exams.find((e) => e.slug === slug);
    if (target?.products && target.products.length > 0) {
      setSelectedProductId(target.products[0].id);
    } else {
      setSelectedProductId("");
    }
    setErrorMsg(null);
  };

  const totalCost = (currentProduct?.amount || 0) * (quantity || 1);

  const handleProceed = () => {
    if (!currentProduct) {
      setErrorMsg("Please select an exam package.");
      return;
    }
    const finalQty = Math.max(1, quantity || 1);
    if (quantity !== finalQty) setQuantity(finalQty);
    setErrorMsg(null);
    setPin("");
    setIsPinModalOpen(true);
  };

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setErrorMsg("Please enter your 4-digit PIN.");
      return;
    }
    if (!currentProduct?.selectionToken) {
      setErrorMsg("Selected package token is unavailable. Please reload.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const idempotencyKey = `edu_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    try {
      const res = await invokeSupabaseFunction<{
        status?: string;
        message?: string;
        reference?: string;
        pins?: unknown;
      }>("education-purchase", {
        selectionToken: currentProduct.selectionToken,
        quantity,
        pin,
        idempotencyKey,
      });

      if (res?.status === "success" || res?.reference) {
        const rawPins = res.pins;
        const normalizedPins: Array<{ pin: string; serial?: string }> = [];

        if (Array.isArray(rawPins)) {
          for (const item of rawPins) {
            if (typeof item === "string") {
              normalizedPins.push({ pin: item });
            } else if (item && typeof item === "object") {
              const obj = item as Record<string, unknown>;
              normalizedPins.push({
                pin: String(obj.pin || obj.token || ""),
                serial: obj.serial || obj.serialNumber ? String(obj.serial || obj.serialNumber) : undefined,
              });
            }
          }
        } else if (typeof rawPins === "string" && rawPins.trim()) {
          normalizedPins.push({ pin: rawPins.trim() });
        } else if (rawPins && typeof rawPins === "object") {
          const obj = rawPins as Record<string, unknown>;
          normalizedPins.push({
            pin: String(obj.pin || obj.token || ""),
            serial: obj.serial || obj.serialNumber ? String(obj.serial || obj.serialNumber) : undefined,
          });
        }

        setIsPinModalOpen(false);
        setPurchaseResult({
          reference: String(res.reference || idempotencyKey),
          examName: currentExam?.name || "Exam",
          productName: currentProduct.name,
          quantity,
          pins: normalizedPins,
        });
      } else {
        throw new Error(res?.message || "Purchase failed.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Purchase failed. Please check balance and PIN.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyPin = (text: string, index: number) => {
    void navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <main className={`min-h-screen pb-32 transition-colors duration-200 antialiased ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"
    }`}>
      <WebDesktopSidebar active="home" />

      <div className="mx-auto w-full max-w-md px-4 pt-3 space-y-4">
        {/* Header */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition active:scale-95 cursor-pointer ${
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
            <h1 className={`truncate text-xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              Education
            </h1>
            <p className={`truncate text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Exam PINs &amp; Tokens
            </p>
          </div>
        </header>

        {/* Biller Card */}
        <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${
          isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
        }`}>
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
              Loading services...
            </div>
          ) : exams.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No education services available.
            </div>
          ) : (
            <>
              {/* Exam Selection Cards */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Select Examination
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {exams.map((e) => {
                    const isSelected = selectedExamSlug === e.slug;
                    return (
                      <button
                        key={e.slug}
                        type="button"
                        onClick={() => handleExamChange(e.slug)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition cursor-pointer text-left ${
                          isSelected
                            ? isDark
                              ? "border-teal-500 bg-teal-500/15 text-teal-400 font-bold"
                              : "border-teal-600 bg-teal-50 text-teal-700 font-bold shadow-xs"
                            : isDark
                              ? "border-[#222634] bg-[#181B25] text-slate-300 hover:border-slate-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 shadow-2xs"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                          <Image src={getExamLogo(e.slug)} alt={e.name} width={26} height={26} className="object-contain" />
                        </div>
                        <span className="text-xs truncate">{e.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <select
                    value={selectedExamSlug}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className={`w-full appearance-none px-3.5 py-3 rounded-xl border text-sm font-semibold outline-none transition focus:border-teal-500 cursor-pointer ${
                      isDark
                        ? "bg-[#181B25] border-[#2b3040] text-white"
                        : "bg-white border-slate-200 text-slate-900 shadow-2xs"
                    }`}
                  >
                    {exams.map((e) => (
                      <option
                        key={e.slug}
                        value={e.slug}
                        className={isDark ? "bg-[#181B25] text-white" : "bg-white text-slate-900"}
                      >
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Package Dropdown */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Package
                </label>
                <div className="relative">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className={`w-full appearance-none px-3.5 py-3 rounded-xl border text-sm font-semibold outline-none transition focus:border-teal-500 cursor-pointer ${
                      isDark
                        ? "bg-[#181B25] border-[#2b3040] text-white"
                        : "bg-white border-slate-200 text-slate-900 shadow-2xs"
                    }`}
                  >
                    {currentProducts.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className={isDark ? "bg-[#181B25] text-white" : "bg-white text-slate-900"}
                      >
                        {p.name} — ₦{p.amount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  Quantity (1–100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={quantity || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setQuantity(val === "" ? 0 : Math.max(1, parseInt(val, 10)));
                  }}
                  onBlur={() => {
                    if (!quantity || quantity < 1) setQuantity(1);
                  }}
                  className={`w-full px-3.5 py-3 rounded-xl border text-sm font-semibold outline-none transition focus:border-teal-500 ${
                    isDark
                      ? "bg-[#181B25] border-[#2b3040] text-white placeholder-slate-500"
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs"
                  }`}
                />
              </div>

              {/* Price & Summary */}
              <div className={`pt-3 border-t flex items-center justify-between ${
                isDark ? "border-[#222634]" : "border-slate-100"
              }`}>
                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Total Amount
                </span>
                <span className={`text-xl font-black ${isDark ? "text-teal-400" : "text-teal-600"}`}>
                  ₦{totalCost.toLocaleString()}
                </span>
              </div>

              {errorMsg && !isPinModalOpen && (
                <div className={`p-3 rounded-xl text-xs border ${
                  isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"
                }`}>
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleProceed}
                disabled={!currentProduct}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white transition disabled:opacity-40 cursor-pointer shadow-md active:scale-[0.99]"
              >
                Proceed to Payment
              </button>
            </>
          )}
        </div>
      </div>

      {/* PIN Confirmation Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className={`w-full max-w-xs rounded-2xl border p-6 space-y-4 shadow-2xl ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="text-center">
              <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                Transaction PIN
              </h3>
              <p className={`text-xs mt-1 font-bold ${isDark ? "text-teal-400" : "text-teal-600"}`}>
                ₦{totalCost.toLocaleString()}
              </p>
            </div>

            <form onSubmit={handleAuthorize} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className={`w-full text-center tracking-[1em] text-2xl py-3 rounded-xl border font-bold outline-none focus:border-teal-500 transition ${
                  isDark
                    ? "bg-[#181B25] border-[#2b3040] text-white placeholder-slate-600"
                    : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 shadow-2xs"
                }`}
              />

              {errorMsg && (
                <p className="text-xs text-center font-semibold text-red-500">{errorMsg}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    isDark
                      ? "border-[#2b3040] text-slate-300 hover:bg-[#1f2433]"
                      : "border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || pin.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {submitting ? "Processing..." : "Authorize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {purchaseResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-2xl border p-6 space-y-4 shadow-2xl ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? "border-[#222634]" : "border-slate-200"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white p-0.5 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                  <Image src={getExamLogo(purchaseResult.examName)} alt="Logo" width={26} height={26} className="object-contain" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isDark ? "text-white" : "text-slate-900"}`}>
                    {purchaseResult.examName}
                  </h3>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {purchaseResult.productName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseResult(null)}
                className={`p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                  isDark ? "border-[#2b3040] text-slate-400 hover:text-white" : "border-slate-200 text-slate-500 hover:text-slate-900"
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {purchaseResult.pins.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDark ? "bg-[#181B25] border-[#2b3040]" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div>
                    <div className={`font-mono text-base font-bold ${
                      isDark ? "text-teal-400" : "text-teal-700"
                    }`}>
                      {item.pin}
                    </div>
                    {item.serial && (
                      <div className={`text-[11px] font-mono mt-0.5 ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}>
                        S/N: {item.serial}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyPin(item.pin, idx)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 cursor-pointer shadow-2xs"
                  >
                    {copiedIndex === idx ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>

            <div className={`text-[11px] flex justify-between pt-2 border-t ${
              isDark ? "border-[#222634] text-slate-400" : "border-slate-100 text-slate-600"
            }`}>
              <span>Ref: {purchaseResult.reference}</span>
              <span>Qty: {purchaseResult.quantity}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  isDark
                    ? "border-[#2b3040] text-slate-300 hover:bg-[#1f2433]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setPurchaseResult(null)}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <WebBottomNav active="home" />
    </main>
  );
}
