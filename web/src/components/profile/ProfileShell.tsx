"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { invokeSupabaseFunction, supabase } from "@/lib/supabase";
import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";
import { useThemeMode } from "@/lib/theme";

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    back: "M19 12H5M12 19l-7-7 7-7",
    shield: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z",
    pin: "M7 4h10v5a5 5 0 0 1-10 0V4ZM12 14v7M8 21h8",
    fingerprint: "M8 8.5a5 5 0 0 1 8 0M5 12a7 7 0 0 1 14 0M9.5 12a2.5 2.5 0 0 1 5 0v5M12 15v6",
    lock: "M6 10h12v10H6zM8 10V7a4 4 0 0 1 8 0v3",
    help: "M4 13a8 8 0 0 1 16 0v4M4 13v4a2 2 0 0 0 2 2h2v-6H4m16 0h-4v6h2a2 2 0 0 0 2-2",
    gift: "M20 12v8H4v-8M2 8h20v4H2zM12 8v12M12 8H8.5a2.5 2.5 0 1 1 2.5-2.5V8Zm0 0h3.5a2.5 2.5 0 1 0-2.5-2.5V8Z",
    logout: "M10 17l5-5-5-5M15 12H3M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6",
    info: "M12 16v-4M12 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    palette: "M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z",
    sun: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z",
    moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={paths[name] || paths.shield} /></svg>;
}

function Toggle({ enabled, onChange, disabled = false }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return <button className={`profile-toggle${enabled ? " enabled" : ""}`} type="button" role="switch" aria-checked={enabled} onClick={onChange} disabled={disabled}><span /></button>;
}

type ProfileUser = { full_name?: string; fullName?: string; email?: string; phone?: string; biometrics_enabled?: boolean; app_lock_enabled?: boolean; has_transaction_pin?: boolean; has_passkey?: boolean; referralCount?: number; referralEarnings?: number; referralCommissionBalance?: number };

