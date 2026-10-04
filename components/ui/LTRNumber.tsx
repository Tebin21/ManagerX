import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { resolveInterFont } from '@/constants/typography';

/**
 * Renders numeric text in physical left-to-right direction regardless of the
 * app's layout direction. Use for all financial values (IQD, USD, percentages)
 * so that "39,000 IQD" always reads left-to-right and digits never reverse.
 * Strictly uses Inter font to ensure numbers never inherit Kurdish font.
 */
export function LTRNumber({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const fontFamily = resolveInterFont(flat?.fontWeight);
  return <Text style={[styles.ltr, style, { fontFamily }]} {...props} />;
}

const styles = StyleSheet.create({
  ltr: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
});
