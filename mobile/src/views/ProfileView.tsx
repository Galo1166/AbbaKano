import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp, useTheme } from '@/context/AppContext';
import { ThemeSwitchModal } from '@/components/common/ThemeSwitchModal';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SignOutModal } from '@/components/common/SignOutModal';
import { apiRequest } from '@/lib/api';
import { disableBiometricDevice, registerBiometricDevice, supportsBiometrics } from '@/lib/biometricAuth';

interface ProfileViewProps {
  onNavigateToReferEarn?: () => void;
  onNavigateToFundWallet?: () => void;
  onNavigateToSupport?: () => void;
  onNavigateToPinSetup?: () => void;
  onSignOut?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onNavigateToReferEarn,
  onNavigateToFundWallet,
  onNavigateToSupport,
  onNavigateToPinSetup,
  onSignOut,
}) => {
  const { user, mainBalance, themePreference, effectiveTheme, refreshServerState } = useApp();
  const T = useTheme();
  const displayPhone = user.phone.replace(/^(?:\+?234|0)/, (prefix) => prefix.includes('234') ? '+234 ' : '0');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [biometrics, setBiometrics] = useState(user.biometricsEnabled !== false);
  const [appLock, setAppLock] = useState(user.appLockEnabled !== false);

  useEffect(() => {
    setBiometrics(user.biometricsEnabled !== false);
    setAppLock(user.appLockEnabled !== false);
  }, [user.biometricsEnabled, user.appLockEnabled]);

  const menuItems = useMemo(() => [
    { id: 'beneficiaries', icon: 'contacts', title: 'Saved Beneficiaries', subtitle: 'Manage frequent numbers for MTN, Airtel, Glo, 9mobile', section: 'Account' },
    { id: 'refer', icon: 'card-giftcard', title: 'Refer & Earn', subtitle: "Earn ₦200 for each friend's first data top-up", badge: '₦200 BONUS', section: 'Referral & Rewards' },
    { id: 'change_pin', icon: 'pin', title: 'Change Transaction PIN', subtitle: '4-digit wallet security PIN', section: 'Security & Preferences' },
    { id: 'biometrics', icon: 'fingerprint', title: 'Biometrics Login', subtitle: 'Face ID / Fingerprint unlock', section: 'Security & Preferences', hasToggle: true },
    { id: 'app_lock', icon: 'lock', title: 'App Lock PIN', subtitle: 'Screen lock security timeout', section: 'Security & Preferences', hasToggle: true },
    {
      id: 'theme_appearance',
      icon: themePreference === 'system' ? 'brightness-auto' : effectiveTheme === 'dark' ? 'dark-mode' : 'light-mode',
      title: 'Theme & Appearance',
      subtitle: themePreference === 'system'
        ? `Auto (System detects ${effectiveTheme === 'dark' ? 'Dark' : 'Light'})`
        : themePreference === 'dark' ? 'Obsidian Dark Mode active' : 'High-Contrast Light Mode active',
      badge: themePreference === 'system' ? 'AUTO' : effectiveTheme.toUpperCase(),
      section: 'Security & Preferences',
      hasToggle: false,
    },
    { id: 'support', icon: 'support-agent', title: 'Contact Support', subtitle: '24/7 WhatsApp & in-app chat', section: 'Help & Support' },
    { id: 'about', icon: 'info', title: 'About AbbaKano', subtitle: 'Version 1.0.0 • Build 2025.02.25', section: 'Help & Support' },
    { id: 'logout', icon: 'logout', title: 'Sign Out', subtitle: 'Exit your wallet session safely', section: 'Account Actions', danger: true },
  ], [themePreference, effectiveTheme]);

  const getToggleState = (id: string) => {
    if (id === 'biometrics') return biometrics;
    if (id === 'app_lock') return appLock;
    return false;
  };

  const handleToggle = (id: string) => {
    const setting = id === 'biometrics' ? 'biometricsEnabled' : id === 'app_lock' ? 'appLockEnabled' : null;
    if (!setting) return;
    const nextValue = setting === 'biometricsEnabled' ? !biometrics : !appLock;
    if (setting === 'biometricsEnabled' && nextValue && !supportsBiometrics()) {
      Alert.alert('Biometrics unavailable', 'Biometric login is available on iOS and Android devices, not in the web app.');
      return;
    }
    if (setting === 'biometricsEnabled') setBiometrics(nextValue);
    else setAppLock(nextValue);

    void (setting === 'biometricsEnabled' && nextValue
      ? registerBiometricDevice()
      : setting === 'biometricsEnabled'
        ? disableBiometricDevice()
        : Promise.resolve()
    ).then(() => apiRequest('/me/security-settings', {
      method: 'PATCH',
      body: JSON.stringify({ [setting]: nextValue }),
    })).then(() => refreshServerState()).catch(() => {
      if (setting === 'biometricsEnabled') setBiometrics(!nextValue);
      else setAppLock(!nextValue);
      Alert.alert('Update failed', 'Could not save this security setting.');
    });
  };

  const handleMenuPress = (id: string) => {
    if (id === 'theme_appearance') setShowThemeModal(true);
    else if (id === 'refer') onNavigateToReferEarn?.();
    else if (id === 'change_pin') onNavigateToPinSetup?.();
    else if (id === 'support') {
      if (onNavigateToSupport) onNavigateToSupport();
    }
    else if (id === 'logout') {
      setShowSignOutModal(true);
    } else {
      Alert.alert('Coming Soon', 'This feature will be available in the next update.');
    }
  };

  const sections = useMemo(() => {
    const map: { [key: string]: typeof menuItems } = {};
    menuItems.forEach((item) => {
      if (!map[item.section]) map[item.section] = [];
      map[item.section].push(item);
    });
    return Object.entries(map);
  }, [menuItems]);

  return (
    <>
      <ScreenHeader
        title="Profile"
        subtitle="Account & Security Settings"
      />
      <ScrollView
        style={[styles.container, { backgroundColor: T.canvas }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* === PROFILE HERO CARD === */}
        <View style={[styles.profileCard, { backgroundColor: T.surfaceLow, borderColor: T.border }]}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarCircle, { backgroundColor: T.primaryContainer }]}>
                <Text style={styles.avatarInitials}>
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
              <View style={[styles.onlineRing, { backgroundColor: T.tertiary, borderColor: T.surfaceLow }]} />
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.profileName, { color: T.onSurface }]}>{user.name}</Text>
              </View>
              <Text style={[styles.profileContact, { color: T.onSurfaceVariant, marginTop: 4 }]}>
                {displayPhone || 'Phone not available'} • {user.email || 'Email not available'}
              </Text>
            </View>

          </View>

          {/* Balance Row */}
          <View style={[styles.profileBalanceRow, { backgroundColor: T.surface }]}>
            <View style={styles.profileBalance}>
              <View style={styles.profileBalanceIconBox}>
                <MaterialIcons name="account-balance-wallet" size={18} color={T.tertiary} />
              </View>
              <View>
                <Text style={[styles.profileBalanceLabel, { color: T.onSurfaceMuted }]}>Master Wallet Balance</Text>
                <Text style={[styles.profileBalanceAmount, { color: T.onSurface }]}>
                  ₦{mainBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
            <Pressable style={[styles.fundAccountBtn, { backgroundColor: T.primaryContainer }]} onPress={onNavigateToFundWallet}>
              <MaterialIcons name="add-circle" size={16} color="#FFFFFF" />
              <Text style={styles.fundAccountBtnText}>+ Fund Account</Text>
            </Pressable>
          </View>
        </View>

        {/* === PROFILE MENU SECTIONS === */}
        {sections.map(([section, items]) => (
          <View key={section} style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: T.onSurfaceMuted }]}>{section}</Text>
            <View style={[styles.menuCard, { backgroundColor: T.surface, borderColor: T.border }]}>
              {items.map((item, idx) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.menuItem,
                    idx < items.length - 1 && [styles.menuItemBorder, { borderBottomColor: T.border }],
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => {
                    if (item.hasToggle) handleToggle(item.id);
                    else handleMenuPress(item.id);
                  }}
                >
                  <View style={[styles.menuIconBox, item.danger && styles.menuIconDanger]}>
                    <MaterialIcons name={item.icon as any} size={20} color={item.danger ? T.error : T.primary} />
                  </View>
                  <View style={styles.menuItemInfo}>
                    <View style={styles.menuItemTitleRow}>
                      <Text style={[styles.menuItemTitle, { color: item.danger ? T.error : T.onSurface }]}>
                        {item.title}
                      </Text>
                      {item.badge && (
                        <View style={styles.menuBadge}>
                          <Text style={[styles.menuBadgeText, { color: T.secondary }]}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.menuItemSubtitle, { color: T.onSurfaceVariant }]}>{item.subtitle}</Text>
                  </View>
                  {item.hasToggle ? (
                    <View style={[styles.toggle, { backgroundColor: getToggleState(item.id) ? T.primary : T.surfaceHigh }]}>
                      <View style={[styles.toggleThumb, {
                        backgroundColor: getToggleState(item.id) ? '#FFFFFF' : T.onSurfaceMuted,
                        alignSelf: getToggleState(item.id) ? 'flex-end' : 'flex-start',
                      }]} />
                    </View>
                  ) : !item.danger ? (
                    <MaterialIcons name="chevron-right" size={20} color={T.onSurfaceMuted} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <ThemeSwitchModal visible={showThemeModal} onClose={() => setShowThemeModal(false)} />
      <SignOutModal
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirmSignOut={() => onSignOut?.()}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },

  profileCard: { borderRadius: Rounded.xl, padding: Spacing.four, borderWidth: 1, gap: Spacing.four },
  profileTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  avatarWrapper: { position: 'relative' },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', fontFamily: Typography.family },
  onlineRing: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  profileInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  profileName: { fontSize: 18, fontWeight: '700', fontFamily: Typography.family },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(238,152,0,0.12)', borderRadius: Rounded.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  tierBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: Typography.family },
  profileContact: { fontSize: 12, fontFamily: Typography.family, lineHeight: 16 },

  profileBalanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Rounded.xl, padding: Spacing.three },
  profileBalance: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  profileBalanceIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,208,132,0.12)', alignItems: 'center', justifyContent: 'center' },
  profileBalanceLabel: { fontSize: 11, fontFamily: Typography.family },
  profileBalanceAmount: { fontSize: 16, fontWeight: '800', fontFamily: Typography.family },
  fundAccountBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Rounded.xl, paddingHorizontal: 14, paddingVertical: 8 },
  fundAccountBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: Typography.family },

  menuSection: { gap: Spacing.two },
  menuSectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: Typography.family, paddingHorizontal: 4 },
  menuCard: { borderRadius: Rounded.xl, borderWidth: 1, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four },
  menuItemBorder: { borderBottomWidth: 1 },
  menuIconBox: { width: 40, height: 40, borderRadius: Rounded.xl, backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuIconDanger: { backgroundColor: 'rgba(239,68,68,0.10)' },
  menuItemInfo: { flex: 1, gap: 2 },
  menuItemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuItemTitle: { fontSize: 14, fontWeight: '700', fontFamily: Typography.family },
  menuBadge: { backgroundColor: 'rgba(238,152,0,0.15)', borderRadius: Rounded.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(238,152,0,0.3)' },
  menuBadgeText: { fontSize: 10, fontWeight: '800', fontFamily: Typography.family },
  menuItemSubtitle: { fontSize: 12, fontFamily: Typography.family, lineHeight: 16 },

  toggle: { width: 44, height: 26, borderRadius: 13, flexShrink: 0, padding: 2, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11 },
});
