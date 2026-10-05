"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";

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

const filters = ["All Services", "Data Bundles", "Airtime", "Electricity", "Cable TV", "Wallet Funding"];

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

  if (type === "deposit" || type === "commission" || label.includes("funding")) return "Wallet Funding";
  if (type === "data" || label.includes("data")) return "Data Bundles";
  if (type === "airtime" || label.includes("airtime")) return "Airtime";
  if (type === "electricity" || label.includes("electric")) return "Electricity";
  if (type === "cable_tv" || label.includes("cable") || label.includes("dstv") || label.includes("gotv")) return "Cable TV";

  return "Other";
}

function displayTitle(transaction: Transaction) {
  return transaction.label || (transaction.type || "Wallet transaction").replaceAll("_", " ");
}

function recipientPhone(transaction: Transaction) {
  const metadataPhone = transaction.metadata?.phone_number;
  if (typeof metadataPhone === "string" && metadataPhone.trim()) {
    return metadataPhone;
  }
  return transaction.phoneNumber;
}

function dataCapacity(transaction: Transaction) {
  const planLabel =
    typeof transaction.metadata?.plan_label === "string"
      ? transaction.metadata.plan_label
      : "";
  const planCode =
    typeof transaction.metadata?.plan_code === "string"
      ? transaction.metadata.plan_code
      : "";
  const capacity = `${planLabel} ${planCode}`
    .match(/(?:^|[^A-Z0-9])(\d+(?:\.\d+)?)[ _-]?(KB|MB|GB|TB)/i);
  return capacity ? `${capacity[1]}${capacity[2].toUpperCase()}` : "Data bundle";
}

function displayDate(value?: string) {
  if (!value) return "Recent activity";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TransactionIcon({ category }: { category: string }) {
  const path =
    category === "Data Bundles"
      ? "M4 7h16M4 12h16M4 17h10"
      : category === "Airtime"
        ? "M12 3v18M5 8.5a10 10 0 0 1 14 0M8 12a6 6 0 0 1 8 0"
        : category === "Wallet Funding"
          ? "M3 7h18v13H3zM3 7l2-4h14l2 4M16 13h5"
          : category === "Electricity"
            ? "m13 2-8 12h6l-1 8 8-12h-6l1-8Z"
            : "M3 6h18v13H3zM10 10l5 3-5 3v-6Z";

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d={path} />
    </svg>
  );
}

