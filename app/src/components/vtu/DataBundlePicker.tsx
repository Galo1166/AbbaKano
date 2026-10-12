import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { TelcoNetworkId, TELCO_NETWORKS } from '@/constants/telco';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
import { TelcoNetworkSelector } from '@/components/vtu/TelcoNetworkSelector';
import { useTelcoDetector } from '@/hooks/useTelcoDetector';
import { useCheckout } from '@/context/CheckoutContext';
import { useApp } from '@/context/AppContext';
import { DataPlan, fetchDataPlans } from '@/services/dataService';
import { ApiError } from '@/lib/api';

interface DataBundlePickerProps {
  initialNetwork?: TelcoNetworkId;
  selectedNetwork?: TelcoNetworkId;
  onSelectNetwork?: (net: TelcoNetworkId) => void;
}

export interface ParsedPlanInfo {
  capacity: string;
  validity: string;
  tag: string | null;
  rawLabel: string;
}

export function parsePlanInfo(rawLabel: string, fallbackValidity?: string): ParsedPlanInfo {
  const label = (rawLabel || '').trim();

  // 1. Extract speed / broadband: e.g. 50.0MBPS, 100MBPS
  const speedMatch = label.match(/(\d+(?:\.\d+)?)\s*(MBPS|GBPS|KBPS)/i);
  // 2. Extract data capacity: e.g. 500MB, 1.5GB, 10GB, 250MB
  const sizeMatch = label.match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB)/i);

  let capacity = '';
  if (speedMatch) {
    capacity = `${speedMatch[1]} ${speedMatch[2].toUpperCase()}`;
  } else if (sizeMatch) {
    capacity = `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`;
  } else {
    // If format like "data_share_500mb"
    const underscoreMatch = label.match(/(\d+)\s*(mb|gb)/i);
    if (underscoreMatch) {
      capacity = `${underscoreMatch[1]} ${underscoreMatch[2].toUpperCase()}`;
    } else {
      capacity = label.replace(/[_-]/g, ' ').split(/\s+/).slice(0, 2).join(' ') || 'Data';
    }
  }

  // 3. Extract validity: e.g. 30 days, 1 day, 7 days, 24 hrs, 1 month
  const valMatch = label.match(/(\d+\s*(?:day|days|month|months|hrs|hours|wk|wks|weeks?))/i);
  let validity = valMatch ? valMatch[0] : (fallbackValidity && fallbackValidity !== 'Available' ? fallbackValidity : '30 Days');
  // Normalize formatting: "1days" -> "1 Day", "30days" -> "30 Days"
  validity = validity.replace(/(\d+)\s*days?/i, (_m, d) => `${d} ${d === '1' ? 'Day' : 'Days'}`);

  // 4. Extract tag
  let tag: string | null = null;
  if (/awoof/i.test(label)) tag = 'Awoof';
  else if (/odu/i.test(label)) tag = 'ODU';
  else if (/share/i.test(label)) tag = 'Share';
  else if (/broad\s*band/i.test(label)) tag = 'Broadband';

  return {
    capacity,
    validity,
    tag,
    rawLabel: label,
  };
}

