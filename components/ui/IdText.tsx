import React from 'react';
import { StyleSheet, TextProps } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Typography } from '@/constants/typography';

interface Props extends TextProps {
  size?: 'default' | 'small';
}

/**
 * For IDs / codes / SKUs / invoice numbers (e.g. "A3069", "INV-0042") —
 * consistent weight/size + LTR + tabular digits everywhere they appear.
 */
export function IdText({ style, size = 'default', ...props }: Props) {
  const preset = size === 'small' ? Typography.idSmall : Typography.id;
  return <Text style={[preset, styles.ltrTabular, style]} {...props} />;
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
