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
import { MaterialCommunityIcons, MaterialIcons, Feather } from "@expo/vector-icons";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { PaletteType, Rounded, Spacing, Typography } from "@/constants/theme";
import { useApp } from "@/context/AppContext";

interface SupportViewProps {
  onBackPress?: () => void;
}

const SUPPORT_WHATSAPP = "2348133339850";
const SUPPORT_PHONE = "+2348133339850";
const SUPPORT_PHONE_DISPLAY = "+234 813 333 9850";
const SUPPORT_EMAIL = "abbakanocommunicationcenter@gmail.com";
const COMMUNITY_URL = "https://chat.whatsapp.com/DEpJ8XD2yWy1lKyLEHj4Di";

const FAQS = [
  {
    question: "Data bundle not received after debit?",
    answer:
      "Most VTU data deliveries complete within 5 to 30 seconds. If delayed beyond 5 minutes due to telco network congestion, tap the WhatsApp button with your Transaction Reference ID for instant escalation.",
  },
  {
    question: "Wallet auto-funding transfer pending?",
    answer:
      "Transfers to your dedicated Moniepoint, Sterling, or Wema virtual accounts auto-credit instantly. If delayed, please copy the bank Session ID and send it to our WhatsApp desk.",
  },
  {
    question: "How do I change my Transaction PIN?",
    answer:
      "Go to Profile tab → Security & Preferences → Change Transaction PIN. If you forgot your PIN, click Forgot PIN or reach out to our support desk.",
  },
  {
    question: "What are customer service operating hours?",
    answer:
      "Our dedicated customer support and automated resolution desk operates 24 hours a day, 7 days a week, 365 days a year without downtime.",
  },
];

