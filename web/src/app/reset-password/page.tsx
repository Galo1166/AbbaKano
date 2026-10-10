"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/lib/supabase";

type RecoveryState = "checking" | "ready" | "invalid" | "updated";

export default function ResetPasswordPage() {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let receivedRecoveryEvent = false;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && active) {
        receivedRecoveryEvent = true;
        setRecoveryState("ready");
        setMessage("");
      }
    });

    async function verifyRecoverySession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;

        const url = new URL(window.location.href);
        const recoveryLink =
          url.hash.includes("type=recovery") ||
          url.searchParams.get("type") === "recovery" ||
          (url.searchParams.has("code") && Boolean(data.session));

        if (receivedRecoveryEvent || (data.session && recoveryLink)) {
          setRecoveryState("ready");
        } else {
          setRecoveryState("invalid");
        }
      } catch (error) {
        if (!active) return;
        console.error("Could not verify password recovery link:", error);
        setMessage(
          error instanceof Error ? error.message : "Could not verify this password recovery link.",
        );
        setRecoveryState("invalid");
      }
    }

    void verifyRecoverySession();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setRecoveryState("updated");
      setPassword("");
      setConfirmPassword("");
      setMessage("Your password has been successfully updated. You can now sign in.");
    } catch (error) {
      console.error("Password update failed:", error);
      setMessage(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Choose a new password"
      description="Enter and confirm a secure new password for your AbbaKano account."
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-bold text-[var(--primary)] hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {recoveryState === "checking" && (
        <div className="py-8 text-center text-sm font-semibold text-[var(--text-muted)]">
          <div className="h-6 w-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin mx-auto mb-3" />
          <span>Verifying security reset credentials...</span>
        </div>
      )}

      {recoveryState === "invalid" && (
        <div className="space-y-4 text-center">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-500">
            {message || "This password reset link is invalid or has expired."}
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-6 text-xs font-bold text-white shadow-md hover:bg-[var(--primary-container)]"
          >
            Request a New Reset Link
          </Link>
        </div>
      )}

      {recoveryState === "updated" && (
        <div className="space-y-4 text-center">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-500">
            {message}
          </div>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-8 text-xs font-bold text-white shadow-md hover:bg-[var(--primary-container)]"
          >
            Proceed to Sign In
          </Link>
        </div>
      )}

      {recoveryState === "ready" && (
        <form className="space-y-4 text-left" onSubmit={submit}>
          {message && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-500">
              {message}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[var(--text)] mb-1.5">
              New Password (Min. 8 characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Enter new password"
              className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-4 text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text)] mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
              placeholder="Re-enter new password"
              className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-4 text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-md hover:bg-[var(--primary-container)] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? "Updating Password..." : "Update Password & Secure Wallet"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
