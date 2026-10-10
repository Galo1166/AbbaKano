"use client";

import Link from "next/link";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";

interface PublicDocLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function PublicDocLayout({
  eyebrow,
  title,
  subtitle,
  lastUpdated = "October 2026",
  children,
}: PublicDocLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)] transition-colors duration-200 flex flex-col">
      {/* 1. Standard Public Navbar */}
      <LandingNavbar />

      {/* 2. Main Document Content */}
      <main className="flex-1 pt-24 pb-20 md:pt-28 md:pb-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Back Navigation & Breadcrumb */}
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary)] hover:underline"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Home</span>
            </Link>
          </div>

          {/* Document Header Card */}
          <header className="rounded-3xl border border-[var(--border-high)] bg-[var(--surface)] p-6 sm:p-10 shadow-lg mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-bold text-[var(--primary)] mb-4">
              <span>{eyebrow}</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl md:text-5xl">
              {title}
            </h1>

            <p className="mt-4 text-base sm:text-lg text-[var(--text-muted)] font-medium leading-relaxed">
              {subtitle}
            </p>

            <div className="mt-6 flex items-center gap-2 text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-4">
              <span>Effective &amp; Last Updated:</span>
              <span className="font-semibold text-[var(--text)]">{lastUpdated}</span>
            </div>
          </header>

          {/* Document Body */}
          <div className="rounded-3xl border border-[var(--border-high)] bg-[var(--surface)] p-6 sm:p-10 shadow-lg space-y-8 leading-relaxed">
            {children}
          </div>
        </div>
      </main>

      {/* 3. Standard Public Footer */}
      <LandingFooter />
    </div>
  );
}
