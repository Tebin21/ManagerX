import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

/**
 * Renders numeric text in physical left-to-right direction regardless of the
 * app's layout direction. Use for all financial values (IQD, USD, percentages)
 * so that "39,000 IQD" always reads left-to-right and digits never reverse.
 */
export function LTRNumber({ style, ...props }: TextProps) {
  return <Text style={[styles.ltr, style]} {...props} />;
}

const styles = StyleSheet.create({
  ltr: { writingDirection: 'ltr' },
});
