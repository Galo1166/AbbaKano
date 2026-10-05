import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";

export default function PrivacyPage() {
  return (
    <CustomerPageLayout active="profile" eyebrow="Legal" title="Privacy Policy" subtitle="How AbbaKano collects, uses, and protects your personal information." className="profile-page" headerClassName="profile-header">
      <div className="profile-content about-content">
        <section className="profile-section">
          <h2>Information We Collect</h2>
          <p className="about-copy">
            Depending on how you use AbbaKano, we may collect the name, phone number, and email address you provide; details needed to process airtime, data, utility, and wallet transactions; referral activity; and messages you send to support.
          </p>
        </section>

        <section className="profile-section">
          <h2>How We Use Your Information</h2>
          <p className="about-copy">
            We use this information to create and secure your account, process the services and payments you request, maintain transaction and referral records, respond to support requests, and meet applicable legal and accounting obligations.
          </p>
        </section>

        <section className="profile-section">
          <h2>When Information Is Shared</h2>
          <p className="about-copy">
            We share information with service providers only as needed to operate AbbaKano and complete your requested transactions—for example, payment, telecom, and utility providers. We do not sell your personal information. Providers may process information under their own privacy terms.
          </p>
        </section>

        <section className="profile-section">
          <h2>Security and Retention</h2>
          <p className="about-copy">
            We use safeguards intended to protect personal information from unauthorized access, loss, or misuse. We keep information only for as long as it is needed to provide the service and meet legal, accounting, and security requirements. No online service can guarantee absolute security.
          </p>
        </section>

        <section className="profile-section">
          <h2>Your Choices and Requests</h2>
          <p className="about-copy">
            You can ask to access or correct your information, or request account deletion, by using the options in your profile or contacting support. Some transaction records may need to be retained where required by law or for legitimate accounting and security purposes.
          </p>
        </section>

        <section className="profile-section">
          <h2>Contact Us</h2>
          <p className="about-copy">
            For privacy questions or data requests, contact our support team at{" "}
            <a href="mailto:support@abbakano.com">support@abbakano.com</a>.
          </p>
        </section>
      </div>
    </CustomerPageLayout>
  );
}
