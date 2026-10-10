"use client";

import Link from "next/link";

const STEPS = [
  {
    number: "01",
    title: "Create your free account",
    description: "Register with your phone number and full name in under 60 seconds. Establish your private 4-digit transaction PIN to protect your wallet balance.",
    pill: "Instant Registration",
  },
  {
    number: "02",
    title: "Fund your personal wallet",
    description: "Transfer any amount from your banking app (OPay, PalmPay, Kuda, GTBank, Zenith, etc.) to your dedicated virtual account. Funds credit automatically.",
    pill: "Automated Liquidity",
  },
  {
    number: "03",
    title: "Select your utility service",
    description: "Choose data, airtime, electricity tokens, or cable TV. Enter the recipient number or meter, verify details, and authorize dispatch with your PIN.",
    pill: "Instant Value",
  },
];

export function HowItWorksSteps() {
  return (
    <section id="how-it-works" className="relative border-t border-[var(--border)] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            Simple 3-Step Process
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">
            From sign-up to your first top-up in 2 minutes.
          </h2>
          <p className="mt-3 text-base text-[var(--text-muted)]">
            Transparent, straightforward bill payments without complex steps or delayed credit.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className="relative flex flex-col justify-between rounded-3xl border border-[var(--border-high)] bg-[var(--surface)] p-8 shadow-xs transition-all duration-200 hover:border-[var(--primary)] hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-3xl font-extrabold text-[var(--primary)]">
                    {step.number}
                  </span>
                  <span className="rounded-full bg-[var(--surface-high)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                    {step.pill}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-extrabold text-[var(--text)]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  {step.description}
                </p>
              </div>

              <div className="mt-8 border-t border-[var(--border)] pt-4 text-xs font-bold text-[var(--primary)]">
                Step {idx + 1} of 3
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--primary-container)] active:scale-95"
          >
            Create Your Account Now
          </Link>
        </div>
      </div>
    </section>
  );
}
