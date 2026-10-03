"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchAdminOverviewSnapshot,
  fetchProviderBalances,
  type Carrier,
} from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge, { txStatusVariant } from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { Transaction } from "@admin/types/telecom";
import type { ProviderBalance } from "@admin/types/telecom";

type Overview = Awaited<ReturnType<typeof fetchAdminOverviewSnapshot>>["overview"];

const KPICard = ({
  label,
  value,
  subtitle,
  badge,
  icon,
  href,
}: {
  label: string;
  value: string;
  subtitle: string;
  badge?: string;
  icon: string;
  href?: string;
}) => {
  const content = (
    <div className="w-full min-w-0 bg-white p-5 rounded-xl shadow-xs border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between group cursor-pointer h-full">
      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
            {label}
          </span>
          {badge ? (
            <Badge variant="success" label={badge} withDot={false} />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
            </div>
          )}
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tracking-tight truncate">
          {value}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 truncate">
        {subtitle}
      </div>
    </div>
  );

  return href ? <Link href={href} className="block h-full w-full min-w-0">{content}</Link> : content;
};

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

const CARRIER_COLORS: Record<string, string> = {
  MTN: "#eab308",
  AIRTEL: "#ef4444",
  GLO: "#10b981",
  "9MOBILE": "#0ea5e9",
  AEDC: "#6366f1",
  IKEDC: "#8b5cf6",
  KEDCO: "#a855f7",
  PHED: "#d946ef",
  JED: "#ec4899",
  DSTV: "#f97316",
  GOTV: "#f59e0b",
  STARTIMES: "#84cc16",
  VTUGATE: "#64748b",
};
const OVERVIEW_CARRIERS = [
  "MTN", "AIRTEL", "GLO", "9MOBILE", "AEDC", "IKEDC",
  "KEDCO", "PHED", "JED", "DSTV", "GOTV", "STARTIMES", "VTUGATE",
] as const;

