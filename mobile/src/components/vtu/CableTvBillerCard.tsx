import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
import { useCheckout } from '@/context/CheckoutContext';
import { useApp } from '@/context/AppContext';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { SCREEN_ASSETS } from '../../../assets/screenAssets';

type CableProvider = {
  id: string;
  name: string;
  code: string;
  logo?: any;
  brandColor: string;
};

type CablePlan = {
  label: string;
  price: number;
  code: string;
  category?: string | null;
  selectionToken?: string;
};

const CABLE_PROVIDERS: CableProvider[] = [
  { id: 'dstv', name: 'DStv Subscription', code: 'DSTV', logo: SCREEN_ASSETS.dstvLogo, brandColor: '#00A3E0' },
  { id: 'gotv', name: 'GOtv Subscription', code: 'GOTV', logo: SCREEN_ASSETS.gotvLogo, brandColor: '#00833E' },
  { id: 'startimes', name: 'StarTimes Subscription', code: 'STARTIMES', logo: SCREEN_ASSETS.startimesLogo, brandColor: '#FF6F00' },
];

export const CableTvBillerCard: React.FC = () => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [selectedProvider, setSelectedProvider] = useState<CableProvider>(CABLE_PROVIDERS[0]);
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [selectedPackageCode, setSelectedPackageCode] = useState('');
  const [plans, setPlans] = useState<CablePlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [verifiedCustomer, setVerifiedCustomer] = useState<string | null>(null);
  const [verifyingCustomer, setVerifyingCustomer] = useState(false);

  const { startCheckout, paymentSuccessCount } = useCheckout();

  const clearInputs = () => {
    setSmartcardNumber('');
  };

  const prevCountRef = React.useRef(paymentSuccessCount);
  React.useEffect(() => {
    if (paymentSuccessCount > prevCountRef.current) {
      prevCountRef.current = paymentSuccessCount;
      clearInputs();
    }
  }, [paymentSuccessCount]);

  const loadPlans = async (provider: CableProvider) => {
    setLoadingPlans(true);
    setPlansError(null);
    try {
      const response = await apiGet<{ plans: CablePlan[] }>(
        `/vtu/service-plans?service=cable&provider=${encodeURIComponent(provider.id)}`,
      );
      const nextPlans = (response.plans || []).map((plan) => ({
        ...plan,
        label: String(plan.label || 'Cable package'),
        price: Number(plan.price || 0),
        code: String(plan.code || ''),
      }));
      setPlans(nextPlans);
      setSelectedPackageCode(nextPlans[0]?.code || '');
    } catch (error) {
      setPlans([]);
      setSelectedPackageCode('');
      setPlansError(error instanceof ApiError ? error.message : 'Could not load cable packages.');
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    void loadPlans(selectedProvider);
  }, [selectedProvider]);

  useEffect(() => {
    setVerifiedCustomer(null);
    if (!/^\d{10}$/.test(smartcardNumber)) return;

    let cancelled = false;
    setVerifyingCustomer(true);
    void apiPost<{ customerName: string }>('/vtu/verify-cable', {
      provider: selectedProvider.id,
      smartcardNumber,
    }).then((response) => {
      if (!cancelled) setVerifiedCustomer(response.customerName);
    }).catch(() => {
      if (!cancelled) setVerifiedCustomer(null);
    }).finally(() => {
      if (!cancelled) setVerifyingCustomer(false);
    });

    return () => {
      cancelled = true;
    };
  }, [smartcardNumber, selectedProvider.id]);

  const activePackage = plans.find((plan) => plan.code === selectedPackageCode) || plans[0];

  const handleSubscribe = () => {
    if (!activePackage || smartcardNumber.length < 10) return;

    startCheckout({
      type: 'CABLE_TV',
      title: `${selectedProvider.code} ${activePackage.label}`,
      serviceName: `${selectedProvider.name}`,
      recipient: smartcardNumber,
      planName: activePackage.label,
      planCode: activePackage.code,
      planToken: activePackage.selectionToken,
      network: selectedProvider.id as 'DSTV' | 'GOTV' | 'STARTIMES',
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
        {CABLE_PROVIDERS.map((prov) => {
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
                setPlans([]);
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

      {verifyingCustomer && <Text style={styles.statusText}>Verifying customer...</Text>}
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
        {loadingPlans && <Text style={styles.statusText}>Loading live packages...</Text>}
        {!loadingPlans && plansError && <Text style={styles.errorText}>{plansError}</Text>}
        {!loadingPlans && !plansError && plans.map((pkg) => {
          const isSelected = pkg.code === activePackage?.code;
          return (
            <Pressable
              key={pkg.code}
              style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
              onPress={() => setSelectedPackageCode(pkg.code)}
            >
              <Text style={[styles.pkgName, isSelected && styles.pkgNameSelected]}>
                {pkg.label}
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
            : loadingPlans ? 'Loading Packages...' : 'Select Bouquet'
        }
        onPress={handleSubscribe}
        disabled={smartcardNumber.length < 10 || !activePackage || loadingPlans || Boolean(plansError)}
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
  statusText: {
    color: Palette.onSurfaceMuted,
    fontSize: 13,
    paddingVertical: Spacing.three,
  },
  errorText: {
    color: Palette.error,
    fontSize: 13,
    paddingVertical: Spacing.three,
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
