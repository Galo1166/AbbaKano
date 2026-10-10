"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { useThemeMode } from "@/lib/theme";

interface UserProfile {
  full_name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  biometrics_enabled?: boolean;
  app_lock_enabled?: boolean;
  has_transaction_pin?: boolean;
  has_passkey?: boolean;
}

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function ProfileShell({ initialUser }: { initialUser?: UserProfile }) {
  const router = useRouter();
  const { theme, themePreference, setThemePreference } = useThemeMode();
  const isDark = theme === "dark";

  const [user, setUser] = useState<UserProfile>(initialUser || {});
  const [balance, setBalance] = useState<number>(0);
  const [biometrics, setBiometrics] = useState(false);
  const [appLock, setAppLock] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Modals
  const [showPinModal, setShowPinModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  function goHome() {
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "home" }));
    } else {
      router.push("/app");
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        const [profileRes, walletRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle(),
          supabase.from("wallets").select("balance_kobo").eq("user_id", authUser.id).maybeSingle(),
        ]);

        const profileData: any = profileRes.data || {};
        const walletData: any = walletRes.data || {};

        setUser({
          full_name: profileData.full_name || authUser.user_metadata?.full_name || "Tester User",
          email: authUser.email || "tester@example.com",
          phone: profileData.phone || authUser.phone || "+234 800 000 0000",
          role: profileData.role || "Customer",
        });

        setBalance(Number(walletData.balance_kobo || 0) / 100);
        setBiometrics(Boolean(profileData.biometrics_enabled));
        setAppLock(Boolean(profileData.app_lock_enabled));
        setHasPin(Boolean(profileData.has_transaction_pin || profileData.has_pin));
      } catch (err) {
        console.error("Profile load error:", err);
      }
    }

    void loadData();
  }, []);

  async function handleToggleBiometrics() {
    const next = !biometrics;
    setBiometrics(next);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase.from("profiles").update({ biometrics_enabled: next }).eq("id", authUser.id);
      }
    } catch (err) {
      console.error("Failed to update biometrics:", err);
    }
  }

  async function handleToggleAppLock() {
    const next = !appLock;
    setAppLock(next);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase.from("profiles").update({ app_lock_enabled: next }).eq("id", authUser.id);
      }
    } catch (err) {
      console.error("Failed to update app lock:", err);
    }
  }

  async function handleSavePin(e: FormEvent) {
    e.preventDefault();
    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setPinMessage("PIN must be 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage("PINs do not match.");
      return;
    }

    setSavingPin(true);
    setPinMessage("");

    try {
      const { error } = await supabase.functions.invoke("set-user-pin", {
        body: { pin: newPin },
      });
      if (error) throw error;

      setHasPin(true);
      setShowPinModal(false);
      setNewPin("");
      setConfirmPin("");
    } catch (err: any) {
      setPinMessage(err?.message || "Could not save PIN. Please try again.");
    } finally {
      setSavingPin(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setSigningOut(false);
    }
  }

  const displayName = user.full_name || user.fullName || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <main className={`min-h-screen transition-colors duration-200 antialiased pb-32 ${
      isDark ? "bg-[#0b0e14] text-white" : "bg-[#f8fafc] text-slate-900"
    }`}>
      <WebDesktopSidebar active="profile" />

      <div className="mx-auto w-full max-w-md px-4 pt-3 space-y-4">
        {/* Header Bar matching mobile ScreenHeader */}
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={goHome}
            aria-label="Back to dashboard"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer ${
              isDark
                ? "bg-[#141721] border-[#222634] text-slate-300 hover:text-white"
                : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs"
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className={`text-xl font-extrabold tracking-tight truncate ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              Profile
            </h1>
            <p className={`text-xs font-semibold truncate ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}>
              Account &amp; Security Settings
            </p>
          </div>
        </header>

        {/* PROFILE HERO CARD matching mobile layout */}
        <div className={`rounded-2xl border p-4 transition-all shadow-xs ${
          isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200"
        }`}>
          {/* Top Row: Avatar + Name + Contact */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="relative">
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-extrabold text-lg shadow-sm">
                {initials}
              </div>
              <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 ${
                isDark ? "border-[#141721]" : "border-white"
              }`} />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className={`text-base font-extrabold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                {displayName}
              </h2>
              <p className={`text-xs truncate mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {user.phone} • {user.email}
              </p>
            </div>
          </div>

          {/* Inner Balance Sub-Box */}
          <div className={`rounded-xl border p-3 flex items-center justify-between gap-3 ${
            isDark ? "bg-[#0b0e14] border-[#1e2330]" : "bg-slate-50 border-slate-200"
          }`}>
            <div className="min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}>
                Master Wallet Balance
              </span>
              <span className={`text-lg font-black font-mono tracking-tight block ${
                isDark ? "text-white" : "text-slate-900"
              }`}>
                ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "funding" }));
              }}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>+ Fund Account</span>
            </button>
          </div>
        </div>

        {/* Section 1: Referral & Rewards */}
        <section className="space-y-1.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider pl-1 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            Referral &amp; Rewards
          </span>
          <div className={`rounded-2xl border overflow-hidden shadow-xs ${
            isDark ? "bg-[#141721] border-[#222634]" : "bg-white border-slate-200"
          }`}>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "referral" }));
              }}
              className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Refer &amp; Earn
                  </p>
                  <p className={`truncate text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Earn ₦100 for each friend's first data top-up
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-purple-500/10 px-2 py-0.5 text-[9px] font-extrabold text-purple-500 border border-purple-500/20">
                ₦100 BONUS
              </span>
            </button>
          </div>
        </section>

        {/* Section 2: Security & Preferences */}
        <section className="space-y-1.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider pl-1 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            Security &amp; Preferences
          </span>
          <div className={`rounded-2xl border overflow-hidden shadow-xs divide-y ${
            isDark ? "bg-[#141721] border-[#222634] divide-[#1e2330]" : "bg-white border-slate-200 divide-slate-100"
          }`}>
            {/* PIN */}
            <button
              type="button"
              onClick={() => {
                setShowPinModal(true);
                setPinMessage("");
              }}
              className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {hasPin ? "Change Transaction PIN" : "Set Transaction PIN"}
                  </p>
                  <p className={`truncate text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {hasPin ? "4-digit wallet security PIN" : "Create 4-digit security PIN"}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold border ${
                hasPin
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}>
                {hasPin ? "ACTIVE" : "ACTION REQUIRED"}
              </span>
            </button>

            {/* Biometrics */}
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11m0 0a8 8 0 008 8m0 0v1" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Biometrics Login
                  </p>
                  <p className={`truncate text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Passkey / Face ID / Fingerprint
                  </p>
                </div>
              </div>
              <Toggle enabled={biometrics} onChange={() => void handleToggleBiometrics()} />
            </div>

            {/* App Lock */}
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    App Lock PIN
                  </p>
                  <p className={`truncate text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Screen lock security timeout
                  </p>
                </div>
              </div>
              <Toggle enabled={appLock} onChange={() => void handleToggleAppLock()} />
            </div>

            {/* Theme & Appearance */}
            <button
              type="button"
              onClick={() => setShowThemeModal(true)}
              className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Theme &amp; Appearance
                  </p>
                  <p className={`truncate text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    {themePreference === "system" ? "Auto (System Theme)" : themePreference === "dark" ? "Dark Mode" : "Light Mode"}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-500 border border-indigo-500/20">
                {themePreference.toUpperCase()}
              </span>
            </button>
          </div>
        </section>

        {/* Section 3: Help & Support */}
        <section className="space-y-1.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider pl-1 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            Help &amp; Support
          </span>
          <div className={`rounded-2xl border overflow-hidden shadow-xs divide-y ${
            isDark ? "bg-[#141721] border-[#222634] divide-[#1e2330]" : "bg-white border-slate-200 divide-slate-100"
          }`}>
            <Link
              href="/support"
              className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Contact Support
                  </p>
                  <p className={`truncate text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    24/7 WhatsApp &amp; Resolution Desk
                  </p>
                </div>
              </div>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/privacy"
              className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Privacy Policy
                  </p>
                  <p className={`truncate text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    How your data is protected
                  </p>
                </div>
              </div>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/terms"
              className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-xs sm:text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Terms and Conditions
                  </p>
                  <p className={`truncate text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Platform terms of service
                  </p>
                </div>
              </div>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Section 4: Account Actions */}
        <section className="space-y-1.5 pt-1">
          <span className={`text-[11px] font-bold uppercase tracking-wider pl-1 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            Account Actions
          </span>
          <div className={`rounded-2xl border overflow-hidden shadow-xs divide-y ${
            isDark ? "bg-[#141721] border-[#222634] divide-[#1e2330]" : "bg-white border-slate-200 divide-slate-100"
          }`}>
            <button
              type="button"
              onClick={() => setShowSignOutModal(true)}
              className="w-full flex items-center justify-between p-3.5 text-left transition hover:bg-rose-500/10 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs sm:text-sm font-bold text-rose-500">Sign Out</p>
                  <p className={`truncate text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Exit your wallet session safely
                  </p>
                </div>
              </div>
              <svg className="h-4 w-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </section>
      </div>

      {/* Set / Change PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl border p-5 shadow-xl transition-colors ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                {hasPin ? "Change Security PIN" : "Set Security PIN"}
              </h3>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3.5">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className={`w-full text-center tracking-[8px] font-mono text-xl font-bold py-2.5 rounded-xl border outline-none ${
                    isDark
                      ? "bg-[#0b0e14] border-[#222634] text-white focus:border-blue-500"
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}>
                  Confirm 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className={`w-full text-center tracking-[8px] font-mono text-xl font-bold py-2.5 rounded-xl border outline-none ${
                    isDark
                      ? "bg-[#0b0e14] border-[#222634] text-white focus:border-blue-500"
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600"
                  }`}
                />
              </div>

              {pinMessage && (
                <p className="text-center text-xs font-semibold text-rose-500">
                  {pinMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={savingPin || newPin.length !== 4 || confirmPin.length !== 4}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {savingPin ? "Saving PIN..." : "Save Security PIN"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Theme Switcher Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl border p-5 shadow-xl transition-colors ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
                Theme &amp; Appearance
              </h3>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {[
                { id: "system", label: "Auto (System)", desc: "Syncs with your device theme" },
                { id: "dark", label: "Obsidian Dark", desc: "Deep dark mode for low-light" },
                { id: "light", label: "High-Contrast Light", desc: "Crisp slate white daylight mode" },
              ].map((opt) => {
                const isSelected = themePreference === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setThemePreference(opt.id as any);
                      setShowThemeModal(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl p-3 border text-left transition cursor-pointer ${
                      isSelected
                        ? "border-blue-500 bg-blue-500/10 text-blue-500"
                        : isDark
                        ? "bg-[#181B25] border-[#222634] text-slate-200 hover:bg-[#1e2330]"
                        : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-bold">{opt.label}</p>
                      <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{opt.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                        <svg className="h-3 w-3 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-sm rounded-3xl border p-5 text-center shadow-2xl transition-colors ${
            isDark ? "bg-[#141721] border-[#222634] text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>

            <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-slate-900"}`}>
              Sign Out of AbbaKano?
            </h3>
            <p className={`mt-1 text-xs leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Are you sure you want to exit your wallet session? You will need to sign in again to access services.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className={`h-11 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
                  isDark
                    ? "bg-[#181B25] border-[#222634] text-slate-300 hover:bg-[#1e2330]"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {signingOut ? "Signing Out..." : "Yes, Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Nav */}
      <WebBottomNav active="profile" />
    </main>
  );
}
