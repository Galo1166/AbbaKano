"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useThemeMode } from "@/lib/theme";

export function WebBottomNav({
  active = "home",
  onNavigate,
}: {
  active?: "home" | "data" | "history" | "profile";
  onNavigate?: (tab: "home" | "data" | "history" | "profile") => void;
}) {
  const pathname = usePathname();
  const workspace = pathname === "/app";
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  function handleTab(tab: "home" | "data" | "history" | "profile") {
    if (onNavigate) {
      onNavigate(tab);
    } else {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: tab }));
    }
  }

  const isHome = active === "home";
  const isData = active === "data";
  const isHistory = active === "history";
  const isProfile = active === "profile";

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-30 h-16 sm:h-18 border-t flex items-center justify-around px-4 transition-colors ${
        isDark
          ? "bg-[#0b0e14]/95 border-[#1a1e2a] backdrop-blur-lg"
          : "bg-white/95 border-slate-200 backdrop-blur-lg shadow-[0_-4px_16px_rgba(0,0,0,0.03)]"
      }`}
      aria-label="Mobile Navigation"
    >
      {/* 1. Home Tab */}
      <button
        type="button"
        onClick={() => handleTab("home")}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
          isHome ? "text-blue-500" : isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <svg className="h-5 w-5" fill={isHome ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-[10px] font-bold">Home</span>
      </button>

      {/* 2. Elevated Floating Center FAB: Buy Data */}
      <button
        type="button"
        onClick={() => handleTab("data")}
        className="flex flex-col items-center justify-center -mt-6 flex-1 py-1 transition-transform active:scale-95 cursor-pointer"
        aria-label="Buy Data"
      >
        <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-lg shadow-blue-600/40 border-4 ${
          isDark ? "border-[#0b0e14]" : "border-white"
        }`}>
          <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.9 17.55 11 21 11 21z" />
          </svg>
        </div>
        <span className={`text-[10px] font-bold mt-1 ${isData ? "text-blue-500" : isDark ? "text-slate-400" : "text-slate-600"}`}>
          Buy Data
        </span>
      </button>

      {/* 3. History Tab */}
      <button
        type="button"
        onClick={() => handleTab("history")}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
          isHistory ? "text-blue-500" : isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <span className="text-[10px] font-bold">History</span>
      </button>

      {/* 4. Profile Tab */}
      <button
        type="button"
        onClick={() => handleTab("profile")}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
          isProfile ? "text-blue-500" : isDark ? "text-slate-500 hover:text-slate-300" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <svg className="h-5 w-5" fill={isProfile ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-[10px] font-bold">Profile</span>
      </button>
    </nav>
  );
}
