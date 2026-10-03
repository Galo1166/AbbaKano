"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

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
        "Enter your email and password."
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

      setErrorMessage("Login successful. Opening your dashboard...");
      window.location.assign("/app");

    } catch (error) {
      console.error("Supabase login error:", error);

      setErrorMessage(
        error instanceof Error && error.message === "Invalid login credentials"
          ? "Supabase could not verify this email and password. If your account was only created on the previous system, it may need to be registered or migrated before you can sign in."
          : error instanceof Error
            ? error.message
            : "Could not sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricSignIn() {
    setErrorMessage(
      "Passkey/biometric login will be migrated to Supabase in the next step."
    );
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
        Email

        <input
          value={identifier}
          onChange={(event) =>
            setIdentifier(event.target.value)
          }
          placeholder="Enter your email"
          autoComplete="username"
          type="email"
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
        <Link href="/support">
          Contact WhatsApp Support
        </Link>
      </p>
    </form>
  );
}