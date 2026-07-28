import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL } from '@/lib/rtl';
import i18n from '@/lib/i18n';

export function LowStockBadge() {
  const { colors, isDark } = useAppTheme();
  const tint = getStatusTint('warning', colors, isDark);
  const { flexDirection } = useRTL();
  return (
    <View style={[styles.badge, { backgroundColor: tint.bg, flexDirection }]}>
      <Ionicons name="warning-outline" size={11} color={tint.text} />
      <Text style={[styles.text, { color: tint.text }]}>{i18n.t('inventory.lowStock')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
});
