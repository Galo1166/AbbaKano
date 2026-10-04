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
          error instanceof Error
            ? error.message
            : "Could not verify this password recovery link.",
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
      setMessage("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setRecoveryState("updated");
      setPassword("");
      setConfirmPassword("");
      setMessage("Your password has been updated. You can now sign in with it.");
    } catch (error) {
      console.error("Password update failed:", error);
      setMessage(
        error instanceof Error ? error.message : "Could not update your password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Choose a new password"
      description="Enter and confirm a new password for your AbbaKano account."
      footer={
        <>
          Remembered your password? <Link href="/login">Back to sign in</Link>
        </>
      }
    >
      {recoveryState === "checking" && (
        <div className="auth-info" role="status">
          Verifying your password reset link...
        </div>
      )}

      {recoveryState === "invalid" && (
        <div className="auth-form">
          <div className="auth-error" role="alert">
            {message || "This password reset link is invalid or has expired."}
          </div>
          <Link className="auth-primary" href="/forgot-password">
            Request a new reset link
          </Link>
        </div>
      )}

      {recoveryState === "updated" && (
        <div className="auth-form">
          <div className="auth-info" role="status">{message}</div>
          <Link className="auth-primary" href="/login">
            Sign in
          </Link>
        </div>
      )}

      {recoveryState === "ready" && (
        <form className="auth-form" onSubmit={submit}>
          {message && <div className="auth-error" role="alert">{message}</div>}
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <button className="auth-primary" type="submit" disabled={loading}>
            {loading ? "Updating password..." : "Update password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
