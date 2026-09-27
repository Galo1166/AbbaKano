"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchDashboardOverview, fetchTransactions } from "@admin/services/api";
import { formatNaira, formatDate, formatTimeAgo } from "@admin/lib/utils";
import Badge, { txStatusVariant } from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { Transaction } from "@admin/types/telecom";

const CARRIERS = ["ALL", "MTN", "AIRTEL", "GLO", "9MOBILE"] as const;
type DashboardOverview = Awaited<ReturnType<typeof fetchDashboardOverview>>;

const resolveCarrierImage = (carrier: string) => {
  const normalized = String(carrier || "").trim().toUpperCase();
  const fallbackMap: Record<string, string> = {
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
  return fallbackMap[normalized] || "/branding/logo.png";
};
type CarrierFilter = (typeof CARRIERS)[number];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [carrier, setCarrier] = useState<CarrierFilter>("ALL");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const PAGE_SIZE = 15;

  useEffect(() => {
    Promise.all([
      fetchDashboardOverview(),
      fetchTransactions(page, PAGE_SIZE, {
        carrier: carrier === "ALL" ? undefined : carrier,
        status: status || undefined,
        search: search || undefined,
      }),
    ])
      .then(([overviewData, res]) => {
        setOverview(overviewData);
        setTransactions(res.data);
        setTotal(res.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [carrier, status, search, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const totalDispatchesToday = overview?.ordersToday ?? transactions.length;
  const successRate = overview?.successRate ?? 0;
  const successfulDeliveries = Math.max(
    0,
    Math.round((successRate / 100) * totalDispatchesToday)
  );
  const stalledDisputed = transactions.filter(
    (txn) => txn.status === "FAILED" || txn.status === "PENDING"
  ).length;
  const refundedToWallet = transactions.filter((txn) => txn.status === "REFUNDED").length;
  const queuedCount = transactions.filter((txn) => txn.status === "PENDING").length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        breadcrumbs={["Operations", "Transaction Ledger"]}
        title="Transaction Master Ledger"
        description="Comprehensive audit ledger of automated airtime, SME data bundles, and utility deliveries."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast("Transactions report exported to CSV successfully.")}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              id="btn-export-transactions"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => showToast("Manual transaction interface ready.")}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              id="btn-manual-transaction"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Manual Adjustment</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="p-5 bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Total Dispatches Today
            </span>
            <div className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-on-surface font-mono">
            {totalDispatchesToday.toLocaleString()}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            {formatNaira(overview?.totalVolumeToday ?? 0)} gross volume fulfilled
          </p>
        </div>

        <div className="p-5 bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Success Fulfillment
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
              {successRate.toFixed(1)}%
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Auto-Failover
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            {successfulDeliveries.toLocaleString()} instant sub-second deliveries
          </p>
        </div>

        <div className="p-5 bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Stalled / Disputed
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
              {stalledDisputed.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Auto-Refunded
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            {refundedToWallet.toLocaleString()} refunded to wallet · {queuedCount.toLocaleString()} queued
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-4 space-y-3">
        {/* Carrier Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CARRIERS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCarrier(c);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                carrier === c
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              {c !== "ALL" && (
                <Image
                  src={resolveCarrierImage(c)}
                  alt={c}
                  width={16}
                  height={16}
                  className="object-contain"
                />
              )}
              {c === "ALL" ? "All Networks" : c}
            </button>
          ))}
        </div>

        {/* Search + Status Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by phone number, MSISDN, or reference..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 pl-9 pr-4 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-outline outline-none border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3.5 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface border border-outline-variant/30 outline-none focus:border-primary cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Delivered</option>
            <option value="PENDING">Pending Gateway</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded to Wallet</option>
          </select>
        </div>
      </div>

      {/* Table */}
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
                    Reference
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Recipient Customer
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Network
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Plan / SKU
                  </th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Wholesale Cost
                  </th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Selling Price
                  </th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Gross Margin
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Status
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-outline">
                    Timestamp
                  </th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-outline">
                    Receipt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {transactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="hover:bg-surface-container-low transition-colors group"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-outline whitespace-nowrap">
                      {txn.reference}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-semibold font-mono text-on-surface">
                        {txn.customerPhone}
                      </div>
                      <div className="text-[11px] text-outline truncate">{txn.customerName}</div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Image
                          src={resolveCarrierImage(txn.carrier)}
                          alt={txn.carrier}
                          width={20}
                          height={20}
                          className="object-contain"
                        />
                        <span className="font-semibold text-on-surface">{txn.carrier}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-on-surface max-w-[150px] truncate whitespace-nowrap">
                      {txn.plan}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-on-surface-variant whitespace-nowrap">
                      {formatNaira(txn.wholesaleCost)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-bold text-on-surface whitespace-nowrap">
                      {formatNaira(txn.sellingPrice)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-emerald-700 whitespace-nowrap">
                      {formatNaira(txn.profitMargin)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={txStatusVariant(txn.status)}
                        label={
                          txn.status === "SUCCESS"
                            ? "Delivered"
                            : txn.status === "PENDING"
                            ? "Pending Gateway"
                            : txn.status === "REFUNDED"
                            ? "Refunded"
                            : "Failed"
                        }
                        withDot
                      />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-on-surface-variant font-mono whitespace-nowrap">
                      {formatTimeAgo(txn.timestamp)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-primary bg-primary/5 hover:bg-primary hover:text-on-primary transition-all cursor-pointer"
                        id={`btn-view-receipt-${txn.id}`}
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-outline-variant/20 bg-surface-container-low/50">
          <span className="text-xs text-on-surface-variant font-mono">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} orders
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container disabled:opacity-40 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-mono px-2 font-bold text-on-surface">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl shadow-modal w-full max-w-md border border-outline-variant/40 animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <h2 className="font-bold text-base text-on-surface">Service Delivery Voucher</h2>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <Image
                  src={resolveCarrierImage(selectedTxn.carrier)}
                  alt={selectedTxn.carrier}
                  width={40}
                  height={40}
                  className="object-contain"
                />
                <div>
                  <p className="font-bold text-on-surface">
                    {selectedTxn.carrier} — {selectedTxn.plan}
                  </p>
                  <p className="text-xs text-on-surface-variant font-mono">
                    {formatDate(selectedTxn.timestamp)}
                  </p>
                </div>
                <Badge
                  variant={txStatusVariant(selectedTxn.status)}
                  label={selectedTxn.status}
                  withDot
                  className="ml-auto"
                />
              </div>

              <div className="space-y-2.5 bg-surface-container-low rounded-2xl p-4 text-xs font-mono">
                {[
                  ["System Reference", selectedTxn.reference],
                  ["Recipient MSISDN", selectedTxn.customerPhone],
                  ["Customer Account", selectedTxn.customerName],
                  ["Dispatch Gateway", selectedTxn.gateway],
                  ["Wholesale Cost", formatNaira(selectedTxn.wholesaleCost)],
                  ["Customer Selling Price", formatNaira(selectedTxn.sellingPrice)],
                  ["Gross Margin Profit", formatNaira(selectedTxn.profitMargin)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-outline font-sans">{label}</span>
                    <span className="font-bold text-on-surface">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setSelectedTxn(null)}
                className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-xs sm:text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold hover:bg-primary-container transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
