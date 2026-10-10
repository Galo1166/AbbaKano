"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    if (!email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsSuccess(true);
      setMessage("If an account exists for this email, password recovery instructions have been sent.");
    } catch (error) {
      console.error("Password recovery error:", error);
      setMessage(
        error instanceof Error ? error.message : "Could not send recovery instructions.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Account Recovery"
      subtitle="Reset your password"
      description="Enter your registered email address to receive password reset instructions."
      footer={
        <>
          Remember your password?{" "}
          <Link href="/login" className="font-bold text-[var(--primary)] hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4 text-left" onSubmit={submit}>
        {message && (
          <div
            className={`rounded-xl border p-3 text-xs font-semibold flex items-start gap-2 ${
              isSuccess
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-red-500/30 bg-red-500/10 text-red-500"
            }`}
            role="status"
          >
            <span>{message}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[var(--text)] mb-1.5">
            Registered Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email address"
            autoComplete="email"
            required
            className="w-full h-12 rounded-xl border border-[var(--border-high)] bg-[var(--surface-high)] px-4 text-sm font-medium text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-low)] p-3 text-xs text-[var(--text-muted)]">
          <strong className="block font-bold text-[var(--text)]">256-Bit Encrypted Recovery</strong>
          <span>Never share your verification code or reset link with anyone.</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-[var(--primary)] text-sm font-bold text-white shadow-md hover:bg-[var(--primary-container)] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? "Sending Instructions..." : "Send Recovery Instructions"}
        </button>

        <p className="text-center text-xs text-[var(--text-muted)] pt-1 font-medium">
          Need immediate help?{" "}
          <a
            href="https://wa.me/2348133339850?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20recovering%20my%20account."
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--primary)] hover:underline"
          >
            Contact WhatsApp Desk
          </a>
        </p>
      </form>
    </AuthShell>
  );
}
