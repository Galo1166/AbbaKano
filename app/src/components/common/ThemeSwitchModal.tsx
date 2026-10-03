import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp, useTheme, ThemePreference } from '@/context/AppContext';

interface ThemeSwitchModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ThemeOption {
  key: ThemePreference;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  badge?: string;
}

export const ThemeSwitchModal: React.FC<ThemeSwitchModalProps> = ({ visible, onClose }) => {
  const { themePreference, effectiveTheme, setThemePreference } = useApp();
  const T = useTheme();

  const options: ThemeOption[] = [
    {
      key: 'system',
      title: 'System Default',
      subtitle: `Auto-detects phone appearance (Currently: ${effectiveTheme === 'dark' ? 'Dark' : 'Light'})`,
      icon: 'brightness-auto',
      badge: 'AUTO',
    },
    {
      key: 'dark',
      title: 'Dark Mode',
      subtitle: 'Deep Obsidian Slate — battery saving & low-light comfort',
      icon: 'dark-mode',
    },
    {
      key: 'light',
      title: 'Light Mode',
      subtitle: 'Crisp High-Contrast White — ideal for bright daylight legibility',
      icon: 'light-mode',
    },
  ];

  const handleSelect = (key: ThemePreference) => {
    setThemePreference(key);
    setTimeout(onClose, 150);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.sheet, { backgroundColor: T.surface, borderColor: T.borderHigh }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: T.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: 'rgba(37,99,235,0.12)' }]}>
                <MaterialIcons name="palette" size={20} color={T.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: T.onSurface, fontFamily: Typography.family }]}>
                  Theme Appearance
                </Text>
                <Text style={[styles.subtitle, { color: T.onSurfaceVariant, fontFamily: Typography.family }]}>
                  Select visual mode for AbbaKano
                </Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={20} color={T.onSurfaceMuted} />
            </Pressable>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {options.map((opt) => {
              const isSelected = themePreference === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? 'rgba(37,99,235,0.08)' : T.surfaceLow,
                      borderColor: isSelected ? T.primary : T.border,
                    },
                  ]}
                  onPress={() => handleSelect(opt.key)}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(37,99,235,0.18)'
                          : T.surfaceHigh,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={opt.icon}
                      size={22}
                      color={isSelected ? T.primary : T.onSurfaceMuted}
                    />
                  </View>

                  <View style={styles.optionTextCol}>
                    <View style={styles.optionTitleRow}>
                      <Text
                        style={[
                          styles.optionTitle,
                          {
                            color: isSelected ? T.primary : T.onSurface,
                            fontFamily: Typography.family,
                          },
                        ]}
                      >
                        {opt.title}
                      </Text>
                      {opt.badge && (
                        <View style={[styles.badgeBox, { backgroundColor: 'rgba(37,99,235,0.15)' }]}>
                          <Text style={[styles.badgeText, { color: T.primary, fontFamily: Typography.family }]}>
                            {opt.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.optionSubtitle, { color: T.onSurfaceVariant, fontFamily: Typography.family }]}>
                      {opt.subtitle}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: isSelected ? T.primary : T.borderHigh },
                    ]}
                  >
                    {isSelected && (
                      <View style={[styles.radioInner, { backgroundColor: T.primary }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Rounded.xxl,
    borderTopRightRadius: Rounded.xxl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    borderWidth: 1,
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: Rounded.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 6,
  },
  optionsList: {
    gap: Spacing.two,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Rounded.xl,
    borderWidth: 1.5,
    gap: Spacing.three,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextCol: {
    flex: 1,
    gap: 2,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  badgeBox: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Rounded.full,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  optionSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
