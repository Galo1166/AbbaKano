"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@admin/lib/utils";
import { useSidebar } from "@admin/context/SidebarContext";
import { logoutAdmin } from "@admin/services/api";

const operationsNav = [
  { label: "Overview", href: "/admin/overview", icon: "grid_view" },
  { label: "Users", href: "/admin/users", icon: "group" },
  { label: "Deposits", href: "/admin/deposits", icon: "payments" },
  { label: "Transactions", href: "/admin/transactions", icon: "receipt_long" },
  { label: "VTU Services", href: "/admin/vtu-services", icon: "cell_tower" },
  { label: "Provider Balances", href: "/admin/provider-balances", icon: "account_balance_wallet" },
];

const administrationNav = [
  { label: "Support Cases", href: "/admin/support", icon: "headset_mic" },
  { label: "Notifications", href: "/admin/notifications", icon: "campaign", badge: "3" },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: "history" },
  { label: "Settings", href: "/admin/settings", icon: "tune" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, close } = useSidebar();

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } catch {
      // Ignore logout failures and continue to the sign-in screen.
    }

    router.push("/admin/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const NavLink = ({
    label,
    href,
    icon,
    badge,
  }: {
    label: string;
    href: string;
    icon: string;
    badge?: string;
  }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={close}
        className={cn(
          "group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-150 font-medium select-none cursor-pointer",
          active
            ? "bg-primary text-on-primary font-semibold shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "material-symbols-outlined text-[20px]",
              active ? "text-on-primary" : "text-slate-400 group-hover:text-primary"
            )}
          >
            {icon}
          </span>
          <span className="truncate">{label}</span>
        </div>
        {badge && (
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0",
              active
                ? "bg-white/20 text-white"
                : "bg-rose-100 text-rose-700"
            )}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 lg:hidden cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-sm flex flex-col justify-between select-none transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
            <Link
              href="/admin/overview"
              className="flex items-center gap-3 group cursor-pointer"
              title="AbbaKano Admin Portal"
            >
              <div className="w-8 h-8 rounded-lg bg-primary p-1 flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src="/branding/logo.png"
                  alt="AbbaKano Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-slate-900 text-sm leading-tight tracking-tight">
                  AbbaKano
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Admin Panel
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={close}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden cursor-pointer transition-colors"
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
            {/* Operations Group */}
            <div>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Operations
              </p>
              <div className="space-y-0.5">
                {operationsNav.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            </div>

            {/* Administration Group */}
            <div>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Management
              </p>
              <div className="space-y-0.5">
                {administrationNav.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </div>
            </div>
          </nav>
        </div>

        {/* Footer: Admin Profile & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
              AK
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                Abba Kano
              </span>
              <span className="text-[10px] text-slate-500 font-medium truncate">
                Super Admin
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              aria-label="Sign out of the admin portal"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
