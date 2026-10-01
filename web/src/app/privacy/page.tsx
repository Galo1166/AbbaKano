import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";

export default function PrivacyPage() {
  return (
    <CustomerPageLayout active="profile" eyebrow="Legal" title="Privacy Policy" subtitle="How we handle, protect, and respect your personal information." className="profile-page" headerClassName="profile-header">
      <div className="profile-content about-content">
        <section className="profile-section">
          <h2>1. Information We Collect</h2>
          <p className="about-copy">
            We collect the information you provide during registration and wallet usage, including your name, phone number, email address, and transaction records. We do not store raw transaction PINs or payment card details.
          </p>
        </section>

        <section className="profile-section">
          <h2>2. How We Use Your Information</h2>
          <p className="about-copy">
            Your information is used solely to deliver telecom and utility services, authenticate your transactions, credit your referral commissions, and provide customer support. We do not sell or lease your personal information to third parties.
          </p>
        </section>

        <section className="profile-section">
          <h2>3. Data Protection &amp; Security</h2>
          <p className="about-copy">
            We implement 256-bit encryption, strict CSRF validation, salted password hashes, and NDPR-compliant security practices to keep your account and wallet safe from unauthorized access.
          </p>
        </section>

        <section className="profile-section">
          <h2>4. Inquiries &amp; Rights</h2>
          <p className="about-copy">
            You may request information regarding your stored data or request account assistance anytime by contacting our support team at support@abbakano.com.
          </p>
        </section>
      </div>
    </CustomerPageLayout>
  );
}
