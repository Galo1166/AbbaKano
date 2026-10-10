"use client";

import Link from "next/link";

const SERVICES = [
  {
    title: "Data Subscriptions",
    tagline: "SME & Corporate Direct Top-Ups",
    description: "Reliable, high-speed data allocation for MTN, Airtel, Glo, and 9mobile. Immediate gateway dispatch with 30-day validity periods.",
    accent: "var(--primary)",
    link: "/data",
    features: ["MTN, Airtel, Glo & 9mobile", "SME, Gifting & Corporate Data", "Automatic Network Prefix Detection"],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a10 10 0 0114.142 0M1.343 6.343a15 15 0 0121.314 0" />
      </svg>
    ),
  },
  {
    title: "Airtime Recharge",
    tagline: "Instant Balance Top-Up",
    description: "Recharge any mobile line across Nigeria within seconds. Settle your telecom airtime balance without service fees or delays.",
    accent: "#10B981",
    link: "/airtime",
    features: ["Direct Telecom Node Dispatch", "Recharge Any Nigerian Number", "Instant Printable Transaction Receipts"],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    title: "Electricity Tokens",
    tagline: "Prepaid Meter & Postpaid Bills",
    description: "Generate 20-digit prepaid meter recharge tokens immediately. Real-time customer name validation ensures your account is verified before payment.",
    accent: "#F59E0B",
    link: "/electricity",
    features: ["AEDC, EKEDC, IKEDC, KEDCO, JED, PHED", "Instant Customer Name Verification", "One-Tap Token Copy on Digital Receipt"],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Cable TV Renewals",
    tagline: "Direct Decoder Reactivation",
    description: "Renew DStv, GOtv, and StarTimes bouquets with automatic smartcard validation and immediate signal restoration without visiting physical outlets.",
    accent: "#A855F7",
    link: "/cable-tv",
    features: ["DStv, GOtv & StarTimes Supported", "All Bouquets & Package Tiers", "Automated Decoder Signal Reconnection"],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export function ServicesGrid() {
  return (
    <section id="services" className="relative border-t border-[var(--border)] py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            Core Service Offerings
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text)] sm:text-4xl">
            Everything your wallet needs, on one screen.
          </h2>
          <p className="mt-3 text-base text-[var(--text-muted)] leading-relaxed">
            Consolidate your routine subscriptions. Top up data, recharge airtime, purchase electricity tokens, and renew decoder packages from one unified balance.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, idx) => (
            <div
              key={idx}
              className="group relative flex flex-col justify-between rounded-3xl border border-[var(--border-high)] bg-[var(--surface)] p-7 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-xl"
            >
              <div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${s.accent}15`, color: s.accent }}
                >
                  {s.icon}
                </div>

                <h3 className="mt-6 text-xl font-extrabold text-[var(--text)]">
                  {s.title}
                </h3>
                <p className="mt-1 text-xs font-bold text-[var(--primary)]">
                  {s.tagline}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                  {s.description}
                </p>

                <ul className="mt-6 space-y-2.5 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-muted)] font-medium">
                  {s.features.map((f, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5">
                      <svg className="h-4 w-4 shrink-0 text-[var(--tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <Link
                  href={s.link}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text)] transition-colors group-hover:text-[var(--primary)]"
                >
                  <span>Access {s.title}</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
