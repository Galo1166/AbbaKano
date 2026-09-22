import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, Rounded, Spacing, Typography } from '@/constants/theme';
import { SCREEN_ASSETS } from '../../assets/screenAssets';

interface ScreenCatalogItem {
  id: string;
  title: string;
  category: 'Auth & Onboarding' | 'Core Banking' | 'VTU & Utilities' | 'Settings & Rewards';
  lightAsset?: any;
  darkAsset: any;
  description: string;
}

const SCREEN_CATALOG: ScreenCatalogItem[] = [
  {
    id: 'welcome',
    title: 'Welcome & Landing',
    category: 'Auth & Onboarding',
    lightAsset: SCREEN_ASSETS.welcomeLanding,
    darkAsset: SCREEN_ASSETS.welcomeLandingDark,
    description: 'Hero presentation, wholesale value proposition, and customer social proof.',
  },
  {
    id: 'signin',
    title: 'Sign In',
    category: 'Auth & Onboarding',
    lightAsset: SCREEN_ASSETS.signIn,
    darkAsset: SCREEN_ASSETS.signInDark,
    description: 'Biometric/password authentication with device remembrance and glowing emblem.',
  },
  {
    id: 'signup',
    title: 'Sign Up & Register',
    category: 'Auth & Onboarding',
    lightAsset: SCREEN_ASSETS.signUpRegister,
    darkAsset: SCREEN_ASSETS.signUpRegisterDark,
    description: 'User registration with real-time telco prefix detection and tier enrollment.',
  },
  {
    id: 'forgot_password',
    title: 'Forgot Password & Reset PIN',
    category: 'Auth & Onboarding',
    darkAsset: SCREEN_ASSETS.forgotPasswordResetPinDark,
    description: 'Multi-channel OTP recovery (SMS, WhatsApp, Email) and 256-bit encrypted reset.',
  },
  {
    id: 'app_lock',
    title: 'App Lock & 4-Digit PIN',
    category: 'Auth & Onboarding',
    lightAsset: SCREEN_ASSETS.appLockPin,
    darkAsset: SCREEN_ASSETS.appLockPinDark,
    description: 'Hardware-style tactile 3x4 numpad with biometric key and PIN dots.',
  },
  {
    id: 'dashboard',
    title: 'Home Dashboard',
    category: 'Core Banking',
    lightAsset: SCREEN_ASSETS.homeDashboard,
    darkAsset: SCREEN_ASSETS.homeDashboardDark,
    description: 'Master wallet card, balance-masking eye toggle, and quick VTU Hub services.',
  },
  {
    id: 'fund_wallet',
    title: 'Fund Wallet',
    category: 'Core Banking',
    lightAsset: SCREEN_ASSETS.fundWallet,
    darkAsset: SCREEN_ASSETS.fundWalletDark,
    description: 'Dedicated virtual bank accounts (Wema, Moniepoint) with auto-credit engine.',
  },
  {
    id: 'buy_data',
    title: 'Buy Data Bundle',
    category: 'VTU & Utilities',
    lightAsset: SCREEN_ASSETS.buyDataBundle,
    darkAsset: SCREEN_ASSETS.buyDataBundleDark,
    description: 'Network operator selection (MTN, Airtel, Glo, 9mobile) and bundle picker.',
  },
  {
    id: 'bills',
    title: 'Bills & Utilities Portal',
    category: 'VTU & Utilities',
    lightAsset: SCREEN_ASSETS.billsUtilitiesPortal,
    darkAsset: SCREEN_ASSETS.billsUtilitiesPortalDark,
    description: 'DISCO power token generator, meter verification, and cable TV subscription.',
  },
  {
    id: 'checkout',
    title: 'Transaction Confirmation & PIN Checkout',
    category: 'VTU & Utilities',
    lightAsset: SCREEN_ASSETS.transactionConfirmationPinCheckout1,
    darkAsset: SCREEN_ASSETS.transactionConfirmationPinCheckout2,
    description: 'Two-stage modal: fee audit breakdown sheet and secure PIN authentication dialog.',
  },
  {
    id: 'ledger',
    title: 'Transactions & History Ledger',
    category: 'Core Banking',
    lightAsset: SCREEN_ASSETS.transactionsHistory,
    darkAsset: SCREEN_ASSETS.transactionsHistoryDark,
    description: 'Searchable ledger with status pills (Success, Pending, Failed) and receipt preview.',
  },
  {
    id: 'profile',
    title: 'Profile & Settings',
    category: 'Settings & Rewards',
    lightAsset: SCREEN_ASSETS.profileSettings,
    darkAsset: SCREEN_ASSETS.profileSettingsDark,
    description: 'Agent tier verification, KYC compliance, biometric toggles, and security prefs.',
  },
  {
    id: 'refer',
    title: 'Refer & Earn',
    category: 'Settings & Rewards',
    lightAsset: SCREEN_ASSETS.referEarn,
    darkAsset: SCREEN_ASSETS.referEarnDark,
    description: '₦200 bonus program, referral stats, share triggers, and one-tap wallet transfer.',
  },
];

