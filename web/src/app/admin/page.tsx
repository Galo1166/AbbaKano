"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"routing" | "liquidity" | "audit">("routing");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950 font-sans overflow-x-hidden">
      {/* -- Background Ambient Glows -- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-[36rem] h-[36rem] bg-indigo-600/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* -- Top Navigation Bar -- */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-blue-700/80 p-1 flex items-center justify-center border border-blue-500/30 group-hover:scale-105 transition-transform overflow-hidden shadow-lg shadow-blue-900/30">
              <Image
                src="/branding/logo.png"
                alt="AbbaKano Core"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  AbbaKano
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ENTERPRISE
                </span>
              </div>
              <span className="text-[10px] text-slate-400 tracking-wider font-semibold uppercase">
                Telecom Core Console
              </span>
            </div>
          </Link>

          {/* Quick Header Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-amber-400 transition-colors cursor-pointer">
              Capabilities
            </a>
            <a href="#networks" className="hover:text-amber-400 transition-colors cursor-pointer">
              Carrier Matrix
            </a>
            <a href="#security" className="hover:text-amber-400 transition-colors cursor-pointer">
              Institutional Security
            </a>
            <a href="#preview" className="hover:text-amber-400 transition-colors cursor-pointer">
              Console Preview
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>System Online</span>
            </div>

            <Link
              href="/admin/login"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Admin Portal Login</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </header>

      {/* -- Hero Section -- */}
      <section className="relative z-10 pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300 shadow-inner mb-6 backdrop-blur-md">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-amber-400 font-semibold">Telecom Infrastructure Console</span>
            <span className="text-slate-500">|</span>
            <span className="font-mono text-slate-400">Release v2.4</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] max-w-4xl">
            Autonomous VTU Settlement, Real-Time Liquidity &{" "}
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              Reseller Orchestration
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Engineered specifically for high-velocity telecom aggregators in Nigeria. Direct multi-carrier failover routing across MTN, Airtel, Glo, and 9mobile with sub-second airtime, data bundle, and utility fulfillment.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/admin/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              <span>Launch Admin Console</span>
            </Link>

            <Link
              href="/admin/overview"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm sm:text-base transition-all hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-amber-400">speed</span>
              <span>Direct Demo Overview</span>
            </Link>
          </div>

          {/* Live KPI Ticker */}
          <div className="mt-14 w-full grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl text-left">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Gateway Latency</span>
              <p className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 mt-1">28 ms</p>
              <span className="text-[11px] text-slate-500">Sub-second dispatch</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Total VTU Pool</span>
              <p className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">?1,420,500</p>
              <span className="text-[11px] text-emerald-400 font-medium">?4 Provider Vaults</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Success Ratio</span>
              <p className="text-xl sm:text-2xl font-mono font-bold text-amber-400 mt-1">99.82%</p>
              <span className="text-[11px] text-slate-500">Auto-failover active</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Active Resellers</span>
              <p className="text-xl sm:text-2xl font-mono font-bold text-blue-400 mt-1">1,248</p>
              <span className="text-[11px] text-slate-500">Tier-1 & Reseller API</span>
            </div>
          </div>
        </div>
      </section>

      {/* -- Carrier Network Grid -- */}
      <section id="networks" className="relative z-10 py-12 border-y border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                Tier-1 Telecom Pipelines
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                Direct Telecommunications Gateway Matrix
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>All 4 Carrier Pipelines Operating Normally</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* MTN */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-yellow-500/30 flex flex-col justify-between hover:border-yellow-400/60 transition-all group">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center p-1.5">
                  <Image src="/carriers/mtn.png" alt="MTN Nigeria" width={40} height={40} className="object-contain" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-yellow-400/20 text-yellow-300">
                  PRIMARY
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-white text-base">MTN Nigeria</h3>
                <p className="text-xs text-slate-400 mt-0.5">SME Data & VTU Topup</p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Gateway Balance:</span>
                  <span className="font-bold text-yellow-400">?620,000.00</span>
                </div>
              </div>
            </div>

            {/* Airtel */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-red-500/30 flex flex-col justify-between hover:border-red-400/60 transition-all group">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center p-1.5">
                  <Image src="/carriers/airtel.png" alt="Airtel Nigeria" width={40} height={40} className="object-contain" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-300">
                  ACTIVE
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-white text-base">Airtel Nigeria</h3>
                <p className="text-xs text-slate-400 mt-0.5">Direct Corporate Gifting</p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Gateway Balance:</span>
                  <span className="font-bold text-red-400">?450,000.00</span>
                </div>
              </div>
            </div>

            {/* Glo */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex flex-col justify-between hover:border-emerald-400/60 transition-all group">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center p-1.5">
                  <Image src="/carriers/glo.png" alt="Glo Nigeria" width={40} height={40} className="object-contain" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                  OPTIMAL
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-white text-base">Globacom</h3>
                <p className="text-xs text-slate-400 mt-0.5">High-Volume VTU Bundles</p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Gateway Balance:</span>
                  <span className="font-bold text-emerald-400">?265,500.00</span>
                </div>
              </div>
            </div>

            {/* 9mobile */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-600/30 flex flex-col justify-between hover:border-emerald-500/60 transition-all group">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-600/30 flex items-center justify-center p-1.5">
                  <Image src="/carriers/9mobile.png" alt="9mobile Nigeria" width={40} height={40} className="object-contain" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                  ATTENTION
                </span>
              </div>
              <div className="mt-4">
                <h3 className="font-bold text-white text-base">9mobile</h3>
                <p className="text-xs text-slate-400 mt-0.5">Low-reserve Refill Queue</p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Gateway Balance:</span>
                  <span className="font-bold text-amber-400">?85,000.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -- Bento Grid Core Features -- */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            Complete Control & Reliability
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
            Built for Mission-Critical Telecommunications
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3">
            Every feature in AbbaKano Admin is architected to eliminate transaction stalls, protect liquidity, and empower financial administrators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-5 border border-blue-500/20">
                <span className="material-symbols-outlined text-[24px]">cell_tower</span>
              </div>
              <h3 className="text-lg font-bold text-white">Dynamic Auto-Failover Routing</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                If an upstream carrier endpoint responds with latency over 800ms or HTTP 5xx, dispatch immediately shifts to pre-warmed backup pipelines without customer disruption.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Zero-downtime routing protocol</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5 border border-amber-500/20">
                <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
              </div>
              <h3 className="text-lg font-bold text-white">Multi-Vault Reserve Monitoring</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Never experience stuck orders due to depleted upstream balances. Instant threshold alerts warn admins and automatically prompt direct bank refill procedures.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-amber-400">
              <span className="material-symbols-outlined text-[16px]">notifications_active</span>
              <span>?100,000 auto-warning trigger</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5 border border-indigo-500/20">
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
              <h3 className="text-lg font-bold text-white">Instant Inflow Reconciliation</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Seamless webhook ingestion from Monnify, Providus Bank, and Kuda. Automatic ledger settlement credits user wallets in under 2 seconds.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-indigo-400">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>100% automated credit audit</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/20">
                <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
              </div>
              <h3 className="text-lg font-bold text-white">Granular Role-Based Access</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Enforce separation of duties with Super Admin, Finance Directors, Support Agents, and Compliance Auditors. Dual-factor authorization required for sensitive operations.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>RBAC matrix enforced</span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-5 border border-purple-500/20">
                <span className="material-symbols-outlined text-[24px]">history_edu</span>
              </div>
              <h3 className="text-lg font-bold text-white">Immutable Audit Trail</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Every administrative click, wallet adjustment, API config update, and provider switch is timestamped with cryptographic integrity, IP tracking, and full before/after snapshots.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-purple-400">
              <span className="material-symbols-outlined text-[16px]">security</span>
              <span>CBN audit-ready logs</span>
            </div>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-5 border border-rose-500/20">
                <span className="material-symbols-outlined text-[24px]">support_agent</span>
              </div>
              <h3 className="text-lg font-bold text-white">One-Click Dispute Resolution</h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Customer support officers can inspect telecom session headers, trigger real-time transaction replays, or issue instant wallet refunds in seconds.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-rose-400">
              <span className="material-symbols-outlined text-[16px]">replay</span>
              <span>Instant replay & refund API</span>
            </div>
          </div>
        </div>
      </section>

      {/* -- Console Live Interactive Preview -- */}
      <section id="preview" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-6 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Interactive Terminal Preview</span>
              <h2 className="text-2xl font-bold text-white mt-1">AbbaKano Operations Control Node</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Direct view into live transactions, network routes, and system telemetry.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("routing")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === "routing"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Routing Matrix
              </button>
              <button
                onClick={() => setActiveTab("liquidity")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === "liquidity"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Liquidity Vault
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === "audit"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Event Stream
              </button>
            </div>
          </div>

          {/* Screen Display */}
          <div className="mt-6 rounded-2xl bg-slate-950 p-4 sm:p-6 border border-slate-800/80 font-mono text-xs sm:text-sm">
            {activeTab === "routing" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span>DISPATCH PIPELINE</span>
                  <span>ROUTE STATUS</span>
                  <span>LATENCY</span>
                  <span>SUCCESS RATE</span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-bold text-yellow-400">MTN_SME_DATALINK_01</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">ONLINE</span>
                  <span className="text-slate-300">24ms</span>
                  <span className="text-emerald-400 font-bold">99.94%</span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-bold text-red-400">AIRTEL_CORP_GIFT_02</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">ONLINE</span>
                  <span className="text-slate-300">31ms</span>
                  <span className="text-emerald-400 font-bold">99.81%</span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-bold text-emerald-400">GLO_DIRECT_API_01</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">ONLINE</span>
                  <span className="text-slate-300">45ms</span>
                  <span className="text-emerald-400 font-bold">99.52%</span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-bold text-emerald-500">9MOBILE_VTU_LINK_03</span>
                  <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">LOW RESERVE</span>
                  <span className="text-slate-300">52ms</span>
                  <span className="text-amber-400 font-bold">98.90%</span>
                </div>
              </div>
            )}

            {activeTab === "liquidity" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">AGGREGATE SYSTEM LIQUIDITY</span>
                  <span className="text-emerald-400 font-bold text-base">?1,420,500.00</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex">
                  <div className="bg-yellow-400 h-full" style={{ width: "43%" }} title="MTN: ?620k" />
                  <div className="bg-red-500 h-full" style={{ width: "32%" }} title="Airtel: ?450k" />
                  <div className="bg-emerald-500 h-full" style={{ width: "19%" }} title="Glo: ?265.5k" />
                  <div className="bg-amber-400 h-full" style={{ width: "6%" }} title="9mobile: ?85k" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                  <div className="text-slate-300"><span className="text-yellow-400">???</span> MTN: ?620,000 (43%)</div>
                  <div className="text-slate-300"><span className="text-red-400">???</span> Airtel: ?450,000 (32%)</div>
                  <div className="text-slate-300"><span className="text-emerald-400">???</span> Glo: ?265,500 (19%)</div>
                  <div className="text-slate-300"><span className="text-amber-400">???</span> 9mobile: ?85,000 (6%)</div>
                </div>
              </div>
            )}

            {activeTab === "audit" && (
              <div className="space-y-2 text-xs">
                <div className="text-slate-400 flex items-center justify-between border-b border-slate-800 pb-1">
                  <span>TIMESTAMP</span>
                  <span>ACTOR</span>
                  <span>ACTION</span>
                  <span>OUTCOME</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 py-1">
                  <span className="text-slate-500">2026-09-25 19:42:10</span>
                  <span className="text-blue-400 font-semibold">Abba Kano (Admin)</span>
                  <span>Configured MTN Failover Policy</span>
                  <span className="text-emerald-400">SUCCESS</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 py-1">
                  <span className="text-slate-500">2026-09-25 19:28:44</span>
                  <span className="text-purple-400 font-semibold">Amina Yusuf (Finance)</span>
                  <span>Logged Manual Vault Refill ?500,000</span>
                  <span className="text-emerald-400">VERIFIED</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 py-1">
                  <span className="text-slate-500">2026-09-25 19:15:02</span>
                  <span className="text-amber-400 font-semibold">Gateway Daemon</span>
                  <span>Triggered Auto-refund #TXN-9821</span>
                  <span className="text-emerald-400">PROCESSED</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-400">shield</span>
              <span>Encrypted via TLS 1.3 with Hardware Security Module active</span>
            </span>
            <Link
              href="/admin/overview"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Open Full Console Dashboard</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* -- Institutional Security Section -- */}
      <section id="security" className="relative z-10 py-16 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                Enterprise Standards
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
                Bank-Grade Compliance & Defense in Depth
              </h2>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                Operating high-volume telecommunications infrastructure requires stringent operational controls. AbbaKano Admin adheres to regulatory guidelines for telecom value-added service providers.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <span className="text-xs sm:text-sm text-slate-300">
                    <strong>Zero Raw Secret Exposure:</strong> API credentials and private keys are never transmitted to client browsers or logged in plain text.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <span className="text-xs sm:text-sm text-slate-300">
                    <strong>IP-Whitelisted Workstations:</strong> Administrative console access is restricted to verified office CIDR blocks and authenticated VPN tunnels.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5">check_circle</span>
                  <span className="text-xs sm:text-sm text-slate-300">
                    <strong>Dual Operator Approvals:</strong> Wallet deductions exceeding ?100,000 or gateway endpoint swaps mandate secondary administrative sign-off.
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Demo Access Card */}
            <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  INSTANT DEMO ACCESS
                </span>
                <h3 className="text-xl font-bold text-white mt-3">Ready to Inspect the Console?</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-2">
                  Launch the live administrative console now with pre-populated telecom data, real-time KPI cards, and full interactive management tools.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href="/admin/login"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm text-center shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Go to Admin Login</span>
                </Link>

                <Link
                  href="/admin/overview"
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm text-center transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  <span>Direct Dashboard Access (Bypass Login)</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -- Footer -- */}
      <footer className="relative z-10 py-10 border-t border-slate-800 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-700 p-0.5 flex items-center justify-center overflow-hidden">
              <Image src="/branding/logo.png" alt="AbbaKano" width={28} height={28} className="object-contain" />
            </div>
            <span className="font-semibold text-white">AbbaKano Admin Console</span>
            <span className="text-slate-600">|</span>
            <span>v2.4 Institutional Telecom Portal</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/admin/overview" className="hover:text-white transition-colors cursor-pointer">
              Dashboard
            </Link>
            <Link href="/admin/login" className="hover:text-white transition-colors cursor-pointer">
              Sign In
            </Link>
            <span className="text-slate-600">?2026 AbbaKano Telecom Services. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
