import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { TransactionRecord } from '@/constants/mockData';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/common/Button';
import { useApp } from '@/context/AppContext';

interface TransactionDetailModalProps {
  transaction: TransactionRecord | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
}) => {
  const { theme: Palette, isDark } = useApp();
  const styles = useMemo(() => getStyles(Palette, isDark), [Palette, isDark]);
  const [copied, setCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  if (!transaction) return null;

  const isCredit = transaction.type === 'FUND_WALLET';
  const isDataBundle = transaction.type === 'DATA';

  const handleCopyRef = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyToken = () => {
    if (transaction.token) {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  return (
    <Modal
      visible={!!transaction}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Transaction Audit Details</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={Palette.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount / Bundle Banner */}
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>
                {isDataBundle ? 'BUNDLE PURCHASED' : 'AMOUNT'}
              </Text>
              <Text
                style={[
                  styles.amountValue,
                  isDataBundle
                    ? { color: Palette.primaryLight, fontSize: 18 }
                    : isCredit
                    ? { color: Palette.tertiary }
                    : { color: Palette.onSurface },
                ]}
              >
                {isDataBundle ? transaction.title : `${isCredit ? '+' : '-'}₦${transaction.amount.toLocaleString()}`}
              </Text>
              <View style={{ marginTop: 6 }}>
                <StatusBadge status={transaction.status} />
              </View>
            </View>

            {/* Token if available */}
            {transaction.token && (
              <View style={styles.tokenBox}>
                <View style={styles.tokenHeader}>
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={16}
                    color={isDark ? Palette.primaryLight : '#2563EB'}
                  />
                  <Text style={styles.tokenTitle}>PREPAID METER TOKEN</Text>
                </View>
                <View style={styles.tokenCodeBox}>
                  <Text style={styles.tokenCode} selectable>
                    {transaction.token}
                  </Text>
                </View>
                <View style={styles.tokenFooter}>
                  {transaction.units ? (
                    <Text style={styles.unitsText}>Units: {transaction.units}</Text>
                  ) : (
                    <View />
                  )}
                  <Pressable
                    style={({ pressed }) => [styles.tokenCopyBtn, pressed && { opacity: 0.8 }]}
                    onPress={handleCopyToken}
                  >
                    <Ionicons
                      name={tokenCopied ? 'checkmark' : 'copy-outline'}
                      size={13}
                      color={tokenCopied ? Palette.tertiary : '#FFFFFF'}
                    />
                    <Text style={styles.tokenCopyBtnText}>
                      {tokenCopied ? 'Copied' : 'Copy Token'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Details Table */}
            <View style={styles.table}>
              <View style={styles.row}>
                <Text style={styles.label}>Reference</Text>
                <Pressable style={styles.refBox} onPress={handleCopyRef}>
                  <Text style={styles.value}>{transaction.reference}</Text>
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={copied ? Palette.tertiary : Palette.onSurfaceMuted}
                  />
                </Pressable>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Service</Text>
                <Text style={styles.value}>{transaction.title}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Recipient / Account</Text>
                <Text style={[styles.value, { color: Palette.primaryLight }]}>
                  {transaction.recipient}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.value}>{transaction.description}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Date & Timestamp</Text>
                <Text style={styles.value}>{transaction.date}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                title="Report Dispute / Query"
                onPress={() => alert(`Support ticket initiated for ${transaction.reference}`)}
                variant="secondary"
                leftIcon={<Ionicons name="chatbubble-ellipses-outline" size={18} color={Palette.onSurface} />}
                style={{ marginBottom: Spacing.two }}
              />

              <Button
                title="Share Receipt"
                onPress={() => alert(`Sharing receipt ${transaction.reference}`)}
                variant="primary"
                leftIcon={<Ionicons name="share-outline" size={18} color="#FFFFFF" />}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (Palette: PaletteType, isDark: boolean) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: Palette.surface,
      borderTopLeftRadius: Rounded.xxl,
      borderTopRightRadius: Rounded.xxl,
      padding: Spacing.four,
      maxHeight: '85%',
      borderWidth: 1,
      borderColor: Palette.borderHigh,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.four,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: Palette.onSurface,
    },
    amountCard: {
      alignItems: 'center',
      backgroundColor: Palette.surfaceLow,
      borderRadius: Rounded.lg,
      padding: Spacing.three,
      marginBottom: Spacing.four,
    },
    amountLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: Palette.onSurfaceMuted,
      letterSpacing: 1,
    },
    amountValue: {
      fontSize: 28,
      fontWeight: '800',
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    tokenBox: {
      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
      borderRadius: Rounded.lg,
      padding: Spacing.three,
      marginBottom: Spacing.four,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(147, 197, 253, 0.3)' : '#BFDBFE',
    },
    tokenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 6,
    },
    tokenTitle: {
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
      marginVertical: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#DBEAFE',
      alignItems: 'center',
    },
    tokenCode: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
      letterSpacing: 1.5,
      fontVariant: ['tabular-nums'],
      fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    },
    tokenFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    unitsText: {
      fontSize: 12,
      color: isDark ? Palette.onSurfaceVariant : '#334155',
      fontWeight: '700',
    },
    tokenCopyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? Palette.primary : '#2563EB',
      paddingHorizontal: Spacing.two,
      paddingVertical: 6,
      borderRadius: Rounded.sm,
    },
    tokenCopyBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    table: {
      backgroundColor: Palette.surfaceLow,
      borderRadius: Rounded.lg,
      padding: Spacing.three,
      marginBottom: Spacing.four,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    label: {
      fontSize: 12,
      color: Palette.onSurfaceMuted,
    },
    value: {
      fontSize: 12,
      fontWeight: '600',
      color: Palette.onSurface,
      maxWidth: '65%',
      textAlign: 'right',
    },
    refBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    divider: {
      height: 1,
      backgroundColor: Palette.border,
      marginVertical: 2,
    },
    actions: {
      paddingBottom: Spacing.four,
    },
  });
