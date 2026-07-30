import React, { useMemo } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { LowStockBadge } from './LowStockBadge';
import i18n from '@/lib/i18n';
import type { InventoryProduct } from '@/types/inventory';

interface Props {
  product: InventoryProduct;
  /** Called with the product's id — keeping this id-based (rather than a
   *  no-arg callback the parent recreates per row) lets the parent pass one
   *  stable function reference for every row, which React.memo below needs
   *  to actually skip re-rendering unrelated rows. */
  onPress: (productId: number) => void;
  isLowStock?: boolean;
}

function ProductCardImpl({ product, onPress, isLowStock: isLowStockProp }: Props) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const okTint = useMemo(() => getStatusTint('success', colors, isDark), [colors, isDark]);
  const lowTint = useMemo(() => getStatusTint('warning', colors, isDark), [colors, isDark]);
  const { isRTL, textAlign, flexDirection } = useRTL();
  const threshold = product.lowStockThreshold ?? 3;
  const isLowStockLocal = product.isActive && product.quantity > 0 && product.quantity <= threshold;
  const isLowStock = isLowStockProp ?? isLowStockLocal;
  const isSold = !product.isActive || (product.idMode === 'unique' && product.quantity === 0);

  // Translate category name via purchases.categories map with fallback
  const categoryName = i18n.t(`purchases.categories.${product.category}`, {
    defaultValue: product.category,
  });

  return (
    <TouchableOpacity
      style={[styles.card, isSold && styles.cardSold, { padding: isRTL ? RTL_SPACING.cardPad : 16 }]}
      onPress={() => onPress(product.id)}
      activeOpacity={0.82}
    >
      {/* Top row */}
      <View style={[styles.topRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 10 }]}>
        {/* Product thumbnail */}
        <View style={styles.thumbWrap}>
          {product.imageUri ? (
            <Image source={{ uri: product.imageUri }} style={styles.thumb} resizeMode="cover" fadeDuration={0} />
          ) : (
            <View style={[styles.thumbPlaceholder, { backgroundColor: colors.softBlue }]}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.nameWrap}>
          <Text style={[styles.name, { textAlign, marginBottom: isRTL ? 8 : 5 }]} numberOfLines={1}>{product.name}</Text>
          {product.itemDescription ? (
            <Text style={[styles.itemDescription, { textAlign }]} numberOfLines={1}>{product.itemDescription}</Text>
          ) : null}
          <View style={[styles.meta, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 6 }]}>
            <View style={[styles.catChip, { backgroundColor: colors.softBlue }]}>
              <Text style={[styles.catText, { color: colors.primaryDark }]}>{categoryName}</Text>
            </View>
            {product.itemId ? (
              <View style={styles.idChip}>
                <IdText size="small" style={styles.idText} numberOfLines={1}># {product.itemId}</IdText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Quantity badge */}
        <View style={[
          styles.qtyBadge,
          isSold ? styles.qtyBadgeSold : { backgroundColor: isLowStock ? lowTint.bg : okTint.bg },
        ]}>
          <Text style={[
            styles.qtyText,
            isSold ? styles.qtyTextSold : { color: isLowStock ? lowTint.text : okTint.text },
          ]}>
            {isSold ? i18n.t('inventory.soldBadge') : product.quantity}
          </Text>
          {!isSold && <Text style={[styles.qtyUnit, { color: isLowStock ? lowTint.text : okTint.text }]}> {product.unit}</Text>}
        </View>
      </View>

      {/* Price row */}
      <View style={[styles.priceRow, { flexDirection }]}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>{i18n.t('inventory.buyPrice')}</Text>
          <AmountText value={product.purchasePrice} currency="IQD" variant="small" style={styles.priceValue} />
        </View>
        <View style={styles.divider} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>{i18n.t('inventory.sellPrice')}</Text>
          <AmountText value={product.sellingPrice} currency="IQD" variant="small" style={[styles.priceValue, { color: colors.primary }]} />
        </View>
        <View style={styles.divider} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>{i18n.t('inventory.totalValueLabel')}</Text>
          <AmountText value={product.purchasePrice * product.quantity} currency="IQD" variant="small" style={styles.priceValue} />
        </View>
      </View>

      {/* Bottom row */}
      <View style={[styles.bottomRow, { flexDirection }]}>
        <View style={styles.bottomLeft}>
          {product.supplierName ? (
            <View style={[styles.supplierRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4 }]}>
              <Ionicons name="business-outline" size={12} color={colors.gray400} />
              <Text style={[styles.supplierText, { textAlign }]} numberOfLines={1}>{product.supplierName}</Text>
            </View>
          ) : null}
          {product.purchaseDate ? (
            <DateText value={product.purchaseDate} size="small" style={[styles.dateText, { textAlign }]} />
          ) : null}
        </View>

        <View style={[styles.bottomRight, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 5 }]}>
          {isLowStock && !isSold && <LowStockBadge />}
          <View style={[styles.payDot, product.paymentStatus === 'paid' ? styles.payDotPaid : styles.payDotDebt]} />
          <Text style={[styles.payText, product.paymentStatus === 'debt' && styles.payTextDebt, { textAlign }]}>
            {product.paymentStatus === 'paid' ? i18n.t('common.paid') : i18n.t('common.debt')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ProductCard = React.memo(ProductCardImpl);

function getStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.white,
      borderRadius: Theme.radius.card,
      padding: 16,
      marginBottom: 10,
      ...Theme.shadow.card,
    },
    cardSold: {
      opacity: 0.65,
    },

    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
      gap: 10,
    },
    thumbWrap: {
      width: 48,
      height: 48,
      borderRadius: 10,
      overflow: 'hidden',
      flexShrink: 0,
    },
    thumb: {
      width: 48,
      height: 48,
      borderRadius: 10,
    },
    thumbPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameWrap: { flex: 1 },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.black,
      marginBottom: 5,
    },
    itemDescription: {
      fontSize: 12,
      color: colors.gray500,
      marginBottom: 4,
    },
    meta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    catChip: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    catText: {
      fontSize: 11,
      fontWeight: '600',
    },
    idChip: {
      backgroundColor: colors.gray100,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
      maxWidth: 120,
    },
    idText: {
      color: colors.gray600,
    },

    qtyBadge: {
      flexDirection: 'row',
      alignItems: 'baseline',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    qtyBadgeSold: { backgroundColor: colors.gray100 },
    qtyText:   { fontSize: 16, fontWeight: '800' },
    qtyTextSold: { color: colors.gray500, fontSize: 13, fontWeight: '600' },
    qtyUnit:  { fontSize: 11, fontWeight: '500' },

    priceRow: {
      flexDirection: 'row',
      backgroundColor: colors.gray50,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    priceItem: { flex: 1, alignItems: 'center' },
    priceLabel: { fontSize: 10, color: colors.gray400, fontWeight: '600', marginBottom: 2 },
    priceValue: { color: colors.black },
    divider: {
      width: 1,
      backgroundColor: colors.gray200,
      marginHorizontal: 4,
    },

    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bottomLeft: { gap: 2 },
    supplierRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    supplierText: { fontSize: 12, color: colors.gray500, maxWidth: 160 },
    dateText: { color: colors.gray400 },

    bottomRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    payDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    payDotPaid: { backgroundColor: colors.success },
    payDotDebt: { backgroundColor: colors.warning },
    payText: { fontSize: 12, fontWeight: '600', color: colors.success },
    payTextDebt: { color: colors.warning },
  });
}
