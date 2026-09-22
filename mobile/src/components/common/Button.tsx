import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { PaletteType, Rounded, Spacing, Layout } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'emerald' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const { theme: Palette } = useApp();
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  let backgroundColor = Palette.primary;
  let textColor = Palette.onPrimary;
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    backgroundColor = Palette.surfaceHigh;
    textColor = Palette.onSurface;
    borderColor = Palette.borderHigh;
  } else if (variant === 'emerald') {
    backgroundColor = Palette.tertiary;
    textColor = Palette.onTertiary;
  } else if (variant === 'ghost') {
    backgroundColor = 'transparent';
    textColor = Palette.onSurface;
    borderColor = Palette.border;
  } else if (variant === 'danger') {
    backgroundColor = Palette.error;
    textColor = '#FFFFFF';
  }

  const height = isSmall ? 42 : isLarge ? 56 : Layout.buttonHeight;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.buttonBase,
        {
          backgroundColor: disabled ? Palette.surfaceLow : backgroundColor,
          borderColor: disabled ? Palette.border : borderColor,
          height,
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.leftIconBox}>{leftIcon}</View>}
          <Text
            style={[
              styles.buttonText,
              {
                color: disabled ? Palette.onSurfaceMuted : textColor,
                fontSize: isSmall ? 13 : 15,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIconBox}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: Rounded.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    minHeight: Layout.minTouchTarget,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconBox: {
    marginRight: Spacing.two,
  },
  rightIconBox: {
    marginLeft: Spacing.two,
  },
  buttonText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
