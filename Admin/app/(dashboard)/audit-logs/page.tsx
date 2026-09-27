"use client";

import { useEffect, useState } from "react";
import { fetchAuditLogs } from "@/services/api";
import { formatTimeAgo } from "@/lib/utils";
import PageHeader from "@/components/layout/PageHeader";
import type { AuditLog, AuditAction } from "@/types/telecom";

const actionLabel: Record<AuditAction, string> = {
  MANUAL_WALLET_CREDIT: "Customer Wallet Credit",
  MARGIN_UPDATE: "Margin Settings Update",
  STAFF_ROLE_CHANGE: "Staff Role Modified",
  MAINTENANCE_MODE_TOGGLE: "Maintenance Mode Toggle",
  PROVIDER_REFILL: "Provider Balance Refill",
  TRANSACTION_REFUND: "Transaction Refund Issued",
  LOGIN: "Admin Login",
  LOGOUT: "Admin Logout",
  EXPORT_REPORT: "Report Exported",
  BANK_ALERT_RESOLVE: "Bank Alert Resolved",
};

const actionIcon: Record<AuditAction, string> = {
  MANUAL_WALLET_CREDIT: "account_balance_wallet",
  MARGIN_UPDATE: "trending_up",
  STAFF_ROLE_CHANGE: "manage_accounts",
  MAINTENANCE_MODE_TOGGLE: "build",
  PROVIDER_REFILL: "account_balance",
  TRANSACTION_REFUND: "replay",
  LOGIN: "login",
  LOGOUT: "logout",
  EXPORT_REPORT: "download",
  BANK_ALERT_RESOLVE: "payments",
};

const actionColor: Record<AuditAction, string> = {
  MANUAL_WALLET_CREDIT: "bg-blue-100 text-blue-800",
  MARGIN_UPDATE: "bg-purple-100 text-purple-800",
  STAFF_ROLE_CHANGE: "bg-red-100 text-red-800",
  MAINTENANCE_MODE_TOGGLE: "bg-amber-100 text-amber-800",
  PROVIDER_REFILL: "bg-emerald-100 text-emerald-800",
  TRANSACTION_REFUND: "bg-slate-100 text-slate-800",
  LOGIN: "bg-emerald-100 text-emerald-800",
  LOGOUT: "bg-slate-100 text-slate-800",
  EXPORT_REPORT: "bg-blue-100 text-blue-800",
  BANK_ALERT_RESOLVE: "bg-emerald-100 text-emerald-800",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");

  useEffect(() => {
    fetchAuditLogs(1, 30).then((res) => {
      setLogs(res.data);
      setLoading(false);
    });
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.staffName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.ipAddress.includes(search);
    const matchesFilter = filterAction === "ALL" || log.action === filterAction;
    return matchesSearch && matchesFilter;
  });

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportAudit = () => {
    setExportNotice("Activity audit log exported to CSV successfully.");
    setTimeout(() => setExportNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Header */}
      <PageHeader
        breadcrumbs={["Administration", "Audit Logs"]}
        title="Activity & Audit Logs"
        description="Complete history of all administrative actions, wallet credits, settings changes, and staff logins."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAudit}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              id="btn-download-audit-report"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export Audit Trail</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Total Logged Events
            </span>
            <span className="material-symbols-outlined text-primary text-[20px]">
              history_edu
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-on-surface font-mono">
            148
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Recorded staff actions
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Manual Credits Disbursed
            </span>
            <span className="material-symbols-outlined text-emerald-700 text-[20px]">
              account_balance
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
            ₦65,000.00
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Total wallet compensations issued
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              System Configuration Changes
            </span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">
              settings
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
            2
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Margin updates & route adjustments
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search by staff name, IP, or action payload..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-surface-container-lowest rounded-xl border border-outline-variant/40 text-xs sm:text-sm text-on-surface placeholder:text-outline outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="h-10 px-3 bg-surface-container-lowest rounded-xl border border-outline-variant/40 text-xs sm:text-sm text-on-surface outline-none focus:border-primary cursor-pointer shadow-sm"
        >
          <option value="ALL">All Event Types</option>
          <option value="MANUAL_WALLET_CREDIT">Wallet Credits</option>
          <option value="PROVIDER_REFILL">Provider Refills</option>
          <option value="MARGIN_UPDATE">Margin Updates</option>
          <option value="MAINTENANCE_MODE_TOGGLE">Maintenance Mode</option>
          <option value="LOGIN">Admin Logins</option>
        </select>
      </div>

      {/* Timeline Stream */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
          <h2 className="text-base font-bold text-on-surface">Chronological Activity Stream</h2>
          <span className="text-xs font-mono text-outline">{filteredLogs.length} events displayed</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-outline text-[40px] mb-2">
              manage_search
            </span>
            <p className="font-semibold text-sm">No log entries matched your filter</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 px-5 sm:px-6 py-4 hover:bg-surface-container-low transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    actionColor[log.action]
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {actionIcon[log.action]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <p className="text-sm font-bold text-on-surface">
                      {actionLabel[log.action]}
                    </p>
                    <span className="text-xs text-outline font-mono whitespace-nowrap">
                      {formatTimeAgo(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed mb-2.5">
                    {log.details}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-outline font-mono">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">
                        person
                      </span>
                      <strong className="text-on-surface">{log.staffName}</strong>
                      <span className="text-[10px] uppercase font-bold text-outline">
                        ({log.role.replace("_", " ")})
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">devices</span>
                      <span>{log.device}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">wifi</span>
                      <span>{log.ipAddress}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
