import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { TelcoNetworkId, TELCO_NETWORKS } from '@/constants/telco';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
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

export const DataBundlePicker: React.FC<DataBundlePickerProps> = ({
  initialNetwork = 'MTN',
  selectedNetwork: propSelectedNetwork,
  onSelectNetwork,
}) => {
  const { theme: Palette } = useApp();
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

  const { detectedNetwork } = useTelcoDetector(recipientNumber);
  const { startCheckout, paymentSuccessCount } = useCheckout();

  const clearInputs = () => {
    setRecipientNumber('');
  };

  const prevCountRef = React.useRef(paymentSuccessCount);
  React.useEffect(() => {
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

  const activePlan = availablePlans.find((p) => p.id === selectedPlanId) || availablePlans[0];
  const netConfig = TELCO_NETWORKS[selectedNetwork];

  const handleBuy = () => {
    if (!activePlan || recipientNumber.length < 11 || (activePlan as DataPlan & { purchaseAvailable?: boolean }).purchaseAvailable === false) return;

    startCheckout({
      type: 'DATA',
      title: `${selectedNetwork} ${activePlan.dataAmount} Data`,
      serviceName: `${selectedNetwork} ${activePlan.type} Data Bundle`,
      network: selectedNetwork,
      recipient: recipientNumber,
      planName: `${activePlan.dataAmount} (${activePlan.validity})`,
      amount: activePlan.price,
      fee: 0,
      planToken: (activePlan as DataPlan & { planToken?: string }).planToken,
      onSuccess: clearInputs,
    });
  };

  return (
    <View style={styles.container}>
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
              >
                {type === 'GENERAL' ? 'General' : type === 'SME' ? 'SME Data' : type === 'CORPORATE' ? 'Corp Gifting' : 'Direct Data'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Recipient Phone Input */}
      <FormInput
        label="Beneficiary Phone Number"
        placeholder="Enter phone number"
        value={recipientNumber}
        onChangeText={(val) => {
          setRecipientNumber(val);
          // If a new network is detected, optionally switch network tab
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

      {/* Plan Selection Section */}
      <Text style={styles.plansSectionTitle}>
        {plansLoading ? 'LOADING DATA PLANS...' : `AVAILABLE ${selectedNetwork} ${dataType} PLANS`}
      </Text>

      {plansError && <Text style={styles.plansSectionTitle}>{plansError}</Text>}

      <View style={styles.plansGrid}>
        {availablePlans.map((plan) => {
          const isSelected = plan.id === activePlan?.id;
          return (
            <Pressable
              key={plan.id}
              style={[
                styles.planCard,
                isSelected && {
                  borderColor: netConfig.brandColor,
                  backgroundColor: netConfig.bgLight,
                },
              ]}
              onPress={() => setSelectedPlanId(plan.id)}
            >
              <View style={styles.planTop}>
                <Text
                  style={[
                    styles.dataAmountText,
                    isSelected && { color: netConfig.brandColor, fontWeight: '800' },
                  ]}
                >
                  {plan.dataAmount}
                </Text>
                <Text style={styles.validityText}>{plan.validity || 'Available'}</Text>
              </View>

              <View style={styles.planBottom}>
                <Text style={styles.priceText}>₦{plan.price.toLocaleString()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Checkout Action Button */}
      <Button
        title={
          activePlan && (activePlan as DataPlan & { purchaseAvailable?: boolean }).purchaseAvailable === false
            ? 'Purchases coming soon'
            : activePlan
            ? `Buy ${activePlan.dataAmount} for ₦${activePlan.price.toLocaleString()}`
            : 'Select a Plan'
        }
        onPress={handleBuy}
        disabled={!activePlan || recipientNumber.length < 11 || plansLoading || (activePlan as DataPlan & { purchaseAvailable?: boolean }).purchaseAvailable === false}
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
});
