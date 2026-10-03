import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightElement,
}) => {
  const { theme: Palette } = useApp();
  const styles = React.useMemo(() => getStyles(Palette), [Palette]);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        {showBack && (
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            onPress={onBackPress}
            hitSlop={12}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={22} color={Palette.onSurface} />
          </Pressable>
        )}

        <View style={styles.textContainer}>
          <Text style={styles.h1Title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightElement ? <View style={styles.rightContainer}>{rightElement}</View> : null}
      </View>
    </View>
  );
};

const getStyles = (Palette: PaletteType) =>
  StyleSheet.create({
    headerContainer: {
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.three,
      paddingBottom: Spacing.three,
      backgroundColor: Palette.canvas,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.three,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: Rounded.xl,
      backgroundColor: Palette.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: Palette.border,
    },
    backBtnPressed: {
      opacity: 0.75,
    },
    textContainer: {
      flex: 1,
    },
    h1Title: {
      fontSize: 26,
      fontWeight: '800',
      color: Palette.onSurface,
      fontFamily: Typography.family,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 12,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      marginTop: 2,
    },
    rightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
