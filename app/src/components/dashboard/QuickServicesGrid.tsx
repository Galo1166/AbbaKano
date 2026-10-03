import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette, Rounded, Spacing } from '@/constants/theme';

interface QuickServicesGridProps {
  onServiceSelect: (serviceKey: string) => void;
}

export const QuickServicesGrid: React.FC<QuickServicesGridProps> = ({ onServiceSelect }) => {
  const services = [
    {
      key: 'airtime',
      title: 'Airtime',
      badge: '2% OFF',
      badgeColor: Palette.secondary,
      icon: 'cellphone-charging',
      iconColor: Palette.secondaryLight,
      iconBg: 'rgba(238, 152, 0, 0.12)',
    },
    {
      key: 'data',
      title: 'Data Bundles',
      badge: 'HOT',
      badgeColor: Palette.tertiary,
      icon: 'wifi',
      iconColor: Palette.tertiary,
      iconBg: 'rgba(0, 208, 132, 0.12)',
    },
    {
      key: 'electricity',
      title: 'Electricity',
      badge: 'Instant',
      badgeColor: Palette.primaryLight,
      icon: 'flash',
      iconColor: Palette.primaryLight,
      iconBg: 'rgba(77, 142, 255, 0.12)',
    },
    {
      key: 'cable',
      title: 'Cable TV',
      badge: null,
      icon: 'television-classic',
      iconColor: '#C084FC',
      iconBg: 'rgba(192, 132, 252, 0.12)',
    },
    {
      key: 'education',
      title: 'Exam Pins',
      badge: 'WAEC',
      badgeColor: Palette.secondary,
      icon: 'school',
      iconColor: '#F472B6',
      iconBg: 'rgba(244, 114, 182, 0.12)',
    },
    {
      key: 'recharge_pin',
      title: 'Print Cards',
      badge: null,
      icon: 'printer',
      iconColor: '#38BDF8',
      iconBg: 'rgba(56, 189, 248, 0.12)',
    },
    {
      key: 'airtime2cash',
      title: 'Airtime2Cash',
      badge: '90%',
      badgeColor: Palette.tertiary,
      icon: 'cash-sync',
      iconColor: Palette.tertiary,
      iconBg: 'rgba(0, 208, 132, 0.12)',
    },
    {
      key: 'referral',
      title: 'Refer & Earn',
      badge: '₦500',
      badgeColor: Palette.secondary,
      icon: 'gift-outline',
      iconColor: Palette.secondaryLight,
      iconBg: 'rgba(238, 152, 0, 0.12)',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>QUICK UTILITY SERVICES</Text>

      <View style={styles.grid}>
        {services.map((item) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [styles.serviceItem, pressed && styles.itemPressed]}
            onPress={() => onServiceSelect(item.key)}
            accessible={true}
            accessibilityLabel={item.title}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
              <MaterialCommunityIcons
                name={item.icon as any}
                size={24}
                color={item.iconColor}
              />
              {item.badge && (
                <View style={[styles.badgePill, { backgroundColor: item.badgeColor }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </View>

            <Text style={styles.serviceLabel} numberOfLines={1}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 1,
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  serviceItem: {
    width: '22%',
    alignItems: 'center',
    marginBottom: Spacing.two,
    minHeight: 70,
  },
  itemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Rounded.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  badgePill: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0A0E17',
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.onSurface,
    textAlign: 'center',
  },
});
