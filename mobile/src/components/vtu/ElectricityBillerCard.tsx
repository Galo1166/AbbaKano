import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { MOCK_ELECTRICITY_DISCOS, UtilityBiller } from '@/constants/mockData';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
import { useCheckout } from '@/context/CheckoutContext';
import { useApp } from '@/context/AppContext';

export const ElectricityBillerCard: React.FC = () => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [selectedDisCo, setSelectedDisCo] = useState<UtilityBiller>(MOCK_ELECTRICITY_DISCOS[0]);
  const [meterType, setMeterType] = useState<'PREPAID' | 'POSTPAID'>('PREPAID');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('5000');
  const [verifiedCustomer, setVerifiedCustomer] = useState<string | null>(null);

  const { startCheckout, paymentSuccessCount } = useCheckout();

  const clearInputs = () => {
    setMeterNumber('');
    setVerifiedCustomer(null);
    setAmount('5000');
  };

  const prevCountRef = React.useRef(paymentSuccessCount);
  React.useEffect(() => {
    if (paymentSuccessCount > prevCountRef.current) {
      prevCountRef.current = paymentSuccessCount;
      clearInputs();
    }
  }, [paymentSuccessCount]);

  // Simulate instant customer meter verification when 11 digits are entered
  useEffect(() => {
    if (meterNumber.length === 11) {
      setVerifiedCustomer('ALHAJI SANI BELLO • KANO METROPOLITAN');
    } else {
      setVerifiedCustomer(null);
    }
  }, [meterNumber]);

  const presetAmounts = ['1000', '2000', '3000', '5000', '10000', '20000'];

  const handlePay = () => {
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount < 500) return;
    if (meterNumber.length < 11) return;

    startCheckout({
      type: 'ELECTRICITY',
      title: `${selectedDisCo.name} ${meterType}`,
      serviceName: `${selectedDisCo.name} Electricity Token`,
      recipient: meterNumber,
      amount: numAmount,
      fee: 100,
      billerName: selectedDisCo.name,
      units: `${(numAmount / 72.5).toFixed(1)} kWh`,
      onSuccess: clearInputs,
    });
  };

  return (
    <View style={styles.container}>
      {/* DisCo Selector */}
      <Text style={styles.sectionTitle}>SELECT ELECTRICITY DISTRIBUTION COMPANY (DISCO)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.discoRow}
      >
        {MOCK_ELECTRICITY_DISCOS.map((disco) => {
          const isSelected = disco.id === selectedDisCo.id;
          return (
            <Pressable
              key={disco.id}
              style={[styles.discoChip, isSelected && styles.discoChipSelected]}
              onPress={() => setSelectedDisCo(disco)}
            >
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={16}
                color={isSelected ? Palette.primary : Palette.onSurfaceMuted}
              />
              <Text style={[styles.discoText, isSelected && styles.discoTextSelected]}>
                {disco.code}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Meter Type Segmented Control */}
      <View style={styles.meterTypeContainer}>
        {(['PREPAID', 'POSTPAID'] as const).map((type) => {
          const isSelected = meterType === type;
          return (
            <Pressable
              key={type}
              style={[styles.meterTypeBtn, isSelected && styles.meterTypeBtnActive]}
              onPress={() => setMeterType(type)}
            >
              <Text
                style={[styles.meterTypeText, isSelected && styles.meterTypeTextActive]}
              >
                {type === 'PREPAID' ? 'Prepaid (Token Code)' : 'Postpaid (Bill Payment)'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Meter Number Input */}
      <FormInput
        label="Meter / Account Number"
        placeholder="Enter meter or account number"
        value={meterNumber}
        onChangeText={setMeterNumber}
        keyboardType="numeric"
        maxLength={11}
        leftIcon={<MaterialCommunityIcons name="counter" size={18} color={Palette.onSurfaceMuted} />}
      />

      {/* Verified Customer Card preview */}
      {verifiedCustomer && (
        <View style={styles.verifiedBox}>
          <Ionicons name="checkmark-circle" size={18} color={Palette.tertiary} />
          <View style={styles.verifiedInfo}>
            <Text style={styles.verifiedLabel}>Verified Account Name</Text>
            <Text style={styles.verifiedName}>{verifiedCustomer}</Text>
          </View>
        </View>
      )}

      {/* Amount Preset Chips */}
      <Text style={styles.sectionTitle}>RECHARGE AMOUNT (₦)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.amountChipsRow}
      >
        {presetAmounts.map((p) => {
          const isSelected = amount === p;
          return (
            <Pressable
              key={p}
              style={[styles.amountChip, isSelected && styles.amountChipSelected]}
              onPress={() => setAmount(p)}
            >
              <Text
                style={[styles.amountChipText, isSelected && styles.amountChipTextSelected]}
              >
                ₦{parseInt(p, 10).toLocaleString()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Button
        title={`Purchase ₦${amount || '0'} Electricity Token`}
        onPress={handlePay}
        disabled={meterNumber.length < 11 || !amount}
        variant="primary"
        style={{ marginTop: Spacing.four }}
      />
    </View>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.two,
  },
  discoRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
    paddingBottom: 2,
  },
  discoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Rounded.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  discoChipSelected: {
    borderColor: Palette.primary,
    backgroundColor: 'rgba(77, 142, 255, 0.12)',
  },
  discoText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  discoTextSelected: {
    color: Palette.primaryLight,
    fontWeight: '800',
  },
  meterTypeContainer: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.lg,
    padding: 3,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  meterTypeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Rounded.md,
  },
  meterTypeBtnActive: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    elevation: 2,
  },
  meterTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceMuted,
  },
  meterTypeTextActive: {
    color: Palette.primary,
    fontWeight: '800',
  },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoAndHalf,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    borderRadius: Rounded.md,
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0, 208, 132, 0.25)',
  },
  verifiedInfo: {
    flex: 1,
  },
  verifiedLabel: {
    fontSize: 10,
    color: Palette.onSurfaceMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  verifiedName: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.tertiary,
    marginTop: 2,
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
  amountChipSelected: {
    borderColor: Palette.primary,
    backgroundColor: Palette.surfaceHigh,
  },
  amountChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.onSurface,
  },
  amountChipTextSelected: {
    color: Palette.primaryLight,
    fontWeight: '800',
  },
});
