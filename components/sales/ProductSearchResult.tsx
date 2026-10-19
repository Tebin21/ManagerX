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
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import type { Product } from '@/types/sales';

interface Props {
  product: Product;
  inCartQty: number;
  onAdd: () => void;
  onDecrease?: () => void;
  layout?: 'list' | 'grid';
}

export function ProductSearchResult({ product, inCartQty, onAdd, onDecrease, layout = 'list' }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const styles = useMemo(() => getStyles(colors, isTablet, isTabletLandscape, isDark), [colors, isTablet, isTabletLandscape, isDark]);
  const soldTint = useMemo(() => getStatusTint('error', colors, isDark), [colors, isDark]);
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isUniqueAndSold = product.idMode === 'unique' && (!product.isActive || product.quantity === 0);
  const atMaxStock = product.idMode === 'repeatable' && inCartQty >= product.quantity;
  const isDisabled = isUniqueAndSold || atMaxStock;

  // ─── Square Grid Card Layout (چوار گۆشە) ──────────────────────────────────
  if (layout === 'grid') {
    return (
      <View
        style={[
          styles.gridCard,
          isDisabled && styles.rowDisabled,
        ]}
      >
        {/* Top Area (Media + Content) - tapping anywhere adds */}
        <TouchableOpacity
          onPress={onAdd}
          disabled={isDisabled}
          activeOpacity={0.82}
          style={styles.gridTopArea}
        >
          {/* Top Media / Thumbnail Container */}
          <View style={styles.gridThumbContainer}>
            {product.imageUri ? (
              <Image
                source={{ uri: product.imageUri }}
                style={styles.gridThumb}
                resizeMode="cover"
                fadeDuration={0}
              />
            ) : (
              <View style={styles.gridThumbPlaceholder}>
                <Ionicons
                  name="cube-outline"
                  size={isTablet ? 38 : 30}
                  color={isDark ? colors.gray300 : colors.gray400}
                />
              </View>
            )}

            {/* In-Cart Badge (Top Left / Right based on RTL) */}
            {inCartQty > 0 && (
              <View
                style={[
                  styles.gridInCartBadge,
                  {
                    backgroundColor: colors.primary,
                    left: isRTL ? undefined : 8,
                    right: isRTL ? 8 : undefined,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="cart" size={isTablet ? 13 : 11} color="#FFFFFF" />
                <Text style={styles.gridInCartBadgeText}>
                  {inCartQty}
                </Text>
              </View>
            )}

            {/* Stock / Sold Badge (Opposite Top Corner) */}
            <View
              style={[
                styles.gridStockBadge,
                {
                  right: isRTL ? undefined : 8,
                  left: isRTL ? 8 : undefined,
                },
                isUniqueAndSold
                  ? { backgroundColor: soldTint.bg }
                  : product.quantity === 0
                  ? { backgroundColor: colors.error + '25' }
                  : product.quantity <= 5
                  ? { backgroundColor: colors.warning + '25' }
                  : { backgroundColor: colors.success + '22' },
              ]}
            >
              <Text
                style={[
                  styles.gridStockText,
                  isUniqueAndSold
                    ? { color: soldTint.text }
                    : product.quantity === 0
                    ? { color: colors.error }
                    : product.quantity <= 5
                    ? { color: colors.warning }
                    : { color: colors.success },
                ]}
                numberOfLines={1}
              >
                {isUniqueAndSold
                  ? 'Sold'
                  : `${product.quantity} ${product.unit}`}
              </Text>
            </View>
          </View>

          {/* Info Content */}
          <View style={styles.gridContent}>
            {/* Product Name */}
            <Text
              style={[
                styles.gridName,
                isDisabled && styles.nameDisabled,
                { textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {product.name}
            </Text>

            {/* Item Code & Description */}
            <View style={[styles.gridMetaRow, { flexDirection }]}>
              {product.itemId ? (
                <View style={[styles.idBadge, { backgroundColor: colors.softBlue }]}>
                  <IdText size="small" style={[styles.idText, { color: colors.primary }]}>
                    #{product.itemId}
                  </IdText>
                </View>
              ) : null}

              {product.itemDescription ? (
                <Text
                  style={[styles.gridItemDesc, { textAlign, color: colors.gray400 }]}
                  numberOfLines={1}
                >
                  {product.itemDescription}
                </Text>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        {/* Price & Quick Stepper Row */}
        <View style={styles.gridBottomContainer}>
          <View style={[styles.gridBottomRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <AmountText
                value={product.sellingPrice}
                variant="small"
                style={[styles.gridPrice, { color: colors.primary }]}
              />
            </View>

            {inCartQty > 0 ? (
              <View style={[styles.gridStepper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Decrement (-) Button */}
                <TouchableOpacity
                  onPress={onDecrease}
                  activeOpacity={0.7}
                  style={[
                    styles.gridStepperBtn,
                    styles.gridMinusBtn,
                    {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="remove"
                    size={isTablet ? 17 : 14}
                    color={isDark ? '#F87171' : '#DC2626'}
                  />
                </TouchableOpacity>

                {/* In-Cart Qty Pill */}
                <View style={[styles.gridQtyPill, { backgroundColor: colors.softBlue }]}>
                  <Text style={[styles.gridQtyText, { color: colors.primary }]}>
                    {inCartQty}
                  </Text>
                </View>

                {/* Increment (+) Button (if not unique) */}
                {product.idMode !== 'unique' ? (
                  <TouchableOpacity
                    onPress={onAdd}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                    style={[
                      styles.gridStepperBtn,
                      {
                        backgroundColor: isDisabled ? colors.gray100 : colors.primary,
                      },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="add"
                      size={isTablet ? 17 : 14}
                      color={isDisabled ? colors.gray300 : '#FFFFFF'}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <TouchableOpacity
                onPress={onAdd}
                disabled={isDisabled}
                activeOpacity={0.75}
                style={[
                  styles.gridAddBtn,
                  {
                    backgroundColor: isDisabled ? colors.gray100 : colors.softBlue,
                  },
                ]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name="add"
                  size={isTablet ? 19 : 16}
                  color={isDisabled ? colors.gray300 : colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ─── Standard List Row Layout ───────────────────────────────────────────────
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
          <Text
            style={[
              styles.name,
              isDisabled && styles.nameDisabled,
              { textAlign },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
            ]}
            numberOfLines={1}
          >
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

      {inCartQty > 0 ? (
        <View
          style={[
            styles.listStepper,
            {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              marginLeft: isRTL ? 0 : 8,
              marginRight: isRTL ? RTL_SPACING.gap : 0,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onDecrease}
            activeOpacity={0.75}
            style={[
              styles.listStepperBtn,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA',
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="remove" size={14} color={isDark ? '#F87171' : '#DC2626'} />
          </TouchableOpacity>

          <View style={[styles.listQtyPill, { backgroundColor: colors.softBlue }]}>
            <Text style={[styles.inCartText, { color: colors.primary }]}>{inCartQty}</Text>
          </View>

          {product.idMode !== 'unique' ? (
            <TouchableOpacity
              onPress={onAdd}
              disabled={isDisabled}
              activeOpacity={0.75}
              style={[
                styles.listStepperBtn,
                {
                  backgroundColor: isDisabled ? colors.gray100 : colors.primary,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={14} color={isDisabled ? colors.gray300 : '#FFFFFF'} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <TouchableOpacity
          onPress={onAdd}
          disabled={isDisabled}
          activeOpacity={0.75}
          style={[
            styles.addBtn,
            {
              backgroundColor: isDisabled ? colors.gray100 : colors.softBlue,
              marginLeft: isRTL ? 0 : 8,
              marginRight: isRTL ? RTL_SPACING.gap : 0,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={20} color={isDisabled ? colors.gray300 : colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function getStyles(colors: AppColors, isTablet: boolean, isTabletLandscape: boolean, isDark: boolean) {
  return StyleSheet.create({
    // ─── List Row Styles ───
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

    // ─── Square Grid Card Styles (چوار گۆشە) ───
    gridCard: {
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: isTablet ? 18 : 14,
      borderWidth: 1,
      borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
      overflow: 'hidden',
      marginBottom: isTablet ? 12 : 8,
      ...Theme.shadow.soft,
    },
    gridThumbContainer: {
      width: '100%',
      height: isTabletLandscape ? 160 : isTablet ? 140 : 115,
      backgroundColor: isDark ? colors.gray200 : colors.gray100,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
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
    gridInCartBadge: {
      position: 'absolute',
      top: 8,
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
    gridInCartBadgeText: {
      color: '#FFFFFF',
      fontSize: isTablet ? 12 : 10.5,
      fontWeight: '800',
    },
    gridStockBadge: {
      position: 'absolute',
      top: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 10,
    },
    gridStockText: {
      fontSize: isTablet ? 12 : 10.5,
      fontWeight: '700',
    },
    gridTopArea: {
      flex: 1,
    },
    gridContent: {
      paddingHorizontal: isTablet ? 12 : 10,
      paddingTop: isTablet ? 10 : 8,
      paddingBottom: 4,
      gap: 4,
    },
    gridName: {
      fontSize: isTabletLandscape ? 16.5 : isTablet ? 15 : 13.5,
      fontWeight: '700',
      color: colors.black,
    },
    gridMetaRow: {
      alignItems: 'center',
      gap: 6,
      minHeight: 20,
    },
    gridItemDesc: {
      fontSize: isTablet ? 12 : 11,
      flex: 1,
    },
    gridBottomContainer: {
      paddingHorizontal: isTablet ? 12 : 10,
      paddingBottom: isTablet ? 12 : 10,
      paddingTop: 2,
    },
    gridBottomRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    gridPrice: {
      fontSize: isTabletLandscape ? 17 : isTablet ? 15.5 : 13.5,
      fontWeight: '800',
    },
    gridAddBtn: {
      width: isTablet ? 34 : 28,
      height: isTablet ? 34 : 28,
      borderRadius: isTablet ? 10 : 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridStepper: {
      alignItems: 'center',
      gap: 5,
    },
    gridStepperBtn: {
      width: isTablet ? 32 : 28,
      height: isTablet ? 32 : 28,
      borderRadius: isTablet ? 9 : 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridMinusBtn: {
      borderWidth: 1,
    },
    gridQtyPill: {
      minWidth: isTablet ? 24 : 20,
      paddingHorizontal: 4,
      height: isTablet ? 26 : 22,
      borderRadius: isTablet ? 8 : 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridQtyText: {
      fontSize: isTablet ? 13.5 : 12,
      fontWeight: '800',
    },
    listStepper: {
      alignItems: 'center',
      gap: 6,
      alignSelf: 'center',
    },
    listStepperBtn: {
      width: isTablet ? 32 : 28,
      height: isTablet ? 32 : 28,
      borderRadius: isTablet ? 9 : 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    listQtyPill: {
      minWidth: isTablet ? 28 : 24,
      paddingHorizontal: 6,
      height: isTablet ? 28 : 24,
      borderRadius: isTablet ? 8 : 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
