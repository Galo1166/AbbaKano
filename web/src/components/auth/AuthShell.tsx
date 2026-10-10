"use client";

import Link from "next/link";
import Image from "next/image";
import { type ReactNode } from "react";
import { useThemeMode } from "@/lib/theme";

interface AuthShellProps {
  title: string;
  subtitle: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthShell({ title, subtitle, description, children, footer }: AuthShellProps) {
  const { theme, toggleTheme } = useThemeMode();

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)] transition-colors duration-200 flex flex-col relative overflow-hidden">
      {/* Ambient background glows */}
      <div
        className="pointer-events-none absolute -top-40 right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--primary)]/10 blur-[120px] transition-opacity duration-300 dark:bg-[var(--primary)]/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[100px] transition-opacity duration-300 dark:bg-blue-600/10"
        aria-hidden="true"
      />

      {/* Top Navbar */}
      <header className="w-full border-b border-[var(--border)] bg-[var(--canvas)]/80 backdrop-blur-md z-10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-high)] bg-[var(--surface)] p-1.5 shadow-xs">
              <Image
                src="/branding/logo.png"
                alt="AbbaKano DataSub"
                width={32}
                height={32}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-[var(--text)]">
                AbbaKano DataSub
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-high)] bg-[var(--surface)] text-[var(--text)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="4" strokeWidth="2" />
                  <path strokeWidth="2" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors whitespace-nowrap shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface-high)] border border-transparent hover:border-[var(--border)]"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="whitespace-nowrap"><span className="hidden sm:inline">Back to </span>Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Auth Content Card */}
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 relative z-10">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-[var(--border-high)] bg-[var(--surface)] p-6 sm:p-9 shadow-2xl backdrop-blur-xl">
            {/* Header copy */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold text-[var(--primary)] mb-3">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>256-Bit Secured Portal</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
                {title}
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[var(--text-muted)] font-medium leading-relaxed">
                {description}
              </p>
            </div>

            {/* Form body */}
            {children}

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)] font-medium">
              {footer}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
