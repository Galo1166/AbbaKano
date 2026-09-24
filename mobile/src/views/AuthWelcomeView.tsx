import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Rounded, Spacing, Typography } from '@/constants/theme';
import { SCREEN_ASSETS } from '../../assets/screenAssets';
import { useApp, useTheme } from '@/context/AppContext';
import { ThemeSwitchModal } from '@/components/common/ThemeSwitchModal';

interface AuthWelcomeViewProps {
  onLoginPress: () => void;
  onRegisterPress: () => void;
}

const HIGHLIGHTS = [
  { icon: 'bolt' as const, label: 'Instant Delivery in 10s' },
  { icon: 'lock' as const, label: 'Safe Dedicated Wallet' },
];

const NETWORKS = [
  { id: 'MTN', label: 'MTN', color: '#FFCC00', logo: SCREEN_ASSETS.mtnLogo },
  { id: 'AIRTEL', label: 'Airtel', color: '#E60000', logo: SCREEN_ASSETS.airtelLogo },
  { id: 'GLO', label: 'Glo', color: '#27A844', logo: SCREEN_ASSETS.gloLogo },
  { id: '9MOBILE', label: '9mobile', color: '#84BD00', logo: SCREEN_ASSETS.ninemobileLogo },
];

const SERVICES = [
  { icon: 'signal-wifi-4-bar', label: 'Airtime', desc: 'All networks, instant recharge, no service fee on wallet funding.' },
  { icon: 'wifi', label: 'Data bundles', desc: 'MTN, Airtel, Glo & 9mobile plans at reseller rates.' },
  { icon: 'flash-on', label: 'Electricity', desc: 'Prepaid & postpaid tokens for every major disco.' },
  { icon: 'tv', label: 'Cable TV', desc: 'DStv, GOtv and Startimes — renew or upgrade in seconds.' },
];

const STEPS = [
  { number: '01', title: 'Create your account', desc: 'Register with your phone number and verify in under a minute.' },
  { number: '02', title: 'Fund your wallet', desc: 'Bank transfer, card, or USSD — funds reflect instantly.' },
  { number: '03', title: 'Pay any bill', desc: 'Pick a service, enter details, confirm. Delivery is automatic.' },
];

const BENEFITS = [
  { icon: 'lock', label: 'Secure by default', desc: 'Encrypted transactions and OTP-protected wallet withdrawals.' },
  { icon: 'payments', label: 'Reseller pricing', desc: 'Buy for yourself or resell data and airtime at your own markup.' },
  { icon: 'autorenew', label: 'Auto top-up', desc: 'Schedule recurring recharges so you never run out mid-call.' },
  { icon: 'headset-mic', label: 'Real support', desc: 'A human on WhatsApp when a transaction needs a second look.' },
];

const STATS = [
  { value: '4 networks', label: 'airtime & data covered' },
  { value: '3 discos+', label: 'electricity tokens supported' },
  { value: '99.9%', label: 'uptime on transactions' },
  { value: '24/7', label: 'customer support' },
];

