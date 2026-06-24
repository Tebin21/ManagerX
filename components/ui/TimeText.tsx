import React from 'react';
import { StyleSheet, TextProps } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Typography } from '@/constants/typography';
import { formatTime } from '@/utils/formatters';

interface Props extends Omit<TextProps, 'children'> {
  value: string | Date;
}

/** Consistent weight/size + LTR + tabular digits for every displayed time. */
export function TimeText({ value, style, ...props }: Props) {
  return (
    <Text style={[Typography.time, styles.ltrTabular, style]} {...props}>
      {formatTime(value)}
    </Text>
  );
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
