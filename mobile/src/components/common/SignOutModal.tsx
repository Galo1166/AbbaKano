import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Rounded, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/context/AppContext';

interface SignOutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSignOut: () => void;
}

export const SignOutModal: React.FC<SignOutModalProps> = ({
  visible,
  onClose,
  onConfirmSignOut,
}) => {
  const T = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            { backgroundColor: T.surface, borderColor: T.borderHigh },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Danger Emblem */}
          <View style={styles.iconCircle}>
            <MaterialIcons name="logout" size={28} color="#EF4444" />
          </View>

          {/* Texts */}
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: T.onSurface }]}>
              Sign Out of Session?
            </Text>
            <Text style={[styles.subtitle, { color: T.onSurfaceVariant }]}>
              Are you sure you want to log out? You will need your email and password or biometrics to access your wallet again.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                { backgroundColor: T.surfaceLow, borderColor: T.border },
                pressed && { opacity: 0.75 },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: T.onSurface }]}>
                Stay In
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && { opacity: 0.88 },
              ]}
              onPress={() => {
                onClose();
                onConfirmSignOut();
              }}
            >
              <MaterialIcons name="logout" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>
                Sign Out
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Rounded.xxl,
    padding: Spacing.five,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.four,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Typography.family,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Typography.family,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: Spacing.two,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    marginTop: Spacing.two,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Typography.family,
  },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: Rounded.xl,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 3,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
});
