"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchProviderBalances, initiateProviderRefill } from "@/services/api";
import { formatNaira, formatTimeAgo } from "@/lib/utils";
import Badge, { providerStatusVariant } from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";
import type { ProviderBalance } from "@/types/telecom";

export default function ProviderBalancesPage() {
  const [providers, setProviders] = useState<ProviderBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refillModal, setRefillModal] = useState<ProviderBalance | null>(null);
  const [refillAmount, setRefillAmount] = useState("");
  const [refillLoading, setRefillLoading] = useState(false);
  const [refillRef, setRefillRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchProviderBalances().then((data) => {
      setProviders(data);
      setLoading(false);
    });
  }, []);

  const [refillError, setRefillError] = useState<string | null>(null);

  const handleRefill = async () => {
    if (!refillModal || !refillAmount) return;
    setRefillError(null);
    const numeric = parseFloat(refillAmount.replace(/,/g, ""));
    if (isNaN(numeric) || numeric <= 0) {
      setRefillError("Please enter a valid refill amount greater than ₦0.00.");
      return;
    }
    setRefillLoading(true);
    try {
      const res = await initiateProviderRefill(refillModal.id, numeric);
      if (res.success && res.data) {
        setRefillRef(res.data.transferRef);
      } else {
        setRefillError(res.error || "Failed to initiate provider refill.");
      }
    } catch {
      setRefillError("Network error: Could not complete refill request.");
    } finally {
      setRefillLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const CARRIER_IMAGES: Record<string, string> = {
    MTN: "/carriers/mtn.png",
    AIRTEL: "/carriers/airtel.png",
    GLO: "/carriers/glo.png",
    "9MOBILE": "/carriers/9mobile.png",
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        breadcrumbs={["Operations", "Provider Balances"]}
        title="Provider Liquidity & Balances"
        description="Upstream telecommunication supplier vault reserves and automated low-stock runway monitors."
        actions={
          <button
            onClick={() => {
              const lowest = providers.find((p) => p.status === "CRITICAL" || p.status === "LOW_BALANCE");
              if (lowest) setRefillModal(lowest);
            }}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Initiate Refill</span>
          </button>
        }
      />

      {/* Critical Runway Warnings */}
      {providers.some((p) => ["CRITICAL", "LOW_BALANCE"].includes(p.status)) && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
          <span className="material-symbols-outlined text-red-600 text-[24px] shrink-0 mt-0.5">
            warning
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-950 text-sm">
              Liquidity Threshold Alert — Urgent Refill Required
            </p>
            <p className="text-xs text-red-800 mt-1 leading-relaxed">
              {providers
                .filter((p) => p.estimatedRunwayHours < 24)
                .map((p) => p.providerName)
                .join(", ")}{" "}
              has under 24 hours of dispatch runway remaining. Replenish reserve balance to avoid customer order failures.
            </p>
          </div>
        </div>
      )}

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {providers.map((provider) => {
          const isCritical = provider.status === "CRITICAL";
          const isLow = provider.status === "LOW_BALANCE";
          const percentage = Math.min(
            100,
            Math.round((provider.balance / (provider.balance + provider.lowBalanceThreshold)) * 100)
          );

          return (
            <div
              key={provider.id}
              className={`bg-surface-container-lowest rounded-2xl border shadow-card p-5 sm:p-6 flex flex-col justify-between gap-5 transition-all hover:shadow-card-hover ${
                isCritical
                  ? "border-red-300 ring-1 ring-red-200"
                  : isLow
                  ? "border-amber-300 ring-1 ring-amber-200"
                  : "border-outline-variant/30"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center p-1.5 shrink-0">
                    <Image
                      src={CARRIER_IMAGES[provider.carrier]}
                      alt={provider.carrier}
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-base text-on-surface leading-tight">
                      {provider.providerName}
                    </p>
                    <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                      Last Refill: {formatTimeAgo(provider.lastRefillAt)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={providerStatusVariant(provider.status)}
                  label={provider.status === "LOW_BALANCE" ? "Low Balance" : provider.status}
                  withDot
                />
              </div>

              {/* Current Reserve */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
                  Active Vault Balance
                </p>
                <p className="text-3xl sm:text-4xl font-extrabold text-on-surface font-mono tracking-tight">
                  {formatNaira(provider.balance)}
                </p>
              </div>

              {/* Progress & Threshold */}
              <div>
                <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1.5 font-medium">
                  <span>Vault Reserve Ratio</span>
                  <span className="font-mono font-bold">{percentage}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical
                        ? "bg-red-600"
                        : isLow
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-outline mt-1.5 font-mono">
                  <span>Threshold: {formatNaira(provider.lowBalanceThreshold)}</span>
                  <span>Safety Buffer Active</span>
                </div>
              </div>

              {/* Runway Box */}
              <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/20">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline">
                    Estimated Operating Runway
                  </p>
                  <p
                    className={`text-xl font-bold font-mono mt-0.5 ${
                      provider.estimatedRunwayHours < 24 ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    ~{provider.estimatedRunwayHours} Hours
                  </p>
                </div>
                {provider.estimatedRunwayHours < 24 && (
                  <span className="text-[11px] font-bold text-red-800 bg-red-100 px-2.5 py-1 rounded-lg">
                    Critical Refill
                  </span>
                )}
              </div>

              {/* Refill CTA Button */}
              <button
                onClick={() => setRefillModal(provider)}
                className={`w-full py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                  isCritical
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-primary text-on-primary hover:bg-primary-container"
                }`}
                id={`btn-refill-${provider.id}`}
              >
                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                <span>Refill Vault Reserves</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Refill Modal */}
      {refillModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl shadow-modal w-full max-w-md border border-outline-variant/40 animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <h2 className="font-bold text-base text-on-surface">Initiate Reserve Refill</h2>
              <button
                onClick={() => {
                  setRefillModal(null);
                  setRefillRef(null);
                  setRefillAmount("");
                }}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {refillRef ? (
              <div className="px-6 py-8 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[48px]">
                  check_circle
                </span>
                <p className="font-bold text-base text-on-surface">Transfer Details Generated</p>
                <p className="text-xs text-on-surface-variant text-center max-w-xs">
                  Transfer funds to the dedicated provider account below using this reference.
                </p>

                <div className="w-full bg-surface-container-low rounded-xl p-3 flex items-center justify-between border border-outline-variant/30">
                  <span className="font-mono text-xs font-bold text-primary">{refillRef}</span>
                  <button
                    onClick={() => handleCopy(refillRef)}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="w-full text-xs space-y-2 pt-2 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 font-mono">
                  <div className="flex justify-between">
                    <span className="text-outline">Bank:</span>
                    <strong className="text-on-surface">{refillModal.refillBankName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Account No:</span>
                    <strong className="text-on-surface font-bold">
                      {refillModal.refillAccountNumber}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setRefillModal(null);
                    setRefillRef(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold mt-2 cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-3 bg-surface-container-low rounded-2xl p-4 border border-outline-variant/20">
                    <Image
                      src={CARRIER_IMAGES[refillModal.carrier]}
                      alt={refillModal.carrier}
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                    <div>
                      <p className="font-bold text-sm text-on-surface">
                        {refillModal.providerName}
                      </p>
                      <p className="text-xs text-on-surface-variant font-mono">
                        Active Balance: {formatNaira(refillModal.balance)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 bg-surface-container-low rounded-2xl p-4 text-xs">
                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
                      Provider Bank Details
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">Bank Name</span>
                      <span className="font-semibold text-on-surface">
                        {refillModal.refillBankName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">Account Number</span>
                      <span className="font-mono font-bold text-on-surface">
                        {refillModal.refillAccountNumber}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">
                      Refill Amount (₦)
                    </label>
                    <input
                      type="text"
                      value={refillAmount}
                      onChange={(e) => {
                        setRefillAmount(e.target.value);
                        if (refillError) setRefillError(null);
                      }}
                      placeholder="e.g. 500,000.00"
                      className="w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>

                  {refillError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-red-600">error</span>
                      <span>{refillError}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button
                    onClick={() => setRefillModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-xs sm:text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefill}
                    disabled={!refillAmount || refillLoading}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold disabled:opacity-50 hover:bg-primary-container transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    id="btn-confirm-provider-refill"
                  >
                    {refillLoading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      "Generate Transfer Details"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
