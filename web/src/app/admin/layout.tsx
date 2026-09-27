import AdminAuthGate from "./AdminAuthGate";
import type { Metadata } from "next";
import "../admin-globals.css";

export const metadata: Metadata = {
  title: "Console | AbbaKano Admin Portal",
  description: "AbbaKano Core telecom and reseller operations management platform.",
  robots: "noindex, nofollow",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthGate>{children}</AdminAuthGate>;
}
