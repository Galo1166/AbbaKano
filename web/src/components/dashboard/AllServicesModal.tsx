"use client";

import React from "react";
import Image from "next/image";
import { useThemeMode } from "@/lib/theme";

interface AllServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

export function AllServicesModal({ isOpen, onClose, onSelectTab }: AllServicesModalProps) {
  const { theme } = useThemeMode();
  const isDark = theme === "dark";

  if (!isOpen) return null;

  const handleSelect = (tab: string) => {
    onClose();
    onSelectTab(tab);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 transition-all ${
          isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">All Hub Services</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Browse telecommunications, utilities, and official examination e-PINs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Section: Telecommunications */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Telecommunications
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSelect("bolt")}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-left transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.343 9.343c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <div>
                <span className="block text-xs font-bold">Data Bundles</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">SME, Gifting & Corp</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelect("airtime")}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-left transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <span className="block text-xs font-bold">Airtime Top-Up</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">Instant recharge</span>
              </div>
            </button>
          </div>
        </div>

        {/* Section: Bills & Utilities */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Bills & Utilities
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSelect("power")}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-left transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="7" strokeWidth="2" />
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 10V7l-3 4h2v3l3-4h-2z" />
                </svg>
              </div>
              <div>
                <span className="block text-xs font-bold">Electricity Bills</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">Prepaid meter tokens</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelect("tv")}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 text-left transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="3" y="7" width="18" height="13" rx="2" strokeWidth="2" />
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 3l-4 4-4-4" />
                </svg>
              </div>
              <div>
                <span className="block text-xs font-bold">Cable TV</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">DSTV, GOTV & StarTimes</span>
              </div>
            </button>
          </div>
        </div>

        {/* Section: Education e-PINs */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
            Education Examination e-PINs
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelect("education")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 text-center transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-white p-1 border border-slate-200 flex items-center justify-center">
                <Image src="/images/education/waec-logo.png" alt="WAEC" width={36} height={36} className="object-contain" />
              </div>
              <div>
                <span className="block text-xs font-bold">WAEC</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">Result Checker</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelect("education")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 text-center transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-white p-1 border border-slate-200 flex items-center justify-center">
                <Image src="/images/education/jamb-logo.jpg" alt="JAMB" width={36} height={36} className="object-contain" />
              </div>
              <div>
                <span className="block text-xs font-bold">JAMB</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">UTME / DE Pin</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelect("education")}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 text-center transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-white p-1 border border-slate-200 flex items-center justify-center">
                <Image src="/images/education/neco-logo.jpg" alt="NECO" width={36} height={36} className="object-contain" />
              </div>
              <div>
                <span className="block text-xs font-bold">NECO</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">Result Token</span>
              </div>
            </button>
          </div>
        </div>

        {/* Section: Wallet & Growth */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Wallet & Earnings
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSelect("funding")}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <span className="block text-xs font-bold">Fund Wallet</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">Dynamic virtual accounts</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelect("referral")}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <div>
                <span className="block text-xs font-bold">Refer & Earn</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">Earn referral commission</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
