"use client";

import { useEffect, useRef, useState } from "react";
import { adjustCustomerWallet, fetchCustomers, updateCustomerStatus } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { CustomerUser } from "@admin/types/telecom";

export default function UsersPage() {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [metrics, setMetrics] = useState({ active: 0, blocked: 0 });
  const [loadedRequestKey, setLoadedRequestKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<CustomerUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adjustmentDirection, setAdjustmentDirection] = useState<"credit" | "debit">("credit");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [walletAdjustmentSuccess, setWalletAdjustmentSuccess] = useState<{
    direction: "credit" | "debit";
    amount: number;
    balance: number;
  } | null>(null);
  const walletAdjustmentInFlight = useRef(false);
  const [statusChangeReason, setStatusChangeReason] = useState("");
  const [showBlockReason, setShowBlockReason] = useState(false);
  const PAGE_SIZE = 15;
  const requestKey = JSON.stringify([page, search, statusFilter]);
  const loading = loadedRequestKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    fetchCustomers(
      page,
      PAGE_SIZE,
      search || undefined,
      statusFilter === "ALL" ? undefined : statusFilter as "ACTIVE" | "BLOCKED"
    )
      .then((res) => {
        if (cancelled) return;
        setErrorMessage(null);
        setUsers(res.data);
        setTotal(res.total);
        setMetrics(res.metrics);
        setLoadedRequestKey(requestKey);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to load reseller accounts.");
        setUsers([]);
        setTotal(0);
        setMetrics({ active: 0, blocked: 0 });
        setLoadedRequestKey(requestKey);
      });

    return () => { cancelled = true; };
  }, [page, search, statusFilter, requestKey, refreshCount]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  async function handleStatusChange() {
    if (!selectedUser) return;
    const reason = statusChangeReason.trim();
    const nextStatus = selectedUser.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    if (nextStatus === "BLOCKED" && reason.length < 5) {
      setActionError("Enter a reason of at least 5 characters before blocking this account.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await updateCustomerStatus(selectedUser.id, nextStatus, reason || undefined);
      setSelectedUser({ ...selectedUser, status: nextStatus });
      setStatusChangeReason("");
      setShowBlockReason(false);
      showToast(`Account ${nextStatus === "BLOCKED" ? "blocked" : "unblocked"} successfully.`);
      setRefreshCount((count) => count + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update account status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleWalletAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser || walletAdjustmentInFlight.current || walletAdjustmentSuccess) return;
    if (adjustmentReason.trim().length < 5) {
      setActionError("Enter a reason of at least 5 characters for this wallet adjustment.");
      return;
    }
    walletAdjustmentInFlight.current = true;
    setActionLoading(true);
    setActionError(null);
    const direction = adjustmentDirection;
    const amount = Number(adjustmentAmount);
    try {
      const result = await adjustCustomerWallet(
        selectedUser.id,
        amount,
        direction,
        adjustmentReason.trim(),
      );
      setSelectedUser({ ...selectedUser, walletBalance: result.balance });
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setWalletAdjustmentSuccess({ direction, amount, balance: result.balance });
      setRefreshCount((count) => count + 1);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not adjust wallet balance.");
    } finally {
      walletAdjustmentInFlight.current = false;
      setActionLoading(false);
    }
  }

  function openUserInspect(user: CustomerUser) {
    setWalletAdjustmentSuccess(null);
    setShowBlockReason(false);
    setStatusChangeReason("");
    setSelectedUser(user);
  }

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
        breadcrumbs={["Operations", "Resellers"]}
        title="Reseller Accounts"
        description="Review registered reseller accounts, balances, and purchase activity."
        actions={
          <button
            onClick={() => showToast("Reseller accounts exported to CSV successfully.")}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export CSV</span>
          </button>
        }
      />

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800">
          {errorMessage}
        </div>
      )}

      {/* KPI Cards: Clean 3-Card Metrics (No KYC) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Resellers
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <span className="material-symbols-outlined text-[16px]">group</span>
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 tracking-tight truncate">
            {total.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Registered accounts on platform
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Active Accounts
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700 tracking-tight truncate">
            {metrics.active.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Can purchase airtime and data
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Blocked Accounts
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <span className="material-symbols-outlined text-[16px]">block</span>
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-600 tracking-tight truncate">
            {metrics.blocked.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Purchases temporarily suspended
          </p>
        </div>
      </div>

      {/* Search & Simple Status Tabs (Clean: All / Active / Blocked) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, phone (+234...), or email..."
            className="w-full h-9 pl-9 pr-3 bg-white rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-xs"
          />
        </div>

        {/* Clean Filter Tabs: No KYC */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {[
            { key: "ALL", label: "All Accounts" },
            { key: "ACTIVE", label: "Active" },
            { key: "BLOCKED", label: "Blocked" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                statusFilter === tab.key
                  ? "bg-white text-slate-900 font-semibold shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resellers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <span className="material-symbols-outlined text-[36px] text-slate-300 mb-1">
              person_off
            </span>
            <p className="font-semibold text-sm text-slate-800">No accounts found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try searching with a different term</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Reseller
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Phone
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Wallet Balance
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Total Volume
                  </th>
                  <th className="text-right px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Orders
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold">
                    Last Seen
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] uppercase tracking-wider font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => openUserInspect(user)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openUserInspect(user);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Inspect ${user.name}`}
                    className="cursor-pointer hover:bg-slate-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            user.status === "BLOCKED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate">
                            {user.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono truncate block">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {user.phone}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                      {formatNaira(user.walletBalance)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-600 whitespace-nowrap">
                      {formatNaira(user.totalSpent)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-700 whitespace-nowrap">
                      {user.totalTransactions.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={user.status === "ACTIVE" ? "success" : "failed"}
                        label={user.status === "ACTIVE" ? "Active" : "Blocked"}
                        withDot
                      />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {formatTimeAgo(user.lastTransactionAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openUserInspect(user);
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold text-primary hover:bg-slate-100 transition-colors cursor-pointer"
                        id={`btn-view-user-${user.id}`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-mono">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} resellers
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-mono px-2 text-slate-700">
              {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))}
              disabled={page >= Math.ceil(total / PAGE_SIZE)}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-2 backdrop-blur-xs animate-fade-in sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="selected-user-title"
            className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-slide-up"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 id="selected-user-title" className="font-bold text-sm text-slate-900">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setWalletAdjustmentSuccess(null);
                  setShowBlockReason(false);
                  setStatusChangeReason("");
                  setSelectedUser(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-5">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Wallet Balance
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                    {formatNaira(selectedUser.walletBalance)}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Purchases
                  </span>
                  <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                    {formatNaira(selectedUser.totalSpent)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Phone Number</span>
                  <span className="font-mono font-medium text-slate-900">{selectedUser.phone}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Account Status</span>
                  <Badge
                    variant={selectedUser.status === "ACTIVE" ? "success" : "failed"}
                    label={selectedUser.status === "ACTIVE" ? "Active" : "Blocked"}
                    withDot
                  />
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Total Orders</span>
                  <span className="font-mono text-slate-800">
                    {selectedUser.totalTransactions} transactions
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Last Activity</span>
                  <span className="font-mono text-slate-600">
                    {formatTimeAgo(selectedUser.lastTransactionAt)}
                  </span>
                </div>
              </div>

              {actionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800" role="alert">
                  {actionError}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (selectedUser.status === "ACTIVE") {
                    if (showBlockReason) {
                      setShowBlockReason(false);
                      setStatusChangeReason("");
                      setActionError(null);
                    } else {
                      setShowBlockReason(true);
                      setStatusChangeReason("");
                      setActionError(null);
                    }
                  } else {
                    void handleStatusChange();
                  }
                }}
                disabled={actionLoading}
                className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50 ${
                  selectedUser.status === "ACTIVE"
                    ? "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                    : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {actionLoading
                  ? "Please wait..."
                  : selectedUser.status === "ACTIVE"
                    ? showBlockReason ? "Cancel block" : "Block account"
                    : "Unblock account"}
              </button>
              {showBlockReason && selectedUser.status === "ACTIVE" && (
                <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
                    Reason for blocking this account <span className="text-rose-600">*</span>
                    <textarea
                      value={statusChangeReason}
                      onChange={(event) => setStatusChangeReason(event.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="Explain why this account is being blocked"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal outline-none focus:border-primary"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleStatusChange()}
                    disabled={actionLoading}
                    className="w-full rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                  >
                    {actionLoading ? "Please wait..." : "Confirm block account"}
                  </button>
                </div>
              )}

              <form onSubmit={handleWalletAdjustment} className="space-y-2 border-t border-slate-100 pt-4">
                <fieldset
                  disabled={actionLoading}
                  className="space-y-2 border-0 p-0 disabled:opacity-60"
                >
                  <h4 className="text-xs font-bold text-slate-800">Adjust wallet balance</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[11px] text-slate-600">
                      Action
                      <select
                        value={adjustmentDirection}
                        onChange={(event) => setAdjustmentDirection(event.target.value as "credit" | "debit")}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs"
                      >
                        <option value="credit">Credit</option>
                        <option value="debit">Debit</option>
                      </select>
                    </label>
                    <label className="text-[11px] text-slate-600">
                      Amount (₦)
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        value={adjustmentAmount}
                        onChange={(event) => setAdjustmentAmount(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                  <label className="block text-[11px] text-slate-600">
                    Reason <span className="text-rose-600">*</span>
                    <input
                      required
                      maxLength={500}
                      value={adjustmentReason}
                      onChange={(event) => setAdjustmentReason(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-xs"
                      placeholder="Reason for adjustment"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : `${adjustmentDirection === "credit" ? "Credit" : "Debit"} wallet`}
                  </button>
                </fieldset>
              </form>
            </div>

            <div className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50 p-4">
              <button
                type="button"
                onClick={() => {
                  setWalletAdjustmentSuccess(null);
                  setShowBlockReason(false);
                  setStatusChangeReason("");
                  setSelectedUser(null);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {walletAdjustmentSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-adjustment-success-title"
            className="w-full max-w-sm space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-xl"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <div className="space-y-1">
              <h3 id="wallet-adjustment-success-title" className="text-base font-bold text-slate-900">
                Wallet {walletAdjustmentSuccess.direction === "credit" ? "credited" : "debited"} successfully.
              </h3>
              <p className="text-sm text-slate-600">
                {formatNaira(walletAdjustmentSuccess.amount)} processed. New balance:{" "}
                {formatNaira(walletAdjustmentSuccess.balance)}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWalletAdjustmentSuccess(null)}
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
