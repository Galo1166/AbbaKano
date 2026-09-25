import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface BalanceCardProps {
  onFundPress: () => void;
  onTransferPress?: () => void;
  onHistoryPress?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  onFundPress,
  onTransferPress,
  onHistoryPress,
}) => {
  const {
    mainBalance,
    isBalanceMasked,
    toggleBalanceMask,
    user,
    theme: Palette,
  } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);

  const formattedMain = `₦${mainBalance.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <View style={styles.cardContainer}>
      {/* Tier & Status Pill */}
      <View style={styles.topRow}>
        <View style={styles.tierPill}>
          <MaterialCommunityIcons name="shield-check" size={14} color={Palette.secondaryLight} />
          <Text style={styles.tierText}>{user.tierLabel}</Text>
        </View>

        <Pressable
          style={styles.maskButton}
          onPress={toggleBalanceMask}
          hitSlop={8}
          accessible={true}
          accessibilityLabel="Toggle balance visibility"
        >
          <Ionicons
            name={isBalanceMasked ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={Palette.onSurfaceVariant}
          />
          <Text style={styles.maskText}>{isBalanceMasked ? 'Show' : 'Hide'}</Text>
        </Pressable>
      </View>

      {/* Main Balance Display */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>TOTAL WALLET BALANCE</Text>
        <Text style={styles.balanceAmount}>
          {isBalanceMasked ? '••••••••' : formattedMain}
        </Text>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionsGrid}>
        <Pressable
          style={({ pressed }) => [styles.actionButton, styles.fundAction, pressed && styles.btnPressed]}
          onPress={onFundPress}
        >
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={styles.fundActionText}>+ Fund Wallet</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.btnPressed]}
          onPress={onTransferPress}
          disabled={!onTransferPress}
          accessibilityState={{ disabled: !onTransferPress }}
        >
          <MaterialCommunityIcons name="swap-horizontal" size={18} color={Palette.onSurface} />
          <Text style={styles.actionText}>Transfer</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.btnPressed]}
          onPress={onHistoryPress}
          disabled={!onHistoryPress}
          accessibilityState={{ disabled: !onHistoryPress }}
        >
          <MaterialCommunityIcons name="file-document-outline" size={18} color={Palette.onSurface} />
          <Text style={styles.actionText}>Ledger</Text>
        </Pressable>
      </View>
    </View>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  cardContainer: {
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.borderHigh,
    elevation: 4,
    marginBottom: Spacing.four,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Palette.surfaceHigh,
    paddingHorizontal: Spacing.twoAndHalf,
    paddingVertical: 4,
    borderRadius: Rounded.full,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  maskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  maskText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.onSurfaceMuted,
  },
  balanceSection: {
    marginBottom: Spacing.three,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: Palette.onSurface,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: Rounded.lg,
    backgroundColor: Palette.surfaceHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  fundAction: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primaryContainer,
  },
  fundActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.onSurface,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
