import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { Typography, resolveInterFont } from '@/constants/typography';

interface Props extends TextProps {
  size?: 'default' | 'small';
}

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
  const preset = size === 'small' ? Typography.idSmall : Typography.id;
  const flat = StyleSheet.flatten([preset, style]) as TextStyle;
  const fontFamily = resolveInterFont(flat.fontWeight);
  return <RNText style={[preset, styles.ltrTabular, style, { fontFamily }]} {...props} />;
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
