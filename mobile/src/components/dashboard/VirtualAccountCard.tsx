import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette, Rounded, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export const VirtualAccountCard: React.FC = () => {
  const { virtualAccounts, user } = useApp();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeAccount = virtualAccounts[selectedIdx] || virtualAccounts[0];

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithBadge}>
          <MaterialCommunityIcons name="bank-transfer" size={20} color={Palette.primaryLight} />
          <Text style={styles.headerTitle}>Instant Auto-Funding Accounts</Text>
        </View>
        <View style={styles.activeTag}>
          <View style={styles.liveIndicator} />
          <Text style={styles.liveText}>Automated</Text>
        </View>
      </View>

      {/* Bank Selector Chips */}
      <View style={styles.bankChipsRow}>
        {virtualAccounts.map((acc, idx) => {
          const isSelected = idx === selectedIdx;
          return (
            <Pressable
              key={acc.bankName}
              style={[styles.bankChip, isSelected && styles.bankChipSelected]}
              onPress={() => setSelectedIdx(idx)}
            >
              <Text style={[styles.bankChipText, isSelected && styles.bankChipTextSelected]}>
                {acc.bankName}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Account Details Box */}
      <View style={styles.accountBox}>
        <View style={styles.accountNumberRow}>
          <View>
            <Text style={styles.bankNameLabel}>{activeAccount.bankName}</Text>
            <Text style={styles.accountNumberText}>{activeAccount.accountNumber}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
            onPress={handleCopy}
            hitSlop={8}
            accessible={true}
            accessibilityLabel="Copy account number"
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={18}
              color={copied ? Palette.tertiary : '#FFFFFF'}
            />
            <Text style={[styles.copyBtnText, copied && { color: Palette.tertiary }]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.nameRow}>
          <Text style={styles.nameLabel}>Account Name:</Text>
          <Text style={styles.nameValue} numberOfLines={1}>
            {activeAccount.accountName}
          </Text>
        </View>

        <View style={styles.feeInfoRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={13} color={Palette.secondaryLight} />
          <Text style={styles.feeInfoText}>
            {activeAccount.feeInfo}
          </Text>
        </View>
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
  headerRow: {
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
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 208, 132, 0.12)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Rounded.full,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.tertiary,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.tertiary,
  },
  bankChipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  bankChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Rounded.md,
    backgroundColor: Palette.surfaceLow,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  bankChipSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primaryContainer,
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  bankChipTextSelected: {
    color: '#FFFFFF',
  },
  accountBox: {
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.borderHigh,
  },
  accountNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankNameLabel: {
    fontSize: 11,
    color: Palette.onSurfaceMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  accountNumberText: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.onSurface,
    letterSpacing: 1.5,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceHigh,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Rounded.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: Spacing.twoAndHalf,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: 4,
  },
  nameLabel: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
  },
  nameValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.onSurface,
    flex: 1,
  },
  feeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  feeInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.secondaryLight,
  },
  pressed: {
    opacity: 0.75,
  },
});
