"use client";

import { useEffect, useState } from "react";
import { fetchAuditLogs } from "@admin/services/api";
import { formatTimeAgo } from "@admin/lib/utils";
import PageHeader from "@admin/components/layout/PageHeader";
import type { AuditLog } from "@admin/types/telecom";

const actionLabel: Record<string, string> = {
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
  "admin.user_status_changed": "User Status Changed",
  "admin.ledger_adjusted": "Wallet Ledger Adjusted",
  "admin.funds_added": "Funds Added to Wallet",
  "admin.logout": "Admin Logout",
  "agent.status_changed": "Agent Status Changed",
  "deposit.settled": "Deposit Settled",
  "deposit.status_changed": "Deposit Status Changed",
  "vtu.settled": "VTU Transaction Settled",
  "vtu.status_changed": "VTU Status Changed",
  "admin.vtu_plan_created": "VTU Plan Created",
  "admin.vtu_plan_updated": "VTU Plan Updated",
  "admin.vtu_plan_deleted": "VTU Plan Deleted",
};

const actionIcon: Record<string, string> = {
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
  "admin.user_status_changed": "person",
  "admin.ledger_adjusted": "account_balance_wallet",
  "admin.funds_added": "payments",
  "admin.logout": "logout",
  "agent.status_changed": "verified_user",
  "deposit.settled": "payments",
  "deposit.status_changed": "payments",
  "vtu.settled": "receipt_long",
  "vtu.status_changed": "receipt_long",
  "admin.vtu_plan_created": "add_box",
  "admin.vtu_plan_updated": "edit",
  "admin.vtu_plan_deleted": "delete",
};

const actionColor: Record<string, string> = {
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
  "admin.user_status_changed": "bg-violet-100 text-violet-800",
  "admin.ledger_adjusted": "bg-cyan-100 text-cyan-800",
  "admin.funds_added": "bg-emerald-100 text-emerald-800",
  "admin.logout": "bg-slate-100 text-slate-800",
  "agent.status_changed": "bg-amber-100 text-amber-800",
  "deposit.settled": "bg-emerald-100 text-emerald-800",
  "deposit.status_changed": "bg-amber-100 text-amber-800",
  "vtu.settled": "bg-indigo-100 text-indigo-800",
  "vtu.status_changed": "bg-amber-100 text-amber-800",
  "admin.vtu_plan_created": "bg-emerald-100 text-emerald-800",
  "admin.vtu_plan_updated": "bg-blue-100 text-blue-800",
  "admin.vtu_plan_deleted": "bg-rose-100 text-rose-800",
};

const fallbackAuditAction = (action: string) => {
  const normalized = action.replace(/_/g, " ").toLowerCase();
  return {
    label: normalized.replace(/\b\w/g, (char) => char.toUpperCase()),
    icon: "history",
    color: "bg-slate-100 text-slate-800",
  };
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState({ totalEvents: 0, depositEvents: 0, vtuEvents: 0 });
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const PAGE_SIZE = 30;
  const requestKey = JSON.stringify([page, search, filterAction]);
  const loading = loadedRequestKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    fetchAuditLogs(page, PAGE_SIZE, {
      stream: "user",
      search: search || undefined,
      action: filterAction === "ALL" ? undefined : filterAction,
    }).then((res) => {
      if (cancelled) return;
      setErrorMessage(null);
      setLogs(res.data);
      setMetrics(res.metrics);
      setTotal(res.total);
      setLoadedRequestKey(requestKey);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setErrorMessage(error instanceof Error ? error.message : "Unable to load audit logs.");
      setLogs([]);
      setTotal(0);
      setMetrics({ totalEvents: 0, depositEvents: 0, vtuEvents: 0 });
      setLoadedRequestKey(requestKey);
    });
    return () => { cancelled = true; };
  }, [page, search, filterAction, requestKey]);

  const handleExportAudit = () => {
    const escapeCsv = (value: string) => {
      const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${safeValue.replaceAll('"', '""')}"`;
    };
    const rows = [
      ["Timestamp", "Action", "Actor", "Role", "Details", "IP Address"],
      ...logs.map((log) => [
        log.timestamp,
        log.action,
        log.staffName,
        log.role,
        log.details,
        log.ipAddress || "",
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `audit-logs-page-${page}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportNotice(`Exported ${logs.length} audit events from this page.`);
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
        description="Customer deposit and VTU activity recorded by Supabase."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAudit}
              disabled={loading || logs.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container transition-colors shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              id="btn-download-audit-report"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export Current Page</span>
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        This user audit stream contains customer deposit and VTU activity. Administrator actions are available in Notifications.
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800" role="alert">
          {errorMessage}
        </div>
      )}

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
            {metrics.totalEvents.toLocaleString()}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Recorded Supabase events
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              Deposit Events
            </span>
            <span className="material-symbols-outlined text-emerald-700 text-[20px]">
              account_balance
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono">
            {metrics.depositEvents.toLocaleString()}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Recorded deposit status events
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-outline">
              VTU Events
            </span>
            <span className="material-symbols-outlined text-amber-600 text-[20px]">
              settings
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono">
            {metrics.vtuEvents.toLocaleString()}
          </div>
          <p className="text-xs text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
            Recorded VTU transaction status events
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-9 pr-4 bg-surface-container-lowest rounded-xl border border-outline-variant/40 text-xs sm:text-sm text-on-surface placeholder:text-outline outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 shadow-sm"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 bg-surface-container-lowest rounded-xl border border-outline-variant/40 text-xs sm:text-sm text-on-surface outline-none focus:border-primary cursor-pointer shadow-sm"
        >
          <option value="ALL">All Event Types</option>
          <option value="admin.user_status_changed">User Status Changes</option>
          <option value="admin.ledger_adjusted">Wallet Ledger Adjustments</option>
          <option value="admin.funds_added">Funds Added</option>
          <option value="agent.status_changed">Agent Status Changes</option>
          <option value="deposit.settled">Deposits Settled</option>
          <option value="deposit.status_changed">Deposit Status Changes</option>
          <option value="vtu.settled">VTU Transactions</option>
          <option value="vtu.status_changed">VTU Status Changes</option>
        </select>
      </div>

      {/* Timeline Stream */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
          <h2 className="text-base font-bold text-on-surface">Chronological Activity Stream</h2>
          <span className="text-xs font-mono text-outline">{logs.length} of {total} matching events</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          </div>
        ) : errorMessage ? (
          <div className="py-16 text-center text-sm font-semibold text-red-700">
            Audit events could not be loaded. Check the error above and try again.
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-outline text-[40px] mb-2">
              manage_search
            </span>
            <p className="font-semibold text-sm">No log entries matched your filter</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 px-5 sm:px-6 py-4 hover:bg-surface-container-low transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    actionColor[log.action] ?? fallbackAuditAction(log.action).color
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {actionIcon[log.action] ?? fallbackAuditAction(log.action).icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <p className="text-sm font-bold text-on-surface">
                      {actionLabel[log.action] ?? fallbackAuditAction(log.action).label}
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
                      <span>{log.ipAddress || "IP not recorded"}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-outline-variant/20 bg-surface-container-low/50">
          <span className="text-xs text-on-surface-variant font-mono">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} audit events
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
