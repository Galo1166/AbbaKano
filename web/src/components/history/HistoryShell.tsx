"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { useThemeMode } from "@/lib/theme";

type Transaction = {
  id?: string | number;
  type?: string;
  label?: string;
  amount?: number;
  status?: string;
  date?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  phoneNumber?: string;
  network?: string;
  accountNumber?: string;
  token?: string;
  units?: string;
};

type Status = "success" | "pending" | "failed";

const filters = ["All", "Data Bundles", "Airtime", "Electricity", "Cable TV", "Wallet Deposits"];

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function normalizedStatus(value?: string): Status {
  const status = value?.toLowerCase();
  return status === "success" || status === "failed" ? status : "pending";
}

function transactionCategory(transaction: Transaction) {
  const type = transaction.type?.toLowerCase() || "";
  const label = transaction.label?.toLowerCase() || "";

  if (type === "deposit" || type === "commission" || label.includes("funding")) return "Wallet Deposits";
  if (type === "data" || label.includes("data")) return "Data Bundles";
  if (type === "airtime" || label.includes("airtime")) return "Airtime";
  if (type === "electricity" || label.includes("electric")) return "Electricity";
  if (type === "cable_tv" || label.includes("cable") || label.includes("dstv") || label.includes("gotv")) return "Cable TV";

  return "Other";
}

function displayTitle(transaction: Transaction) {
  return transaction.label || (transaction.type || "Wallet Transaction").replaceAll("_", " ");
}

function recipientPhone(transaction: Transaction) {
  const metadataPhone = transaction.metadata?.phone_number;
  if (typeof metadataPhone === "string" && metadataPhone.trim()) {
    return metadataPhone;
  }
  return transaction.phoneNumber;
}

