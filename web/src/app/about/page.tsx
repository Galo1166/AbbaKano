import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";
import Link from "next/link";
import { shouldHideDashboardNavigation } from "@/lib/publicPageNavigation";

const services = [
  {
    title: "Airtime",
    description: "Top up supported mobile networks for yourself or another phone number.",
  },
  {
    title: "Mobile data",
    description: "Choose an available data bundle for the network and recipient you select.",
  },
  {
    title: "Electricity",
    description: "Pay supported electricity providers using the details requested at checkout.",
  },
  {
    title: "Cable TV",
    description: "Renew supported TV subscriptions after confirming the customer account.",
  },
];

const steps = [
  "Create an account with your phone number and set a transaction PIN.",
  "Fund your wallet using an available payment option.",
  "Choose a service, enter the recipient details, and review the order.",
  "Authorize the purchase and follow its status in transaction history.",
];

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const params = await searchParams;
  const hideDashboardNavigation = await shouldHideDashboardNavigation(Promise.resolve(params));
  const from = params.from === "welcome" || params.from === "auth" ? params.from : undefined;
  const sourceQuery = from ? `?from=${from}` : "";

  return (
    <CustomerPageLayout active="profile" eyebrow="About" title="About AbbaKano" subtitle="Everyday payments, made simpler." className="profile-page" headerClassName="profile-header" hideDashboardNavigation={hideDashboardNavigation}>
      <div className="profile-content about-content">
        <section className="about-introduction" aria-labelledby="about-introduction-title">
          <p className="about-kicker">One account for everyday top-ups and bills</p>
          <h2 id="about-introduction-title">Your wallet for connected living.</h2>
          <p className="about-copy">
            AbbaKano Data Sub brings airtime, mobile data, electricity payments, and cable TV renewals together in one account. Add funds, choose a supported service, and keep track of your orders from your transaction history.
          </p>
          <div className="about-actions">
            <Link href="/register" className="about-primary-link">Create an account</Link>
            <Link href={`/support${sourceQuery}`} className="about-secondary-link">Get support</Link>
          </div>
        </section>

        <section className="profile-section" aria-labelledby="about-services-title">
          <h2 id="about-services-title">Services in one place</h2>
          <div className="about-service-list">
            {services.map((service, index) => (
              <article className="about-service-item" key={service.title}>
                <span className="about-service-number">0{index + 1}</span>
                <div>
                  <h3>{service.title}</h3>
                  <p className="about-copy">{service.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="profile-section" aria-labelledby="about-steps-title">
          <h2 id="about-steps-title">How it works</h2>
          <ol className="about-steps">
            {steps.map((step, index) => (
              <li key={step}>
                <span className="about-step-number">{index + 1}</span>
                <p className="about-copy">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="profile-section" aria-labelledby="about-security-title">
          <h2 id="about-security-title">Account security and order updates</h2>
          <p className="about-copy">
            Your account uses a password and transaction PIN, with passkey verification available on supported devices and browsers. Check your transaction history for order status and references. Service availability, prices, and completion times can vary by provider and network.
          </p>
          <p className="about-copy">
            Before confirming a purchase, check the network, phone number, meter or customer number, and selected plan. If an order is delayed or needs review, contact support with its transaction reference.
          </p>
        </section>

        <section className="profile-section about-contact-section" aria-labelledby="about-contact-title">
          <div>
            <h2 id="about-contact-title">Talk to our support team</h2>
            <p className="about-copy">For account, wallet, or transaction help, contact us and include the relevant transaction reference when available.</p>
          </div>
          <ul className="about-contact">
            <li><a href="mailto:support@abbakano.com?subject=AbbaKano%20Support%20Request">Email support@abbakano.com</a></li>
            <li><a href="tel:+2348133339850">Call +234 813 333 9850</a></li>
            <li><a href="https://wa.me/2348166774566?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20with%20my%20account." target="_blank" rel="noreferrer">Message us on WhatsApp</a></li>
          </ul>
        </section>

        <nav className="about-legal-links" aria-label="Legal information">
          <Link href={`/terms${sourceQuery}`}>Terms of Service</Link>
          <Link href={`/privacy${sourceQuery}`}>Privacy Policy</Link>
          <span>AbbaKano Data Sub · Kano State, Nigeria</span>
        </nav>
      </div>
    </CustomerPageLayout>
  );
}