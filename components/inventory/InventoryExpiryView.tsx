import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
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
import { fmtIQD } from '@/utils/formatters';
import { getPeriodBounds, isDateWithinRange, type PeriodKey } from '@/utils/dateRanges';
import { CustomDateRangeModal } from '@/components/shared/CustomDateRangeModal';
import { CustomAlertDaysModal } from '@/components/inventory/CustomAlertDaysModal';
import { getProductDisplayImage } from '@/lib/imageStorage';
import type { InventoryProduct } from '@/types/inventory';

type ExpiryFilterType = 'all' | 'expired' | 'expiringSoon' | 'safe' | 'noDate';
type SortOption = 'closestExpiry' | 'farthestExpiry' | 'quantity' | 'name';

interface Props {
  products: InventoryProduct[];
  onRefresh?: () => void;
  refreshing?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  initialTab?: 'report' | 'products';
}

interface ProductWithExpiryStatus {
  product: InventoryProduct;
  diffDays: number | null; // null if no expiry date, <0 if expired, >=0 if days remaining
  status: 'expired' | 'expiringSoon' | 'safe' | 'noDate';
}

const PRESET_ALERT_DAYS = [7, 15, 30];

export function InventoryExpiryView({
  products,
  onRefresh,
  refreshing = false,
  viewMode = 'list',
  onViewModeChange,
  initialTab = 'report',
}: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKu = useLanguageStore((s) => s.language !== 'en');
  const { isTablet, isTabletLandscape } = useResponsive();

  const expiryAlertDays = useSettingsStore((s) => s.expiryAlertDays);
  const setExpiryAlertDays = useSettingsStore((s) => s.setExpiryAlertDays);

  // ── Two Main Tabs: 'report' (ڕاپۆرت) and 'products' (کاڵاکان) ──
  // Default to 'report' as requested by the user, starting on the RIGHT in Kurdish RTL
  const [activeTab, setActiveTab] = useState<'report' | 'products'>(initialTab);

  // ── Period Filter (Report Tab) - ALWAYS defaults to 'all' ──
  const [periodKey, setPeriodKey] = useState<PeriodKey>('all');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  // ── Custom Alert Days Modal State ──
  const [customAlertDaysModalOpen, setCustomAlertDaysModalOpen] = useState(false);

  // ── Products Tab Search & Filter State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ExpiryFilterType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('closestExpiry');

  const periodKeys: PeriodKey[] = ['all', 'today', 'week', 'month', 'year', 'custom'];
  const periodLabels: Record<PeriodKey, string> = {
    all:    isKu ? 'هەمووی' : 'All Time',
    today:  isKu ? 'ئەمڕۆ' : 'Today',
    week:   isKu ? 'ئەم هەفتەیە' : 'This Week',
    month:  isKu ? 'ئەم مانگە' : 'This Month',
    year:   isKu ? 'ئەمساڵ' : 'This Year',
    custom: isKu ? 'دەستنیشانکراو' : 'Custom',
  };

  // ── 1. Compute status & days remaining for all products ──
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

  // ── 2. Report Period Bounds & Filtered Products for Report ──
  const periodBounds = useMemo(() => {
    return getPeriodBounds(periodKey, customRange?.from, customRange?.to);
  }, [periodKey, customRange]);

  const periodProducts = useMemo(() => {
    if (periodKey === 'all') {
      return enrichedProducts;
    }
    return enrichedProducts.filter((item) => {
      if (!item.product.expiryDate) return false;
      return isDateWithinRange(item.product.expiryDate, periodBounds.from, periodBounds.to);
    });
  }, [enrichedProducts, periodKey, periodBounds]);

  // Report KPIs
  const reportKPIs = useMemo(() => {
    let totalTracked = 0;
    let expired = 0;
    let expiringSoon = 0;
    let safe = 0;
    let noDate = 0;
    let totalValueRisk = 0;

    for (const item of periodProducts) {
      if (item.status === 'noDate') {
        noDate++;
      } else {
        totalTracked++;
        if (item.status === 'expired') {
          expired++;
          totalValueRisk += (item.product.quantity || 0) * (item.product.purchasePrice || item.product.sellingPrice || 0);
        } else if (item.status === 'expiringSoon') {
          expiringSoon++;
          totalValueRisk += (item.product.quantity || 0) * (item.product.purchasePrice || item.product.sellingPrice || 0);
        } else {
          safe++;
        }
      }
    }

    return {
      totalTracked,
      expired,
      expiringSoon,
      safe,
      noDate,
      totalItems: periodProducts.length,
      totalValueRisk,
    };
  }, [periodProducts]);

  // Urgent list for the Report Tab
  const urgentReportItems = useMemo(() => {
    return periodProducts
      .filter((i) => i.status === 'expired' || i.status === 'expiringSoon')
      .sort((a, b) => {
        if (a.diffDays === null && b.diffDays === null) return 0;
        if (a.diffDays === null) return 1;
        if (b.diffDays === null) return -1;
        return a.diffDays - b.diffDays;
      })
      .slice(0, 8);
  }, [periodProducts]);

  // ── 3. Products Tab Filter & Search ──
  const filteredProducts = useMemo(() => {
    let list = enrichedProducts;

    // Filter by period bounds (if not 'all')
    if (periodKey !== 'all') {
      list = list.filter((item) => {
        if (!item.product.expiryDate) return false;
        return isDateWithinRange(item.product.expiryDate, periodBounds.from, periodBounds.to);
      });
    }

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
  }, [enrichedProducts, activeFilter, searchQuery, sortBy, periodKey, periodBounds]);

  // Status counts for Tab 2 filter chips (reflecting chosen period)
  const filterCounts = useMemo(() => {
    const baseList = periodKey === 'all'
      ? enrichedProducts
      : enrichedProducts.filter((item) => {
          if (!item.product.expiryDate) return false;
          return isDateWithinRange(item.product.expiryDate, periodBounds.from, periodBounds.to);
        });

    let all = baseList.length;
    let expired = 0;
    let expiringSoon = 0;
    let safe = 0;
    let noDate = 0;

    for (const item of baseList) {
      if (item.status === 'expired') expired++;
      else if (item.status === 'expiringSoon') expiringSoon++;
      else if (item.status === 'safe') safe++;
      else noDate++;
    }

    return { all, expired, expiringSoon, safe, noDate };
  }, [enrichedProducts, periodKey, periodBounds]);

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
            {isKu ? `${item.diffDays} ڕۆژ ماوە` : `${item.diffDays}d left`}
          </Text>
        </View>
      );
    }

    // Safe
    return (
      <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5' }]}>
        <Ionicons name="checkmark-circle" size={13} color="#10B981" />
        <Text style={[styles.badgeText, { color: '#10B981' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
          {isKu ? `${item.diffDays} ڕۆژ ماوە` : `${item.diffDays}d left`}
        </Text>
      </View>
    );
  };

  // ── Render Product Card in List View (درێژ) ──
  const renderProductListItem = ({ item }: { item: ProductWithExpiryStatus }) => {
    const p = item.product;

    return (
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => router.push(`/(app)/inventory/${p.id}` as never)}
        style={[
          styles.itemCardList,
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
          {(() => {
            const displayImg = getProductDisplayImage(p);
            return displayImg ? (
              <Image source={{ uri: displayImg }} style={styles.productThumb} resizeMode="cover" />
            ) : (
              <View
                style={[
                  styles.productThumbFallback,
                  { backgroundColor: hexToRgba(colors.primary, isDark ? 0.2 : 0.12) },
                ]}
              >
                <Ionicons name="cube-outline" size={24} color={colors.primary} />
              </View>
            );
          })()}

          {/* Product Details (Name, Category & Quantity) */}
          <View style={[styles.cardInfoCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
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

            {/* Expiry Date string */}
            <View style={[styles.expiryDateRow, { flexDirection }]}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={item.status === 'expired' ? '#EF4444' : item.status === 'expiringSoon' ? '#D97706' : colors.gray400}
              />
              <Text style={[styles.expiryDateLabel, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {isKu ? 'بەسەرچوون:' : 'Expires:'}
              </Text>
              <Text
                style={[
                  styles.expiryDateValue,
                  {
                    color:
                      item.status === 'expired'
                        ? '#EF4444'
                        : item.status === 'expiringSoon'
                        ? '#D97706'
                        : colors.black,
                  },
                ]}
              >
                {p.expiryDate || (isKu ? 'دیاری نەکراوە' : 'No date')}
              </Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={styles.badgeCol}>{renderBadge(item)}</View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render Product Card in Grid View (چوارگۆشە) ──
  const renderProductGridItem = ({ item }: { item: ProductWithExpiryStatus }) => {
    const p = item.product;

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => router.push(`/(app)/inventory/${p.id}` as never)}
        style={[
          styles.itemCardGrid,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.75)' : '#FFFFFF',
            borderColor:
              item.status === 'expired'
                ? isDark ? 'rgba(239, 68, 68, 0.40)' : '#FCA5A5'
                : item.status === 'expiringSoon'
                ? isDark ? 'rgba(245, 158, 11, 0.40)' : '#FCD34D'
                : isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
            width: isTabletLandscape ? '23.8%' : isTablet ? '31.8%' : '48.5%',
          },
        ]}
      >
        {/* Top Image / Fallback Box */}
        <View style={styles.gridThumbContainer}>
          {(() => {
            const displayImg = getProductDisplayImage(p);
            return displayImg ? (
              <Image source={{ uri: displayImg }} style={styles.gridImage} resizeMode="cover" />
            ) : (
              <View
                style={[
                  styles.gridImageFallback,
                  { backgroundColor: hexToRgba(colors.primary, isDark ? 0.2 : 0.12) },
                ]}
              >
                <Ionicons name="cube-outline" size={32} color={colors.primary} />
              </View>
            );
          })()}

          {/* Badge Overlaid on Image */}
          <View style={[styles.gridBadgeOverlay, isRTL ? { left: 8 } : { right: 8 }]}>
            {renderBadge(item)}
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.gridBody}>
          <Text
            style={[
              styles.gridProductName,
              { color: colors.black, textAlign },
              isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
            numberOfLines={1}
          >
            {p.name}
          </Text>

          <View style={[styles.gridSubRow, { flexDirection }]}>
            <View style={[styles.gridQtyPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.gray100 }]}>
              <Text style={[styles.gridQtyText, { color: colors.gray600 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {isKu ? `${p.quantity} دانە` : `${p.quantity} pcs`}
              </Text>
            </View>
            {p.category ? (
              <Text style={[styles.gridCatText, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]} numberOfLines={1}>
                {p.category}
              </Text>
            ) : null}
          </View>

          {/* Expiry Date */}
          <View style={[styles.gridDateFooter, { flexDirection }]}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={item.status === 'expired' ? '#EF4444' : item.status === 'expiringSoon' ? '#D97706' : colors.primary}
            />
            <Text
              style={[
                styles.gridDateText,
                {
                  color:
                    item.status === 'expired'
                      ? '#EF4444'
                      : item.status === 'expiringSoon'
                      ? '#D97706'
                      : colors.black,
                },
              ]}
              numberOfLines={1}
            >
              {p.expiryDate || (isKu ? 'دیاری نەکراوە' : 'No date')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── 1. Segmented Switcher (ڕاپۆرت vs کاڵاکان) ──────────────── */}
      <View
        style={[
          styles.segmentWrapper,
          { backgroundColor: isDark ? colors.gray100 : colors.white, borderBottomColor: isDark ? colors.gray200 : colors.gray200 },
          isTablet && { alignItems: 'center' },
        ]}
      >
        <View
          style={[
            styles.segmentTrack,
            { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.60)' : colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' },
            isTablet && { maxWidth: isTabletLandscape ? 960 : 760, width: '100%' },
          ]}
        >
          {/* Tab 1: ڕاپۆرت و ئامار (Report & Analytics) - Primary default, displays on the RIGHT in Kurdish RTL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.selectionAsync().catch(() => {});
              } catch {}
              setActiveTab('report');
            }}
            style={[
              styles.segmentBtn,
              activeTab === 'report' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="bar-chart-outline"
              size={18}
              color={activeTab === 'report' ? '#0F172A' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeTab === 'report' ? '#0F172A' : colors.gray600 },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {isKu ? 'ڕاپۆرت و ئامار' : 'Report & Analytics'}
            </Text>
          </TouchableOpacity>

          {/* Tab 2: کاڵاکان (Products) - displays on the LEFT in Kurdish RTL */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.selectionAsync().catch(() => {});
              } catch {}
              setActiveTab('products');
            }}
            style={[
              styles.segmentBtn,
              activeTab === 'products' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={18}
              color={activeTab === 'products' ? '#0F172A' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeTab === 'products' ? '#0F172A' : colors.gray600 },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {isKu ? 'کاڵاکان' : 'Products'}
            </Text>
            {enrichedProducts.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor: activeTab === 'products' ? '#0F172A' : isDark ? colors.gray200 : colors.gray300,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    { color: activeTab === 'products' ? colors.primary : colors.black },
                  ]}
                >
                  {enrichedProducts.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. TAB 1: ڕاپۆرت و ئاماری بەروارەکان (REPORT VIEW) ──────────────── */}
      {activeTab === 'report' ? (
        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={[
            styles.reportScrollContent,
            isTablet && { maxWidth: isTabletLandscape ? 960 : 760, alignSelf: 'center', width: '100%' },
          ]}
          showsVerticalScrollIndicator={false}
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
        >
          {/* Period Filter Bar (Must always default to 'all') */}
          <View style={styles.periodSection}>
            <View style={[styles.periodSectionHeader, { flexDirection }]}>
              <View style={[styles.periodTitleRow, { flexDirection }]}>
                <Ionicons name="calendar" size={16} color={colors.primary} />
                <Text
                  style={[
                    styles.periodSectionTitle,
                    { color: colors.black },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'فلتەرکردنی کات:' : 'Time Period:'}
                </Text>
              </View>

              <Text style={[styles.periodSubHint, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {periodKey === 'all'
                  ? (isKu ? 'هەموو کات (سەرەکی)' : 'All Time (Default)')
                  : periodLabels[periodKey]}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={[
                styles.periodPillRow,
                {
                  flexDirection,
                  paddingHorizontal: 16,
                  gap: 8,
                },
              ]}
            >
              {periodKeys.map((key) => {
                const active = periodKey === key;
                const isCustom = key === 'custom';
                return (
                  <TouchableOpacity
                    key={key}
                    activeOpacity={0.8}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync().catch(() => {});
                      } catch {}
                      if (isCustom) {
                        setCustomOpen(true);
                      } else {
                        setPeriodKey(key);
                        setCustomRange(null);
                      }
                    }}
                    style={[
                      styles.periodPill,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : isDark
                          ? colors.gray100
                          : colors.white,
                        borderColor: active
                          ? colors.primary
                          : isDark
                          ? colors.gray200
                          : colors.gray200,
                        flexDirection,
                        alignItems: 'center',
                        gap: 5,
                      },
                    ]}
                  >
                    {isCustom && (
                      <Ionicons
                        name="calendar"
                        size={12}
                        color={active ? '#0F172A' : colors.primary}
                      />
                    )}
                    <Text
                      style={[
                        styles.periodPillText,
                        { color: active ? '#0F172A' : isDark ? colors.gray600 : colors.darkBlue },
                        isKu && { fontFamily: active ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isCustom && customRange
                        ? `${customRange.from} → ${customRange.to}`
                        : periodLabels[key]}
                    </Text>
                    {isCustom && active && customRange && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          setPeriodKey('all');
                          setCustomRange(null);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={13} color="#0F172A" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* KPI Metric Cards */}
          <View style={[styles.kpiGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Expired */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setActiveFilter('expired');
                setActiveTab('products');
              }}
              style={[
                styles.kpiCard,
                {
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.16)' : '#FEF2F2',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.40)' : '#FECACA',
                },
              ]}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: hexToRgba('#EF4444', isDark ? 0.25 : 0.15) }]}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
              </View>
              <Text style={[styles.kpiNum, { color: '#EF4444' }]}>{reportKPIs.expired}</Text>
              <Text style={[styles.kpiLabel, { color: '#EF4444' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {isKu ? 'بەسەرچووە' : 'Expired'}
              </Text>
            </TouchableOpacity>

            {/* Expiring Soon */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setActiveFilter('expiringSoon');
                setActiveTab('products');
              }}
              style={[
                styles.kpiCard,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FFFBEB',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.40)' : '#FDE68A',
                },
              ]}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: hexToRgba('#F59E0B', isDark ? 0.25 : 0.15) }]}>
                <Ionicons name="time" size={18} color="#D97706" />
              </View>
              <Text style={[styles.kpiNum, { color: '#F59E0B' }]}>{reportKPIs.expiringSoon}</Text>
              <Text style={[styles.kpiLabel, { color: '#D97706' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {isKu ? 'بەم نزیکانە' : 'Soon'}
              </Text>
            </TouchableOpacity>

            {/* Safe */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setActiveFilter('safe');
                setActiveTab('products');
              }}
              style={[
                styles.kpiCard,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#F0FDF4',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.40)' : '#BBF7D0',
                },
              ]}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: hexToRgba('#10B981', isDark ? 0.25 : 0.15) }]}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              </View>
              <Text style={[styles.kpiNum, { color: '#10B981' }]}>{reportKPIs.safe}</Text>
              <Text style={[styles.kpiLabel, { color: '#10B981' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {isKu ? 'سەلامەت' : 'Safe'}
              </Text>
            </TouchableOpacity>

            {/* Tracked With Dates */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setActiveFilter('all');
                setActiveTab('products');
              }}
              style={[
                styles.kpiCard,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                },
              ]}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: hexToRgba(colors.primary, isDark ? 0.25 : 0.15) }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.kpiNum, { color: colors.primary }]}>{reportKPIs.totalTracked}</Text>
              <Text style={[styles.kpiLabel, { color: colors.black }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {isKu ? 'خاوەن بەروار' : 'Tracked'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Alert Days Threshold Quick Selector Bar */}
          <View
            style={[
              styles.thresholdBar,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
              },
            ]}
          >
            <View style={[styles.thresholdHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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

              <Text
                style={[
                  styles.thresholdActiveHint,
                  { color: colors.primary },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {expiryAlertDays} {isKu ? 'ڕۆژ پێش بەسەرچوون' : 'days before expiry'}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.thresholdChipsWrap,
                {
                  flexDirection,
                  gap: 6,
                },
              ]}
            >
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
                          ? colors.gray100
                          : colors.white,
                        borderColor: isSelected
                          ? colors.primary
                          : isDark
                          ? colors.gray200
                          : colors.gray200,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.thresholdChipText,
                        { color: isSelected ? '#0F172A' : isDark ? colors.gray600 : colors.darkBlue },
                        isKu && { fontFamily: isSelected ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isKu ? `${days} ڕۆژ` : `${days}d`}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Custom Alert Days Chip */}
              {(() => {
                const isCustomSelected = !PRESET_ALERT_DAYS.includes(expiryAlertDays);
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync().catch(() => {});
                      } catch {}
                      setCustomAlertDaysModalOpen(true);
                    }}
                    style={[
                      styles.thresholdChip,
                      {
                        backgroundColor: isCustomSelected
                          ? colors.primary
                          : isDark
                          ? colors.gray100
                          : colors.white,
                        borderColor: isCustomSelected
                          ? colors.primary
                          : isDark
                          ? colors.gray200
                          : colors.gray200,
                        flexDirection,
                        alignItems: 'center',
                        gap: 4,
                      },
                    ]}
                  >
                    <Ionicons
                      name="pencil-sharp"
                      size={11}
                      color={isCustomSelected ? '#0F172A' : (isDark ? colors.gray500 : colors.gray500)}
                    />
                    <Text
                      style={[
                        styles.thresholdChipText,
                        { color: isCustomSelected ? '#0F172A' : isDark ? colors.gray600 : colors.darkBlue },
                        isKu && { fontFamily: isCustomSelected ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isCustomSelected
                        ? (isKu ? `${expiryAlertDays} ڕۆژ` : `${expiryAlertDays}d`)
                        : (isKu ? 'کەستەم' : 'Custom')}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </ScrollView>
          </View>

          {/* Smart Warning Notice Banner */}
          {(reportKPIs.expired > 0 || reportKPIs.expiringSoon > 0) && (
            <View
              style={[
                styles.noticeBanner,
                {
                  flexDirection,
                  backgroundColor: reportKPIs.expired > 0 ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2') : isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
                  borderColor: reportKPIs.expired > 0 ? (isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA') : isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
                },
              ]}
            >
              <Ionicons
                name={reportKPIs.expired > 0 ? 'alert-circle' : 'warning'}
                size={24}
                color={reportKPIs.expired > 0 ? '#EF4444' : '#F59E0B'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.noticeTitle,
                    { color: reportKPIs.expired > 0 ? '#DC2626' : '#B45309', textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'ئاگاداری نزیک بوونەوە لە بەسەرچوون' : 'Expiration Warning Alert'}
                </Text>
                <Text
                  style={[
                    styles.noticeDesc,
                    { color: reportKPIs.expired > 0 ? '#B91C1C' : '#92400E', textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? `${reportKPIs.expired > 0 ? `${reportKPIs.expired} کاڵا بەسەرچووە! ` : ''}${reportKPIs.expiringSoon > 0 ? `${reportKPIs.expiringSoon} کاڵا لە ماوەی ${expiryAlertDays} ڕۆژدا بەسەر دەچێت.` : ''}`
                    : `${reportKPIs.expired > 0 ? `${reportKPIs.expired} items expired! ` : ''}${reportKPIs.expiringSoon > 0 ? `${reportKPIs.expiringSoon} items expiring soon within ${expiryAlertDays} days.` : ''}`}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setActiveFilter(reportKPIs.expired > 0 ? 'expired' : 'expiringSoon');
                  setActiveTab('products');
                }}
                style={[
                  styles.noticeActionBtn,
                  { backgroundColor: reportKPIs.expired > 0 ? '#EF4444' : '#F59E0B' },
                ]}
              >
                <Text
                  style={[
                    styles.noticeActionText,
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'بینینی کاڵاکان' : 'View Items'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Financial Risk & Safety Health Card */}
          <View
            style={[
              styles.healthCard,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
              },
            ]}
          >
            <View style={[styles.healthCardHeader, { flexDirection }]}>
              <View style={[styles.healthTitleRow, { flexDirection }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <Text
                  style={[
                    styles.healthCardTitle,
                    { color: colors.black },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'پوختەی مەترسی و سەلامەتی' : 'Health & Risk Summary'}
                </Text>
              </View>

              {reportKPIs.totalValueRisk > 0 && (
                <View style={[styles.riskValueBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.20)' : '#FEE2E2' }]}>
                  <Text style={[styles.riskValueText, { color: '#EF4444' }]}>
                    {fmtIQD(reportKPIs.totalValueRisk)}
                  </Text>
                </View>
              )}
            </View>

            {/* Health Segment Progress Bar */}
            {reportKPIs.totalTracked > 0 ? (
              <View style={styles.healthBarWrap}>
                <View style={styles.healthBarTrack}>
                  {reportKPIs.safe > 0 && (
                    <View
                      style={[
                        styles.healthBarSegment,
                        {
                          backgroundColor: '#10B981',
                          flex: reportKPIs.safe,
                        },
                      ]}
                    />
                  )}
                  {reportKPIs.expiringSoon > 0 && (
                    <View
                      style={[
                        styles.healthBarSegment,
                        {
                          backgroundColor: '#F59E0B',
                          flex: reportKPIs.expiringSoon,
                        },
                      ]}
                    />
                  )}
                  {reportKPIs.expired > 0 && (
                    <View
                      style={[
                        styles.healthBarSegment,
                        {
                          backgroundColor: '#EF4444',
                          flex: reportKPIs.expired,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Progress Indicators Legend */}
                <View style={[styles.healthLegendRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.legendText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                      {isKu ? `سەلامەت: %${Math.round((reportKPIs.safe / reportKPIs.totalTracked) * 100)}` : `Safe: ${Math.round((reportKPIs.safe / reportKPIs.totalTracked) * 100)}%`}
                    </Text>
                  </View>

                  <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.legendText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                      {isKu ? `بەم نزیکانە: %${Math.round((reportKPIs.expiringSoon / reportKPIs.totalTracked) * 100)}` : `Soon: ${Math.round((reportKPIs.expiringSoon / reportKPIs.totalTracked) * 100)}%`}
                    </Text>
                  </View>

                  <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.legendText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                      {isKu ? `بەسەرچوو: %${Math.round((reportKPIs.expired / reportKPIs.totalTracked) * 100)}` : `Expired: ${Math.round((reportKPIs.expired / reportKPIs.totalTracked) * 100)}%`}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          {/* Urgent Items List (If any items need attention in this period) */}
          {urgentReportItems.length > 0 ? (
            <View
              style={[
                styles.urgentSection,
                {
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
                },
              ]}
            >
              <View style={[styles.urgentHeader, { flexDirection }]}>
                <Text
                  style={[
                    styles.urgentTitle,
                    { color: colors.black },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'کاڵا پێویست بە ئاگادارییەکان لەم ماوەیەدا' : 'Urgent Items In Selected Period'}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setActiveFilter('all');
                    setActiveTab('products');
                  }}
                >
                  <Text style={[styles.viewAllText, { color: colors.primary }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isKu ? 'هەموو کاڵاکان' : 'View All'}
                  </Text>
                </TouchableOpacity>
              </View>

              {urgentReportItems.map((item) => (
                <TouchableOpacity
                  key={String(item.product.id)}
                  activeOpacity={0.75}
                  onPress={() => router.push(`/(app)/inventory/${item.product.id}` as never)}
                  style={[
                    styles.urgentRow,
                    {
                      flexDirection,
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray100,
                    },
                  ]}
                >
                  {(() => {
                    const urgentImg = getProductDisplayImage(item.product);
                    return urgentImg ? (
                      <Image source={{ uri: urgentImg }} style={styles.urgentThumb} resizeMode="cover" />
                    ) : (
                      <View
                        style={[
                          styles.urgentThumbFallback,
                          { backgroundColor: hexToRgba(colors.primary, isDark ? 0.2 : 0.12) },
                        ]}
                      >
                        <Ionicons name="cube-outline" size={18} color={colors.primary} />
                      </View>
                    );
                  })()}

                  <View style={[styles.urgentNameCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text
                      style={[
                        styles.urgentItemName,
                        { color: colors.black, textAlign },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                      numberOfLines={1}
                    >
                      {item.product.name}
                    </Text>
                    <Text style={[styles.urgentItemSub, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                      {isKu ? `کۆگا: ${item.product.quantity} دانە • ${item.product.expiryDate}` : `Stock: ${item.product.quantity} • ${item.product.expiryDate}`}
                    </Text>
                  </View>

                  <View>{renderBadge(item)}</View>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ── 3. TAB 2: کاڵاکان و بەروارەکانیان (PRODUCTS VIEW) ──────────────── */
        <FlatList
          data={filteredProducts}
          key={viewMode === 'grid' ? (isTabletLandscape ? 'grid4' : isTablet ? 'grid3' : 'grid2') : 'list'}
          numColumns={viewMode === 'grid' ? (isTabletLandscape ? 4 : isTablet ? 3 : 2) : 1}
          keyExtractor={(item) => String(item.product.id)}
          renderItem={viewMode === 'grid' ? renderProductGridItem : renderProductListItem}
          contentContainerStyle={[
            styles.listContent,
            isTablet && { maxWidth: isTabletLandscape ? 960 : 760, alignSelf: 'center', width: '100%' },
          ]}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridColumnWrapper : undefined}
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
            <View style={styles.productsHeaderWrap}>
              {/* Search Bar */}
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

              {/* Date Period Filter Bar (ماوەی بەروار: هەمووی، ئەمڕۆ، ئەم هەفتەیە، ئەم مانگە، دەستنیشانکراو) */}
              <View style={[styles.periodSection, { marginBottom: 2 }]}>
                <View style={[styles.periodSectionHeader, { flexDirection }]}>
                  <View style={[styles.periodTitleRow, { flexDirection }]}>
                    <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                    <Text style={[styles.periodSectionTitle, { color: colors.black }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {isKu ? 'ماوەی بەروار:' : 'Date Period:'}
                    </Text>
                  </View>
                  <Text style={[styles.periodSubHint, { color: colors.primary }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {periodKey === 'all'
                      ? (isKu ? 'هەموو کات' : 'All Time')
                      : periodKey === 'custom' && customRange
                      ? `${customRange.from} → ${customRange.to}`
                      : periodLabels[periodKey]}
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -16 }}
                  contentContainerStyle={[
                    styles.periodPillRow,
                    {
                      flexDirection,
                      paddingHorizontal: 16,
                      gap: 8,
                    },
                  ]}
                >
                  {periodKeys.map((key) => {
                    const active = periodKey === key;
                    const isCustom = key === 'custom';
                    return (
                      <TouchableOpacity
                        key={key}
                        activeOpacity={0.8}
                        onPress={() => {
                          try {
                            Haptics.selectionAsync().catch(() => {});
                          } catch {}
                          if (isCustom) {
                            setCustomOpen(true);
                          } else {
                            setPeriodKey(key);
                            setCustomRange(null);
                          }
                        }}
                        style={[
                          styles.periodPill,
                          {
                            backgroundColor: active
                              ? colors.primary
                              : isDark
                              ? colors.gray100
                              : colors.white,
                            borderColor: active
                              ? colors.primary
                              : isDark
                              ? colors.gray200
                              : colors.gray200,
                            flexDirection,
                            alignItems: 'center',
                            gap: 5,
                          },
                        ]}
                      >
                        {isCustom && (
                          <Ionicons
                            name="calendar"
                            size={12}
                            color={active ? '#0F172A' : colors.primary}
                          />
                        )}
                        <Text
                          style={[
                            styles.periodPillText,
                            { color: active ? '#0F172A' : isDark ? colors.gray600 : colors.darkBlue },
                            isKu && { fontFamily: active ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                          ]}
                        >
                          {isCustom && customRange
                            ? `${customRange.from} → ${customRange.to}`
                            : periodLabels[key]}
                        </Text>
                        {isCustom && active && customRange && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation?.();
                              setPeriodKey('all');
                              setCustomRange(null);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="close-circle" size={13} color="#0F172A" />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Active Custom Filter Badge / Indicator with Reset */}
              {(periodKey !== 'all' || customRange !== null) && (
                <View
                  style={[
                    styles.activeFilterBanner,
                    {
                      flexDirection,
                      backgroundColor: isDark ? 'rgba(212,175,55,0.12)' : '#FEF9C3',
                      borderColor: isDark ? 'rgba(212,175,55,0.30)' : '#FDE047',
                    },
                  ]}
                >
                  <View style={[styles.activeFilterLeft, { flexDirection }]}>
                    <Ionicons name="funnel" size={14} color={colors.primary} />
                    <Text style={[styles.activeFilterText, { color: colors.black }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                      {isKu ? 'فلتەری دەستنیشانکراو:' : 'Selected Filter:'}{' '}
                      <Text style={{ fontWeight: '700', color: colors.primary }}>
                        {periodKey === 'custom' && customRange
                          ? `${customRange.from} → ${customRange.to}`
                          : periodLabels[periodKey]}
                      </Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        Haptics.selectionAsync().catch(() => {});
                      } catch {}
                      setPeriodKey('all');
                      setCustomRange(null);
                    }}
                    style={[styles.clearFilterBtn, { flexDirection }]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle" size={15} color={colors.error} />
                    <Text style={[styles.clearFilterText, { color: colors.error }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {isKu ? 'سڕینەوە' : 'Reset'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Status Filter Chips (هەمووی، بەسەرچوو، بەم نزیکانە، سەلامەت، بێ بەروار + دەستنیشانکراو) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -16 }}
                contentContainerStyle={[
                  styles.filterChipsRow,
                  {
                    flexDirection,
                    paddingHorizontal: 16,
                    gap: 8,
                  },
                ]}
              >
                {/* All */}
                <TouchableOpacity
                  onPress={() => handleSelectFilter('all')}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: activeFilter === 'all' ? colors.primary : isDark ? colors.gray100 : colors.white,
                      borderColor: activeFilter === 'all' ? colors.primary : isDark ? colors.gray200 : colors.gray200,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: activeFilter === 'all' ? '#0F172A' : isDark ? colors.gray600 : colors.darkBlue },
                      isKu && { fontFamily: activeFilter === 'all' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isKu ? `هەمووی (${filterCounts.all})` : `All (${filterCounts.all})`}
                  </Text>
                </TouchableOpacity>

                {/* Expired */}
                <TouchableOpacity
                  onPress={() => handleSelectFilter('expired')}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: activeFilter === 'expired' ? '#EF4444' : isDark ? colors.gray100 : colors.white,
                      borderColor: activeFilter === 'expired' ? '#EF4444' : isDark ? colors.gray200 : colors.gray200,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: activeFilter === 'expired' ? '#FFFFFF' : '#EF4444' },
                      isKu && { fontFamily: activeFilter === 'expired' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isKu ? `بەسەرچوو (${filterCounts.expired})` : `Expired (${filterCounts.expired})`}
                  </Text>
                </TouchableOpacity>

                {/* Soon */}
                <TouchableOpacity
                  onPress={() => handleSelectFilter('expiringSoon')}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: activeFilter === 'expiringSoon' ? '#F59E0B' : isDark ? colors.gray100 : colors.white,
                      borderColor: activeFilter === 'expiringSoon' ? '#F59E0B' : isDark ? colors.gray200 : colors.gray200,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: activeFilter === 'expiringSoon' ? '#0F172A' : '#D97706' },
                      isKu && { fontFamily: activeFilter === 'expiringSoon' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isKu ? `بەم نزیکانە (${filterCounts.expiringSoon})` : `Soon (${filterCounts.expiringSoon})`}
                  </Text>
                </TouchableOpacity>

                {/* Safe */}
                <TouchableOpacity
                  onPress={() => handleSelectFilter('safe')}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: activeFilter === 'safe' ? '#10B981' : isDark ? colors.gray100 : colors.white,
                      borderColor: activeFilter === 'safe' ? '#10B981' : isDark ? colors.gray200 : colors.gray200,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: activeFilter === 'safe' ? '#FFFFFF' : '#10B981' },
                      isKu && { fontFamily: activeFilter === 'safe' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isKu ? `سەلامەت (${filterCounts.safe})` : `Safe (${filterCounts.safe})`}
                  </Text>
                </TouchableOpacity>

                {/* No Date */}
                <TouchableOpacity
                  onPress={() => handleSelectFilter('noDate')}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: activeFilter === 'noDate' ? colors.gray500 : isDark ? colors.gray100 : colors.white,
                      borderColor: activeFilter === 'noDate' ? colors.gray500 : isDark ? colors.gray200 : colors.gray200,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: activeFilter === 'noDate' ? '#FFFFFF' : colors.gray500 },
                      isKu && { fontFamily: activeFilter === 'noDate' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isKu ? `بێ بەروار (${filterCounts.noDate})` : `No Date (${filterCounts.noDate})`}
                  </Text>
                </TouchableOpacity>

                {/* Quick Custom Range Chip in Status Row */}
                <TouchableOpacity
                  onPress={() => {
                    try {
                      Haptics.selectionAsync().catch(() => {});
                    } catch {}
                    setCustomOpen(true);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: (periodKey === 'custom' && customRange) ? colors.primary : isDark ? colors.gray100 : colors.white,
                      borderColor: (periodKey === 'custom' && customRange) ? colors.primary : isDark ? colors.gray200 : colors.gray200,
                      flexDirection,
                      alignItems: 'center',
                      gap: 4,
                    },
                  ]}
                >
                  <Ionicons
                    name="calendar"
                    size={12}
                    color={(periodKey === 'custom' && customRange) ? '#0F172A' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: (periodKey === 'custom' && customRange) ? '#0F172A' : isDark ? colors.gray600 : colors.darkBlue },
                      isKu && { fontFamily: (periodKey === 'custom' && customRange) ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {periodKey === 'custom' && customRange
                      ? `${customRange.from} → ${customRange.to}`
                      : (isKu ? 'دەستنیشانکراو' : 'Custom')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
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
      )}

      {/* ── Custom Date Range Modal ── */}
      <CustomDateRangeModal
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        initialFrom={customRange?.from}
        initialTo={customRange?.to}
        onApply={(from, to) => {
          setPeriodKey('custom');
          setCustomRange({ from, to });
          setCustomOpen(false);
        }}
      />

      {/* ── Custom Alert Days Modal ── */}
      <CustomAlertDaysModal
        visible={customAlertDaysModalOpen}
        onClose={() => setCustomAlertDaysModalOpen(false)}
        initialDays={expiryAlertDays}
        onApply={(days) => {
          setExpiryAlertDays(days);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollFlex: {
    flex: 1,
  },
  reportScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // ── Segmented Tab Switcher ──
  segmentWrapper: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  segmentTrack: {
    borderRadius: 14,
    padding: 4,
    width: '100%',
  },
  segmentBtn: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 11,
    paddingHorizontal: 10,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  segmentBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Period Filter Section ──
  periodSection: {
    gap: 8,
  },
  periodSectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  periodTitleRow: {
    alignItems: 'center',
    gap: 6,
  },
  periodSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  periodSubHint: {
    fontSize: 12,
  },
  periodPillRow: {
    gap: 8,
    paddingVertical: 4,
  },
  periodPill: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodPillText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  // ── KPI Grid ──
  kpiGrid: {
    gap: 8,
    width: '100%',
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  kpiNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Threshold Bar ──
  thresholdBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  thresholdHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  thresholdLabelRow: {
    alignItems: 'center',
    gap: 6,
  },
  thresholdLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  thresholdActiveHint: {
    fontSize: 12,
    fontWeight: '700',
  },
  thresholdChipsWrap: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  thresholdChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  thresholdChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Notice Banner ──
  noticeBanner: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    alignItems: 'center',
    gap: 12,
  },
  noticeTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  noticeDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  noticeActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  noticeActionText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Health Card ──
  healthCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  healthCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthTitleRow: {
    alignItems: 'center',
    gap: 8,
  },
  healthCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  riskValueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskValueText: {
    fontSize: 12,
    fontWeight: '800',
  },
  healthBarWrap: {
    gap: 8,
  },
  healthBarTrack: {
    height: 10,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  healthBarSegment: {
    height: '100%',
  },
  healthLegendRow: {
    alignItems: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  legendItem: {
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11.5,
  },

  // ── Urgent Items Section in Report ──
  urgentSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  urgentHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  urgentTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  urgentRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  urgentThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  urgentThumbFallback: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentNameCol: {
    flex: 1,
    gap: 2,
  },
  urgentItemName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  urgentItemSub: {
    fontSize: 11.5,
  },

  // ── Products Header (Tab 2) ──
  productsHeaderWrap: {
    gap: 12,
    paddingTop: 14,
    paddingBottom: 14,
  },
  searchInputBox: {
    width: '100%',
    height: 46,
    borderRadius: 14,
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
    gap: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6.5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  activeFilterBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activeFilterLeft: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  activeFilterText: {
    fontSize: 12,
  },
  clearFilterBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearFilterText: {
    fontSize: 11.5,
  },

  // ── Product Item (List View - درێژ) ──
  itemCardList: {
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
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  productThumbFallback: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfoCol: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  categoryQtyRow: {
    alignItems: 'center',
    gap: 8,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  catText: {
    fontSize: 11,
    fontWeight: '600',
  },
  qtyText: {
    fontSize: 11.5,
  },
  expiryDateRow: {
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  expiryDateLabel: {
    fontSize: 11,
  },
  expiryDateValue: {
    fontSize: 11.5,
    fontWeight: '700',
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

  // ── Product Item (Grid View - چوارگۆشە) ──
  itemCardGrid: {
    borderRadius: 16,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  gridThumbContainer: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBadgeOverlay: {
    position: 'absolute',
    top: 8,
  },
  gridBody: {
    padding: 10,
    gap: 5,
  },
  gridProductName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  gridSubRow: {
    alignItems: 'center',
    gap: 6,
  },
  gridQtyPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridQtyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gridCatText: {
    fontSize: 10.5,
    flex: 1,
  },
  gridDateFooter: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  gridDateText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // ── Empty State ──
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
