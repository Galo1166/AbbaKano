import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s | AbbaKano Admin Console", default: "AbbaKano Admin Console v2.4" },
  description: "Institutional telecom VTU and reseller administrative portal for AbbaKano operations.",
  icons: {
    icon: [
      { url: "/branding/logo.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/branding/logo.png",
    apple: "/branding/logo.png",
  },
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/branding/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/branding/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
