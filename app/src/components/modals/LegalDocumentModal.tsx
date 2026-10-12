import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Rounded, Spacing, Typography } from '@/constants/theme';
import { useTheme, useApp } from '@/context/AppContext';

interface LegalDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  visible,
  onClose,
  initialTab = 'privacy',
}) => {
  const T = useTheme();
  const { isDark } = useApp();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  // Sync tab when opened with initialTab
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: T.surface }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Modal Header */}
        <View style={[styles.header, { borderBottomColor: T.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: T.surfaceHigh }]}>
              <MaterialIcons
                name={activeTab === 'privacy' ? 'privacy-tip' : 'description'}
                size={22}
                color={T.primary}
              />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={[styles.headerTitle, { color: T.onSurface }]} numberOfLines={1}>
                {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: T.onSurfaceMuted }]} numberOfLines={1}>
                AbbaKano Data Sub • NDPR & Legal Compliance
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.closeBtn, { backgroundColor: T.surfaceHigh }]}
            onPress={onClose}
            hitSlop={8}
          >
            <MaterialIcons name="close" size={20} color={T.onSurface} />
          </Pressable>
        </View>

        {/* Tab Switcher */}
        <View style={[styles.tabBar, { backgroundColor: T.surfaceLow, borderColor: T.border }]}>
          <Pressable
            style={[
              styles.tabBtn,
              activeTab === 'privacy' && [styles.tabBtnActive, { backgroundColor: T.surface }],
            ]}
            onPress={() => setActiveTab('privacy')}
          >
            <MaterialIcons
              name="privacy-tip"
              size={16}
              color={activeTab === 'privacy' ? T.primary : T.onSurfaceMuted}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'privacy' ? T.primary : T.onSurfaceMuted },
                activeTab === 'privacy' && styles.tabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              Privacy Policy
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabBtn,
              activeTab === 'terms' && [styles.tabBtnActive, { backgroundColor: T.surface }],
            ]}
            onPress={() => setActiveTab('terms')}
          >
            <MaterialIcons
              name="gavel"
              size={16}
              color={activeTab === 'terms' ? T.primary : T.onSurfaceMuted}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === 'terms' ? T.primary : T.onSurfaceMuted },
                activeTab === 'terms' && styles.tabBtnTextActive,
              ]}
              numberOfLines={1}
            >
              Terms of Service
            </Text>
          </Pressable>
        </View>

        {/* Status / Compliance Pill Row */}
        <View style={styles.badgeRow}>
          <View style={[styles.badgePill, { backgroundColor: 'rgba(0, 208, 132, 0.12)' }]}>
            <MaterialIcons name="verified" size={14} color={T.tertiary} />
            <Text style={[styles.badgeText, { color: T.tertiary }]}>NDPA 2023 Compliant</Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: 'rgba(37, 99, 235, 0.10)' }]}>
            <MaterialIcons name="security" size={14} color={T.primary} />
            <Text style={[styles.badgeText, { color: T.primary }]}>256-Bit SSL Secured</Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: T.surfaceHigh }]}>
            <Text style={[styles.badgeText, { color: T.onSurfaceMuted }]}>Oct 2026 Revision</Text>
          </View>
        </View>

        {/* Scrollable Document Content */}
        <ScrollView
          style={[styles.documentScroll, { backgroundColor: T.canvas }]}
          contentContainerStyle={styles.documentBody}
          showsVerticalScrollIndicator={true}
        >
          {activeTab === 'privacy' ? (
            <PrivacyPolicyContent T={T} />
          ) : (
            <TermsAndConditionsContent T={T} />
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Bottom Floating Dismiss Button */}
        <View style={[styles.footer, { backgroundColor: T.surface, borderTopColor: T.border }]}>
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: T.primary }]}
            onPress={onClose}
          >
            <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
            <Text style={styles.acceptBtnText}>I Understand and Agree</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

