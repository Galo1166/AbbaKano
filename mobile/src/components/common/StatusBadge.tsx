import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TransactionStatus } from '@/constants/mockData';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface StatusBadgeProps {
  status: TransactionStatus | 'active' | 'pending' | 'locked';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { theme: Palette } = useApp();
  const normalized = status.toUpperCase();

  let bgColor = Palette.surfaceHigh;
  let textColor = Palette.onSurfaceVariant;
  let borderColor = Palette.border;
  let label = normalized;

  if (normalized === 'SUCCESSFUL' || normalized === 'ACTIVE') {
    bgColor = 'rgba(0, 208, 132, 0.12)';
    textColor = Palette.tertiary;
    borderColor = 'rgba(0, 208, 132, 0.3)';
    label = normalized === 'ACTIVE' ? 'Active' : 'Successful';
  } else if (normalized === 'PENDING') {
    bgColor = 'rgba(238, 152, 0, 0.12)';
    textColor = Palette.secondaryLight;
    borderColor = 'rgba(238, 152, 0, 0.3)';
    label = 'Pending';
  } else if (normalized === 'FAILED' || normalized === 'LOCKED') {
    bgColor = 'rgba(239, 68, 68, 0.12)';
    textColor = Palette.error;
    borderColor = 'rgba(239, 68, 68, 0.3)';
    label = normalized === 'LOCKED' ? 'Locked' : 'Failed';
  }

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
          paddingHorizontal: isSmall ? Spacing.two : Spacing.three,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: textColor,
            fontSize: isSmall ? 10 : 11,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: Rounded.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
