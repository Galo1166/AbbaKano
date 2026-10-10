"use client";

import { PublicDocLayout } from "@/components/navigation/PublicDocLayout";

const faqs = [
  {
    question: "Data bundle not received after debit?",
    answer:
      "Most VTU data deliveries complete within 5 to 30 seconds. If delayed beyond 5 minutes due to telco network congestion, contact our WhatsApp desk with your Transaction Reference ID for instant resolution.",
  },
  {
    question: "Wallet auto-funding transfer pending?",
    answer:
      "Transfers to your dedicated Wema or Moniepoint virtual accounts auto-credit instantly. If delayed, please verify the bank transaction status and send the Session ID to our WhatsApp desk.",
  },
  {
    question: "How do I change my Transaction PIN?",
    answer:
      "Go to the Profile tab -> Security & Preferences -> Change Transaction PIN. If you forgot your current PIN, click Forgot PIN or contact support.",
  },
  {
    question: "What are the customer service operating hours?",
    answer:
      "Our dedicated customer support and automated resolution desk operates 24 hours a day, 7 days a week, 365 days a year without downtime.",
  },
];

const supportChannels = [
  {
    title: "Official WhatsApp Support",
    value: "+234 813 333 9850",
    detail: "Fastest response time (< 2 mins)",
    href: "https://wa.me/2348133339850?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20with%20my%20account.",
    action: "Chat on WhatsApp",
    badge: "Recommended",
  },
  {
    title: "Direct Telephone Line",
    value: "+234 813 333 9850",
    detail: "Direct Phone Call to Kano Desk",
    href: "tel:+2348133339850",
    action: "Place Call",
  },
  {
    title: "Official Support Email",
    value: "abbakanocommunicationcenter@gmail.com",
    detail: "Disputes, receipts & compliance",
    href: "mailto:abbakanocommunicationcenter@gmail.com?subject=AbbaKano%20Support%20Request",
    action: "Send Email",
  },
  {
    title: "VIP WhatsApp Community",
    value: "Join 10,000+ Members",
    detail: "Network status & instant updates",
    href: "https://chat.whatsapp.com/DEpJ8XD2yWy1lKyLEHj4Di",
    action: "Join Channel",
  },
];

export default function SupportPage() {
  return (
    <PublicDocLayout
      eyebrow="24/7 Resolution Desk"
      title="Customer Support & Help Desk"
      subtitle="Kano-based human support standing by 24/7/365 to resolve transactions, top-ups, and inquiries."
      lastUpdated="October 2026"
    >
      {/* Support Channels Grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text)]">Official Support Channels</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {supportChannels.map((channel) => (
            <div
              key={channel.title}
              className="rounded-2xl border border-[var(--border-high)] bg-[var(--surface-high)] p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {channel.title}
                  </span>
                  {channel.badge && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      {channel.badge}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm sm:text-base font-extrabold text-[var(--text)] break-all min-w-0">
                  {channel.value}
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {channel.detail}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <a
                  href={channel.href}
                  target={channel.href.startsWith("http") ? "_blank" : undefined}
                  rel={channel.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  <span>{channel.action}</span>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Operational Headquarters */}
      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Physical Operations Base</h2>
        <div className="rounded-2xl border border-[var(--border-high)] bg-[var(--surface-high)] p-5">
          <p className="text-sm font-semibold text-[var(--text)]">
            AbbaKano DataSub Operations Center
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Kano State, Nigeria • Operating 24 Hours Daily, 7 Days a Week, 365 Days a Year
          </p>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-low)] p-4 transition-colors open:bg-[var(--surface-high)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-[var(--text)]">
                <span>{faq.question}</span>
                <svg className="h-4 w-4 text-[var(--text-muted)] transition-transform group-open:rotate-180 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <p className="mt-3 text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </PublicDocLayout>
  );
}