export const AuthWelcomeView: React.FC<AuthWelcomeViewProps> = ({
  onLoginPress,
  onRegisterPress,
}) => {
  const { themePreference, effectiveTheme } = useApp();
  const T = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const isDark = effectiveTheme === 'dark';

  const themeIcon =
    themePreference === 'system' ? 'brightness-auto'
    : effectiveTheme === 'dark' ? 'dark-mode' : 'light-mode';

  const themeLabel =
    themePreference === 'system'
      ? `Auto (${effectiveTheme === 'dark' ? 'Dark' : 'Light'})`
      : effectiveTheme === 'dark' ? 'Dark' : 'Light';

  return (
    <View style={[styles.container, { backgroundColor: T.canvas }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View style={[styles.brandMark, { backgroundColor: T.primary }]}>
              <Image source={SCREEN_ASSETS.logoEmblem} style={styles.brandEmblem} resizeMode="cover" />
            </View>
            <Text style={[styles.brandText, { color: T.onSurface }]}>AbbaKano DataSub</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.themeBtn,
              { backgroundColor: T.surfaceHigh, borderColor: T.border },
              pressed && styles.pressed,
            ]}
            onPress={() => setShowThemeModal(true)}
            hitSlop={8}
            accessible
            accessibilityLabel="Switch theme mode"
          >
            <MaterialIcons name={themeIcon} size={16} color={T.primary} />
            <Text style={[styles.themeBtnText, { color: T.onSurface }]}>{themeLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.heroSection}>
          <Text style={[styles.eyebrow, { color: T.secondary }]}>Kano-built, Nigeria-wide</Text>
          <Text style={[styles.heroTitle, { color: T.onSurface }]}>One wallet for airtime, data, and every bill you owe</Text>
          <Text style={[styles.heroBody, { color: T.onSurfaceVariant }]}>AbbaKano DataSub tops up any network, pays your electricity and cable TV, and settles exam pins — instantly, at rates that don't eat your margin.</Text>

          <View style={styles.heroCtas}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: T.primaryContainer, shadowColor: T.primary },
                pressed && { opacity: 0.9 },
              ]}
              onPress={onRegisterPress}
            >
              <Text style={styles.primaryBtnText}>Fund your wallet</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: T.border, backgroundColor: 'transparent' },
                pressed && { opacity: 0.8 },
              ]}
              onPress={onLoginPress}
            >
              <Text style={[styles.secondaryBtnText, { color: T.onSurface }]}>See all services</Text>
            </Pressable>
          </View>

          <View style={styles.storeBadges}>
            <Pressable style={[styles.storeBadge, { backgroundColor: '#0B0C10', borderColor: 'rgba(255,255,255,0.14)' }]}>
              <MaterialIcons name="apple" size={20} color="#FFFFFF" />
              <Text style={styles.storeBadgeText}>App Store</Text>
            </Pressable>
            <Pressable style={[styles.storeBadge, { backgroundColor: '#0B0C10', borderColor: 'rgba(255,255,255,0.14)' }]}>
              <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
              <Text style={styles.storeBadgeText}>Google Play</Text>
            </Pressable>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Text style={[styles.trustValue, { color: T.onSurface }]}> &lt;10 sec </Text>
              <Text style={[styles.trustLabel, { color: T.onSurfaceVariant }]}>average delivery time</Text>
            </View>
            <View style={styles.trustItem}>
              <Text style={[styles.trustValue, { color: T.onSurface }]}>24/7</Text>
              <Text style={[styles.trustLabel, { color: T.onSurfaceVariant }]}>support on WhatsApp & call</Text>
            </View>
          </View>
        </View>

        <View style={[styles.receiptCard, { backgroundColor: T.surface, borderColor: T.border }]}> 
          <View style={styles.receiptHeader}>
            <Text style={[styles.receiptTitle, { color: T.onSurface }]}>Transaction receipt</Text>
            <Text style={[styles.receiptId, { color: T.onSurfaceMuted }]}>#AB-88214</Text>
          </View>
          <View style={[styles.receiptRow, { borderBottomColor: T.border }]}>
            <Text style={[styles.receiptLabel, { color: T.onSurfaceVariant }]}>MTN Data — 2GB</Text>
            <Text style={[styles.receiptAmount, { color: T.onSurface }]}>₦1,450</Text>
          </View>
          <View style={[styles.receiptRow, { borderBottomColor: T.border }]}>
            <Text style={[styles.receiptLabel, { color: T.onSurfaceVariant }]}>IKEDC Electricity</Text>
            <Text style={[styles.receiptAmount, { color: T.onSurface }]}>₦8,000</Text>
          </View>
          <View style={[styles.receiptRow, { borderBottomColor: T.border }]}>
            <Text style={[styles.receiptLabel, { color: T.onSurfaceVariant }]}>GOtv Max — 1 month</Text>
            <Text style={[styles.receiptAmount, { color: T.onSurface }]}>₦6,200</Text>
          </View>
          <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.receiptLabel, { color: T.onSurfaceVariant }]}>Airtel Airtime</Text>
            <Text style={[styles.receiptAmount, { color: T.onSurface }]}>₦1,000</Text>
          </View>
          <View style={[styles.receiptStatus, { backgroundColor: isDark ? 'rgba(0, 208, 132, 0.15)' : 'rgba(5, 150, 105, 0.12)' }]}>
            <Text style={[styles.receiptStatusText, { color: T.tertiary }]}>Delivered successfully</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: T.onSurface }]}>Every bill, one screen</Text>
          <Text style={[styles.sectionSubtitle, { color: T.onSurfaceVariant }]}>No app-switching, no queues. Pick a service, confirm, done.</Text>
          <View style={styles.serviceGrid}>
            {SERVICES.map((service) => (
              <View key={service.label} style={[styles.serviceCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                <View style={[styles.serviceIcon, { backgroundColor: T.primary, shadowColor: T.primary }]}>
                  <MaterialIcons name={service.icon as any} size={18} color="#FFFFFF" />
                </View>
                <Text style={[styles.serviceTitle, { color: T.onSurface }]}>{service.label}</Text>
                <Text style={[styles.serviceDesc, { color: T.onSurfaceVariant }]}>{service.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: T.onSurface }]}>How it works</Text>
          <Text style={[styles.sectionSubtitle, { color: T.onSurfaceVariant }]}>From sign-up to your first successful top-up, three steps.</Text>
          <View style={styles.stepsGrid}>
            {STEPS.map((step) => (
              <View key={step.number} style={[styles.stepCard, { borderTopColor: T.primary }]}>
                <Text style={[styles.stepNumber, { color: T.primary }]}>{step.number}</Text>
                <Text style={[styles.stepTitle, { color: T.onSurface }]}>{step.title}</Text>
                <Text style={[styles.stepDesc, { color: T.onSurfaceVariant }]}>{step.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.statsBand, { backgroundColor: T.primaryContainer }]}>
          {STATS.map((stat) => (
            <View key={stat.value} style={styles.statItem}>
              <Text style={[styles.statValue, { color: T.secondary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: '#DDE8FF' }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: T.onSurface }]}>Why people stick with AbbaKano</Text>
          <Text style={[styles.sectionSubtitle, { color: T.onSurfaceVariant }]}>Built for the way Nigerians actually pay bills — fast, reliable, and fair on price.</Text>
          <View style={styles.serviceGrid}>
            {BENEFITS.map((item) => (
              <View key={item.label} style={[styles.serviceCard, { backgroundColor: T.surface, borderColor: T.border }]}>
                <View style={[styles.serviceIcon, { backgroundColor: T.secondaryContainer, shadowColor: T.secondary }]}>
                  <MaterialIcons name={item.icon as any} size={18} color={T.secondary} />
                </View>
                <Text style={[styles.serviceTitle, { color: T.onSurface }]}>{item.label}</Text>
                <Text style={[styles.serviceDesc, { color: T.onSurfaceVariant }]}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.ctaBand}>
          <Text style={[styles.ctaTitle, { color: T.onSurface }]}>Stop juggling apps for every bill</Text>
          <Text style={[styles.ctaBody, { color: T.onSurfaceVariant }]}>Create your AbbaKano DataSub account and fund your first wallet in minutes.</Text>
          <View style={styles.heroCtas}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: T.primaryContainer, shadowColor: T.primary },
                pressed && { opacity: 0.9 },
              ]}
              onPress={onRegisterPress}
            >
              <Text style={styles.primaryBtnText}>Get started free</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: T.border },
                pressed && { opacity: 0.8 },
              ]}
              onPress={onLoginPress}
            >
              <Text style={[styles.secondaryBtnText, { color: T.onSurface }]}>Talk to support</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <ThemeSwitchModal visible={showThemeModal} onClose={() => setShowThemeModal(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.six,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brandEmblem: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  pressed: { opacity: 0.75 },
  themeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Typography.family,
  },

  heroSection: {
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    fontFamily: Typography.family,
    letterSpacing: -0.6,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Typography.family,
  },
  heroCtas: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
  secondaryBtn: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
  storeBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: Spacing.one,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  storeBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 22,
    flexWrap: 'wrap',
    marginTop: Spacing.two,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.35)',
  },
  trustItem: {
    gap: 2,
  },
  trustValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  trustLabel: {
    fontSize: 12,
    fontFamily: Typography.family,
  },

  receiptCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: Spacing.six,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.35)',
    marginBottom: 10,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  receiptId: {
    fontSize: 12,
    fontFamily: Typography.family,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  receiptLabel: {
    fontSize: 13,
    fontFamily: Typography.family,
    flexShrink: 1,
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  receiptStatus: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Typography.family,
  },

  section: {
    marginBottom: Spacing.six,
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    fontFamily: Typography.family,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Typography.family,
    marginBottom: Spacing.four,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  serviceCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Typography.family,
    marginBottom: 6,
  },
  serviceDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.family,
  },

  stepsGrid: {
    gap: 18,
  },
  stepCard: {
    borderTopWidth: 2,
    paddingTop: 16,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Typography.family,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Typography.family,
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.family,
  },

  statsBand: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: Spacing.six,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    width: '48%',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: Typography.family,
  },

  ctaBand: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    marginBottom: Spacing.two,
  },
  ctaTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: Typography.family,
    marginBottom: 8,
  },
  ctaBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: Typography.family,
    marginBottom: 18,
  },
});
