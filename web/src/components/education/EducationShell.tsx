"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useThemeMode } from "@/lib/theme";
import { supabase, invokeSupabaseFunction } from "@/lib/supabase";

type ExamBody = "WAEC" | "JAMB" | "NECO";

interface EducationPlan {
  id: string;
  examBody: ExamBody;
  planCode: string;
  name: string;
  label: string;
  price: number;
  token?: string;
  portalUrl: string;
  description: string;
  instructions: string;
}

const FALLBACK_PLANS: Record<ExamBody, EducationPlan[]> = {
  WAEC: [
    {
      id: "waec-result-checker",
      examBody: "WAEC",
      planCode: "waec-result-checker",
      name: "WAEC Result Checker e-PIN",
      label: "WAEC Result Checker e-PIN",
      price: 3800,
      portalUrl: "https://www.waecdirect.org",
      description: "Official PIN & Serial number to check WAEC May/June and GCE results.",
      instructions: "Visit www.waecdirect.org, enter your 10-digit Exam No, select Year & Type, enter PIN and Serial number.",
    },
  ],
  NECO: [
    {
      id: "neco-result-token",
      examBody: "NECO",
      planCode: "neco-result-token",
      name: "NECO Result Token",
      label: "NECO Result Token",
      price: 1350,
      portalUrl: "https://result.neco.gov.ng",
      description: "Official Token to check NECO SSCE Internal, External, BECE & NCEE results.",
      instructions: "Visit result.neco.gov.ng, select Exam Year and Exam Type, enter your Token and Registration Number.",
    },
  ],
  JAMB: [
    {
      id: "jamb-utme",
      examBody: "JAMB",
      planCode: "jamb-utme",
      name: "JAMB UTME Registration e-PIN",
      label: "JAMB UTME Registration e-PIN",
      price: 6200,
      portalUrl: "https://www.jamb.gov.ng",
      description: "Official JAMB UTME Registration profile e-PIN without Mock.",
      instructions: "Provide your 10-digit Profile Code. Take this generated e-PIN to any accredited JAMB CBT centre.",
    },
    {
      id: "jamb-mock",
      examBody: "JAMB",
      planCode: "jamb-mock",
      name: "JAMB UTME with Mock e-PIN",
      label: "JAMB UTME with Mock e-PIN",
      price: 7700,
      portalUrl: "https://www.jamb.gov.ng",
      description: "Official JAMB UTME + Mock Examination Registration profile e-PIN.",
      instructions: "Provide your 10-digit Profile Code. Take this generated e-PIN to any accredited JAMB CBT centre for UTME + Mock registration.",
    },
    {
      id: "jamb-direct-entry",
      examBody: "JAMB",
      planCode: "jamb-direct-entry",
      name: "JAMB Direct Entry (DE) e-PIN",
      label: "JAMB Direct Entry (DE) e-PIN",
      price: 6200,
      portalUrl: "https://www.jamb.gov.ng",
      description: "Official JAMB Direct Entry (DE) Registration profile e-PIN.",
      instructions: "Provide your 10-digit Profile Code. Take this generated e-PIN to any accredited JAMB CBT centre to complete Direct Entry registration.",
    },
  ],
};

const EXAM_BODIES: { id: ExamBody; title: string; subtitle: string; logo: string }[] = [
  { id: "WAEC", title: "WAEC", subtitle: "Result Checker", logo: "/images/education/waec-logo.png" },
  { id: "JAMB", title: "JAMB", subtitle: "UTME & DE Pin", logo: "/images/education/jamb-logo.jpg" },
  { id: "NECO", title: "NECO", subtitle: "Result Token", logo: "/images/education/neco-logo.jpg" },
];

