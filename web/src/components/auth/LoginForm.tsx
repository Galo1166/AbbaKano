"use client";

import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { FormEvent, useState } from "react";
import { invokeSupabaseFunction, supabase } from "@/lib/supabase";
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
      setErrorMessage(
        "Enter your phone number or email and password."
      );
      return;
    }

    setLoading(true);

    try {
      const credentials = value.includes("@")
        ? { email: value.toLowerCase(), password }
        : { phone: normalizePhone(value), password };
      const { data, error } = await supabase.auth.signInWithPassword(credentials);

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Could not create a login session.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw sessionError || new Error("Login succeeded, but the session could not be restored.");
      }

      window.location.assign("/app");

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
      window.location.assign("/app");
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
    <form
      className="auth-form"
      onSubmit={handleSubmit}
    >
      {errorMessage && (
        <div
          className="auth-error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <label>
        Phone number or email

        <input
          value={identifier}
          onChange={(event) =>
            setIdentifier(event.target.value)
          }
          placeholder="Enter your phone number or email"
          autoComplete="username"
          type="text"
          inputMode={identifier.includes("@") ? "email" : "tel"}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </label>

      <label>
        Password

        <div className="auth-input-wrap">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            autoComplete="current-password"
          />

          <button
            className="input-action"
            type="button"
            onClick={() =>
              setShowPassword((current) => !current)
            }
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <div className="auth-options">
        <label className="check-label">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) =>
              setRememberDevice(event.target.checked)
            }
          />

          Remember this device
        </label>

        <Link href="/forgot-password">
          Forgot Password?
        </Link>
      </div>

      <button
        className="auth-primary"
        type="submit"
        disabled={loading}
      >
        {loading
          ? "Signing in..."
          : "Secured Sign In to Wallet"}
      </button>

      <div className="auth-divider">
        <span>Or continue with</span>
      </div>

      <button
        className="auth-secondary"
        type="button"
        onClick={() => void handleBiometricSignIn()}
        disabled={loading}
      >
        Sign In with Biometrics
      </button>

      <p className="auth-help">
        Need help?{" "}
        <Link href="/support?from=auth">
          Contact WhatsApp Support
        </Link>
      </p>
    </form>
  );
}