"use client";

import { useEffect, useState } from "react";
import { fetchInflows, resolveUnmatchedInflow } from "@/services/api";
import { formatNaira, formatTimeAgo } from "@/lib/utils";
import Badge, { inflowStatusVariant } from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";
import type { InflowRecord } from "@/types/telecom";

export default function DepositsPage() {
  const [inflows, setInflows] = useState<InflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [resolveModal, setResolveModal] = useState<InflowRecord | null>(null);
  const [resolvingPhone, setResolvingPhone] = useState("");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveSuccess, setResolveSuccess] = useState(false);

  useEffect(() => {
    fetchInflows(1, 20, { status: filter || undefined }).then((res) => {
      setInflows(res.data);
      setLoading(false);
    });
  }, [filter]);

  const handleResolve = async () => {
    if (!resolveModal || !resolvingPhone) return;
    setResolveLoading(true);
    await resolveUnmatchedInflow(resolveModal.id, resolvingPhone, "Abba Kano");
    setResolveLoading(false);
    setResolveSuccess(true);
    setTimeout(() => {
      setResolveModal(null);
      setResolveSuccess(false);
      setResolvingPhone("");
    }, 1500);
  };

  const totals = {
    total: inflows.reduce((s, i) => s + i.amount, 0),
    settled: inflows.filter((i) => i.status === "SETTLED").reduce((s, i) => s + i.amount, 0),
    unmatched: inflows.filter((i) => i.status === "UNMATCHED").length,
  };

  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSyncWebhooks = () => {
    setSyncNotice("Webhooks synchronized with virtual account settlement nodes.");
    setTimeout(() => setSyncNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {syncNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        breadcrumbs={["Operations", "Bank Inflows & Deposits"]}
        title="Inflows & Liquidity Deposits"
        description="Automated Moniepoint DVA and Wema Bank dedicated virtual account reconciliation."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncWebhooks}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">sync</span>
              <span>Sync Webhooks</span>
            </button>
          </div>
        }
      />

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
              Unmatched Inflows
            </span>
            <span className="material-symbols-outlined text-red-600 text-[20px]">
              warning
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-600 font-mono">
            {totals.unmatched}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Requires admin telephone match
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { key: "", label: "All Inflows" },
          { key: "SETTLED", label: "Settled" },
          { key: "PENDING_SETTLEMENT", label: "Pending" },
          { key: "UNMATCHED", label: "Unmatched ⚠" },
          { key: "MANUAL_RESOLVED", label: "Manually Resolved" },
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
                      inflow.status === "UNMATCHED" ? "bg-red-50/50" : ""
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
                            : inflow.status === "UNMATCHED"
                            ? "Unmatched Action Req."
                            : "Manually Resolved"
                        }
                        withDot
                      />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-on-surface-variant font-mono whitespace-nowrap">
                      {formatTimeAgo(inflow.settledAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {inflow.status === "UNMATCHED" && (
                        <button
                          onClick={() => setResolveModal(inflow)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
                          id={`btn-resolve-inflow-${inflow.id}`}
                        >
                          Resolve Alert →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Resolution Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl shadow-modal w-full max-w-md border border-outline-variant/40 animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 text-[22px]">warning</span>
                <h2 className="font-bold text-base text-on-surface">Resolve Bank Alert</h2>
              </div>
              <button
                onClick={() => setResolveModal(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {resolveSuccess ? (
              <div className="px-6 py-10 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[48px]">
                  check_circle
                </span>
                <p className="font-bold text-base text-on-surface">Deposit Credited to Wallet</p>
                <p className="text-xs text-on-surface-variant text-center max-w-xs">
                  The unmatched inflow has been matched with customer and ledger credited successfully.
                </p>
              </div>
            ) : (
              <>
                <div className="px-6 py-5 space-y-4">
                  <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 text-xs space-y-1.5 font-mono text-red-900">
                    <p className="text-sm font-bold text-red-950 font-sans">
                      {formatNaira(resolveModal.amount)}
                    </p>
                    <p>Bank Ref: {resolveModal.bankRef}</p>
                    <p>Bank: {resolveModal.bankName}</p>
                    <p>Received: {formatTimeAgo(resolveModal.settledAt)}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">
                      Recipient Customer Phone Number
                    </label>
                    <input
                      type="tel"
                      value={resolvingPhone}
                      onChange={(e) => setResolvingPhone(e.target.value)}
                      placeholder="e.g. 08031234567"
                      className="w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    ⚠ Crediting <strong className="text-on-surface">{formatNaira(resolveModal.amount)}</strong> will immediately adjust user ledger and notify customer via SMS. Logged to immutable audit trail.
                  </p>
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button
                    onClick={() => setResolveModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-xs sm:text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={!resolvingPhone || resolveLoading}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold disabled:opacity-50 hover:bg-primary-container transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    id="btn-confirm-resolve-inflow"
                  >
                    {resolveLoading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Confirm Credit</span>
                      </>
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
