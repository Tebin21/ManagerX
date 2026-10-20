import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Theme } from '@/constants/theme';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { Ionicons } from '@expo/vector-icons';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont } from '@/lib/settingsFont';
import type { Product } from '@/types/sales';

interface Props {
  product: Product;
  onPress?: () => void;
  layout?: 'list' | 'grid';
}

export function CheckPriceRow({ product, onPress, layout = 'list' }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const styles = useMemo(
    () => getStyles(colors, isTablet, isTabletLandscape, isDark),
    [colors, isTablet, isTabletLandscape, isDark]
  );
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const isLowStock = product.quantity > 0 && product.quantity <= 5;
  const isOutOfStock = product.quantity === 0 || !product.isActive;

  // ─── Square Grid Card Layout (چوارگۆشە) ──────────────────────────────────
  if (layout === 'grid') {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={onPress ? 0.75 : 1}
        disabled={!onPress}
        style={[styles.gridCard, isOutOfStock && styles.gridCardOut]}
      >
        {/* Top Thumbnail Container */}
        <View style={styles.gridThumbContainer}>
          {product.imageUri ? (
            <Image
              source={{ uri: product.imageUri }}
              style={styles.gridThumb}
              resizeMode="cover"
              fadeDuration={0}
            />
          ) : (
            <View style={[styles.gridThumbPlaceholder, { backgroundColor: colors.softBlue }]}>
              <Ionicons
                name="pricetag-outline"
                size={isTablet ? 36 : 28}
                color={colors.primary}
              />
            </View>
          )}

          {/* Stock Badge - floating top corner */}
          <View
            style={[
              styles.gridStockBadge,
              {
                right: isRTL ? undefined : 8,
                left: isRTL ? 8 : undefined,
                backgroundColor: isOutOfStock
                  ? (isDark ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2')
                  : isLowStock
                  ? (isDark ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7')
                  : (isDark ? 'rgba(16, 185, 129, 0.25)' : '#DCFCE7'),
              },
            ]}
          >
            <Text
              style={[
                styles.gridStockText,
                {
                  color: isOutOfStock
                    ? colors.error
                    : isLowStock
                    ? colors.warning
                    : colors.success,
                },
              ]}
              numberOfLines={1}
            >
              {isOutOfStock
                ? (isKuLanguage ? 'نەماوە' : 'Out')
                : `${product.quantity} ${product.unit !== 'pcs' ? product.unit : ''}`.trim()}
            </Text>
          </View>

          {/* Item Code (#itemId) - floating opposite corner */}
          {product.itemId ? (
            <View
              style={[
                styles.gridIdBadge,
                {
                  left: isRTL ? undefined : 8,
                  right: isRTL ? 8 : undefined,
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.92)',
                },
              ]}
            >
              <IdText size="small" style={[styles.gridIdText, { color: colors.primary }]}>
                #{product.itemId}
              </IdText>
            </View>
          ) : null}
        </View>

        {/* Content Details */}
        <View style={styles.gridContent}>
          {/* Product Name */}
          <Text
            style={[
              styles.gridName,
              { textAlign },
              isKuLanguage && applyKurdishFont(true, { fontWeight: '700' }),
            ]}
            numberOfLines={2}
          >
            {product.name}
          </Text>

          {/* Category Chip */}
          <View style={[styles.gridCatRow, { flexDirection }]}>
            {product.category ? (
              <View style={[styles.catBadge, { backgroundColor: colors.gray100 }]}>
                <Text style={[styles.catText, { color: colors.gray500 }]} numberOfLines={1}>
                  {product.category}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Price Box */}
          <View style={styles.gridPriceBox}>
            <View style={[styles.gridPriceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.gridPriceLabel, { color: colors.gray400 }]}>
                {isKuLanguage ? 'فرۆشتن' : 'Sell'}
              </Text>
              <AmountText
                value={product.sellingPrice}
                style={[styles.gridSellPrice, { color: colors.primary }]}
              />
            </View>

            <View style={[styles.gridPriceRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.gridPriceLabel, { color: colors.gray400 }]}>
                {isKuLanguage ? 'تێچوو' : 'Buy'}
              </Text>
              <AmountText
                value={product.purchasePrice}
                variant="small"
                style={styles.gridBuyPrice}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ─── List Row Layout (درێژ) ──────────────────────────────────────────────
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

function getStyles(colors: AppColors, isTablet: boolean, isTabletLandscape: boolean, isDark: boolean) {
  return StyleSheet.create({
    // ─── List Row (درێژ) ───
    row: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: isTablet ? 16 : Theme.radius.card,
      paddingHorizontal: isTablet ? 18 : 16,
      paddingVertical: isTablet ? 14 : 12,
      marginBottom: isTablet ? 10 : 8,
      borderWidth: 1,
      borderColor: colors.gray200,
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

    // ─── Grid Square Card (چوارگۆشە) ───
    gridCard: {
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: isTablet ? 18 : 16,
      marginBottom: isTablet ? 12 : 10,
      borderWidth: 1,
      borderColor: colors.gray200,
      overflow: 'hidden',
      ...Theme.shadow.soft,
    },
    gridCardOut: {
      opacity: 0.72,
    },
    gridThumbContainer: {
      width: '100%',
      height: isTabletLandscape ? 130 : isTablet ? 120 : 96,
      backgroundColor: colors.gray100,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridThumb: {
      width: '100%',
      height: '100%',
    },
    gridThumbPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridStockBadge: {
      position: 'absolute',
      top: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      zIndex: 2,
    },
    gridStockText: {
      fontSize: isTablet ? 12 : 11,
      fontWeight: '700',
    },
    gridIdBadge: {
      position: 'absolute',
      top: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      zIndex: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    gridIdText: {
      fontSize: isTablet ? 11.5 : 10.5,
      fontWeight: '600',
    },
    gridContent: {
      padding: isTablet ? 12 : 10,
      gap: 5,
    },
    gridName: {
      fontSize: isTabletLandscape ? 15.5 : isTablet ? 14.5 : 13.5,
      fontWeight: '700',
      color: colors.black,
      minHeight: isTablet ? 38 : 34,
      lineHeight: isTablet ? 20 : 18,
    },
    gridCatRow: {
      alignItems: 'center',
      minHeight: 20,
    },
    gridPriceBox: {
      marginTop: 4,
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.gray100,
      gap: 3,
    },
    gridPriceRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    gridPriceLabel: {
      fontSize: isTablet ? 11.5 : 10.5,
      fontWeight: '500',
    },
    gridSellPrice: {
      fontSize: isTablet ? 16 : 14,
      fontWeight: '800',
    },
    gridBuyPrice: {
      fontSize: isTablet ? 12 : 11,
      color: colors.gray400,
    },
  });
}
