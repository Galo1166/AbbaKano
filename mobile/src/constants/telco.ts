/**
 * Telco Carrier Token Definitions & Regex Prefix Mappings
 * Strictly isolates carrier chromatic tokens to avoid recharge errors.
 */
import { SCREEN_ASSETS } from '../../assets/screenAssets';

export type TelcoNetworkId = 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE';

export interface TelcoNetwork {
  id: TelcoNetworkId;
  name: string;
  brandColor: string;
  secondaryColor: string;
  bgLight: string;
  badgeTextColor: string;
  accentBorder: string;
  iconName: string;
  logo: any;
  prefixes: string[];
}

export const TELCO_NETWORKS: Record<TelcoNetworkId, TelcoNetwork> = {
  MTN: {
    id: 'MTN',
    name: 'MTN',
    brandColor: '#FFCC00',
    secondaryColor: '#E5B800',
    bgLight: 'rgba(255, 204, 0, 0.12)',
    badgeTextColor: '#0A0E17',
    accentBorder: '#FFCC00',
    iconName: 'cellphone-wireless',
    logo: SCREEN_ASSETS.mtnLogo,
    prefixes: [
      '0803', '0806', '0703', '0706', '0813', '0816', 
      '0810', '0814', '0903', '0906', '0913', '0916'
    ],
  },
  AIRTEL: {
    id: 'AIRTEL',
    name: 'Airtel',
    brandColor: '#E60000',
    secondaryColor: '#CC0000',
    bgLight: 'rgba(230, 0, 0, 0.12)',
    badgeTextColor: '#FFFFFF',
    accentBorder: '#E60000',
    iconName: 'signal-cellular-outline',
    logo: SCREEN_ASSETS.airtelLogo,
    prefixes: [
      '0802', '0808', '0708', '0812', '0701', '0902', 
      '0901', '0904', '0907', '0912'
    ],
  },
  GLO: {
    id: 'GLO',
    name: 'Glo',
    brandColor: '#27A844',
    secondaryColor: '#1E8234',
    bgLight: 'rgba(39, 168, 68, 0.12)',
    badgeTextColor: '#FFFFFF',
    accentBorder: '#27A844',
    iconName: 'wifi',
    logo: SCREEN_ASSETS.gloLogo,
    prefixes: [
      '0805', '0807', '0705', '0815', '0811', '0905', '0915'
    ],
  },
  '9MOBILE': {
    id: '9MOBILE',
    name: '9mobile',
    brandColor: '#84BD00',
    secondaryColor: '#6B9900',
    bgLight: 'rgba(132, 189, 0, 0.12)',
    badgeTextColor: '#0A0E17',
    accentBorder: '#84BD00',
    iconName: 'antenna',
    logo: SCREEN_ASSETS.ninemobileLogo,
    prefixes: [
      '0809', '0818', '0817', '0909', '0908'
    ],
  },
};

export const TELCO_LIST: TelcoNetwork[] = Object.values(TELCO_NETWORKS);