export default function OverviewPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [providerBalance, setProviderBalance] = useState<ProviderBalance | null>(null);
  const [providerBalanceLoading, setProviderBalanceLoading] = useState(true);
  const [providerBalanceError, setProviderBalanceError] = useState<string | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [trend, setTrend] = useState<Array<{ label: string; sales: number; deposits: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTimeRange, setActiveTimeRange] = useState("Today");

  useEffect(() => {
    let cancelled = false;
    const days = activeTimeRange === "7D" ? 7 : activeTimeRange === "30D" ? 30 : 1;
    fetchAdminOverviewSnapshot(days)
      .then((snapshot) => {
        if (cancelled) return;
        setErrorMessage(null);
        setOverview(snapshot.overview);
        setRecentTxns(snapshot.transactions);
        setTrend(snapshot.trend);
      })
      .catch((error: unknown) => {
        if (error && typeof error === "object" && "status" in error && error.status === 401) {
          router.replace("/admin/login");
          return;
        }
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load the dashboard.");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeTimeRange, router]);

  useEffect(() => {
    let cancelled = false;
    fetchProviderBalances()
      .then((providers) => {
        if (cancelled) return;
        setProviderBalance(providers[0] ?? null);
        setProviderBalanceError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setProviderBalance(null);
        setProviderBalanceError(
          error instanceof Error ? error.message : "Could not load provider balance.",
        );
      })
      .finally(() => {
        if (!cancelled) setProviderBalanceLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs text-slate-500">Loading dashboard...</span>
        </div>
      </div>
    );

  if (errorMessage || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-800">Unable to load dashboard</p>
          <p className="text-xs text-slate-500 mt-1">{errorMessage || "Please try again."}</p>
        </div>
      </div>
    );
  }

  const trendMaximum = Math.max(
    1,
    ...trend.flatMap((point) => [point.sales, point.deposits]),
  );
  const carrierNames: Carrier[] = [
    ...OVERVIEW_CARRIERS,
    ...(Object.keys(overview.carrierBreakdown) as Carrier[]).filter(
      (carrier) => !OVERVIEW_CARRIERS.includes(carrier as typeof OVERVIEW_CARRIERS[number]),
    ),
  ];
  const trendSales = trend.reduce((total, point) => total + point.sales, 0);
  const trendDeposits = trend.reduce((total, point) => total + point.deposits, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        breadcrumbs={["Operations", "Overview"]}
        title="Dashboard Overview"
        description="Daily sales, wallet deposits, and telecom carrier distribution."
        actions={
          <Link
            href="/admin/transactions"
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>View All Transactions</span>
          </Link>
        }
      />

      {/* KPI Cards Grid */}
      <section className="grid w-full min-w-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Today's Sales"
          value={formatNaira(overview!.totalVolumeToday)}
          subtitle={`${overview!.ordersToday.toLocaleString()} orders ? ${overview!.successRate}% success`}
          icon="trending_up"
          href="/admin/transactions"
        />
        <KPICard
          label="Estimated Profit"
          value={overview!.netMarginToday === null ? "Unavailable" : formatNaira(overview!.netMarginToday)}
          subtitle="Net wholesale spread today"
          icon="savings"
          href="/admin/transactions"
        />
        <KPICard
          label="Active Resellers"
          value={overview!.activeUsers.toLocaleString()}
          subtitle={`${overview!.newUsersToday} joined today · ${overview!.totalUsers.toLocaleString()} total`}
          icon="group"
          href="/admin/users"
        />
        <KPICard
          label="Provider Balance"
          value={providerBalanceLoading
            ? "Loading"
            : providerBalance
              ? formatNaira(providerBalance.balance)
              : "Unavailable"}
          subtitle={providerBalance
            ? `Threshold: ${formatNaira(providerBalance.lowBalanceThreshold)} · Checked ${formatTimeAgo(providerBalance.lastRefillAt)}`
            : providerBalanceError || "VTUGATE balance is unavailable"}
          badge={providerBalance
            ? providerBalance.status === "HEALTHY"
              ? "Healthy"
              : providerBalance.status === "LOW_BALANCE"
                ? "Low"
                : providerBalance.status === "CRITICAL"
                  ? "Critical"
                  : providerBalance.status
            : undefined}
          icon="account_balance_wallet"
          href="/admin/provider-balances"
        />
      </section>

      {/* Analytics Section */}
      <section className="grid w-full min-w-0 grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Line Chart ?8 cols */}
        <div className="w-full min-w-0 lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Deposits vs. Service Sales
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison between customer deposits and airtime/data sales.
                </p>
              </div>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium text-slate-600 gap-0.5 self-start sm:self-auto">
                {["Today", "7D", "30D"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTimeRange(t)}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      activeTimeRange === t
                        ? "bg-white text-slate-900 font-semibold shadow-xs"
                        : "hover:text-slate-900"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend Bar */}
            <div className="flex flex-wrap items-center gap-5 py-3 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-slate-500">Deposits:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatNaira(trendDeposits)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Sales:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatNaira(trendSales)}
                </span>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="min-w-0 pt-4 pb-1 overflow-x-auto" role="img" aria-label={`Sales and deposits over ${activeTimeRange}`}>
              {trend.length === 0 ? (
                <p className="flex h-48 items-center justify-center text-xs text-slate-500">No completed sales or deposits in this period.</p>
              ) : (
                <div className="grid min-w-[480px] grid-rows-[176px_auto] gap-2">
                  <div className="grid h-44 items-end gap-1 border-b border-slate-200" style={{ gridTemplateColumns: `repeat(${trend.length}, minmax(0, 1fr))` }}>
                    {trend.map((point) => (
                      <div className="flex h-full items-end justify-center gap-0.5" key={point.label} title={`${point.label}: Sales ${formatNaira(point.sales)}, deposits ${formatNaira(point.deposits)}`}>
                        <span className="w-1/3 rounded-t-sm bg-primary" style={{ height: `${Math.max(point.deposits ? 2 : 0, point.deposits / trendMaximum * 100)}%` }} />
                        <span className="w-1/3 rounded-t-sm bg-emerald-500" style={{ height: `${Math.max(point.sales ? 2 : 0, point.sales / trendMaximum * 100)}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="grid min-w-0 gap-1" style={{ gridTemplateColumns: `repeat(${trend.length}, minmax(0, 1fr))` }}>
                    {trend.map((point, index) => (
                      <span className="truncate text-center font-mono text-[9px] text-slate-400" key={point.label}>
                        {index % Math.max(1, Math.ceil(trend.length / 6)) === 0 || index === trend.length - 1 ? point.label : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Carrier Share */}
        <div className="w-full min-w-0 lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Network Share
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">All-time successful sales by service</p>
            </div>

            <div className="relative flex items-center justify-center py-5">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                {carrierNames.map((carrier, index) => {
                  const share = overview!.carrierBreakdown[carrier];
                  const dashLength = (share.percentage / 100) * 289;
                  const offset = carrierNames
                    .slice(0, index)
                    .reduce((total, previousCarrier) => total + overview!.carrierBreakdown[previousCarrier].percentage, 0);
                  return (
                    <circle
                      key={carrier}
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke={CARRIER_COLORS[carrier] || "#64748b"}
                      strokeDasharray={`${dashLength} ${289 - dashLength}`}
                      strokeDashoffset={`${-(offset / 100) * 289}`}
                      strokeLinecap="butt"
                      strokeWidth="12"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  All-time
                </span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {formatNaira(carrierNames.reduce((total, carrier) => total + overview!.carrierBreakdown[carrier].amount, 0))}
                </span>
                <span className="text-[10px] text-slate-400">Successful sales</span>
              </div>
            </div>

            {/* Carrier Breakdown */}
            <div className="space-y-2.5">
              {carrierNames.map((carrier) => {
                const d = overview!.carrierBreakdown[carrier];
                return (
                  <div key={carrier} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-slate-50 flex items-center justify-center p-0.5 shrink-0">
                      <Image
                        src={resolveCarrierImage(carrier)}
                        alt={carrier}
                        width={18}
                        height={18}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-800">{carrier}</span>
                        <span className="font-mono text-slate-500 font-semibold">{d.percentage}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${d.percentage}%`,
                            backgroundColor: CARRIER_COLORS[carrier] || "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Provider Health */}
      <section className="w-full min-w-0 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Provider Health</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live latency and availability telemetry is not connected yet.
            </p>
          </div>
          <Link
            href="/admin/vtu-services"
            className="text-xs text-primary font-semibold hover:underline cursor-pointer"
          >
            Manage Routing →
          </Link>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          Provider availability, gateway latency, and upstream account balances are not currently supplied by a live telemetry source. No operational status is inferred from sales history.
        </div>
      </section>

      {/* Recent Dispatches */}
      <section className="w-full min-w-0 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Dispatches</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest service deliveries</p>
          </div>
          <Link
            href="/admin/transactions"
            className="text-xs text-primary font-semibold hover:underline cursor-pointer"
          >
            All Transactions →
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recentTxns.map((txn) => (
            <div
              key={txn.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 px-5 py-3 hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center p-1 shrink-0">
                  <Image
                    src={resolveCarrierImage(txn.carrier)}
                    alt={txn.carrier}
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate font-mono">
                    {txn.customerPhone}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{txn.plan}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 pl-10 sm:pl-0">
                <span className="font-mono text-sm font-bold text-slate-900">
                  {formatNaira(txn.sellingPrice)}
                </span>
                <Badge variant={txStatusVariant(txn.status)} label={txn.status} withDot />
                <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                  {formatTimeAgo(txn.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
