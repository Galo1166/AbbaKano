import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';

interface NumpadProps {
  onKeyPress: (val: string) => void;
  onBackspace: () => void;
  onBiometricPress?: () => void;
  pinLength?: number;
  enteredPin?: string;
  showPinDots?: boolean;
}

export const Numpad: React.FC<NumpadProps> = ({
  onKeyPress,
  onBackspace,
  onBiometricPress,
  pinLength = 4,
  enteredPin = '',
  showPinDots = true,
}) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['bio', '0', 'back'],
  ];

  return (
    <View style={styles.container}>
      {showPinDots && (
        <View style={styles.pinDotsRow}>
          {Array.from({ length: pinLength }).map((_, index) => {
            const isFilled = index < enteredPin.length;
            return (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  isFilled ? styles.pinDotFilled : styles.pinDotEmpty,
                ]}
              />
            );
          })}
        </View>
      )}

      <View style={styles.grid}>
        {keys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => {
              if (item === 'bio') {
                return (
                  <Pressable
                    key={item}
                    style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                    onPress={onBiometricPress}
                    hitSlop={6}
                    accessible={true}
                    accessibilityLabel="Biometric Authentication"
                  >
                    <MaterialCommunityIcons
                      name="fingerprint"
                      size={28}
                      color={Palette.primaryLight}
                    />
                  </Pressable>
                );
              }

              if (item === 'back') {
                return (
                  <Pressable
                    key={item}
                    style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                    onPress={onBackspace}
                    hitSlop={6}
                    accessible={true}
                    accessibilityLabel="Backspace"
                  >
                    <Ionicons name="backspace-outline" size={26} color={Palette.onSurfaceVariant} />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={item}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                  onPress={() => onKeyPress(item)}
                  hitSlop={6}
                  accessible={true}
                  accessibilityLabel={`Key ${item}`}
                >
                  <Text style={styles.digitText}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  pinDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.six,
    height: 32,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  pinDotEmpty: {
    borderColor: Palette.borderHigh,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primary,
  },
  grid: {
    width: '100%',
    maxWidth: 340,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  key: {
    flex: 1,
    height: 64,
    marginHorizontal: Spacing.one,
    borderRadius: Rounded.xl,
    backgroundColor: Palette.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  keyPressed: {
    backgroundColor: Palette.surfaceHigh,
    borderColor: Palette.primaryLight,
    transform: [{ scale: 0.95 }],
  },
  digitText: {
    fontSize: 24,
    fontWeight: '700',
    color: Palette.onSurface,
  },
});
