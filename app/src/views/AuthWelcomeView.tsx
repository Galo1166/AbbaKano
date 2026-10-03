import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
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
      {/* Top Bar with Theme Switcher */}
      <View style={styles.topBar}>
        <View />
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

      {/* === HERO SECTION === */}
      <View style={styles.heroSection}>
        <View style={styles.brandMark}>
          <Image
            source={SCREEN_ASSETS.logoEmblem}
            style={styles.brandEmblem}
            resizeMode="cover"
          />
        </View>

        <Text style={[styles.heroTitle, { color: T.onSurface }]}>AbbaKano Data Sub</Text>
        <Text style={[styles.heroSubtitle, { color: T.primary }]}>
          Fast, Affordable Data & Utility Subscriptions
        </Text>
        <Text style={[styles.heroBody, { color: T.onSurfaceVariant }]}>
          Buy MTN, Airtel, Glo & 9mobile SME data instantly at verified wholesale reseller rates. 100% automated delivery.
        </Text>

        {/* Highlight Pills */}
        <View style={styles.highlightsRow}>
          {HIGHLIGHTS.map((h) => (
            <View key={h.icon} style={[styles.highlightPill, {
              backgroundColor: isDark ? 'rgba(238,152,0,0.10)' : 'rgba(238,152,0,0.08)',
              borderColor: isDark ? 'rgba(238,152,0,0.25)' : 'rgba(238,152,0,0.20)',
            }]}>
              <MaterialIcons name={h.icon} size={16} color={T.secondary} />
              <Text style={[styles.highlightPillText, { color: T.secondary }]}>{h.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* === SUPPORTED NETWORK OPERATORS GRID === */}
      <View style={[styles.showcaseCard, { backgroundColor: T.surfaceLow, borderColor: T.border }]}>
        <Text style={[styles.networkGridLabel, { color: T.onSurfaceMuted }]}>
          SUPPORTED NETWORKS
        </Text>
        <View style={styles.networkGrid}>
          {NETWORKS.map((net) => (
            <View
              key={net.id}
              style={[
                styles.networkGridCard,
                {
                  backgroundColor: T.surface,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <View style={[styles.carrierCircle, { backgroundColor: net.color }]}>
                <Image
                  source={net.logo}
                  style={styles.carrierLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.networkCardName, { color: T.onSurface }]}>
                {net.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* === CTA BUTTONS === */}
      <View style={styles.ctaSection}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: T.primaryContainer, shadowColor: T.primary },
            pressed && { opacity: 0.88 },
          ]}
          onPress={onRegisterPress}
        >
          <Text style={styles.primaryBtnText}>Create Free Account</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}
          onPress={onLoginPress}
        >
          <Text style={[styles.secondaryBtnText, { color: T.onSurfaceVariant }]}>
            I already have an account • Sign In
          </Text>
        </Pressable>
      </View>

      {/* Theme Selection Modal */}
      <ThemeSwitchModal visible={showThemeModal} onClose={() => setShowThemeModal(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    paddingBottom: Spacing.two,
  },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Rounded.full,
    borderWidth: 1,
  },
  pressed: { opacity: 0.75 },
  themeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Typography.family,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  brandMark: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.two,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  brandEmblem: {
    width: 76,
    height: 76,
    borderRadius: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: Typography.family,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Typography.family,
    textAlign: 'center',
  },
  heroBody: {
    fontSize: 13,
    fontFamily: Typography.family,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },
  highlightsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Rounded.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  highlightPillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Typography.family,
  },

  // Supported Networks Grid Card
  showcaseCard: {
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
  },
  networkGridLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: Typography.family,
    textAlign: 'center',
  },
  networkGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  networkGridCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: Rounded.lg,
    borderWidth: 1,
  },
  carrierCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  carrierLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  networkCardName: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Typography.family,
  },

  // CTA
  ctaSection: {
    gap: Spacing.three,
  },
  primaryBtn: {
    height: 52,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
  secondaryBtn: {
    height: 44,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Typography.family,
  },
});
