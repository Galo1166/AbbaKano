"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchAdminSession, fetchDashboardOverview, fetchTransactions } from "@admin/services/api";
import { formatNaira, formatTimeAgo } from "@admin/lib/utils";
import Badge, { txStatusVariant } from "@admin/components/ui/Badge";
import PageHeader from "@admin/components/layout/PageHeader";
import type { Transaction } from "@admin/types/telecom";

type Overview = Awaited<ReturnType<typeof fetchDashboardOverview>>;

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
    <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between group cursor-pointer h-full min-w-0">
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

  return href ? <Link href={href}>{content}</Link> : content;
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
};

export default function OverviewPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTimeRange, setActiveTimeRange] = useState("Today");

  useEffect(() => {
    Promise.all([fetchAdminSession(), fetchDashboardOverview(), fetchTransactions(1, 8)])
      .then(([, ov, txns]) => {
        setOverview(ov);
        setRecentTxns(txns.data);
      })
      .catch((error: unknown) => {
        if (error && typeof error === "object" && "status" in error && error.status === 401) {
          router.replace("/admin/login");
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : "Unable to load the dashboard.");
      })
      .finally(() => setLoading(false));
  }, [router]);

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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          value={overview!.vtuProviderBalance === null ? "Unavailable" : formatNaira(overview!.vtuProviderBalance)}
          subtitle={overview!.vtuProviderBalance === null ? "Provider balance endpoint not connected" : "Threshold: ₦500,000.00"}
          badge={overview!.vtuProviderBalance === null ? undefined : "Normal"}
          icon="account_balance_wallet"
          href="/admin/provider-balances"
        />
      </section>

      {/* Analytics Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Line Chart ?8 cols */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
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
                  {formatNaira(overview!.depositsToday)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Sales:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatNaira(overview!.totalVolumeToday)}
                </span>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="relative pt-3 pb-1 overflow-x-auto">
              <svg className="w-full min-w-[480px] h-52 overflow-visible" viewBox="0 0 680 220" fill="none">
                <defs>
                  <linearGradient id="depositsGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#00276c" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#00276c" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="vtuGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Horizontal Grid */}
                {[20, 65, 110, 155].map((y) => (
                  <line
                    key={y}
                    x1="45"
                    x2="670"
                    y1={y}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                ))}
                <line x1="45" x2="670" y1="195" y2="195" stroke="#e2e8f0" strokeWidth="1" />
                {/* Y Labels */}
                {[
                  ["?5M", 24],
                  ["?3.5M", 69],
                  ["?2M", 114],
                  ["?1M", 159],
                  ["?0", 198],
                ].map(([l, y]) => (
                  <text
                    key={String(l)}
                    fill="#94a3b8"
                    fontFamily="monospace"
                    fontSize="10"
                    textAnchor="end"
                    x="40"
                    y={Number(y)}
                  >
                    {l}
                  </text>
                ))}
                {/* Deposits Area */}
                <path
                  d="M 55 195 L 55 178 Q 110 162 165 145 T 275 105 T 385 62 T 495 55 T 605 32 L 665 24 L 665 195 Z"
                  fill="url(#depositsGrad)"
                />
                <path
                  d="M 55 178 Q 110 162 165 145 T 275 105 T 385 62 T 495 55 T 605 32 L 665 24"
                  stroke="#00276c"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Sales Area */}
                <path
                  d="M 55 195 L 55 186 Q 110 174 165 156 T 275 125 T 385 88 T 495 72 T 605 52 L 665 44 L 665 195 Z"
                  fill="url(#vtuGrad)"
                />
                <path
                  d="M 55 186 Q 110 174 165 156 T 275 125 T 385 88 T 495 72 T 605 52 L 665 44"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* X Labels */}
                {[
                  ["00:00", 55],
                  ["04:00", 165],
                  ["08:00", 275],
                  ["11:00", 385],
                  ["13:00", 495],
                  ["14:00", 605],
                  ["16:00", 665],
                ].map(([l, x]) => (
                  <text
                    key={String(l)}
                    fill="#94a3b8"
                    fontFamily="monospace"
                    fontSize="10"
                    textAnchor="middle"
                    x={Number(x)}
                    y="212"
                  >
                    {l}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* Carrier Share ?4 cols */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Network Share
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sales percentage across carriers
              </p>
            </div>

            <div className="relative flex items-center justify-center py-5">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#eab308"
                  strokeDasharray="150 289"
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  strokeWidth="12"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#ef4444"
                  strokeDasharray="75 289"
                  strokeDashoffset="-152"
                  strokeLinecap="round"
                  strokeWidth="12"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#10b981"
                  strokeDasharray="40 289"
                  strokeDashoffset="-228"
                  strokeLinecap="round"
                  strokeWidth="12"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill="none"
                  stroke="#0ea5e9"
                  strokeDasharray="23 289"
                  strokeDashoffset="-270"
                  strokeLinecap="round"
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Total
                </span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {overview!.ordersToday.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">Orders</span>
              </div>
            </div>

            {/* Carrier Breakdown */}
            <div className="space-y-2.5">
              {(["MTN", "AIRTEL", "GLO", "9MOBILE"] as const).map((carrier) => {
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
                            backgroundColor: CARRIER_COLORS[carrier],
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

      {/* Carrier Status Grid */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Network Gateway Status</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current operational status per network
            </p>
          </div>
          <Link
            href="/admin/vtu-services"
            className="text-xs text-primary font-semibold hover:underline cursor-pointer"
          >
            Manage Routing →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              carrier: "MTN",
              speed: "312ms",
              rate: "99.4%",
              status: "Operational",
              badgeVariant: "success" as const,
            },
            {
              carrier: "AIRTEL",
              speed: "428ms",
              rate: "98.7%",
              status: "Operational",
              badgeVariant: "success" as const,
            },
            {
              carrier: "GLO",
              speed: "560ms",
              rate: "97.9%",
              status: "Degraded",
              badgeVariant: "warning" as const,
            },
            {
              carrier: "9MOBILE",
              speed: "1,240ms",
              rate: "94.2%",
              status: "Low Balance",
              badgeVariant: "critical" as const,
            },
          ].map((g) => (
            <div
              key={g.carrier}
              className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Image
                    src={resolveCarrierImage(g.carrier)}
                    alt={g.carrier}
                    width={22}
                    height={22}
                    className="object-contain"
                  />
                  <span className="font-bold text-sm text-slate-900">{g.carrier}</span>
                </div>
                <Badge variant={g.badgeVariant} label={g.status} withDot={false} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-200/60 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Speed</span>
                  <span className="font-semibold text-slate-700">{g.speed}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Success</span>
                  <span className="font-semibold text-emerald-700">{g.rate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Dispatches */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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