export const DataBundlePicker: React.FC<DataBundlePickerProps> = ({
  initialNetwork = 'MTN',
  selectedNetwork: propSelectedNetwork,
  onSelectNetwork,
}) => {
  const { theme: Palette, isDark } = useApp();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => getStyles(Palette), [Palette]);

  const [internalNetwork, setInternalNetwork] = useState<TelcoNetworkId>(initialNetwork);
  const selectedNetwork = propSelectedNetwork ?? internalNetwork;

  const setSelectedNetwork = (net: TelcoNetworkId) => {
    setInternalNetwork(net);
    onSelectNetwork?.(net);
  };

  const [dataType, setDataType] = useState<'GENERAL' | 'SME' | 'CORPORATE' | 'DIRECT'>('GENERAL');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('mtn-sme-1gb');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [plans, setPlans] = useState<(DataPlan & { purchaseAvailable?: boolean })[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { detectedNetwork } = useTelcoDetector(recipientNumber);
  const { startCheckout, paymentSuccessCount } = useCheckout();

  const clearInputs = () => {
    setRecipientNumber('');
  };

  const prevCountRef = React.useRef(paymentSuccessCount);
  useEffect(() => {
    if (paymentSuccessCount > prevCountRef.current) {
      prevCountRef.current = paymentSuccessCount;
      clearInputs();
    }
  }, [paymentSuccessCount]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setPlansLoading(true);
      setPlansError(null);
      return fetchDataPlans(selectedNetwork);
    })
      .then((response) => {
        if (cancelled || !response) return;
        setPlans(response.map((plan) => ({ ...plan, resellerDiscount: 0 })));
      })
      .catch((error) => {
        if (!cancelled) {
          setPlans([]);
          setPlansError(error instanceof ApiError ? error.message : 'Could not load data plans.');
        }
      })
      .finally(() => {
        if (!cancelled) setPlansLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedNetwork]);

  const category = dataType === 'CORPORATE' ? 'GIFTING' : dataType;
  const availablePlans = plans.filter((plan) => plan.planType.toUpperCase() === category);

  // Auto-select first plan when available if none selected or selected not in current category
  useEffect(() => {
    if (availablePlans.length > 0) {
      if (!selectedPlanId || !availablePlans.some((p) => p.id === selectedPlanId)) {
        setSelectedPlanId(availablePlans[0].id);
      }
    }
  }, [availablePlans, selectedPlanId]);

  const activePlan = availablePlans.find((p) => p.id === selectedPlanId) || availablePlans[0];
  const netConfig = TELCO_NETWORKS[selectedNetwork];

  const handleBuy = () => {
    if (!activePlan) {
      Alert.alert('Select Plan', 'Please select a data bundle plan to continue.');
      return;
    }
    if (recipientNumber.length < 11) {
      Alert.alert('Phone Number Required', 'Please enter a valid 11-digit recipient phone number in the beneficiary input above.');
      return;
    }
    if ((activePlan as DataPlan & { purchaseAvailable?: boolean }).purchaseAvailable === false) {
      Alert.alert('Coming Soon', 'This data bundle purchase is temporarily unavailable.');
      return;
    }

    const parsed = parsePlanInfo(activePlan.dataAmount, activePlan.validity);
    const cleanPlan = parsed.capacity ? `${parsed.capacity} (${parsed.validity})` : activePlan.dataAmount;

    startCheckout({
      type: 'DATA',
      title: `${selectedNetwork} Data (${activePlan.type || 'Bundle'})`,
      serviceName: `${selectedNetwork} Data`,
      network: selectedNetwork,
      recipient: recipientNumber,
      planName: cleanPlan,
      amount: activePlan.price,
      fee: 0,
      planToken: (activePlan as DataPlan & { planToken?: string }).planToken,
      onSuccess: clearInputs,
    });
  };

  // 3-Column Grid calculation
  const numColumns = 3;
  const horizontalPadding = Spacing.four * 2;
  const gapSize = Spacing.two;
  const totalGaps = gapSize * (numColumns - 1);
  const cardWidth = Math.floor((width - horizontalPadding - totalGaps) / numColumns);

  const parsedActive = activePlan ? parsePlanInfo(activePlan.dataAmount, activePlan.validity) : null;
  const isPurchaseUnavailable = activePlan && (activePlan as DataPlan & { purchaseAvailable?: boolean }).purchaseAvailable === false;
  const hasValidPhone = recipientNumber.trim().length >= 11;
  const isReadyToBuy = activePlan && hasValidPhone && !plansLoading && !isPurchaseUnavailable;

  // Only display the floating Buy Data button when BOTH phone number is entered and plan is selected, and keyboard is closed
  const showFloatingBuyBar = !!activePlan && !!parsedActive && hasValidPhone && !isKeyboardVisible;

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Network Operator Selection */}
        <TelcoNetworkSelector
          selectedNetwork={selectedNetwork}
          onSelectNetwork={setSelectedNetwork}
        />

        {/* Segmented Data Type Tabs */}
        <View style={styles.segmentContainer}>
          {(['GENERAL', 'SME', 'CORPORATE', 'DIRECT'] as const).map((type) => {
            const isSelected = dataType === type;
            return (
              <Pressable
                key={type}
                style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                onPress={() => setDataType(type)}
              >
                <Text
                  style={[styles.segmentBtnText, isSelected && styles.segmentBtnTextActive]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {type === 'GENERAL' ? 'General' : type === 'SME' ? 'SME Data' : type === 'CORPORATE' ? 'Corp Gifting' : 'Direct'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Recipient Phone Input */}
        <FormInput
          label="Beneficiary Phone Number"
          placeholder="Enter 11-digit phone number"
          value={recipientNumber}
          onChangeText={(val) => {
            setRecipientNumber(val);
            if (detectedNetwork && detectedNetwork.id !== selectedNetwork) {
              setSelectedNetwork(detectedNetwork.id);
            }
          }}
          keyboardType="phone-pad"
          maxLength={11}
          detectedNetwork={detectedNetwork}
          leftIcon={
            <Ionicons
              name="phone-portrait-outline"
              size={18}
              color={detectedNetwork ? detectedNetwork.brandColor : Palette.onSurfaceMuted}
            />
          }
        />

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.plansSectionTitle} numberOfLines={1}>
            {plansLoading
              ? 'LOADING DATA PLANS...'
              : `AVAILABLE ${selectedNetwork} ${dataType} PLANS (${availablePlans.length})`}
          </Text>
        </View>

        {plansError && <Text style={styles.errorText}>{plansError}</Text>}

        {/* === 3-COLUMN GRID OF DATA PLANS (3 * N) === */}
        <View style={styles.plansGrid}>
          {availablePlans.map((plan) => {
            const isSelected = plan.id === activePlan?.id;
            const parsed = parsePlanInfo(plan.dataAmount, plan.validity);

            return (
              <Pressable
                key={plan.id}
                style={[
                  styles.planCard,
                  { width: cardWidth },
                  isSelected && [
                    styles.planCardSelected,
                    {
                      borderColor: netConfig.brandColor,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : netConfig.bgLight,
                    },
                  ],
                ]}
                onPress={() => setSelectedPlanId(plan.id)}
              >
                {/* Active Selection Indicator Badge */}
                {isSelected && (
                  <View style={[styles.cardActiveIndicator, { backgroundColor: netConfig.brandColor }]}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                )}

                {/* Optional Tag (e.g. Awoof, ODU, Share) */}
                {parsed.tag ? (
                  <View
                    style={[
                      styles.planTagBadge,
                      {
                        backgroundColor: isSelected
                          ? `${netConfig.brandColor}22`
                          : Palette.surfaceHigh,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.planTagText,
                        { color: isSelected ? netConfig.brandColor : Palette.onSurfaceMuted },
                      ]}
                      numberOfLines={1}
                    >
                      {parsed.tag}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tagSpacer} />
                )}

                {/* Data Capacity / Title */}
                <Text
                  style={[
                    styles.dataAmountText,
                    isSelected && { color: netConfig.brandColor, fontWeight: '800' },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {parsed.capacity}
                </Text>

                {/* Validity Badge */}
                <Text
                  style={[
                    styles.validityText,
                    isSelected && { color: Palette.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {parsed.validity}
                </Text>

                {/* Price Display */}
                <View style={styles.priceContainer}>
                  <Text
                    style={[
                      styles.priceText,
                      isSelected && { color: netConfig.brandColor },
                    ]}
                    numberOfLines={1}
                  >
                    ₦{plan.price.toLocaleString()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Empty State */}
        {!plansLoading && availablePlans.length === 0 && !plansError && (
          <View style={styles.emptyContainer}>
            <Ionicons name="wifi-outline" size={32} color={Palette.onSurfaceMuted} />
            <Text style={styles.emptyText}>No data plans found for this category.</Text>
          </View>
        )}

        {/* === IN-FLOW CHECKOUT BUTTON === */}
        <Button
          title={
            plansLoading
              ? 'Loading data plans...'
              : activePlan && isPurchaseUnavailable
              ? 'Purchases coming soon'
              : activePlan
              ? !hasValidPhone
                ? 'Enter 11-Digit Phone Number'
                : `Buy ${parsedActive?.capacity || activePlan.dataAmount} for ₦${activePlan.price.toLocaleString()}`
              : 'Select a Plan'
          }
          onPress={handleBuy}
          disabled={!isReadyToBuy}
          variant={selectedNetwork === 'GLO' ? 'emerald' : 'primary'}
          style={{ marginTop: Spacing.four, marginBottom: Spacing.two }}
        />

        {/* Bottom Scroll Padding (Ensures scroll view clears floating bar and bottom nav) */}
        <View style={{ height: showFloatingBuyBar ? 150 : 80 }} />
      </ScrollView>

      {/* === INSTANT FLOATING BUY ACTION BAR === */}
      {/* Appears smoothly only when recipient phone number is entered and plan selected, never while typing */}
      {showFloatingBuyBar && (
        <View
          style={[
            styles.floatingBuyBar,
            {
              backgroundColor: Palette.surface,
              borderColor: netConfig.brandColor,
              bottom: Platform.select({ ios: 94, default: 74 }),
            },
          ]}
        >
          <View style={styles.floatingBuyLeft}>
            <View style={styles.stickyPlanRow}>
              <View style={[styles.stickyNetPill, { backgroundColor: netConfig.brandColor }]}>
                <Text style={styles.stickyNetPillText}>{selectedNetwork}</Text>
              </View>
              <Text style={styles.stickyPlanTitle} numberOfLines={1} ellipsizeMode="tail">
                {parsedActive.capacity} ({parsedActive.validity})
              </Text>
            </View>

            <View style={styles.stickyPriceRow}>
              <Text style={[styles.stickyPrice, { color: netConfig.brandColor }]} numberOfLines={1}>
                ₦{activePlan.price.toLocaleString()}
              </Text>
              <Text style={styles.stickyRecipientStatus} numberOfLines={1} ellipsizeMode="middle">
                → {recipientNumber}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.floatingBuyBtn,
              { backgroundColor: selectedNetwork === 'GLO' ? '#008751' : netConfig.brandColor },
              !isReadyToBuy && styles.stickyBuyBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleBuy}
            disabled={!isReadyToBuy}
          >
            <Text style={styles.floatingBuyBtnText} numberOfLines={1}>
              {isPurchaseUnavailable ? 'Coming Soon' : 'Buy Data'}
            </Text>
            <Ionicons name="flash" size={15} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const getStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    outerContainer: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: Spacing.four,
    },
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: Palette.surfaceLow,
      borderRadius: Rounded.lg,
      padding: 3,
      marginBottom: Spacing.four,
      borderWidth: 1,
      borderColor: Palette.border,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Rounded.md,
      paddingHorizontal: 2,
    },
    segmentBtnActive: {
      backgroundColor: Palette.surface,
      borderWidth: 1,
      borderColor: Palette.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    segmentBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: Palette.onSurfaceMuted,
    },
    segmentBtnTextActive: {
      color: Palette.primary,
      fontWeight: '800',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.two,
    },
    plansSectionTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: Palette.onSurfaceMuted,
      letterSpacing: 0.8,
    },
    errorText: {
      fontSize: 12,
      color: Palette.error,
      marginBottom: Spacing.two,
    },

    // === 3-COLUMN GRID ===
    plansGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.two,
      justifyContent: 'flex-start',
    },
    planCard: {
      backgroundColor: Palette.surface,
      borderRadius: Rounded.lg,
      padding: Spacing.two,
      paddingVertical: Spacing.twoAndHalf,
      borderWidth: 1.5,
      borderColor: Palette.border,
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 98,
      position: 'relative',
      overflow: 'hidden',
    },
    planCardSelected: {
      borderWidth: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    cardActiveIndicator: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    planTagBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: Rounded.full,
      marginBottom: 3,
      maxWidth: '85%',
    },
    planTagText: {
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    tagSpacer: {
      height: 14,
    },
    dataAmountText: {
      fontSize: 14,
      fontWeight: '700',
      color: Palette.onSurface,
      textAlign: 'center',
      width: '100%',
    },
    validityText: {
      fontSize: 11,
      color: Palette.onSurfaceMuted,
      textAlign: 'center',
      marginTop: 2,
      marginBottom: 4,
      width: '100%',
    },
    priceContainer: {
      backgroundColor: Palette.surfaceLow,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Rounded.md,
      width: '100%',
      alignItems: 'center',
    },
    priceText: {
      fontSize: 13,
      fontWeight: '800',
      color: Palette.onSurface,
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
    },

    emptyContainer: {
      padding: Spacing.four,
      alignItems: 'center',
      gap: Spacing.two,
      marginTop: Spacing.four,
    },
    emptyText: {
      fontSize: 13,
      color: Palette.onSurfaceMuted,
      textAlign: 'center',
    },

    // === FLOATING BUY BAR ABOVE BOTTOM NAVIGATION ===
    floatingBuyBar: {
      position: 'absolute',
      left: Spacing.three,
      right: Spacing.three,
      borderRadius: Rounded.xl,
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 16,
      zIndex: 999,
    },
    floatingBuyLeft: {
      flex: 1,
      marginRight: Spacing.three,
      gap: 3,
    },
    stickyPlanRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    stickyNetPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: Rounded.sm,
    },
    stickyNetPillText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
    stickyPlanTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: Palette.onSurface,
      flex: 1,
    },
    stickyPriceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    stickyPrice: {
      fontSize: 17,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    stickyValidity: {
      fontSize: 11,
      color: Palette.onSurfaceMuted,
    },
    stickyRecipientStatus: {
      fontSize: 11,
      color: Palette.onSurfaceMuted,
      flex: 1,
    },
    floatingBuyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 16,
      height: 44,
      borderRadius: Rounded.xl,
    },
    stickyBuyBtnDisabled: {
      opacity: 0.5,
    },
    floatingBuyBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
  });
