import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { TELCO_LIST, TelcoNetworkId } from '@/constants/telco';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface TelcoNetworkSelectorProps {
  selectedNetwork: TelcoNetworkId;
  onSelectNetwork: (networkId: TelcoNetworkId) => void;
}

export const TelcoNetworkSelector: React.FC<TelcoNetworkSelectorProps> = ({
  selectedNetwork,
  onSelectNetwork,
}) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>SELECT NETWORK OPERATOR</Text>

      <View style={styles.grid}>
        {TELCO_LIST.map((net) => {
          const isSelected = selectedNetwork === net.id;

          return (
            <Pressable
              key={net.id}
              style={[
                styles.networkCard,
                isSelected && {
                  borderColor: net.brandColor,
                  backgroundColor: net.bgLight,
                },
              ]}
              onPress={() => onSelectNetwork(net.id)}
              accessible={true}
              accessibilityLabel={`${net.name} Network`}
            >
              <View
                style={[
                  styles.brandCircle,
                  {
                    backgroundColor: net.brandColor,
                    borderColor: isSelected ? net.brandColor : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                <Image
                  source={net.logo}
                  style={styles.carrierLogo}
                  resizeMode="contain"
                />
              </View>

              <Text
                style={[
                  styles.networkName,
                  isSelected && { color: net.brandColor, fontWeight: '800' },
                ]}
              >
                {net.name}
              </Text>

              {isSelected && (
                <View style={[styles.activeDot, { backgroundColor: net.brandColor }]} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    marginBottom: Spacing.four,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  networkCard: {
    flex: 1,
    height: 82,
    borderRadius: Rounded.lg,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderWidth: 1.5,
    borderColor: Palette.border,
    position: 'relative',
  },
  brandCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    overflow: 'hidden',
    borderWidth: 1,
  },
  carrierLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  networkName: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurface,
  },
  activeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
