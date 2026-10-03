import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { TransactionRecord } from '@/constants/mockData';
import { ScreenHeader } from '@/components/common/ScreenHeader';

type FilterCategory = 'All' | 'Data' | 'Airtime' | 'Wallet Deposits' | 'Electricity';
type FilterStatus = 'ALL' | 'SUCCESSFUL' | 'PENDING' | 'FAILED';

const FILTER_CATEGORIES: FilterCategory[] = ['All', 'Data', 'Airtime', 'Wallet Deposits', 'Electricity'];

export const LedgerView: React.FC = () => {
  const { transactions, theme: Palette, isDark } = useApp();
  const styles = useMemo(() => getStyles(Palette, isDark), [Palette, isDark]);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('All');
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  // Stats from transactions
  const stats = useMemo(() => {
    const outflows = transactions.filter((t) => t.type !== 'FUND_WALLET');
    const inflows = transactions.filter((t) => t.type === 'FUND_WALLET');
    return {
      outflowTotal: outflows.reduce((sum, t) => sum + t.amount, 0),
      outflowCount: outflows.length,
      inflowTotal: inflows.reduce((sum, t) => sum + t.amount, 0),
      inflowCount: inflows.length,
    };
  }, [transactions]);

  const filteredTx = useMemo(() => {
    if (activeCategory === 'All') return transactions;
    if (activeCategory === 'Data') return transactions.filter((t) => t.type === 'DATA');
    if (activeCategory === 'Airtime') return transactions.filter((t) => t.type === 'AIRTIME');
    if (activeCategory === 'Wallet Deposits') return transactions.filter((t) => t.type === 'FUND_WALLET');
    if (activeCategory === 'Electricity') return transactions.filter((t) => t.type === 'ELECTRICITY');
    return transactions;
  }, [transactions, activeCategory]);

  // Group by date label
  const groupedTx = useMemo(() => {
    const groups: { [key: string]: TransactionRecord[] } = {};
    filteredTx.forEach((tx) => {
      const dateGroup = tx.date.split('•')[0].trim().toUpperCase();
      if (!groups[dateGroup]) groups[dateGroup] = [];
      groups[dateGroup].push(tx);
    });
    return Object.entries(groups);
  }, [filteredTx]);

  const getTxIconName = (type: string): string => {
    switch (type) {
      case 'DATA': return 'signal-cellular-alt';
      case 'AIRTIME': return 'phone-in-talk';
      case 'ELECTRICITY': return 'lightbulb';
      case 'CABLE_TV': return 'live-tv';
      case 'FUND_WALLET': return 'account-balance-wallet';
      default: return 'receipt-long';
    }
  };

  const getTxIconColor = (type: string, network?: string) => {
    if (type === 'FUND_WALLET') return Palette.tertiary;
    if (network === 'MTN') return '#FFCC00';
    if (network === 'AIRTEL') return '#E60000';
    if (network === 'GLO') return '#27A844';
    if (network === '9MOBILE') return '#84BD00';
    if (type === 'ELECTRICITY') return Palette.primary;
    if (type === 'CABLE_TV') return '#C084FC';
    return Palette.onSurfaceVariant;
  };

  const renderTxItem = (tx: TransactionRecord) => {
    const isCredit = tx.type === 'FUND_WALLET';
    const iconColor = getTxIconColor(tx.type, tx.network);
    const timeStr = tx.date.includes('•') ? tx.date.split('•')[1]?.trim() : '';

    return (
      <Pressable
        key={tx.id}
        style={({ pressed }) => [styles.txRow, pressed && { opacity: 0.75 }]}
        onPress={() => setSelectedTx(tx)}
      >
        <View style={[styles.txIconBox, { backgroundColor: `${iconColor}18` }]}>
          <MaterialIcons name={getTxIconName(tx.type) as any} size={20} color={iconColor} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>{tx.title}</Text>
          <Text style={styles.txDescription} numberOfLines={1}>
            {tx.recipient} {timeStr ? `• ${timeStr}` : ''}
          </Text>
        </View>
        <View style={styles.txAmountCol}>
          {tx.type !== 'DATA' && (
            <Text style={[styles.txAmount, { color: isCredit ? Palette.tertiary : Palette.onSurface }]}>
              {isCredit ? '+' : '-'}₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </Text>
          )}
          <Text style={[
            styles.txStatusLabel,
            tx.status === 'SUCCESSFUL' ? styles.statusSuccess :
            tx.status === 'PENDING' ? styles.statusPending : styles.statusFailed
          ]}>
            {tx.status === 'SUCCESSFUL' ? 'Completed' :
             tx.status === 'PENDING' ? 'Pending' : 'Failed'}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="History"
        subtitle="Transaction Ledger & Records"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* === MONTH HEADER === */}
        <View style={styles.monthHeader}>
          <MaterialIcons name="calendar-month" size={18} color={Palette.primary} />
          <Text style={styles.monthLabel}>February 2025 Ledger</Text>
        </View>

        {/* === VERIFIED LEDGER STATS CARD === */}
        <View style={styles.statsCard}>
          <View style={styles.statsVerifiedRow}>
            <MaterialIcons name="verified-user" size={16} color={Palette.tertiary} />
            <Text style={styles.statsVerifiedLabel}>Verified Ledger</Text>
          </View>
          <View style={styles.statsRow}>
            {/* Outflow */}
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <MaterialIcons name="call-made" size={16} color={Palette.error} />
                <Text style={styles.statHeaderText}>Total Outflow</Text>
              </View>
              <Text style={styles.statValueOut}>
                ₦{stats.outflowTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.statCount}>{stats.outflowCount} debits recorded</Text>
            </View>
            <View style={styles.statDivider} />
            {/* Inflow */}
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <MaterialIcons name="call-received" size={16} color={Palette.tertiary} />
                <Text style={styles.statHeaderText}>Total Inflow</Text>
              </View>
              <Text style={styles.statValueIn}>
                +₦{stats.inflowTotal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.statCount}>{stats.inflowCount} wallet deposits</Text>
            </View>
          </View>
        </View>

        {/* === FILTER TAB STRIP === */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterStrip}
        >
          {FILTER_CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* === TRANSACTION GROUPS === */}
        {groupedTx.map(([dateGroup, txItems]) => (
          <View key={dateGroup} style={styles.txGroup}>
            <View style={styles.txGroupHeader}>
              <Text style={styles.txGroupDate}>{dateGroup}</Text>
              <View style={styles.txGroupCountBadge}>
                <Text style={styles.txGroupCountText}>{txItems.length} Transaction{txItems.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
            <View style={styles.txGroupList}>
              {txItems.map((tx) => renderTxItem(tx))}
            </View>
          </View>
        ))}

        {filteredTx.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={48} color={Palette.onSurfaceMuted} />
            <Text style={styles.emptyStateTitle}>No Transactions</Text>
            <Text style={styles.emptyStateSubtitle}>No {activeCategory.toLowerCase()} transactions recorded.</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* === TRANSACTION DETAIL MODAL === */}
      {selectedTx && (
        <Modal
          visible={!!selectedTx}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedTx(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedTx(null)}>
            <View style={styles.modalSheet}>
              <View style={styles.modalDragHandle} />

              {/* Status Icon */}
              <View style={[
                styles.txDetailStatusIcon,
                {
                  backgroundColor: selectedTx.status === 'SUCCESSFUL' ? 'rgba(0,208,132,0.12)' :
                    selectedTx.status === 'PENDING' ? 'rgba(238,152,0,0.12)' : 'rgba(239,68,68,0.12)'
                }
              ]}>
                <MaterialIcons
                  name={
                    selectedTx.status === 'SUCCESSFUL' ? 'check-circle' :
                    selectedTx.status === 'PENDING' ? 'schedule' : 'cancel'
                  }
                  size={36}
                  color={
                    selectedTx.status === 'SUCCESSFUL' ? Palette.tertiary :
                    selectedTx.status === 'PENDING' ? Palette.secondary : Palette.error
                  }
                />
              </View>

              <Text style={styles.txDetailTitle}>{selectedTx.title}</Text>
              {selectedTx.type === 'DATA' ? (
                <View style={styles.dataBundleStatusBadge}>
                  <Text style={styles.dataBundleStatusText}>Bundle Delivered</Text>
                </View>
              ) : (
                <Text style={[
                  styles.txDetailAmount,
                  { color: selectedTx.type === 'FUND_WALLET' ? Palette.tertiary : Palette.onSurface }
                ]}>
                  {selectedTx.type === 'FUND_WALLET' ? '+' : '-'}₦{selectedTx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </Text>
              )}

              <View style={styles.txDetailRows}>
                {[
                  { label: 'Reference', value: selectedTx.reference },
                  { label: 'Status', value: selectedTx.status },
                  { label: 'Recipient', value: selectedTx.recipient },
                  { label: 'Date', value: selectedTx.date },
                ].map(({ label, value }) => (
                  <View key={label} style={styles.txDetailRow}>
                    <Text style={styles.txDetailRowLabel}>{label}</Text>
                    <Text style={styles.txDetailRowValue} numberOfLines={2}>{value}</Text>
                  </View>
                ))}
              </View>

              {/* High-Contrast Electricity Token Card */}
              {selectedTx.token && (
                <View style={styles.tokenCard}>
                  <View style={styles.tokenHeader}>
                    <MaterialCommunityIcons
                      name="lightning-bolt"
                      size={16}
                      color={isDark ? Palette.primaryLight : '#2563EB'}
                    />
                    <Text style={styles.tokenHeaderTitle}>PREPAID METER TOKEN</Text>
                  </View>
                  <View style={styles.tokenCodeBox}>
                    <Text style={styles.tokenCodeText} selectable>{selectedTx.token}</Text>
                  </View>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [styles.closeModalBtn, pressed && { opacity: 0.85 }]}
                onPress={() => setSelectedTx(null)}
              >
                <Text style={styles.closeModalBtnText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

const getStyles = (Palette: PaletteType, isDark: boolean = true) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },

  // Month Header
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },

  // Stats Card
  statsCard: {
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: Spacing.three,
  },
  statsVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsVerifiedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: Typography.family,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  statItem: {
    flex: 1,
    gap: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statHeaderText: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  statValueOut: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.error,
    fontFamily: Typography.family,
  },
  statValueIn: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.tertiary,
    fontFamily: Typography.family,
  },
  statCount: {
    fontSize: 11,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
  },
  statDivider: {
    width: 1,
    height: 52,
    backgroundColor: Palette.border,
  },

  // Filter Strip
  filterStrip: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Rounded.full,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  filterChipActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Transaction Groups
  txGroup: {
    gap: 0,
  },
  txGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  txGroupDate: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 0.5,
    fontFamily: Typography.family,
    textTransform: 'uppercase',
  },
  txGroupCountBadge: {
    backgroundColor: Palette.surfaceHigh,
    borderRadius: Rounded.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  txGroupCountText: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  txGroupList: {
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txInfo: {
    flex: 1,
    minWidth: 0,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  txDescription: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  txStatusLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Typography.family,
    marginTop: 2,
  },
  statusSuccess: { color: Palette.tertiary },
  statusPending: { color: Palette.secondary },
  statusFailed: { color: Palette.error },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
    textAlign: 'center',
  },

  // Transaction Detail Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Palette.surfaceLow,
    borderTopLeftRadius: Rounded.xxl,
    borderTopRightRadius: Rounded.xxl,
    padding: Spacing.six,
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Palette.borderHigh,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    marginBottom: Spacing.two,
  },
  txDetailStatusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.two,
  },
  txDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    textAlign: 'center',
  },
  txDetailAmount: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: Typography.family,
  },
  dataBundleStatusBadge: {
    backgroundColor: 'rgba(0, 208, 132, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Rounded.full,
    marginTop: Spacing.two,
  },
  dataBundleStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.tertiary,
    fontFamily: Typography.family,
  },
  txDetailRows: {
    width: '100%',
    marginTop: Spacing.four,
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  txDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    gap: Spacing.three,
  },
  txDetailRowLabel: {
    fontSize: 13,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
    flexShrink: 0,
  },
  txDetailRowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    textAlign: 'right',
    flex: 1,
  },
  closeModalBtn: {
    width: '100%',
    height: 52,
    backgroundColor: Palette.primaryContainer,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  closeModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
  tokenCard: {
    width: '100%',
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
    borderRadius: Rounded.lg,
    padding: Spacing.three,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(147, 197, 253, 0.3)' : '#BFDBFE',
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  tokenHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: isDark ? Palette.primaryLight : '#1D4ED8',
    letterSpacing: 0.8,
  },
  tokenCodeBox: {
    backgroundColor: isDark ? 'rgba(15, 19, 28, 0.75)' : '#FFFFFF',
    borderRadius: Rounded.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#DBEAFE',
    alignItems: 'center',
  },
  tokenCodeText: {
    fontSize: 17,
    fontWeight: '800',
    color: isDark ? '#FFFFFF' : '#0F172A',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
});
