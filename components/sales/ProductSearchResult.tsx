import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import type { Product } from '@/types/sales';

interface Props {
  product: Product;
  inCartQty: number;
  onAdd: () => void;
}

export function ProductSearchResult({ product, inCartQty, onAdd }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isUniqueAndSold = product.idMode === 'unique' && (!product.isActive || product.quantity === 0);
  const atMaxStock = product.idMode === 'repeatable' && inCartQty >= product.quantity;
  const isDisabled = isUniqueAndSold || atMaxStock;

  return (
    <View style={[styles.row, isDisabled && styles.rowDisabled, { flexDirection }]}>
      <TouchableOpacity
        onPress={onAdd}
        disabled={isDisabled}
        activeOpacity={0.75}
      >
        {product.imageUri ? (
          <Image
            source={{ uri: product.imageUri }}
            style={[styles.thumb, { marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? RTL_SPACING.gapLg : 0 }]}
            resizeMode="contain"
            fadeDuration={0}
          />
        ) : (
          <View style={[styles.thumbPlaceholder, { marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? RTL_SPACING.gapLg : 0 }]}>
            <Ionicons name="cube-outline" size={28} color={Colors.gray300} />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.left}>
        <View style={[styles.nameRow, { flexDirection }]}>
          <Text style={[styles.name, isDisabled && styles.nameDisabled, { textAlign }]} numberOfLines={1}>
            {product.name}
          </Text>
          {product.itemId ? (
            <View style={[styles.idBadge, { backgroundColor: colors.softBlue }]}>
              <IdText size="small" style={[styles.idText, { color: colors.primary }]}>#{product.itemId}</IdText>
            </View>
          ) : null}
        </View>

        <View style={[styles.meta, { flexDirection }]}>
          <AmountText value={product.sellingPrice} variant="small" style={[styles.price, { color: colors.primary }]} />
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
              { textAlign },
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
        style={[styles.addBtn, { backgroundColor: isDisabled ? Colors.gray100 : colors.softBlue, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? RTL_SPACING.gap : 0 }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {inCartQty > 0 ? (
          <View style={[styles.inCartBadge, { flexDirection }]}>
            <Text style={[styles.inCartText, { color: colors.primary }]}>{inCartQty}</Text>
            <Ionicons name="add" size={14} color={colors.primary} />
          </View>
        ) : (
          <Ionicons name="add" size={20} color={isDisabled ? Colors.gray300 : colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
    ...Theme.shadow.soft,
  },
  rowDisabled: { opacity: 0.6 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 12,
    flexShrink: 0,
    backgroundColor: Colors.gray100,
  },
  thumbPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 12,
    flexShrink: 0,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: { flex: 1, paddingTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  name: { fontSize: 14, fontWeight: '600', color: Colors.black },
  nameDisabled: { color: Colors.gray400 },
  idBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  idText: { fontSize: 10, fontWeight: '500' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 13, fontWeight: '700' },
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
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
  inCartBadge: { flexDirection: 'row', alignItems: 'center' },
  inCartText: { fontSize: 13, fontWeight: '700' },
});
