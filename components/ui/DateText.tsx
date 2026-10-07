import React from 'react';
import { StyleSheet, TextProps, TextStyle } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Typography } from '@/constants/typography';
import { formatDateShort } from '@/utils/formatters';
import { useResponsive } from '@/hooks/useResponsive';

interface Props extends Omit<TextProps, 'children'> {
  value: string | Date;
  size?: 'default' | 'small';
}

const TABLET_DATE_PRESET = {
  small: { fontSize: 13, fontWeight: '500', lineHeight: 16 } as TextStyle,
  default: { fontSize: 14, fontWeight: '500', lineHeight: 18 } as TextStyle,
};

/** Consistent weight/size + LTR + tabular digits for every displayed date. */
export function DateText({ value, size = 'default', style, ...props }: Props) {
  const { isTablet } = useResponsive();
  const phonePreset = size === 'small' ? Typography.dateSmall : Typography.date;
  const preset = isTablet
    ? (size === 'small' ? TABLET_DATE_PRESET.small : TABLET_DATE_PRESET.default)
    : phonePreset;
  return (
    <Text style={[preset, styles.ltrTabular, style]} {...props}>
      {formatDateShort(value)}
    </Text>
  );
}

const styles = StyleSheet.create({
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
