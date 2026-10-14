import React from 'react';
import { StyleSheet, TextProps } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Typography } from '@/constants/typography';
import { fmtIQD, fmtUSD } from '@/utils/formatters';

import { useResponsive } from '@/hooks/useResponsive';

import { useSettingsStore } from '@/store/settingsStore';

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
  currency?: string | null;
  variant?: Variant;
  /** Plain text glued onto the front of the displayed string (e.g. "+ ", "− "). */
  prefix?: string;
  /** Override the number formatter — defaults to auto-selection based on baseCurrency. */
  formatter?: (n: number) => string;
}

/**
 * Drop-in for `{fmtIQD(value)} IQD`-style interpolations — consistent
 * weight/size + LTR + tabular digits for every currency amount in the app.
 * Automatically adapts between IQD and USD based on system baseCurrency!
 */
export function AmountText({
  value,
  currency,
  variant = 'default',
  prefix,
  formatter,
  style,
  ...props
}: Props) {
  const { isTablet } = useResponsive();
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const exchangeRate = useSettingsStore((s) => s.exchangeRate) || 1310;

  const isUSD = baseCurrency === 'USD' && (currency === undefined || currency === 'IQD' || currency === 'USD' || currency === null || currency === 'none');
  const displayVal = isUSD ? (value ?? 0) / exchangeRate : (value ?? 0);
  const effectiveFormatter = formatter && formatter !== fmtIQD ? formatter : (isUSD ? fmtUSD : fmtIQD);
  const effectiveCurrency = currency === undefined ? (isUSD ? 'USD' : 'IQD') : (currency === 'IQD' && isUSD ? 'USD' : currency);
  const showCurrency = Boolean(effectiveCurrency && effectiveCurrency !== 'none');

  const preset = isTablet ? TABLET_PRESET[variant] : PRESET[variant];
  const flat = StyleSheet.flatten(style);
  const customFontSize = flat?.fontSize;
  const customLineHeight = flat?.lineHeight;
  const safeLineHeight =
    customFontSize && (!customLineHeight || customLineHeight < customFontSize)
      ? Math.ceil(customFontSize * 1.35)
      : undefined;

  const baseFontSize = customFontSize ?? (preset as any)?.fontSize ?? 14;
  const currencyFontSize = Math.max(9, Math.round(baseFontSize * 0.72));

  return (
    <Text style={[preset, styles.ltrTabular, style, safeLineHeight ? { lineHeight: safeLineHeight } : null]} {...props}>
      {prefix ?? ''}{effectiveFormatter(displayVal)}
      {showCurrency ? (
        <Text style={[styles.currencySmall, { fontSize: currencyFontSize }]}>
          {' '}{effectiveCurrency}
        </Text>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
  currencySmall: {
    fontWeight: '600',
    opacity: 0.85,
  },
});
