"use client";

import Link from "next/link";
import Image from "next/image";
import { useThemeMode } from "@/lib/theme";

const services = [
  ["signal", "Airtime", "All networks, instant recharge, and no service fee on wallet funding."],
  ["wifi", "Data bundles", "MTN, Airtel, Glo, and 9mobile plans at reseller rates."],
  ["bolt", "Electricity", "Prepaid and postpaid tokens for every major disco."],
  ["tv", "Cable TV", "DStv, GOtv, and Startimes renewals in seconds."],
];

const steps = [
  ["01", "Create your account", "Register with your phone number and verify in under a minute."],
  ["02", "Fund your wallet", "Bank transfer, card, or USSD. Funds reflect instantly."],
  ["03", "Pay any bill", "Pick a service, enter details, confirm. Delivery is automatic."],
];

function ServiceIcon({ name }: { name: string }) {
  if (name === "signal") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 18h2M8 14h2M12 10h2M16 6h2" /></svg>;
  }
  if (name === "wifi") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 8.5a15 15 0 0 1 18 0M6.5 12a9 9 0 0 1 11 0M10 15.5a4 4 0 0 1 4 0M12 19h.01" /></svg>;
  }
  if (name === "bolt") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" /></svg>;
}

function ThemeIcon({ light }: { light: boolean }) {
  return light
    ? <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>
    : <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.5 14.7A8.5 8.5 0 0 1 9.3 3.5 8.5 8.5 0 1 0 20.5 14.7Z" /></svg>;
}

function StoreIcon({ store }: { store: "apple" | "play" }) {
  return store === "apple"
    ? <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 12.54c-.02-2.04 1.67-3.02 1.75-3.07a3.75 3.75 0 0 0-2.96-1.6c-1.25-.13-2.45.74-3.09.74-.65 0-1.64-.72-2.7-.7a3.98 3.98 0 0 0-3.34 2.03c-1.45 2.51-.37 6.2 1.02 8.23.7 1 1.5 2.1 2.57 2.06 1.03-.04 1.42-.66 2.67-.66 1.24 0 1.6.66 2.68.64 1.11-.02 1.8-1 2.48-2.01a8.22 8.22 0 0 0 1.13-2.33 3.6 3.6 0 0 1-2.21-3.33Zm-2.03-5.99a3.58 3.58 0 0 0 .82-2.57 3.64 3.64 0 0 0-2.36 1.22 3.4 3.4 0 0 0-.85 2.47 3 3 0 0 0 2.39-1.12Z" /></svg>
    : <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="m4.5 3.5 10.7 8.5-10.7 8.5a1 1 0 0 1-.5-.9V4.4a1 1 0 0 1 .5-.9Zm12.1 9.6 2.8 2.2-2.8 1.6-2.3-1.9 2.3-1.9Zm-1.2-1L6.8 4.7l8.6 5.2 2.3 1.4-2.3 1.8Zm0 3.8-8.6 5.4 8.6-6.7 2.3 1.5-2.3-.2Z" /></svg>;
}

