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
  const { isTablet, uiScaleFactor } = useResponsive();
  const phonePreset = size === 'small' ? Typography.idSmall : Typography.id;
  const basePreset = isTablet
    ? (size === 'small' ? TABLET_ID_PRESET.small : TABLET_ID_PRESET.default)
    : phonePreset;
  const preset: TextStyle = uiScaleFactor !== 1.0
    ? {
        ...basePreset,
        fontSize: Math.round((basePreset.fontSize ?? 14) * uiScaleFactor * 10) / 10,
        lineHeight: basePreset.lineHeight ? Math.round(basePreset.lineHeight * uiScaleFactor * 10) / 10 : undefined,
      }
    : basePreset;
  const flat = StyleSheet.flatten([preset, style]) as TextStyle;
  const fontFamily = resolveInterFont(flat.fontWeight);
  const userSpecifiedLineHeight = flat.lineHeight !== undefined && flat.lineHeight !== preset.lineHeight;
  const safeLineHeight =
    userSpecifiedLineHeight
      ? flat.lineHeight
      : flat.fontSize && flat.fontSize > (preset.lineHeight ?? 16)
      ? Math.round(flat.fontSize * 1.35)
      : undefined;

  return (
    <RNText
      style={[
        preset,
        styles.ltrTabular,
        style,
        safeLineHeight !== undefined ? { lineHeight: safeLineHeight } : null,
        { fontFamily },
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
