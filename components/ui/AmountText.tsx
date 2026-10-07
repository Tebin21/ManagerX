import React from 'react';
import { StyleSheet, TextProps } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Typography } from '@/constants/typography';
import { fmtIQD } from '@/utils/formatters';

import { useResponsive } from '@/hooks/useResponsive';

type Variant = 'small' | 'default' | 'large' | 'hero';

const PRESET: Record<Variant, object> = {
  small: Typography.amountSmall,
  default: Typography.amount,
  large: Typography.amountLarge,
  hero: Typography.amountHero,
};

const TABLET_PRESET: Record<Variant, object> = {
  small: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  default: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  large: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  hero: { fontSize: 30, fontWeight: '800', lineHeight: 36 },
};

interface Props extends Omit<TextProps, 'children'> {
  value: number;
  currency?: string;
  variant?: Variant;
  /** Plain text glued onto the front of the displayed string (e.g. "+ ", "− "). */
  prefix?: string;
  /** Override the number formatter — defaults to fmtIQD. Pass fmtUSD for USD values. */
  formatter?: (n: number) => string;
}

/**
 * Drop-in for `{fmtIQD(value)} IQD`-style interpolations — consistent
 * weight/size + LTR + tabular digits for every currency amount in the app.
 */
export function AmountText({ value, currency, variant = 'default', prefix, formatter = fmtIQD, style, ...props }: Props) {
  const { isTablet } = useResponsive();
  const preset = isTablet ? TABLET_PRESET[variant] : PRESET[variant];
  const flat = StyleSheet.flatten(style);
  const customFontSize = flat?.fontSize;
  const customLineHeight = flat?.lineHeight;
  const safeLineHeight =
    customFontSize && (!customLineHeight || customLineHeight < customFontSize)
      ? Math.ceil(customFontSize * 1.35)
      : undefined;

  return (
    <Text style={[preset, styles.ltrTabular, style, safeLineHeight ? { lineHeight: safeLineHeight } : null]} {...props}>
      {prefix ?? ''}{formatter(value ?? 0)}{currency ? ` ${currency}` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
