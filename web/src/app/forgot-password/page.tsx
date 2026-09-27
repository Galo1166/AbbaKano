"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { apiRequest, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [recoveryType, setRecoveryType] = useState("password");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!email.includes("@")) {
      setMessage("Password recovery is currently available by email only.");
      return;
    }
    setLoading(true);
    try {
      const response = await apiRequest<{ message: string }>("/password-reset/request", { method: "POST", body: JSON.stringify({ email }) });
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not send recovery instructions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Account Recovery" subtitle="Recover your account" description="Choose what you need to recover and we will send instructions to your registered email." footer={<>Remembered your details? <Link href="/login">Back to sign in</Link></>}>
      <form className="auth-form" onSubmit={submit}>
        {message && <div className="auth-info" role="status">{message}</div>}
        <fieldset className="recovery-options"><legend>Recovery type</legend><button type="button" className={recoveryType === "password" ? "selected" : ""} onClick={() => setRecoveryType("password")}>Account Password<span>For App Sign-In</span></button><button type="button" className={recoveryType === "pin" ? "selected" : ""} onClick={() => setRecoveryType("pin")}>Transaction PIN<span>4-Digit Wallet PIN</span></button></fieldset>
        <label>Registered Phone or Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter phone number or email" autoComplete="email" /></label>
        <div className="security-card"><strong>256-Bit Encrypted Recovery</strong><span>Never share your reset code or OTP with anyone.</span></div>
        <button className="auth-primary" type="submit" disabled={loading}>{loading ? "Sending Recovery Code..." : "Send Recovery Code"}</button>
      </form>
    </AuthShell>
  );
}
