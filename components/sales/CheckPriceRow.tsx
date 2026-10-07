import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Theme } from '@/constants/theme';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/hooks/useResponsive';
import type { Product } from '@/types/sales';

interface Props {
  product: Product;
  onPress?: () => void;
}

export function CheckPriceRow({ product, onPress }: Props) {
  const { colors } = useAppTheme();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet), [colors, isTablet]);
  const { textAlign, flexDirection, alignEnd } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const isLowStock = product.quantity > 0 && product.quantity <= 5;
  const isOutOfStock = product.quantity === 0 || !product.isActive;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress}
      style={[styles.row, { flexDirection }]}
    >
      <View style={styles.left}>
        <Text style={[styles.name, { textAlign }]} numberOfLines={1}>{product.name}</Text>
        <View style={[styles.badges, { flexDirection }]}>
          {product.category ? (
            <View style={[styles.catBadge, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.catText, { color: colors.gray500 }]}>{product.category}</Text>
            </View>
          ) : null}
          {product.itemId ? (
            <View style={[styles.idBadge, { backgroundColor: colors.softBlue }]}>
              <IdText size="small" style={[styles.idText, { color: colors.primary }]}>#{product.itemId}</IdText>
            </View>
          ) : null}
          {product.unit !== 'pcs' ? (
            <Text style={styles.unit}>{product.unit}</Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.prices, { alignItems: alignEnd }]}>
        <AmountText value={product.purchasePrice} variant="small" style={styles.buyPrice} />
        <AmountText value={product.sellingPrice} style={[styles.sellPrice, { color: colors.primary }]} />
      </View>

      <View style={styles.stockBadge}>
        <Text
          style={[
            styles.stockText,
            isOutOfStock && styles.stockOut,
            isLowStock && !isOutOfStock && styles.stockLow,
            !isLowStock && !isOutOfStock && styles.stockOk,
          ]}
        >
          {isOutOfStock ? 'Out' : `${product.quantity}`}
        </Text>
      </View>

      {onPress && (
        <View style={styles.chevronWrap}>
          <Ionicons name={chevronForward as never} size={16} color={colors.gray300} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function getStyles(colors: AppColors, isTablet: boolean) {
  return StyleSheet.create({
    row: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: isTablet ? 16 : Theme.radius.card,
      paddingHorizontal: isTablet ? 18 : 16,
      paddingVertical: isTablet ? 14 : 12,
      marginBottom: isTablet ? 10 : 8,
      ...Theme.shadow.soft,
    },
    left: { flex: 1 },
    name: { fontSize: isTablet ? 16 : 14, fontWeight: '600', color: colors.black, marginBottom: 4 },
    badges: { flexDirection: 'row', gap: 6 },
    idBadge: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    idText: { fontSize: isTablet ? 12 : 11, fontWeight: '500' },
    unit: { fontSize: isTablet ? 12 : 11, color: colors.gray500 },
    prices: { alignItems: 'flex-end', marginHorizontal: 12 },
    buyPrice: { fontSize: isTablet ? 12 : 11, color: colors.gray400, marginBottom: 2 },
    sellPrice: { fontSize: isTablet ? 17 : 15, fontWeight: '700' },
    stockBadge: {
      minWidth: isTablet ? 42 : 36,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: isTablet ? 10 : 8,
      paddingVertical: isTablet ? 6 : 4,
      borderRadius: 8,
      backgroundColor: colors.gray100,
    },
    stockText: { fontSize: isTablet ? 14 : 13, fontWeight: '700' },
    stockOk: { color: colors.success },
    stockLow: { color: colors.warning },
    stockOut: { color: colors.error },
    catBadge: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    catText: { fontSize: isTablet ? 12 : 11, fontWeight: '500' },
    chevronWrap: {
      marginStart: 8,
      justifyContent: 'center',
    },
  });
}
