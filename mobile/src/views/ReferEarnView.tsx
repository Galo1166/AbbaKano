import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PaletteType, Rounded, Spacing, Typography } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { ScreenHeader } from '@/components/common/ScreenHeader';

interface ReferEarnViewProps {
  onBackPress?: () => void;
}

export const ReferEarnView: React.FC<ReferEarnViewProps> = ({ onBackPress }) => {
  const { user, referralCommissionBalance, withdrawCommission, theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);

  const cleanPhone = user.phone.replace(/[^0-9]/g, '');
  const normalizedPhone = cleanPhone.startsWith('234') && cleanPhone.length > 10 ? '0' + cleanPhone.slice(3) : cleanPhone;
  const REFERRAL_CODE = user.referralCode || normalizedPhone || user.phone;
  const UNCLAIMED_BALANCE = referralCommissionBalance;
  const TOTAL_BONUS = user.referralEarnings; // ₦3,600
  const REFERRED_COUNT = user.referralCount; // 18

  const REFERRER_AVATARS = ['MA', 'FK', 'IB'];

  const HOW_IT_WORKS = [
    {
      step: '1',
      title: 'Share Your Phone Number',
      body: 'Give your registered phone number to friends or agents. It serves as your official referral code.',
    },
    {
      step: '2',
      title: 'They Fund & Subscribe',
      body: 'When your referral enters your phone number at signup and funds their wallet, you both earn.',
    },
    {
      step: '3',
      title: 'Unlock Referral Rewards',
      body: 'You receive ₦200 instantly into your commission balance!',
    },
  ];

  const handleCopyCode = () => {
    Alert.alert('Copied!', `Referral phone number ${REFERRAL_CODE} copied to clipboard.`);
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join me on AbbaKano Data Sub! Buy cheap MTN, Airtel, Glo & 9mobile data instantly. Use my registered phone number (${REFERRAL_CODE}) as your referral code and get ₦100 bonus on your first purchase. Download here: https://abbakano.com/r/${REFERRAL_CODE.replace(/\s/g, '')}`,
      });
    } catch {
      // ignore
    }
  };

  const handleTransferToWallet = () => {
    if (UNCLAIMED_BALANCE <= 0) {
      Alert.alert('No Balance', 'You have no unclaimed balance to transfer.');
      return;
    }
    void withdrawCommission().then((success) => {
    if (success) {
      Alert.alert('Transfer Successful', `₦${UNCLAIMED_BALANCE.toLocaleString()} has been added to your main wallet.`);
    } else {
      Alert.alert('Transfer Failed', 'Could not transfer your commission. Please try again.');
    }
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Refer & Earn"
        subtitle="Invite Friends & Earn Commission"
        showBack={true}
        onBackPress={onBackPress}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* === HERO REWARDS CARD === */}
      <View style={styles.heroCard}>
        <View style={styles.heroCardTop}>
          <View style={styles.giftIconBox}>
            <MaterialIcons name="redeem" size={28} color={Palette.secondary} />
          </View>
          <View style={styles.heroCardText}>
            <Text style={styles.heroCardTitle}>Unlimited Reseller Rewards</Text>
            <Text style={styles.heroCardHighlight}>Earn ₦200 For Every Friend You Invite</Text>
          </View>
        </View>

        <Text style={styles.heroCardBody}>
          Share your exclusive referral link. When they fund their wallet and purchase their first bundle, you earn instant commission bonuses!
        </Text>

        {/* Social Proof */}
        <View style={styles.socialProofRow}>
          <View style={styles.avatarStack}>
            {REFERRER_AVATARS.map((initials, idx) => (
              <View
                key={idx}
                style={[styles.avatarChip, { zIndex: 10 - idx, marginLeft: idx > 0 ? -10 : 0 }]}
              >
                <Text style={styles.avatarChipText}>{initials}</Text>
              </View>
            ))}
            <View style={[styles.avatarChip, styles.avatarChipMore, { marginLeft: -10 }]}>
              <Text style={styles.avatarChipMoreText}>+420</Text>
            </View>
          </View>
          <Text style={styles.socialProofText}>resellers earning daily</Text>
        </View>
      </View>

      {/* === STATS ROW === */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Referred</Text>
            <MaterialIcons name="people" size={16} color={Palette.primary} />
          </View>
          <Text style={styles.statCardValue}>{REFERRED_COUNT} Agents</Text>
          <Text style={styles.statCardSub}>Total Bonus</Text>
          <Text style={styles.statCardBonus}>₦{TOTAL_BONUS.toLocaleString()}</Text>
          <View style={styles.statCardFooter}>
            <MaterialIcons name="trending-up" size={14} color={Palette.tertiary} />
            <Text style={styles.statCardFooterText}>All-time</Text>
          </View>
        </View>

        <View style={[styles.statCard, styles.statCardHighlight]}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardLabel}>Ready to Claim</Text>
            <View style={styles.instantPayBadge}>
              <Text style={styles.instantPayText}>Instant pay</Text>
            </View>
          </View>
          <Text style={styles.statCardValueGreen}>₦{UNCLAIMED_BALANCE.toLocaleString()}</Text>
          <View style={styles.unclaimedRow}>
            <MaterialIcons name="account-balance-wallet" size={14} color={Palette.onSurfaceVariant} />
            <Text style={styles.unclaimedLabel}>Unclaimed Balance</Text>
          </View>
          <Text style={styles.unclaimedAmount}>₦{UNCLAIMED_BALANCE.toLocaleString()} available</Text>
          <Pressable
            style={({ pressed }) => [styles.transferBtn, pressed && { opacity: 0.85 }]}
            onPress={handleTransferToWallet}
          >
            <Text style={styles.transferBtnText}>Transfer to Wallet</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* === REFERRAL CODE === */}
      <View style={styles.codeCard}>
        <View style={styles.codeCardHeader}>
          <Text style={styles.codeCardTitle}>Your Referral Code (Phone No)</Text>
          <View style={styles.tierBadge}>
            <MaterialIcons name="phone-android" size={12} color={Palette.primary} />
            <Text style={styles.tierBadgeText}>Registered Phone</Text>
          </View>
        </View>

        <View style={styles.codeBox}>
          <Text style={styles.codeText}>{REFERRAL_CODE}</Text>
        </View>

        <View style={styles.codeActions}>
          <Pressable
            style={({ pressed }) => [styles.codeActionBtn, pressed && { opacity: 0.8 }]}
            onPress={handleCopyCode}
          >
            <MaterialIcons name="content-copy" size={18} color={Palette.onSurface} />
            <Text style={styles.codeActionBtnText}>Copy</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.codeActionBtnPrimary, pressed && { opacity: 0.85 }]}
            onPress={handleShareLink}
          >
            <MaterialIcons name="chat" size={18} color="#FFFFFF" />
            <Text style={styles.codeActionBtnPrimaryText}>WhatsApp</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.codeActionBtn, pressed && { opacity: 0.8 }]}
            onPress={handleShareLink}
          >
            <MaterialIcons name="share" size={18} color={Palette.onSurface} />
            <Text style={styles.codeActionBtnText}>Share Link</Text>
          </Pressable>
        </View>
      </View>

      {/* === HOW IT WORKS === */}
      <View style={styles.howSection}>
        <View style={styles.howHeader}>
          <Text style={styles.howTitle}>How It Works</Text>
          <Text style={styles.howSubtitle}>3 Easy Steps</Text>
        </View>

        {HOW_IT_WORKS.map((step) => (
          <View key={step.step} style={styles.howStep}>
            <View style={styles.howStepNum}>
              <Text style={styles.howStepNumText}>{step.step}</Text>
            </View>
            <View style={styles.howStepInfo}>
              <Text style={styles.howStepTitle}>{step.title}</Text>
              <Text style={styles.howStepBody}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  </View>
  );
};

const getStyles = (Palette: PaletteType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },

  // Hero Card
  heroCard: {
    backgroundColor: Palette.surfaceLow,
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: Spacing.three,
  },
  heroCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  giftIconBox: {
    width: 52,
    height: 52,
    borderRadius: Rounded.xl,
    backgroundColor: 'rgba(238,152,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroCardText: {
    flex: 1,
    gap: 4,
  },
  heroCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onSurfaceMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: Typography.family,
  },
  heroCardHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
    lineHeight: 24,
  },
  heroCardBody: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    lineHeight: 20,
  },
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Palette.surfaceLow,
  },
  avatarChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
  avatarChipMore: {
    backgroundColor: Palette.surfaceHigh,
  },
  avatarChipMoreText: {
    fontSize: 9,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  socialProofText: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: 4,
  },
  statCardHighlight: {
    borderColor: 'rgba(0,208,132,0.3)',
    backgroundColor: 'rgba(0,208,132,0.04)',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 11,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  statCardValueGreen: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.tertiary,
    fontFamily: Typography.family,
  },
  statCardSub: {
    fontSize: 11,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
  },
  statCardBonus: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.secondary,
    fontFamily: Typography.family,
  },
  statCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  statCardFooterText: {
    fontSize: 11,
    color: Palette.tertiary,
    fontFamily: Typography.family,
  },
  instantPayBadge: {
    backgroundColor: 'rgba(0,208,132,0.12)',
    borderRadius: Rounded.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  instantPayText: {
    fontSize: 9,
    fontWeight: '700',
    color: Palette.tertiary,
    fontFamily: Typography.family,
  },
  unclaimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unclaimedLabel: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
  },
  unclaimedAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: Palette.primaryContainer,
    borderRadius: Rounded.xl,
    marginTop: 6,
  },
  transferBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },

  // Referral Code
  codeCard: {
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: Spacing.three,
  },
  codeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderRadius: Rounded.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
    fontFamily: Typography.family,
  },
  codeBox: {
    height: 56,
    backgroundColor: Palette.surfaceHigh,
    borderRadius: Rounded.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.primary,
    fontFamily: Typography.family,
    letterSpacing: 2,
  },
  codeActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  codeActionBtn: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.surfaceHigh,
    borderRadius: Rounded.xl,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  codeActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  codeActionBtnPrimary: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.secondaryAction,
    borderRadius: Rounded.xl,
  },
  codeActionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },

  // How It Works
  howSection: {
    backgroundColor: Palette.surface,
    borderRadius: Rounded.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.border,
    gap: Spacing.three,
  },
  howHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  howTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  howSubtitle: {
    fontSize: 12,
    color: Palette.onSurfaceMuted,
    fontFamily: Typography.family,
  },
  howStep: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  howStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  howStepNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Typography.family,
  },
  howStepInfo: {
    flex: 1,
    gap: 4,
  },
  howStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
    fontFamily: Typography.family,
  },
  howStepBody: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    fontFamily: Typography.family,
    lineHeight: 18,
  },
});
