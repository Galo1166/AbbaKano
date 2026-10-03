"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const excludedPaths = ["/", "/login", "/register", "/forgot-password"];

function isExcludedPath(pathname: string) {
  return excludedPaths.includes(pathname) || pathname.startsWith("/admin");
}

export function AuthPrompt() {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSignedIn(Boolean(data.session));
        setChecked(true);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session));
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (!checked || signedIn || isExcludedPath(pathname)) return null;

  return (
    <div className="auth-prompt" role="status">
      <span className="material-symbols-outlined auth-prompt-icon" aria-hidden="true">lock_open</span>
      <span>Sign in to unlock your AbbaKano account.</span>
      <Link href="/login" className="auth-prompt-link">Sign in</Link>
      <span className="auth-prompt-divider" aria-hidden="true">or</span>
      <Link href="/register" className="auth-prompt-link">Create account</Link>
    </div>
  );
}