export function HistoryShell({ initialTransactions }: { initialTransactions?: Transaction[] }) {
 const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState("All Services");
  const [status, setStatus] = useState("All Status");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(!initialTransactions);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState("");

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

      // Wallet deposits
      const { data: deposits, error: depositsError } = await supabase
        .from("deposits")
        .select(
          "id, reference, amount_kobo, provider, status, provider_reference, created_at, metadata"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (depositsError) {
        throw depositsError;
      }

      // Wallet ledger for purchases/debits
      const { data: ledger, error: ledgerError } = await supabase
        .from("wallet_ledger")
        .select(
          "id, transaction_id, deposit_id, entry_type, amount_kobo, balance_before_kobo, balance_after_kobo, description, metadata, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ledgerError) {
        throw ledgerError;
      }

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

        const planCodes = [...new Set(
          (purchaseTransactions || []).flatMap((transaction) => {
            const planCode = transaction.metadata?.plan_code;
            if (typeof planCode !== "string" || !planCode) return [];
            const providerPlanCode = planCode.includes(":")
              ? planCode.slice(planCode.indexOf(":") + 1)
              : planCode;
            return [planCode, providerPlanCode];
          }),
        )];
        const planLabels = new Map<string, string>();
        if (planCodes.length > 0) {
          const { data: savedPlans, error: savedPlansError } = await supabase
            .from("vtu_plans")
            .select("network, plan_code, plan_name")
            .eq("service_type", "data")
            .in("plan_code", planCodes);
          if (savedPlansError) {
            console.error("Could not look up saved data plan labels:", savedPlansError);
          } else {
            for (const plan of savedPlans || []) {
              if (plan.network && plan.plan_code && plan.plan_name) {
                planLabels.set(
                  `${String(plan.network).toUpperCase()}:${plan.plan_code}`,
                  plan.plan_name,
                );
              }
            }
          }
        }

        for (const transaction of purchaseTransactions || []) {
          const planCode =
            typeof transaction.metadata?.plan_code === "string"
              ? transaction.metadata.plan_code
              : null;
          const providerPlanCode = planCode?.includes(":")
            ? planCode.slice(planCode.indexOf(":") + 1)
            : planCode;
          const planLabel =
            typeof transaction.metadata?.plan_label === "string"
              ? transaction.metadata.plan_label
              : transaction.network && providerPlanCode
                ? planLabels.get(
                    `${String(transaction.network).toUpperCase()}:${providerPlanCode}`,
                  ) || null
                : null;
          const token = typeof transaction.metadata?.token === "string"
            ? transaction.metadata.token
            : undefined;
          const units = typeof transaction.metadata?.units === "string"
            ? transaction.metadata.units
            : undefined;
          transactionsById.set(Number(transaction.id), {
            transaction_type: transaction.transaction_type,
            status: transaction.status,
            phone_number: transaction.phone_number,
            account_number: transaction.account_number,
            network: transaction.network,
            plan_code: planCode,
            plan_label: planLabel,
            token,
            units,
          });
        }
      }

      const depositTransactions: Transaction[] = (deposits || []).map(
        (deposit) => ({
          id: deposit.reference,
          type: "deposit",
          label: "Wallet Funding",
          amount: Number(deposit.amount_kobo || 0) / 100,
          status: deposit.status,
          date: deposit.created_at,
          currency: "NGN",
        })
      );

      const depositIds = new Set(
        (deposits || []).map((deposit) => deposit.id)
      );

      const ledgerTransactions: Transaction[] = (ledger || [])
        // Don't show the same deposit twice.
        .filter(
          (entry) =>
            !entry.deposit_id ||
            !depositIds.has(entry.deposit_id)
        )
        .map((entry) => {
          const purchaseTransaction = entry.transaction_id
            ? transactionsById.get(entry.transaction_id)
            : undefined;
          const planLabel =
            typeof entry.metadata?.plan_label === "string"
              ? entry.metadata.plan_label
              : purchaseTransaction?.plan_label || null;
          const token = typeof entry.metadata?.token === "string"
            ? entry.metadata.token
            : purchaseTransaction?.token || undefined;
          const units = typeof entry.metadata?.units === "string"
            ? entry.metadata.units
            : purchaseTransaction?.units || undefined;
          return {
            id: entry.id,
            type: purchaseTransaction?.transaction_type || (planLabel ? "data" : entry.entry_type),
            label: planLabel || entry.description || entry.entry_type,
            amount: Math.abs(Number(entry.amount_kobo || 0)) / 100,
            status: purchaseTransaction?.status || "success",
            date: entry.created_at,
            currency: "NGN",
            metadata: {
              ...(entry.metadata || {}),
              ...(typeof entry.metadata?.phone_number === "string"
                ? {}
                : purchaseTransaction?.phone_number
                  ? { phone_number: purchaseTransaction.phone_number }
                  : {}),
              ...(typeof entry.metadata?.token === "string" ? {} : token ? { token } : {}),
              ...(typeof entry.metadata?.units === "string" ? {} : units ? { units } : {}),
              ...(planLabel ? { plan_label: planLabel } : {}),
              ...(typeof entry.metadata?.plan_code === "string"
                ? {}
                : purchaseTransaction?.plan_code
                  ? { plan_code: purchaseTransaction.plan_code }
                  : {}),
            },
            phoneNumber: purchaseTransaction?.phone_number || undefined,
            network: purchaseTransaction?.network || undefined,
            accountNumber: purchaseTransaction?.account_number || undefined,
            token,
            units,
          };
        });

      const combined = [
        ...depositTransactions,
        ...ledgerTransactions,
      ].sort((a, b) => {
        const aTime = a.date
          ? new Date(a.date).getTime()
          : 0;

        const bTime = b.date
          ? new Date(b.date).getTime()
          : 0;

        return bTime - aTime;
      });

      if (!cancelled) {
        setTransactions(combined);
      }
    } catch (error) {
      console.error("History loading error:", error);

      if (!cancelled) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Could not load transaction history."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void loadTransactions();

  return () => {
    cancelled = true;
  };
}, []);

  const filtered = transactions.filter((transaction) => {
    const matchesFilter = filter === "All Services" || transactionCategory(transaction) === filter;
    const matchesStatus = status === "All Status" || normalizedStatus(transaction.status) === status;
    const haystack = `${transaction.label || ""} ${transaction.id} ${transaction.type || ""}`.toLowerCase();
    return matchesFilter && matchesStatus && haystack.includes(search.toLowerCase());
  });

  const successfulDeposits = transactions.filter(
    (transaction) => transactionCategory(transaction) === "Wallet Funding" && normalizedStatus(transaction.status) === "success",
  );
  const inflow = successfulDeposits.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const successfulDebits = transactions
    .filter((transaction) =>
      transactionCategory(transaction) !== "Wallet Funding" &&
      normalizedStatus(transaction.status) === "success",
    );
  const outflow = successfulDebits
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  async function copyText(value: string, key: string) {
    await navigator.clipboard?.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function shareReceipt(transaction: Transaction) {
    const text = `${displayTitle(transaction)} - ${formatNaira(Number(transaction.amount || 0))} - Ref ${transaction.id}`;
    if (navigator.share) {
      await navigator.share({ title: "AbbaKano transaction receipt", text });
      return;
    }

    await copyText(text, "share");
  }

  return (
    <CustomerPageLayout
      active="history"
      eyebrow="Ledger"
      title="History"
      subtitle="Transaction Ledger & Records"
      className="history-page"
      headerClassName="history-header"
    >
      <section className="history-content">
        <div className="history-summary">
          <div>
            <span>Total Outflow</span>
            <strong>{formatNaira(outflow)}</strong>
            <small>{successfulDebits.length} successful debits recorded</small>
          </div>
          <div>
            <span>Total Inflow</span>
            <strong>{formatNaira(inflow)}</strong>
            <small>{transactions.filter((transaction) => transactionCategory(transaction) === "Wallet Funding").length} wallet deposits</small>
          </div>
        </div>

        <div className="history-toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions..."
            aria-label="Search transactions"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option>All Status</option>
            <option value="success">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="history-filters" role="tablist" aria-label="Transaction categories">
          {filters.map((item) => (
            <button
              className={filter === item ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={filter === item}
              onClick={() => setFilter(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>

        {loading && (
          <div className="history-state">
            <div className="dashboard-spinner" />
            <p>Loading transaction ledger...</p>
          </div>
        )}

        {errorMessage && (
          <div className="history-error" role="alert">
            {errorMessage}
            <button type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}

        {!loading && !errorMessage && filtered.length === 0 && (
          <div className="history-state">
            <h2>No Transactions</h2>
            <p>No {filter.toLowerCase()} transactions recorded.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="history-list">
            {filtered.map((transaction) => {
              const category = transactionCategory(transaction);
              const transactionStatus = normalizedStatus(transaction.status);

              return (
                <button
                  className="history-row"
                  type="button"
                  onClick={() => setSelected(transaction)}
                  key={transaction.id || `${transaction.date}-${transaction.type}-${transaction.label}`}
                >
                  <span className={`history-icon ${transactionStatus}`}>
                    <TransactionIcon category={category} />
                  </span>
                  <span className="history-copy">
                    <strong>{displayTitle(transaction)}</strong>
                    <small>{category} · {displayDate(transaction.date)}</small>
                  </span>
                  <span className={`history-amount ${category === "Wallet Funding" ? "inflow" : ""}`}>
                    {category === "Wallet Funding" ? "+" : "-"}
                    {formatNaira(Number(transaction.amount || 0))}
                    <em className={`history-status ${transactionStatus}`}>
                      {transactionStatus === "success" ? "Completed" : transactionStatus === "failed" ? "Failed" : "Pending"}
                    </em>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="data-modal-backdrop">
            <section className="data-modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-detail-title">
              <button className="data-modal-close" type="button" onClick={() => setSelected(null)} aria-label="Close transaction details">
                x
              </button>

              <p className="data-kicker">Transaction Audit Details</p>
              <h2 id="history-detail-title">{displayTitle(selected)}</h2>

              <div className={`history-detail-status ${normalizedStatus(selected.status)}`}>
                {normalizedStatus(selected.status) === "success"
                  ? "Successful"
                  : normalizedStatus(selected.status) === "failed"
                    ? "Failed"
                    : "Pending"}
              </div>

              <div className="history-detail-amount">
                {transactionCategory(selected) === "Data Bundles"
                  ? dataCapacity(selected)
                  : formatNaira(Number(selected.amount || 0))}
              </div>

              <div className="transaction-summary">
                <div className="history-reference-row">
                  <span>Reference</span>
                  <strong>
                    <span>{String(selected.id)}</span>
                    <button className="copy-inline" type="button" onClick={() => void copyText(String(selected.id), "reference")}>
                      {copied === "reference" ? "Copied" : "Copy"}
                    </button>
                  </strong>
                </div>
                {selected.token && (
                  <div>
                    <span>Prepaid Meter Token</span>
                    <strong>
                      {selected.token}
                      <button className="copy-inline" type="button" onClick={() => void copyText(selected.token || "", "token")}>
                        {copied === "token" ? "Copied" : "Copy"}
                      </button>
                    </strong>
                  </div>
                )}
                {selected.units && (
                  <div>
                    <span>Units</span>
                    <strong>{selected.units}</strong>
                  </div>
                )}
                <div>
                  <span>Service</span>
                  <strong>{transactionCategory(selected)}</strong>
                </div>
                <div>
                  <span>Description</span>
                  <strong>{selected.label || "Wallet transaction"}</strong>
                </div>
                {recipientPhone(selected) &&
                  (transactionCategory(selected) === "Data Bundles" ||
                    transactionCategory(selected) === "Airtime") && (
                    <div>
                      <span>Recipient Number</span>
                      <strong>{recipientPhone(selected)}</strong>
                    </div>
                  )}
                {selected.accountNumber &&
                  transactionCategory(selected) === "Cable TV" && (
                    <div>
                      <span>Smartcard Number</span>
                      <strong>{selected.accountNumber}</strong>
                    </div>
                  )}
                <div>
                  <span>Date &amp; Timestamp</span>
                  <strong>{displayDate(selected.date)}</strong>
                </div>
              </div>

              <div className="history-detail-actions">
                <button type="button" onClick={() => void shareReceipt(selected)}>
                  Share Receipt
                </button>
                <button type="button" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </CustomerPageLayout>
  );
}
