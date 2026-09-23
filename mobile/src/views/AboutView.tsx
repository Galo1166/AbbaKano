import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Rounded, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/AppContext';

interface AboutViewProps {
  onBackPress?: () => void;
}

const FEATURES = [
  { icon: 'wifi', title: 'Data and airtime', text: 'Buy affordable data bundles and airtime across all major networks.' },
  { icon: 'receipt-long', title: 'Bills and utilities', text: 'Pay electricity and cable bills from one secure wallet.' },
  { icon: 'account-balance-wallet', title: 'Simple wallet funding', text: 'Fund your wallet with a dedicated account and track every transaction.' },
];

export const AboutView: React.FC<AboutViewProps> = ({ onBackPress }) => {
  const T = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: T.canvas }]}>
      <ScreenHeader
        title="About AbbaKano"
        subtitle="Your everyday digital wallet"
        showBack
        onBackPress={onBackPress}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.identity, { backgroundColor: T.primaryContainer }]}>
          <View style={styles.logo}>
            <MaterialIcons name="account-balance-wallet" size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>AbbaKano</Text>
          <Text style={styles.tagline}>Payments made simple for everyday life.</Text>
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>VERSION 1.0.0</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: T.onSurfaceMuted }]}>What you can do</Text>
        <View style={[styles.featureCard, { backgroundColor: T.surface, borderColor: T.border }]}>
          {FEATURES.map((feature, index) => (
            <View
              key={feature.title}
              style={[
                styles.featureRow,
                index < FEATURES.length - 1 && { borderBottomColor: T.border, borderBottomWidth: 1 },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: T.primaryContainer }]}>
                <MaterialIcons name={feature.icon as keyof typeof MaterialIcons.glyphMap} size={21} color="#FFFFFF" />
              </View>
              <View style={styles.featureCopy}>
                <Text style={[styles.featureTitle, { color: T.onSurface }]}>{feature.title}</Text>
                <Text style={[styles.featureText, { color: T.onSurfaceVariant }]}>{feature.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: T.onSurfaceMuted }]}>Our promise</Text>
        <View style={[styles.promiseCard, { backgroundColor: T.surfaceLow, borderColor: T.border }]}>
          <MaterialIcons name="verified-user" size={25} color={T.tertiary} />
          <Text style={[styles.promiseText, { color: T.onSurfaceVariant }]}>
            AbbaKano is built to make everyday payments clear, reliable, and easy to manage. Your account activity and transaction history stay available whenever you need them.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: T.onSurfaceMuted }]}>Need help?</Text>
          <Text style={[styles.footerText, { color: T.onSurfaceVariant }]}>Open Contact Support from your Profile.</Text>
          <Text style={[styles.copyright, { color: T.onSurfaceMuted }]}>AbbaKano Technologies</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, paddingBottom: Spacing.eight },
  identity: {
    alignItems: 'center',
    borderRadius: Rounded.xl,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: Rounded.xl,
    height: 68,
    justifyContent: 'center',
    marginBottom: Spacing.three,
    width: 68,
  },
  appName: { color: '#FFFFFF', fontFamily: Typography.family, fontSize: 28, fontWeight: '800' },
  tagline: { color: 'rgba(255, 255, 255, 0.82)', fontFamily: Typography.family, fontSize: 13, marginTop: Spacing.one },
  versionPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: Rounded.full,
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  versionText: { color: '#FFFFFF', fontFamily: Typography.family, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  sectionTitle: { fontFamily: Typography.family, fontSize: 12, fontWeight: '700', marginBottom: Spacing.two, marginTop: Spacing.five, textTransform: 'uppercase' },
  featureCard: { borderRadius: Rounded.lg, borderWidth: 1, overflow: 'hidden' },
  featureRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  featureIcon: { alignItems: 'center', borderRadius: Rounded.md, height: 42, justifyContent: 'center', width: 42 },
  featureCopy: { flex: 1 },
  featureTitle: { fontFamily: Typography.family, fontSize: 14, fontWeight: '700' },
  featureText: { fontFamily: Typography.family, fontSize: 12, lineHeight: 18, marginTop: 3 },
  promiseCard: { alignItems: 'flex-start', borderRadius: Rounded.lg, borderWidth: 1, flexDirection: 'row', gap: Spacing.three, padding: Spacing.four },
  promiseText: { flex: 1, fontFamily: Typography.family, fontSize: 13, lineHeight: 20 },
  footer: { alignItems: 'center', paddingTop: Spacing.six },
  footerText: { fontFamily: Typography.family, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  copyright: { fontFamily: Typography.family, fontSize: 11, marginTop: Spacing.five },
});
