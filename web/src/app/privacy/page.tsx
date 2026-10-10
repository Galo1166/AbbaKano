"use client";

import { PublicDocLayout } from "@/components/navigation/PublicDocLayout";

export default function PrivacyPage() {
  return (
    <PublicDocLayout
      eyebrow="Security & Data Protection"
      title="Privacy Policy"
      subtitle="How AbbaKano DataSub collects, uses, and safeguards your personal information."
      lastUpdated="October 2026"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[var(--text)]">Information We Collect</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          Depending on how you use AbbaKano DataSub, we may collect the name, phone number, and email address you provide; details needed to process airtime, data, utility, and wallet transactions; referral activity; and messages you send to customer support.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">How We Use Your Information</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          We use this information to create and secure your wallet account, process the telecommunication services and utility payments you request, maintain ledger and dispute records, respond to support inquiries, and meet applicable regulatory and financial accounting obligations.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">When Information Is Shared</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          We share information with service providers solely as required to operate AbbaKano DataSub and complete transactions - specifically payment infrastructure (Monnify/Paystack), telecom operators (MTN, Airtel, Glo, 9mobile), and utility DISCO networks. We never sell your personal information to third parties.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Security and Data Retention</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          We implement end-to-end 256-bit encryption and authentication standards to protect personal data from unauthorized access, breach, or misuse. Information is retained only as long as necessary to provide service and satisfy legal and auditing requirements.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Your Rights and Inquiries</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          You may review, update, or request deletion of your account records by contacting our customer operations team. Certain financial ledger records must be retained pursuant to Nigerian financial regulations.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Contact Our Data Desk</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          For privacy inquiries or data requests, contact our team directly at{" "}
          <a href="mailto:abbakanocommunicationcenter@gmail.com" className="font-bold text-[var(--primary)] hover:underline">
            abbakanocommunicationcenter@gmail.com
          </a>{" "}
          or telephone{" "}
          <a href="tel:+2348133339850" className="font-bold text-[var(--primary)] hover:underline">
            +234 813 333 9850
          </a>.
        </p>
      </section>
    </PublicDocLayout>
  );
}
