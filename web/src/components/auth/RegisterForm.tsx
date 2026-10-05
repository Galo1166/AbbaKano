"use client";

import Link from "next/link";
import { FormEvent, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {invokeSupabaseFunction} from "@/lib/supabase";
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

function VisibilityIcon({ visible }: { visible: boolean }) {
  return visible
    ? <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
    : <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 3 18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a17.5 17.5 0 0 1-3.1 3.8M6.1 6.1C3.4 8 2 12 2 12s3.5 6 10 6c1.3 0 2.5-.2 3.5-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
}

export function RegisterForm() {
  const router = useRouter();
  const referralCodeFromUrl =
    new URLSearchParams(useLocationSearch()).get("referralCode") || "";
  const [values, setValues] = useState({ fullName: "", phone: "", email: "", password: "", confirmPassword: "", pin: "", confirmPin: "", referralCode: "" });
  const [showReferral, setShowReferral] = useState(() =>
    false,
  );
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
    if (!values.email.trim()) {
  return "Email address is required.";
}

if (!values.email.includes("@")) {
  return "Enter a valid email address.";
}
    if (values.password.length < 8) return "Password must be at least 8 characters.";
    if (values.password !== values.confirmPassword) return "Passwords do not match.";
    if (!/^\d{4}$/.test(values.pin)) return "Transaction PIN must be exactly 4 digits.";
    if (values.pin !== values.confirmPin) return "Transaction PINs do not match.";
    if (!acceptedTerms) return "Accept the Terms of Service and Privacy Policy to continue.";
    return "";
  }

 async function handleSubmit(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault();

  const validationError =
    validate();

  setErrorMessage(
    validationError,
  );

  if (validationError) {
    return;
  }

  setLoading(true);

  try {
    await invokeSupabaseFunction(
      "register-user",
      {
          fullName:
            values.fullName.trim(),

          phone:
            values.phone.trim(),

          email:
            values.email.trim(),

          password:
            values.password,

          pin:
            values.pin,

          referralCode:
            values.referralCode.trim() || referralCodeFromUrl,
      },
    );

    showSuccessToast("Account created successfully. You can now log in.");
    router.push("/login");
  } catch (error) {
    console.error(
      "Registration error:",
      error,
    );

    if (error instanceof Error && /referral.*(?:not found|invalid)/i.test(error.message)) {
      setErrorMessage("");
      showErrorToast("Invalid referral code. Please check the phone number and try again.");
    } else {
      setErrorMessage(safeErrorMessage(error, "Could not create your account."));
    }
  } finally {
    setLoading(false);
  }
}

  return (
    <form className="auth-form register-form" onSubmit={handleSubmit}>
      {errorMessage && <div className="auth-error" role="alert">{errorMessage}</div>}
      <label>Full Name<input value={values.fullName} onChange={(event) => updateValue("fullName", event.target.value)} placeholder="Enter full name" autoComplete="name" /></label>
      <label>Phone Number <small>Mandatory · 11 digits</small><div className="phone-input"><span>+234</span><input value={values.phone} onChange={(event) => updateValue("phone", event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="Enter phone number" autoComplete="tel" inputMode="numeric" maxLength={11} /></div></label>
      <label>Email Address <small>Optional</small><input value={values.email} onChange={(event) => updateValue("email", event.target.value)} placeholder="Enter email address" autoComplete="email" /></label>
      <label>Password<div className="auth-input-wrap"><input type={showPassword ? "text" : "password"} value={values.password} onChange={(event) => updateValue("password", event.target.value)} placeholder="Enter password (min. 8 characters)" autoComplete="new-password" /><button className="input-action" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}><VisibilityIcon visible={showPassword} /></button></div></label>
      <label>Confirm Password<div className="auth-input-wrap"><input type={showConfirmPassword ? "text" : "password"} value={values.confirmPassword} onChange={(event) => updateValue("confirmPassword", event.target.value)} placeholder="Re-enter password" autoComplete="new-password" /><button className="input-action" type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}><VisibilityIcon visible={showConfirmPassword} /></button></div></label>
      <label>Transaction PIN <small>4 digits for wallet security</small><div className="auth-input-wrap"><input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={4} value={values.pin} onChange={(event) => updateValue("pin", event.target.value.replace(/\D/g, ""))} placeholder="Enter 4-digit PIN" autoComplete="new-password" /><button className="input-action" type="button" onClick={() => setShowPin((current) => !current)} aria-label={showPin ? "Hide transaction PIN" : "Show transaction PIN"}><VisibilityIcon visible={showPin} /></button></div></label>
      <label>Confirm Transaction PIN<div className="auth-input-wrap"><input type={showConfirmPin ? "text" : "password"} inputMode="numeric" maxLength={4} value={values.confirmPin} onChange={(event) => updateValue("confirmPin", event.target.value.replace(/\D/g, ""))} placeholder="Re-enter 4-digit PIN" autoComplete="new-password" /><button className="input-action" type="button" onClick={() => setShowConfirmPin((current) => !current)} aria-label={showConfirmPin ? "Hide confirmed transaction PIN" : "Show confirmed transaction PIN"}><VisibilityIcon visible={showConfirmPin} /></button></div></label>
      <button className="referral-toggle" type="button" onClick={() => setShowReferral((current) => !current)}>{showReferral ? "Hide referral code" : "Have a Referral Code (Phone No)?"}</button>
      {(showReferral || referralCodeFromUrl) && <label>Referral Code <small className="bonus">N100 BONUS</small><input value={values.referralCode || referralCodeFromUrl} onChange={(event) => updateValue("referralCode", event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="Enter referrer's phone number" inputMode="numeric" maxLength={11} /></label>}
      <label className="check-label terms"><input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} /> I agree to the <Link href="/terms?from=auth">Terms of Service</Link> and <Link href="/privacy?from=auth">Privacy Policy</Link>.</label>
      <button className="auth-primary" type="submit" disabled={loading}>{loading ? "Creating Account..." : "Register & Get Started"}</button>
      <p className="security-note">256-bit secure registration. We never share your data.</p>
    </form>
  );
}
