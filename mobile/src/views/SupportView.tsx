import { ScreenHeader } from "@/components/common/ScreenHeader";
import { PaletteType, Rounded, Spacing, Typography } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface SupportViewProps {
  onBackPress?: () => void;
}

const FAQS = [
  {
    question: "Data bundle not received after debit?",
    answer:
      "Most VTU data deliveries complete within 5 to 30 seconds. If delayed beyond 5 minutes due to telco network congestion, click the WhatsApp button with your Transaction Reference ID for instant escalation.",
  },
  {
    question: "Wallet auto-funding transfer pending?",
    answer:
      "Transfers to your dedicated Wema or Moniepoint virtual accounts auto-credit instantly. If delayed, please verify the bank transaction status and send the Session ID to our WhatsApp desk.",
  },
  {
    question: "How do I change my Transaction PIN?",
    answer:
      "Go to the Profile tab -> Security & Preferences -> Change Transaction PIN. If you forgot your current PIN, click Forgot PIN or contact support.",
  },
  {
    question: "What are the customer service operating hours?",
    answer:
      "Our dedicated customer support and automated resolution desk operates 24 hours a day, 7 days a week, 365 days a year.",
  },
];

export const SupportView: React.FC<SupportViewProps> = ({ onBackPress }) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleWhatsApp = () => {
    Linking.openURL(
      "https://wa.me/2348166774566?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20with%20my%20account.",
    ).catch(() => {
      Alert.alert(
        "Error",
        "Unable to open WhatsApp. Please contact +2348166774566 directly.",
      );
    });
  };

  const handlePhoneCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert("Error", `Unable to open phone dialer for ${phone}.`);
    });
  };

  const handleEmail = () => {
    Linking.openURL(
      "mailto:support@abbakano.com?subject=AbbaKano%20Support%20Request",
    ).catch(() => {
      Alert.alert(
        "Error",
        "Unable to open email client. Please email support@abbakano.com.",
      );
    });
  };

  const handleJoinCommunity = () => {
    Alert.alert(
      "WhatsApp Community Launching Soon",
      "Our official WhatsApp Community group is currently being finalized. Once ready, you will be able to join right here to receive real-time price updates, server status alerts, and promo broadcasts.",
      [{ text: "OK", style: "default" }]
    );
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Customer Support"
        subtitle="24/7 Multi-Channel Resolution Desk"
        showBack={true}
        onBackPress={onBackPress}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* === LIVE DESK STATUS CARD === */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusDotRow}>
              <View style={styles.liveDot} />
              <Text style={styles.statusBadgeText}>DESK ONLINE</Text>
            </View>
            <Text style={styles.statusEta}>Avg. Response: &lt; 3 mins</Text>
          </View>
          <Text style={styles.statusTitle}>Need help with a transaction?</Text>
          <Text style={styles.statusSubtitle}>
            Our dedicated technical support team is standing by to assist with
            data topups, airtime, bills, and wallet funding.
          </Text>
        </View>

        {/* === WHATSAPP COMMUNITY GRID CARD === */}
        <View style={styles.communityCard}>
          <View style={styles.communityHeader}>
            <View style={styles.communityIconBox}>
              <MaterialCommunityIcons name="account-group" size={26} color="#25D366" />
            </View>
            <View style={styles.communityHeaderText}>
              <View style={styles.communityTitleRow}>
                <Text style={styles.communityTitle}>WhatsApp Community</Text>
                <View style={styles.communityBadge}>
                  <Text style={styles.communityBadgeText}>UPDATES & ALERTS</Text>
                </View>
              </View>
              <Text style={styles.communitySubtitle}>
                Official Announcements & Real-Time Broadcasts
              </Text>
            </View>
          </View>

          <Text style={styles.communityDesc}>
            Join our official reseller community to receive instant broadcast alerts on data bundle price drops, server maintenance schedules, and VTU availability.
          </Text>

          {/* Perks Grid */}
          <View style={styles.communityPerksGrid}>
            <View style={styles.perkItem}>
              <MaterialIcons name="notifications-active" size={15} color="#25D366" />
              <Text style={styles.perkText}>Instant Price Drops</Text>
            </View>
            <View style={styles.perkItem}>
              <MaterialIcons name="wifi" size={15} color="#25D366" />
              <Text style={styles.perkText}>Network Status</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.communityBtn,
              pressed && styles.cardPressed,
            ]}
            onPress={handleJoinCommunity}
          >
            <MaterialCommunityIcons name="whatsapp" size={18} color="#FFFFFF" />
            <Text style={styles.communityBtnText}>Join WhatsApp Community</Text>
            <View style={styles.communityPill}>
              <Text style={styles.communityPillText}>Available Soon</Text>
            </View>
          </Pressable>
        </View>

        {/* === PRIMARY CHANNELS SECTION === */}
        <Text style={styles.sectionHeader}>Direct Support Channels</Text>

        {/* Channel 1: WhatsApp */}
        <Pressable
          style={({ pressed }) => [
            styles.channelCard,
            pressed && styles.cardPressed,
          ]}
          onPress={handleWhatsApp}
        >
          <View
            style={[
              styles.channelIconBox,
              { backgroundColor: "rgba(37, 211, 102, 0.15)" },
            ]}
          >
            <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
          </View>
          <View style={styles.channelInfo}>
            <View style={styles.channelTitleRow}>
              <Text style={styles.channelTitle}>WhatsApp Direct</Text>
              <View style={styles.fastTag}>
                <Text style={styles.fastTagText}>FASTEST</Text>
              </View>
            </View>
            <Text style={styles.channelSubtitle}>
              +2348166774566 • 1-Tap Agent Chat
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={Palette.onSurfaceMuted}
          />
        </Pressable>

        {/* Channel 2: Phone Hotline 1 */}
        <Pressable
          style={({ pressed }) => [
            styles.channelCard,
            pressed && styles.cardPressed,
          ]}
          onPress={() => handlePhoneCall("+2348166774566")}
        >
          <View
            style={[
              styles.channelIconBox,
              { backgroundColor: "rgba(37, 99, 235, 0.15)" },
            ]}
          >
            <MaterialIcons
              name="phone-in-talk"
              size={22}
              color={Palette.primary}
            />
          </View>
          <View style={styles.channelInfo}>
            <Text style={styles.channelTitle}>Hotline 1 (Primary)</Text>
            <Text style={styles.channelSubtitle}>
              +2348166774566 • Direct Phone Call
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={Palette.onSurfaceMuted}
          />
        </Pressable>

        {/* Channel 3: Phone Hotline 2 */}
        <Pressable
          style={({ pressed }) => [
            styles.channelCard,
            pressed && styles.cardPressed,
          ]}
          onPress={() => {
            Alert.alert(
              "Hotline 2 Unavailable",
              "Hotline 2 is currently undergoing system upgrades. Please contact our primary Hotline 1 or reach out on WhatsApp for immediate assistance."
            );
          }}
        >
          <View
            style={[
              styles.channelIconBox,
              { backgroundColor: "rgba(238, 152, 0, 0.15)" },
            ]}
          >
            <MaterialIcons
              name="support-agent"
              size={22}
              color={Palette.secondary}
            />
          </View>
          <View style={styles.channelInfo}>
            <View style={styles.channelTitleRow}>
              <Text style={styles.channelTitle}>Hotline 2 (Agent Desk)</Text>
              <View style={styles.soonTag}>
                <Text style={styles.soonTagText}>AVAILABLE SOON</Text>
              </View>
            </View>
            <Text style={styles.channelSubtitle}>
              Wholesale & KYC Agent Desk
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={Palette.onSurfaceMuted}
          />
        </Pressable>

        {/* Channel 4: Email Inquiries */}
        <Pressable
          style={({ pressed }) => [
            styles.channelCard,
            pressed && styles.cardPressed,
          ]}
          onPress={handleEmail}
        >
          <View
            style={[
              styles.channelIconBox,
              { backgroundColor: "rgba(139, 92, 246, 0.15)" },
            ]}
          >
            <MaterialIcons name="email" size={22} color="#8B5CF6" />
          </View>
          <View style={styles.channelInfo}>
            <Text style={styles.channelTitle}>Email Inquiries</Text>
            <Text style={styles.channelSubtitle}>
              support@abbakano.com • In-depth receipts
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={Palette.onSurfaceMuted}
          />
        </Pressable>

        {/* === FAQS SECTION === */}
        <Text style={[styles.sectionHeader, { marginTop: Spacing.five }]}>
          Frequently Asked Questions
        </Text>

        <View style={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <Pressable
                key={index}
                style={styles.faqCard}
                onPress={() => toggleFaq(index)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <MaterialIcons
                    name={
                      isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"
                    }
                    size={22}
                    color={Palette.onSurfaceVariant}
                  />
                </View>
                {isExpanded && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* === FOOTER === */}
        <View style={styles.footerBox}>
          <MaterialIcons
            name="support-agent"
            size={20}
            color={Palette.onSurfaceMuted}
          />
          <Text style={styles.footerText}>
            AbbaKano Data Sub • Kano State, Nigeria{"\n"}
            Dedicated to 24/7 VTU Uptime & Support
          </Text>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
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
      paddingHorizontal: Spacing.four,
      paddingTop: Spacing.two,
      paddingBottom: Spacing.six,
    },

    // Status Card
    statusCard: {
      backgroundColor: Palette.surfaceLow,
      borderRadius: Rounded.xl,
      padding: Spacing.four,
      borderWidth: 1,
      borderColor: Palette.borderHigh,
      marginBottom: Spacing.five,
    },
    statusHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Spacing.two,
    },
    statusDotRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Palette.tertiary,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: Palette.tertiary,
      letterSpacing: 0.8,
    },
    statusEta: {
      fontSize: 11,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
    },
    statusTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
      marginBottom: 4,
    },
    statusSubtitle: {
      fontSize: 12,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      lineHeight: 18,
    },

    // Section Header
    sectionHeader: {
      fontSize: 15,
      fontWeight: "800",
      color: Palette.onSurface,
      fontFamily: Typography.family,
      marginBottom: Spacing.three,
      letterSpacing: -0.2,
    },

    // Channel Cards
    channelCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Palette.surface,
      borderRadius: Rounded.xl,
      padding: Spacing.three,
      borderWidth: 1,
      borderColor: Palette.border,
      marginBottom: Spacing.three,
      gap: Spacing.three,
    },
    cardPressed: {
      opacity: 0.75,
    },
    channelIconBox: {
      width: 46,
      height: 46,
      borderRadius: Rounded.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    channelInfo: {
      flex: 1,
    },
    channelTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    channelTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
    },
    fastTag: {
      backgroundColor: "rgba(37, 211, 102, 0.2)",
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: Rounded.full,
    },
    fastTagText: {
      fontSize: 8,
      fontWeight: "900",
      color: "#25D366",
      letterSpacing: 0.5,
    },
    soonTag: {
      backgroundColor: "rgba(238, 152, 0, 0.18)",
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: Rounded.full,
    },
    soonTagText: {
      fontSize: 8,
      fontWeight: "900",
      color: Palette.secondary,
      letterSpacing: 0.5,
    },
    channelSubtitle: {
      fontSize: 12,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      marginTop: 3,
    },

    // WhatsApp Community Card
    communityCard: {
      backgroundColor: Palette.surface,
      borderRadius: Rounded.xl,
      padding: Spacing.four,
      borderWidth: 1,
      borderColor: Palette.border,
      marginBottom: Spacing.four,
      gap: Spacing.three,
    },
    communityHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.three,
    },
    communityIconBox: {
      width: 46,
      height: 46,
      borderRadius: Rounded.lg,
      backgroundColor: "rgba(37, 211, 102, 0.15)",
      alignItems: "center",
      justifyContent: "center",
    },
    communityHeaderText: {
      flex: 1,
    },
    communityTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    communityTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
    },
    communityBadge: {
      backgroundColor: "rgba(37, 211, 102, 0.18)",
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: Rounded.full,
    },
    communityBadgeText: {
      fontSize: 8,
      fontWeight: "900",
      color: "#25D366",
      letterSpacing: 0.5,
    },
    communitySubtitle: {
      fontSize: 12,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      marginTop: 2,
    },
    communityDesc: {
      fontSize: 12.5,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      lineHeight: 18,
    },
    communityPerksGrid: {
      flexDirection: "row",
      gap: Spacing.two,
    },
    perkItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: Palette.surfaceLow,
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.two,
      borderRadius: Rounded.md,
    },
    perkText: {
      fontSize: 11,
      fontWeight: "600",
      color: Palette.onSurface,
      fontFamily: Typography.family,
    },
    communityBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#25D366",
      paddingVertical: 12,
      borderRadius: Rounded.lg,
      marginTop: 2,
    },
    communityBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: Typography.family,
    },
    communityPill: {
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: Rounded.full,
    },
    communityPillText: {
      fontSize: 9,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.4,
    },

    // FAQs
    faqList: {
      gap: Spacing.two,
      marginBottom: Spacing.four,
    },
    faqCard: {
      backgroundColor: Palette.surface,
      borderRadius: Rounded.lg,
      padding: Spacing.three,
      borderWidth: 1,
      borderColor: Palette.border,
    },
    faqHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.two,
    },
    faqQuestion: {
      fontSize: 13,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
      flex: 1,
    },
    faqAnswer: {
      fontSize: 12,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      lineHeight: 18,
      marginTop: Spacing.two,
      borderTopWidth: 1,
      borderTopColor: Palette.border,
      paddingTop: Spacing.two,
    },

    // Footer
    footerBox: {
      alignItems: "center",
      paddingVertical: Spacing.four,
      gap: 6,
    },
    footerText: {
      fontSize: 11,
      color: Palette.onSurfaceMuted,
      fontFamily: Typography.family,
      textAlign: "center",
      lineHeight: 16,
    },
  });
