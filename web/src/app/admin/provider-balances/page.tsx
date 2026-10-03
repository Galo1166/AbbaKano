"use client";

import { useEffect, useState } from "react";
import { fetchProviderBalances } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge, { providerStatusVariant } from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { ProviderBalance } from "@admin/types/telecom";

export default function ProviderBalancesPage() {
  const [providers, setProviders] = useState<ProviderBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  useEffect(() => {
    fetchProviderBalances()
      .then((data) => {
        setErrorMessage(null);
        setProviders(data);
      })
      .catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : "Unable to load VTUGATE balance."))
      .finally(() => setLoading(false));
  }, []);

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
        description="Live VTUGATE account balance and configured funding details."
        actions={null}
      />

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-800">
          <p className="font-bold">Unable to load VTUGATE balance</p>
          <p className="text-xs mt-1">{errorMessage}</p>
        </div>
      )}

      {/* Critical Runway Warnings */}
      {providers.some((p) => p.status === "CRITICAL" || p.status === "LOW_BALANCE") && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
          <span className="material-symbols-outlined text-red-600 text-[24px] shrink-0 mt-0.5">
            warning
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-950 text-sm">
              {providers.some((p) => p.status === "CRITICAL")
                ? "VTUGATE Balance Critical"
                : "VTUGATE Balance Low"}
            </p>
            <p className="text-xs text-red-800 mt-1 leading-relaxed">
              {providers.some((p) => p.status === "CRITICAL")
                ? "VTUGATE is at or below zero balance. Replenish the provider account before dispatches fail."
                : "VTUGATE is at or below the configured low-balance threshold. Replenish the provider account soon."}
            </p>
          </div>
        </div>
      )}

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6">
        {providers.map((provider) => {
          const isCritical = provider.status === "CRITICAL";
          const isLow = provider.status === "LOW_BALANCE";
          const percentage = provider.lowBalanceThreshold > 0
            ? Math.min(100, Math.max(0, Math.round(
                provider.balance / provider.lowBalanceThreshold * 100,
              )))
            : provider.balance > 0 ? 100 : 0;

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
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[24px]">account_balance</span>
                  </div>
                  <div>
                    <p className="font-bold text-base text-on-surface leading-tight">
                      {provider.providerName}
                    </p>
                    <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                      Last checked: {formatTimeAgo(provider.lastRefillAt)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={providerStatusVariant(provider.status)}
                  label={provider.status}
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
                  <span>Balance vs. Low-balance Threshold</span>
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
                  <span>{provider.balance > provider.lowBalanceThreshold ? "Above threshold" : "At/below threshold"}</span>
                </div>
              </div>

              {/* Provider Check */}
              <div className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/20">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline">
                    Provider API Check
                  </p>
                  <p className={`text-sm font-bold font-mono mt-0.5 ${isCritical ? "text-red-700" : isLow ? "text-amber-700" : "text-emerald-700"}`}>
                    Connected
                  </p>
                </div>
                <span className="text-[11px] text-on-surface-variant">Live account details</span>
              </div>

            </div>
          );
        })}
      </div>

      {providers[0]?.fundingOptions && providers[0].fundingOptions.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-bold text-on-surface">Fund VTUGATE Balance</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Transfer to one of these live payment accounts, then confirm settlement in Deposit History.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers[0].fundingOptions.map((option) => (
              <div key={option.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm text-on-surface">{option.name}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{option.fee}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                    {option.status}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  {option.bankName && (
                    <div className="flex justify-between gap-3">
                      <span className="text-on-surface-variant">Bank</span>
                      <span className="font-semibold text-on-surface">{option.bankName}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-on-surface-variant">Account name</span>
                    <span className="font-semibold text-on-surface text-right">{option.accountName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
                    <span className="text-on-surface-variant">Account number</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(option.accountNumber);
                        setCopiedAccount(option.id);
                        setTimeout(() => setCopiedAccount(null), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 font-mono font-bold text-primary hover:opacity-80 cursor-pointer"
                    >
                      <span>{option.accountNumber}</span>
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedAccount === option.id ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
