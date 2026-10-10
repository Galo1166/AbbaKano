import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { UserAuthGate } from "@/components/auth/UserAuthGate";
import { GlobalToast } from "@/components/common/GlobalToast";

export const metadata: Metadata = {
  title: "AbbaKano DataSub",
  description: "One wallet for airtime, data, and every bill you owe.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark" data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('abbakano-theme');
                  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
                  const preference = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
                  const mode = preference === 'system' ? (prefersLight ? 'light' : 'dark') : preference;
                  document.documentElement.setAttribute('data-theme', mode);
                  document.documentElement.style.colorScheme = mode;
                  if (mode === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch (error) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body>
        <GlobalToast />
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <UserAuthGate>
          {children}
        </UserAuthGate>
      </body>
    </html>
  );
}