function displayDate(value?: string) {
  if (!value) return "Recent activity";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getIconTheme(category: string, network?: string) {
  if (category === "Wallet Deposits") return { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)" };
  if (network === "MTN") return { color: "#FFCC00", bg: "rgba(255, 204, 0, 0.12)" };
  if (network === "AIRTEL") return { color: "#E60000", bg: "rgba(230, 0, 0, 0.12)" };
  if (network === "GLO") return { color: "#00843D", bg: "rgba(0, 132, 61, 0.12)" };
  if (network === "9MOBILE") return { color: "#84BD00", bg: "rgba(132, 189, 0, 0.12)" };
  if (category === "Electricity") return { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)" };
  if (category === "Cable TV") return { color: "#C084FC", bg: "rgba(192, 132, 252, 0.12)" };
  return { color: "#60A5FA", bg: "rgba(96, 165, 250, 0.12)" };
}

function CategoryIcon({ category }: { category: string }) {
  if (category === "Data Bundles") {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    );
  }
  if (category === "Airtime") {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    );
  }
  if (category === "Wallet Deposits") {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    );
  }
  if (category === "Electricity") {
    return (
      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export function HistoryShell({ initialTransactions }: { initialTransactions?: Transaction[] }) {
  const router = useRouter();
  const { theme } = useThemeMode();
  const isDark = theme === "dark";
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("All");
  const [status, setStatus] = useState("All Status");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(!initialTransactions);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState("");

  function goHome() {
    if (window.location.pathname === "/app") window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    else router.push("/app");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadTransactions() {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Your session has expired. Please log in again.");
        }

        const { data: deposits, error: depositsError } = await supabase
          .from("deposits")
          .select("id, reference, amount_kobo, provider, status, provider_reference, created_at, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (depositsError) throw depositsError;

        const { data: ledger, error: ledgerError } = await supabase
          .from("wallet_ledger")
          .select("id, transaction_id, deposit_id, entry_type, amount_kobo, balance_before_kobo, balance_after_kobo, description, metadata, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (ledgerError) throw ledgerError;

        const transactionIds = [...new Set(
          (ledger || [])
            .map((entry) => entry.transaction_id)
            .filter((id): id is number => id !== null),
        )];

        const transactionsById = new Map<
          number,
          {
            transaction_type: string;
            status: string;
            phone_number: string | null;
            account_number: string | null;
            network: string | null;
            plan_code: string | null;
            plan_label: string | null;
            token?: string;
            units?: string;
          }
        >();

        if (transactionIds.length > 0) {
          const { data: purchaseTransactions, error: purchaseTransactionsError } =
            await supabase
              .from("vtu_transactions")
              .select("id, transaction_type, status, phone_number, account_number, network, metadata")
              .eq("user_id", user.id)
              .in("id", transactionIds);

          if (purchaseTransactionsError) throw purchaseTransactionsError;

          for (const transaction of purchaseTransactions || []) {
            transactionsById.set(Number(transaction.id), {
              transaction_type: transaction.transaction_type,
              status: transaction.status,
              phone_number: transaction.phone_number,
              account_number: transaction.account_number,
              network: transaction.network,
              plan_code: (transaction.metadata?.plan_code as string) || null,
              plan_label: (transaction.metadata?.plan_label as string) || null,
              token: transaction.metadata?.token as string | undefined,
              units: transaction.metadata?.units as string | undefined,
            });
          }
        }

        const depositTransactions: Transaction[] = (deposits || []).map((deposit) => ({
          id: deposit.reference,
          type: "deposit",
          label: "Wallet Deposit",
          amount: Number(deposit.amount_kobo || 0) / 100,
          status: deposit.status,
          date: deposit.created_at,
          currency: "NGN",
        }));

        const depositIds = new Set((deposits || []).map((deposit) => deposit.id));

        const ledgerTransactions: Transaction[] = (ledger || [])
          .filter((entry) => !entry.deposit_id || !depositIds.has(entry.deposit_id))
          .map((entry) => {
            const purchaseTransaction = entry.transaction_id ? transactionsById.get(entry.transaction_id) : undefined;
            const planLabel = typeof entry.metadata?.plan_label === "string" ? entry.metadata.plan_label : purchaseTransaction?.plan_label || null;
            const token = typeof entry.metadata?.token === "string" ? entry.metadata.token : purchaseTransaction?.token || undefined;
            const units = typeof entry.metadata?.units === "string" ? entry.metadata.units : purchaseTransaction?.units || undefined;

            return {
              id: entry.id,
              type: purchaseTransaction?.transaction_type || (planLabel ? "data" : entry.entry_type),
              label: planLabel || entry.description || entry.entry_type,
              amount: Math.abs(Number(entry.amount_kobo || 0)) / 100,
              status: purchaseTransaction?.status || "success",
              date: entry.created_at,
              currency: "NGN",
              metadata: entry.metadata || {},
              phoneNumber: purchaseTransaction?.phone_number || undefined,
              network: purchaseTransaction?.network || undefined,
              accountNumber: purchaseTransaction?.account_number || undefined,
              token,
              units,
            };
          });

        const combined = [...depositTransactions, ...ledgerTransactions].sort((a, b) => {
          const aTime = a.date ? new Date(a.date).getTime() : 0;
          const bTime = b.date ? new Date(b.date).getTime() : 0;
          return bTime - aTime;
        });

        if (!cancelled) setTransactions(combined);
      } catch (error) {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "Could not load transaction history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTransactions();
    return () => { cancelled = true; };
  }, []);

  const filtered = transactions.filter((transaction) => {
    const matchesFilter = filter === "All" || transactionCategory(transaction) === filter;
    const matchesStatus = status === "All Status" || normalizedStatus(transaction.status) === status;
    const haystack = `${transaction.label || ""} ${transaction.id} ${transaction.type || ""}`.toLowerCase();
    return matchesFilter && matchesStatus && haystack.includes(search.toLowerCase());
  });

  const successfulDeposits = transactions.filter(
    (transaction) => transactionCategory(transaction) === "Wallet Deposits" && normalizedStatus(transaction.status) === "success",
  );
  const inflow = successfulDeposits.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const successfulDebits = transactions.filter(
    (transaction) => transactionCategory(transaction) !== "Wallet Deposits" && normalizedStatus(transaction.status) === "success",
  );
  const outflow = successfulDebits.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  async function copyText(value: string, key: string) {
    await navigator.clipboard?.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <main className={`min-h-screen transition-colors duration-200 antialiased pb-32 ${isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"}`}>
      <WebDesktopSidebar active="history" />
      <WebDesktopSidebar active="history" />

      <div className="mx-auto w-full max-w-md px-4 pt-3 space-y-4">
        {/* Header - Pixel-Matched to Mobile App */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={goHome}
            aria-label="Back to dashboard"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer ${isDark ? "bg-[#141721] border-[#222634] text-slate-300 hover:text-white" : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"}`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className={`text-xl font-extrabold tracking-tight truncate ${isDark ? "text-white" : "text-slate-900"}`}>
              History
            </h1>
            <p className={`text-xs font-semibold truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Transaction Ledger & Records
            </p>
          </div>
        </header>

        {/* Verified Ledger Card */}
        <section className={`rounded-2xl border p-4 shadow-xs transition-colors ${isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200"}`}>
          <div className="flex items-center gap-1.5 mb-3">
            <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
              Verified Ledger
            </span>
          </div>

          <div className={`grid grid-cols-2 gap-3 divide-x ${isDark ? "divide-[#1e2330]" : "divide-slate-100"}`}>
            <div>
              <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 7l-10 10M17 7H7M17 7v10" /></svg>
                Total Outflow
              </span>
              <p className={`mt-0.5 font-mono text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {formatNaira(outflow)}
              </p>
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{successfulDebits.length} debits</p>
            </div>

            <div className="pl-3">
              <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17L17 7M7 17h10M7 17V7" /></svg>
                Total Inflow
              </span>
              <p className={`mt-0.5 font-mono text-lg font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {formatNaira(inflow)}
              </p>
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{successfulDeposits.length} deposits</p>
            </div>
          </div>
        </section>

        {/* Toolbar & Filter Chips */}
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..."
                className={`w-full h-11 rounded-xl border px-3.5 py-2 text-base sm:text-xs font-semibold focus:outline-none transition-colors ${
                  isDark
                    ? "bg-[#181B25] border-[#222634] text-white placeholder-slate-500"
                    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs"
                }`}
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`h-11 rounded-xl border px-3 py-2 text-base sm:text-xs font-semibold focus:outline-none transition-colors cursor-pointer ${
                isDark
                  ? "bg-[#181B25] border-[#222634] text-slate-200"
                  : "bg-white border-slate-200 text-slate-700 shadow-2xs"
              }`}
            >
              <option value="All Status">All Status</option>
              <option value="success">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {filters.map((item) => {
              const isSelected = filter === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-600 border border-blue-600 text-white shadow-xs"
                      : isDark
                      ? "border border-[#222634] bg-[#141721] text-slate-400 hover:border-slate-700"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transaction List */}
        <section className="space-y-2">
          {loading && (
            <div className="py-12 text-center text-xs text-slate-400">Loading ledger...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className={`rounded-2xl border border-dashed py-10 text-center text-xs font-medium transition-colors ${
              isDark ? "border-[#222634] text-slate-400 bg-transparent" : "border-slate-300 text-slate-500 bg-white shadow-2xs"
            }`}>
              No transactions found.
            </div>
          )}

          {!loading && filtered.map((tx) => {
            const category = transactionCategory(tx);
            const txStatus = normalizedStatus(tx.status);
            const isCredit = category === "Wallet Deposits";
            const iconTheme = getIconTheme(category, tx.network);

            return (
              <button
                key={tx.id || `${tx.date}-${tx.label}`}
                type="button"
                onClick={() => setSelected(tx)}
                className={`w-full flex items-center justify-between rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                  isDark
                    ? "border-[#222634] bg-[#141721] hover:border-slate-700 text-white"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-900 shadow-2xs"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: iconTheme.bg, color: iconTheme.color }}
                  >
                    <CategoryIcon category={category} />
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {displayTitle(tx)}
                    </p>
                    <p className={`truncate text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {recipientPhone(tx) ? `${recipientPhone(tx)} • ` : ""}{displayDate(tx.date)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className={`font-mono text-xs font-bold ${isCredit ? "text-emerald-500" : isDark ? "text-white" : "text-slate-900"}`}>
                    {isCredit ? "+" : "-"}{formatNaira(Number(tx.amount || 0))}
                  </p>
                  <span className={`inline-block mt-0.5 rounded px-1.5 py-0.2 text-[8px] font-bold uppercase ${
                    txStatus === "success"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : txStatus === "pending"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-rose-500/10 text-rose-500"
                  }`}>
                    {txStatus === "success" ? "Completed" : txStatus === "failed" ? "Failed" : "Pending"}
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      </div>

      {/* Transaction Detail Bottom Sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-xs">
          <div className={`w-full max-w-md rounded-t-[28px] border-t p-5 shadow-xl transition-colors ${
            isDark ? "bg-[#1C1F29] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className={`h-1.5 w-12 rounded-full mx-auto mb-3 ${isDark ? "bg-[#31353F]" : "bg-slate-200"}`} />
            <div className="flex items-center justify-between pb-3">
              <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                Transaction Details
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close modal"
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
                  isDark ? "bg-[#262A34] text-slate-400 hover:text-white" : "bg-slate-100 text-slate-500 hover:text-slate-800"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={`my-3 rounded-2xl border p-4 text-center ${
              isDark ? "bg-[#181B25] border-[#222634]" : "bg-slate-50 border-slate-200"
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Total Amount</span>
              <p className={`mt-0.5 font-mono text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                {formatNaira(Number(selected.amount || 0))}
              </p>
            </div>

            <div className={`space-y-2 rounded-2xl border p-3.5 text-xs ${
              isDark ? "bg-[#181B25] border-[#222634]" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex justify-between items-center">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Reference</span>
                <span className={`font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{String(selected.id)}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Service</span>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{displayTitle(selected)}</span>
              </div>
              {recipientPhone(selected) && (
                <div className="flex justify-between">
                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>Recipient</span>
                  <span className="font-mono font-bold text-blue-500">{recipientPhone(selected)}</span>
                </div>
              )}
              {selected.token && (
                <div className="flex justify-between items-center rounded-xl bg-blue-500/10 p-2 text-blue-500">
                  <span>Token</span>
                  <span className="font-mono font-black">{selected.token}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={isDark ? "text-slate-400" : "text-slate-500"}>Date</span>
                <span className={isDark ? "text-slate-300" : "text-slate-700"}>{displayDate(selected.date)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-4 w-full h-11 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <WebBottomNav active="history" />
    </main>
  );
}
