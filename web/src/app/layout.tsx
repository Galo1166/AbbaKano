import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { UserAuthGate } from "@/components/auth/UserAuthGate";
import { GlobalToast } from "@/components/common/GlobalToast";

export const metadata: Metadata = {
  title: "AbbaKano DataSub",
  description: "One wallet for airtime, data, and every bill you owe.",
  manifest: "/manifest.webmanifest",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AbbaKano",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
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
              {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('AbbaKano PWA ServiceWorker registered: ', registration.scope);
                    },
                    function(err) {
                      console.log('AbbaKano PWA ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="manifest" href="/manifest.webmanifest" />
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
