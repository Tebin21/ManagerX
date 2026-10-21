import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import type { InventoryProduct } from '@/types/inventory';

type ExpiryFilterType = 'all' | 'expired' | 'expiringSoon' | 'safe' | 'noDate';
type SortOption = 'closestExpiry' | 'farthestExpiry' | 'quantity' | 'name';

interface Props {
  products: InventoryProduct[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

interface ProductWithExpiryStatus {
  product: InventoryProduct;
  diffDays: number | null; // null if no expiry date, <0 if expired, >=0 if days remaining
  status: 'expired' | 'expiringSoon' | 'safe' | 'noDate';
}

const PRESET_ALERT_DAYS = [7, 15, 30, 60, 90];

export function InventoryExpiryView({ products, onRefresh, refreshing = false }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKu = useLanguageStore((s) => s.language !== 'en');
  const { isTablet, isTabletLandscape } = useResponsive();

  const expiryAlertDays = useSettingsStore((s) => s.expiryAlertDays);
  const setExpiryAlertDays = useSettingsStore((s) => s.setExpiryAlertDays);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ExpiryFilterType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('closestExpiry');

  // Compute status & days remaining for each product
  const enrichedProducts: ProductWithExpiryStatus[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return products.map((p) => {
      if (!p.expiryDate) {
        return { product: p, diffDays: null, status: 'noDate' };
      }

      // Parse YYYY-MM-DD
      const parts = p.expiryDate.split('-');
      let exp: Date;
      if (parts.length === 3) {
        exp = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        exp = new Date(p.expiryDate);
      }
      exp.setHours(0, 0, 0, 0);

      const diffMs = exp.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let status: 'expired' | 'expiringSoon' | 'safe';
      if (diffDays < 0) {
        status = 'expired';
      } else if (diffDays <= expiryAlertDays) {
        status = 'expiringSoon';
      } else {
        status = 'safe';
      }

      return { product: p, diffDays, status };
    });
  }, [products, expiryAlertDays]);

  // Overall KPIs
  const kpis = useMemo(() => {
    let totalTracked = 0;
    let expired = 0;
    let expiringSoon = 0;
    let safe = 0;
    let noDate = 0;

    for (const item of enrichedProducts) {
      if (item.status === 'noDate') {
        noDate++;
      } else {
        totalTracked++;
        if (item.status === 'expired') expired++;
        else if (item.status === 'expiringSoon') expiringSoon++;
        else safe++;
      }
    }

    return { totalTracked, expired, expiringSoon, safe, noDate, totalItems: enrichedProducts.length };
  }, [enrichedProducts]);

  // Filter & Search
  const filteredProducts = useMemo(() => {
    let list = enrichedProducts;

    // Filter by status tab
    if (activeFilter === 'expired') {
      list = list.filter((item) => item.status === 'expired');
    } else if (activeFilter === 'expiringSoon') {
      list = list.filter((item) => item.status === 'expiringSoon');
    } else if (activeFilter === 'safe') {
      list = list.filter((item) => item.status === 'safe');
    } else if (activeFilter === 'noDate') {
      list = list.filter((item) => item.status === 'noDate');
    }

    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const p = item.product;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.itemId && p.itemId.toLowerCase().includes(q))
        );
      });
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'closestExpiry') {
        // nulls last
        if (a.diffDays === null && b.diffDays === null) return 0;
        if (a.diffDays === null) return 1;
        if (b.diffDays === null) return -1;
        return a.diffDays - b.diffDays;
      }
      if (sortBy === 'farthestExpiry') {
        if (a.diffDays === null && b.diffDays === null) return 0;
        if (a.diffDays === null) return 1;
        if (b.diffDays === null) return -1;
        return b.diffDays - a.diffDays;
      }
      if (sortBy === 'quantity') {
        return b.product.quantity - a.product.quantity;
      }
      if (sortBy === 'name') {
        return a.product.name.localeCompare(b.product.name);
      }
      return 0;
    });
  }, [enrichedProducts, activeFilter, searchQuery, sortBy]);

  const handleSelectFilter = (filter: ExpiryFilterType) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    setActiveFilter(filter);
  };

  const renderBadge = (item: ProductWithExpiryStatus) => {
    if (item.status === 'noDate' || item.diffDays === null) {
      return (
        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(100, 116, 139, 0.20)' : '#F1F5F9' }]}>
          <Text style={[styles.badgeText, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
            {isKu ? 'بێ بەروار' : 'No Date'}
          </Text>
        </View>
      );
    }

    if (item.diffDays < 0) {
      const daysAgo = Math.abs(item.diffDays);
      return (
        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.22)' : '#FEE2E2' }]}>
          <Ionicons name="alert-circle" size={13} color="#EF4444" />
          <Text style={[styles.badgeText, { color: '#EF4444' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
            {isKu ? `بەسەرچووە (پێش ${daysAgo} ڕۆژ)` : `Expired (${daysAgo}d ago)`}
          </Text>
        </View>
      );
    }

    if (item.diffDays === 0) {
      return (
        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.22)' : '#FEE2E2' }]}>
          <Ionicons name="time" size={13} color="#EF4444" />
          <Text style={[styles.badgeText, { color: '#EF4444' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
            {isKu ? 'ئەمڕۆ بەسەر دەچێت!' : 'Expires Today!'}
          </Text>
        </View>
      );
    }

    if (item.status === 'expiringSoon') {
      return (
        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.22)' : '#FEF3C7' }]}>
          <Ionicons name="warning" size={13} color="#D97706" />
          <Text style={[styles.badgeText, { color: '#D97706' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
            {isKu ? `${item.diffDays} ڕۆژ ماوە` : `${item.diffDays} days left`}
          </Text>
        </View>
      );
    }

    // Safe
    return (
      <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5' }]}>
        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
        <Text style={[styles.badgeText, { color: '#10B981' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
          {isKu ? `${item.diffDays} ڕۆژ ماوە` : `${item.diffDays} days left`}
        </Text>
      </View>
    );
  };

  const renderProductItem = ({ item }: { item: ProductWithExpiryStatus }) => {
    const p = item.product;

    return (
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => router.push(`/(app)/inventory/${p.id}` as never)}
        style={[
          styles.itemCard,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.75)' : '#FFFFFF',
            borderColor:
              item.status === 'expired'
                ? isDark ? 'rgba(239, 68, 68, 0.40)' : '#FCA5A5'
                : item.status === 'expiringSoon'
                ? isDark ? 'rgba(245, 158, 11, 0.40)' : '#FCD34D'
                : isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
          },
        ]}
      >
        <View style={[styles.cardHeaderRow, { flexDirection }]}>
          {/* Product Image / Icon */}
          {p.imageUri ? (
            <Image source={{ uri: p.imageUri }} style={styles.productThumb} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.productThumbFallback,
                { backgroundColor: hexToRgba(colors.primary, isDark ? 0.2 : 0.12) },
              ]}
            >
              <Ionicons name="cube-outline" size={24} color={colors.primary} />
            </View>
          )}

          {/* Product Details */}
          <View style={[styles.cardInfoCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.cardNameRow, { flexDirection }]}>
              <Text
                style={[
                  styles.productName,
                  { color: colors.black, textAlign },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
            </View>

            <View style={[styles.categoryQtyRow, { flexDirection }]}>
              {p.category ? (
                <View style={[styles.catBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.gray100 }]}>
                  <Text style={[styles.catText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {p.category}
                  </Text>
                </View>
              ) : null}

              <Text style={[styles.qtyText, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {isKu ? `کۆگا: ${p.quantity} دانە` : `Stock: ${p.quantity} pcs`}
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={styles.badgeCol}>{renderBadge(item)}</View>
        </View>

        {/* Date Row Footer */}
        <View
          style={[
            styles.datesFooter,
            {
              flexDirection,
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.50)' : colors.gray50,
              borderTopColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.gray100,
            },
          ]}
        >
          {/* Production Date */}
          <View style={[styles.dateCell, { flexDirection }]}>
            <Ionicons name="construct-outline" size={14} color={colors.gray400} />
            <Text style={[styles.dateCellLabel, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
              {isKu ? 'دەرچوون:' : 'Prod:'}
            </Text>
            <Text style={[styles.dateCellValue, { color: colors.black }]}>
              {p.productionDate || (isKu ? 'دیاری نەکراوە' : 'N/A')}
            </Text>
          </View>

          <View style={[styles.dateDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.gray200 }]} />

          {/* Expiry Date */}
          <View style={[styles.dateCell, { flexDirection }]}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={item.status === 'expired' ? '#EF4444' : item.status === 'expiringSoon' ? '#F59E0B' : colors.primary}
            />
            <Text style={[styles.dateCellLabel, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
              {isKu ? 'بەسەرچوون:' : 'Exp:'}
            </Text>
            <Text
              style={[
                styles.dateCellValue,
                {
                  color:
                    item.status === 'expired'
                      ? '#EF4444'
                      : item.status === 'expiringSoon'
                      ? '#D97706'
                      : colors.black,
                  fontWeight: '700',
                },
              ]}
            >
              {p.expiryDate || (isKu ? 'دیاری نەکراوە' : 'N/A')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header Controls & KPI Rollup ──────────────── */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.product.id)}
        renderItem={renderProductItem}
        contentContainerStyle={[styles.listContent, isTablet && { maxWidth: 960, alignSelf: 'center', width: '100%' }]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* KPI Cards Row */}
            <View style={[styles.kpiGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* All Items */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectFilter('all')}
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: activeFilter === 'all' ? hexToRgba(colors.primary, isDark ? 0.25 : 0.15) : isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                    borderColor: activeFilter === 'all' ? colors.primary : isDark ? 'rgba(255,255,255,0.08)' : colors.gray200,
                  },
                ]}
              >
                <Text style={[styles.kpiNum, { color: colors.primary }]}>{kpis.totalTracked}</Text>
                <Text style={[styles.kpiLabel, { color: colors.black }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                  {isKu ? 'خاوەن بەروار' : 'Tracked'}
                </Text>
              </TouchableOpacity>

              {/* Expired */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectFilter('expired')}
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: activeFilter === 'expired' ? (isDark ? 'rgba(239, 68, 68, 0.28)' : '#FEE2E2') : isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                    borderColor: activeFilter === 'expired' ? '#EF4444' : isDark ? 'rgba(255,255,255,0.08)' : colors.gray200,
                  },
                ]}
              >
                <Text style={[styles.kpiNum, { color: '#EF4444' }]}>{kpis.expired}</Text>
                <Text style={[styles.kpiLabel, { color: '#EF4444' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                  {isKu ? 'بەسەرچووە' : 'Expired'}
                </Text>
              </TouchableOpacity>

              {/* Expiring Soon */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectFilter('expiringSoon')}
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: activeFilter === 'expiringSoon' ? (isDark ? 'rgba(245, 158, 11, 0.28)' : '#FEF3C7') : isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                    borderColor: activeFilter === 'expiringSoon' ? '#F59E0B' : isDark ? 'rgba(255,255,255,0.08)' : colors.gray200,
                  },
                ]}
              >
                <Text style={[styles.kpiNum, { color: '#F59E0B' }]}>{kpis.expiringSoon}</Text>
                <Text style={[styles.kpiLabel, { color: '#D97706' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                  {isKu ? 'بەم نزیکانە' : 'Soon'}
                </Text>
              </TouchableOpacity>

              {/* Safe */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSelectFilter('safe')}
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: activeFilter === 'safe' ? (isDark ? 'rgba(16, 185, 129, 0.28)' : '#D1FAE5') : isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                    borderColor: activeFilter === 'safe' ? '#10B981' : isDark ? 'rgba(255,255,255,0.08)' : colors.gray200,
                  },
                ]}
              >
                <Text style={[styles.kpiNum, { color: '#10B981' }]}>{kpis.safe}</Text>
                <Text style={[styles.kpiLabel, { color: '#10B981' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                  {isKu ? 'سەلامەت' : 'Safe'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Alert Days Threshold Quick Selector Bar */}
            <View
              style={[
                styles.thresholdBar,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                },
              ]}
            >
              <View style={[styles.thresholdLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                <Text
                  style={[
                    styles.thresholdLabelText,
                    { color: colors.black },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'ماوەی هۆشداری:' : 'Alert Window:'}
                </Text>
              </View>

              <View style={[styles.thresholdChipsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {PRESET_ALERT_DAYS.map((days) => {
                  const isSelected = expiryAlertDays === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      activeOpacity={0.8}
                      onPress={() => {
                        try {
                          Haptics.selectionAsync().catch(() => {});
                        } catch {}
                        setExpiryAlertDays(days);
                      }}
                      style={[
                        styles.thresholdChip,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isDark
                            ? 'rgba(15, 23, 42, 0.60)'
                            : colors.gray100,
                          borderColor: isSelected
                            ? colors.primary
                            : isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : colors.gray200,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.thresholdChipText,
                          { color: isSelected ? '#0F172A' : colors.black },
                          isKu && { fontFamily: isSelected ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                        ]}
                      >
                        {isKu ? `${days} ڕۆژ` : `${days}d`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Smart Notice Banner if items expired or expiring soon */}
            {(kpis.expired > 0 || kpis.expiringSoon > 0) && (
              <View
                style={[
                  styles.noticeBanner,
                  {
                    flexDirection,
                    backgroundColor: kpis.expired > 0 ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2') : isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
                    borderColor: kpis.expired > 0 ? (isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA') : isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
                  },
                ]}
              >
                <Ionicons
                  name={kpis.expired > 0 ? 'alert-circle' : 'warning'}
                  size={22}
                  color={kpis.expired > 0 ? '#EF4444' : '#F59E0B'}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.noticeText,
                      { color: kpis.expired > 0 ? '#DC2626' : '#B45309', textAlign },
                      isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKu
                      ? `${kpis.expired > 0 ? `${kpis.expired} کاڵا بەسەرچووە! ` : ''}${kpis.expiringSoon > 0 ? `${kpis.expiringSoon} کاڵا لە ماوەی ${expiryAlertDays} ڕۆژدا بەسەر دەچێت.` : ''}`
                      : `${kpis.expired > 0 ? `${kpis.expired} items expired! ` : ''}${kpis.expiringSoon > 0 ? `${kpis.expiringSoon} items expiring within ${expiryAlertDays} days.` : ''}`}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push('/(app)/settings/expiry' as never)}
                  style={[styles.settingsLinkBtn, { borderColor: kpis.expired > 0 ? '#EF4444' : '#F59E0B' }]}
                >
                  <Ionicons name="options-outline" size={14} color={kpis.expired > 0 ? '#EF4444' : '#F59E0B'} />
                  <Text style={[styles.settingsLinkText, { color: kpis.expired > 0 ? '#EF4444' : '#F59E0B' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {isKu ? 'ڕێکخستن' : 'Settings'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Search Bar & Sort Toggle */}
            <View style={[styles.searchRow, { flexDirection }]}>
              <View
                style={[
                  styles.searchInputBox,
                  {
                    flexDirection,
                    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                  },
                ]}
              >
                <Ionicons name="search" size={18} color={colors.gray400} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={isKu ? 'گەڕان بەدوای کاڵاکاندا...' : 'Search items...'}
                  placeholderTextColor={colors.gray400}
                  style={[
                    styles.searchInput,
                    { color: colors.black, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={colors.gray400} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Tabs Chips */}
            <View style={[styles.filterChipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => handleSelectFilter('all')}
                style={[
                  styles.filterChip,
                  activeFilter === 'all'
                    ? [styles.filterChipActive, { backgroundColor: colors.primary }]
                    : { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.60)' : colors.gray100, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray200 },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: activeFilter === 'all' ? '#0F172A' : colors.black },
                    isKu && { fontFamily: activeFilter === 'all' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu ? `هەمووی (${kpis.totalItems})` : `All (${kpis.totalItems})`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectFilter('expired')}
                style={[
                  styles.filterChip,
                  activeFilter === 'expired'
                    ? [styles.filterChipActive, { backgroundColor: '#EF4444' }]
                    : { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.60)' : colors.gray100, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray200 },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: activeFilter === 'expired' ? '#FFFFFF' : colors.black },
                    isKu && { fontFamily: activeFilter === 'expired' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu ? `بەسەرچوو (${kpis.expired})` : `Expired (${kpis.expired})`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectFilter('expiringSoon')}
                style={[
                  styles.filterChip,
                  activeFilter === 'expiringSoon'
                    ? [styles.filterChipActive, { backgroundColor: '#F59E0B' }]
                    : { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.60)' : colors.gray100, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray200 },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: activeFilter === 'expiringSoon' ? '#0F172A' : colors.black },
                    isKu && { fontFamily: activeFilter === 'expiringSoon' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu ? `بەم نزیکانە (${kpis.expiringSoon})` : `Soon (${kpis.expiringSoon})`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectFilter('safe')}
                style={[
                  styles.filterChip,
                  activeFilter === 'safe'
                    ? [styles.filterChipActive, { backgroundColor: '#10B981' }]
                    : { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.60)' : colors.gray100, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray200 },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: activeFilter === 'safe' ? '#FFFFFF' : colors.black },
                    isKu && { fontFamily: activeFilter === 'safe' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu ? `سەلامەت (${kpis.safe})` : `Safe (${kpis.safe})`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSelectFilter('noDate')}
                style={[
                  styles.filterChip,
                  activeFilter === 'noDate'
                    ? [styles.filterChipActive, { backgroundColor: colors.gray400 }]
                    : { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.60)' : colors.gray100, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray200 },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: activeFilter === 'noDate' ? '#FFFFFF' : colors.gray500 },
                    isKu && { fontFamily: activeFilter === 'noDate' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu ? `بێ بەروار (${kpis.noDate})` : `No Date (${kpis.noDate})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color={colors.gray400} />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.black },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKu ? 'هیچ کاڵایەک نەدۆزرایەوە' : 'No Items Found'}
            </Text>
            <Text
              style={[
                styles.emptySub,
                { color: colors.gray400 },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
            >
              {isKu
                ? 'بەپێی ئەو فلتەر یان گەڕانەی دیاریت کردووە هیچ بەرهەمێک بەردەست نییە'
                : 'No products match your selected filter or search term'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerWrap: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 14,
  },
  kpiGrid: {
    gap: 8,
    width: '100%',
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  kpiNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  thresholdBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  thresholdLabelRow: {
    alignItems: 'center',
    gap: 6,
  },
  thresholdLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  thresholdChipsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  thresholdChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
  },
  thresholdChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noticeBanner: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  noticeText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  settingsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  settingsLinkText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  searchRow: {
    gap: 10,
    width: '100%',
  },
  searchInputBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    height: '100%',
  },
  filterChipsRow: {
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipActive: {
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  productThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  productThumbFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfoCol: {
    flex: 1,
    gap: 4,
  },
  cardNameRow: {
    alignItems: 'center',
    gap: 6,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryQtyRow: {
    alignItems: 'center',
    gap: 8,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catText: {
    fontSize: 11,
    fontWeight: '600',
  },
  qtyText: {
    fontSize: 11.5,
  },
  badgeCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
  },
  datesFooter: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  dateCell: {
    alignItems: 'center',
    gap: 5,
  },
  dateCellLabel: {
    fontSize: 11.5,
  },
  dateCellValue: {
    fontSize: 12,
  },
  dateDivider: {
    width: 1,
    height: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
});
