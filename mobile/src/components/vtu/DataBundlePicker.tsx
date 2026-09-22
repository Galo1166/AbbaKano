import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { TelcoNetworkId, TELCO_NETWORKS } from '@/constants/telco';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
import { useTelcoDetector } from '@/hooks/useTelcoDetector';
import { useCheckout } from '@/context/CheckoutContext';
import { useApp, VtuPlan } from '@/context/AppContext';
import { ApiError } from '@/lib/api';

interface DataBundlePickerProps {
  initialNetwork?: TelcoNetworkId;
  selectedNetwork?: TelcoNetworkId;
  onSelectNetwork?: (net: TelcoNetworkId) => void;
}

type DataCategory = 'GENERAL' | 'SME' | 'GIFTING';

const categoryOptions: Array<{ key: DataCategory; label: string }> = [
  { key: 'GENERAL', label: 'General' },
  { key: 'SME', label: 'SME Data' },
  { key: 'GIFTING', label: 'Gifting' },
];

function normalizeCategory(rawCategory?: string | null): DataCategory {
  const normalized = String(rawCategory || '').toLowerCase();
  if (normalized.includes('sme')) return 'SME';
  if (normalized.includes('gift') || normalized.includes('corp') || normalized.includes('corporate')) return 'GIFTING';
  return 'GENERAL';
}

function categoryLabel(category: DataCategory): string {
  return categoryOptions.find((option) => option.key === category)?.label || 'General';
}

