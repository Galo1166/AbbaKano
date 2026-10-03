/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, getActiveThemeMode, PaletteType } from '@/constants/theme';

export function useTheme(): PaletteType {
  const mode = getActiveThemeMode();
  return Colors[mode];
}
