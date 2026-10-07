import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { Typography, resolveInterFont } from '@/constants/typography';
import { useResponsive } from '@/hooks/useResponsive';

interface Props extends TextProps {
  size?: 'default' | 'small';
}

const TABLET_ID_PRESET = {
  small: { fontSize: 13, fontWeight: '600', lineHeight: 16 } as TextStyle,
  default: { fontSize: 14, fontWeight: '600', lineHeight: 18 } as TextStyle,
};

/**
 * For IDs / codes / SKUs / invoice numbers (e.g. "A3069", "INV-0042") —
 * consistent weight/size + LTR + tabular digits everywhere they appear.
 *
 * Renders raw RN Text (bypassing the shared AppText/Kurdish-font injection)
 * with an explicit fontFamily, so item codes always render in a single
 * Latin (Inter) font and never fall back to the Kurdish typeface, no matter
 * the app language.
 */
export function IdText({ style, size = 'default', ...props }: Props) {
  const { isTablet } = useResponsive();
  const phonePreset = size === 'small' ? Typography.idSmall : Typography.id;
  const preset = isTablet
    ? (size === 'small' ? TABLET_ID_PRESET.small : TABLET_ID_PRESET.default)
    : phonePreset;
  const flat = StyleSheet.flatten([preset, style]) as TextStyle;
  const fontFamily = resolveInterFont(flat.fontWeight);
  return <RNText style={[preset, styles.ltrTabular, style, { fontFamily }]} {...props} />;
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
