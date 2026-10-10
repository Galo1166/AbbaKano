"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SUPPORT_PHONE_DISPLAY = "+234 813 333 9850";
const SUPPORT_EMAIL = "abbakanocommunicationcenter@gmail.com";
const COMMUNITY_URL = "https://chat.whatsapp.com/DEpJ8XD2yWy1lKyLEHj4Di";

export function LandingFooter() {
  const router = useRouter();

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
    <footer className="border-t border-[var(--border-high)] bg-[var(--surface-lowest)] pt-16 pb-12 text-[var(--text-muted)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-high)] bg-[var(--surface)] p-1.5 shadow-sm">
                <Image
                  src="/branding/logo.png"
                  alt="AbbaKano DataSub"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold text-[var(--text)] tracking-tight">
                  AbbaKano DataSub
                </span>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  Kano-built, Nigeria-wide
                </span>
              </div>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-muted)] font-normal">
              Automated telecommunications access, bulk data top-ups, and utility bill settlement engine designed for everyday consumers, enterprises, and agents across Nigeria.
            </p>

            <div className="mt-6 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text)]">Customer Desk:</span>
                <a href="tel:+2348133339850" className="font-semibold hover:text-[var(--primary)] text-[var(--text)]">
                  {SUPPORT_PHONE_DISPLAY}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text)]">Email:</span>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold hover:text-[var(--primary)] text-[var(--text)] break-all min-w-0">
                  {SUPPORT_EMAIL}
                </a>
              </div>
              <span className="text-[var(--text-muted)]">Operations Base: Kano State, Nigeria</span>
            </div>
          </div>

          {/* Col 1: Telecom & Utilities (Protected by Auth Check) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
              Digital Utilities
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="/data"
                  onClick={(e) => handleProtectedNav(e, "/data")}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  Data Subscriptions
                </a>
              </li>
              <li>
                <a
                  href="/airtime"
                  onClick={(e) => handleProtectedNav(e, "/airtime")}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  Airtime Recharge
                </a>
              </li>
              <li>
                <a
                  href="/electricity"
                  onClick={(e) => handleProtectedNav(e, "/electricity")}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  Electricity Tokens
                </a>
              </li>
              <li>
                <a
                  href="/cable-tv"
                  onClick={(e) => handleProtectedNav(e, "/cable-tv")}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  Cable TV Renewals
                </a>
              </li>
              <li>
                <a
                  href="/fund-wallet"
                  onClick={(e) => handleProtectedNav(e, "/fund-wallet")}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  Virtual Account Funding
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Platform & Rewards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
              Platform &amp; Tools
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/register" className="hover:text-[var(--primary)] transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[var(--primary)] transition-colors">
                  Sign In to Wallet
                </Link>
              </li>
              <li>
                <a
                  href="/refer-and-earn"
                  onClick={(e) => handleProtectedNav(e, "/refer-and-earn")}
                  className="hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  Refer &amp; Earn
                </a>
              </li>
              <li>
                <a
                  href={COMMUNITY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--primary)] transition-colors font-semibold text-[var(--primary)]"
                >
                  Join VIP Community
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Security */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
              Security &amp; Legal
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[var(--primary)] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-[var(--primary)] transition-colors">
                  Help &amp; Dispute Desk
                </Link>
              </li>
              <li className="pt-2 text-xs leading-relaxed text-[var(--text-muted)] font-medium">
                Protected by end-to-end 256-bit encryption. Automated banking engine by Monnify and Paystack.
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-8 text-xs text-[var(--text-muted)] sm:flex-row">
          <span className="font-medium">&copy; 2026 AbbaKano DataSub. All rights reserved.</span>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/privacy" className="hover:text-[var(--primary)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--primary)] transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-[var(--primary)] transition-colors">Resolution Desk</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
