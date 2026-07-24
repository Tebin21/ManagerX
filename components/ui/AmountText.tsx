import React from 'react';
import { StyleSheet, TextProps } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Typography } from '@/constants/typography';
import { fmtIQD } from '@/utils/formatters';

type Variant = 'small' | 'default' | 'large' | 'hero';

const PRESET: Record<Variant, object> = {
  small: Typography.amountSmall,
  default: Typography.amount,
  large: Typography.amountLarge,
  hero: Typography.amountHero,
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
  const preset = PRESET[variant];
  return (
    <Text style={[preset, styles.ltrTabular, style]} {...props}>
      {prefix ?? ''}{formatter(value ?? 0)}{currency ? ` ${currency}` : ''}
    </Text>
  );
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
