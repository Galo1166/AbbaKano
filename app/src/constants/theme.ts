import { Platform } from 'react-native';

/**
 * AbbaKano Data Sub — VTU Pulse Design Tokens
 * Theme System: Dynamic Light + Dark palettes with live React re-renders.
 * Use `getPalette(mode)` or the `useTheme()` hook from AppContext — do NOT
 * use `Palette` directly in StyleSheet.create() for dynamic properties.
 */

// ─── Palette Type Definition ────────────────────────────────────────────────
export interface PaletteType {
  canvas: string;
  surfaceLowest: string;
  surfaceLow: string;
  surface: string;
  surfaceHigh: string;
  surfaceHighest: string;
  surfaceBright: string;

  primary: string;
  primaryContainer: string;
  primaryLight: string;
  onPrimary: string;

  secondary: string;
  secondaryLight: string;
  secondaryContainer: string;
  onSecondary: string;
  secondaryAction: string;

  tertiary: string;
  tertiaryLight: string;
  tertiaryContainer: string;
  onTertiary: string;

  error: string;
  errorLight: string;
  errorContainer: string;

  onSurface: string;
  onSurfaceVariant: string;
  onSurfaceMuted: string;
  outline: string;
  outlineVariant: string;

  border: string;
  borderHigh: string;
  glassBackground: string;

  // Compatibility aliases
  text: string;
  textSecondary: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  tint: string;
}

// ─── Dark (Obsidian Slate) ───────────────────────────────────────────────────
export const DarkPalette: PaletteType = {
  canvas: '#0F131C',
  surfaceLowest: '#0A0E17',
  surfaceLow: '#181B25',
  surface: '#1C1F29',
  surfaceHigh: '#262A34',
  surfaceHighest: '#31353F',
  surfaceBright: '#353943',

  primary: '#2563EB',
  primaryContainer: '#1D4ED8',
  primaryLight: '#ADC6FF',
  onPrimary: '#FFFFFF',

  secondary: '#EE9800',
  secondaryLight: '#FFB95F',
  secondaryContainer: 'rgba(238, 152, 0, 0.15)',
  onSecondary: '#2A1700',
  secondaryAction: '#00D084',

  tertiary: '#00D084',
  tertiaryLight: '#4EDEA3',
  tertiaryContainer: 'rgba(0, 208, 132, 0.15)',
  onTertiary: '#003824',

  error: '#EF4444',
  errorLight: '#FFB4AB',
  errorContainer: 'rgba(239, 68, 68, 0.15)',

  onSurface: '#DFE2EF',
  onSurfaceVariant: '#C2C6D6',
  onSurfaceMuted: '#8C909F',
  outline: '#8C909F',
  outlineVariant: '#424754',

  border: 'rgba(255, 255, 255, 0.08)',
  borderHigh: 'rgba(255, 255, 255, 0.14)',
  glassBackground: 'rgba(15, 19, 28, 0.85)',

  text: '#DFE2EF',
  textSecondary: '#C2C6D6',
  background: '#0F131C',
  backgroundElement: '#181B25',
  backgroundSelected: '#262A34',
  tint: '#2563EB',
};

