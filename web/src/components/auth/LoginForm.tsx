"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { apiRequest, ApiError } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!identifier.trim() || !password) {
      setErrorMessage("Enter your phone number or email and password.");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/login", { method: "POST", body: JSON.stringify({ identifier: identifier.trim(), password }) });
      router.push("/app");
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricSignIn() {
    setErrorMessage("");
    const accountIdentifier = identifier.trim();
    if (!accountIdentifier) {
      setErrorMessage("Enter the phone number or email for your passkey account first.");
      return;
    }

    setLoading(true);
    try {
      const options = await apiRequest<Record<string, unknown>>("/auth/passkey/login/options", {
        method: "POST",
        body: JSON.stringify({ identifier: accountIdentifier }),
      });
      const response = await startAuthentication({ optionsJSON: options as never });
      await apiRequest("/auth/passkey/login/verify", {
        method: "POST",
        body: JSON.stringify({ identifier: accountIdentifier, response }),
      });
      router.push("/app");
    } catch (error) {
      setErrorMessage(error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not complete biometric sign-in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {errorMessage && <div className="auth-error" role="alert">{errorMessage}</div>}
      <label>Mobile Number or Email<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="Enter phone number or email" autoComplete="username" /></label>
      <label>Password<div className="auth-input-wrap"><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" /><button className="input-action" type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></div></label>
      <div className="auth-options"><label className="check-label"><input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} /> Remember this device</label><Link href="/forgot-password">Forgot Password?</Link></div>
      <button className="auth-primary" type="submit" disabled={loading}>{loading ? "Signing in..." : "Secured Sign In to Wallet"}</button>
      <div className="auth-divider"><span>Or continue with</span></div>
      <button className="auth-secondary" type="button" onClick={() => void handleBiometricSignIn()} disabled={loading}>{loading ? "Verifying..." : "Sign In with Biometrics"}</button>
      <p className="auth-help">Need help? <Link href="/support">Contact WhatsApp Support</Link></p>
    </form>
  );
}
