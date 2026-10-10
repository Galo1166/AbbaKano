"use client";

import Link from "next/link";

export function VirtualAccountsFunding() {
  return (
    <section id="funding" className="relative border-t border-[var(--border)] py-20 md:py-28 bg-[var(--surface-low)]/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column */}
          <div className="lg:col-span-6">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              Instant Auto-Credit Engine
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">
              Dedicated Virtual Bank Accounts for Zero-Delay Funding
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)]">
              Every AbbaKano user receives unique, permanent bank account numbers generated directly upon registration. Transfer from any Nigerian banking app, and your funds reflect automatically in under 30 seconds.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--tertiary)]/15 text-[var(--tertiary)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Supports All Nigerian Banking Apps</h4>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Send funds seamlessly from OPay, PalmPay, Kuda, GTBank, Zenith, Access, Moniepoint, or any commercial bank.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--tertiary)]/15 text-[var(--tertiary)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Zero Manual Proof of Payment</h4>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    No uploading receipts or texting administrators. The Monnify multi-bank webhook automatically credits your balance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--tertiary)]/15 text-[var(--tertiary)]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text)]">Paystack Card Gateway Alternative</h4>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Prefer debit card payments? Paystack checkout is also built in for instant card and USSD deposits.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-sm font-bold text-white shadow-sm hover:bg-[var(--primary-container)] active:scale-95"
              >
                Get Your Dedicated Accounts
              </Link>
            </div>
          </div>

          {/* Right Column: Bank Cards */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-2xl border border-[var(--border-high)] bg-[var(--surface)] p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 font-extrabold text-sm">
                    WB
                  </div>
                  <div>
                    <span className="block text-sm font-extrabold text-[var(--text)]">Wema Bank</span>
                    <span className="block text-xs text-[var(--text-muted)]">Dedicated Automated Transfer</span>
                  </div>
                </div>
                <span className="rounded-md bg-[var(--tertiary)]/15 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-[var(--tertiary)] whitespace-nowrap shrink-0">
                  Active
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--surface-low)] p-3 border border-[var(--border)]">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Account Number</span>
                  <span className="font-mono text-lg font-bold text-[var(--text)] tracking-wider">7820 •••• 91</span>
                </div>
                <span className="text-xs font-bold text-[var(--primary)]">One-Tap Copy</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-high)] bg-[var(--surface)] p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 font-extrabold text-sm">
                    MP
                  </div>
                  <div>
                    <span className="block text-sm font-extrabold text-[var(--text)]">Moniepoint Microfinance Bank</span>
                    <span className="block text-xs text-[var(--text-muted)]">High Speed Node</span>
                  </div>
                </div>
                <span className="rounded-md bg-[var(--tertiary)]/15 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-[var(--tertiary)] whitespace-nowrap shrink-0">
                  Automated
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--surface-low)] p-3 border border-[var(--border)]">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Account Number</span>
                  <span className="font-mono text-lg font-bold text-[var(--text)] tracking-wider">6512 •••• 44</span>
                </div>
                <span className="text-xs font-bold text-[var(--primary)]">One-Tap Copy</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-high)] bg-[var(--surface)] p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 font-extrabold text-sm">
                    SB
                  </div>
                  <div>
                    <span className="block text-sm font-extrabold text-[var(--text)]">Sterling Bank</span>
                    <span className="block text-xs text-[var(--text-muted)]">Zero-Fail Redundant Channel</span>
                  </div>
                </div>
                <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                  Backup
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[var(--surface-low)] p-3 border border-[var(--border)]">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Account Number</span>
                  <span className="font-mono text-lg font-bold text-[var(--text)] tracking-wider">8903 •••• 12</span>
                </div>
                <span className="text-xs font-bold text-[var(--primary)]">One-Tap Copy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
