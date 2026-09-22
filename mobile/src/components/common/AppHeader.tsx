import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing, Rounded, Typography } from '@/constants/theme';
import { useApp, useTheme } from '@/context/AppContext';
import { SCREEN_ASSETS } from '../../../assets/screenAssets';
import { ThemeSwitchModal } from './ThemeSwitchModal';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  showBack?: boolean;
  onBackPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = 'VTU Portal',
  subtitle = 'HOME',
  onNotificationPress,
  onProfilePress,
  showBack = false,
  onBackPress,
}) => {
  const { user, unreadNotifications, themePreference, effectiveTheme } = useApp();
  const T = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const themeIcon =
    themePreference === 'system'
      ? 'brightness-auto'
      : effectiveTheme === 'dark'
      ? 'dark-mode'
      : 'light-mode';

  const themeBadge =
    themePreference === 'system' ? 'A' : effectiveTheme === 'dark' ? 'D' : 'L';

  return (
    <>
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: T.canvas, borderBottomColor: T.border },
        ]}
      >
        {/* LEFT: Logo + Title */}
        <View style={styles.leftSection}>
          {showBack ? (
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                { backgroundColor: T.surfaceHigh, borderColor: T.border },
                pressed && styles.pressed,
              ]}
              onPress={onBackPress}
              hitSlop={12}
            >
              <MaterialIcons name="arrow-back" size={22} color={T.onSurface} />
            </Pressable>
          ) : (
            <View
              style={[
                styles.brandLogoBox,
                { backgroundColor: T.surfaceHigh, borderColor: T.border },
              ]}
            >
              <Image
                source={SCREEN_ASSETS.logoEmblem}
                style={styles.headerEmblemImage}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={styles.titleColumn}>
            <Text
              style={[
                styles.subtitleText,
                { color: T.onSurfaceMuted, fontFamily: Typography.family },
              ]}
            >
              {subtitle}
            </Text>
            <Text
              style={[
                styles.titleText,
                { color: T.onSurface, fontFamily: Typography.family },
              ]}
            >
              {title}
            </Text>
          </View>
        </View>

        {/* RIGHT: Support + Theme Switch + Notifications + Avatar */}
        <View style={styles.rightSection}>
          {/* Support Desk */}
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: T.surfaceHigh, borderColor: T.border },
              pressed && styles.pressed,
            ]}
            onPress={() => Linking.openURL('https://wa.me/2348034992810')}
            hitSlop={8}
            accessible
            accessibilityLabel="Contact Support Desk"
          >
            <MaterialIcons name="headset-mic" size={20} color={T.onSurfaceVariant} />
          </Pressable>

          {/* Theme Switcher */}
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: T.surfaceHigh, borderColor: T.border },
              pressed && styles.pressed,
            ]}
            onPress={() => setShowThemeModal(true)}
            hitSlop={8}
            accessible
            accessibilityLabel="Switch Theme (System, Dark, Light)"
          >
            <MaterialIcons name={themeIcon} size={20} color={T.primary} />
            <View style={[styles.themeIndicatorBadge, { backgroundColor: 'rgba(37,99,235,0.25)', borderColor: T.primary }]}>
              <Text style={[styles.themeIndicatorText, { color: T.primary, fontFamily: Typography.family }]}>
                {themeBadge}
              </Text>
            </View>
          </Pressable>

          {/* Notifications */}
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: T.surfaceHigh, borderColor: T.border },
              pressed && styles.pressed,
            ]}
            onPress={onNotificationPress}
            hitSlop={12}
          >
            <MaterialIcons name="notifications" size={22} color={T.onSurfaceVariant} />
            {unreadNotifications > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: T.error, borderColor: T.canvas }]}>
                <Text style={styles.notifBadgeText}>{unreadNotifications}</Text>
              </View>
            )}
          </Pressable>

          {/* Avatar */}
          <Pressable
            style={({ pressed }) => [styles.avatarWrapper, pressed && styles.pressed]}
            onPress={onProfilePress}
          >
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: T.primaryContainer, borderColor: T.border },
              ]}
            >
              <Text style={[styles.avatarInitials, { fontFamily: Typography.family }]}>
                {initials}
              </Text>
            </View>
            <View style={[styles.onlineDot, { backgroundColor: T.tertiary, borderColor: T.canvas }]} />
          </Pressable>
        </View>
      </View>

      <ThemeSwitchModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 60,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  brandLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerEmblemImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
  },
  titleColumn: {
    flex: 1,
  },
  subtitleText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notifBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
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
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
