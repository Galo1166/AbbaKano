"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useThemeMode } from "@/lib/theme";

export function LandingNavbar() {
  const { theme, toggleTheme } = useThemeMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--canvas)]/90 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-high)] bg-[var(--surface)] p-1.5 shadow-sm">
            <Image
              src="/branding/logo.png"
              alt="AbbaKano DataSub"
              width={36}
              height={36}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-[var(--text)] sm:text-lg">
              AbbaKano DataSub
            </span>
            <span className="hidden text-xs font-medium text-[var(--text-muted)] tracking-wide sm:block">
              Digital Utilities &amp; Telecommunications
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main Navigation">
          <a
            href="#services"
            className="text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
          >
            Services
          </a>
          <a
            href="#funding"
            className="text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
          >
            Virtual Accounts
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
          >
            How It Works
          </a>
          <a
            href="#support"
            className="text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
          >
            Support Desk
          </a>
          <a
            href="#faq"
            className="text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
          >
            FAQ
          </a>
        </nav>

        {/* Action Controls */}
        <div className="hidden items-center gap-3.5 sm:flex">
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-high)] bg-[var(--surface)] text-[var(--text)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer"
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
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-bold text-[var(--text)] transition-colors hover:bg-[var(--surface-high)]"
          >
            Sign In
          </Link>

          <Link
            href="/register"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--primary-container)] hover:shadow-md active:scale-95"
          >
            Create Account
          </Link>
        </div>

        {/* Mobile Trigger */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
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

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-5 sm:hidden">
          <nav className="flex flex-col gap-3">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-semibold text-[var(--text)]"
            >
              Services
            </a>
            <a
              href="#funding"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-semibold text-[var(--text)]"
            >
              Virtual Accounts
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-semibold text-[var(--text)]"
            >
              How It Works
            </a>
            <a
              href="#support"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-semibold text-[var(--text)]"
            >
              Support Desk
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 text-sm font-semibold text-[var(--text)]"
            >
              FAQ
            </a>
            <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-[var(--border)]">
              <Link
                href="/login"
                className="flex h-11 items-center justify-center rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text)]"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-sm"
              >
                Create Account
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
