import React, { useMemo } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import type { Product } from '@/types/sales';

interface Props {
  product: Product;
  inCartQty: number;
  onAdd: () => void;
}

export function ProductSearchResult({ product, inCartQty, onAdd }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet, isTabletLandscape), [colors, isTablet, isTabletLandscape]);
  const soldTint = useMemo(() => getStatusTint('error', colors, isDark), [colors, isDark]);
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
            <Ionicons name="cube-outline" size={28} color={colors.gray300} />
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

        {product.itemDescription ? (
          <Text style={[styles.itemDescription, { textAlign }]} numberOfLines={1}>{product.itemDescription}</Text>
        ) : null}

        <View style={[styles.meta, { flexDirection }]}>
          <AmountText value={product.sellingPrice} variant="small" style={[styles.price, { color: colors.primary }]} />
          <Text style={styles.dot}>·</Text>
          {isUniqueAndSold ? (
            <View style={[styles.soldBadge, { backgroundColor: soldTint.bg }]}>
              <Text style={[styles.soldText, { color: soldTint.text }]}>Sold</Text>
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
        style={[styles.addBtn, { backgroundColor: isDisabled ? colors.gray100 : colors.softBlue, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? RTL_SPACING.gap : 0 }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {inCartQty > 0 ? (
          <View style={[styles.inCartBadge, { flexDirection }]}>
            <Text style={[styles.inCartText, { color: colors.primary }]}>{inCartQty}</Text>
            <Ionicons name="add" size={14} color={colors.primary} />
          </View>
        ) : (
          <Ionicons name="add" size={20} color={isDisabled ? colors.gray300 : colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function getStyles(colors: AppColors, isTablet: boolean, isTabletLandscape: boolean) {
  return StyleSheet.create({
    row: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.white,
      borderRadius: isTablet ? 16 : Theme.radius.card,
      paddingHorizontal: isTabletLandscape ? 20 : (isTablet ? 18 : 16),
      paddingVertical: isTabletLandscape ? 18 : (isTablet ? 16 : 14),
      marginBottom: isTablet ? 10 : 6,
      ...Theme.shadow.soft,
    },
    rowDisabled: { opacity: 0.6 },
    thumb: {
      width: isTabletLandscape ? 88 : (isTablet ? 80 : 72),
      height: isTabletLandscape ? 88 : (isTablet ? 80 : 72),
      borderRadius: isTablet ? 14 : 12,
      marginRight: 12,
      flexShrink: 0,
      backgroundColor: colors.gray100,
    },
    thumbPlaceholder: {
      width: isTabletLandscape ? 88 : (isTablet ? 80 : 72),
      height: isTabletLandscape ? 88 : (isTablet ? 80 : 72),
      borderRadius: isTablet ? 14 : 12,
      marginRight: 12,
      flexShrink: 0,
      backgroundColor: colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    left: { flex: 1, paddingTop: 2 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
    name: { fontSize: isTabletLandscape ? 17.5 : (isTablet ? 16 : 14), fontWeight: '700', color: colors.black },
    nameDisabled: { color: colors.gray400 },
    itemDescription: { fontSize: isTabletLandscape ? 14 : (isTablet ? 13 : 12), color: colors.gray500, marginBottom: 4 },
    idBadge: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    idText: { fontSize: isTabletLandscape ? 12 : (isTablet ? 11 : 10), fontWeight: '600' },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    price: { fontSize: isTabletLandscape ? 17 : (isTablet ? 15 : 13), fontWeight: '800' },
    dot: { color: colors.gray300 },
    stock: { fontSize: isTabletLandscape ? 14 : (isTablet ? 13 : 12), color: colors.success, fontWeight: '600' },
    stockLow: { color: colors.warning },
    stockOut: { color: colors.error },
    soldBadge: {
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    soldText: { fontSize: isTablet ? 12 : 11, fontWeight: '600' },
    addBtn: {
      width: isTabletLandscape ? 48 : (isTablet ? 44 : 36),
      height: isTabletLandscape ? 48 : (isTablet ? 44 : 36),
      borderRadius: isTabletLandscape ? 24 : (isTablet ? 22 : 18),
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
      alignSelf: 'center',
    },
    inCartBadge: { flexDirection: 'row', alignItems: 'center' },
    inCartText: { fontSize: isTabletLandscape ? 16 : (isTablet ? 15 : 13), fontWeight: '700' },
  });
}
