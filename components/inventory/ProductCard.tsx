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
import { useResponsive } from '@/hooks/useResponsive';

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
  const { isTablet, isTabletLandscape } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isDark, isTablet, isTabletLandscape), [colors, isDark, isTablet, isTabletLandscape]);
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
      style={[
        styles.card,
        isSold && styles.cardSold,
        { padding: isTabletLandscape ? 20 : isTablet ? 18 : (isRTL ? RTL_SPACING.cardPad : 16) }
      ]}
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

function getStyles(colors: AppColors, isDark: boolean, isTablet: boolean, isTabletLandscape: boolean = false) {
  const thumbDim = isTabletLandscape ? 72 : isTablet ? 58 : 48;
  return StyleSheet.create({
    card: {
      width: '100%',
      flex: isTablet ? 1 : undefined,
      backgroundColor: colors.white,
      borderRadius: isTabletLandscape ? 20 : isTablet ? 18 : Theme.radius.card,
      padding: isTabletLandscape ? 20 : isTablet ? 18 : 16,
      marginBottom: isTabletLandscape ? 14 : 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
      ...Theme.shadow.card,
    },
    cardSold: {
      opacity: 0.65,
    },

    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: isTabletLandscape ? 14 : 12,
      gap: isTabletLandscape ? 14 : isTablet ? 12 : 10,
    },
    thumbWrap: {
      width: thumbDim,
      height: thumbDim,
      borderRadius: isTabletLandscape ? 14 : isTablet ? 12 : 10,
      overflow: 'hidden',
      flexShrink: 0,
    },
    thumb: {
      width: thumbDim,
      height: thumbDim,
      borderRadius: isTabletLandscape ? 14 : isTablet ? 12 : 10,
    },
    thumbPlaceholder: {
      width: thumbDim,
      height: thumbDim,
      borderRadius: isTabletLandscape ? 14 : isTablet ? 12 : 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameWrap: { flex: 1 },
    name: {
      fontSize: isTabletLandscape ? 18.5 : isTablet ? 17 : 15,
      fontWeight: '700',
      color: colors.black,
      marginBottom: isTablet ? 6 : 5,
    },
    itemDescription: {
      fontSize: isTabletLandscape ? 14.5 : isTablet ? 14 : 12,
      color: colors.gray500,
      marginBottom: 4,
    },
    meta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    catChip: {
      borderRadius: isTablet ? 8 : 6,
      paddingHorizontal: isTabletLandscape ? 12 : isTablet ? 10 : 8,
      paddingVertical: isTabletLandscape ? 5 : isTablet ? 4 : 2,
    },
    catText: {
      fontSize: isTabletLandscape ? 14 : isTablet ? 13 : 11,
      fontWeight: '600',
    },
    idChip: {
      backgroundColor: colors.gray100,
      borderRadius: isTablet ? 8 : 6,
      paddingHorizontal: isTabletLandscape ? 12 : isTablet ? 10 : 8,
      paddingVertical: isTabletLandscape ? 5 : isTablet ? 4 : 2,
      maxWidth: 160,
    },
    idText: {
      color: colors.gray600,
      fontSize: isTabletLandscape ? 13 : 11,
    },

    qtyBadge: {
      flexDirection: 'row',
      alignItems: 'baseline',
      borderRadius: isTablet ? 12 : 10,
      paddingHorizontal: isTabletLandscape ? 14 : isTablet ? 12 : 10,
      paddingVertical: isTabletLandscape ? 7 : isTablet ? 6 : 4,
    },
    qtyBadgeSold: { backgroundColor: colors.gray100 },
    qtyText:   { fontSize: isTabletLandscape ? 20 : isTablet ? 18 : 16, fontWeight: '800' },
    qtyTextSold: { color: colors.gray500, fontSize: isTabletLandscape ? 16 : isTablet ? 15 : 13, fontWeight: '600' },
    qtyUnit:  { fontSize: isTabletLandscape ? 14 : isTablet ? 13 : 11, fontWeight: '500' },

    priceRow: {
      flexDirection: 'row',
      backgroundColor: colors.gray50,
      borderRadius: isTabletLandscape ? 14 : isTablet ? 12 : 10,
      paddingVertical: isTabletLandscape ? 12 : isTablet ? 10 : 8,
      paddingHorizontal: isTabletLandscape ? 16 : isTablet ? 14 : 12,
      marginBottom: isTabletLandscape ? 14 : 12,
    },
    priceItem: { flex: 1, alignItems: 'center' },
    priceLabel: { fontSize: isTabletLandscape ? 13 : isTablet ? 12 : 10, color: colors.gray400, fontWeight: '600', marginBottom: 2 },
    priceValue: { color: colors.black },
    divider: {
      width: 1,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.24)' : colors.gray200,
      marginHorizontal: 4,
      marginVertical: 2,
    },

    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bottomLeft: { gap: 2 },
    supplierRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    supplierText: { fontSize: isTablet ? 14 : 12, color: colors.gray500, maxWidth: 160 },
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
    payText: { fontSize: isTablet ? 14 : 12, fontWeight: '600', color: colors.success },
    payTextDebt: { color: colors.warning },
  });
}
