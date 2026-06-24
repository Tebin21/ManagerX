import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import type { Product } from '@/types/sales';

interface Props {
  product: Product;
}

export function CheckPriceRow({ product }: Props) {
  const { colors } = useAppTheme();
  const { textAlign, flexDirection, alignEnd } = useRTL();
  const isLowStock = product.quantity > 0 && product.quantity <= 5;
  const isOutOfStock = product.quantity === 0 || !product.isActive;

  return (
    <View style={[styles.row, { flexDirection }]}>
      <View style={styles.left}>
        <Text style={[styles.name, { textAlign }]} numberOfLines={1}>{product.name}</Text>
        <View style={[styles.badges, { flexDirection }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    ...Theme.shadow.soft,
  },
  left: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.black, marginBottom: 4 },
  badges: { flexDirection: 'row', gap: 6 },
  idBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  idText: { fontSize: 11, fontWeight: '500' },
  unit: { fontSize: 11, color: Colors.gray500 },
  prices: { alignItems: 'flex-end', marginHorizontal: 12 },
  buyPrice: { fontSize: 11, color: Colors.gray400, marginBottom: 2 },
  sellPrice: { fontSize: 15, fontWeight: '700' },
  stockBadge: {
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.gray100,
  },
  stockText: { fontSize: 13, fontWeight: '700' },
  stockOk: { color: Colors.success },
  stockLow: { color: Colors.warning },
  stockOut: { color: Colors.error },
});
