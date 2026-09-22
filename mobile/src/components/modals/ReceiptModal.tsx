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
import { useCheckout } from '@/context/CheckoutContext';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';

export const ReceiptModal: React.FC = () => {
  const { isReceiptOpen, closeReceipt, activeReceipt } = useCheckout();
  const { theme: Palette, isDark } = useApp();
  const styles = useMemo(() => getStyles(Palette, isDark), [Palette, isDark]);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [refCopied, setRefCopied] = useState(false);

  if (!activeReceipt) return null;

  const handleCopyToken = () => {
    if (activeReceipt.token) {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const handleCopyRef = () => {
    setRefCopied(true);
    setTimeout(() => setRefCopied(false), 2000);
  };

  const isDataBundle = activeReceipt.type === 'DATA';

  return (
    <Modal
      visible={isReceiptOpen}
      transparent
      animationType="slide"
      onRequestClose={closeReceipt}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Success Icon Badge */}
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="checkmark" size={32} color="#002616" />
              </View>
            </View>

            <Text style={styles.receiptTitle}>Transaction Successful</Text>
            <Text style={styles.receiptSubtitle}>Payment processed and delivered instantly</Text>

            {/* Total Amount / Bundle Purchased Banner */}
            <View style={styles.amountBanner}>
              <Text style={styles.amountBannerLabel}>
                {isDataBundle ? 'BUNDLE PURCHASED' : 'AMOUNT PAID'}
              </Text>
              <Text
                style={[
                  styles.amountBannerValue,
                  isDataBundle && styles.bundleTitleBannerValue,
                ]}
              >
                {isDataBundle ? activeReceipt.title : `₦${activeReceipt.amount.toLocaleString()}`}
              </Text>
            </View>

            {/* Electricity Token Special Card */}
            {activeReceipt.token && (
              <View style={styles.tokenCard}>
                <View style={styles.tokenHeader}>
                  <MaterialCommunityIcons name="lightning-bolt" size={16} color={isDark ? Palette.primaryLight : '#2563EB'} />
                  <Text style={styles.tokenHeaderTitle}>PREPAID METER TOKEN</Text>
                </View>
                <View style={styles.tokenCodeContainer}>
                  <Text style={styles.tokenValue} selectable>{activeReceipt.token}</Text>
                </View>
                <View style={styles.tokenFooter}>
                  {activeReceipt.units && (
                    <Text style={styles.tokenUnitsText}>Units: {activeReceipt.units}</Text>
                  )}
                  <Pressable
                    style={({ pressed }) => [styles.tokenCopyBtn, pressed && styles.pressed]}
                    onPress={handleCopyToken}
                  >
                    <Ionicons
                      name={tokenCopied ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={tokenCopied ? Palette.tertiary : '#FFFFFF'}
                    />
                    <Text style={styles.tokenCopyBtnText}>
                      {tokenCopied ? 'Copied' : 'Copy Token'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Receipt Breakdown Table */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference ID</Text>
                <Pressable
                  style={styles.refCopyRow}
                  onPress={handleCopyRef}
                  hitSlop={8}
                >
                  <Text style={styles.refText}>{activeReceipt.reference}</Text>
                  <Ionicons
                    name={refCopied ? 'checkmark' : 'copy-outline'}
                    size={13}
                    color={refCopied ? Palette.tertiary : Palette.onSurfaceMuted}
                  />
                </Pressable>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailVal}>{activeReceipt.title}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Beneficiary</Text>
                <Text style={[styles.detailVal, styles.highlightVal]}>
                  {activeReceipt.recipient}
                </Text>
              </View>

              {!isDataBundle && activeReceipt.fee > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Convenience Fee</Text>
                    <Text style={styles.detailVal}>₦{activeReceipt.fee.toLocaleString()}</Text>
                  </View>
                </>
              )}

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailVal}>AbbaKano Wallet</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailVal}>{activeReceipt.date}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={styles.successPill}>
                  <Text style={styles.successPillText}>COMPLETED</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsBox}>
              <Button
                title="Done"
                onPress={closeReceipt}
                variant="primary"
                style={{ marginBottom: Spacing.two }}
              />

              <Button
                title="Share Receipt"
                onPress={() => alert(`Receipt shared: ${activeReceipt.reference}`)}
                variant="secondary"
                leftIcon={<Ionicons name="share-social-outline" size={18} color={Palette.onSurface} />}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (Palette: PaletteType, isDark: boolean = true) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xxl,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Palette.borderHigh,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  scrollContent: {
    alignItems: 'center',
  },
  successIconOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 208, 132, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  successIconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.onSurface,
    textAlign: 'center',
    marginBottom: 4,
  },
  receiptSubtitle: {
    fontSize: 13,
    color: Palette.onSurfaceMuted,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  amountBanner: {
    width: '100%',
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.lg,
    padding: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  amountBannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 1,
  },
  amountBannerValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.onSurface,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  bundleTitleBannerValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.primaryLight,
    textAlign: 'center',
  },
  tokenCard: {
    width: '100%',
    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
    borderRadius: Rounded.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
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
  tokenCodeContainer: {
    backgroundColor: isDark ? 'rgba(15, 19, 28, 0.75)' : '#FFFFFF',
    borderRadius: Rounded.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#DBEAFE',
    alignItems: 'center',
  },
  tokenValue: {
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
  tokenUnitsText: {
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
  detailsCard: {
    width: '100%',
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.lg,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  detailLabel: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurface,
  },
  highlightVal: {
    color: Palette.primaryLight,
    fontWeight: '700',
  },
  refCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refText: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: 2,
  },
  successPill: {
    backgroundColor: 'rgba(0, 208, 132, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Rounded.full,
  },
  successPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.tertiary,
  },
  actionsBox: {
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
  },
});
