"use client";

import { PublicDocLayout } from "@/components/navigation/PublicDocLayout";

export default function TermsPage() {
  return (
    <PublicDocLayout
      eyebrow="Legal & Terms of Service"
      title="Terms and Conditions"
      subtitle="The official terms and conditions governing the use of AbbaKano DataSub."
      lastUpdated="October 2026"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[var(--text)]">Acceptance and Eligibility</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          By registering an account or initiating any transaction on AbbaKano DataSub, you explicitly agree to these Terms and Conditions and our Privacy Policy. You must provide truthful, current identification details and be of legal age to enter into binding agreements.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Account Security and Credentials</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          You are entirely responsible for safeguarding your login credentials and transaction PIN. All transactions authorized using your security PIN or biometric passkeys are considered authorized by you. If you suspect compromise, contact customer support immediately.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Services and Transaction Finality</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          AbbaKano DataSub executes top-ups for data, airtime, electricity utility tokens, and cable television renewals via direct telecommunications gateways. Always verify recipient telephone numbers, meter numbers, or decoder smartcard numbers prior to authorization. Transactions successfully fulfilled by network providers cannot be reversed.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Automated Virtual Accounts & Wallet Liquidity</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          Wallet funding via assigned dedicated virtual accounts (Monnify multi-bank integration) is credited automatically upon interbank clearing. Retain bank transaction session IDs and contact support if a deposit does not reflect within standard clearing windows.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Prohibited Activities</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          You may not use the platform for fraudulent transfers, unauthorized laundering, cyber-attacks, or intentional network interference. Accounts involved in fraudulent operations will be frozen and reported to relevant regulatory authorities.
        </p>
      </section>

      <section className="space-y-3 border-t border-[var(--border)] pt-6">
        <h2 className="text-xl font-bold text-[var(--text)]">Support & Resolution Desk</h2>
        <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed font-normal">
          For transaction questions or dispute resolution, contact our Kano-based support team at{" "}
          <a href="mailto:abbakanocommunicationcenter@gmail.com" className="font-bold text-[var(--primary)] hover:underline">
            abbakanocommunicationcenter@gmail.com
          </a>{" "}
          or WhatsApp desk{" "}
          <a href="https://wa.me/2348133339850" className="font-bold text-[var(--primary)] hover:underline">
            +234 813 333 9850
          </a>.
        </p>
      </section>
    </PublicDocLayout>
  );
}
