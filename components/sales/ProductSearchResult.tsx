import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import type { Product } from '@/types/sales';

interface Props {
  product: Product;
  inCartQty: number;
  onAdd: () => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function ProductSearchResult({ product, inCartQty, onAdd }: Props) {
  const isUniqueAndSold = product.idMode === 'unique' && (!product.isActive || product.quantity === 0);
  const isDisabled = isUniqueAndSold;

  return (
    <View style={[styles.row, isDisabled && styles.rowDisabled]}>
      {product.imageUri ? (
        <Image source={{ uri: product.imageUri }} style={styles.thumb} resizeMode="cover" />
      ) : null}
      <View style={styles.left}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isDisabled && styles.nameDisabled]} numberOfLines={1}>
            {product.name}
          </Text>
          {product.itemId ? (
            <View style={styles.idBadge}>
              <Text style={styles.idText}>#{product.itemId}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.meta}>
          <Text style={styles.price}>{fmt(product.sellingPrice)}</Text>
          <Text style={styles.dot}>·</Text>
          {isUniqueAndSold ? (
            <View style={styles.soldBadge}>
              <Text style={styles.soldText}>Sold</Text>
            </View>
          ) : (
            <Text style={[
              styles.stock,
              product.quantity <= 5 && styles.stockLow,
              product.quantity === 0 && styles.stockOut,
            ]}>
              {product.quantity} {product.unit}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={onAdd}
        disabled={isDisabled}
        activeOpacity={0.75}
        style={[styles.addBtn, isDisabled && styles.addBtnDisabled]}
      >
        {inCartQty > 0 ? (
          <View style={styles.inCartBadge}>
            <Text style={styles.inCartText}>{inCartQty}</Text>
            <Ionicons name="add" size={14} color={Colors.primary} />
          </View>
        ) : (
          <Ionicons name="add" size={20} color={isDisabled ? Colors.gray300 : Colors.primary} />
        )}
      </TouchableOpacity>
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
    marginBottom: 6,
    ...Theme.shadow.soft,
  },
  rowDisabled: { opacity: 0.6 },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
    flexShrink: 0,
  },
  left: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '600', color: Colors.black },
  nameDisabled: { color: Colors.gray400 },
  idBadge: {
    backgroundColor: Colors.softBlue,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  idText: { fontSize: 10, color: Colors.primary, fontWeight: '500' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  dot: { color: Colors.gray300 },
  stock: { fontSize: 12, color: Colors.success, fontWeight: '500' },
  stockLow: { color: Colors.warning },
  stockOut: { color: Colors.error },
  soldBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  soldText: { fontSize: 11, color: Colors.error, fontWeight: '600' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addBtnDisabled: { backgroundColor: Colors.gray100 },
  inCartBadge: { flexDirection: 'row', alignItems: 'center' },
  inCartText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
