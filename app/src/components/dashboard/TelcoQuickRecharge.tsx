import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { useTelcoDetector } from '@/hooks/useTelcoDetector';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
import { useCheckout } from '@/context/CheckoutContext';
import { useApp } from '@/context/AppContext';
import { TELCO_LIST, TelcoNetworkId } from '@/constants/telco';

const MIN_AMOUNT = 50;
const MAX_AMOUNT = 100000;

export const TelcoQuickRecharge: React.FC = () => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('500');
  const [manualNetwork, setManualNetwork] = useState<TelcoNetworkId | null>(null);

  const { detectedNetwork } = useTelcoDetector(phoneNumber);
  const activeNetwork = manualNetwork ? TELCO_LIST.find((n) => n.id === manualNetwork) : detectedNetwork;

  const { startCheckout, paymentSuccessCount } = useCheckout();

  const clearInputs = () => {
    setPhoneNumber('');
    setAmount('500');
    setManualNetwork(null);
  };

  const prevCountRef = React.useRef(paymentSuccessCount);
  React.useEffect(() => {
    if (paymentSuccessCount > prevCountRef.current) {
      prevCountRef.current = paymentSuccessCount;
      clearInputs();
    }
  }, [paymentSuccessCount]);

  const presetAmounts = ['100', '200', '500', '1000', '2000', '5000', '10000'];

  const numAmount = parseInt(amount, 10);
  const isAmountEntered = amount.trim().length > 0;

  // Validation according to user specification: min 50, max 100,000
  let amountError = '';
  if (isAmountEntered) {
    if (isNaN(numAmount)) {
      amountError = 'Please enter a valid numeric amount';
    } else if (numAmount < MIN_AMOUNT) {
      amountError = `Minimum recharge amount is ₦${MIN_AMOUNT}`;
    } else if (numAmount > MAX_AMOUNT) {
      amountError = `Maximum recharge amount is ₦${MAX_AMOUNT.toLocaleString()}`;
    }
  }

  const isAmountValid = isAmountEntered && !isNaN(numAmount) && numAmount >= MIN_AMOUNT && numAmount <= MAX_AMOUNT;
  const isFormValid = phoneNumber.length >= 11 && isAmountValid;

  const handleRecharge = () => {
    if (!isFormValid) return;

    const netName = activeNetwork ? activeNetwork.name : 'VTU';

    startCheckout({
      type: 'AIRTIME',
      title: `${netName} Airtime Recharge`,
      serviceName: `${netName} VTU Airtime`,
      network: activeNetwork ? activeNetwork.id : undefined,
      recipient: phoneNumber,
      amount: numAmount,
      fee: 0,
      onSuccess: clearInputs,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>SELECT NETWORK OPERATOR</Text>
        {activeNetwork && (
          <View style={[styles.networkBadge, { backgroundColor: activeNetwork.bgLight, borderColor: activeNetwork.brandColor }]}>
            <Text style={[styles.networkBadgeText, { color: activeNetwork.brandColor }]}>
              {activeNetwork.name} DETECTED
            </Text>
          </View>
        )}
      </View>

      {/* Carrier Selector Chips */}
      <View style={styles.networkSelectorRow}>
        {TELCO_LIST.map((net) => {
          const isSelected = activeNetwork?.id === net.id;
          return (
            <Pressable
              key={net.id}
              style={[
                styles.networkSelectChip,
                isSelected && {
                  borderColor: net.brandColor,
                  backgroundColor: net.bgLight,
                },
              ]}
              onPress={() => setManualNetwork(net.id)}
            >
              <Image source={net.logo} style={[styles.chipLogo, { backgroundColor: net.brandColor }]} resizeMode="contain" />
              <Text
                style={[
                  styles.networkSelectText,
                  isSelected && { color: net.brandColor, fontWeight: '800' },
                ]}
              >
                {net.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Recipient Phone Input */}
      <FormInput
        label="Beneficiary Mobile Number"
        placeholder="Enter phone number"
        value={phoneNumber}
        onChangeText={(val) => {
          setPhoneNumber(val);
          if (manualNetwork) setManualNetwork(null); // auto detect takes over on typing
        }}
        keyboardType="phone-pad"
        maxLength={11}
        detectedNetwork={activeNetwork}
        leftIcon={<Ionicons name="call-outline" size={18} color={activeNetwork ? activeNetwork.brandColor : Palette.onSurfaceMuted} />}
      />

      {/* Preferred Recharge Amount Input */}
      <FormInput
        label="Preferred Amount (₦)"
        placeholder="Enter amount (min. ₦50)"
        value={amount}
        onChangeText={(val) => {
          // Keep only numeric digits
          const cleaned = val.replace(/[^0-9]/g, '');
          setAmount(cleaned);
        }}
        keyboardType="numeric"
        maxLength={6}
        error={amountError}
        hint={
          !amountError && isAmountValid
            ? `Amount: ₦${numAmount.toLocaleString()}`
            : !isAmountEntered
            ? `Min: ₦${MIN_AMOUNT} • Max: ₦${MAX_AMOUNT.toLocaleString()}`
            : undefined
        }
        leftIcon={
          <Text style={[styles.currencyPrefix, { color: Palette.onSurfaceVariant }]}>
            ₦
          </Text>
        }
      />

      {/* Preset Quick Amount Chips */}
      <Text style={styles.amountLabel}>SELECT QUICK PRESET</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amountChipsRow}>
        {presetAmounts.map((p) => {
          const isSelected = amount === p;
          return (
            <Pressable
              key={p}
              style={[
                styles.amountChip,
                isSelected && {
                  borderColor: activeNetwork ? activeNetwork.brandColor : Palette.primary,
                  backgroundColor: activeNetwork ? activeNetwork.bgLight : Palette.surfaceHigh,
                },
              ]}
              onPress={() => setAmount(p)}
            >
              <Text
                style={[
                  styles.amountChipText,
                  isSelected && {
                    color: activeNetwork ? activeNetwork.brandColor : Palette.primaryLight,
                    fontWeight: '800',
                  },
                ]}
              >
                ₦{parseInt(p, 10).toLocaleString()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* CTA Button */}
      <Button
        title={
          !isAmountEntered
            ? 'Enter Amount'
            : numAmount < MIN_AMOUNT
            ? `Minimum Amount is ₦${MIN_AMOUNT}`
            : numAmount > MAX_AMOUNT
            ? `Maximum Amount is ₦${MAX_AMOUNT.toLocaleString()}`
            : phoneNumber.length < 11
            ? 'Enter 11-digit Phone Number'
            : `Recharge ₦${numAmount.toLocaleString()}`
        }
        onPress={handleRecharge}
        disabled={!isFormValid}
        variant={activeNetwork?.id === 'GLO' ? 'emerald' : 'primary'}
        style={{ marginTop: Spacing.four }}
      />
    </View>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
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
  networkBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Rounded.full,
    borderWidth: 1,
  },
  networkBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  networkSelectorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  networkSelectChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Rounded.md,
    backgroundColor: Palette.surfaceLow,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
  },
  networkSelectText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.two,
    marginTop: Spacing.two,
  },
  amountChipsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  amountChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Rounded.md,
    backgroundColor: Palette.surfaceLow,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  amountChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.onSurface,
  },
});
