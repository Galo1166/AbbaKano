import { CustomerPageLayout } from "@/components/navigation/CustomerPageLayout";

export default function TermsPage() {
  return (
    <CustomerPageLayout active="profile" eyebrow="Legal" title="Terms of Service" subtitle="Guidelines and terms governing your use of AbbaKano DataSub." className="profile-page" headerClassName="profile-header">
      <div className="profile-content about-content">
        <section className="profile-section">
          <h2>1. Account Usage &amp; Security</h2>
          <p className="about-copy">
            By creating an account on AbbaKano DataSub, you agree to provide accurate information and maintain the security of your password and transaction PIN. You are responsible for all activities that occur under your account credentials.
          </p>
        </section>

        <section className="profile-section">
          <h2>2. Services &amp; Transactions</h2>
          <p className="about-copy">
            AbbaKano DataSub facilitates airtime recharges, data bundle subscriptions, electricity token purchases, and cable TV bill renewals. All successful transactions are non-refundable once delivered by the respective network operators or utility providers.
          </p>
        </section>

        <section className="profile-section">
          <h2>3. Wallet Funding &amp; Withdrawals</h2>
          <p className="about-copy">
            Wallet deposits made via Paystack, automated bank transfer, or dedicated virtual accounts reflect immediately upon settlement. Funds deposited to your wallet are dedicated to VTU and bill payments.
          </p>
        </section>

        <section className="profile-section">
          <h2>4. Support &amp; Dispute Resolution</h2>
          <p className="about-copy">
            In the event of a transaction delay or network failure, our 24/7 resolution desk is available via WhatsApp (+234 816 677 4566) and email (support@abbakano.com).
          </p>
        </section>
      </div>
    </CustomerPageLayout>
  );
}
