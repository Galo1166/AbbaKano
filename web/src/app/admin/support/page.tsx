"use client";

import { useEffect, useState } from "react";
import { fetchSupportCases, creditUserWallet } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { SupportCase } from "@admin/types/telecom";

const priorityVariant = (p: string) =>
  p === "URGENT" ? "critical" : p === "HIGH" ? "failed" : p === "MEDIUM" ? "pending" : "neutral";
const statusVariant = (s: string) =>
  s === "RESOLVED" ? "success" : s === "IN_PROGRESS" ? "info" : s === "ESCALATED" ? "critical" : "neutral";

export default function SupportPage() {
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportCase | null>(null);
  const [creditModal, setCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [superAdminConfirm, setSuperAdminConfirm] = useState(false);
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditSuccess, setCreditSuccess] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchSupportCases().then((data) => {
      setCases(data);
      if (data.length > 0) setSelected(data[0]);
      setLoading(false);
    });
  }, []);

  const [creditError, setCreditError] = useState<string | null>(null);

  const handleCredit = async () => {
    if (!selected || !creditAmount) return;
    setCreditError(null);
    const amount = parseFloat(creditAmount.replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) {
      setCreditError("Please enter a valid credit amount greater than ?0.00.");
      return;
    }
    if (amount > 500000) {
      setCreditError("Single credit limit cannot exceed ?500,000.00.");
      return;
    }
    if (amount > 50000 && !superAdminConfirm) {
      setSuperAdminConfirm(true);
      return;
    }
    setCreditLoading(true);
    try {
      await creditUserWallet(selected.id, amount, creditReason, "Abba Kano");
      setCreditLoading(false);
      setCreditSuccess(true);
      setTimeout(() => {
        setCreditModal(false);
        setCreditSuccess(false);
        setCreditAmount("");
        setCreditReason("");
        setSuperAdminConfirm(false);
        setActionNotice(`₦${amount.toLocaleString()} credited to ${selected.customerName}'s wallet.`);
        setTimeout(() => setActionNotice(null), 3500);
      }, 1800);
    } catch {
      setCreditLoading(false);
      setCreditError("Failed to disburse credit. Please try again.");
    }
  };

  const handleMarkResolved = (c: SupportCase) => {
    setCases((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, status: "RESOLVED" as SupportCase["status"] } : item))
    );
    setSelected((prev) => (prev?.id === c.id ? { ...prev, status: "RESOLVED" as SupportCase["status"] } : prev));
    setActionNotice(`Ticket ${c.ticketRef} marked as RESOLVED`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const creditValue = parseFloat((creditAmount || "0").replace(/,/g, ""));
  const needsSuperAdmin = creditValue > 50000;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        breadcrumbs={["Administration", "Support Escalations"]}
        title="Support & Customer Resolution Desk"
        description="WhatsApp live inquiry queue, dispute investigations, and customer wallet compensations."
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Open Inquiries", value: cases.filter((c) => c.status === "OPEN").length, color: "text-blue-700", icon: "inbox" },
          { label: "In Investigation", value: cases.filter((c) => c.status === "IN_PROGRESS").length, color: "text-primary", icon: "pending" },
          { label: "Escalated Cases", value: cases.filter((c) => c.status === "ESCALATED").length, color: "text-red-600", icon: "warning" },
          { label: "Resolved Today", value: cases.filter((c) => c.status === "RESOLVED").length, color: "text-emerald-700", icon: "task_alt" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-4 sm:p-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
                {s.label}
              </span>
              <span className={`material-symbols-outlined text-[18px] ${s.color}`}>
                {s.icon}
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-extrabold font-mono ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
            <h2 className="text-base font-bold text-on-surface">Queue Stream</h2>
            <span className="text-xs font-mono font-semibold text-outline">
              {cases.length} cases
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10 overflow-y-auto max-h-[600px]">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-5 py-4 transition-all cursor-pointer ${
                    selected?.id === c.id
                      ? "bg-primary/5 border-l-4 border-primary"
                      : "hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                        c.channel === "WHATSAPP" ? "bg-emerald-600" : "bg-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {c.channel === "WHATSAPP" ? "chat" : "mail"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                          {c.customerName}
                        </span>
                        <Badge variant={priorityVariant(c.priority)} label={c.priority} />
                      </div>
                      <p className="text-xs text-on-surface-variant line-clamp-1">{c.issue}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/10 text-[10px] text-outline font-mono">
                        <span>{c.ticketRef}</span>
                        <span>{formatTimeAgo(c.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customer Profile & Resolution Panel (7 cols) */}
        <div className="lg:col-span-7">
          {selected ? (
            <div className="space-y-5">
              {/* Snapshot */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-bold text-base font-mono shadow-sm">
                      {selected.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-base text-on-surface leading-tight">
                        {selected.customerName}
                      </p>
                      <p className="font-mono text-xs text-outline mt-0.5">
                        {selected.customerPhone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={statusVariant(selected.status)}
                      label={selected.status.replace("_", " ")}
                      withDot
                    />
                    <Badge variant={priorityVariant(selected.priority)} label={selected.priority} />
                  </div>
                </div>

                {/* Ticket Details Box */}
                <div className="bg-surface-container-low rounded-2xl p-4 sm:p-5 space-y-3 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
                    Reported Inquiry & Payload
                  </p>
                  <p className="text-xs sm:text-sm text-on-surface leading-relaxed">
                    {selected.issue}
                  </p>
                  <div className="pt-3 border-t border-outline-variant/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-on-surface-variant font-mono">
                    <div>
                      <span className="text-[10px] text-outline block">Ticket Ref</span>
                      <strong className="text-on-surface">{selected.ticketRef}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-outline block">Channel</span>
                      <strong className="text-on-surface">{selected.channel}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-outline block">Opened</span>
                      <strong className="text-on-surface">{formatTimeAgo(selected.createdAt)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-outline block">Assigned Lead</span>
                      <strong className="text-on-surface">{selected.assignedTo || "Unassigned"}</strong>
                    </div>
                  </div>
                </div>

                {/* Quick Action Matrix */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-outline uppercase tracking-wider">
                    Desk Remediation Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => setCreditModal(true)}
                      className="p-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      id="btn-manual-wallet-credit"
                    >
                      <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                      <span>Credit Wallet</span>
                    </button>

                    <button
                      onClick={() => {
                        setActionNotice(`Transaction replay initiated for ${selected.ticketRef}...`);
                        setTimeout(() => setActionNotice(null), 3000);
                      }}
                      className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-all text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-outline">replay</span>
                      <span>Replay Route</span>
                    </button>

                    <button
                      onClick={() => handleMarkResolved(selected)}
                      className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                      <span>Mark Resolved</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card flex flex-col items-center justify-center py-20 px-4 text-center">
              <span className="material-symbols-outlined text-outline text-[48px] mb-2">
                headset_mic
              </span>
              <p className="font-bold text-base text-on-surface">Select a Support Ticket</p>
              <p className="text-xs text-on-surface-variant max-w-xs mt-1">
                Choose an incoming escalation from the queue on the left to inspect customer history and issue wallet adjustments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Wallet Credit Modal */}
      {creditModal && selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl shadow-modal w-full max-w-md border border-outline-variant/40 animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  account_balance_wallet
                </span>
                <h2 className="font-bold text-base text-on-surface">Customer Wallet Credit</h2>
              </div>
              <button
                onClick={() => {
                  setCreditModal(false);
                  setSuperAdminConfirm(false);
                }}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {creditSuccess ? (
              <div className="px-6 py-10 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[48px]">
                  check_circle
                </span>
                <p className="font-bold text-base text-on-surface">Wallet Credited Successfully</p>
                <p className="text-xs text-on-surface-variant text-center">
                  {formatNaira(creditValue)} added to {selected.customerName}&apos;s account.
                </p>
              </div>
            ) : superAdminConfirm ? (
              <div className="px-6 py-5 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600 text-[22px] shrink-0 mt-0.5">
                    shield
                  </span>
                  <div>
                    <p className="font-bold text-red-950 text-xs sm:text-sm">
                      Super Admin Authorization Required
                    </p>
                    <p className="text-xs text-red-800 mt-1 leading-relaxed">
                      Credits above ?50,000 mandate executive override. Crediting{" "}
                      <strong className="text-red-900">{formatNaira(creditValue)}</strong> will be verified under your master credentials.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSuperAdminConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-xs sm:text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleCredit}
                    disabled={creditLoading}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    id="btn-superadmin-confirm-credit"
                  >
                    {creditLoading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      "Approve & Credit"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-3 bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/20">
                    <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-sm font-mono">
                      {selected.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">
                        {selected.customerName}
                      </p>
                      <p className="font-mono text-xs text-outline">{selected.customerPhone}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">
                      Credit Amount (₦)
                    </label>
                    <input
                      type="text"
                      value={creditAmount}
                      onChange={(e) => {
                        setCreditAmount(e.target.value);
                        if (creditError) setCreditError(null);
                      }}
                      placeholder="e.g. 5,000.00"
                      className="w-full h-11 px-4 bg-surface-container-low rounded-xl text-sm font-mono text-on-surface outline-none border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                    {creditError && (
                      <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-red-600">error</span>
                        <span>{creditError}</span>
                      </div>
                    )}
                    {needsSuperAdmin && !creditError && (
                      <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[14px]">shield</span>
                        Above ?50,000 threshold requires Super Admin dual authorization
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">
                      Remediation Justification
                    </label>
                    <textarea
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      placeholder="e.g. Failed MTN 10GB bundle delivery - upstream timeout..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-surface-container-low rounded-xl text-xs sm:text-sm text-on-surface resize-none outline-none border border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div className="flex gap-3 px-6 pb-6">
                  <button
                    onClick={() => setCreditModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-xs sm:text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCredit}
                    disabled={!creditAmount || !creditReason || creditLoading}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold disabled:opacity-50 hover:bg-primary-container transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    id="btn-submit-wallet-credit"
                  >
                    {creditLoading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      "Apply Credit"
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