// ─── Light (Crisp High-Contrast) ─────────────────────────────────────────────
export const LightPalette: PaletteType = {
  canvas: '#F8FAFC',
  surfaceLowest: '#FFFFFF',
  surfaceLow: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceHigh: '#E2E8F0',
  surfaceHighest: '#CBD5E1',
  surfaceBright: '#FFFFFF',

  primary: '#2563EB',
  primaryContainer: '#1D4ED8',
  primaryLight: '#3B82F6',
  onPrimary: '#FFFFFF',

  secondary: '#D97706',
  secondaryLight: '#F59E0B',
  secondaryContainer: 'rgba(217, 119, 6, 0.12)',
  onSecondary: '#FFFFFF',
  secondaryAction: '#059669',

  tertiary: '#059669',
  tertiaryLight: '#10B981',
  tertiaryContainer: 'rgba(5, 150, 105, 0.12)',
  onTertiary: '#FFFFFF',

  error: '#DC2626',
  errorLight: '#EF4444',
  errorContainer: 'rgba(220, 38, 38, 0.12)',

  onSurface: '#0F172A',
  onSurfaceVariant: '#475569',
  onSurfaceMuted: '#64748B',
  outline: '#94A3B8',
  outlineVariant: '#CBD5E1',

  border: 'rgba(0, 0, 0, 0.08)',
  borderHigh: 'rgba(0, 0, 0, 0.14)',
  glassBackground: 'rgba(255, 255, 255, 0.90)',

  text: '#0F172A',
  textSecondary: '#475569',
  background: '#F8FAFC',
  backgroundElement: '#F1F5F9',
  backgroundSelected: '#E2E8F0',
  tint: '#2563EB',
};

/** Get the correct palette for a given effective theme mode */
export function getPalette(mode: 'dark' | 'light'): PaletteType {
  return mode === 'dark' ? DarkPalette : LightPalette;
}

// ─── Reactive Proxy Palette ──────────────────────────────────────────────────
let _activeTheme: 'dark' | 'light' = 'dark';

export function setActiveThemeMode(mode: 'dark' | 'light') {
  _activeTheme = mode;
}

export function getActiveThemeMode(): 'dark' | 'light' {
  return _activeTheme;
}

/**
 * Dynamic Proxy Palette. Any code reading `Palette.xxx` at render time
 * gets the current active palette's value.
 */
export const Palette: PaletteType = new Proxy(DarkPalette, {
  get(_target, prop: string) {
    const source = _activeTheme === 'dark' ? DarkPalette : LightPalette;
    return (source as any)[prop] ?? (_target as any)[prop];
  },
}) as PaletteType;

// ─── Colors Map (Backward Compat) ────────────────────────────────────────────
export const Colors = {
  dark: DarkPalette,
  light: LightPalette,
} as const;

export type ThemeColor = keyof PaletteType;

export const Fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
  sans: 'Plus Jakarta Sans',
};

// ─── Typography ───────────────────────────────────────────────────────────────
export const Typography = {
  family: 'Plus Jakarta Sans',
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  sizes: {
    currencyDisplay: { fontSize: 36, lineHeight: 44, letterSpacing: -0.03 },
    headlineXl: { fontSize: 30, lineHeight: 38, letterSpacing: -0.02 },
    headlineLg: { fontSize: 24, lineHeight: 32, letterSpacing: -0.015 },
    headlineMd: { fontSize: 20, lineHeight: 28, letterSpacing: -0.01 },
    headlineSm: { fontSize: 18, lineHeight: 24, letterSpacing: -0.005 },
    bodyLg: { fontSize: 16, lineHeight: 24 },
    bodyMd: { fontSize: 14, lineHeight: 20 },
    bodySm: { fontSize: 12, lineHeight: 16 },
    labelLg: { fontSize: 14, lineHeight: 20, letterSpacing: 0.01 },
    labelMd: { fontSize: 12, lineHeight: 16, letterSpacing: 0.02 },
    labelSm: { fontSize: 11, lineHeight: 14, letterSpacing: 0.04 },
  },
};

export const Spacing = {
  zero: 0,
  half: 2,
  one: 4,
  two: 8,
  twoAndHalf: 10,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 28,
  eight: 32,
  ten: 40,
  twelve: 48,
  fourteen: 56,
  sixteen: 64,
} as const;

export const Rounded = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const Layout = {
  minTouchTarget: 48,
  buttonHeight: 52,
  bottomNavHeight: 68,
  maxContentWidth: 780,
  tabInset: Platform.select({ ios: 70, android: 80 }) ?? 75,
};

export const BottomTabInset = Layout.tabInset;
export const MaxContentWidth = Layout.maxContentWidth;
