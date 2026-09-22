import { useMemo } from 'react';
import { TELCO_NETWORKS, TelcoNetwork, TelcoNetworkId, TELCO_LIST } from '@/constants/telco';
import { Palette } from '@/constants/theme';

export interface TelcoDetectorResult {
  detectedNetwork: TelcoNetwork | null;
  networkId: TelcoNetworkId | null;
  brandColor: string;
  accentBorder: string;
  bgLight: string;
  textColor: string;
  cleanNumber: string;
  isValidLength: boolean;
}

/**
 * Real-time regex telco detector hook.
 * Analyzes recipient phone input in real time to switch UI branding colors and badges.
 */
export function useTelcoDetector(phoneNumber: string): TelcoDetectorResult {
  return useMemo(() => {
    // Strip non-digit characters
    let raw = phoneNumber.replace(/[^0-9]/g, '');

    // Standardize Nigerian number formats (+234 / 234 -> 0)
    if (raw.startsWith('234') && raw.length > 3) {
      raw = '0' + raw.slice(3);
    }

    if (raw.length < 4) {
      return {
        detectedNetwork: null,
        networkId: null,
        brandColor: Palette.primary,
        accentBorder: Palette.border,
        bgLight: 'transparent',
        textColor: Palette.onSurface,
        cleanNumber: raw,
        isValidLength: raw.length === 11,
      };
    }

    const prefix = raw.slice(0, 4);

    let matched: TelcoNetwork | null = null;
    for (const network of TELCO_LIST) {
      if (network.prefixes.includes(prefix)) {
        matched = network;
        break;
      }
    }

    if (matched) {
      return {
        detectedNetwork: matched,
        networkId: matched.id,
        brandColor: matched.brandColor,
        accentBorder: matched.accentBorder,
        bgLight: matched.bgLight,
        textColor: matched.badgeTextColor,
        cleanNumber: raw,
        isValidLength: raw.length === 11,
      };
    }

    return {
      detectedNetwork: null,
      networkId: null,
      brandColor: Palette.primary,
      accentBorder: Palette.border,
      bgLight: 'transparent',
      textColor: Palette.onSurface,
      cleanNumber: raw,
      isValidLength: raw.length === 11,
    };
  }, [phoneNumber]);
}