export default function Home() {
  const { theme, toggleTheme } = useThemeMode();

  return (
    <main className={`landing ${theme === "light" ? "light" : ""}`}>
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark"><Image src="/branding/logo.png" alt="AbbaKano" width={40} height={40} /></span>
          <span>AbbaKano DataSub</span>
        </Link>
        <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
          <ThemeIcon light={theme === "light"} />
        </button>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Kano-built, Nigeria-wide</p>
          <h1>One wallet for airtime, data, and every bill you owe.</h1>
          <p className="hero-copy">AbbaKano DataSub tops up any network, pays your electricity and cable TV, and settles exam pins instantly, at rates that do not eat your margin.</p>
          <div className="actions">
            <Link className="button button-primary" href="/register">Create account</Link>
            <Link className="button button-secondary" href="/login">Log in</Link>
          </div>
          <div className="store-row" aria-label="Mobile app availability">
            <span className="store-badge"><StoreIcon store="apple" /> App Store</span>
            <span className="store-badge"><StoreIcon store="play" /> Google Play</span>
          </div>
          <div className="trust-row">
            <div><p className="trust-value">&lt;10 sec</p><span className="trust-label">average delivery time</span></div>
            <div><p className="trust-value">24/7</p><span className="trust-label">support on WhatsApp &amp; call</span></div>
          </div>
        </div>

        <aside className="receipt" aria-label="Example transaction receipt">
          <div className="receipt-heading"><span>Transaction receipt</span><span className="receipt-id">#AB-88214</span></div>
          <div className="receipt-line"><span>MTN Data - 5GB</span><strong>NGN 1500</strong></div>
          <div className="receipt-line"><span>IKEDC Electricity</span><strong>NGN 8,000</strong></div>
          <div className="receipt-line"><span>GOtv Max - 1 month</span><strong>NGN 6,200</strong></div>
          <div className="receipt-line"><span>Airtel Airtime</span><strong>NGN 1,000</strong></div>
          <div className="receipt-status">Delivered successfully</div>
        </aside>
      </section>

      <section className="section">
        <div className="section-heading"><h2>Every bill, one screen.</h2><p>No app-switching, no queues. Pick a service, confirm, done.</p></div>
        <div className="grid">{services.map(([icon, title, description]) => <article className="service-card" key={title}><div className="service-icon"><ServiceIcon name={icon} /></div><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="section">
        <div className="section-heading"><h2>From sign-up to your first top-up.</h2><p>Three clear steps, with a receipt for every successful transaction.</p></div>
        <div className="grid step-grid">{steps.map(([number, title, description]) => <article className="step-card" key={number}><div className="step-number">{number}</div><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>

      <section className="stats-band" aria-label="AbbaKano service statistics">
        <div className="stat"><strong>4 networks</strong><span>airtime &amp; data covered</span></div>
        <div className="stat"><strong>3 discos+</strong><span>electricity tokens supported</span></div>
        <div className="stat"><strong>99.9%</strong><span>uptime on transactions</span></div>
        <div className="stat"><strong>24/7</strong><span>customer support</span></div>
      </section>

      <section className="section cta">
        <div className="section-heading"><h2>Stop juggling apps for every bill.</h2><p>Create your AbbaKano DataSub account and fund your first wallet in minutes.</p></div>
        <div className="actions"><Link className="button button-primary" href="/register">Create account</Link><Link className="button button-secondary" href="/login">Log in</Link></div>
      </section>

      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand-block">
            <Link className="brand" href="/">
              <span className="brand-mark"><Image src="/branding/logo.png" alt="AbbaKano" width={40} height={40} /></span>
              <span>AbbaKano DataSub</span>
            </Link>
            <p>Bill payments made simple, from Kano to every state.</p>
            <Link className="footer-support" href="/support">Talk to support <span aria-hidden="true">-&gt;</span></Link>
          </div>
          <div>
            <h2 className="footer-heading">Services</h2>
            <nav className="footer-links" aria-label="Services">
              <Link href="/airtime">Airtime</Link>
              <Link href="/data">Data bundles</Link>
              <Link href="/electricity">Electricity</Link>
              <Link href="/cable-tv">Cable TV</Link>
            </nav>
          </div>
          <div>
            <h2 className="footer-heading">Company</h2>
            <nav className="footer-links" aria-label="Company">
              <Link href="/about">About AbbaKano</Link>
              <Link href="/refer-and-earn">Refer &amp; earn</Link>
              <Link href="/support">Help centre</Link>
              <Link href="/login">Sign in</Link>
            </nav>
          </div>
          <div>
            <h2 className="footer-heading">Contact</h2>
            <div className="footer-links">
              <a href="mailto:support@abbakano.com">support@abbakano.com</a>
              <a href="tel:+2348166774566">+234 816 677 4566</a>
              <a href="/support">WhatsApp support</a>
              <span>Kano, Nigeria</span>
            </div>
          </div>
        </div>
        <div className="footer-meta">
          <div className="footer-status"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg><span>Secure wallet and protected payments</span></div>
          <div className="footer-payment">Paystack <span aria-hidden="true">|</span> Bank transfer <span aria-hidden="true">|</span> USSD</div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 AbbaKano DataSub. All rights reserved.</span>
          <div className="footer-legal"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/support">Support Desk</Link></div>
        </div>
      </footer>
    </main>
  );
}
