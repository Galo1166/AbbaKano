"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useState } from "react";

const breadcrumbMap: Record<string, string[]> = {
  "/overview": ["Operations", "Overview"],
  "/users": ["Operations", "Resellers"],
  "/deposits": ["Operations", "Bank Deposits"],
  "/transactions": ["Operations", "Transactions"],
  "/vtu-services": ["Operations", "VTU Services"],
  "/provider-balances": ["Operations", "Provider Balances"],
  "/support": ["Management", "Support Cases"],
  "/notifications": ["Management", "Notifications"],
  "/audit-logs": ["Management", "Audit Logs"],
  "/settings": ["Management", "Settings"],
};

export default function TopNav() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);

  const crumbs = breadcrumbMap[pathname] ?? ["Admin", "Console"];

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 z-30 flex items-center justify-between px-4 sm:px-6 transition-all duration-200">
      {/* Left: Mobile Hamburger + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggle}
          className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
          aria-label="Open navigation menu"
          id="btn-mobile-sidebar-toggle"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0">
          {crumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <span className="material-symbols-outlined text-slate-300 text-[14px] select-none shrink-0">
                  chevron_right
                </span>
              )}
              <span
                className={
                  i === crumbs.length - 1
                    ? "text-sm sm:text-base font-semibold text-slate-900 truncate"
                    : "text-xs sm:text-sm text-slate-500 hidden sm:inline-block font-normal truncate"
                }
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-sm mx-4 hidden md:block">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search users, transactions, references..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
      </div>

      {/* Right: Actions & Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Search Icon Toggle */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Toggle search"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>

        {/* Notifications Icon Button */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="View notifications"
          id="btn-topnav-notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </Link>

        {/* Profile Avatar */}
        <Link
          href="/settings"
          className="flex items-center gap-2.5 pl-2 border-l border-slate-200 cursor-pointer group"
          title="Account Settings"
        >
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            AK
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight group-hover:text-primary transition-colors">
              Abba Kano
            </span>
            <span className="text-[10px] text-slate-400">Admin</span>
          </div>
        </Link>
      </div>

      {/* Collapsible Mobile Search Overlay */}
      {searchOpen && (
        <div className="absolute top-full left-0 right-0 p-3 bg-white border-b border-slate-200 shadow-md md:hidden animate-slide-up">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              autoFocus
              placeholder="Search users, transactions, references..."
              className="w-full h-10 pl-9 pr-10 bg-slate-50 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:border-primary outline-none"
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute right-2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
