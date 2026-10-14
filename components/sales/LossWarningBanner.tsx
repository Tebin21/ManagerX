import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRTL } from '@/lib/rtl';
import { useAppTheme } from '@/contexts/ThemeContext';
import { hexToRgba } from '@/lib/colorUtils';

export function LossWarningBanner() {
  const { textAlign, flexDirection } = useRTL();
  const { colors, isDark } = useAppTheme();

  return (
    <MotiView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={[
        styles.banner,
        {
          flexDirection,
          backgroundColor: isDark ? hexToRgba(colors.warning, 0.15) : '#FEF3C7',
          borderStartColor: colors.warning,
        },
      ]}
    >
      <Ionicons name="warning" size={18} color={isDark ? colors.warning : '#92400e'} style={styles.icon} />
      <View style={styles.textBlock}>
        <Text style={[styles.title, { textAlign, color: isDark ? colors.warning : '#92400e' }]}>Selling below cost</Text>
        <Text style={[styles.sub, { textAlign, color: isDark ? colors.gray400 : '#92400e' }]}>One or more items are priced below purchase price.</Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderStartWidth: 4,
    borderStartColor: '#F59E0B',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  icon: { marginTop: 1 },
  textBlock: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  sub: { fontSize: 12, color: '#92400e', opacity: 0.85, lineHeight: 17 },
});
