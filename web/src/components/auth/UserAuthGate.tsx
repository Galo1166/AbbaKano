"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/support",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/admin")) return true; // Handled by AdminAuthGate
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/branding") || pathname.startsWith("/providers") || pathname.startsWith("/illustrations")) return true;
  return false;
}

export function UserAuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">("checking");

  const publicRoute = isPublicPath(pathname);

  useEffect(() => {
    let cancelled = false;

    async function evaluateAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        if (session) {
          setAuthState("authenticated");
          // If already authenticated and on login/register, optionally redirect to dashboard
          if (pathname === "/login" || pathname === "/register") {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get("redirect") || "/app";
            router.replace(redirect);
          }
        } else {
          setAuthState("unauthenticated");
          // If route is protected and user is not authenticated, redirect immediately
          if (!publicRoute) {
            const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
            router.replace(redirectUrl);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setAuthState("unauthenticated");
        if (!publicRoute) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    }

    void evaluateAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        setAuthState("authenticated");
      } else {
        setAuthState("unauthenticated");
        if (!isPublicPath(window.location.pathname)) {
          router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname, publicRoute, router]);

  // If this is a public route (landing page, login, register, docs, support), render immediately
  if (publicRoute) {
    return <>{children}</>;
  }

  // If checking or unauthenticated on a protected route, NEVER render the dashboard/children
  if (authState !== "authenticated") {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative flex items-center justify-center mb-4">
          <div className="h-12 w-12 rounded-2xl border border-[var(--border-high)] bg-[var(--surface)] p-2 shadow-sm animate-pulse flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          </div>
        </div>
        <p className="text-sm font-semibold text-[var(--text)]">Verifying authorization...</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Securing your session with AbbaKano DataSub</p>
      </div>
    );
  }

  // Authorized user accessing protected route
  return <>{children}</>;
}
