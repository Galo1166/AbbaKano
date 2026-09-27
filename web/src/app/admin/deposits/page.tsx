"use client";

import { useEffect, useState } from "react";
import { fetchInflows } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge, { inflowStatusVariant } from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { InflowRecord } from "@admin/types/telecom";

export default function DepositsPage() {
  const [inflows, setInflows] = useState<InflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchInflows(1, 20, { status: filter || undefined })
      .then((res) => {
        setErrorMessage(null);
        setInflows(res.data);
      })
      .catch((error: unknown) => setErrorMessage(error instanceof Error ? error.message : "Unable to load deposits."))
      .finally(() => setLoading(false));
  }, [filter]);

  const totals = {
    total: inflows.reduce((s, i) => s + i.amount, 0),
    settled: inflows.filter((i) => i.status === "SETTLED").reduce((s, i) => s + i.amount, 0),
    failed: inflows.filter((i) => i.status === "FAILED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={["Operations", "Bank Inflows & Deposits"]}
        title="Inflows & Liquidity Deposits"
        description="Automated Moniepoint DVA and Wema Bank dedicated virtual account reconciliation."
        actions={null}
      />

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Total Inflows Ingested
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">
              account_balance_wallet
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-on-surface font-mono">
            {formatNaira(totals.total)}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            {inflows.length} virtual account deposits
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Settled to Reseller Wallets
            </span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">
              check_circle
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
            {formatNaira(totals.settled)}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            {inflows.filter((i) => i.status === "SETTLED").length} auto-credited balances
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Failed Deposits
            </span>
            <span className="material-symbols-outlined text-red-600 text-[20px]">
              warning
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-600 font-mono">
            {totals.failed}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Requires payment investigation
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: "", label: "All Inflows" },
          { key: "SETTLED", label: "Settled" },
          { key: "PENDING_SETTLEMENT", label: "Pending" },
          { key: "FAILED", label: "Failed" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter === s.key
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Inflow Ledger Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          </div>
        ) : inflows.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[36px] text-outline mb-1">receipt_long</span>
            <p className="font-semibold text-sm text-on-surface">No deposit records found</p>
            <p className="text-xs mt-0.5">Try a different status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low/70">
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Customer Name
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    DVA Number
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Destination Bank
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Settlement Reference
                  </th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Amount
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Settlement State
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Received
                  </th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-outline">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {inflows.map((inflow) => (
                  <tr
                    key={inflow.id}
                    className={`hover:bg-surface-container-low transition-colors ${
                      inflow.status === "FAILED" ? "bg-red-50/50" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 font-medium text-on-surface whitespace-nowrap">
                      {inflow.customerName}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-on-surface-variant whitespace-nowrap">
                      {inflow.virtualAccount}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-on-surface whitespace-nowrap font-medium">
                      {inflow.bankName}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-outline whitespace-nowrap">
                      {inflow.bankRef}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                      {formatNaira(inflow.amount)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={inflowStatusVariant(inflow.status)}
                        label={
                          inflow.status === "SETTLED"
                            ? "Settled"
                            : inflow.status === "PENDING_SETTLEMENT"
                            ? "Pending Settlement"
                            : "Failed"
                        }
                        withDot
                      />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-on-surface-variant font-mono whitespace-nowrap">
                      {formatTimeAgo(inflow.settledAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <span className="text-[11px] text-outline">View only</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
