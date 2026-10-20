import React, { useMemo } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { LowStockBadge } from './LowStockBadge';
import i18n from '@/lib/i18n';
import type { InventoryProduct } from '@/types/inventory';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';

interface Props {
  product: InventoryProduct;
  onPress: (productId: number) => void;
  isLowStock?: boolean;
}

function ProductGridCardImpl({ product, onPress, isLowStock: isLowStockProp }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const okTint = useMemo(() => getStatusTint('success', colors, isDark), [colors, isDark]);
  const lowTint = useMemo(() => getStatusTint('warning', colors, isDark), [colors, isDark]);

  const threshold = product.lowStockThreshold ?? 3;
  const isLowStockLocal = product.isActive && product.quantity > 0 && product.quantity <= threshold;
  const isLowStock = isLowStockProp ?? isLowStockLocal;
  const isSold = !product.isActive || (product.idMode === 'unique' && product.quantity === 0);

  const categoryName = i18n.t(`purchases.categories.${product.category}`, {
    defaultValue: product.category,
  });

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSold && styles.cardSold,
        {
          backgroundColor: colors.white,
          borderColor: isDark ? colors.gray200 : hexToRgba(colors.gray200, 0.6),
        },
      ]}
      onPress={() => onPress(product.id)}
      activeOpacity={0.82}
    >
      {/* 1. Thumbnail & Floating Badges */}
      <View style={styles.thumbContainer}>
        {product.imageUri ? (
          <Image
            source={{ uri: product.imageUri }}
            style={styles.thumb}
            resizeMode="cover"
            fadeDuration={0}
          />
        ) : (
          <View style={[styles.thumbPlaceholder, { backgroundColor: colors.softBlue }]}>
            <Ionicons name="cube-outline" size={28} color={colors.primary} />
          </View>
        )}

        {/* Floating Stock Quantity Badge */}
        <View
          style={[
            styles.stockBadge,
            {
              left: isRTL ? undefined : 8,
              right: isRTL ? 8 : undefined,
              backgroundColor: isSold
                ? (isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2')
                : isLowStock
                ? lowTint.bg
                : okTint.bg,
            },
          ]}
        >
          <Text
            style={[
              styles.stockText,
              {
                color: isSold
                  ? colors.error
                  : isLowStock
                  ? lowTint.text
                  : okTint.text,
              },
            ]}
            numberOfLines={1}
          >
            {isSold
              ? i18n.t('inventory.soldBadge')
              : `${product.quantity} ${product.unit !== 'pcs' ? product.unit : ''}`.trim()}
          </Text>
        </View>

        {/* Floating Item Code */}
        {product.itemId ? (
          <View
            style={[
              styles.idBadge,
              {
                right: isRTL ? undefined : 8,
                left: isRTL ? 8 : undefined,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.88)' : 'rgba(255, 255, 255, 0.92)',
              },
            ]}
          >
            <IdText size="small" style={[styles.idText, { color: colors.primary }]}>
              #{product.itemId}
            </IdText>
          </View>
        ) : null}
      </View>

      {/* 2. Product Name & Category */}
      <View style={styles.bodyContent}>
        <Text
          style={[
            styles.productName,
            { color: colors.black, textAlign },
            isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
          ]}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {product.itemDescription ? (
          <Text style={[styles.itemDescription, { color: colors.gray400, textAlign }]} numberOfLines={1}>
            {product.itemDescription}
          </Text>
        ) : null}

        {/* Category Chip */}
        <View style={[styles.catRow, { flexDirection }]}>
          <View style={[styles.catChip, { backgroundColor: colors.softBlue }]}>
            <Text style={[styles.catText, { color: colors.primaryDark }]} numberOfLines={1}>
              {categoryName}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. Pricing Box (Sell Price & Buy Price) */}
      <View
        style={[
          styles.pricingBox,
          {
            backgroundColor: isDark ? colors.gray100 : colors.gray50,
            borderColor: isDark ? colors.gray200 : colors.gray100,
          },
        ]}
      >
        <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.priceLabel, { color: colors.gray400 }]}>
            {i18n.t('inventory.sellPrice')}
          </Text>
          <AmountText
            value={product.sellingPrice}
            currency="IQD"
            style={[styles.sellPrice, { color: colors.primary }]}
          />
        </View>

        <View style={[styles.priceRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 3 }]}>
          <Text style={[styles.priceLabel, { color: colors.gray400 }]}>
            {i18n.t('inventory.buyPrice')}
          </Text>
          <AmountText
            value={product.purchasePrice}
            currency="IQD"
            variant="small"
            style={styles.buyPrice}
          />
        </View>
      </View>

      {/* 4. Bottom Row: Payment Status & LowStockBadge & Chevron */}
      <View style={[styles.footerRow, { flexDirection }]}>
        <View style={[styles.footerLeft, { flexDirection, gap: 4 }]}>
          <View style={[styles.payDot, product.paymentStatus === 'paid' ? styles.payDotPaid : styles.payDotDebt]} />
          <Text style={[styles.payText, product.paymentStatus === 'debt' && styles.payTextDebt]}>
            {product.paymentStatus === 'paid' ? i18n.t('common.paid') : i18n.t('common.debt')}
          </Text>
        </View>

        <View style={[styles.footerRight, { flexDirection, gap: 4, alignItems: 'center' }]}>
          {isLowStock && !isSold && <LowStockBadge />}
          <Ionicons name={chevronForward as never} size={14} color={colors.gray300} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ProductGridCard = React.memo(ProductGridCardImpl);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    justifyContent: 'space-between',
    minHeight: 240,
    ...Theme.shadow.soft,
  },
  cardSold: {
    opacity: 0.65,
  },
  thumbContainer: {
    width: '100%',
    height: 110,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    marginBottom: 8,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadge: {
    position: 'absolute',
    top: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 2,
  },
  stockText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  idBadge: {
    position: 'absolute',
    top: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    zIndex: 2,
  },
  idText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bodyContent: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 6,
  },
  productName: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 10.5,
    marginBottom: 4,
  },
  catRow: {
    alignItems: 'center',
    marginTop: 2,
  },
  catChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '100%',
  },
  catText: {
    fontSize: 10,
    fontWeight: '600',
  },
  pricingBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  priceRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  sellPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  buyPrice: {
    fontSize: 11,
    color: '#94A3B8',
  },
  footerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  footerLeft: {
    alignItems: 'center',
  },
  footerRight: {
    alignItems: 'center',
  },
  payDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  payDotPaid: {
    backgroundColor: '#10B981',
  },
  payDotDebt: {
    backgroundColor: '#EF4444',
  },
  payText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  payTextDebt: {
    color: '#EF4444',
  },
});
