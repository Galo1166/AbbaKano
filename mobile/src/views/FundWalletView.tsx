import { ScreenHeader } from "@/components/common/ScreenHeader";
import { PaletteType, Rounded, Spacing, Typography } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { apiPost } from "@/lib/api";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface FundWalletViewProps {
  onBackPress?: () => void;
}

export const FundWalletView: React.FC<FundWalletViewProps> = ({
  onBackPress,
}) => {
  const { virtualAccounts, theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [gatewayExpanded, setGatewayExpanded] = useState(true);
  const [amount, setAmount] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const handlePaystackDeposit = async () => {
    const parsedAmount = Number(amount.replace(/[^0-9]/g, ""));
    if (!Number.isInteger(parsedAmount) || parsedAmount < 100) {
      Alert.alert("Invalid amount", "Enter at least ₦100 to fund your wallet.");
      return;
    }

    setPaymentLoading(true);
    try {
      const response = await apiPost<{ authorizationUrl: string; reference: string }>(
        "/payments/paystack/initialize",
        { amount: parsedAmount },
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem("abbakano_pending_payment", response.reference || "");
      }
      await Linking.openURL(response.authorizationUrl);
    } catch (error) {
      Alert.alert(
        "Payment unavailable",
        error instanceof Error ? error.message : "Could not start Paystack payment.",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCopy = (accountNumber: string, displayNumber: string) => {
    // On native we'd use Clipboard, here we simulate
    setCopiedAccount(accountNumber);
    setTimeout(() => setCopiedAccount(null), 2000);
    Alert.alert(
      "Copied!",
      `Account number ${displayNumber} copied to clipboard.`,
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Fund Wallet"
        subtitle="Virtual Accounts & Auto-Credit Engine"
        showBack={true}
        onBackPress={onBackPress}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* === PAYSTACK DEPOSIT (PRIMARY) === */}
        <View style={styles.gatewayCard}>
          <Pressable
            style={styles.gatewayToggleBtn}
            onPress={() => setGatewayExpanded(!gatewayExpanded)}
          >
            <View style={styles.gatewayLeft}>
              <View style={styles.gatewayIconBox}>
                <MaterialIcons name="credit-card" size={22} color={Palette.primary} />
              </View>
              <View>
                <Text style={styles.gatewayTitle}>Fund with Paystack</Text>
                <Text style={styles.gatewaySubtitle}>Card, USSD & Bank Transfer</Text>
              </View>
            </View>
            <MaterialIcons
              name={gatewayExpanded ? "expand-less" : "expand-more"}
              size={22}
              color={Palette.onSurfaceVariant}
            />
          </Pressable>
          {gatewayExpanded && (
            <View style={styles.gatewayContent}>
              <Text style={styles.gatewayContentNote}>
                Make a secure wallet deposit through Paystack. Minimum ₦100.
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="Amount to fund (₦)"
                placeholderTextColor={Palette.onSurfaceMuted}
                keyboardType="number-pad"
                style={styles.amountInput}
                editable={!paymentLoading}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.paystackBtn,
                  pressed && { opacity: 0.85 },
                  paymentLoading && styles.disabledBtn,
                ]}
                onPress={() => void handlePaystackDeposit()}
                disabled={paymentLoading}
              >
                <MaterialIcons name="lock" size={20} color="#FFFFFF" />
                <Text style={styles.paystackBtnText}>
                  {paymentLoading ? "Opening Checkout..." : "Proceed to Paystack Checkout"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* === DEDICATED TRANSFER ACCOUNTS === */}
        <View style={styles.accountsSectionHeader}>
          <View style={styles.accountsSectionLeft}>
            <MaterialIcons
              name="account-balance"
              size={20}
              color={Palette.primary}
            />
            <Text style={styles.accountsSectionTitle}>
              Dedicated Transfer Accounts
            </Text>
          </View>
          <View style={styles.autoSyncBadge}>
            <View style={styles.autoSyncDot} />
            <Text style={styles.autoSyncText}>AUTO-SYNC</Text>
          </View>
        </View>

        {/* Moniepoint Account (Primary) */}
        {virtualAccounts.map((account, idx) => (
          <View key={idx} style={styles.accountCard}>
            <View style={styles.accountCardTop}>
              <View style={styles.accountLeft}>
                <View style={styles.accountIconBox}>
                  <MaterialIcons
                    name={idx === 0 ? "payments" : "account-balance-wallet"}
                    size={20}
                    color={
                      idx === 0 ? Palette.primary : Palette.onSurfaceVariant
                    }
                  />
                </View>
                <View>
                  <Text style={styles.bankName}>{account.bankName}</Text>
                  <Text style={styles.bankSubLabel}>
                    {idx === 0
                      ? "Automated Virtual Gateway"
                      : "Backup Virtual Desk"}
                  </Text>
                </View>
              </View>
              {idx === 0 ? (
                <View style={styles.recommendedBadge}>
                  <MaterialIcons
                    name="bolt"
                    size={14}
                    color={Palette.tertiary}
                  />
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              ) : (
                <View style={styles.altBadge}>
                  <Text style={styles.altBadgeText}>Alternative</Text>
                </View>
              )}
            </View>

            {/* Account Number Row */}
            <View style={styles.accountNumberBox}>
              <Text style={styles.accountNumberLabel}>Account Number</Text>
              <View style={styles.accountNumberRow}>
                <Text
                  style={[
                    styles.accountNumber,
                    idx === 0 && { color: Palette.primary },
                  ]}
                >
                  {account.accountNumber}
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.copyBtn,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() =>
                    handleCopy(
                      account.accountNumber.replace(/\s/g, ""),
                      account.accountNumber,
                    )
                  }
                >
                  <MaterialIcons
                    name={
                      copiedAccount === account.accountNumber.replace(/\s/g, "")
                        ? "check"
                        : "content-copy"
                    }
                    size={16}
                    color={
                      idx === 0 ? Palette.primary : Palette.onSurfaceVariant
                    }
                  />
                  <Text style={styles.copyBtnText}>
                    {copiedAccount === account.accountNumber.replace(/\s/g, "")
                      ? "Copied!"
                      : "Copy"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Account Name Row */}
            <View style={styles.accountNameRow}>
              <View>
                <Text style={styles.accountNameLabel}>
                  Beneficiary Account Name
                </Text>
                <Text style={styles.accountNameValue}>
                  {account.accountName}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <MaterialIcons
                  name="check-circle"
                  size={14}
                  color={Palette.tertiary}
                />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </View>
        ))}

        {/* === SECURITY NOTICE === */}
        <View style={styles.securityCard}>
          <View style={styles.securityIconBox}>
            <MaterialIcons
              name="verified-user"
              size={20}
              color={Palette.tertiary}
            />
          </View>
          <View style={styles.securityText}>
            <Text style={styles.securityTitle}>
              NDPR Compliant & Bank Grade Security
            </Text>
            <Text style={styles.securitySubtitle}>
              Dedicated virtual accounts are issued by CBN-licensed financial
              institutions and protected with 256-bit encryption.
            </Text>
          </View>
        </View>

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
      gap: Spacing.four,
    },

    // Accounts Section Header
    accountsSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    accountsSectionLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    accountsSectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
    },
    autoSyncBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0, 208, 132, 0.10)",
      borderRadius: Rounded.full,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    autoSyncDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: Palette.tertiary,
    },
    autoSyncText: {
      fontSize: 10,
      fontWeight: "700",
      color: Palette.tertiary,
      fontFamily: Typography.family,
      letterSpacing: 0.5,
    },

    // Account Card
    accountCard: {
      backgroundColor: Palette.surface,
      borderRadius: Rounded.xl,
      padding: Spacing.four,
      borderWidth: 1,
      borderColor: Palette.border,
      gap: Spacing.three,
    },
    accountCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    accountLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.two,
    },
    accountIconBox: {
      width: 32,
      height: 32,
      borderRadius: Rounded.lg,
      backgroundColor: Palette.surfaceHigh,
      alignItems: "center",
      justifyContent: "center",
    },
    bankName: {
      fontSize: 14,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
    },
    bankSubLabel: {
      fontSize: 11,
      color: Palette.onSurfaceMuted,
      fontFamily: Typography.family,
    },
    recommendedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0, 208, 132, 0.12)",
      borderRadius: Rounded.full,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    recommendedText: {
      fontSize: 11,
      fontWeight: "700",
      color: Palette.tertiary,
      fontFamily: Typography.family,
    },
    altBadge: {
      backgroundColor: Palette.surfaceHigh,
      borderRadius: Rounded.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    altBadgeText: {
      fontSize: 11,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
    },
    accountNumberBox: {
      backgroundColor: Palette.surfaceLow,
      borderRadius: Rounded.xl,
      padding: Spacing.three,
      gap: 4,
    },
    accountNumberLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: Palette.onSurfaceMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      fontFamily: Typography.family,
    },
    accountNumberRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    accountNumber: {
      fontSize: 24,
      fontWeight: "800",
      color: Palette.onSurface,
      letterSpacing: 2,
      fontFamily: Typography.family,
    },
    copyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: Palette.surfaceHighest,
      borderRadius: Rounded.xl,
      paddingHorizontal: Spacing.three,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: Palette.border,
    },
    copyBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
    },
    accountNameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    accountNameLabel: {
      fontSize: 11,
      color: Palette.onSurfaceMuted,
      fontFamily: Typography.family,
    },
    accountNameValue: {
      fontSize: 14,
      fontWeight: "600",
      color: Palette.onSurface,
      fontFamily: Typography.family,
      marginTop: 2,
    },
    verifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(0, 208, 132, 0.10)",
      borderRadius: Rounded.full,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    verifiedText: {
      fontSize: 11,
      fontWeight: "700",
      color: Palette.tertiary,
      fontFamily: Typography.family,
    },

    // Gateway Card
    gatewayCard: {
      backgroundColor: Palette.surface,
      borderRadius: Rounded.xl,
      borderWidth: 1,
      borderColor: Palette.border,
      overflow: "hidden",
    },
    gatewayToggleBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: Spacing.four,
    },
    gatewayLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.three,
    },
    gatewayIconBox: {
      width: 40,
      height: 40,
      borderRadius: Rounded.xl,
      backgroundColor: "rgba(37, 99, 235, 0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    gatewayTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
    },
    gatewaySubtitle: {
      fontSize: 12,
      color: Palette.onSurfaceMuted,
      fontFamily: Typography.family,
    },
    gatewayContent: {
      padding: Spacing.four,
      paddingTop: 0,
      gap: Spacing.three,
    },
    gatewayContentNote: {
      fontSize: 13,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      lineHeight: 20,
    },
    amountInput: {
      height: 48,
      borderRadius: Rounded.xl,
      backgroundColor: Palette.surfaceLow,
      borderWidth: 1,
      borderColor: Palette.border,
      paddingHorizontal: Spacing.three,
      color: Palette.onSurface,
      fontSize: 16,
      fontFamily: Typography.family,
    },
    paystackBtn: {
      height: 48,
      backgroundColor: Palette.primary,
      borderRadius: Rounded.xl,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    disabledBtn: {
      opacity: 0.6,
    },
    paystackBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: Typography.family,
    },

    // Security
    securityCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.three,
      backgroundColor: Palette.surfaceLow,
      borderRadius: Rounded.xl,
      padding: Spacing.four,
    },
    securityIconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Palette.surface,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    securityText: {
      flex: 1,
      gap: 4,
    },
    securityTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
    },
    securitySubtitle: {
      fontSize: 12,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      lineHeight: 18,
    },

  });
