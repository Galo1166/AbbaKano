import Link from "next/link";
import { WebDesktopSidebar } from "@/components/navigation/WebDesktopSidebar";
import { WebBottomNav } from "@/components/navigation/WebBottomNav";

const faqs = [
  {
    question: "Data bundle not received after debit?",
    answer:
      "Most VTU data deliveries complete within 5 to 30 seconds. If delayed beyond 5 minutes due to telco network congestion, click the WhatsApp button with your Transaction Reference ID for instant escalation.",
  },
  {
    question: "Wallet auto-funding transfer pending?",
    answer:
      "Transfers to your dedicated Wema or Moniepoint virtual accounts auto-credit instantly. If delayed, please verify the bank transaction status and send the Session ID to our WhatsApp desk.",
  },
  {
    question: "How do I change my Transaction PIN?",
    answer:
      "Go to the Profile tab -> Security & Preferences -> Change Transaction PIN. If you forgot your current PIN, click Forgot PIN or contact support.",
  },
  {
    question: "What are the customer service operating hours?",
    answer:
      "Our dedicated customer support and automated resolution desk operates 24 hours a day, 7 days a week, 365 days a year.",
  },
];

const supportChannels = [
  {
    title: "WhatsApp Direct",
    value: "+2348166774566",
    detail: "1-Tap Agent Chat",
    href: "https://wa.me/2348166774566?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20with%20my%20account.",
    tone: "green",
  },
  {
    title: "Hotline 1 (Primary)",
    value: "+2348166774566",
    detail: "Direct Phone Call",
    href: "tel:+2348166774566",
    tone: "blue",
  },
  {
    title: "Hotline 2 (Agent Desk)",
    value: "Wholesale & KYC Agent Desk",
    detail: "Available Soon",
    href: "#",
    tone: "amber",
  },
  {
    title: "Email Inquiries",
    value: "support@abbakano.com",
    detail: "In-depth receipts",
    href: "mailto:support@abbakano.com?subject=AbbaKano%20Support%20Request",
    tone: "violet",
  },
];

export default function SupportPage() {
  return (
    <main className="support-page">
      <WebDesktopSidebar active="profile" />

      <div className="support-shell">
        <header className="support-header">
          <Link href="/app" className="support-back-link">
            ← Back to dashboard
          </Link>
          <p className="data-kicker">Customer Support</p>
          <h1>Customer Support</h1>
          <p className="support-intro">24/7 Multi-Channel Resolution Desk</p>
        </header>

        <section className="support-status-card">
          <div className="support-status-header">
            <div className="support-live-row">
              <span className="support-live-dot" />
              <span className="support-status-badge">DESK ONLINE</span>
            </div>
            <span className="support-status-eta">Avg. Response: &lt; 3 mins</span>
          </div>
          <h2>Need help with a transaction?</h2>
          <p>
            Our dedicated technical support team is standing by to assist with data topups, airtime, bills, and wallet funding.
          </p>
        </section>

        <section className="support-community-card">
          <div className="support-community-header">
            <div className="support-community-icon">💬</div>
            <div className="support-community-heading">
              <div className="support-community-title-row">
                <h3>WhatsApp Community</h3>
                <span className="support-community-badge">UPDATES &amp; ALERTS</span>
              </div>
              <p>Official Announcements &amp; Real-Time Broadcasts</p>
            </div>
          </div>
          <p className="support-community-copy">
            Join our official reseller community to receive instant broadcast alerts on data bundle price drops, server maintenance schedules, and VTU availability.
          </p>
          <div className="support-community-perks">
            <span>Instant Price Drops</span>
            <span>Network Status</span>
          </div>
          <a href="https://wa.me/2348166774566?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20with%20my%20account." className="support-community-button" target="_blank" rel="noreferrer">
            Join WhatsApp Community
            <span>Available Soon</span>
          </a>
        </section>

        <section className="support-channel-section">
          <h2>Direct Support Channels</h2>
          <div className="support-grid">
            {supportChannels.map((item) => (
              item.href === "#" ? (
                <div key={item.title} className={`support-channel-card ${item.tone}`}>
                  <div className="support-channel-icon">{item.tone === "green" ? "💬" : item.tone === "blue" ? "☎" : item.tone === "amber" ? "👨‍💼" : "✉️"}</div>
                  <div className="support-channel-copy">
                    <div className="support-channel-row">
                      <strong>{item.title}</strong>
                      {item.detail === "Available Soon" && <span className="support-soon-tag">AVAILABLE SOON</span>}
                    </div>
                    <small>{item.value}</small>
                    <span>{item.detail}</span>
                  </div>
                </div>
              ) : (
                <a key={item.title} href={item.href} className={`support-channel-card ${item.tone}`} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined}>
                  <div className="support-channel-icon">{item.tone === "green" ? "💬" : item.tone === "blue" ? "☎" : item.tone === "amber" ? "👨‍💼" : "✉️"}</div>
                  <div className="support-channel-copy">
                    <div className="support-channel-row">
                      <strong>{item.title}</strong>
                      {item.detail === "Available Soon" && <span className="support-soon-tag">AVAILABLE SOON</span>}
                    </div>
                    <small>{item.value}</small>
                    <span>{item.detail}</span>
                  </div>
                </a>
              )
            ))}
          </div>
        </section>

        <section className="support-faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="support-faq-list">
            {faqs.map((faq) => (
              <details key={faq.question} className="support-faq-item" open={faq.question === "Data bundle not received after debit?"}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="support-footer-box">
          <span>💬</span>
          <p>AbbaKano Data Sub • Kano State, Nigeria<br />Dedicated to 24/7 VTU Uptime &amp; Support</p>
        </footer>
      </div>

      <WebBottomNav active="profile" />
    </main>
  );
}
