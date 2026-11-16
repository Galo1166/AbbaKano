"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useThemeMode } from "@/lib/theme";
import { invokeSupabaseFunction } from "@/lib/supabase";

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

export function EducationShell({ onBack }: { onBack?: () => void }) {
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

  const totalCost = (currentProduct?.amount || 0) * quantity;

  const handleProceed = () => {
    if (!currentProduct) {
      setErrorMsg("Please select an exam package.");
      return;
    }
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
    <div className={`min-h-screen py-8 px-4 sm:px-6 transition-colors duration-200 ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"
    }`}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold">Education</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Exam PINs & Tokens</p>
          </div>
        </div>

        {/* Biller Card */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721] shadow-xs space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading services...</div>
          ) : exams.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">No education services available.</div>
          ) : (
            <>
              {/* Exam Selection Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Examination
                </label>
                <div className="relative">
                  <select
                    value={selectedExamSlug}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="w-full appearance-none px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold outline-hidden focus:border-teal-500 cursor-pointer"
                  >
                    {exams.map((e) => (
                      <option key={e.slug} value={e.slug}>
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
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Package
                </label>
                <div className="relative">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full appearance-none px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold outline-hidden focus:border-teal-500 cursor-pointer"
                  >
                    {currentProducts.map((p) => (
                      <option key={p.id} value={p.id}>
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

              {/* Quantity Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Quantity
                </label>
                <div className="relative">
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full appearance-none px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold outline-hidden focus:border-teal-500 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
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

              {/* Price & Summary */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
                <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                  ₦{totalCost.toLocaleString()}
                </span>
              </div>

              {errorMsg && !isPinModalOpen && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleProceed}
                disabled={!currentProduct}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white transition disabled:opacity-40 cursor-pointer shadow-xs"
              >
                Proceed
              </button>
            </>
          )}
        </div>
      </div>

      {/* PIN Confirmation Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721] p-6 space-y-4 shadow-xl">
            <div className="text-center">
              <h3 className="text-base font-bold">Transaction PIN</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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
                className="w-full text-center tracking-[1em] text-2xl py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold outline-hidden focus:border-teal-500"
              />

              {errorMsg && (
                <p className="text-xs text-center text-red-500">{errorMsg}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || pin.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {submitting ? "..." : "Authorize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {purchaseResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base">{purchaseResult.examName}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{purchaseResult.productName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseResult(null)}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {purchaseResult.pins.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between"
                >
                  <div>
                    <div className="font-mono text-base font-bold text-teal-600 dark:text-teal-400">
                      {item.pin}
                    </div>
                    {item.serial && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        S/N: {item.serial}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyPin(item.pin, idx)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 cursor-pointer"
                  >
                    {copiedIndex === idx ? "Copied" : "Copy"}
                  </button>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Ref: {purchaseResult.reference}</span>
              <span>Qty: {purchaseResult.quantity}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setPurchaseResult(null)}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