export function EducationShell({ onBack }: { onBack?: () => void }) {
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  const [selectedBody, setSelectedBody] = useState<ExamBody>("WAEC");
  const [plans, setPlans] = useState<EducationPlan[]>(FALLBACK_PLANS.WAEC);
  const [selectedPlan, setSelectedPlan] = useState<EducationPlan>(FALLBACK_PLANS.WAEC[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [candidatePhone, setCandidatePhone] = useState<string>("");
  const [candidateName, setCandidateName] = useState<string>("");
  const [profileCode, setProfileCode] = useState<string>("");
  const [loadingPlans, setLoadingPlans] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voucherResult, setVoucherResult] = useState<any | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Auto-fill phone from logged in user
  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.phone) {
        setCandidatePhone(user.phone.replace(/^234/, "0"));
      }
    })();
  }, []);

  // Fetch plans dynamically from edge function
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingPlans(true);
      try {
        const res = await invokeSupabaseFunction<{ services?: EducationPlan[] }>(
          "education-services",
          { examBody: selectedBody },
        );
        if (!cancelled && res?.services && Array.isArray(res.services) && res.services.length > 0) {
          setPlans(res.services);
          setSelectedPlan(res.services[0]);
        } else if (!cancelled) {
          const def = FALLBACK_PLANS[selectedBody] || [];
          setPlans(def);
          if (def.length > 0) setSelectedPlan(def[0]);
        }
      } catch {
        if (!cancelled) {
          const def = FALLBACK_PLANS[selectedBody] || [];
          setPlans(def);
          if (def.length > 0) setSelectedPlan(def[0]);
        }
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedBody]);

  const totalCost = (selectedPlan?.price || 0) * quantity;

  const handleBodyChange = (body: ExamBody) => {
    setSelectedBody(body);
    setErrorMsg(null);
    setQuantity(1);
    const def = FALLBACK_PLANS[body] || [];
    setPlans(def);
    if (def.length > 0) setSelectedPlan(def[0]);
  };

  const handleStartPurchase = () => {
    setErrorMsg(null);
    const cleanPhone = candidatePhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid candidate recipient phone number.");
      return;
    }
    if (selectedBody === "JAMB" && profileCode.trim().length < 8) {
      setErrorMsg("Please enter the candidate 10-digit JAMB Profile Code.");
      return;
    }
    setIsPinModalOpen(true);
  };

  const handleExecutePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setErrorMsg("Please enter your 4-digit transaction PIN.");
      return;
    }

    setPurchasing(true);
    setErrorMsg(null);

    try {
      const res = await invokeSupabaseFunction<{
        success: boolean;
        message?: string;
        voucher: any;
      }>("education-purchase", {
        examBody: selectedBody,
        planCode: selectedPlan.planCode,
        quantity,
        candidatePhone,
        candidateName: candidateName.trim(),
        profileCode: profileCode.trim(),
        selectionToken: selectedPlan.token,
        pin,
      });

      if (res && res.success && res.voucher) {
        setIsPinModalOpen(false);
        setVoucherResult(res.voucher);
      } else {
        throw new Error(res?.message || "Education purchase failed.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Education purchase failed. Check PIN and balance.");
    } finally {
      setPurchasing(false);
      setPin("");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/\s+/g, "")).catch(() => {});
    setCopyToast(`${label} copied to clipboard!`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  return (
    <div className={`min-h-screen py-6 px-4 sm:px-6 transition-colors duration-200 ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"
    }`}>
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Education Services</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official WAEC, JAMB & NECO Examination e-PINs
              </p>
            </div>
          </div>
        </div>

        {/* Exam Body Selection */}
        <div className="grid grid-cols-3 gap-3">
          {EXAM_BODIES.map((item) => {
            const isSelected = selectedBody === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleBodyChange(item.id)}
                className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer text-center ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721] hover:border-slate-300"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center overflow-hidden">
                  <Image src={item.logo} alt={item.title} width={44} height={44} className="object-contain" />
                </div>
                <div>
                  <span className={`block text-sm font-bold ${isSelected ? "text-blue-600 dark:text-blue-400" : ""}`}>
                    {item.title}
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    {item.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Packages List */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Available Packages
          </label>
          {loadingPlans ? (
            <div className="p-6 text-center text-xs text-slate-500">
              Loading verified {selectedBody} packages...
            </div>
          ) : (
            <div className="space-y-2.5">
              {plans.map((p) => {
                const isSelected = selectedPlan?.planCode === p.planCode;
                return (
                  <div
                    key={p.planCode}
                    onClick={() => setSelectedPlan(p)}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721]"
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-bold">{p.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                        ₦{p.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quantity Selector */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721]">
          <div>
            <h4 className="text-sm font-bold">Voucher Quantity</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Buy 1 to 5 vouchers</p>
          </div>
          <div className="flex items-center gap-3 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded flex items-center justify-center font-bold text-lg disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              -
            </button>
            <span className="font-extrabold text-sm w-4 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(5, q + 1))}
              disabled={quantity >= 5}
              className="w-8 h-8 rounded flex items-center justify-center font-bold text-lg disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              +
            </button>
          </div>
        </div>

        {/* Candidate Details Form */}
        <div className="space-y-3.5 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721]">
          <h4 className="text-sm font-bold">Candidate Details</h4>

          {selectedBody === "JAMB" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                JAMB Profile Code (10 Digits) *
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="e.g. 5501928391"
                value={profileCode}
                onChange={(e) => setProfileCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-hidden focus:border-blue-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Recipient Phone Number (For SMS & Records) *
            </label>
            <input
              type="tel"
              maxLength={11}
              placeholder="e.g. 08012345678"
              value={candidatePhone}
              onChange={(e) => setCandidatePhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-hidden focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Candidate Full Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Ibrahim Abubakar Kano"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-hidden focus:border-blue-600"
            />
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Summary & Checkout CTA */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721] space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">Total Payable</span>
            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
              ₦{totalCost.toLocaleString()}
            </span>
          </div>

          <button
            type="button"
            onClick={handleStartPurchase}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition cursor-pointer"
          >
            Purchase {selectedBody} e-PIN • ₦{totalCost.toLocaleString()}
          </button>
        </div>
      </div>

      {/* Transaction PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721] p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-center">Confirm Transaction PIN</h3>
            <p className="text-xs text-center text-slate-500">
              Enter your 4-digit security PIN to authorize ₦{totalCost.toLocaleString()} for {selectedBody} e-PIN.
            </p>

            <form onSubmit={handleExecutePurchase} className="space-y-4">
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold outline-hidden focus:border-blue-600"
              />

              {errorMsg && (
                <p className="text-xs text-center text-red-500 font-semibold">{errorMsg}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purchasing || pin.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold shadow-xs"
                >
                  {purchasing ? "Processing..." : "Authorize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Slip Modal */}
      {voucherResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141721] p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {copyToast && (
              <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg text-center">
                {copyToast}
              </div>
            )}

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center">
                  <Image
                    src={voucherResult.examBody === "JAMB" ? "/images/education/jamb-logo.jpg" : voucherResult.examBody === "NECO" ? "/images/education/neco-logo.jpg" : "/images/education/waec-logo.png"}
                    alt="Logo"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">{voucherResult.examBody} Exam Voucher</h3>
                  <span className="text-[11px] text-emerald-600 font-bold">ISSUED & VERIFIED</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoucherResult(null)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Vouchers Block */}
            <div className="space-y-3">
              {(voucherResult.vouchers || [{ pin: voucherResult.pin, serialNumber: voucherResult.serialNumber }]).map((v: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      EXAM PIN / TOKEN
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-lg font-black tracking-wider text-blue-600 dark:text-blue-400">
                        {v.pin}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(v.pin, "PIN")}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {v.serialNumber && (
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                        SERIAL NUMBER
                      </span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                          {v.serialNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(v.serialNumber, "Serial Number")}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Candidate & Ref info */}
            <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="flex justify-between">
                <span>Reference:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{voucherResult.reference}</span>
              </div>
              <div className="flex justify-between">
                <span>Candidate Phone:</span>
                <span className="font-bold text-slate-900 dark:text-white">{voucherResult.candidatePhone}</span>
              </div>
              {voucherResult.candidateName && (
                <div className="flex justify-between">
                  <span>Candidate Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{voucherResult.candidateName}</span>
                </div>
              )}
            </div>

            {/* Portal Action & Print */}
            <div className="space-y-2 pt-2">
              <a
                href={voucherResult.portalUrl || "https://www.waecdirect.org"}
                target="_blank"
                rel="noreferrer"
                className="w-full block py-2.5 text-center rounded-xl border border-blue-600 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                Open Official {voucherResult.examBody} Verification Portal ↗
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Print Voucher Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
