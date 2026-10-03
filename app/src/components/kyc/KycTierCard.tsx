import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette, Rounded, Spacing } from '@/constants/theme';
import { KycTierInfo } from '@/constants/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';

interface KycTierCardProps {
  tierInfo: KycTierInfo;
  isCurrent: boolean;
  onUpgradePress: () => void;
}

export const KycTierCard: React.FC<KycTierCardProps> = ({
  tierInfo,
  isCurrent,
  onUpgradePress,
}) => {
  return (
    <View style={[styles.card, isCurrent && styles.activeCard]}>
      <View style={styles.header}>
        <View style={styles.titleWithBadge}>
          <MaterialCommunityIcons
            name={isCurrent ? 'shield-check' : 'shield-outline'}
            size={20}
            color={isCurrent ? Palette.tertiary : Palette.onSurfaceMuted}
          />
          <Text style={styles.tierName}>{tierInfo.title}</Text>
        </View>
        <StatusBadge status={tierInfo.status} size="sm" />
      </View>

      <View style={styles.limitsGrid}>
        <View style={styles.limitCol}>
          <Text style={styles.limitLabel}>Daily Transaction Limit</Text>
          <Text style={styles.limitValue}>{tierInfo.dailyLimit}</Text>
        </View>

        <View style={styles.limitCol}>
          <Text style={styles.limitLabel}>Maximum Balance</Text>
          <Text style={styles.limitValue}>{tierInfo.maxWalletBalance}</Text>
        </View>
      </View>

      <View style={styles.requirementsList}>
        {tierInfo.requirements.map((req, i) => (
          <View key={i} style={styles.reqRow}>
            <Ionicons
              name={isCurrent ? 'checkmark-circle' : 'radio-button-off'}
              size={14}
              color={isCurrent ? Palette.tertiary : Palette.onSurfaceMuted}
            />
            <Text style={styles.reqText}>{req}</Text>
          </View>
        ))}
      </View>

      {!isCurrent && tierInfo.status !== 'active' && (
        <Pressable
          style={({ pressed }) => [styles.upgradeBtn, pressed && styles.pressed]}
          onPress={onUpgradePress}
        >
          <Text style={styles.upgradeBtnText}>Upgrade to {tierInfo.tier}</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.border,
    marginBottom: Spacing.three,
  },
  activeCard: {
    borderColor: 'rgba(0, 208, 132, 0.4)',
    backgroundColor: 'rgba(0, 208, 132, 0.03)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  limitsGrid: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  limitCol: {
    flex: 1,
  },
  limitLabel: {
    fontSize: 10,
    color: Palette.onSurfaceMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  limitValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  requirementsList: {
    gap: 6,
    marginBottom: Spacing.two,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reqText: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingVertical: 10,
    borderRadius: Rounded.md,
    marginTop: Spacing.two,
  },
  upgradeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
  },
});
