import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

export const VirtualAccountCard: React.FC = () => {
  const { virtualAccounts, user, theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeAccount = virtualAccounts[selectedIdx] || virtualAccounts[0] || {
    bankName: 'Moniepoint MFB',
    accountNumber: '8034 991 240',
    accountName: `AbbaKano - ${user.name || user.fullName || 'User'}`,
    feeInfo: '0% fee > ₦2,000 • Instant auto-credit in ~15s',
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Copied!', `${activeAccount.bankName} account number copied.`);
  };

  const isMoniepoint = /moniepoint/i.test(activeAccount.bankName);
  const isSterling = /sterling/i.test(activeAccount.bankName);
  const isWema = /wema/i.test(activeAccount.bankName);
  const activeColor = isMoniepoint ? '#0047cc' : isSterling ? '#d32f2f' : isWema ? '#93186c' : Palette.primary;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithBadge}>
          <MaterialCommunityIcons name="bank-transfer" size={20} color={Palette.primary} />
          <Text style={styles.headerTitle} numberOfLines={1}>Instant Dedicated Accounts</Text>
        </View>
        <View style={styles.activeTag}>
          <View style={styles.liveIndicator} />
          <Text style={styles.liveText}>Monnify Sync</Text>
        </View>
      </View>

      {/* Bank Selector Chips (Moniepoint, Sterling, Wema) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bankChipsRow}
      >
        {virtualAccounts.map((acc, idx) => {
          const isSelected = idx === selectedIdx;
          const chipColor = /moniepoint/i.test(acc.bankName)
            ? '#0047cc'
            : /sterling/i.test(acc.bankName)
            ? '#d32f2f'
            : '#93186c';

          return (
            <Pressable
              key={acc.bankName + idx}
              style={[
                styles.bankChip,
                isSelected && [styles.bankChipSelected, { backgroundColor: chipColor, borderColor: chipColor }],
              ]}
              onPress={() => setSelectedIdx(idx)}
            >
              <Text
                style={[styles.bankChipText, isSelected && styles.bankChipTextSelected]}
                numberOfLines={1}
              >
                {acc.bankName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Account Details Box */}
      <View style={[styles.accountBox, { borderColor: `${activeColor}40` }]}>
        <View style={styles.accountNumberRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.bankNameLabel, { color: activeColor }]} numberOfLines={1}>
              {activeAccount.bankName}
            </Text>
            <Text style={[styles.accountNumberText, { color: activeColor }]} numberOfLines={1} adjustsFontSizeToFit>
              {activeAccount.accountNumber}
            </Text>
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
              size={16}
              color={copied ? Palette.tertiary : Palette.onSurface}
            />
            <Text style={[styles.copyBtnText, copied && { color: Palette.tertiary }]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.nameRow}>
          <Text style={styles.nameLabel}>Account Name:</Text>
          <Text style={styles.nameValue} numberOfLines={1} ellipsizeMode="tail">
            {activeAccount.accountName || `AbbaKano - ${user.name || user.fullName || 'User'}`}
          </Text>
        </View>

        <View style={styles.feeInfoRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={13} color={Palette.tertiary} />
          <Text style={styles.feeInfoText} numberOfLines={1} ellipsizeMode="tail">
            {activeAccount.feeInfo || 'Instant auto-credit in ~15–30 seconds via Monnify'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const getStyles = (Palette: PaletteType) =>
  StyleSheet.create({
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
      flex: 1,
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
      paddingRight: Spacing.two,
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    bankChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: Palette.onSurfaceVariant,
    },
    bankChipTextSelected: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    accountBox: {
      backgroundColor: Palette.surfaceLow,
      borderRadius: Rounded.lg,
      padding: Spacing.three,
      borderWidth: 1.5,
    },
    accountNumberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bankNameLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    accountNumberText: {
      fontSize: 22,
      fontWeight: '800',
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
      color: Palette.onSurface,
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
      color: Palette.onSurfaceMuted,
      flex: 1,
    },
    pressed: {
      opacity: 0.75,
    },
  });
