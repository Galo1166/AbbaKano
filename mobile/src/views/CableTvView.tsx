import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { PaletteType, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { CableTvBillerCard } from '@/components/vtu/CableTvBillerCard';

interface CableTvViewProps {
  onBackPress?: () => void;
}

export const CableTvView: React.FC<CableTvViewProps> = ({ onBackPress }) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Cable TV"
        subtitle="Instant Decoder Subscription & Renewal"
        showBack={!!onBackPress}
        onBackPress={onBackPress}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <CableTvBillerCard />
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