const CATEGORIES = [
  'All',
  'Auth & Onboarding',
  'Core Banking',
  'VTU & Utilities',
  'Settings & Rewards',
] as const;

export default function ExploreScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [previewItem, setPreviewItem] = useState<{ title: string; asset: any } | null>(null);

  const filteredItems = SCREEN_CATALOG.filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.category === selectedCategory;
  });

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={SCREEN_ASSETS.logoEmblem} style={styles.brandEmblem} resizeMode="contain" />
          <View>
            <Text style={styles.headerSubtitle}>STITCH BLUEPRINT</Text>
            <Text style={styles.headerTitle}>All 53 Screens Blueprint</Text>
          </View>
        </View>

        {/* Light / Dark Mode Toggle */}
        <Pressable
          style={styles.themeToggleBtn}
          onPress={() => setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))}
        >
          <MaterialIcons
            name={themeMode === 'dark' ? 'dark-mode' : 'light-mode'}
            size={18}
            color={Palette.primary}
          />
          <Text style={styles.themeToggleText}>
            {themeMode === 'dark' ? 'Dark' : 'Light'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Asset Showcase Ribbon */}
        <View style={styles.brandRibbon}>
          <Text style={styles.ribbonTitle}>ALL NETWORK & CABLE PROVIDER LOGOS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.logoScrollRow}>
            {[
              { label: 'AbbaKano', logo: SCREEN_ASSETS.logoEmblem },
              { label: 'MTN', logo: SCREEN_ASSETS.mtnLogo },
              { label: 'Airtel', logo: SCREEN_ASSETS.airtelLogo },
              { label: 'Glo', logo: SCREEN_ASSETS.gloLogo },
              { label: '9mobile', logo: SCREEN_ASSETS.ninemobileLogo },
              { label: 'DStv', logo: SCREEN_ASSETS.dstvLogo },
              { label: 'GOtv', logo: SCREEN_ASSETS.gotvLogo },
              { label: 'StarTimes', logo: SCREEN_ASSETS.startimesLogo },
            ].map((item) => (
              <View key={item.label} style={styles.logoBadgeBox}>
                <View style={styles.ribbonLogoCircle}>
                  <Image source={item.logo} style={styles.ribbonLogo} resizeMode="contain" />
                </View>
                <Text style={styles.logoBadgeLabel}>{item.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Screen Grid */}
        <View style={styles.screenList}>
          {filteredItems.map((item) => {
            const currentAsset =
              themeMode === 'light' && item.lightAsset
                ? item.lightAsset
                : item.darkAsset;

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.screenCard, pressed && { opacity: 0.88 }]}
                onPress={() => setPreviewItem({ title: item.title, asset: currentAsset })}
              >
                {/* Thumbnail Snapshot Preview */}
                <View style={styles.thumbnailContainer}>
                  <Image
                    source={currentAsset}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  <View style={styles.zoomBadge}>
                    <MaterialIcons name="zoom-in" size={16} color="#FFFFFF" />
                  </View>
                </View>

                {/* Details */}
                <View style={styles.cardDetails}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                    <View style={styles.themeTag}>
                      <Text style={styles.themeTagText}>
                        {themeMode === 'light' && item.lightAsset ? 'LIGHT' : 'DARK'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.verifiedRow}>
                      <MaterialIcons name="verified" size={14} color={Palette.primary} />
                      <Text style={styles.verifiedText}>Pixel-Perfect Stitch Spec</Text>
                    </View>
                    <MaterialIcons name="arrow-forward" size={16} color={Palette.primary} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Fullscreen Snapshot Modal */}
      {previewItem && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{previewItem.title}</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setPreviewItem(null)}
                hitSlop={12}
              >
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.modalImageContainer}>
              <Image
                source={previewItem.asset}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    backgroundColor: Palette.canvas,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  brandEmblem: {
    width: 36,
    height: 36,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.secondary,
    letterSpacing: 0.8,
    fontFamily: Typography.family,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Rounded.full,
    backgroundColor: Palette.surfaceHigh,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },

  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },

  // Brand Ribbon
  brandRibbon: {
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: Spacing.two,
  },
  ribbonTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.onSurfaceMuted,
    letterSpacing: 0.6,
    fontFamily: Typography.family,
  },
  logoScrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: 4,
  },
  logoBadgeBox: {
    alignItems: 'center',
    gap: 6,
  },
  ribbonLogoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Palette.border,
  },
  ribbonLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  logoBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },

  // Filter Chips
  filterChipRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Rounded.full,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primaryContainer,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Screen Cards
  screenList: {
    gap: Spacing.four,
  },
  screenCard: {
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    height: 180,
    backgroundColor: Palette.surfaceLowest,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primary,
    fontFamily: Typography.family,
  },
  themeTag: {
    backgroundColor: Palette.surfaceHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Rounded.full,
  },
  themeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  cardDescription: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    marginTop: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.secondary,
    fontFamily: Typography.family,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    paddingTop: 50,
  },
  modalHeader: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalImageContainer: {
    flex: 1,
    padding: Spacing.two,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});
