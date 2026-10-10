"use client";

import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useState } from "react";
import { invokeSupabaseFunction, setRememberDevicePreference, supabase } from "@/lib/supabase";
import { GENERIC_SERVICE_ERROR, isServiceFailure, reportServiceFailure } from "@/lib/userFeedback";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("234")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  if (!/^[789]\d{9}$/.test(local)) {
    throw new Error("Enter a valid Nigerian phone number.");
  }
  return `+234${local}`;
}

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const value = identifier.trim();
    if (!value || !password) {
      setErrorMessage("Enter your phone number or email and password.");
      return;
    }

    setLoading(true);

    try {
      setRememberDevicePreference(rememberDevice);
      const credentials = value.includes("@")
        ? { email: value.toLowerCase(), password }
        : { phone: normalizePhone(value), password };
      const { data, error } = await supabase.auth.signInWithPassword(credentials);

      if (error) throw error;
      if (!data.user) throw new Error("Could not create a login session.");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw sessionError || new Error("Login succeeded, but session could not be restored.");
      }

      // Respect ?redirect= parameter
      const params = new URLSearchParams(window.location.search);
      const target = params.get("redirect") || "/app";
      window.location.assign(target);

    } catch (error) {
      console.error("Supabase login error:", error);

      if (error instanceof Error && (
        error.message === GENERIC_SERVICE_ERROR ||
        isServiceFailure(error.message)
      )) {
        if (error.message !== GENERIC_SERVICE_ERROR) reportServiceFailure(error);
        setErrorMessage("");
        return;
      }
      setErrorMessage(
        error instanceof Error && error.message === "Invalid login credentials"
          ? "Phone number/email or password is incorrect."
          : error instanceof Error
            ? error.message
            : "Could not sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricSignIn() {
    setErrorMessage("");
    setLoading(true);
    try {
      const options = await invokeSupabaseFunction<Record<string, unknown>>(
        "passkey-auth",
        { action: "login-options" },
      );
      const response = await startAuthentication({ optionsJSON: options as never });
      const result = await invokeSupabaseFunction<{ tokenHash: string }>(
        "passkey-auth",
        { action: "login-verify", response },
      );
      const { error } = await supabase.auth.verifyOtp({
        token_hash: result.tokenHash,
        type: "magiclink",
      });
      if (error) throw error;

      const params = new URLSearchParams(window.location.search);
      const target = params.get("redirect") || "/app";
      window.location.assign(target);
    } catch (error) {
      console.error("Passkey sign-in error:", error);
      if (error instanceof Error && (
        error.message === GENERIC_SERVICE_ERROR ||
        isServiceFailure(error.message)
      )) {
        if (error.message !== GENERIC_SERVICE_ERROR) reportServiceFailure(error);
        setErrorMessage("");
        setLoading(false);
        return;
      }
      setErrorMessage(
        error instanceof Error
          ? error.message || GENERIC_SERVICE_ERROR
          : "Biometric sign-in could not be completed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4 text-left" onSubmit={handleSubmit}>
      {errorMessage && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-500 flex items-start gap-2"
          role="alert"
        >
          <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Identifier Field: Concise placeholder, 16px font on mobile for keyboard stability */}
      <div>
        <label className="block text-xs font-bold text-[var(--text)] mb-1.5">
          Phone Number or Email
        </label>
        <div className="relative">
          <input
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Phone number or email"
            autoComplete="username"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-4 text-base sm:text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
          />
        </div>
      </div>

      {/* Password Field: Clean SVG Eye Toggle only (no text collision), pr-12, concise placeholder */}
      <div>
        <label className="block text-xs font-bold text-[var(--text)] mb-1.5">
          Password
        </label>
        <div className="relative flex items-center">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] pl-4 pr-12 text-base sm:text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            {showPassword ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Remember Device & Forgot Password */}
      <div className="flex items-center justify-between text-xs pt-1">
        <label className="flex items-center gap-2 cursor-pointer font-medium text-[var(--text-muted)] select-none">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--border-high)] text-[var(--primary)] focus:ring-0 cursor-pointer"
          />
          <span>Remember this device</span>
        </label>

        <Link
          href="/forgot-password"
          className="font-bold text-[var(--primary)] hover:underline"
        >
          Forgot Password?
        </Link>
      </div>

      {/* Primary Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-md hover:bg-[var(--primary-container)] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <span>Secured Sign In to Wallet</span>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Or Passkey Access
        </span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* Passkey / Biometrics Button: Single line, no wrapping bug */}
      <button
        type="button"
        onClick={() => void handleBiometricSignIn()}
        disabled={loading}
        className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-low)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 px-4 cursor-pointer"
      >
        <svg className="h-4 w-4 text-[var(--primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
        <span className="whitespace-nowrap">Sign in with Biometrics</span>
      </button>

      {/* Help Link */}
      <p className="text-center text-xs text-[var(--text-muted)] pt-2 font-medium">
        Need assistance?{" "}
        <a
          href="https://wa.me/2348133339850?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20logging%20in."
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[var(--primary)] hover:underline"
        >
          Contact WhatsApp Support
        </a>
      </p>
    </form>
  );
}
