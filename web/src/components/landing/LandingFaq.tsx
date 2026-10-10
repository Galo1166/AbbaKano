"use client";

import { useState } from "react";

const FAQS = [
  {
    question: "Data bundle not received after debit?",
    answer: "Most VTU data deliveries complete within 5 to 30 seconds. If delayed beyond 5 minutes due to telco network congestion, reach out to our 24/7 WhatsApp desk with your Transaction Reference ID for instant escalation.",
  },
  {
    question: "Wallet auto-funding transfer pending?",
    answer: "Transfers to your dedicated Moniepoint, Sterling, or Wema virtual accounts auto-credit instantly. If delayed by interbank switching, copy your bank Session ID and send it to our WhatsApp desk for immediate manual verification.",
  },
  {
    question: "How do I change or reset my Transaction PIN?",
    answer: "You can change your 4-digit PIN directly inside your Profile settings under Security & Preferences. If you forgot your PIN, you can reset it safely through registered email verification or by contacting our resolution desk.",
  },
  {
    question: "What are customer service operating hours?",
    answer: "Our dedicated technical support and dispute resolution desk operates 24 hours a day, 7 days a week, 365 days a year without downtime.",
  },
  {
    question: "How is my account and balance protected?",
    answer: "All transactions require your private 4-digit PIN authorization, protecting your wallet even if your phone is unlocked. Your personal virtual bank accounts are mapped directly to your profile.",
  },
];

export function LandingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="relative border-t border-[var(--border)] py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            Resolution &amp; Inquiries
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-[var(--text-muted)]">
            Direct answers to the most common questions about transactions, wallet auto-credit, and security.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;

            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-[var(--border-high)] bg-[var(--surface)] transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-6 text-left text-base font-bold text-[var(--text)] transition-colors hover:text-[var(--primary)] cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <span className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-high)] text-base font-bold text-[var(--text)]">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border)] px-6 pt-4 pb-6 text-sm leading-relaxed text-[var(--text-muted)] font-normal">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
