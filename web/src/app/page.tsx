"use client";

import Link from "next/link";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingHero } from "@/components/landing/LandingHero";
import { ServicesGrid } from "@/components/landing/ServicesGrid";
import { VirtualAccountsFunding } from "@/components/landing/VirtualAccountsFunding";
import { HowItWorksSteps } from "@/components/landing/HowItWorksSteps";
import { SupportBanner } from "@/components/landing/SupportBanner";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)] selection:bg-[var(--primary)] selection:text-white transition-colors duration-200">
      {/* 1. Header Navigation */}
      <LandingNavbar />

      <main id="main-content">
        {/* 2. Hero Section with Live Master Card Mockup */}
        <LandingHero />

        {/* 3. Complete VTU Services Suite */}
        <ServicesGrid />

        {/* 4. Automated Virtual Account Funding (Monnify 3-Bank Engine) */}
        <VirtualAccountsFunding />

        {/* 5. Step-by-Step How It Works Progression */}
        <HowItWorksSteps />

        {/* 6. Kano Human Support & Dispute Resolution Desk */}
        <SupportBanner />

        {/* 7. Frequently Asked Questions */}
        <LandingFaq />

        {/* 8. Executive High-Conversion CTA Banner */}
        <section className="relative border-t border-[var(--border)] py-20 md:py-28 bg-[var(--surface-low)]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border-high)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--surface-high)] p-10 shadow-2xl sm:p-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-[var(--primary)] mb-6">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Enterprise Telecom Infrastructure</span>
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-5xl">
                Ready for instantaneous telecom and utility top-ups?
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-base text-[var(--text-muted)] font-medium leading-relaxed">
                Join thousands of individuals, students, and VTU vendors across Nigeria managing their data subscriptions and utility settlements from one dependable wallet.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-8 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--primary-container)] hover:shadow-lg active:scale-[0.98]"
                >
                  <span>Open Free Account</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-7 text-sm font-bold text-[var(--text)] transition-colors hover:bg-[var(--surface-low)] active:scale-[0.98]"
                >
                  Sign In to Wallet
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Comprehensive Corporate Footer */}
      <LandingFooter />
    </div>
  );
}
