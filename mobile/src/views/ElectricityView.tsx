import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { PaletteType, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ElectricityBillerCard } from '@/components/vtu/ElectricityBillerCard';

interface ElectricityViewProps {
  onBackPress?: () => void;
}

export const ElectricityView: React.FC<ElectricityViewProps> = ({ onBackPress }) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Electricity Bills"
        subtitle="Instant Token Generation for All DisCos"
        showBack={!!onBackPress}
        onBackPress={onBackPress}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ElectricityBillerCard />
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
