import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import type { Product } from '@/types/sales';

interface Props {
  product: Product;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function CheckPriceRow({ product }: Props) {
  const isLowStock = product.quantity > 0 && product.quantity <= 5;
  const isOutOfStock = product.quantity === 0 || !product.isActive;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <View style={styles.badges}>
          {product.itemId ? (
            <View style={styles.idBadge}>
              <Text style={styles.idText}>#{product.itemId}</Text>
            </View>
          ) : null}
          {product.unit !== 'pcs' ? (
            <Text style={styles.unit}>{product.unit}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.prices}>
        <Text style={styles.buyPrice}>{fmt(product.purchasePrice)}</Text>
        <Text style={styles.sellPrice}>{fmt(product.sellingPrice)}</Text>
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
    backgroundColor: Colors.softBlue,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  idText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  unit: { fontSize: 11, color: Colors.gray500 },
  prices: { alignItems: 'flex-end', marginHorizontal: 12 },
  buyPrice: { fontSize: 11, color: Colors.gray400, marginBottom: 2 },
  sellPrice: { fontSize: 15, fontWeight: '700', color: Colors.primary },
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
