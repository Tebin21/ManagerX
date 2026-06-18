import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRTL } from '@/lib/rtl';
import i18n from '@/lib/i18n';

export function LowStockBadge() {
  const { flexDirection } = useRTL();
  return (
    <View style={[styles.badge, { flexDirection }]}>
      <Ionicons name="warning-outline" size={11} color="#92400E" />
      <Text style={styles.text}>{i18n.t('inventory.lowStock')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
});
