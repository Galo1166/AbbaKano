"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useThemeMode } from "@/lib/theme";

export function LandingHero() {
  const router = useRouter();
  const { theme } = useThemeMode();
  const [balanceMasked, setBalanceMasked] = useState(false);

  async function handleProtectedNav(e: React.MouseEvent<HTMLAnchorElement>, targetPath: string) {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push(targetPath);
      } else {
        router.push(`/login?redirect=${encodeURIComponent(targetPath)}`);
      }
    } catch {
      router.push(`/login?redirect=${encodeURIComponent(targetPath)}`);
    }
  }

  return (
    <section className="relative overflow-hidden pt-16 pb-16 sm:pt-24 sm:pb-20 md:pt-28 md:pb-24">
      {/* Refined ambient background glares */}
      <div
        className="pointer-events-none absolute -top-40 right-1/4 h-[560px] w-[560px] rounded-full bg-[var(--primary)]/10 blur-[120px] transition-opacity duration-300 dark:bg-[var(--primary)]/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -left-32 h-[420px] w-[420px] rounded-full bg-blue-500/5 blur-[100px] transition-opacity duration-300 dark:bg-blue-600/10"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Executive Value Proposition (Strictly Centralized on Mobile, Left-aligned on Desktop) */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Humanized, dignified headline */}
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl md:text-5xl lg:text-6xl leading-[1.18] max-w-2xl">
              Reliable VTU &amp; Telecom Infrastructure at Your Fingertips.
            </h1>

            {/* Clear, executive subtitle */}
            <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-[var(--text-muted)] font-medium">
              Instant data top-ups, airtime recharge, electricity bill settlement, and cable TV renewals delivered with high reliability and zero downtime. Powered by automated virtual bank liquidity.
            </p>

            {/* Primary conversion CTAs (Centered on mobile view as requested in sample) */}
            <div className="mt-7 flex flex-row flex-wrap items-center justify-center lg:justify-start gap-3 w-full sm:w-auto">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-7 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--primary-container)] hover:shadow-lg active:scale-[0.98]"
              >
                <span>Get Started in 60s</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>

              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-6 text-sm font-bold text-[var(--text)] transition-colors hover:bg-[var(--surface-low)] active:scale-[0.98]"
              >
                Sign In to Account
              </Link>

              <Link
                href="#services"
                className="inline-flex h-11 items-center justify-center px-4 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
              >
                Explore Services &darr;
              </Link>
            </div>

            {/* Verified Trust Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-y-3 gap-x-5 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-muted)] font-medium w-full">
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>Direct Provider API Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>Dedicated Virtual Accounts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>Kano-Based Human Support</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Master Interactive Wallet Card */}
          <div className="lg:col-span-5 w-full flex justify-center">
            <div className="relative w-full max-w-sm rounded-3xl border border-[var(--border-high)] bg-[var(--surface)] p-5 sm:p-6 shadow-2xl backdrop-blur-xl text-left">
              {/* Card User Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-high)] bg-[var(--surface-low)] shadow-xs">
                    <Image
                      src="/branding/logo.png"
                      alt="AbbaKano"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-[var(--text-muted)]">
                      Customer Wallet
                    </span>
                    <span className="block text-base font-extrabold text-[var(--text)]">
                      Abba Kano
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-full border border-[var(--tertiary)]/20 bg-[var(--tertiary-container)] px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--tertiary)]" />
                  <span className="text-xs font-bold text-[var(--tertiary)]">
                    Active
                  </span>
                </div>
              </div>

              {/* Master Balance Card */}
              <div className="mt-5 rounded-2xl border border-slate-700/40 bg-gradient-to-br from-[#181C26] to-[#0E1118] p-5 text-white shadow-md dark:border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-400">
                    Available Wallet Balance
                  </span>
                  <button
                    type="button"
                    onClick={() => setBalanceMasked(!balanceMasked)}
                    className="flex items-center gap-1.5 text-slate-300 transition-colors hover:text-white cursor-pointer px-2 py-0.5 rounded-lg shrink-0 select-none"
                    aria-label="Toggle balance visibility"
                  >
                    {balanceMasked ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                    <span className="text-xs font-medium">{balanceMasked ? "Show" : "Hide"}</span>
                  </button>
                </div>

                <div className="mt-3 font-mono text-3xl font-extrabold tracking-tight text-white">
                  {balanceMasked ? "••••••••" : "₦48,500.00"}
                </div>

                {/* Card Action Buttons (2-column grid) */}
                <div
                  className="mt-5 gap-3"
                  style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
                >
                  <a
                    href="/fund-wallet"
                    onClick={(e) => handleProtectedNav(e, "/fund-wallet")}
                    className="flex min-h-[40px] items-center justify-center gap-1 rounded-lg bg-[var(--primary)] px-2 py-2 text-[11px] sm:text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-95 shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Fund Wallet</span>
                  </a>

                  <a
                    href="/data"
                    onClick={(e) => handleProtectedNav(e, "/data")}
                    className="flex min-h-[40px] items-center justify-center gap-1 rounded-lg border border-[var(--border-high)] bg-[var(--surface-low)] px-2 py-2 text-[11px] sm:text-xs font-bold text-[var(--text)] transition-colors hover:bg-[var(--surface-high)] active:scale-95 cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    <svg className="h-4 w-4 text-[var(--primary-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Instant Sub</span>
                  </a>
                </div>
              </div>

              {/* 4 Quick Service Actions (4-column horizontal grid) */}
              <div
                className="mt-5 gap-2 text-center"
                style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
              >
                <a
                  href="/data"
                  onClick={(e) => handleProtectedNav(e, "/data")}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-[var(--surface-high)] cursor-pointer"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a10 10 0 0114.142 0M1.343 6.343a15 15 0 0121.314 0" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text)]">Data</span>
                </a>

                <a
                  href="/airtime"
                  onClick={(e) => handleProtectedNav(e, "/airtime")}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-[var(--surface-high)] cursor-pointer"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text)]">Airtime</span>
                </a>

                <a
                  href="/electricity"
                  onClick={(e) => handleProtectedNav(e, "/electricity")}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-[var(--surface-high)] cursor-pointer"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text)]">Power</span>
                </a>

                <a
                  href="/cable-tv"
                  onClick={(e) => handleProtectedNav(e, "/cable-tv")}
                  className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-[var(--surface-high)] cursor-pointer"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text)]">Cable</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
