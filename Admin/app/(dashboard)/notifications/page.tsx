"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: "critical" | "warning" | "info" | "success";
  time: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<string>("ALL");
  const [items, setItems] = useState<NotificationItem[]>([
    {
      id: 1,
      title: "9mobile Liquidity Buffer Depleted",
      message:
        "9mobile Gateway vault is below ₦100,000 threshold. Refill required to maintain active dispatch queue.",
      type: "critical",
      time: "2 minutes ago",
      read: false,
    },
    {
      id: 2,
      title: "Super Admin Wallet Adjustment",
      message:
        "Abba Kano credited ₦50,000 to customer Usman Garba. Dual-factor authorization logged to audit ledger.",
      type: "warning",
      time: "1 hour ago",
      read: false,
    },
    {
      id: 3,
      title: "Daily Settlement Report Ready",
      message:
        "The daily financial settlement report for today is compiled and ready for review.",
      type: "info",
      time: "3 hours ago",
      read: true,
    },
    {
      id: 4,
      title: "Reseller Network Milestone Reached",
      message:
        "AbbaKano portal has surpassed 14,890 registered reseller accounts. 84 new partners onboarded today.",
      type: "success",
      time: "5 hours ago",
      read: true,
    },
    {
      id: 5,
      title: "MTN Wholesale SME Margin Adjusted",
      message:
        "Wholesale spread for MTN 1GB SME data updated from ₦25 to ₦30 by Finance Officer Amina Yusuf.",
      type: "info",
      time: "8 hours ago",
      read: true,
    },
  ]);

  const typeConfig: Record<
    string,
    { icon: string; bg: string; border: string; text: string; badge: string }
  > = {
    critical: {
      icon: "warning",
      bg: "bg-red-50/70",
      border: "border-red-200",
      text: "text-red-700",
      badge: "Critical Alert",
    },
    warning: {
      icon: "security",
      bg: "bg-amber-50/70",
      border: "border-amber-200",
      text: "text-amber-700",
      badge: "Security Notice",
    },
    info: {
      icon: "info",
      bg: "bg-blue-50/70",
      border: "border-blue-200",
      text: "text-blue-700",
      badge: "System Update",
    },
    success: {
      icon: "check_circle",
      bg: "bg-emerald-50/70",
      border: "border-emerald-200",
      text: "text-emerald-700",
      badge: "Milestone",
    },
  };

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const handleToggleRead = (id: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: !item.read } : item))
    );
  };

  const filtered = items.filter((item) => {
    if (filter === "UNREAD") return !item.read;
    if (filter === "CRITICAL") return item.type === "critical";
    if (filter === "SECURITY") return item.type === "warning";
    return true;
  });

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <PageHeader
        breadcrumbs={["Administration", "System Notifications"]}
        title="Notifications & System Alerts"
        description="Real-time telecommunication pipeline events, balance threshold warnings, and security audits."
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-surface-container-lowest border border-outline-variant/40 hover:bg-surface-container transition-colors shadow-sm cursor-pointer"
                id="btn-mark-all-read"
              >
                Mark all as read
              </button>
            )}
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: "ALL", label: `All Alerts (${items.length})` },
            { key: "UNREAD", label: `Unread (${unreadCount})` },
            { key: "CRITICAL", label: "Critical Warnings" },
            { key: "SECURITY", label: "Security Logs" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === tab.key
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-outline">
          Real-time system updates
        </span>
      </div>

      {/* Notification Cards Stream */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-card">
            <span className="material-symbols-outlined text-outline text-[40px] mb-2">
              notifications_off
            </span>
            <p className="font-semibold text-sm text-on-surface">No alerts in this category</p>
            <p className="text-xs text-outline mt-1">All systems are running normally.</p>
          </div>
        ) : (
          filtered.map((n) => {
            const cfg = typeConfig[n.type];
            return (
              <div
                key={n.id}
                onClick={() => handleToggleRead(n.id)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border shadow-card hover:shadow-card-hover transition-all cursor-pointer ${
                  cfg.bg
                } ${cfg.border} ${n.read ? "opacity-75" : "ring-1 ring-primary/20"}`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white shadow-sm ${cfg.text}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{cfg.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-sm text-on-surface">{n.title}</span>
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-white/80 ${cfg.text}`}
                      >
                        {cfg.badge}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0">
                  <span className="text-xs text-outline font-mono whitespace-nowrap">
                    {n.time}
                  </span>
                  <span className="text-[11px] font-semibold text-primary hover:underline">
                    {n.read ? "Mark unread" : "Mark read"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