export const SupportView: React.FC<SupportViewProps> = ({ onBackPress }) => {
  const { theme: Palette } = useApp();
  const styles = useMemo(() => getStyles(Palette), [Palette]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleWhatsApp = () => {
    Linking.openURL(
      `https://wa.me/${SUPPORT_WHATSAPP}?text=Hello%20AbbaKano%20Support%2C%20I%20need%20assistance%20with%20my%20account.`
    ).catch(() => {
      Alert.alert(
        "WhatsApp Unavailable",
        `Unable to launch WhatsApp. Please contact ${SUPPORT_PHONE_DISPLAY} directly.`
      );
    });
  };

  const handlePhoneCall = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      Alert.alert("Dialer Error", `Unable to open phone dialer for ${SUPPORT_PHONE_DISPLAY}.`);
    });
  };

  const handleEmail = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=AbbaKano%20Support%20Request`
    ).catch(() => {
      Alert.alert(
        "Email Client Unavailable",
        `Please send your message directly to ${SUPPORT_EMAIL}`
      );
    });
  };

  const handleJoinCommunity = () => {
    Linking.openURL(COMMUNITY_URL).catch(() => {
      Alert.alert(
        "Community Link",
        "Unable to open WhatsApp community link. Please ensure WhatsApp is installed."
      );
    });
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
              <View style={styles.liveDotPulse}>
                <View style={styles.liveDot} />
              </View>
              <Text style={styles.statusBadgeText}>SUPPORT DESK ONLINE</Text>
            </View>
            <View style={styles.etaBadge}>
              <Text style={styles.statusEta}>Avg. Response &lt; 2 mins</Text>
            </View>
          </View>
          <Text style={styles.statusTitle}>Need help with a transaction?</Text>
          <Text style={styles.statusSubtitle}>
            Our technical support specialists are standing by 24/7 to resolve data topups, airtime, cable TV, and wallet funding inquiries immediately.
          </Text>
        </View>

        {/* === PRIMARY DIRECT CHANNELS === */}
        <Text style={styles.sectionHeader}>Direct Support Channels</Text>

        {/* Channel 1: WhatsApp */}
        <Pressable
          style={({ pressed }) => [
            styles.channelCard,
            pressed && styles.cardPressed,
          ]}
          onPress={handleWhatsApp}
          accessible
          accessibilityLabel="Chat on WhatsApp"
        >
          <View
            style={[
              styles.channelIconBox,
              { backgroundColor: "rgba(37, 211, 102, 0.14)" },
            ]}
          >
            <MaterialCommunityIcons name="whatsapp" size={26} color="#25D366" />
          </View>
          <View style={styles.channelInfo}>
            <View style={styles.channelTitleRow}>
              <Text style={styles.channelTitle} numberOfLines={1}>
                WhatsApp Live Chat
              </Text>
              <View style={styles.fastTag}>
                <Text style={styles.fastTagText}>FASTEST</Text>
              </View>
            </View>
            <Text style={styles.channelSubtitle} numberOfLines={1}>
              {SUPPORT_PHONE_DISPLAY} • 1-Tap Direct Chat
            </Text>
          </View>
          <MaterialIcons
            name="arrow-forward-ios"
            size={16}
            color={Palette.onSurfaceMuted}
          />
        </Pressable>

        {/* Channel 2: Phone Hotline */}
        <Pressable
          style={({ pressed }) => [
            styles.channelCard,
            pressed && styles.cardPressed,
          ]}
          onPress={handlePhoneCall}
          accessible
          accessibilityLabel="Call Customer Hotline"
        >
          <View
            style={[
              styles.channelIconBox,
              { backgroundColor: "rgba(37, 99, 235, 0.14)" },
            ]}
          >
            <MaterialIcons
              name="phone-in-talk"
              size={24}
              color={Palette.primary}
            />
          </View>
          <View style={styles.channelInfo}>
            <View style={styles.channelTitleRow}>
              <Text style={styles.channelTitle} numberOfLines={1}>
                Customer Care Hotline
              </Text>
              <View style={styles.voiceTag}>
                <Text style={styles.voiceTagText}>VOICE</Text>
              </View>
            </View>
            <Text style={styles.channelSubtitle} numberOfLines={1}>
              {SUPPORT_PHONE_DISPLAY} • Direct Phone Call
            </Text>
          </View>
          <MaterialIcons
            name="arrow-forward-ios"
            size={16}
            color={Palette.onSurfaceMuted}
          />
        </Pressable>

        {/* Channel 3: Email Inquiries */}
        <Pressable
          style={({ pressed }) => [
            styles.channelCard,
            pressed && styles.cardPressed,
          ]}
          onPress={handleEmail}
          accessible
          accessibilityLabel="Send Email Support"
        >
          <View
            style={[
              styles.channelIconBox,
              { backgroundColor: "rgba(139, 92, 246, 0.14)" },
            ]}
          >
            <MaterialIcons name="email" size={24} color="#8B5CF6" />
          </View>
          <View style={styles.channelInfo}>
            <View style={styles.channelTitleRow}>
              <Text style={styles.channelTitle} numberOfLines={1}>
                Official Email Desk
              </Text>
            </View>
            <Text style={styles.channelSubtitle} numberOfLines={1}>
              {SUPPORT_EMAIL}
            </Text>
          </View>
          <MaterialIcons
            name="arrow-forward-ios"
            size={16}
            color={Palette.onSurfaceMuted}
          />
        </Pressable>

        {/* === WHATSAPP RESELLER COMMUNITY CARD === */}
        <View style={styles.communityCard}>
          <View style={styles.communityHeader}>
            <View style={styles.communityIconBox}>
              <MaterialCommunityIcons name="account-group" size={26} color="#25D366" />
            </View>
            <View style={styles.communityHeaderText}>
              <View style={styles.communityTitleRow}>
                <Text style={styles.communityTitle} numberOfLines={1}>
                  Reseller Community
                </Text>
                <View style={styles.communityBadge}>
                  <Text style={styles.communityBadgeText}>ALERTS</Text>
                </View>
              </View>
              <Text style={styles.communitySubtitle} numberOfLines={1}>
                Official Announcements & Server Status
              </Text>
            </View>
          </View>

          <Text style={styles.communityDesc}>
            Join our verified VIP reseller community to get real-time broadcasts on telco API updates, flash data discounts, and maintenance schedules.
          </Text>

          {/* Perks Grid */}
          <View style={styles.communityPerksGrid}>
            <View style={styles.perkItem}>
              <MaterialIcons name="bolt" size={16} color="#25D366" />
              <Text style={styles.perkText} numberOfLines={1}>Price Drop Alerts</Text>
            </View>
            <View style={styles.perkItem}>
              <MaterialIcons name="wifi-tethering" size={16} color="#25D366" />
              <Text style={styles.perkText} numberOfLines={1}>API Server Status</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.communityBtn,
              pressed && styles.cardPressed,
            ]}
            onPress={handleJoinCommunity}
          >
            <MaterialCommunityIcons name="whatsapp" size={19} color="#FFFFFF" />
            <Text style={styles.communityBtnText}>Join WhatsApp Community</Text>
            <Feather name="external-link" size={16} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* === FREQUENTLY ASKED QUESTIONS === */}
        <Text style={[styles.sectionHeader, { marginTop: Spacing.four }]}>
          Frequently Asked Questions
        </Text>

        <View style={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedFaq === index;
            return (
              <Pressable
                key={index}
                style={[
                  styles.faqCard,
                  isExpanded && { borderColor: Palette.borderHigh },
                ]}
                onPress={() => toggleFaq(index)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion} numberOfLines={2}>
                    {faq.question}
                  </Text>
                  <MaterialIcons
                    name={
                      isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"
                    }
                    size={22}
                    color={Palette.onSurfaceVariant}
                  />
                </View>
                {isExpanded && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* === FOOTER ASSURANCE === */}
        <View style={styles.footerBox}>
          <MaterialIcons
            name="verified-user"
            size={22}
            color={Palette.tertiary}
          />
          <Text style={styles.footerText}>
            AbbaKano Data Sub • Kano State, Nigeria{"\n"}
            24/7 VTU Uptime Guarantee & Fast Support
          </Text>
        </View>

        {/* Bottom padding for tab bar */}
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
      marginBottom: Spacing.four,
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
      gap: 8,
    },
    liveDotPulse: {
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: "rgba(16, 185, 129, 0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Palette.tertiary,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: Palette.tertiary,
      letterSpacing: 0.8,
    },
    etaBadge: {
      backgroundColor: Palette.surfaceHigh,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Rounded.full,
    },
    statusEta: {
      fontSize: 10.5,
      fontWeight: "600",
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
    },
    statusTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: Palette.onSurface,
      fontFamily: Typography.family,
      marginBottom: 6,
    },
    statusSubtitle: {
      fontSize: 12.5,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      lineHeight: 18,
    },

    // Section Header
    sectionHeader: {
      fontSize: 14,
      fontWeight: "800",
      color: Palette.onSurface,
      fontFamily: Typography.family,
      marginBottom: Spacing.three,
      letterSpacing: -0.2,
      textTransform: "uppercase",
      opacity: 0.9,
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
      width: 48,
      height: 48,
      borderRadius: Rounded.lg,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    channelInfo: {
      flex: 1,
      gap: 3,
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
      flexShrink: 1,
    },
    fastTag: {
      backgroundColor: "rgba(37, 211, 102, 0.18)",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: Rounded.full,
    },
    fastTagText: {
      fontSize: 8.5,
      fontWeight: "900",
      color: "#25D366",
      letterSpacing: 0.5,
    },
    voiceTag: {
      backgroundColor: "rgba(37, 99, 235, 0.18)",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: Rounded.full,
    },
    voiceTagText: {
      fontSize: 8.5,
      fontWeight: "900",
      color: Palette.primary,
      letterSpacing: 0.5,
    },
    channelSubtitle: {
      fontSize: 12,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
    },

    // WhatsApp Community Card
    communityCard: {
      backgroundColor: Palette.surface,
      borderRadius: Rounded.xl,
      padding: Spacing.four,
      borderWidth: 1,
      borderColor: Palette.border,
      marginTop: Spacing.two,
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
      flexShrink: 0,
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
      flexShrink: 1,
    },
    communityBadge: {
      backgroundColor: "rgba(37, 211, 102, 0.18)",
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: Rounded.full,
    },
    communityBadgeText: {
      fontSize: 8.5,
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
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      borderRadius: Rounded.md,
      borderWidth: 1,
      borderColor: Palette.border,
    },
    perkText: {
      fontSize: 11,
      fontWeight: "600",
      color: Palette.onSurface,
      fontFamily: Typography.family,
      flex: 1,
    },
    communityBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: "#25D366",
      paddingVertical: 13,
      borderRadius: Rounded.lg,
      marginTop: 4,
    },
    communityBtnText: {
      fontSize: 13.5,
      fontWeight: "700",
      color: "#FFFFFF",
      fontFamily: Typography.family,
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
    faqAnswerContainer: {
      marginTop: Spacing.two,
      borderTopWidth: 1,
      borderTopColor: Palette.border,
      paddingTop: Spacing.two,
    },
    faqAnswer: {
      fontSize: 12,
      color: Palette.onSurfaceVariant,
      fontFamily: Typography.family,
      lineHeight: 18,
    },

    // Footer
    footerBox: {
      alignItems: "center",
      paddingVertical: Spacing.four,
      gap: 8,
    },
    footerText: {
      fontSize: 11,
      color: Palette.onSurfaceMuted,
      fontFamily: Typography.family,
      textAlign: "center",
      lineHeight: 16,
    },
  });
