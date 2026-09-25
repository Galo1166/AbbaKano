import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  KeyboardTypeOptions,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing, Layout } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { TelcoNetwork } from '@/constants/telco';

interface FormInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  maxLength?: number;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  detectedNetwork?: TelcoNetwork | null;
  style?: ViewStyle;
  editable?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  maxLength,
  error,
  hint,
  leftIcon,
  rightIcon,
  detectedNetwork,
  style,
  editable = true,
}) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const activeBorderColor = error
    ? Palette.error
    : detectedNetwork
    ? detectedNetwork.accentBorder
    : isFocused
    ? Palette.primary
    : Palette.border;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.labelText}>{label}</Text>
          {detectedNetwork && (
            <View
              style={[
                styles.networkPill,
                { backgroundColor: detectedNetwork.bgLight, borderColor: detectedNetwork.brandColor },
              ]}
            >
              <Text style={[styles.networkPillText, { color: detectedNetwork.brandColor }]}>
                {detectedNetwork.name}
              </Text>
            </View>
          )}
        </View>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            borderColor: activeBorderColor,
            backgroundColor: isFocused ? Palette.surfaceLow : Palette.surface,
          },
        ]}
      >
        {leftIcon && <View style={styles.iconSlot}>{leftIcon}</View>}

        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Palette.onSurfaceMuted}
          keyboardType={keyboardType}
          secureTextEntry={isSecure}
          maxLength={maxLength}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          selectionColor={detectedNetwork ? detectedNetwork.brandColor : Palette.primary}
        />

        {value.length > 0 && editable && (
          <Pressable
            style={styles.actionIconSlot}
            onPress={() => onChangeText('')}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={Palette.onSurfaceMuted} />
          </Pressable>
        )}

        {secureTextEntry && (
          <Pressable
            style={styles.actionIconSlot}
            onPress={() => setIsSecure((prev) => !prev)}
            hitSlop={8}
          >
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Palette.onSurfaceVariant}
            />
          </Pressable>
        )}

        {rightIcon && <View style={styles.iconSlot}>{rightIcon}</View>}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.four,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
    letterSpacing: 0.2,
  },
  networkPill: {
    paddingHorizontal: Spacing.twoAndHalf,
    paddingVertical: 2,
    borderRadius: Rounded.full,
    borderWidth: 1,
  },
  networkPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  inputContainer: {
    height: Layout.buttonHeight,
    borderRadius: Rounded.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  iconSlot: {
    marginRight: Spacing.two,
  },
  actionIconSlot: {
    padding: Spacing.one,
    marginLeft: Spacing.one,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: Palette.onSurface,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: Palette.error,
    fontSize: 12,
    marginTop: Spacing.one,
    fontWeight: '500',
  },
  hintText: {
    color: Palette.onSurfaceMuted,
    fontSize: 12,
    marginTop: Spacing.one,
  },
});
