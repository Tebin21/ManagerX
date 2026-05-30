import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface Props {
  itemCount: number;
  grandTotal: number;
  onPress: () => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function CartSummaryBar({ itemCount, grandTotal, onPress }: Props) {
  if (itemCount === 0) return null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.bar}>
      <View style={styles.left}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount}</Text>
        </View>
        <Text style={styles.label}>
          {itemCount === 1 ? '1 item' : `${itemCount} items`}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.total}>{fmt(grandTotal)}</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    margin: 16,
    padding: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    minWidth: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  label: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  total: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
