import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { SaleHistoryItem } from '@/components/sales/SaleHistoryItem';
import { SaleGridCard } from '@/components/sales/SaleGridCard';
import { PeriodFilterModal } from '@/components/shared/PeriodFilterModal';
import { useTranslation } from 'react-i18next';
import { useSalesStore } from '@/store/salesStore';
import { useBusinessStore } from '@/store/businessStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { isDateWithinRange, formatDateShort, type PeriodKey } from '@/utils/dateRanges';
import { toEnglishDigits } from '@/utils/formatters';
import * as Haptics from 'expo-haptics';
import { attachItemsToSales } from '@/lib/sqlite';
import { shareSalesAuditReport } from '@/lib/generateInvoice';
import { useResponsive } from '@/hooks/useResponsive';
import type { Sale } from '@/types/sales';

type SaleOrFiller = Sale | { id: string; isFiller: true };

export default function SalesHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isAr = useLanguageStore((s) => s.language === 'ar');
  const isKuOrAr = isKuLanguage || isAr;
  const { sales, loadSales, isLoading } = useSalesStore();

  const salesHistoryGridLayout = useSettingsStore((s) => s.salesHistoryGridLayout);
  const setSalesHistoryGridLayout = useSettingsStore((s) => s.setSalesHistoryGridLayout);
  const viewMode: 'grid' | 'list' = salesHistoryGridLayout ? 'grid' : 'list';

  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Period filter state — defaults to 'today' (ئەمڕۆ)
  const {
    period,
    bounds,
    periodSheetVisible,
    setPeriodSheetVisible,
    handlePeriodSelect,
  } = usePeriodFilter('today');

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const handleToggleViewMode = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setSalesHistoryGridLayout(!salesHistoryGridLayout);
  }, [salesHistoryGridLayout, setSalesHistoryGridLayout]);

  // Filter sales by selected period bounds
  const periodFilteredSales = useMemo(() => {
    if (period === 'all') return sales;
    return sales.filter((s) => isDateWithinRange(s.date ?? s.createdAt, bounds.from, bounds.to));
  }, [sales, period, bounds]);

  // Search filter on top of the period-filtered sales
  const searchLower = toEnglishDigits(query).trim().toLowerCase();
  const results = useMemo(() => {
    if (!searchLower) return periodFilteredSales;
    return periodFilteredSales.filter((s) => {
      const inv = (s.invoiceNumber || '').toLowerCase();
      const cust = (s.customerName || '').toLowerCase();
      const phone = (s.customerPhone || '').toLowerCase();
      return inv.includes(searchLower) || cust.includes(searchLower) || phone.includes(searchLower);
    });
  }, [searchLower, periodFilteredSales]);

  // Readable label for the current active period
  const periodDisplayLabel = useMemo(() => {
    if (period === 'today') return isAr ? 'اليوم' : isKuLanguage ? 'ئەمڕۆ' : 'Today';
    if (period === 'week') return isAr ? 'هذا الأسبوع' : isKuLanguage ? 'ئەم هەفتەیە' : 'This Week';
    if (period === 'month') return isAr ? 'هذا الشهر' : isKuLanguage ? 'ئەم مانگە' : 'This Month';
    if (period === 'year') return isAr ? 'هذا العام' : isKuLanguage ? 'ئەم ساڵ' : 'This Year';
    if (period === 'all') return isAr ? 'الكل' : isKuLanguage ? 'هەمووی' : 'All Time';
    return `${formatDateShort(bounds.from)} → ${formatDateShort(bounds.to)}`;
  }, [period, bounds, isKuLanguage, isAr]);

  // Generate & share PDF Sales Audit Report
  const handleExportPdf = useCallback(async () => {
    if (results.length === 0) {
      Alert.alert(
        isKuLanguage ? 'ئاگاداری' : 'Notice',
        t('sales.noSalesToExport')
      );
      return;
    }
    setIsExporting(true);
    try {
      const salesWithItems = await attachItemsToSales(results);
      const business = useBusinessStore.getState();
      await shareSalesAuditReport(salesWithItems, periodDisplayLabel, {
        name: business.name || 'My Store',
        phone: business.phone || '',
        address: business.address || '',
        logoUri: business.logoUri ?? null,
      });
    } catch (err) {
      console.error('[SalesHistory] Export PDF failed:', err);
      Alert.alert(isKuLanguage ? 'هەڵە' : 'Error', String(err));
    } finally {
      setIsExporting(false);
    }
  }, [results, periodDisplayLabel, isKuLanguage, t]);

  const numColumns = useMemo(() => {
    if (viewMode === 'list') {
      return isTablet ? (isTabletLandscape ? 2 : 1) : 1;
    }
    return isTabletLandscape ? 4 : isTablet ? 3 : 2;
  }, [viewMode, isTablet, isTabletLandscape]);

  // Balance out incomplete rows in multi-column view with transparent fillers
  const gridFormattedSales: SaleOrFiller[] = useMemo(() => {
    if (numColumns <= 1 || results.length === 0) {
      return results;
    }
    const remainder = results.length % numColumns;
    if (remainder === 0) return results;
    const needed = numColumns - remainder;
    const fillers: SaleOrFiller[] = Array.from({ length: needed }, (_, i) => ({
      id: `__grid_filler_${i}`,
      isFiller: true as const,
    }));
    return [...results, ...fillers];
  }, [results, numColumns]);

  const renderItem = useCallback(
    ({ item, index }: { item: SaleOrFiller; index: number }) => {
      if ('isFiller' in item && item.isFiller) {
        return <View style={{ flex: 1, marginBottom: 12, backgroundColor: 'transparent' }} />;
      }
      return (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200, delay: Math.min(index * 25, 250) }}
          style={{ flex: 1 }}
        >
          {viewMode === 'grid' ? (
            <SaleGridCard
              sale={item as Sale}
              onPress={() => router.push({ pathname: '/(app)/invoices', params: { tab: 'sales', id: String(item.id) } } as never)}
            />
          ) : (
            <SaleHistoryItem
              sale={item as Sale}
              onPress={() => router.push({ pathname: '/(app)/invoices', params: { tab: 'sales', id: String(item.id) } } as never)}
            />
          )}
        </MotiView>
      );
    },
    [router, viewMode]
  );

  const filterKeys: PeriodKey[] = ['today', 'week', 'month', 'year', 'all', 'custom'];
  const filterLabels: Record<PeriodKey, string> = {
    today:  isAr ? 'اليوم' : isKuLanguage ? 'ئەمڕۆ' : t('common.today', 'Today'),
    week:   isAr ? 'هذا الأسبوع' : isKuLanguage ? 'ئەم هەفتەیە' : t('common.thisWeek', 'This Week'),
    month:  isAr ? 'هذا الشهر' : isKuLanguage ? 'ئەم مانگە' : t('common.thisMonth', 'This Month'),
    year:   isAr ? 'هذا العام' : isKuLanguage ? 'ئەمساڵ' : t('reports.year', 'This Year'),
    all:    isAr ? 'الكل' : isKuLanguage ? 'هەمووی' : 'All',
    custom: isAr ? 'مخصص' : isKuLanguage ? 'دیاریکراو' : t('reports.custom', 'Custom'),
  };

  const handlePeriodTabPress = (key: PeriodKey) => {
    if (key === 'custom') {
      setPeriodSheetVisible(true);
    } else {
      handlePeriodSelect(key);
    }
  };

  const hasQuery = query.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('sales.history')}
        showBack
        onBack={() => router.back()}
        rightAction={
          <View style={[styles.headerActions, { flexDirection, gap: isTablet ? 12 : 8 }]}>
            <HeaderActionButton
              icon={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
              onPress={handleToggleViewMode}
            />
            <HeaderActionButton
              icon="document-text-outline"
              onPress={handleExportPdf}
            />
          </View>
        }
      />

      {/* Filter & Search Bar */}
      <View style={[styles.filterBarWrapper, { backgroundColor: colors.white, borderBottomColor: colors.gray100 }]}>
        <View
          style={[
            styles.filterBarContainer,
            isTablet && {
              maxWidth: isTabletLandscape ? 1320 : 1040,
              alignSelf: 'center',
              width: '100%',
              paddingHorizontal: isTabletLandscape ? 32 : 24,
            },
          ]}
        >
          {isSearchOpen ? (
            /* Full-width Search Bar */
            <View
              style={[
                styles.searchBarRow,
                {
                  backgroundColor: colors.gray100,
                  borderColor: colors.gray200,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
                isTablet && { height: 48, paddingHorizontal: 16 },
              ]}
            >
              <Ionicons
                name="search"
                size={isTablet ? 22 : 18}
                color={colors.gray400}
                style={{ marginHorizontal: 4 }}
              />
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.searchInput,
                  {
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                    fontSize: isTablet ? 15 : 13.5,
                  },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                ]}
                value={query}
                onChangeText={setQuery}
                placeholder={t('sales.searchHistoryPlaceholder', 'گەڕان بە پسوڵە، کڕیار، ژمارە...')}
                placeholderTextColor={colors.gray400}
                returnKeyType="search"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => setQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={isTablet ? 20 : 18} color={colors.gray400} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setIsSearchOpen(false);
                }}
                style={[
                  styles.searchCloseBtn,
                  {
                    backgroundColor: colors.white,
                    borderColor: colors.gray200,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                  isTablet && { paddingHorizontal: 14, paddingVertical: 8 },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={isTablet ? 18 : 16} color={colors.gray600} />
                <Text
                  style={[
                    styles.searchCloseText,
                    { color: colors.gray600 },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    isTablet && { fontSize: 13.5 },
                  ]}
                >
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Standard Filter Bar with search toggle button on the right of 'ئەمڕۆ' in RTL */
            <View
              style={[
                styles.barRow,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              {/* Search Toggle Icon Button */}
              <TouchableOpacity
                style={[
                  styles.searchToggleBtn,
                  {
                    backgroundColor: query ? colors.primary + '18' : colors.gray100,
                    borderColor: query ? colors.primary : colors.gray200,
                    marginRight: isRTL ? (isTablet ? 24 : 12) : 6,
                    marginLeft: isRTL ? 6 : (isTablet ? 24 : 12),
                  },
                  isTablet && { width: 44, height: 44, borderRadius: 22 },
                ]}
                onPress={() => setIsSearchOpen(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Search"
              >
                <Ionicons
                  name="search"
                  size={isTablet ? 20 : 18}
                  color={query ? colors.primary : colors.gray600}
                />
                {query.length > 0 && (
                  <View style={[styles.searchBadge, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>

              {/* Filter Pills ScrollView */}
              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={[
                  styles.scrollView,
                  isRTL ? { transform: [{ scaleX: -1 }] } : undefined,
                ]}
                contentContainerStyle={[
                  styles.pillsRow,
                  {
                    paddingHorizontal: isTabletLandscape ? 24 : 16,
                  },
                  isTablet && { paddingVertical: isTabletLandscape ? 12 : 10, gap: isTablet ? 10 : 8 },
                ]}
              >
                {filterKeys.map((key) => {
                  const active = period === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => handlePeriodTabPress(key)}
                      style={[
                        styles.pill,
                        isRTL && { transform: [{ scaleX: -1 }] },
                        {
                          backgroundColor: active ? colors.primaryDark : colors.gray100,
                          borderColor: active ? colors.primaryDark : colors.gray200,
                          paddingHorizontal: isTabletLandscape ? 20 : isTablet ? 16 : 13,
                        },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color: active ? colors.white : colors.gray700,
                            textAlign,
                          },
                          isKuOrAr && { fontFamily: active ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT_REGULAR },
                        ]}
                      >
                        {filterLabels[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Custom Date Range Badge */}
          {period === 'custom' && !isSearchOpen && (
            <View
              style={[
                styles.customRangeBanner,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  paddingHorizontal: isTablet ? 24 : 16,
                },
              ]}
            >
              <Ionicons name="calendar" size={13} color={colors.primary} />
              <Text style={[styles.customRangeText, { color: colors.primary }]}>
                {periodDisplayLabel}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Count Strip */}
      <View
        style={[
          styles.countStrip,
          {
            backgroundColor: colors.white,
            borderBottomColor: colors.gray100,
            justifyContent: isRTL ? 'flex-end' : 'flex-start',
          },
          isTablet && {
            maxWidth: isTabletLandscape ? 1320 : 1040,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: isTabletLandscape ? 32 : 24,
          },
        ]}
      >
        <Text style={[styles.countText, { color: colors.gray500, textAlign }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }]}>
          {results.length} {isAr ? 'فاتورة مبيعات' : isKuLanguage ? 'پسوولەی فرۆشتن' : 'sales invoices'}
        </Text>
      </View>

      {/* Sales Invoices List */}
      <FlatList
        key={`sales-hist-${viewMode}-${numColumns}-${isRTL ? 'rtl' : 'ltr'}`}
        data={gridFormattedSales}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        numColumns={numColumns}
        columnWrapperStyle={
          numColumns > 1
            ? {
                gap: 12,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }
            : undefined
        }
        contentContainerStyle={[styles.list, isTablet && contentContainerStyle, results.length === 0 && styles.listEmpty]}
        removeClippedSubviews
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
        ListEmptyComponent={
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 250 }}
            style={styles.empty}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
              <Ionicons name={hasQuery ? 'search-outline' : 'calendar-outline'} size={40} color={colors.gray300} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.black, textAlign: 'center' }]}>
              {isLoading
                ? t('common.loading')
                : hasQuery
                ? t('inventory.noResults')
                : t('sales.noSalesInPeriod')}
            </Text>
            {!isLoading && (
              <Text style={[styles.emptySub, { color: colors.gray400 }]}>
                {hasQuery
                  ? t('inventory.noResultsSub')
                  : `${periodDisplayLabel} — ${t('sales.noSalesToExport')}`}
              </Text>
            )}
            {period !== 'all' && !hasQuery && (
              <TouchableOpacity
                onPress={() => handlePeriodSelect('all')}
                style={[
                  styles.emptyActionBtn,
                  {
                    backgroundColor: colors.softBlue,
                    borderColor: colors.primary + '35',
                    flexDirection,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons name="infinite-outline" size={16} color={colors.primary} />
                <Text
                  style={[
                    styles.emptyActionBtnText,
                    { color: colors.primary },
                    isKuLanguage && applyKurdishFont(true, {}),
                  ]}
                >
                  {t('sales.allPeriods')}
                </Text>
                <View
                  style={[
                    styles.emptyCountBadge,
                    {
                      backgroundColor: colors.primary + '18',
                      borderColor: colors.primary + '30',
                    },
                  ]}
                >
                  <Text style={[styles.emptyCountText, { color: colors.primary }]}>
                    {sales.length}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </MotiView>
        }
      />

      {/* Period Filter Modal */}
      <PeriodFilterModal
        visible={periodSheetVisible}
        onClose={() => setPeriodSheetVisible(false)}
        onSelect={handlePeriodSelect}
        current={period}
        includeAll
        onExportPdf={handleExportPdf}
        isExportingPdf={isExporting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerActions: {
    gap: 8,
    alignItems: 'center',
  },

  filterBarWrapper: {
    borderBottomWidth: 1,
  },
  filterBarContainer: {
    width: '100%',
  },
  barRow: {
    alignItems: 'center',
    paddingVertical: 7,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  pillsRow: {
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    paddingVertical: 7,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  searchToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchBarRow: {
    height: 44,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
  },
  searchCloseBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchCloseText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  customRangeBanner: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    paddingTop: 2,
  },
  customRangeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countStrip: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },

  list:      { padding: 16, paddingTop: 8, paddingBottom: 24 },
  listEmpty: { flex: 1 },

  empty: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingTop:        60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width:          88,
    height:         88,
    borderRadius:   24,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyActionBtn: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
