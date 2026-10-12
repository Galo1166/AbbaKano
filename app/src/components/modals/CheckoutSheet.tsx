import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { useCheckout } from '@/context/CheckoutContext';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/common/Button';

export const CheckoutSheet: React.FC = () => {
  const { isSheetOpen, closeSheet, proceedToPin, draft } = useCheckout();
  const { mainBalance, theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);

  const cleanServiceTitle = useMemo(() => {
    if (!draft) return '';
    if (draft.type === 'DATA') {
      const net = draft.network ? draft.network.toUpperCase() : '';
      return `${net} Data Bundle`.trim();
    }
    // Deduplicate repeated consecutive words like "AIRTEL AIRTEL"
    let title = draft.title.replace(/\b([A-Za-z]+)\s+\1\b/gi, '$1');
    return title;
  }, [draft]);

  const cleanPlanName = useMemo(() => {
    if (!draft || !draft.planName) return null;
    let name = draft.planName.trim();
    // If name begins with network name (e.g. "AIRTEL GIFTING 1.0GB"), strip redundant network name
    if (draft.network && name.toUpperCase().startsWith(draft.network.toUpperCase())) {
      name = name.slice(draft.network.length).trim();
    }
    // Deduplicate consecutive words
    name = name.replace(/\b([A-Za-z]+)\s+\1\b/gi, '$1');
    // Deduplicate duplicate "(30 Days) (30 Days)"
    name = name.replace(/\s*\(\s*(\d+\s*days?)\s*\)\s*\(\s*\1\s*\)/gi, ' ($1)');
    return name;
  }, [draft]);

  if (!draft) return null;

  const totalPayable = draft.amount + draft.fee;
  const balanceAfter = mainBalance - totalPayable;
  const hasSufficientBalance = mainBalance >= totalPayable;

  return (
    <Modal
      visible={isSheetOpen}
      transparent
      animationType="slide"
      onRequestClose={closeSheet}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={closeSheet} />

        <View style={styles.sheetContainer}>
          {/* Handle Indicator */}
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Review & Confirm</Text>
              <Text style={styles.sheetSubtitle}>Transaction Summary</Text>
            </View>

            <Pressable style={styles.closeBtn} onPress={closeSheet} hitSlop={8}>
              <Ionicons name="close" size={20} color={Palette.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount Callout */}
            <View style={styles.amountCallout}>
              <Text style={styles.calloutLabel}>TOTAL AMOUNT DUE</Text>
              <Text style={styles.calloutAmount}>₦{totalPayable.toLocaleString()}</Text>
            </View>

            {/* Itemized Breakdown Table */}
            <View style={styles.breakdownBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {cleanServiceTitle}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Recipient</Text>
                <Text style={[styles.detailValue, styles.highlightValue]} numberOfLines={1}>
                  {draft.recipient}
                </Text>
              </View>

              {cleanPlanName ? (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plan / Package</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>
                      {cleanPlanName}
                    </Text>
                  </View>
                </>
              ) : null}

              {draft.fee > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Convenience Fee</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>
                      ₦{draft.fee.toLocaleString()}
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  AbbaKano Main Wallet
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Balance</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  ₦{mainBalance.toLocaleString()}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Balance After</Text>
                <Text
                  style={[
                    styles.detailValue,
                    { color: hasSufficientBalance ? Palette.tertiary : Palette.error },
                  ]}
                  numberOfLines={1}
                >
                  {balanceAfter < 0
                    ? `-₦${Math.abs(balanceAfter).toLocaleString()}`
                    : `₦${balanceAfter.toLocaleString()}`}
                </Text>
              </View>
            </View>

            {!hasSufficientBalance && (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={18} color={Palette.error} />
                <Text style={styles.warningText}>
                  Insufficient funds in your main wallet. Please top up your wallet via your dedicated virtual account.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <Button
              title="Confirm & Authorize PIN"
              onPress={proceedToPin}
              disabled={!hasSufficientBalance}
              variant="primary"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Rounded.xxl,
    borderTopRightRadius: Rounded.xxl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Platform.select({ ios: 36, default: 24 }),
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: Palette.borderHigh,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.surfaceHighest,
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountCallout: {
    alignItems: 'center',
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  calloutLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  calloutAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.onSurface,
    fontVariant: ['tabular-nums'],
  },
  breakdownBox: {
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.lg,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Palette.onSurfaceMuted,
    flex: 1,
    lineHeight: 18,
  },
  detailValue: {
    flex: 1.5,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.onSurface,
    textAlign: 'right',
    lineHeight: 18,
  },
  highlightValue: {
    color: Palette.primaryLight,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    opacity: 0.6,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: Spacing.three,
    borderRadius: Rounded.md,
    marginBottom: Spacing.three,
  },
  warningText: {
    fontSize: 12,
    color: Palette.error,
    flex: 1,
  },
  footer: {
    paddingTop: Spacing.two,
  },
});