/* ── PRIVACY POLICY CONTENT ──────────────────────────────────────────────── */
const PrivacyPolicyContent = ({ T }: { T: any }) => (
  <View style={styles.sectionContainer}>
    <View style={[styles.noticeCard, { backgroundColor: T.surfaceLow, borderColor: T.border }]}>
      <Text style={[styles.noticeTitle, { color: T.onSurface }]}>Summary for Users</Text>
      <Text style={[styles.noticeBody, { color: T.onSurfaceVariant }]}>
        AbbaKano Data Sub ("we", "our", or "us") respects your fundamental right to privacy. We collect only
        the data necessary to authenticate your wallet, deliver your telecommunications & utility services
        instantly, and satisfy financial regulations under the Nigeria Data Protection Act (NDPA 2023).
      </Text>
    </View>

    <LegalSection
      T={T}
      number="1"
      title="Information We Collect"
      content={[
        'Personal Identity Data: Full Name, email address, phone number, and transaction security PIN (which is one-way hashed and salted).',
        'Financial & KYC Information: Tier verification documents, bank virtual account allocations, and funding transaction references required by CBN anti-money laundering frameworks.',
        'Transaction Details: Beneficiary phone numbers, smartcard numbers, meter numbers, transaction timestamps, amount paid, and operator delivery statuses.',
        'Technical & Device Telemetry: IP address, device model, operating system, and push tokens used exclusively to safeguard your wallet against unauthorized logins.',
      ]}
    />

    <LegalSection
      T={T}
      number="2"
      title="How We Use Your Data"
      content={[
        'Automated Service Delivery: Instant processing of MTN, Airtel, Glo, and 9mobile data/airtime, electricity tokens, and cable TV subscriptions.',
        'Wallet Funding & Virtual Accounts: Generating dedicated bank accounts (Moniepoint MFB, Sterling Bank, Wema Bank) through licensed payment aggregators.',
        'Security & Fraud Mitigation: Detecting unauthorized access, multi-device logins, and suspicious transaction velocities.',
        'Customer Support: Resolving failed operator deliveries, network queries, and wallet balance adjustments.',
      ]}
    />

    <LegalSection
      T={T}
      number="3"
      title="Third-Party Partners & Integrations"
      content={[
        'Payment Aggregators: Monnify (TeamApt/Moniepoint) and Paystack for processing wallet fundings and issuing CBN-licensed dedicated accounts.',
        'Telecommunications Carriers: Direct API connections with MTN Nigeria, Airtel Nigeria, Globacom Limited, and 9mobile for top-up provisioning.',
        'Utility Providers: Multichoice (DStv/GOtv), StarTimes, and Nigerian Electricity Distribution Companies (DisCos) for bill payment verification.',
        'We never sell, monetize, or lease your personal information to third-party advertising companies.',
      ]}
    />

    <LegalSection
      T={T}
      number="4"
      title="Data Security & 256-Bit Encryption"
      content={[
        'All client-server communications are guarded by Transport Layer Security (TLS 1.3 / SSL 256-bit).',
        'PIN authentication is stored strictly via cryptographic hashes. No employee, agent, or automated system at AbbaKano has access to your raw 4-digit PIN.',
        'Automated database snapshots, audit logging, and role-based access controls prevent unauthorized tampering.',
      ]}
    />

    <LegalSection
      T={T}
      number="5"
      title="Your Legal Rights (NDPA 2023 & GDPR)"
      content={[
        'Right to Access: You can inspect your complete wallet history and transaction receipts at any time within the History tab.',
        'Right to Rectification: You can update your profile details or request corrections by contacting customer care.',
        'Right to Erasure (Account Deletion): You may permanently delete your AbbaKano account directly inside the app (Profile → Delete Account).',
        'Right to Object: You have the right to withdraw consent for non-essential service notifications.',
      ]}
    />

    <LegalSection
      T={T}
      number="6"
      title="Contact & Data Protection Officer"
      content={[
        'If you have any questions or data inquiries, contact our Data Protection Officer at:',
        'Email: privacy@abbakanodatasub.com.ng',
        'Customer Support WhatsApp: +234 813 333 9850',
        'Office: Kano State, Nigeria',
      ]}
    />
  </View>
);

