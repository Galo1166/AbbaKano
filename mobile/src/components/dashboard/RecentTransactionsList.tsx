import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette, Rounded, Spacing } from '@/constants/theme';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useApp } from '@/context/AppContext';
import { TELCO_NETWORKS } from '@/constants/telco';

interface RecentTransactionsListProps {
  onViewAllPress: () => void;
  onTransactionPress?: (txId: string) => void;
}

export const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  onViewAllPress,
  onTransactionPress,
}) => {
  const { transactions } = useApp();
  const recent = transactions.slice(0, 5);

  const getServiceIcon = (type: string, networkId?: string) => {
    if (networkId && TELCO_NETWORKS[networkId as keyof typeof TELCO_NETWORKS]) {
      const net = TELCO_NETWORKS[networkId as keyof typeof TELCO_NETWORKS];
      return {
        name: type === 'DATA' ? 'wifi' : 'cellphone-wireless',
        color: net.brandColor,
        bg: net.bgLight,
      };
    }

    if (type === 'ELECTRICITY') {
      return { name: 'flash', color: Palette.primaryLight, bg: 'rgba(77, 142, 255, 0.12)' };
    }
    if (type === 'CABLE_TV') {
      return { name: 'television-classic', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.12)' };
    }
    return { name: 'bank-transfer', color: Palette.tertiary, bg: 'rgba(0, 208, 132, 0.12)' };
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
        <Pressable onPress={onViewAllPress} hitSlop={8}>
          <Text style={styles.viewAllText}>View All ({transactions.length})</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {recent.map((tx, idx) => {
          const iconInfo = getServiceIcon(tx.type, tx.network);
          const isCredit = tx.type === 'FUND_WALLET';

          return (
            <Pressable
              key={tx.id}
              style={({ pressed }) => [
                styles.transactionRow,
                idx < recent.length - 1 && styles.rowBorder,
                pressed && styles.rowPressed,
              ]}
              onPress={() => onTransactionPress?.(tx.id)}
            >
              <View style={[styles.iconBox, { backgroundColor: iconInfo.bg }]}>
                <MaterialCommunityIcons name={iconInfo.name as any} size={20} color={iconInfo.color} />
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.txTitle} numberOfLines={1}>
                  {tx.title}
                </Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>

              <View style={styles.amountCol}>
                {tx.type !== 'DATA' && (
                  <Text
                    style={[
                      styles.txAmount,
                      isCredit ? { color: Palette.tertiary } : { color: Palette.onSurface },
                    ]}
                  >
                    {isCredit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                  </Text>
                )}
                <StatusBadge status={tx.status} size="sm" />
              </View>
            </Pressable>
          );
        })}
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 1,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primaryLight,
  },
  list: {
    width: '100%',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  infoCol: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.onSurface,
    marginBottom: 3,
  },
  txDate: {
    fontSize: 11,
    color: Palette.onSurfaceMuted,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
