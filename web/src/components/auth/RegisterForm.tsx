"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { invokeSupabaseFunction } from "@/lib/supabase";
import { safeErrorMessage, showErrorToast, showSuccessToast } from "@/lib/userFeedback";

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function useLocationSearch() {
  return useSyncExternalStore(
    subscribeToLocation,
    () => window.location.search,
    () => "",
  );
}

export function RegisterForm() {
  const router = useRouter();
  const referralCodeFromUrl =
    new URLSearchParams(useLocationSearch()).get("referralCode") || "";

  const [values, setValues] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    pin: "",
    confirmPin: "",
    referralCode: "",
  });

  const [showReferral, setShowReferral] = useState(() => Boolean(referralCodeFromUrl));
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function updateValue(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function validate() {
    if (!values.fullName.trim() || !values.phone.trim()) return "Full name and phone number are required.";
    if (!values.email.trim() || !values.email.includes("@")) return "Enter a valid email address.";
    if (values.password.length < 8) return "Password must be at least 8 characters.";
    if (values.password !== values.confirmPassword) return "Passwords do not match.";
    if (!/^\d{4}$/.test(values.pin)) return "Transaction PIN must be exactly 4 digits.";
    if (values.pin !== values.confirmPin) return "Transaction PINs do not match.";
    if (!acceptedTerms) return "Accept the Terms of Service and Privacy Policy to continue.";
    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    setErrorMessage(validationError);
    if (validationError) return;

    setLoading(true);

    try {
      await invokeSupabaseFunction("register-user", {
        fullName: values.fullName.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        password: values.password,
        pin: values.pin,
        referralCode: values.referralCode.trim() || referralCodeFromUrl,
      });

      showSuccessToast("Account created successfully. You can now log in.");
      router.push("/login");
    } catch (error) {
      console.error("Registration error:", error);
      const msg = error instanceof Error ? error.message : "";
      const lower = msg.toLowerCase();
      if (lower.includes("phone") && (lower.includes("already exists") || lower.includes("already registered") || lower.includes("taken"))) {
        setErrorMessage(`An account with phone number ${values.phone} is already registered. Please sign in instead.`);
      } else if (lower.includes("email") && (lower.includes("already") || lower.includes("registered") || lower.includes("taken"))) {
        setErrorMessage(`An account with email ${values.email} is already registered. Please sign in instead.`);
      } else if (lower.includes("already registered") || lower.includes("already exists")) {
        setErrorMessage("This email or phone number is already registered. Please sign in instead.");
      } else if (/referral.*(?:not found|invalid)/i.test(msg)) {
        setErrorMessage("");
        showErrorToast("Invalid referral code. Please check the phone number and try again.");
      } else {
        setErrorMessage(safeErrorMessage(error, "Could not create your account."));
      }
    } finally {
      setLoading(false);
    }
  }

  const isAlreadyRegistered = Boolean(
    errorMessage &&
    (errorMessage.toLowerCase().includes("already registered") ||
      errorMessage.toLowerCase().includes("already exists") ||
      errorMessage.toLowerCase().includes("sign in instead"))
  );

  return (
    <form className="space-y-4 text-left" onSubmit={handleSubmit}>
      {errorMessage && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-500 flex flex-col gap-2"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
          {isAlreadyRegistered && (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 self-start rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer"
            >
              <span>Sign In to Your Account</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )}
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className="block text-xs font-bold text-[var(--text)] mb-1">
          Full Name
        </label>
        <input
          value={values.fullName}
          onChange={(event) => updateValue("fullName", event.target.value)}
          placeholder="e.g. Abba Kano"
          autoComplete="name"
          className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-3.5 text-base sm:text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
        />
      </div>

      {/* Phone Number */}
      <div>
        <label className="block text-xs font-bold text-[var(--text)] mb-1">
          Phone Number <span className="text-[11px] text-[var(--text-muted)] font-normal">(11 Digits)</span>
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[var(--border-high)] bg-[var(--surface-low)] text-xs font-bold text-[var(--text-muted)]">
            +234
          </span>
          <input
            value={values.phone}
            onChange={(event) => updateValue("phone", event.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="08133339850"
            autoComplete="tel"
            inputMode="numeric"
            maxLength={11}
            className="flex-1 h-12 rounded-r-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-3.5 text-base sm:text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
          />
        </div>
      </div>

      {/* Email Address */}
      <div>
        <label className="block text-xs font-bold text-[var(--text)] mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={values.email}
          onChange={(event) => updateValue("email", event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-3.5 text-base sm:text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
        />
      </div>

      {/* Password & Live Strength Indicator */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-[var(--text)]">
            Account Password
          </label>
          {values.password.length > 0 && (
            <span className={`text-[11px] font-bold ${values.password.length >= 8 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {values.password.length >= 8
                ? '✓ 8+ chars (Strong)'
                : `${8 - values.password.length} more char${8 - values.password.length === 1 ? '' : 's'} needed`}
            </span>
          )}
        </div>
        <div className="relative flex items-center">
          <input
            type={showPassword ? "text" : "password"}
            value={values.password}
            onChange={(event) => updateValue("password", event.target.value)}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] pl-3.5 pr-12 text-base sm:text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
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

      {/* Confirm Password */}
      <div>
        <label className="block text-xs font-bold text-[var(--text)] mb-1">
          Confirm Password
        </label>
        <div className="relative flex items-center">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={values.confirmPassword}
            onChange={(event) => updateValue("confirmPassword", event.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] pl-3.5 pr-12 text-base sm:text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
            className="absolute right-3 h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-slate-500/10 transition-colors cursor-pointer"
          >
            {showConfirmPassword ? (
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

      {/* 4-Digit Transaction PIN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs font-bold text-[var(--text)] mb-1">
            4-Digit PIN <span className="text-[11px] text-[var(--text-muted)] font-normal">(Wallet Security)</span>
          </label>
          <div className="relative flex items-center">
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={4}
              value={values.pin}
              onChange={(event) => updateValue("pin", event.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] pl-4 pr-12 text-base sm:text-sm font-bold font-mono tracking-widest text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              aria-label={showPin ? "Hide transaction PIN" : "Show transaction PIN"}
              className="absolute right-3 h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-slate-500/10 transition-colors cursor-pointer"
            >
              {showPin ? (
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

        <div>
          <label className="block text-xs font-bold text-[var(--text)] mb-1">
            Confirm PIN
          </label>
          <div className="relative flex items-center">
            <input
              type={showConfirmPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={4}
              value={values.confirmPin}
              onChange={(event) => updateValue("confirmPin", event.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] pl-4 pr-12 text-base sm:text-sm font-bold font-mono tracking-widest text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPin(!showConfirmPin)}
              aria-label={showConfirmPin ? "Hide confirmed transaction PIN" : "Show confirmed transaction PIN"}
              className="absolute right-3 h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-slate-500/10 transition-colors cursor-pointer"
            >
              {showConfirmPin ? (
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
      </div>

      {/* Referral Code (Optional) */}
      <div>
        <button
          type="button"
          onClick={() => setShowReferral(!showReferral)}
          className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
        >
          {showReferral ? "Hide referral code" : "Have a Referral Code (Phone No)?"}
        </button>

        {showReferral && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[var(--text)]">
                Referral Code (Phone)
              </label>
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                +₦100 BONUS
              </span>
            </div>
            <input
              value={values.referralCode || referralCodeFromUrl}
              onChange={(event) => updateValue("referralCode", event.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="Referrer's phone number"
              inputMode="numeric"
              maxLength={11}
              className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-3.5 text-base sm:text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>
        )}
      </div>

      {/* Terms Agreement Checkbox */}
      <div className="pt-1">
        <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="h-4 w-4 mt-0.5 rounded border-[var(--border-high)] text-[var(--primary)] focus:ring-0 cursor-pointer shrink-0"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="font-bold text-[var(--primary)] hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="font-bold text-[var(--primary)] hover:underline">
              Privacy Policy
            </Link>.
          </span>
        </label>
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
            <span>Creating account...</span>
          </>
        ) : (
          <span>Create Account &amp; Get Started</span>
        )}
      </button>

      <p className="text-center text-[11px] text-[var(--text-muted)] font-medium">
        Protected by 256-bit encryption. We never share your data.
      </p>
    </form>
  );
}
