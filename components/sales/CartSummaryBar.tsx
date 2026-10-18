import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  itemCount: number;
  grandTotal: number;
  onPress: () => void;
}

export function CartSummaryBar({ itemCount, grandTotal, onPress }: Props) {
  const { colors } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();
  const { arrowForward } = useDirectionalChevron();
  const { isTablet, isTabletLandscape } = useResponsive();

  if (itemCount === 0) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.bar,
        isTablet && { maxWidth: isTabletLandscape ? 840 : 720, width: '92%', alignSelf: 'center', padding: isTabletLandscape ? 22 : 20, borderRadius: 22 },
        { backgroundColor: colors.primary, shadowColor: colors.primary, flexDirection }
      ]}
    >
      <View style={[styles.left, { flexDirection }]}>
        <View style={[styles.badge, isTablet && { minWidth: isTabletLandscape ? 38 : 32, height: isTabletLandscape ? 38 : 32, borderRadius: 14 }]}>
          <Text style={[styles.badgeText, isTablet && { fontSize: isTabletLandscape ? 17 : 15 }]}>{itemCount}</Text>
        </View>
        <Text style={[styles.label, isTablet && { fontSize: isTabletLandscape ? 18 : 16 }, { textAlign }]}>
          {itemCount === 1 ? '1 item' : `${itemCount} items`}
        </Text>
      </View>
      <View style={[styles.right, { flexDirection }]}>
        <AmountText value={grandTotal} variant="large" style={[styles.total, isTablet && { fontSize: isTabletLandscape ? 25 : 22 }]} />
        <Ionicons name={arrowForward as never} size={isTabletLandscape ? 28 : (isTablet ? 24 : 20)} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    borderRadius:   16,
    margin:         16,
    padding:        16,
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.35,
    shadowRadius:   12,
    elevation:      6,
  },
  left:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius:    10,
    minWidth:        26,
    height:          26,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  label:     { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '500' },
  right:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  total:     { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
