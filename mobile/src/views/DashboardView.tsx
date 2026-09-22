import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PaletteType, Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { ThemeSwitchModal } from '@/components/common/ThemeSwitchModal';
import { SCREEN_ASSETS } from '../../assets/screenAssets';

interface DashboardViewProps {
  onNavigateTab: (tab: 'home' | 'vtu' | 'ledger' | 'account') => void;
  onSelectService: (serviceKey: string) => void;
  onNavigateToSupport?: () => void;
}

const VTU_HUB_ITEMS = [
  {
    key: 'data',
    icon: 'cell-tower' as const,
    title: 'Data Bundles',
    subtitle: 'SME, Gifting & Corp',
    badge: null,
  },
  {
    key: 'airtime',
    icon: 'phone-in-talk' as const,
    title: 'Airtime Topup',
    subtitle: 'Instant Topup',
    badge: null,
  },
  {
    key: 'electricity',
    icon: 'electric-meter' as const,
    title: 'Electricity',
    subtitle: 'AEDC/IKEDC',
    badge: null,
  },
  {
    key: 'cable',
    icon: 'live-tv' as const,
    title: 'Cable TV',
    subtitle: 'DSTV, GOTV & Star',
    badge: null,
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onSelectService,
  onNavigateToSupport,
}) => {
  const {
    user,
    mainBalance,
    isBalanceMasked,
    toggleBalanceMask,
    theme: Palette,
    themePreference,
    effectiveTheme,
  } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const themeIcon =
    themePreference === 'system'
      ? 'brightness-auto'
      : effectiveTheme === 'dark'
      ? 'dark-mode'
      : 'light-mode';

  const themeBadge =
    themePreference === 'system' ? 'A' : effectiveTheme === 'dark' ? 'D' : 'L';

  const formattedBalance = mainBalance.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleSupportPress = () => {
    if (onNavigateToSupport) {
      onNavigateToSupport();
    } else {
      Linking.openURL('https://wa.me/2348034992810');
    }
  };

  return (
    <>
      <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* === WELCOME & TOP ACTION BUTTONS === */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeLeftRow}>
          <View style={styles.logoContainer}>
            <Image
              source={SCREEN_ASSETS.logoEmblem}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeLabel}>Welcome back,</Text>
            <View style={styles.welcomeGreetingRow}>
              <Text style={styles.welcomeGreeting}>
                {user.name.split(' ')[0]}
              </Text>
              <MaterialCommunityIcons name="hand-wave-outline" size={18} color={Palette.secondaryLight} />
            </View>
          </View>
        </View>

        <View style={styles.topActions}>
          {/* Support Icon */}
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={handleSupportPress}
            hitSlop={8}
            accessible
            accessibilityLabel="Contact Support"
          >
            <MaterialIcons name="headset-mic" size={20} color={Palette.onSurfaceVariant} />
          </Pressable>

          {/* Theme Toggler */}
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => setShowThemeModal(true)}
            hitSlop={8}
            accessible
            accessibilityLabel="Switch Theme (System, Dark, Light)"
          >
            <MaterialIcons name={themeIcon} size={20} color={Palette.primary} />
            <View style={[styles.themeIndicatorBadge, { backgroundColor: 'rgba(37,99,235,0.25)', borderColor: Palette.primary }]}>
              <Text style={[styles.themeIndicatorText, { color: Palette.primary, fontFamily: Typography.family }]}>
                {themeBadge}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* === MASTER WALLET CARD === */}
      <LinearGradient
        colors={
          effectiveTheme === 'dark'
            ? ['#1C202C', '#141722']
            : ['#FFFFFF', '#F0F5FF', '#E4EDFD']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.walletCard,
          effectiveTheme === 'light' && styles.walletCardLight,
        ]}
      >
        <View style={styles.walletCardHeader}>
          <Text style={styles.walletLabel}>Wallet Balance</Text>
          <View style={styles.instantBadge}>
            <View style={styles.instantDot} />
            <Text style={styles.instantText}>Instant Active</Text>
          </View>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceCurrency}>₦</Text>
          <Text style={styles.balanceAmount}>
            {isBalanceMasked ? '••••••••' : formattedBalance}
          </Text>
          <Pressable onPress={toggleBalanceMask} hitSlop={12} style={styles.eyeBtn}>
            <MaterialIcons
              name={isBalanceMasked ? 'visibility-off' : 'visibility'}
              size={20}
              color={Palette.onSurfaceVariant}
            />
          </Pressable>
        </View>

        <View style={styles.walletActions}>
          <Pressable
            style={({ pressed }) => [styles.walletActionBtn, styles.fundBtn, pressed && { opacity: 0.85 }]}
            onPress={() => onNavigateTab('home')}
          >
            <MaterialIcons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.fundBtnText}>Fund Wallet</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.walletActionBtn, styles.instantSubBtn, pressed && { opacity: 0.85 }]}
            onPress={() => onSelectService('data')}
          >
            <MaterialIcons name="bolt" size={18} color={Palette.primary} />
            <Text style={styles.instantSubBtnText}>Instant Sub</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {/* === VTU HUB (2×2 Grid) === */}
      <View style={styles.vtuHubSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.vtuHubTitle}>VTU Hub</Text>
          <Text style={styles.sectionCategoryMuted}>Services</Text>
        </View>
        <View style={styles.vtuHubGrid}>
          {VTU_HUB_ITEMS.map((item) => (
            <Pressable
              key={item.key}
              style={({ pressed }) => [styles.vtuHubCard, pressed && { opacity: 0.8 }]}
              onPress={() => {
                onSelectService(item.key);
              }}
            >
              <View style={styles.vtuHubIconBox}>
                <MaterialIcons name={item.icon as any} size={26} color={Palette.primary} />
              </View>
              <Text style={styles.vtuHubCardTitle}>{item.title}</Text>
              <Text style={styles.vtuHubCardSubtitle}>{item.subtitle}</Text>
              {item.badge && (
                <View style={styles.vtuBadge}>
                  <Text style={styles.vtuBadgeText}>{item.badge}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* === 24/7 SUPPORT DESK === */}
      <View style={styles.supportCard}>
        <View style={styles.supportIconBox}>
          <MaterialIcons name="support-agent" size={24} color={Palette.tertiary} />
        </View>
        <View style={styles.supportInfo}>
          <Text style={styles.supportTitle}>24/7 Resolution Desk</Text>
          <Text style={styles.supportSubtitle}>WhatsApp, Phone Calls & Email Support</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.chatBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSupportPress}
        >
          <MaterialIcons name="headset-mic" size={16} color={Palette.onSecondary} />
          <Text style={styles.chatBtnText}>Help</Text>
        </Pressable>
      </View>

      {/* Bottom padding for nav bar */}
      <View style={{ height: 100 }} />
    </ScrollView>

    <ThemeSwitchModal
      visible={showThemeModal}
      onClose={() => setShowThemeModal(false)}
    />
  </>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },

  // Welcome & Top Actions
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  welcomeLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: Rounded.lg,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  brandLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeLabel: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  welcomeGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  welcomeGreeting: {
    fontSize: 22,
    color: Palette.onSurface,
    fontFamily: Typography.family,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: Rounded.xl,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    position: 'relative',
  },
  actionBtnPressed: {
    opacity: 0.75,
  },
  themeIndicatorBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  themeIndicatorText: {
    fontSize: 7,
    fontWeight: '900',
  },

  // Wallet Card
  walletCard: {
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.borderHigh,
    marginBottom: Spacing.five,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  walletCardLight: {
    borderColor: 'rgba(37, 99, 235, 0.16)',
    shadowColor: '#2563EB',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  walletCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: Typography.family,
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 208, 132, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 208, 132, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Rounded.full,
  },
  instantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.tertiary,
  },
  instantText: {
    fontSize: 10,
    color: Palette.tertiary,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  balanceCurrency: {
    fontSize: 22,
    color: Palette.onSurface,
    fontWeight: '800',
    fontFamily: Typography.family,
    marginRight: 2,
  },
  balanceAmount: {
    fontSize: 32,
    color: Palette.onSurface,
    fontWeight: '800',
    fontFamily: Typography.family,
    letterSpacing: -0.5,
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
  },
  walletActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  walletActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: Rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fundBtn: {
    backgroundColor: Palette.primaryContainer,
  },
  fundBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: Typography.family,
  },
  instantSubBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
  },
  instantSubBtnText: {
    color: Palette.primary,
    fontWeight: '700',
    fontSize: 13,
    fontFamily: Typography.family,
  },

  // VTU Hub
  vtuHubSection: {
    marginBottom: Spacing.five,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sectionCategoryMuted: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
    fontWeight: '500',
  },
  vtuHubTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    letterSpacing: -0.2,
  },
  vtuHubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  vtuHubCard: {
    width: '48%',
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
    position: 'relative',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  vtuHubIconBox: {
    width: 44,
    height: 44,
    borderRadius: Rounded.lg,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  vtuHubCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    marginBottom: 2,
  },
  vtuHubCardSubtitle: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    lineHeight: 15,
  },
  vtuBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(238, 152, 0, 0.15)',
    borderRadius: Rounded.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(238, 152, 0, 0.35)',
  },
  vtuBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Palette.secondary,
    fontFamily: Typography.family,
    letterSpacing: 0.4,
  },

  // WhatsApp Support
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.four,
  },
  supportIconBox: {
    width: 44,
    height: 44,
    borderRadius: Rounded.xl,
    backgroundColor: 'rgba(0, 208, 132, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportInfo: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  supportSubtitle: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    marginTop: 2,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.secondary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Rounded.xl,
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSecondary,
    fontFamily: Typography.family,
  },
});
