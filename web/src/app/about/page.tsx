import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";

export default function AboutPage() {
  return (
    <CustomerPageLayout active="profile" eyebrow="About" title="About AbbaKano" subtitle="Everyday payments, made simpler." className="profile-page" headerClassName="profile-header">
      <div className="profile-content about-content">
        <section className="profile-section">
          <h2>One wallet. Everyday services.</h2>
          <p className="about-copy">AbbaKano DataSub brings airtime, mobile data, electricity payments, and cable TV renewals together in one account. Review each transaction and keep its receipt in your account history.</p>
        </section>
        <section className="profile-section">
          <h2>Contact</h2>
          <ul className="about-contact">
            <li><a href="mailto:support@abbakano.com">support@abbakano.com</a></li>
            <li><a href="tel:+2348166774566">+234 816 677 4566</a></li>
          </ul>
        </section>
      </div>
    </CustomerPageLayout>
  );
}