export const DataBundlePicker: React.FC<DataBundlePickerProps> = ({
  initialNetwork = 'MTN',
  selectedNetwork: propSelectedNetwork,
  onSelectNetwork,
}) => {
  const { theme: Palette, vtuPlans, loadVtuPlans } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [internalNetwork, setInternalNetwork] = useState<TelcoNetworkId>(initialNetwork);
  const [plans, setPlans] = useState<VtuPlan[]>([]);
  const [dataCategory, setDataCategory] = useState<DataCategory>('GENERAL');
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedNetwork = propSelectedNetwork ?? internalNetwork;
  const setSelectedNetwork = (net: TelcoNetworkId) => {
    setInternalNetwork(net);
    onSelectNetwork?.(net);
  };

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
    let ignore = false;
    setIsLoading(true);
    setErrorMessage(null);

    loadVtuPlans(selectedNetwork)
      .then((loadedPlans) => {
        if (ignore) return;
        setPlans(loadedPlans);
        setSelectedPlanCode((current) => {
          if (current && loadedPlans.some((plan) => plan.code === current)) return current;
          return loadedPlans[0]?.code || '';
        });
      })
      .catch((error: unknown) => {
        if (ignore) return;
        const message = error instanceof ApiError ? error.message : 'Could not load plans right now.';
        setErrorMessage(message);
        setPlans([]);
        setSelectedPlanCode('');
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [loadVtuPlans, selectedNetwork]);

  const groupedPlans = useMemo(() => {
    const groups: Record<DataCategory, VtuPlan[]> = { GENERAL: [], SME: [], GIFTING: [] };
    for (const plan of plans) {
      groups[normalizeCategory(plan.category)]?.push(plan);
    }
    return groups;
  }, [plans]);

  useEffect(() => {
    const visibleCategories = categoryOptions
      .filter((option) => (groupedPlans[option.key]?.length || 0) > 0)
      .map((option) => option.key);

    if (visibleCategories.length === 0) {
      setDataCategory('GENERAL');
      return;
    }

    if (!visibleCategories.includes(dataCategory)) {
      setDataCategory(visibleCategories[0]);
    }
  }, [groupedPlans, dataCategory]);

  const availablePlans = groupedPlans[dataCategory] || [];
  const activePlan = availablePlans.find((plan) => plan.code === selectedPlanCode) || availablePlans[0];

  useEffect(() => {
    if (activePlan && activePlan.code !== selectedPlanCode) {
      setSelectedPlanCode(activePlan.code);
    }
  }, [activePlan, selectedPlanCode]);

  const netConfig = TELCO_NETWORKS[selectedNetwork];

  const handleBuy = () => {
    if (!activePlan || recipientNumber.length < 11) return;

    startCheckout({
      type: 'DATA',
      title: `${selectedNetwork} ${activePlan.label}`,
      serviceName: `${selectedNetwork} ${categoryLabel(dataCategory)} Data Bundle`,
      network: selectedNetwork,
      recipient: recipientNumber,
      planName: activePlan.label,
      planCode: activePlan.code,
      planToken: activePlan.selectionToken,
      provider: activePlan.provider,
      amount: Number(activePlan.price) || 0,
      fee: 0,
      onSuccess: clearInputs,
    });
  };

  const tabs = categoryOptions.filter((option) => (groupedPlans[option.key]?.length || 0) > 0);

  return (
    <View style={styles.container}>
      {tabs.length > 0 ? (
        <View style={styles.segmentContainer}>
          {tabs.map((option) => {
            const isSelected = dataCategory === option.key;
            return (
              <Pressable
                key={option.key}
                style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                onPress={() => setDataCategory(option.key)}
              >
                <Text style={[styles.segmentBtnText, isSelected && styles.segmentBtnTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <FormInput
        label="Beneficiary Phone Number"
        placeholder="Enter phone number"
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

      <Text style={styles.plansSectionTitle}>
        {isLoading ? 'LOADING PLANS...' : `AVAILABLE ${selectedNetwork} ${categoryLabel(dataCategory)} PLANS`}
      </Text>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {!isLoading && availablePlans.length === 0 ? (
        <Text style={styles.emptyText}>No {categoryLabel(dataCategory).toLowerCase()} plans are currently available for {selectedNetwork}.</Text>
      ) : null}

      {!isLoading && availablePlans.length > 0 ? (
        <View style={styles.plansGrid}>
          {availablePlans.map((plan) => {
            const isSelected = plan.code === activePlan?.code;
            return (
              <Pressable
                key={`${plan.code}-${plan.label}`}
                style={[
                  styles.planCard,
                  isSelected && {
                    borderColor: netConfig.brandColor,
                    backgroundColor: netConfig.bgLight,
                  },
                ]}
                onPress={() => setSelectedPlanCode(plan.code)}
              >
                <View style={styles.planTop}>
                  <Text
                    style={[
                      styles.dataAmountText,
                      isSelected && { color: netConfig.brandColor, fontWeight: '800' },
                    ]}
                  >
                    {plan.label}
                  </Text>
                  <Text style={styles.validityText}>{plan.category || categoryLabel(dataCategory)}</Text>
                </View>

                <View style={styles.planBottom}>
                  <Text style={styles.priceText}>₦{Number(plan.price || 0).toLocaleString()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Button
        title={
          activePlan
            ? `Buy ${activePlan.label} for ₦${Number(activePlan.price || 0).toLocaleString()}`
            : 'Select a Plan'
        }
        onPress={handleBuy}
        disabled={!activePlan || recipientNumber.length < 11}
        variant={selectedNetwork === 'GLO' ? 'emerald' : 'primary'}
        style={{ marginTop: Spacing.four }}
      />
    </View>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
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
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceMuted,
  },
  segmentBtnTextActive: {
    color: Palette.primary,
    fontWeight: '800',
  },
  plansSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.two,
  },
  plansGrid: {
    gap: Spacing.two,
  },
  planCard: {
    backgroundColor: Palette.surface,
    borderRadius: Rounded.lg,
    padding: Spacing.three,
    borderWidth: 1.5,
    borderColor: Palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planTop: {
    justifyContent: 'center',
    flex: 1,
    paddingRight: Spacing.two,
  },
  dataAmountText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.onSurface,
    marginBottom: 2,
  },
  validityText: {
    fontSize: 11,
    color: Palette.onSurfaceMuted,
  },
  planBottom: {
    alignItems: 'flex-end',
    gap: 3,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.onSurface,
    fontVariant: ['tabular-nums'],
  },
  errorText: {
    fontSize: 12,
    color: Palette.error,
    marginBottom: Spacing.two,
  },
  emptyText: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
    marginBottom: Spacing.two,
  },
});