export function ProfileShell({ initialUser }: { initialUser?: ProfileUser }) {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const [message, setMessage] = useState("");
  const [biometrics, setBiometrics] = useState(initialUser?.biometrics_enabled !== false && initialUser?.has_passkey === true);
  const [appLock, setAppLock] = useState(initialUser?.app_lock_enabled === true);
  const [savingSetting, setSavingSetting] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [pinStep, setPinStep] = useState<"current" | "new" | "confirm">("new");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const { theme, themePreference, setThemePreference } = useThemeMode();

  useEffect(() => {
    if (initialUser) return;
    let cancelled = false;
    void apiRequest<{ user: ProfileUser | null }>("/me").then((response) => {
      if (cancelled) return;
      if (!response.user) throw new Error("Profile data was not returned.");
      setUser(response.user);
      setBiometrics(response.user.biometrics_enabled !== false && response.user.has_passkey === true);
      setAppLock(response.user.app_lock_enabled === true);
      setPinStep(response.user.has_transaction_pin ? "current" : "new");
    }).catch((error) => {
      if (!cancelled) setMessage(error instanceof ApiError ? error.message : "Could not load your profile.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [initialUser]);

  useEffect(() => {
    let cancelled = false;
    void invokeSupabaseFunction<{ hasPasskey: boolean }>(
      "passkey-auth",
      { action: "status" },
    ).then(({ hasPasskey }) => {
      if (cancelled) return;
      setUser((current) => current ? { ...current, has_passkey: hasPasskey } : current);
      setBiometrics(hasPasskey && user?.biometrics_enabled !== false);
    }).catch((error) => {
      if (!cancelled) {
        setMessage(error instanceof Error ? error.message : "Could not load passkey status.");
      }
    });
    return () => { cancelled = true; };
  }, [initialUser, user?.biometrics_enabled]);

  async function saveSecuritySetting(setting: "biometrics" | "appLock", nextValue: boolean) {
    setSavingSetting(setting);
    setMessage("");
    try {
      const { hasPasskey } = await invokeSupabaseFunction<{ hasPasskey: boolean }>(
        "passkey-auth",
        { action: "status" },
      );
      if (setting === "biometrics" && nextValue && !hasPasskey) {
        const options = await invokeSupabaseFunction<Record<string, unknown>>(
          "passkey-auth",
          { action: "register-options" },
        );
        const response = await startRegistration({ optionsJSON: options as never });
        await invokeSupabaseFunction("passkey-auth", {
          action: "register-verify",
          response,
        });
        setUser((current) => current ? { ...current, has_passkey: true } : current);
      }

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser) throw new Error("Authentication required.");
      const { error: profileError } = await supabase
        .from("profiles")
        .update(setting === "biometrics"
          ? { biometrics_enabled: nextValue }
          : { app_lock_enabled: nextValue })
        .eq("id", authUser.id);
      if (profileError) throw profileError;
      setUser((current) => current
        ? {
            ...current,
            ...(setting === "biometrics"
              ? { biometrics_enabled: nextValue }
              : { app_lock_enabled: nextValue }),
          }
        : current);

      if (setting === "biometrics") {
        setBiometrics(nextValue);
        if (!nextValue && hasPasskey) {
          await invokeSupabaseFunction("passkey-auth", { action: "delete" });
          setUser((current) => current ? { ...current, has_passkey: false } : current);
        }
      } else {
        setAppLock(nextValue);
      }
      if (setting === "biometrics") {
        setUser((current) => current ? { ...current, has_passkey: nextValue } : current);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else if (error instanceof Error && error.name === "NotAllowedError") {
        setMessage("Passkey setup was cancelled or unavailable. Try again and complete the browser prompt.");
      } else if (error instanceof Error && error.name === "SecurityError") {
        setMessage("Passkey setup is temporarily unavailable. Please try again later or contact support.");
      } else if (error instanceof Error && error.message) {
        setMessage(error.message);
      } else {
        setMessage("Could not save this security setting. Please try again.");
      }
    } finally {
      setSavingSetting("");
    }
  }

  function openPinModal() {
    setPin(""); setNewPin(""); setConfirmPin(""); setPinMessage(""); setPinStep(user?.has_transaction_pin ? "current" : "new"); setShowPinModal(true);
  }

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPinMessage("");
    if (pinStep === "current") {
      if (!/^\d{4}$/.test(pin)) { setPinMessage("Enter your current 4-digit PIN."); return; }
      setSavingPin(true);
      try { await invokeSupabaseFunction("verify-transaction-pin", { pin }); setPinStep("new"); } catch (error) { setPinMessage(error instanceof Error ? error.message : "Could not verify your current PIN."); } finally { setSavingPin(false); }
      return;
    }
    if (pinStep === "new") { if (!/^\d{4}$/.test(newPin)) { setPinMessage("Enter a new 4-digit PIN."); return; } setPinStep("confirm"); return; }
    if (newPin !== confirmPin) { setPinMessage("PINs do not match. Please try again."); return; }
    setSavingPin(true);
    try { await invokeSupabaseFunction("update-transaction-pin", { newPin, ...(pin ? { currentPin: pin } : {}) }); setShowPinModal(false); setUser((current) => current ? { ...current, has_transaction_pin: true } : current); setMessage("Transaction PIN changed successfully."); } catch (error) { setPinMessage(error instanceof Error ? error.message : "Could not save your transaction PIN."); } finally { setSavingPin(false); }
  }

  async function handleLogout() {
    setSigningOut(true);
    try {
      await apiRequest("/logout", { method: "POST" });
    } catch (error) {
      console.error("Could not sign out the customer", error);
    } finally {
      window.location.href = "/login";
    }
  }

  const name = user?.full_name || user?.fullName || "AbbaKano user";
  if (loading) return <main className="profile-state"><div className="dashboard-spinner" /><p>Loading your profile...</p></main>;

  return (
    <CustomerPageLayout active="profile" eyebrow="Account" title="Profile" subtitle="Account & Security Settings">
      <section className="profile-content">
        <div className="profile-identity"><div className="profile-avatar">{name.slice(0, 1).toUpperCase()}</div><div><h2>{name}</h2><p>{user?.email || "Your AbbaKano wallet"}</p><p className="profile-phone">{user?.phone || "Phone number not added"}</p></div></div>
        {message && <div className="profile-message" role="status">{message}</div>}
        <ProfileSection title="Referral & Rewards"><ProfileRow icon="gift" title="Refer & Earn" subtitle="Earn N100 for each friend who signs up with your code" badge="N100 BONUS" onClick={() => window.dispatchEvent(new CustomEvent("app-tab-change", { detail: "referral" }))} /></ProfileSection>
        <ProfileSection title="Security & Preferences"><ProfileRow icon="pin" title="Change Transaction PIN" subtitle="4-digit wallet security PIN" onClick={openPinModal} /><ProfileRow icon="fingerprint" title="Biometrics Login" subtitle="Face ID / Fingerprint unlock" control={<Toggle enabled={biometrics} disabled={savingSetting === "biometrics"} onChange={() => void saveSecuritySetting("biometrics", !biometrics)} />} /><ProfileRow icon="lock" title="App Lock PIN" subtitle="Screen lock security timeout" control={<Toggle enabled={appLock} disabled={savingSetting === "appLock"} onChange={() => void saveSecuritySetting("appLock", !appLock)} />} /><ProfileRow icon="palette" title="Theme & Appearance" subtitle={themePreference === "system" ? `Auto (${theme === "dark" ? "Dark" : "Light"})` : `${theme === "dark" ? "Dark" : "Light"} mode active`} badge={themePreference === "system" ? "AUTO" : theme.toUpperCase()} onClick={() => setShowThemeModal(true)} /></ProfileSection>
        <ProfileSection title="Help & Support"><ProfileRow icon="help" title="Contact Support" subtitle="24/7 WhatsApp & in-app chat" onClick={() => router.push("/support")} /><ProfileRow icon="info" title="About AbbaKano" subtitle="About the platform and its services" onClick={() => router.push("/about")} /></ProfileSection>
        <button className="profile-signout" type="button" onClick={() => setShowSignOutModal(true)} aria-haspopup="dialog"><span className="profile-signout-icon"><Icon name="logout" /></span><span className="profile-signout-copy"><strong>Sign Out</strong><small>Exit your wallet session safely</small></span></button>
      </section>
      {showSignOutModal && (
        <div className="data-modal-backdrop" onClick={() => !signingOut && setShowSignOutModal(false)}>
          <section className="data-modal signout-modal" role="dialog" aria-modal="true" aria-labelledby="signout-title" onClick={(event) => event.stopPropagation()}>
            <button className="data-modal-close" type="button" onClick={() => setShowSignOutModal(false)} disabled={signingOut} aria-label="Close sign-out confirmation">x</button>
            <p className="data-kicker">Account</p>
            <h2 id="signout-title">Sign out of AbbaKano?</h2>
            <p className="signout-copy">You’ll need to sign in again to access your wallet and account.</p>
            <div className="signout-actions">
              <button className="fund-cancel" type="button" onClick={() => setShowSignOutModal(false)} disabled={signingOut}>Cancel</button>
              <button className="signout-confirm" type="button" onClick={() => void handleLogout()} disabled={signingOut}>{signingOut ? "Signing out..." : "Sign Out"}</button>
            </div>
          </section>
        </div>
      )}
      {showThemeModal && (
        <div className="data-modal-backdrop" onClick={() => setShowThemeModal(false)}>
          <section className="data-modal theme-modal" role="dialog" aria-modal="true" aria-labelledby="theme-title" onClick={(event) => event.stopPropagation()}>
            <button className="data-modal-close" type="button" onClick={() => setShowThemeModal(false)} aria-label="Close theme dialog">x</button>
            <p className="data-kicker">Appearance</p>
            <h2 id="theme-title">Theme & Appearance</h2>
            <div className="theme-option-list">
              {(["system", "dark", "light"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`theme-option${themePreference === mode ? " selected" : ""}`}
                  onClick={() => {
                    setThemePreference(mode);
                    setShowThemeModal(false);
                  }}
                >
                  <span className="theme-option-icon"><Icon name={mode === "system" ? "palette" : mode === "dark" ? "moon" : "sun"} /></span>
                  <span className="theme-option-copy">
                    <strong>{mode === "system" ? "System Default" : mode === "dark" ? "Dark Mode" : "Light Mode"}</strong>
                    <small>{mode === "system" ? `Auto-detects your device (${theme === "dark" ? "Dark" : "Light"})` : mode === "dark" ? "Low-light comfort" : "Bright daylight readability"}</small>
                  </span>
                  <span className="theme-option-radio" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {showPinModal && <div className="data-modal-backdrop"><section className="data-modal pin-modal" role="dialog" aria-modal="true" aria-labelledby="pin-title"><button className="data-modal-close" type="button" onClick={() => setShowPinModal(false)} aria-label="Close PIN dialog">x</button><p className="data-kicker">Security</p><h2 id="pin-title">{pinStep === "current" ? "Enter Current PIN" : pinStep === "new" ? "Create New PIN" : "Confirm New PIN"}</h2><p className="pin-modal-copy">{pinStep === "current" ? "Enter your current 4-digit PIN to continue" : pinStep === "new" ? "Create a new 4-digit PIN for your wallet" : "Enter your new 4-digit PIN again to confirm"}</p><form className="data-pin-form" onSubmit={submitPin}><input className="pin-modal-input" type="password" inputMode="numeric" maxLength={4} value={pinStep === "current" ? pin : pinStep === "new" ? newPin : confirmPin} onChange={(event) => { const value = event.target.value.replace(/\D/g, ""); if (pinStep === "current") setPin(value); else if (pinStep === "new") setNewPin(value); else setConfirmPin(value); }} placeholder="4-digit PIN" autoFocus />{pinMessage && <div className="data-message error" role="alert">{pinMessage}</div>}<button className="data-purchase-button" type="submit" disabled={savingPin}>{savingPin ? "Saving..." : pinStep === "current" ? "Verify Current PIN" : pinStep === "new" ? "Continue" : "Save New PIN"}</button></form></section></div>}
    </CustomerPageLayout>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="profile-section"><h2>{title}</h2><div className="profile-list">{children}</div></section>;
}

function ProfileRow({ icon, title, subtitle, badge, control, onClick }: { icon: string; title: string; subtitle: string; badge?: string; control?: React.ReactNode; onClick?: () => void }) {
  const content = <><span className="profile-row-icon"><Icon name={icon} /></span><span className="profile-row-copy"><strong>{title}</strong><small>{subtitle}</small></span>{badge && <span className="profile-badge">{badge}</span>}{control || <span className="profile-chevron">-&gt;</span>}</>;
  return onClick ? <button className="profile-row" type="button" onClick={onClick}>{content}</button> : <div className="profile-row">{content}</div>;
}
