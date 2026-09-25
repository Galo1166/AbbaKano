import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { apiPost, ApiError } from '@/lib/api';
import { saveTransactionPin } from '@/lib/biometricAuth';

interface AuthPinSetupViewProps {
  requiresCurrentPin?: boolean;
  onPinCompleted: (pin: string) => void;
}

const NUMPAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
];

const NUMPAD_LABELS: Record<string, string> = {
  '1': '', '2': 'ABC', '3': 'DEF',
  '4': 'GHI', '5': 'JKL', '6': 'MNO',
  '7': 'PQRS', '8': 'TUV', '9': 'WXYZ',
  '0': '', 'backspace': '', '': '',
};

export const AuthPinSetupView: React.FC<AuthPinSetupViewProps> = ({
  requiresCurrentPin = false,
  onPinCompleted,
}) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [stage, setStage] = useState<'current' | 'setup' | 'confirm'>(requiresCurrentPin ? 'current' : 'setup');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const savePin = async (newPin: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await apiPost('/me/transaction-pin', { pin: newPin, ...(requiresCurrentPin ? { currentPin } : {}) });
      await saveTransactionPin(newPin).catch(() => {});
      setFeedback({ type: 'success', message: 'Transaction PIN changed successfully.' });
      setTimeout(() => onPinCompleted(newPin), 1200);
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof ApiError ? error.message : 'Could not save your transaction PIN.' });
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
      setStage(requiresCurrentPin ? 'current' : 'setup');
    } finally {
      setSaving(false);
    }
  };

  const verifyCurrentPin = async (pinValue: string) => {
    if (saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      await apiPost('/me/transaction-pin/verify-current', { pin: pinValue });
      setCurrentPin(pinValue);
      setStage('setup');
    } catch (error) {
      setFeedback({ type: 'error', message: error instanceof ApiError ? error.message : 'Current PIN is incorrect' });
      setCurrentPin('');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === '') return;
    if (key === 'backspace') {
      if (stage === 'current') setCurrentPin(p => p.slice(0, -1));
      else if (stage === 'setup') setPin(p => p.slice(0, -1));
      else setConfirmPin(p => p.slice(0, -1));
      return;
    }

    if (stage === 'current') {
      if (currentPin.length < 4) {
        const nextCurrentPin = currentPin + key;
        setCurrentPin(nextCurrentPin);
        if (nextCurrentPin.length === 4) setTimeout(() => void verifyCurrentPin(nextCurrentPin), 300);
      }
    } else if (stage === 'setup') {
      if (pin.length < 4) {
        const newPin = pin + key;
        setPin(newPin);
        if (newPin.length === 4) {
          setTimeout(() => setStage('confirm'), 300);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirmPin = confirmPin + key;
        setConfirmPin(newConfirmPin);
        if (newConfirmPin.length === 4) {
          setTimeout(() => {
            if (newConfirmPin === pin) {
              void savePin(pin);
            } else {
              setFeedback({ type: 'error', message: 'PINs do not match. Please try again.' });
              setPin('');
              setConfirmPin('');
              setStage('setup');
            }
          }, 300);
        }
      }
    }
  };

  const displayedPin = stage === 'current' ? currentPin : stage === 'setup' ? pin : confirmPin;

  return (
    <View style={styles.container}>
      {/* === HEADER === */}
      <View style={styles.header}>
        <View style={styles.shieldIcon}>
          <MaterialIcons name="lock" size={32} color={Palette.primary} />
        </View>
        <Text style={styles.headerTitle}>
          {stage === 'current' ? 'Enter Current PIN' : stage === 'setup' ? (requiresCurrentPin ? 'Create New PIN' : 'Create Security PIN') : 'Confirm New PIN'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {stage === 'current'
            ? 'Enter your current 4-digit PIN to continue'
            : stage === 'setup'
              ? 'Create a new 4-digit PIN for your wallet'
              : 'Enter your new 4-digit PIN again to confirm'}
        </Text>
      </View>

      {/* === PIN DOT DISPLAY === */}
      <View style={styles.pinDots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.pinDot,
              displayedPin.length > i && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>

      {feedback && (
        <Text style={[styles.feedback, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
          {feedback.message}
        </Text>
      )}

      {/* === NUMPAD === */}
      <View style={styles.numpad}>
        {NUMPAD.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.numpadRow}>
            {row.map((key) => (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.numpadKey,
                  key === 'backspace' && styles.numpadKeySpecial,
                  pressed && styles.numpadKeyPressed,
                ]}
                onPress={() => handleKeyPress(key)}
                disabled={saving}
              >
                {key === '' ? null : key === 'backspace' ? (
                  <MaterialIcons name="backspace" size={24} color={Palette.onSurface} />
                ) : (
                  <View style={styles.numpadKeyContent}>
                    <Text style={styles.numpadKeyDigit}>{key}</Text>
                    {NUMPAD_LABELS[key] !== '' && (
                      <Text style={styles.numpadKeyLabel}>{NUMPAD_LABELS[key]}</Text>
                    )}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {/* === SECURITY NOTE === */}
      <View style={styles.secureNote}>
        <MaterialIcons name="verified-user" size={14} color={Palette.onSurfaceMuted} />
        <Text style={styles.secureNoteText}>Protected by device-level biometric encryption</Text>
      </View>
    </View>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.canvas,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.ten,
    paddingBottom: Spacing.six,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  shieldIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37,99,235,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    marginBottom: Spacing.two,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // PIN Dots
  pinDots: {
    flexDirection: 'row',
    gap: 20,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Palette.borderHigh,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },

  // Numpad
  numpad: {
    width: '100%',
    gap: Spacing.three,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  numpadKey: {
    flex: 1,
    height: 64,
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  numpadKeySpecial: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  numpadKeyPressed: {
    backgroundColor: Palette.surfaceHigh,
    transform: [{ scale: 0.95 }],
  },
  numpadKeyContent: {
    alignItems: 'center',
  },
  numpadKeyDigit: {
    fontSize: 24,
    fontWeight: '600',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    lineHeight: 28,
  },
  numpadKeyLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
    letterSpacing: 1,
  },

  feedback: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.family,
    textAlign: 'center',
  },
  feedbackSuccess: {
    color: Palette.tertiary,
  },
  feedbackError: {
    color: Palette.error,
  },

  // Security Note
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secureNoteText: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
  },
});
