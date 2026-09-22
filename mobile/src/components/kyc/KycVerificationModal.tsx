import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Palette, Rounded, Spacing } from '@/constants/theme';
import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/common/Button';
import { useApp } from '@/context/AppContext';

interface KycVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  targetTier: 'Tier 2' | 'Tier 3';
}

export const KycVerificationModal: React.FC<KycVerificationModalProps> = ({
  visible,
  onClose,
  targetTier,
}) => {
  const { updateKycTier } = useApp();
  const [bvnOrNin, setBvnOrNin] = useState('');
  const [cacNumber, setCacNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setSuccess(true);
      updateKycTier(targetTier);
      setTimeout(() => {
        setSuccess(false);
        setBvnOrNin('');
        setCacNumber('');
        onClose();
      }, 1500);
    }, 1200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Upgrade to {targetTier === 'Tier 3' ? 'VIP Master Distributor' : 'Tier 2 Agent'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={Palette.onSurfaceVariant} />
            </Pressable>
          </View>

          {success ? (
            <View style={styles.successState}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={32} color="#002616" />
              </View>
              <Text style={styles.successTitle}>Identity Verified!</Text>
              <Text style={styles.successSubtitle}>
                Your account has been upgraded to {targetTier} with increased transaction limits.
              </Text>
            </View>
          ) : (
            <View style={styles.formContent}>
              <Text style={styles.instructions}>
                {targetTier === 'Tier 3'
                  ? 'Provide your Corporate Affairs Commission (CAC) registration number and business address for Tier 3 verification.'
                  : 'Enter your 11-digit Bank Verification Number (BVN) or National Identity Number (NIN) to unlock automated virtual accounts.'}
              </Text>

              {targetTier === 'Tier 3' ? (
                <>
                  <FormInput
                    label="CAC Registration Number"
                    placeholder="Enter RC or BN registration number"
                    value={cacNumber}
                    onChangeText={setCacNumber}
                  />
                  <FormInput
                    label="Business Physical Address"
                    placeholder="Enter registered business address"
                    value={bvnOrNin}
                    onChangeText={setBvnOrNin}
                  />
                </>
              ) : (
                <FormInput
                  label="BVN or NIN (11 Digits)"
                  placeholder="Enter 11-digit BVN or NIN"
                  value={bvnOrNin}
                  onChangeText={setBvnOrNin}
                  keyboardType="numeric"
                  maxLength={11}
                  leftIcon={<MaterialCommunityIcons name="card-account-details-outline" size={18} color={Palette.onSurfaceMuted} />}
                />
              )}

              <View style={styles.secureNotice}>
                <MaterialCommunityIcons name="lock-check" size={16} color={Palette.tertiary} />
                <Text style={styles.secureNoticeText}>
                  Your information is encrypted and validated in real time via NIBSS / NIMC portals.
                </Text>
              </View>

              <Button
                title={isVerifying ? 'Verifying Identity...' : 'Submit for Instant Approval'}
                onPress={handleSubmit}
                loading={isVerifying}
                disabled={bvnOrNin.length < 5 || isVerifying}
                variant="primary"
                style={{ marginTop: Spacing.three }}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Rounded.xxl,
    borderTopRightRadius: Rounded.xxl,
    padding: Spacing.five,
    borderWidth: 1,
    borderColor: Palette.borderHigh,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  instructions: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: Spacing.four,
  },
  formContent: {
    width: '100%',
  },
  secureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    borderRadius: Rounded.md,
    padding: Spacing.three,
    marginTop: Spacing.one,
    borderWidth: 1,
    borderColor: 'rgba(0, 208, 132, 0.2)',
  },
  secureNoticeText: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    flex: 1,
    lineHeight: 15,
  },
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.onSurface,
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
});
