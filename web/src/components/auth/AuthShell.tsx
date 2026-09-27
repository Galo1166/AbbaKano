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
  const lightMode = theme === "light";

  return (
    <main className={`auth-shell${lightMode ? " light" : ""}`}>
      <div className="auth-topbar">
        <Link className="auth-brand" href="/">
          <span className="auth-logo"><Image src="/branding/logo.png" alt="AbbaKano" width={38} height={38} /></span>
          <span>ABBAKANO DATA SUB</span>
        </Link>
        <button className="auth-theme" type="button" onClick={toggleTheme} aria-label={`Switch to ${lightMode ? "dark" : "light"} theme`}>
          <span className={`auth-theme-dot${lightMode ? " light" : ""}`} aria-hidden="true" />
        </button>
      </div>
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="auth-back" href="/">Back to welcome</Link>
        <div className="auth-heading">
          <p className="auth-eyebrow">Secure wallet access</p>
          <h1 id="auth-title">{title}</h1>
          <h2>{subtitle}</h2>
          <p>{description}</p>
        </div>
        {children}
        <div className="auth-footer">{footer}</div>
      </section>
    </main>
  );
}
