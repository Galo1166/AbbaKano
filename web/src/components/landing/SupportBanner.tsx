"use client";

import Link from "next/link";

const SUPPORT_WHATSAPP = "2348133339850";
const SUPPORT_PHONE = "+2348133339850";
const SUPPORT_PHONE_DISPLAY = "+234 813 333 9850";
const SUPPORT_EMAIL = "abbakanocommunicationcenter@gmail.com";
const COMMUNITY_URL = "https://chat.whatsapp.com/DEpJ8XD2yWy1lKyLEHj4Di";

export function SupportBanner() {
  return (
    <section id="support" className="relative border-t border-[var(--border)] py-16 md:py-24 bg-[var(--surface-low)]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-high)] bg-[var(--surface)] p-5 sm:p-10 lg:p-12 shadow-xl">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-8 flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--tertiary)]/20 bg-[var(--tertiary-container)] px-3.5 py-1">
                <span className="h-2 w-2 rounded-full bg-[var(--tertiary)]" />
                <span className="text-xs font-bold text-[var(--tertiary)] uppercase tracking-wider">
                  24/7 Multi-Channel Resolution Desk
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl md:text-4xl">
                Dedicated support specialists, standing by 24/7.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
                If a telecom carrier or disco node experiences unexpected delays, our technical support desk is online 24 hours a day, 7 days a week, 365 days a year to resolve any transaction immediately.
              </p>

              {/* Action Buttons (Full width touch-friendly cards on mobile, neat row on desktop) */}
              <div className="mt-7 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center lg:justify-start gap-3 w-full">
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20with%20my%20account.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-95"
                >
                  <svg className="h-4 w-4 shrink-0 fill-currentColor" viewBox="0 0 24 24">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.187-2.59-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                  </svg>
                  <span>WhatsApp: {SUPPORT_PHONE_DISPLAY}</span>
                </a>

                <a
                  href={`tel:${SUPPORT_PHONE}`}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-5 text-xs sm:text-sm font-bold text-[var(--text)] transition-colors hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95"
                >
                  Direct Call: {SUPPORT_PHONE_DISPLAY}
                </a>

                <a
                  href={COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--border-high)] bg-[var(--surface)] px-4 text-xs sm:text-sm font-bold text-[var(--primary)] transition-colors hover:bg-[var(--surface-high)] active:scale-95"
                >
                  Join VIP Community Channel &rarr;
                </a>
              </div>
            </div>

            {/* Right Card: Official Info Box (Protected against overflow with break-all) */}
            <div className="lg:col-span-4 w-full flex flex-col gap-3 rounded-2xl border border-[var(--border-high)] bg-[var(--surface-low)] p-4 sm:p-5 text-xs text-[var(--text-muted)] overflow-hidden">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-[var(--text)] uppercase tracking-wider text-[11px]">
                  Desk Metrics
                </span>
                <span className="rounded-full bg-[var(--tertiary)]/15 px-2.5 py-0.5 font-bold text-[var(--tertiary)] text-[10px] sm:text-xs">
                  Avg. Response &lt; 2 mins
                </span>
              </div>

              <div className="border-t border-[var(--border)] pt-3 space-y-2.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">Official Email Desk</span>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="font-bold text-[var(--text)] hover:underline break-all text-xs"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </div>

                <div className="flex flex-col pt-1 min-w-0">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">Service Availability</span>
                  <span className="font-bold text-[var(--text)] text-xs">
                    24/7/365 Non-Stop Operations
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
