import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { useTranslation } from 'react-i18next';
import { useInventoryStore } from '@/store/inventoryStore';
import { useBusinessStore } from '@/store/businessStore';
import { shareInventoryHistoryAuditReport } from '@/lib/generateInvoice';
import { InventoryHistoryItem } from '@/components/inventory/InventoryHistoryItem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';
import { PeriodFilterModal } from '@/components/shared/PeriodFilterModal';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { isDateWithinRange, formatDateShort, type PeriodKey } from '@/utils/dateRanges';
import { toEnglishDigits } from '@/utils/formatters';
import type { InventoryHistoryItem as HistoryItem } from '@/types/inventory';

export default function InventoryHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const isAr = useLanguageStore((s) => s.language === 'ar');

  const {
    inventoryHistory,
    loadInventoryHistory,
    restoreFromHistory,
  } = useInventoryStore();

  const {
    period,
    bounds,
    periodSheetVisible,
    setPeriodSheetVisible,
    handlePeriodSelect,
  } = usePeriodFilter('today');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadInventoryHistory();
  }, [loadInventoryHistory]);

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInventoryHistory();
    setRefreshing(false);
  }, [loadInventoryHistory]);

  const handleRestore = useCallback((item: HistoryItem) => {
    Alert.alert(
      t('inventoryHistory.restoreTitle'),
      t('inventoryHistory.restoreMsg', { name: item.productName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('inventoryHistory.restoreConfirm'),
          onPress: async () => {
            try {
              await restoreFromHistory(item.id);
            } catch (err) {
              const msg = err instanceof Error ? err.message : '';
              if (msg.startsWith('ITEM_LIMIT_REACHED|') || msg.startsWith('USAGE_LIMIT_')) {
                const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
                showUsageLimitModal();
              } else {
                Alert.alert(t('common.error'), t('common.tryAgain'));
              }
            }
          },
        },
      ]
    );
  }, [restoreFromHistory, t, router]);

  // Section is strictly dedicated to deleted products (status === 'removed')
  const deletedProducts = useMemo(() => {
    return inventoryHistory.filter((h) => h.status === 'removed');
  }, [inventoryHistory]);

  const periodFiltered = useMemo(() => {
    if (period === 'all') return deletedProducts;
    return deletedProducts.filter((item) =>
      isDateWithinRange(item.archivedAt, bounds.from, bounds.to)
    );
  }, [deletedProducts, period, bounds]);

  const searchLower = toEnglishDigits(searchQuery).trim().toLowerCase();

  const finalFiltered = useMemo(() => {
    if (!searchLower) return periodFiltered;
    return periodFiltered.filter((item) => {
      const nameMatch = item.productName?.toLowerCase().includes(searchLower);
      const codeMatch = item.itemId?.toLowerCase().includes(searchLower);
      const catMatch  = item.category?.toLowerCase().includes(searchLower);
      return nameMatch || codeMatch || catMatch;
    });
  }, [periodFiltered, searchLower]);

  const filterKeys: PeriodKey[] = ['today', 'week', 'month', 'year', 'all', 'custom'];
  const filterLabels: Record<PeriodKey, string> = {
    today:  isAr ? 'اليوم' : isKurdish ? 'ئەمڕۆ' : t('common.today', 'Today'),
    week:   isAr ? 'هذا الأسبوع' : isKurdish ? 'ئەم هەفتەیە' : t('common.thisWeek', 'This Week'),
    month:  isAr ? 'هذا الشهر' : isKurdish ? 'ئەم مانگە' : t('common.thisMonth', 'This Month'),
    year:   isAr ? 'هذا العام' : isKurdish ? 'ئەمساڵ' : t('reports.year', 'This Year'),
    all:    isAr ? 'الكل' : isKurdish ? 'هەمووی' : 'All',
    custom: isAr ? 'مخصص' : isKurdish ? 'دیاریکراو' : t('reports.custom', 'Custom'),
  };

  const periodDisplayLabel = useMemo(() => {
    if (period === 'today') return isAr ? 'اليوم' : isKurdish ? 'ئەمڕۆ' : t('common.today', 'Today');
    if (period === 'week') return isAr ? 'هذا الأسبوع' : isKurdish ? 'ئەم هەفتەیە' : t('common.thisWeek', 'This Week');
    if (period === 'month') return isAr ? 'هذا الشهر' : isKurdish ? 'ئەم مانگە' : t('common.thisMonth', 'This Month');
    if (period === 'year') return isAr ? 'هذا العام' : isKurdish ? 'ئەمساڵ' : t('reports.year', 'This Year');
    if (period === 'all') return isAr ? 'الكل' : isKurdish ? 'هەمووی' : 'All';
    return `${formatDateShort(bounds.from)} → ${formatDateShort(bounds.to)}`;
  }, [period, bounds, isKurdish, isAr, t]);

  const handlePeriodTabPress = (key: PeriodKey) => {
    if (key === 'custom') {
      setPeriodSheetVisible(true);
    } else {
      handlePeriodSelect(key);
    }
  };

  const handleExportPdf = useCallback(async () => {
    if (finalFiltered.length === 0) {
      Alert.alert(
        isKurdish ? 'ئاگاداری' : 'Notice',
        isKurdish ? 'هیچ بەرهەمێکی سڕاوە نییە بۆ دەرهێنانی پدیف' : 'No deleted products to export'
      );
      return;
    }
    setIsExporting(true);
    try {
      const business = useBusinessStore.getState();
      await shareInventoryHistoryAuditReport(finalFiltered, periodDisplayLabel, {
        name: business.name || 'My Store',
        phone: business.phone || '',
        address: business.address || '',
        logoUri: business.logoUri ?? null,
      });
    } catch (err) {
      console.error('[InventoryHistory] Export PDF failed:', err);
      Alert.alert(isKurdish ? 'هەڵە' : 'Error', String(err));
    } finally {
      setIsExporting(false);
    }
  }, [finalFiltered, periodDisplayLabel, isKurdish]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
    handlePeriodSelect('all');
  };

  const renderEmpty = () => {
    const isFiltered = searchQuery.length > 0 || period !== 'all';
    return (
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 300 }}
        style={styles.emptyContainer}
      >
        <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
          <Ionicons
            name={isFiltered ? 'search-outline' : 'trash-bin-outline'}
            size={40}
            color={colors.gray300}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.black }]}>
          {isFiltered
            ? t('inventoryHistory.noFilterResults', 'هیچ بەرهەمێکی سڕاوە نەدۆزرایەوە')
            : t('inventoryHistory.noHistory', 'هیچ بەرهەمێکی سڕاوە نییە')}
        </Text>
        <Text style={[styles.emptySub, { color: colors.gray400 }]}>
          {isFiltered
            ? t('inventoryHistory.noFilterResultsDetail', 'هیچ بەرهەمێک لەگەڵ ئەم گەڕانە و ماوەیە ناگونجێت')
            : t('inventoryHistory.noHistoryDetail', 'بەرهەمە سڕاوەکان لەم بەشەدا دەردەکەون و دەتوانیت بیانگەڕێنیتەوە')}
        </Text>

        {isFiltered && (
          <TouchableOpacity
            style={[styles.clearFilterBtn, { backgroundColor: colors.primary }]}
            onPress={resetAllFilters}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
            <Text
              style={[
                styles.clearFilterText,
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {t('inventoryHistory.clearFilters', 'پاککردنەوەی فلتەر')}
            </Text>
          </TouchableOpacity>
        )}
      </MotiView>
    );
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: HistoryItem;
    index: number;
  }) => (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'spring',
        damping: 18,
        stiffness: 200,
        delay: Math.min(index * 25, 250),
      }}
    >
      <InventoryHistoryItem
        item={item}
        onRestore={() => handleRestore(item)}
      />
    </MotiView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('inventoryHistory.title')}
        showBack
        onBack={() => router.back()}
        rightAction={
          <HeaderActionButton
            icon="document-text-outline"
            onPress={handleExportPdf}
          />
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
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR },
                ]}
                value={searchQuery}
                onChangeText={(v) => setSearchQuery(toEnglishDigits(v))}
                placeholder={t('inventoryHistory.searchPlaceholder', 'گەڕان بەپێی ناوی بەرهەم، کۆد، پۆلێن...')}
                placeholderTextColor={colors.gray400}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={isTablet ? 20 : 18} color={colors.gray400} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
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
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    isTablet && { fontSize: 13.5 },
                  ]}
                >
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Standard Filter Bar with search button on the right of 'ئەمڕۆ' in RTL */
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
                    backgroundColor: searchQuery ? colors.primary + '18' : colors.gray100,
                    borderColor: searchQuery ? colors.primary : colors.gray200,
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
                  color={searchQuery ? colors.primary : colors.gray600}
                />
                {searchQuery.length > 0 && (
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
                          isKurdish && { fontFamily: active ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT_REGULAR },
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
        <Text style={[styles.countText, { color: colors.gray500, textAlign }]}>
          {finalFiltered.length} {t('inventoryHistory.deletedCount', 'بەرهەمی سڕاوە')}
        </Text>
      </View>

      {/* Deleted Products List */}
      <FlatList
        data={finalFiltered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          finalFiltered.length === 0 && styles.listEmpty,
          isTablet && {
            maxWidth: isTabletLandscape ? 1320 : 1040,
            alignSelf: 'center',
            width: '100%',
            paddingHorizontal: isTabletLandscape ? 32 : 24,
          },
        ]}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
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
  container: {
    flex: 1,
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
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  listEmpty: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Theme.radius.full,
    marginTop: 4,
  },
  clearFilterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
