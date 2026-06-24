import React from 'react';
import { View, StyleSheet, TextStyle } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';

interface Props {
  label: string;
  value: string;
  caption?: string;
  /** Forces the value (and caption) to stay LTR — use for prices, quantities, dates, codes/IDs. */
  valueNumeric?: boolean;
}

export function LockedFieldRow({ label, value, caption, valueNumeric }: Props) {
  const { colors } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();
  const valueStyle: TextStyle = valueNumeric
    ? { textAlign: 'left', writingDirection: 'ltr' }
    : { textAlign };

  return (
    <View style={[styles.wrap, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
      <View style={[styles.headerRow, { flexDirection }]}>
        <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{label}</Text>
        <Ionicons name="lock-closed-outline" size={13} color={colors.gray400} />
      </View>
      <Text style={[styles.value, { color: colors.gray600 }, valueStyle]}>{value}</Text>
      {caption ? (
        <Text style={[styles.caption, { color: colors.gray400 }, valueNumeric ? { textAlign: 'left', writingDirection: 'ltr' } : { textAlign }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1.5,
    borderRadius: Theme.input.borderRadius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 11, marginTop: 4, lineHeight: 15 },
});
