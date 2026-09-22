import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { MOCK_CABLE_PROVIDERS, UtilityBiller } from '@/constants/mockData';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
import { useCheckout } from '@/context/CheckoutContext';
import { useApp } from '@/context/AppContext';

export const CableTvBillerCard: React.FC = () => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [selectedProvider, setSelectedProvider] = useState<UtilityBiller>(MOCK_CABLE_PROVIDERS[0]);
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    MOCK_CABLE_PROVIDERS[0].packages?.[0]?.id || ''
  );
  const [verifiedCustomer, setVerifiedCustomer] = useState<string | null>(null);

  const { startCheckout, paymentSuccessCount } = useCheckout();

  const clearInputs = () => {
    setSmartcardNumber('');
    setVerifiedCustomer(null);
  };

  const prevCountRef = React.useRef(paymentSuccessCount);
  React.useEffect(() => {
    if (paymentSuccessCount > prevCountRef.current) {
      prevCountRef.current = paymentSuccessCount;
      clearInputs();
    }
  }, [paymentSuccessCount]);

  useEffect(() => {
    if (smartcardNumber.length === 10) {
      setVerifiedCustomer('AISHA BELLO • SMARTCARD ACTIVE');
    } else {
      setVerifiedCustomer(null);
    }
  }, [smartcardNumber]);

  const packages = selectedProvider.packages || [];
  const activePackage = packages.find((p) => p.id === selectedPackageId) || packages[0];

  const handleSubscribe = () => {
    if (!activePackage || smartcardNumber.length < 10) return;

    startCheckout({
      type: 'CABLE_TV',
      title: `${selectedProvider.code} ${activePackage.name}`,
      serviceName: `${selectedProvider.name}`,
      recipient: smartcardNumber,
      planName: activePackage.name,
      amount: activePackage.price,
      fee: 100,
      billerName: selectedProvider.name,
      onSuccess: clearInputs,
    });
  };

  return (
    <View style={styles.container}>
      {/* Provider Selector Chips */}
      <Text style={styles.sectionTitle}>SELECT CABLE TV PROVIDER</Text>
      <View style={styles.providerRow}>
        {MOCK_CABLE_PROVIDERS.map((prov) => {
          const isSelected = prov.id === selectedProvider.id;
          return (
            <Pressable
              key={prov.id}
              style={[
                styles.provChip,
                isSelected && {
                  borderColor: prov.brandColor || Palette.primary,
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                },
              ]}
              onPress={() => {
                setSelectedProvider(prov);
                if (prov.packages && prov.packages.length > 0) {
                  setSelectedPackageId(prov.packages[0].id);
                }
              }}
            >
              <View
                style={[
                  styles.provLogoCircle,
                  isSelected && {
                    borderColor: prov.brandColor || Palette.primary,
                    borderWidth: 1.5,
                  },
                ]}
              >
                {prov.logo ? (
                  <Image
                    source={prov.logo}
                    style={styles.provLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="television-classic"
                    size={20}
                    color={isSelected ? Palette.primary : Palette.onSurfaceMuted}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.provText,
                  isSelected && {
                    color: prov.brandColor || Palette.primary,
                    fontWeight: '800',
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {prov.code === 'STARTIMES' ? 'StarTimes' : prov.code}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* SmartCard / IUC Input */}
      <FormInput
        label="SmartCard / IUC Number"
        placeholder="Enter SmartCard or IUC number"
        value={smartcardNumber}
        onChangeText={setSmartcardNumber}
        keyboardType="numeric"
        maxLength={10}
        leftIcon={<Ionicons name="card-outline" size={18} color={Palette.onSurfaceMuted} />}
      />

      {/* Verified Customer preview */}
      {verifiedCustomer && (
        <View style={styles.verifiedBox}>
          <Ionicons name="checkmark-circle" size={18} color={Palette.tertiary} />
          <View>
            <Text style={styles.verifiedLabel}>Customer Verified</Text>
            <Text style={styles.verifiedName}>{verifiedCustomer}</Text>
          </View>
        </View>
      )}

      {/* Bouquets Package Selector */}
      <Text style={styles.sectionTitle}>SELECT PACKAGE / BOUQUET</Text>
      <View style={styles.packageList}>
        {packages.map((pkg) => {
          const isSelected = pkg.id === activePackage?.id;
          return (
            <Pressable
              key={pkg.id}
              style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
              onPress={() => setSelectedPackageId(pkg.id)}
            >
              <Text style={[styles.pkgName, isSelected && styles.pkgNameSelected]}>
                {pkg.name}
              </Text>
              <Text style={[styles.pkgPrice, isSelected && styles.pkgPriceSelected]}>
                ₦{pkg.price.toLocaleString()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title={
          activePackage
            ? `Pay ₦${activePackage.price.toLocaleString()} Subscription`
            : 'Select Bouquet'
        }
        onPress={handleSubscribe}
        disabled={smartcardNumber.length < 10 || !activePackage}
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
  providerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  provChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: Rounded.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.border,
    minHeight: 84,
  },
  provChipSelected: {
    borderColor: Palette.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  provLogoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  provLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  provText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
  },
  provTextSelected: {
    color: Palette.primary,
    fontWeight: '800',
  },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    borderRadius: Rounded.md,
    padding: Spacing.three,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0, 208, 132, 0.25)',
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
  packageList: {
    gap: Spacing.two,
  },
  pkgCard: {
    backgroundColor: Palette.surface,
    borderRadius: Rounded.lg,
    padding: Spacing.three,
    borderWidth: 1.5,
    borderColor: Palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pkgCardSelected: {
    borderColor: Palette.primary,
    backgroundColor: 'rgba(77, 142, 255, 0.12)',
  },
  pkgName: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.onSurface,
  },
  pkgNameSelected: {
    color: Palette.primary,
    fontWeight: '700',
  },
  pkgPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.onSurface,
    fontVariant: ['tabular-nums'],
  },
  pkgPriceSelected: {
    color: Palette.primary,
    fontWeight: '800',
  },
});
