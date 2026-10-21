import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { useTranslation } from 'react-i18next';
import { getInventoryProductById, getSalesByProductId, setProductStoreVisibility } from '@/lib/sqlite';
import { useInventoryStore } from '@/store/inventoryStore';
import { useOnlineStoreSubscriptionStore } from '@/store/onlineStoreSubscriptionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { Theme } from '@/constants/theme';
import { computeProductLowStock } from '@/lib/lowStock';
import type { InventoryProduct } from '@/types/inventory';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { getProductDisplayImage } from '@/lib/imageStorage';

export default function InventoryDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { removeProduct } = useInventoryStore();
  const hasActiveSubscription = useOnlineStoreSubscriptionStore((s) => s.isActive);
  const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore();
  const { colors, isDark } = useAppTheme();
  const { isTablet, contentContainerStyle } = useResponsive();
  const idAvailTint = getStatusTint('success', colors, isDark);
  const { chevronForward } = useDirectionalChevron();
  const { isRTL, textAlign, writingDirection, valueAlign, flexDirection, alignEnd } = useRTL();

  // Dynamic theme colors for cards and inner tiles
  const cardBg = isDark ? colors.gray100 : colors.white;
  const cardBorder = isDark ? colors.gray200 : '#E2E8F0';
  const subTileBg = isDark ? colors.gray50 : colors.gray50;
  const subTileBorder = isDark ? colors.gray200 : '#E2E8F0';
  const sectionTitleStyle = [styles.sectionTitle, { color: isDark ? colors.gray600 : colors.gray500, textAlign, writingDirection }];

  const [product, setProduct] = useState<InventoryProduct | null>(null);
  const [salesHistory, setSalesHistory] = useState<{
    id: number; saleId: number; invoiceNumber: string;
    quantity: number; sellingPrice: number; lineTotal: number; saleCreatedAt: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, sales] = await Promise.all([
        getInventoryProductById(Number(id)),
        getSalesByProductId(Number(id)),
      ]);
      setProduct(p);
      setSalesHistory(sales);
    } catch (err) {
      console.error('Failed to load product detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = useCallback(() => {
    if (!product) return;
    Alert.alert(
      t('inventory.deleteTitle'),
      t('inventory.deleteMsg', { name: product.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await removeProduct(product.id);
            router.back();
          },
        },
      ]
    );
  }, [product, removeProduct, router]);

  const handleToggleStoreVisible = useCallback(async (value: boolean) => {
    if (!product) return;
    await setProductStoreVisibility(product.id, value);
    await load();
  }, [product, load]);

  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('inventory.productDetails', 'وردەکاریی کاڵا')} showBack />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title="" showBack />
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('inventory.productNotFound')} showBack />
        <Text style={[styles.notFound, { color: colors.gray500 }]}>{t('inventory.productNotFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.backBtnText, { color: colors.white }]}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLowStock = computeProductLowStock(product, globalLowStockEnabled, globalLowStockThreshold);
  const isSold = !product.isActive || (product.idMode === 'unique' && product.quantity === 0);
  const totalValue = product.purchasePrice * product.quantity;
  const profitPerUnit = product.sellingPrice - product.purchasePrice;
  const profitMargin = product.purchasePrice > 0 ? ((profitPerUnit / product.purchasePrice) * 100).toFixed(1) : null;
  const isCustom = product.idMode === 'unique';
  const categoryLabel = t(`purchases.categories.${product.category}`, { defaultValue: product.category });

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {/* Clean Navigation Header — no cluttered badges inside header */}
      <AppHeader title={product.name} showBack />

      <ScrollView
        contentContainerStyle={[styles.scroll, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Hero & Badges Section (Brought down from navigation) */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220 }}
          style={[
            styles.heroCard,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
          ]}
        >
          {/* Top row with Product Info / Image */}
          <View style={[styles.heroHeaderRow, { flexDirection }]}>
            {(() => {
              const displayImg = getProductDisplayImage(product);
              return displayImg ? (
                <Image source={{ uri: displayImg }} style={[styles.heroImage, { borderColor: cardBorder }]} resizeMode="cover" />
              ) : (
                <View style={[styles.heroIconBox, { backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF9C3' }]}>
                  <Ionicons name="cube" size={26} color={colors.primary} />
                </View>
              );
            })()}
            <View style={[styles.heroTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.heroTitleText, { color: colors.black, textAlign, writingDirection }]} numberOfLines={2}>
                {product.name}
              </Text>
              {product.itemId ? (
                <View style={[styles.heroBarcodeRow, { flexDirection }]}>
                  <Ionicons name="barcode-outline" size={14} color={colors.gray400} />
                  <IdText style={[styles.heroBarcodeText, { color: colors.gray500 }]}>{product.itemId}</IdText>
                </View>
              ) : null}
            </View>
          </View>

          {/* Badges strip (Category, Stock Status, Payment, Online Store) */}
          <View style={[styles.heroBadgesRow, { flexDirection, borderTopColor: isDark ? colors.gray200 : colors.gray100 }]}>
            {/* Category Pill */}
            <View
              style={[
                styles.badgePill,
                {
                  flexDirection,
                  backgroundColor: isDark ? 'rgba(212,175,55,0.12)' : '#F1F5F9',
                  borderColor: isDark ? 'rgba(212,175,55,0.3)' : '#CBD5E1',
                },
              ]}
            >
              <Ionicons name="pricetag-outline" size={12} color={isDark ? colors.primary : '#475569'} />
              <Text
                style={[
                  styles.badgePillText,
                  { color: isDark ? colors.primary : '#334155' },
                ]}
                numberOfLines={1}
              >
                {categoryLabel}
              </Text>
            </View>

            {/* Stock Status Pill */}
            {isSold ? (
              <View
                style={[
                  styles.badgePill,
                  {
                    flexDirection,
                    backgroundColor: isDark ? 'rgba(100,116,139,0.2)' : '#F1F5F9',
                    borderColor: isDark ? 'rgba(100,116,139,0.4)' : '#CBD5E1',
                  },
                ]}
              >
                <Ionicons name="close-circle-outline" size={12} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text style={[styles.badgePillText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {t('inventory.soldBadge')}
                </Text>
              </View>
            ) : isLowStock ? (
              <View
                style={[
                  styles.badgePill,
                  {
                    flexDirection,
                    backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7',
                    borderColor: isDark ? 'rgba(245,158,11,0.4)' : '#FDE68A',
                  },
                ]}
              >
                <Ionicons name="warning-outline" size={12} color={isDark ? '#FBBF24' : '#B45309'} />
                <Text style={[styles.badgePillText, { color: isDark ? '#FBBF24' : '#B45309' }]}>
                  {t('inventory.lowStock')}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.badgePill,
                  {
                    flexDirection,
                    backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#ECFDF5',
                    borderColor: isDark ? 'rgba(16,185,129,0.4)' : '#A7F3D0',
                  },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={12} color={isDark ? '#34D399' : '#047857'} />
                <Text style={[styles.badgePillText, { color: isDark ? '#34D399' : '#047857' }]}>
                  {t('inventory.availableBadge')}
                </Text>
              </View>
            )}

            {/* Payment Status Pill */}
            <View
              style={[
                styles.badgePill,
                { flexDirection },
                product.paymentStatus === 'paid'
                  ? {
                      backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#ECFDF5',
                      borderColor: isDark ? 'rgba(16,185,129,0.4)' : '#A7F3D0',
                    }
                  : {
                      backgroundColor: isDark ? 'rgba(245,158,11,0.18)' : '#FFFBEB',
                      borderColor: isDark ? 'rgba(245,158,11,0.4)' : '#FDE68A',
                    },
              ]}
            >
              <Ionicons
                name={product.paymentStatus === 'paid' ? 'checkmark-done-circle-outline' : 'time-outline'}
                size={12}
                color={
                  product.paymentStatus === 'paid'
                    ? (isDark ? '#34D399' : '#047857')
                    : (isDark ? '#FBBF24' : '#B45309')
                }
              />
              <Text
                style={[
                  styles.badgePillText,
                  {
                    color:
                      product.paymentStatus === 'paid'
                        ? (isDark ? '#34D399' : '#047857')
                        : (isDark ? '#FBBF24' : '#B45309'),
                  },
                ]}
              >
                {product.paymentStatus === 'paid' ? t('common.paid') : t('common.debt')}
              </Text>
            </View>

            {/* Online Store Pill (if enabled) */}
            {product.storeVisible && (
              <View
                style={[
                  styles.badgePill,
                  {
                    flexDirection,
                    backgroundColor: isDark ? 'rgba(59,130,246,0.18)' : '#EFF6FF',
                    borderColor: isDark ? 'rgba(59,130,246,0.4)' : '#BFDBFE',
                  },
                ]}
              >
                <Ionicons name="globe-outline" size={12} color={isDark ? '#60A5FA' : '#1D4ED8'} />
                <Text style={[styles.badgePillText, { color: isDark ? '#60A5FA' : '#1D4ED8' }]}>
                  {t('inventory.onlineStoreVisible', 'فرۆشگای ئۆنلاین')}
                </Text>
              </View>
            )}
          </View>
        </MotiView>

        {/* Key Stats Card — Modern 2x2 KPI Grid + Full-Width Profit Margin Banner */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 40 }}
          style={[
            styles.statsCard,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
          ]}
        >
          {/* Card Section Header */}
          <View style={[styles.cardHeaderRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 }]}>
            <View style={[styles.cardHeaderIconBox, { backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF3C7' }]}>
              <Ionicons name="stats-chart" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.cardHeaderTitle, { color: isDark ? colors.gray600 : colors.gray700, textAlign }]}>
              {t('inventory.pricing', 'نرخ و کۆگا')}
            </Text>
          </View>

          {/* 2x2 Grid */}
          <View style={styles.tilesGrid}>
            {/* Row 1: Quantity & Buy Price */}
            <View style={[styles.tilesRow, { flexDirection, gap: 10 }]}>
              {/* Tile 1: Quantity */}
              <View
                style={[
                  styles.statTile,
                  {
                    backgroundColor: subTileBg,
                    borderColor: subTileBorder,
                  },
                ]}
              >
                <View style={[styles.tileHeader, { flexDirection, gap: 6 }]}>
                  <View
                    style={[
                      styles.tileIconCircle,
                      {
                        backgroundColor: isSold
                          ? (isDark ? 'rgba(100,116,139,0.2)' : '#F1F5F9')
                          : isLowStock
                          ? (isDark ? 'rgba(245,158,11,0.2)' : '#FEF3C7')
                          : (isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5'),
                      },
                    ]}
                  >
                    <Ionicons
                      name="cube-outline"
                      size={13}
                      color={isSold ? colors.gray400 : isLowStock ? colors.warning : colors.success}
                    />
                  </View>
                  <Text style={[styles.tileLabel, { color: colors.gray400, textAlign }]} numberOfLines={1}>
                    {t('inventory.quantity')}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.tileValue,
                    {
                      color: isSold ? colors.gray400 : colors.black,
                      textAlign,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {isSold ? t('inventory.soldBadge') : `${product.quantity} ${product.unit}`}
                </Text>
              </View>

              {/* Tile 2: Buy Price */}
              <View
                style={[
                  styles.statTile,
                  {
                    backgroundColor: subTileBg,
                    borderColor: subTileBorder,
                  },
                ]}
              >
                <View style={[styles.tileHeader, { flexDirection, gap: 6 }]}>
                  <View
                    style={[
                      styles.tileIconCircle,
                      { backgroundColor: isDark ? 'rgba(100,116,139,0.2)' : '#F1F5F9' },
                    ]}
                  >
                    <Ionicons name="cart-outline" size={13} color={isDark ? colors.gray400 : '#64748B'} />
                  </View>
                  <Text style={[styles.tileLabel, { color: colors.gray400, textAlign }]} numberOfLines={1}>
                    {t('inventory.buyPrice')}
                  </Text>
                </View>
                <AmountText
                  value={product.purchasePrice}
                  currency="IQD"
                  style={[styles.tileValue, { color: colors.black, textAlign }]}
                />
              </View>
            </View>

            {/* Row 2: Sell Price & Total Value */}
            <View style={[styles.tilesRow, { flexDirection, gap: 10, marginTop: 10 }]}>
              {/* Tile 3: Sell Price */}
              <View
                style={[
                  styles.statTile,
                  {
                    backgroundColor: subTileBg,
                    borderColor: subTileBorder,
                  },
                ]}
              >
                <View style={[styles.tileHeader, { flexDirection, gap: 6 }]}>
                  <View
                    style={[
                      styles.tileIconCircle,
                      { backgroundColor: isDark ? 'rgba(212,175,55,0.18)' : '#FEF9C3' },
                    ]}
                  >
                    <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
                  </View>
                  <Text style={[styles.tileLabel, { color: colors.gray400, textAlign }]} numberOfLines={1}>
                    {t('inventory.sellPrice')}
                  </Text>
                </View>
                <AmountText
                  value={product.sellingPrice}
                  currency="IQD"
                  style={[styles.tileValue, { color: colors.primary, textAlign }]}
                />
              </View>

              {/* Tile 4: Total Value */}
              <View
                style={[
                  styles.statTile,
                  {
                    backgroundColor: subTileBg,
                    borderColor: subTileBorder,
                  },
                ]}
              >
                <View style={[styles.tileHeader, { flexDirection, gap: 6 }]}>
                  <View
                    style={[
                      styles.tileIconCircle,
                      { backgroundColor: isDark ? 'rgba(100,116,139,0.2)' : '#F1F5F9' },
                    ]}
                  >
                    <Ionicons name="wallet-outline" size={13} color={isDark ? colors.gray400 : '#64748B'} />
                  </View>
                  <Text style={[styles.tileLabel, { color: colors.gray400, textAlign }]} numberOfLines={1}>
                    {t('inventory.totalValueLabel')}
                  </Text>
                </View>
                <AmountText
                  value={totalValue}
                  currency="IQD"
                  style={[styles.tileValue, { color: colors.black, textAlign }]}
                />
              </View>
            </View>
          </View>

          {/* Row 3: Profit per Unit & Margin Banner */}
          {profitPerUnit !== 0 && (
            <View
              style={[
                styles.profitBanner,
                {
                  flexDirection,
                  backgroundColor:
                    profitPerUnit > 0
                      ? (isDark ? 'rgba(16,185,129,0.14)' : '#ECFDF5')
                      : (isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2'),
                  borderColor:
                    profitPerUnit > 0
                      ? (isDark ? 'rgba(16,185,129,0.32)' : '#A7F3D0')
                      : (isDark ? 'rgba(239,68,68,0.32)' : '#FECACA'),
                },
              ]}
            >
              <View style={[styles.profitLeft, { flexDirection, gap: 10 }]}>
                <View
                  style={[
                    styles.profitIconCircle,
                    {
                      backgroundColor:
                        profitPerUnit > 0
                          ? (isDark ? 'rgba(16,185,129,0.25)' : '#D1FAE5')
                          : (isDark ? 'rgba(239,68,68,0.25)' : '#FEE2E2'),
                    },
                  ]}
                >
                  <Ionicons
                    name={profitPerUnit > 0 ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={profitPerUnit > 0 ? colors.success : colors.error}
                  />
                </View>
                <View>
                  <Text style={[styles.profitLabel, { color: isDark ? colors.gray400 : colors.gray600, textAlign }]}>
                    {t('inventory.profitPerUnit')}
                  </Text>
                  {profitMargin ? (
                    <Text
                      style={[
                        styles.profitMarginText,
                        { color: profitPerUnit > 0 ? colors.success : colors.error, textAlign },
                      ]}
                    >
                      {profitPerUnit > 0 ? `+${profitMargin}%` : `${profitMargin}%`} {t('reports.margin', 'قازانج')}
                    </Text>
                  ) : null}
                </View>
              </View>

              <AmountText
                value={profitPerUnit}
                currency="IQD"
                prefix={profitPerUnit > 0 ? '+' : ''}
                style={[
                  styles.profitAmount,
                  { color: profitPerUnit > 0 ? colors.success : colors.error, textAlign: valueAlign },
                ]}
              />
            </View>
          )}
        </MotiView>

        {/* Supplier & Purchase section */}
        {(product.supplierName || product.purchaseDate) && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 60 }}
            style={[
              styles.section,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                padding: isRTL ? RTL_SPACING.cardPad : 16,
              },
            ]}
          >
            <View style={[styles.sectionTitleRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 }]}>
              <View style={[styles.sectionTitleIconBox, { backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF3C7' }]}>
                <Ionicons name="business-outline" size={14} color={colors.primary} />
              </View>
              <Text style={sectionTitleStyle}>{t('inventory.supplierAndPurchase')}</Text>
            </View>

            {product.supplierName && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8, borderBottomColor: isDark ? colors.gray200 : colors.gray100 }]}>
                <Ionicons name="business-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray400, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.supplier')}</Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign, writingDirection }]}>{product.supplierName}</Text>
              </View>
            )}
            {product.supplierPhone && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8, borderBottomColor: isDark ? colors.gray200 : colors.gray100 }]}>
                <Ionicons name="call-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray400, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.phone')}</Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign: valueAlign }]}>{product.supplierPhone}</Text>
              </View>
            )}
            {product.supplierAddress && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8, borderBottomColor: isDark ? colors.gray200 : colors.gray100 }]}>
                <Ionicons name="location-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray400, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.address')}</Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign, writingDirection }]}>{product.supplierAddress}</Text>
              </View>
            )}
            {product.purchaseDate && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8, borderBottomColor: isDark ? colors.gray200 : colors.gray100 }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray400, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.date')}</Text>
                <DateText value={product.purchaseDate} style={[styles.infoValue, { color: colors.black, textAlign: valueAlign }]} />
              </View>
            )}
            {product.purchaseId && (
              <TouchableOpacity
                style={[
                  styles.linkRow,
                  {
                    backgroundColor: isDark ? 'rgba(212,175,55,0.08)' : '#FEF9C3',
                    borderColor: isDark ? 'rgba(212,175,55,0.25)' : '#FDE68A',
                    flexDirection,
                    gap: isRTL ? RTL_SPACING.gap : 8,
                  },
                ]}
                onPress={() => router.push(`/(app)/purchases/${product.purchaseId}` as never)}
                activeOpacity={0.75}
              >
                <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                <Text style={[styles.linkText, { color: colors.primary, textAlign, writingDirection }]}>{t('inventory.viewPurchaseInvoice')}</Text>
                <Ionicons name={chevronForward as never} size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </MotiView>
        )}

        {/* Expiry and Production Date Section */}
        {(product.productionDate || product.expiryDate) && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 90 }}
            style={[
              styles.section,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                padding: isRTL ? RTL_SPACING.cardPad : 16,
              },
            ]}
          >
            <View style={[styles.sectionHeaderRow, { flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
              <View style={[styles.sectionTitleRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8, marginBottom: 0 }]}>
                <View style={[styles.sectionTitleIconBox, { backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF3C7' }]}>
                  <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                </View>
                <Text style={sectionTitleStyle}>
                  {t('inventory.expiryDates', 'بەرواری بەسەرچوون و دەرچوون')}
                </Text>
              </View>
              {product.expiryDate && (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const exp = new Date(product.expiryDate);
                exp.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = diffDays < 0;
                const isExpiring = diffDays >= 0 && diffDays <= 30;

                return (
                  <View
                    style={[
                      styles.expiryBadge,
                      {
                        backgroundColor: isExpired
                          ? (isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2')
                          : isExpiring
                          ? (isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7')
                          : (isDark ? 'rgba(16,185,129,0.18)' : '#D1FAE5'),
                        borderColor: isExpired
                          ? (isDark ? 'rgba(239,68,68,0.35)' : '#FECACA')
                          : isExpiring
                          ? (isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A')
                          : (isDark ? 'rgba(16,185,129,0.35)' : '#A7F3D0'),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.expiryBadgeText,
                        {
                          color: isExpired ? '#EF4444' : isExpiring ? '#D97706' : '#10B981',
                        },
                      ]}
                    >
                      {isExpired
                        ? `بەسەرچووە (پێش ${Math.abs(diffDays)} ڕۆژ)`
                        : `${diffDays} ڕۆژ ماوە`}
                    </Text>
                  </View>
                );
              })()}
            </View>

            {product.productionDate && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8, borderBottomColor: isDark ? colors.gray200 : colors.gray100 }]}>
                <Ionicons name="construct-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray400, textAlign, writingDirection, width: isRTL ? 110 : 90 }]}>
                  {t('inventory.productionDate', 'بەرواری دەرچوون')}
                </Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign: valueAlign }]}>
                  {product.productionDate}
                </Text>
              </View>
            )}

            {product.expiryDate && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8, borderBottomColor: 'transparent' }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.gray400, textAlign, writingDirection, width: isRTL ? 110 : 90 }]}>
                  {t('inventory.expiryDate', 'بەرواری بەسەرچوون')}
                </Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign: valueAlign, fontWeight: '700' }]}>
                  {product.expiryDate}
                </Text>
              </View>
            )}
          </MotiView>
        )}

        {/* Item IDs section */}
        {product.itemId && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 120 }}
            style={[
              styles.section,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                padding: isRTL ? RTL_SPACING.cardPad : 16,
              },
            ]}
          >
            <View style={[styles.sectionTitleRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 }]}>
              <View style={[styles.sectionTitleIconBox, { backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF3C7' }]}>
                <Ionicons name="barcode-outline" size={14} color={colors.primary} />
              </View>
              <Text style={sectionTitleStyle}>{isCustom ? t('inventory.itemIdUnique') : t('inventory.itemIdShared')}</Text>
            </View>
            <View style={[styles.idChipWrap, { flexDirection }]}>
              <View
                style={[
                  styles.idChip,
                  {
                    backgroundColor: isDark ? colors.gray50 : colors.softBlue,
                    borderColor: isDark ? colors.gray200 : '#BFDBFE',
                  },
                ]}
              >
                <IdText style={[styles.idChipText, { color: isDark ? colors.black : colors.primaryDark, lineHeight: undefined }]}>
                  {product.itemId}
                </IdText>
              </View>
              {isCustom && (
                <View
                  style={[
                    styles.idChip,
                    isSold
                      ? { backgroundColor: isDark ? colors.gray200 : colors.gray100, borderColor: cardBorder }
                      : { backgroundColor: idAvailTint.bg, borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0' },
                  ]}
                >
                  <Text style={[styles.idChipText, { color: isDark ? colors.black : colors.primaryDark }]}>
                    {isSold ? t('inventory.soldBadge') : t('inventory.availableBadge')}
                  </Text>
                </View>
              )}
            </View>
          </MotiView>
        )}

        {/* Warranty / Description / Notes */}
        {(product.warranty || product.description || product.notes) && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 160 }}
            style={[
              styles.section,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                padding: isRTL ? RTL_SPACING.cardPad : 16,
              },
            ]}
          >
            <View style={[styles.sectionTitleRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 }]}>
              <View style={[styles.sectionTitleIconBox, { backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF3C7' }]}>
                <Ionicons name="document-text-outline" size={14} color={colors.primary} />
              </View>
              <Text style={sectionTitleStyle}>{t('inventory.details')}</Text>
            </View>
            {product.warranty && (
              <View style={[styles.infoRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8, borderBottomColor: isDark ? colors.gray200 : colors.gray100 }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.gray400} />
                <Text style={[styles.infoLabel, { color: colors.gray400, textAlign, writingDirection, width: isRTL ? 88 : 70 }]}>{t('inventory.warranty')}</Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign, writingDirection }]}>{product.warranty}</Text>
              </View>
            )}
            {product.description && (
              <View style={styles.noteRow}>
                <Text style={[styles.noteLabel, { color: colors.gray400, textAlign, writingDirection }]}>{t('inventory.description')}</Text>
                <Text style={[styles.noteText, { color: colors.black, textAlign, writingDirection }]}>{product.description}</Text>
              </View>
            )}
            {product.notes && (
              <View style={styles.noteRow}>
                <Text style={[styles.noteLabel, { color: colors.gray400, textAlign, writingDirection }]}>{t('inventory.notes')}</Text>
                <Text style={[styles.noteText, { color: colors.black, textAlign, writingDirection }]}>{product.notes}</Text>
              </View>
            )}
          </MotiView>
        )}

        {/* Sales history */}
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 200 }}
          style={[
            styles.section,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              padding: isRTL ? RTL_SPACING.cardPad : 16,
            },
          ]}
        >
          <View style={[styles.sectionTitleRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 }]}>
            <View style={[styles.sectionTitleIconBox, { backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF3C7' }]}>
              <Ionicons name="receipt-outline" size={14} color={colors.primary} />
            </View>
            <Text style={sectionTitleStyle}>
              {t('inventory.salesHistory')} ({salesHistory.length})
            </Text>
          </View>

          {salesHistory.length === 0 ? (
            <Text style={[styles.noSales, { color: colors.gray400, textAlign, writingDirection }]}>{t('inventory.noSales')}</Text>
          ) : (
            salesHistory.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.saleRow, { borderTopColor: isDark ? colors.gray200 : colors.gray100, flexDirection }]}
                onPress={() => router.push(`/(app)/sales/${s.saleId}` as never)}
                activeOpacity={0.75}
              >
                <View>
                  <IdText style={[styles.saleInvoice, { color: colors.black, textAlign }]}>{s.invoiceNumber}</IdText>
                  <DateText value={s.saleCreatedAt} size="small" style={[styles.saleDate, { color: colors.gray400, textAlign }]} />
                </View>
                <View style={[styles.saleRight, { alignItems: alignEnd }]}>
                  <Text style={[styles.saleQty, { color: colors.gray400 }]}>× {s.quantity}</Text>
                  <AmountText value={s.lineTotal} currency="IQD" style={[styles.saleTotal, { color: colors.primary }]} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </MotiView>

        {/* Online Store Visible Row */}
        <View
          style={[
            styles.storeVisRow,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              flexDirection,
              gap: isRTL ? RTL_SPACING.gap : 12,
              padding: isRTL ? RTL_SPACING.cardPad : 16,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.storeVisLabel, { color: colors.black, textAlign, writingDirection }]}>{t('inventory.onlineStoreVisible')}</Text>
            <Text style={[styles.storeVisSub, { color: colors.gray400, textAlign, writingDirection }]}>
              {hasActiveSubscription
                ? t('inventory.onlineStoreVisibleSub')
                : t('dashboard.onlineStore.subscriptionRequired')}
            </Text>
          </View>
          <Switch
            value={product.storeVisible}
            onValueChange={handleToggleStoreVisible}
            disabled={!hasActiveSubscription}
            trackColor={{ false: colors.gray200, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {/* Action Buttons */}
        <View style={[styles.actions, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 12 }]}>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.primary, flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 }]}
            onPress={() => router.push(`/(app)/inventory/edit/${product.id}` as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={[styles.editBtnText, { color: '#FFFFFF' }]}>{t('inventory.editProduct')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.deleteBtn,
              {
                backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
                borderColor: colors.error,
                flexDirection,
                gap: isRTL ? RTL_SPACING.gapSm : 6,
              },
            ]}
            onPress={confirmDelete}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.deleteBtnText, { color: colors.error }]}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:  { fontSize: 15, marginBottom: 16 },
  backBtn:   { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Theme.radius.md },
  backBtnText: { fontWeight: '600', fontSize: 14 },

  scroll: { padding: 16, paddingBottom: 40 },

  // Hero section styles
  heroCard: {
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    ...Theme.shadow.card,
  },
  heroHeaderRow: {
    alignItems: 'center',
    gap: 14,
  },
  heroImage: {
    width: 58,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitleWrap: {
    flex: 1,
  },
  heroTitleText: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  heroBarcodeRow: {
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  heroBarcodeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroBadgesRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  badgePill: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Stats Card & 2x2 Grid
  statsCard: {
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    ...Theme.shadow.card,
  },
  cardHeaderRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tilesGrid: {
    width: '100%',
  },
  tilesRow: {
    width: '100%',
  },
  statTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  tileHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  tileIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  tileValue: {
    fontSize: 16.5,
    fontWeight: '800',
  },

  profitBanner: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profitLeft: {
    alignItems: 'center',
  },
  profitIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profitLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  profitMarginText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  profitAmount: {
    fontSize: 17,
    fontWeight: '800',
  },

  // Sections
  section: {
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    marginBottom: 14,
    ...Theme.shadow.soft,
  },
  sectionTitleRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  expiryBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  infoRow: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
  },
  linkRow: {
    alignItems: 'center',
    padding: 12,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
  },
  noteRow: {
    marginBottom: 12,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
  },
  idChipWrap: {
    flexWrap: 'wrap',
    gap: 8,
  },
  idChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  idChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  noSales: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  saleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  saleInvoice: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  saleDate: {
    fontSize: 12,
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleQty: {
    fontSize: 12,
  },
  saleTotal: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  storeVisRow: {
    alignItems: 'center',
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    marginBottom: 14,
    ...Theme.shadow.card,
  },
  storeVisLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  storeVisSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    marginTop: 4,
  },
  editBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.md,
    paddingVertical: 14,
    ...Theme.shadow.button,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
