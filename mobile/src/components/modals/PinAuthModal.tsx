import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing } from '@/constants/theme';
import { useCheckout } from '@/context/CheckoutContext';
import { useApp } from '@/context/AppContext';
import { Numpad } from '@/components/common/Numpad';
import { getBiometricTransactionPin } from '@/lib/biometricAuth';

export const PinAuthModal: React.FC = () => {
  const { isPinModalOpen, isPurchaseProcessing, cancelPin, verifyPinAndExecute, pinError, draft } = useCheckout();
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isPinModalOpen) {
      setPin('');
      setErrorMsg(null);
    }
  }, [isPinModalOpen]);

  if (!draft) return null;

  const displayedError = pinError || errorMsg;

  const handleKeyPress = (val: string) => {
    if (!isPurchaseProcessing && pin.length < 4) {
      const nextPin = pin + val;
      setPin(nextPin);
      setErrorMsg(null);

      // Auto-submit upon 4th digit
      if (nextPin.length === 4) {
        setTimeout(async () => {
          const success = await verifyPinAndExecute(nextPin);
          if (!success) {
            setPin('');
          }
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    if (isPurchaseProcessing) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleBiometric = () => {
    if (isPurchaseProcessing) return;
    setPin('••••');
    setTimeout(() => {
      void getBiometricTransactionPin().then(async (transactionPin) => {
        if (!transactionPin) {
          setPin('');
          setErrorMsg('Biometrics are not enrolled for this device. Enter your transaction PIN or enable biometrics in Profile.');
          return;
        }
        const success = await verifyPinAndExecute(transactionPin);
        if (!success) {
          setPin('');
        }
      });
    }, 300);
  };

  return (
    <Modal
      visible={isPinModalOpen}
      transparent
      animationType="fade"
      onRequestClose={cancelPin}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.shieldIconBox}>
              <MaterialCommunityIcons name="shield-lock" size={24} color={Palette.primaryLight} />
            </View>
            <Text style={styles.title}>Authorize Payment</Text>
            <Text style={styles.subtitle}>
              Enter your 4-digit transaction PIN to confirm ₦{draft.amount.toLocaleString()} for {draft.title}
            </Text>
          </View>

          {displayedError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={Palette.error} />
              <Text style={styles.errorText}>{displayedError}</Text>
            </View>
          )}

          {/* Tactile Keypad */}
          <Numpad
            enteredPin={pin}
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onBiometricPress={handleBiometric}
            showPinDots={true}
          />

          {isPurchaseProcessing && (
            <View style={styles.processingBox} accessibilityRole="progressbar">
              <ActivityIndicator size="small" color={Palette.primaryLight} />
              <Text style={styles.processingTitle}>Processing purchase...</Text>
              <Text style={styles.processingText}>Please wait while we confirm your transaction.</Text>
            </View>
          )}

          {/* Cancel button */}
          <Pressable style={styles.cancelBtn} onPress={cancelPin} hitSlop={8} disabled={isPurchaseProcessing}>
            <Text style={styles.cancelBtnText}>Cancel Transaction</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xxl,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.borderHigh,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  shieldIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Palette.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: Palette.borderHigh,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.onSurface,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
    lineHeight: 16,
    maxWidth: 320,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Rounded.md,
    marginVertical: Spacing.two,
  },
  errorText: {
    fontSize: 11,
    color: Palette.error,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.onSurfaceMuted,
  },
  processingBox: {
    width: '100%',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Rounded.md,
    backgroundColor: Palette.surfaceHigh,
    borderWidth: 1,
    borderColor: Palette.borderHigh,
  },
  processingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  processingText: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    color: Palette.onSurfaceMuted,
  },
});
