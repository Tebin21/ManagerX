import React from 'react';
import { StyleSheet, TextProps } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Typography } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';

interface Props extends Omit<TextProps, 'children'> {
  value: string | Date;
  size?: 'default' | 'small';
}

/** Consistent weight/size + LTR + tabular digits for every displayed date. */
export function DateText({ value, size = 'default', style, ...props }: Props) {
  const preset = size === 'small' ? Typography.dateSmall : Typography.date;
  return (
    <Text style={[preset, styles.ltrTabular, style]} {...props}>
      {formatDateShort(value)}
    </Text>
  );
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
