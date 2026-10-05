import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";

export default function TermsPage() {
  return (
    <CustomerPageLayout active="profile" eyebrow="Legal" title="Terms and Conditions" subtitle="The terms that apply when you use AbbaKano DataSub." className="profile-page" headerClassName="profile-header">
      <div className="profile-content about-content">
        <section className="profile-section">
          <h2>Acceptance and Eligibility</h2>
          <p className="about-copy">
            By creating an account or using AbbaKano, you agree to these Terms and Conditions and our Privacy Policy. You must provide accurate, current information and be legally able to enter into this agreement. If you do not agree, do not use the service.
          </p>
        </section>

        <section className="profile-section">
          <h2>Your Account and Security</h2>
          <p className="about-copy">
            Keep your sign-in credentials and transaction PIN confidential. You are responsible for activity carried out through your account and must promptly contact support if you suspect unauthorized access. We may restrict access where necessary to protect you, other users, or the service.
          </p>
        </section>

        <section className="profile-section">
          <h2>Services and Transactions</h2>
          <p className="about-copy">
            AbbaKano provides access to airtime, data, electricity, cable TV, wallet, and related services, subject to provider availability. Check the recipient details and service selection before confirming a transaction. Delivery times can depend on external network, payment, or utility providers. A transaction successfully delivered by the relevant provider is generally not reversible by AbbaKano.
          </p>
        </section>

        <section className="profile-section">
          <h2>Wallet Funding and Balances</h2>
          <p className="about-copy">
            Wallet funding is subject to payment-provider processing and settlement. Your available balance may be used for supported AbbaKano transactions. Keep your payment references and contact support if a settled deposit or transaction is not reflected correctly. Any applicable fees or transaction limits will be shown or communicated as part of the relevant service.
          </p>
        </section>

        <section className="profile-section">
          <h2>Acceptable Use</h2>
          <p className="about-copy">
            Do not use AbbaKano for unlawful activity, fraud, unauthorized payments, attempts to disrupt or gain unauthorized access to the service, or infringement of another person&apos;s rights. We may investigate suspected misuse and restrict or suspend accounts when reasonably necessary or required by law.
          </p>
        </section>

        <section className="profile-section">
          <h2>Availability and Third-Party Providers</h2>
          <p className="about-copy">
            AbbaKano relies on third-party payment, telecom, and utility providers. Their systems may be delayed, unavailable, or subject to separate terms. We will make reasonable efforts to provide the service, but cannot guarantee uninterrupted availability or control provider systems.
          </p>
        </section>

        <section className="profile-section">
          <h2>Changes and Account Closure</h2>
          <p className="about-copy">
            We may update these terms as the service or legal requirements change. Updated terms will be posted on this page with a revised effective date where appropriate. You may stop using AbbaKano and request account deletion through your profile. We may suspend or close access for serious or repeated violations or where required to protect the service or comply with law.
          </p>
        </section>

        <section className="profile-section">
          <h2>Support and Disputes</h2>
          <p className="about-copy">
            For help with a transaction or these terms, contact support@abbakano.com. Please include relevant transaction details, but never send your password or transaction PIN. These terms are subject to applicable laws and do not limit rights that cannot legally be excluded.
          </p>
        </section>
      </div>
    </CustomerPageLayout>
  );
}