/* ── TERMS AND CONDITIONS CONTENT ────────────────────────────────────────── */
const TermsAndConditionsContent = ({ T }: { T: any }) => (
  <View style={styles.sectionContainer}>
    <View style={[styles.noticeCard, { backgroundColor: T.surfaceLow, borderColor: T.border }]}>
      <Text style={[styles.noticeTitle, { color: T.onSurface }]}>Agreement Overview</Text>
      <Text style={[styles.noticeBody, { color: T.onSurfaceVariant }]}>
        These Terms govern your access to and use of the AbbaKano Data Sub mobile application and services.
        By creating an account, funding your wallet, or executing any transaction, you agree to be bound
        by these Terms.
      </Text>
    </View>

    <LegalSection
      T={T}
      number="1"
      title="Account Registration & Security"
      content={[
        'You must be at least 18 years of age or possess legal parental/guardian consent to operate an AbbaKano account.',
        'You agree to provide true, accurate, and up-to-date registration information.',
        'You are solely responsible for maintaining the strict confidentiality of your login credentials and 4-digit Transaction PIN.',
        'Any purchase authorized via your PIN is deemed fully authorized by you. Report any unauthorized access immediately.',
      ]}
    />

    <LegalSection
      T={T}
      number="2"
      title="Wallet Funding & Virtual Bank Accounts"
      content={[
        'Dedicated virtual bank accounts (Moniepoint MFB, Sterling Bank, Wema Bank) provided in the app are uniquely allocated for wallet auto-funding.',
        'Bank transfers into your dedicated virtual account reflect automatically within 15–30 seconds under normal banking network operations.',
        'AbbaKano wallet balances do not accrue interest and do not represent a traditional bank savings deposit.',
        'Funds deposited can be utilized at any time for all telecommunications and bill payment services offered in the platform.',
      ]}
    />

    <LegalSection
      T={T}
      number="3"
      title="VTU Transactions & Finality of Purchases"
      content={[
        'Accuracy of Beneficiary Inputs: You are strictly responsible for confirming the recipient phone number, smartcard number, or meter number before confirming with your PIN.',
        'Finality: Successful airtime and data disbursements sent to incorrect numbers provided by you cannot be reversed due to telecommunication operator constraints.',
        'Failed Orders: If a transaction fails due to operator downtime or API timeout, your wallet balance will be automatically refunded without penalty.',
        'Electricity Tokens: Token receipts and generated PINs are permanently preserved in your Transaction History for viewing at any time.',
      ]}
    />

    <LegalSection
      T={T}
      number="4"
      title="Prohibited Activities & Fraud Policy"
      content={[
        'You may not use AbbaKano for money laundering, fraudulent carding, terrorism financing, or unauthorized chargeback attempts.',
        'Any wallet suspected of fraudulent deposits or illegal fund dispersion will be immediately frozen and reported to the Nigerian Financial Intelligence Unit (NFIU) and law enforcement.',
        'Attempting to reverse-engineer, exploit vulnerabilities, or inject automated bot scripts into the application will result in immediate permanent termination.',
      ]}
    />

    <LegalSection
      T={T}
      number="5"
      title="Service Pricing & Commission Structure"
      content={[
        'AbbaKano reserves the right to adjust data bundle and VTU pricing in accordance with telecommunications provider tariff updates.',
        'All applicable transaction charges (if any) are clearly disclosed prior to confirming the transaction with your PIN.',
        'Referral bonuses (₦100 per verified friend) are subject to fair usage verification and first wallet top-up validation.',
      ]}
    />

    <LegalSection
      T={T}
      number="6"
      title="Account Deletion & Suspension"
      content={[
        'You may delete your account at any time via Profile Settings. Upon deletion, personal profile identifiers are removed.',
        'AbbaKano reserves the right to suspend or terminate accounts that breach these Terms or fail regulatory compliance checks.',
      ]}
    />

    <LegalSection
      T={T}
      number="7"
      title="Governing Law & Jurisdiction"
      content={[
        'These Terms and Conditions are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.',
        'Any dispute arising from or related to these Terms will first be submitted to good-faith amicable negotiation through our legal representatives.',
      ]}
    />
  </View>
);

/* ── REUSABLE LEGAL SECTION ──────────────────────────────────────────────── */
const LegalSection = ({
  T,
  number,
  title,
  content,
}: {
  T: any;
  number: string;
  title: string;
  content: string[];
}) => (
  <View style={[styles.legalCard, { backgroundColor: T.surface, borderColor: T.border }]}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionNumberBadge, { backgroundColor: T.primaryContainer }]}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>
      <Text style={[styles.sectionTitle, { color: T.onSurface }]} numberOfLines={1}>
        {title}
      </Text>
    </View>

    <View style={styles.sectionItems}>
      {content.map((item, idx) => (
        <View key={idx} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: T.primary }]} />
          <Text style={[styles.bulletText, { color: T.onSurfaceVariant }]}>{item}</Text>
        </View>
      ))}
    </View>
  </View>
);

/* ── STYLES ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: Typography.family,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    borderRadius: Rounded.xl,
    padding: 3,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Rounded.lg,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  tabBtnTextActive: {
    fontWeight: '800',
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Rounded.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Typography.family,
  },

  documentScroll: {
    flex: 1,
  },
  documentBody: {
    padding: Spacing.four,
  },

  sectionContainer: {
    gap: Spacing.three,
  },
  noticeCard: {
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    gap: 6,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  noticeBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Typography.family,
  },

  legalCard: {
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Typography.family,
    flex: 1,
  },

  sectionItems: {
    gap: Spacing.two,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Typography.family,
    flex: 1,
  },

  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
  },
  acceptBtn: {
    height: 50,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
});
