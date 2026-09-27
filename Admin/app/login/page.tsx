"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@abbakano.ng");
  const [password, setPassword] = useState("Admin@AbbaKano2026!");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side input validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid administrator email address.");
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    // Simulate backend verification
    setTimeout(() => {
      // In production, this matches backend JWT authentication
      if (email.toLowerCase().trim() === "admin@abbakano.ng" && password.length >= 8) {
        // Store session flag (safe, non-sensitive)
        if (typeof window !== "undefined") {
          sessionStorage.setItem("abbakano_auth_role", "SUPER_ADMIN");
          sessionStorage.setItem("abbakano_auth_user", "Abba Kano");
        }
        router.push("/overview");
      } else {
        setIsLoading(false);
        // Generic security error to prevent account enumeration
        setErrorMessage("Invalid administrator credentials or unauthorized workstation.");
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative selection:bg-amber-500 selection:text-slate-950">
      {/* ── Background Accent ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[38rem] h-[22rem] bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[28rem] h-[28rem] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* ── Top Bar ── */}
      <header className="relative z-10 p-4 sm:p-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Landing</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Console Operational</span>
        </div>
      </header>

      {/* ── Main Login Form ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo & Heading */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-700/80 p-2 flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-900/40 mb-3 overflow-hidden">
              <Image
                src="/branding/logo.png"
                alt="AbbaKano Core"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold mb-2">
              <span className="material-symbols-outlined text-[14px]">shield_person</span>
              <span>Super Administrator Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Sign In to Console
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Restricted master access for AbbaKano executive administration and telecom dispatch operations.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <span className="flex-1 font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Superadmin Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="admin-email">
                Super Administrator Email
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-500 text-[18px]">
                  admin_panel_settings
                </span>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="admin@abbakano.ng"
                  className="w-full h-11 pl-10 pr-4 bg-slate-950/80 rounded-xl text-sm text-white placeholder:text-slate-600 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300" htmlFor="admin-password">
                  Master Password
                </label>
                <span className="text-[11px] text-slate-400">
                  Min. 8 characters
                </span>
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-500 text-[18px]">
                  lock
                </span>
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter master password"
                  className="w-full h-11 pl-10 pr-10 bg-slate-950/80 rounded-xl text-sm text-white placeholder:text-slate-600 border border-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me & Help */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="remember" className="text-slate-400 cursor-pointer select-none">
                  Keep me signed in
                </label>
              </div>
              <span className="text-slate-500">Superadmin Only</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              id="btn-login-submit"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Sign In as Super Administrator</span>
                </>
              )}
            </button>
          </form>

          {/* Simple footer note */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center text-xs text-slate-500 gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-emerald-500">lock</span>
            <span>256-Bit SSL Encrypted Admin Portal</span>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 p-4 text-center text-xs text-slate-500">
        <span>© 2026 AbbaKano Telecom Services Ltd. Executive Superadmin Portal.</span>
      </footer>
    </div>
  );
}
