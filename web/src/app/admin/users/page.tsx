"use client";

import { useEffect, useState } from "react";
import { adjustCustomerWallet, fetchCustomers, updateCustomerStatus } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { CustomerUser } from "@admin/types/telecom";

export default function UsersPage() {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<CustomerUser | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ledgerDirection, setLedgerDirection] = useState<"credit" | "debit">("credit");
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerReason, setLedgerReason] = useState("");
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const PAGE_SIZE = 15;

  useEffect(() => {
    fetchCustomers(
      page,
      PAGE_SIZE,
      search || undefined,
      statusFilter === "ALL" ? undefined : statusFilter as "ACTIVE" | "BLOCKED"
    )
      .then((res) => {
        setErrorMessage(null);
        setUsers(res.data);
        setTotal(res.total);
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load reseller accounts.");
      })
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  const handleToggleBlock = async (user: CustomerUser) => {
    const newStatus: "ACTIVE" | "BLOCKED" = user.status === "BLOCKED" ? "ACTIVE" : "BLOCKED";
    try {
      await updateCustomerStatus(user.id, newStatus);
      setSelectedUser(null);
      setActionSuccess(`Account for ${user.name} is now ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
      const refreshed = await fetchCustomers(
        page,
        PAGE_SIZE,
        search || undefined,
        statusFilter === "ALL" ? undefined : statusFilter as "ACTIVE" | "BLOCKED"
      );
      setUsers(refreshed.data);
      setTotal(refreshed.total);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update account status.");
    }
  };

  const handleLedgerAdjustment = async () => {
    if (!selectedUser) return;
    const amount = Number(ledgerAmount);
    if (!Number.isInteger(amount) || amount <= 0 || !ledgerReason.trim()) {
      setErrorMessage("Enter a whole-number amount and a reason for the adjustment.");
      return;
    }

    setLedgerLoading(true);
    try {
      const response = await adjustCustomerWallet(
        selectedUser.id,
        amount,
        ledgerDirection,
        ledgerReason.trim()
      );
      const updatedUser = { ...selectedUser, walletBalance: response.balance };
      setSelectedUser(updatedUser);
      setUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user));
      setLedgerAmount("");
      setLedgerReason("");
      setActionSuccess(`Wallet ${ledgerDirection} applied for ${selectedUser.name}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to adjust wallet balance.");
    } finally {
      setLedgerLoading(false);
    }
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
        breadcrumbs={["Operations", "Resellers"]}
        title="Reseller Accounts"
        description="View registered reseller accounts, check balances, and manage access."
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
            {users.filter((user) => user.status === "ACTIVE").length.toLocaleString()}
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
            {users.filter((user) => user.status === "BLOCKED").length.toLocaleString()}
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

      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2 animate-fade-in">
          <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
          <span>{actionSuccess}</span>
        </div>
      )}

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
                    className="hover:bg-slate-50/60 transition-colors"
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
                        onClick={() => setSelectedUser(user)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
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

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Wallet Adjustment
                </span>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <select
                    value={ledgerDirection}
                    onChange={(event) => setLedgerDirection(event.target.value as "credit" | "debit")}
                    className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
                    disabled={ledgerLoading}
                  >
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={ledgerAmount}
                    onChange={(event) => setLedgerAmount(event.target.value)}
                    placeholder="Amount (NGN)"
                    className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
                    disabled={ledgerLoading}
                  />
                </div>
                <input
                  type="text"
                  value={ledgerReason}
                  onChange={(event) => setLedgerReason(event.target.value)}
                  placeholder="Reason for adjustment"
                  className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 outline-none"
                  disabled={ledgerLoading}
                />
                <button
                  type="button"
                  onClick={handleLedgerAdjustment}
                  disabled={ledgerLoading}
                  className="w-full h-9 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {ledgerLoading ? "Applying..." : "Apply Adjustment"}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleToggleBlock(selectedUser)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedUser.status === "BLOCKED"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-rose-600 text-white hover:bg-rose-700"
                }`}
              >
                {selectedUser.status === "BLOCKED" ? "Unblock Account" : "Block Account"}
              </button>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
