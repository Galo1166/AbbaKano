import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { PaletteType, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TelcoQuickRecharge } from '@/components/dashboard/TelcoQuickRecharge';

interface AirtimeViewProps {
  onBackPress?: () => void;
}

export const AirtimeView: React.FC<AirtimeViewProps> = ({ onBackPress }) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Airtime Topup"
        subtitle="Instant VTU Airtime Recharge"
        showBack={!!onBackPress}
        onBackPress={onBackPress}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TelcoQuickRecharge />
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
