"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const tabs = [
  ["home", "Home", "/app"],
  ["data", "Buy Data", "/data"],
  ["history", "History", "/history"],
  ["profile", "Profile", "/profile"],
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6",
    spark: "m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z",
    history: "M4 6h16M4 12h16M4 18h10",
    profile: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    wallet: "M3 7h18v13H3zM3 7l2-4h14l2 4M16 13h5",
    headset: "M3 13a9 9 0 0 1 18 0v4a3 3 0 0 1-3 3h-2v-7h4v-1a8 8 0 0 0-16 0v1h4v7H6a3 3 0 0 1-3-3v-4Z",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.home} />
    </svg>
  );
}

export function WebDesktopSidebar({
  active = "home",
  onNavigate,
  onLogout,
}: {
  active?: "home" | "data" | "history" | "profile";
  onNavigate?: (tab: "home" | "data" | "history" | "profile") => void;
  onLogout?: () => void;
}) {
  const router = useRouter();

  const handleNavigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
    tab: "home" | "data" | "history" | "profile"
  ) => {
    if (onNavigate) {
      event.preventDefault();
      onNavigate(tab);
      return;
    }
    event.preventDefault();
    router.push(href);
  };

  const handleFundWallet = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "funding" }));
      return;
    }
    router.push("/fund-wallet");
  };

  return (
    <aside className="web-desktop-sidebar fixed top-0 bottom-0 left-0 z-20 hidden lg:flex w-64 flex-col justify-between border-r border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] transition-colors duration-200">
      {/* Top Branding & Main Navigation */}
      <div>
        <Link className="flex items-center gap-3 transition-opacity hover:opacity-90" href="/app">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] p-1.5 shadow-xs">
            <Image
              src="/branding/logo.png"
              alt="AbbaKano DataSub"
              width={34}
              height={34}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-extrabold tracking-tight text-[var(--text)] truncate">
              AbbaKano DataSub
            </span>
            <span className="text-[10px] font-semibold text-[var(--primary)] uppercase tracking-wider">
              VTU Infrastructure
            </span>
          </div>
        </Link>

        {/* Quick Fund CTA */}
        <div className="mt-6">
          <Link
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[var(--primary-container)] active:scale-95 cursor-pointer whitespace-nowrap"
            href="/fund-wallet"
            onClick={handleFundWallet}
          >
            <Icon name="wallet" />
            <span>+ Fund Wallet</span>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-6 flex flex-col gap-1.5" aria-label="Desktop navigation">
          {tabs.map(([icon, label, href]) => {
            const tab = icon === "data" ? "data" : icon;
            const isActive = active === tab;
            return (
              <Link
                key={label}
                href={href}
                onClick={(event) => handleNavigate(event, href, tab)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[var(--primary)]/12 text-[var(--primary)] font-extrabold shadow-2xs"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-high)] hover:text-[var(--text)]"
                }`}
              >
                <Icon name={icon === "data" ? "spark" : icon} />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Support & Sign Out */}
      <div className="flex flex-col gap-2 pt-4 border-t border-[var(--border)]">
        <Link
          href="/support"
          onClick={(event) => {
            event.preventDefault();
            router.push("/support");
          }}
          className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-high)] hover:text-[var(--text)]"
        >
          <Icon name="headset" />
          <span>24/7 Resolution Desk</span>
        </Link>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-500/10 cursor-pointer text-left"
          >
            <Icon name="logout" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
