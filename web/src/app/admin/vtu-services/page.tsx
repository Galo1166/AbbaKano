"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchTransactions } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge, { txStatusVariant } from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import Toggle from "@admin/components/ui/Toggle";
import type { Transaction } from "@admin/types/telecom";

const CARRIERS = ["ALL", "MTN", "AIRTEL", "GLO", "9MOBILE"] as const;
const resolveCarrierImage = (carrier: string) => {
  const normalized = String(carrier || "").trim().toUpperCase();
  const imageMap: Record<string, string> = {
    MTN: "/carriers/mtn.png",
    AIRTEL: "/carriers/airtel.png",
    GLO: "/carriers/glo.png",
    "9MOBILE": "/carriers/9mobile.png",
    AEDC: "/branding/logo.png",
    IKEDC: "/branding/logo.png",
    KEDCO: "/branding/logo.png",
    PHED: "/branding/logo.png",
    JED: "/branding/logo.png",
    DSTV: "/branding/logo.png",
    GOTV: "/branding/logo.png",
    STARTIMES: "/branding/logo.png",
    VTUGATE: "/branding/logo.png",
  };
  return imageMap[normalized] || "/branding/logo.png";
};

interface GatewayControl {
  carrier: string;
  gateway: string;
  active: boolean;
  speed: string;
}

export default function VtuServicesPage() {
  const [dispatches, setDispatches] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrier, setCarrier] = useState<string>("ALL");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [gateways, setGateways] = useState<GatewayControl[]>([
    { carrier: "MTN", gateway: "MTN Corporate Direct v4", active: true, speed: "24ms" },
    { carrier: "AIRTEL", gateway: "Airtel Direct SMPP", active: true, speed: "31ms" },
    { carrier: "GLO", gateway: "Glo Cloud Aggregator", active: true, speed: "45ms" },
    { carrier: "9MOBILE", gateway: "9mobile Link 03", active: false, speed: "112ms" },
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions(1, 25, { carrier: carrier === "ALL" ? undefined : carrier }).then((res) => {
      setDispatches(res.data);
      setLoading(false);
    });
  }, [carrier]);

  const handleToggleGateway = (carrierName: string, nextState: boolean) => {
    setGateways((prev) =>
      prev.map((g) => {
        if (g.carrier === carrierName) {
          setToastMessage(
            `${g.carrier} Gateway routing is now ${nextState ? "ACTIVE" : "PAUSED"}.`
          );
          setTimeout(() => setToastMessage(null), 3000);
          return { ...g, active: nextState };
        }
        return g;
      })
    );
  };

  const handleRetry = async (txnId: string) => {
    setRetryingId(txnId);
    await new Promise((r) => setTimeout(r, 1000));
    setDispatches((prev) =>
      prev.map((d) => (d.id === txnId ? { ...d, status: "SUCCESS" } : d))
    );
    setRetryingId(null);
    setToastMessage(`Transaction #${txnId} re-dispatched successfully.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const failed = dispatches.filter((d) => d.status === "FAILED").length;
  const pending = dispatches.filter((d) => d.status === "PENDING").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        breadcrumbs={["Operations", "VTU Services"]}
        title="VTU Services & Routing"
        description="Monitor network dispatch pipes and control automated delivery per telecom carrier."
        actions={
          <div className="flex items-center gap-2">
            {failed > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {failed} Failed
              </span>
            )}
            {pending > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                {pending} Pending
              </span>
            )}
          </div>
        }
      />

      {/* Gateway Toast Feedback */}
      {toastMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-medium text-blue-900 flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[16px] text-blue-600">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Gateway Routing Toggles — Pixel-perfect Toggle component */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Carrier Gateway Controls</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Turn network dispatches on or off
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Failover: 800ms</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {gateways.map((g) => (
            <div
              key={g.carrier}
              className="flex flex-col justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Image
                      src={resolveCarrierImage(g.carrier)}
                      alt={g.carrier}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                    <span className="font-bold text-sm text-slate-900">{g.carrier}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">{g.speed}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{g.gateway}</p>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60">
                <span
                  className={`text-xs font-semibold ${
                    g.active ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {g.active ? "Active" : "Paused"}
                </span>

                {/* Pixel-perfect Reusable Toggle */}
                <Toggle
                  checked={g.active}
                  onChange={(next) => handleToggleGateway(g.carrier, next)}
                  id={`btn-gateway-toggle-${g.carrier.toLowerCase()}`}
                  label={`Toggle ${g.carrier} route`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carrier Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {CARRIERS.map((c) => (
          <button
            key={c}
            onClick={() => setCarrier(c)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              carrier === c
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {c !== "ALL" && (
              <Image
                src={resolveCarrierImage(c)}
                alt={c}
                width={14}
                height={14}
                className="object-contain"
              />
            )}
            {c === "ALL" ? "All Networks" : c}
          </button>
        ))}
      </div>

      {/* Dispatch Stream Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Live Dispatches</h2>
          <span className="text-xs text-slate-400 font-mono">
            {dispatches.length} recent orders
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Reference
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Phone Number
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Network
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Plan / SKU
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Amount
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Delivery Status
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Gateway
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Time
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dispatches.map((d) => (
                  <tr
                    key={d.id}
                    className={`hover:bg-slate-50/60 transition-colors ${
                      d.status === "FAILED" ? "bg-rose-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {d.reference}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-900 whitespace-nowrap font-medium">
                      {d.customerPhone}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Image
                          src={resolveCarrierImage(d.carrier)}
                          alt={d.carrier}
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                        <span className="text-xs font-semibold text-slate-800">{d.carrier}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700 max-w-[140px] truncate whitespace-nowrap">
                      {d.plan}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                      {formatNaira(d.sellingPrice)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={txStatusVariant(d.status)}
                        label={
                          d.status === "SUCCESS"
                            ? "Delivered"
                            : d.status === "PENDING"
                            ? "Pending"
                            : d.status === "REFUNDED"
                            ? "Refunded"
                            : "Failed"
                        }
                        withDot
                      />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {d.gateway}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {formatTimeAgo(d.timestamp)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {d.status === "FAILED" ? (
                        <button
                          onClick={() => handleRetry(d.id)}
                          disabled={retryingId === d.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-primary bg-slate-100 hover:bg-slate-200 font-semibold disabled:opacity-60 transition-colors cursor-pointer"
                          id={`btn-retry-dispatch-${d.id}`}
                        >
                          {retryingId === d.id ? (
                            <div className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin" />
                          ) : (
                            <span className="material-symbols-outlined text-[14px]">replay</span>
                          )}
                          <span>Retry</span>
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
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
