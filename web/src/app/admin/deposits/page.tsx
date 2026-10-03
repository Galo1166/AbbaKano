"use client";

import { useEffect, useState } from "react";
import { fetchInflows } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge, { inflowStatusVariant } from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { InflowRecord } from "@admin/types/telecom";

export default function DepositsPage() {
  const [inflows, setInflows] = useState<InflowRecord[]>([]);
  const [metrics, setMetrics] = useState({ totalCount: 0, totalAmount: 0, settledAmount: 0, failedCount: 0 });
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const PAGE_SIZE = 20;
  const requestKey = JSON.stringify([filter, search, page]);
  const loading = loadedRequestKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    fetchInflows(page, PAGE_SIZE, { status: filter || undefined, search: search || undefined })
      .then((res) => {
        if (cancelled) return;
        setErrorMessage(null);
        setInflows(res.data);
        setTotal(res.total);
        setMetrics(res.metrics);
        setLoadedRequestKey(requestKey);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load deposits.");
        setInflows([]);
        setTotal(0);
        setMetrics({ totalCount: 0, totalAmount: 0, settledAmount: 0, failedCount: 0 });
        setLoadedRequestKey(requestKey);
      });
    return () => { cancelled = true; };
  }, [filter, search, page, requestKey]);

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
            {formatNaira(metrics.totalAmount)}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            {metrics.totalCount.toLocaleString()} deposits recorded
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
            {formatNaira(metrics.settledAmount)}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Successfully settled deposits
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
            {metrics.failedCount}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Requires payment investigation
          </p>
        </div>
      </div>

      <div className="relative w-full sm:max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
          search
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search customer, phone, or reference..."
          className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest pl-9 pr-3 text-xs sm:text-sm text-on-surface outline-none focus:border-primary"
        />
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-outline-variant/20 bg-surface-container-low/50">
          <span className="text-xs text-on-surface-variant font-mono">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} deposits
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant bg-surface-container-lowest border border-outline-variant/30 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs font-mono px-2 font-bold text-on-surface">
              {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(Math.ceil(total / PAGE_SIZE), current + 1))}
              disabled={page >= Math.ceil(total / PAGE_SIZE) || loading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant bg-surface-container-lowest border border-outline-variant/30 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
