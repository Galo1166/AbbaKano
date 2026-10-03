import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { PaletteType, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { TelcoNetworkSelector } from '@/components/vtu/TelcoNetworkSelector';
import { DataBundlePicker } from '@/components/vtu/DataBundlePicker';
import { TelcoNetworkId } from '@/constants/telco';
import { ScreenHeader } from '@/components/common/ScreenHeader';

interface VtuViewProps {
  onBackPress?: () => void;
  initialNetwork?: TelcoNetworkId;
}

export const VtuView: React.FC<VtuViewProps> = ({
  onBackPress,
  initialNetwork = 'MTN',
}) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [selectedNetwork, setSelectedNetwork] = useState<TelcoNetworkId>(initialNetwork);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Buy Data Bundle"
        subtitle="Instant SME, Gifting & Corporate Data"
        showBack={!!onBackPress}
        onBackPress={onBackPress}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Network Operator Selection */}
        <TelcoNetworkSelector
          selectedNetwork={selectedNetwork}
          onSelectNetwork={setSelectedNetwork}
        />

        {/* Data Plan Engine */}
        <DataBundlePicker
          selectedNetwork={selectedNetwork}
          onSelectNetwork={setSelectedNetwork}
        />

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const getStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Palette.canvas,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: Spacing.four,
    },
  });
