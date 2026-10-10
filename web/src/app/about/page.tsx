"use client";

import { PublicDocLayout } from "@/components/navigation/PublicDocLayout";
import Link from "next/link";

export default function AboutPage() {
  return (
    <PublicDocLayout
      eyebrow="Corporate Overview"
      title="About AbbaKano DataSub"
      subtitle="Nigeria's trusted digital utilities and telecommunications distribution engine."
      lastUpdated="October 2026"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[var(--text)]">Our Mission</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          AbbaKano DataSub was founded in Kano, Nigeria with a clear purpose: to eliminate transaction failure, exorbitant markup pricing, and artificial delays in digital telecom and utility delivery. We empower individuals, businesses, and retail vendors with instant access to wholesale-grade telecommunications infrastructure.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Core Infrastructure</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-high)] p-4">
            <h3 className="text-sm font-bold text-[var(--text)]">Automated Bank Liquidity</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Powered by multi-bank virtual accounts (Wema Bank, Moniepoint) providing instant wallet deposits with zero manual delays.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-high)] p-4">
            <h3 className="text-sm font-bold text-[var(--text)]">Direct Telco API Integration</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              High-speed direct routes to MTN, Airtel, Glo, and 9mobile executing transactions in seconds with carrier-grade reliability.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">24/7 Human Accountability</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          Unlike platforms that hide behind automated chatbots, AbbaKano DataSub maintains a fully staffed operations center in Kano State, Nigeria. Our team is available 24 hours a day, 7 days a week, 365 days a year to ensure every customer issue is resolved immediately.
        </p>
      </section>

      <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-wrap gap-4">
        <Link
          href="/register"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-container)]"
        >
          Create Free Account
        </Link>
        <Link
          href="/support"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-6 text-xs font-bold text-[var(--text)] hover:bg-[var(--surface-low)]"
        >
          Contact Resolution Desk
        </Link>
      </div>
    </PublicDocLayout>
  );
}
