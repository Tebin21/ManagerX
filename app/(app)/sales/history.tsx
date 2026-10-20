import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  FlatList,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
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
import { useLanguageStore } from '@/store/languageStore';
import { containsKurdishScript, applyKurdishFont } from '@/lib/settingsFont';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { isDateWithinRange, formatDateShort, type PeriodKey } from '@/utils/dateRanges';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { attachItemsToSales } from '@/lib/sqlite';
import { shareSalesAuditReport } from '@/lib/generateInvoice';
import { useResponsive } from '@/hooks/useResponsive';
import type { Sale } from '@/types/sales';

const VIEW_MODE_STORAGE_KEY = '@froshiar_sales_history_view_mode';

export default function SalesHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { sales, searchSales, loadSales, isLoading } = useSalesStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [query, setQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Period filter state — defaults to 'today' (ئەمڕۆ)
  const {
    period,
    bounds,
    periodSheetVisible,
    setPeriodSheetVisible,
    handlePeriodSelect,
  } = usePeriodFilter();

  useEffect(() => {
    loadSales();
    AsyncStorage.getItem(VIEW_MODE_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'grid' || saved === 'list') {
          setViewMode(saved);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleViewMode = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    setViewMode((prev) => {
      const next = prev === 'grid' ? 'list' : 'grid';
      AsyncStorage.setItem(VIEW_MODE_STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  // Filter sales by selected period bounds
  const periodFilteredSales = useMemo(() => {
    if (period === 'all') return sales;
    return sales.filter((s) => isDateWithinRange(s.date ?? s.createdAt, bounds.from, bounds.to));
  }, [sales, period, bounds]);

  // Search filter on top of the period-filtered sales
  const results = useMemo(() => {
    if (!query.trim()) return periodFilteredSales;
    const q = query.trim().toLowerCase();
    return periodFilteredSales.filter((s) => {
      const inv = (s.invoiceNumber || '').toLowerCase();
      const cust = (s.customerName || '').toLowerCase();
      const phone = (s.customerPhone || '').toLowerCase();
      return inv.includes(q) || cust.includes(q) || phone.includes(q);
    });
  }, [query, periodFilteredSales]);

  // Aggregate stats for the current view
  // Readable label for the current active period
  const periodDisplayLabel = useMemo(() => {
    if (period === 'today') return isKuLanguage ? 'ئەمڕۆ' : 'Today';
    if (period === 'week') return isKuLanguage ? 'ئەم هەفتەیە' : 'This Week';
    if (period === 'month') return isKuLanguage ? 'ئەم مانگە' : 'This Month';
    if (period === 'year') return isKuLanguage ? 'ئەم ساڵ' : 'This Year';
    if (period === 'all') return isKuLanguage ? 'هەمووی' : 'All Time';
    return `${formatDateShort(bounds.from)} → ${formatDateShort(bounds.to)}`;
  }, [period, bounds, isKuLanguage]);

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

  const queryIsKurdish = useMemo(() => containsKurdishScript(query), [query]);
  const searchIsRTL = query.length > 0 ? queryIsKurdish : isRTL;
  const inputFontIsKurdish = query.length > 0 ? queryIsKurdish : isKuLanguage;

type SaleOrFiller = Sale | { id: string; isFiller: true };

  const numColumns = useMemo(() => {
    if (viewMode === 'list') {
      return isTablet ? (isTabletLandscape ? 2 : 1) : 1;
    }
    // 'grid' mode (چوارگۆشە)
    return isTabletLandscape ? 4 : isTablet ? 3 : 2;
  }, [viewMode, isTablet, isTabletLandscape]);

  // Balance out incomplete rows in grid view with transparent fillers
  const gridFormattedSales: SaleOrFiller[] = useMemo(() => {
    if (viewMode !== 'grid' || numColumns <= 1 || results.length === 0) {
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
  }, [results, viewMode, numColumns]);

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
              onPress={() => router.push(`/(app)/sales/${item.id}` as never)}
            />
          ) : (
            <SaleHistoryItem
              sale={item as Sale}
              onPress={() => router.push(`/(app)/sales/${item.id}` as never)}
            />
          )}
        </MotiView>
      );
    },
    [router, viewMode]
  );

  const hasQuery = query.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('sales.history')}
        showBack
        onBack={() => router.back()}
        rightAction={
          <View style={[styles.headerActions, { flexDirection }]}>
            <HeaderActionButton
              icon={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
              onPress={handleToggleViewMode}
            />
            <HeaderActionButton
              icon="options-outline"
              onPress={() => setPeriodSheetVisible(true)}
            />
          </View>
        }
      />

      {/* Search Bar */}
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.white, flexDirection },
          isTablet && contentContainerStyle,
          isTablet && { height: 54, paddingHorizontal: 16 },
        ]}
      >
        <Ionicons name="search" size={isTablet ? 20 : 16} color={colors.gray400} style={styles.searchIcon} />
        <TextInput
          style={[
            styles.searchInput,
            {
              color: colors.black,
              textAlign: searchIsRTL ? 'right' : 'left',
              writingDirection: searchIsRTL ? 'rtl' : 'ltr',
            },
            isTablet && { fontSize: 17 },
            applyKurdishFont(inputFontIsKurdish, {}),
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('sales.searchHistoryPlaceholder')}
          placeholderTextColor={colors.gray400}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={isTablet ? 20 : 16} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sales Invoices List */}
      <FlatList
        key={`sales-hist-${viewMode}-${numColumns}`}
        data={gridFormattedSales}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
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

  searchWrap: {
    alignItems:        'center',
    borderRadius:      Theme.radius.lg,
    marginHorizontal:  16,
    marginTop:         8,
    marginBottom:      8,
    paddingHorizontal: 12,
    height:            44,
    gap:               8,
    ...Theme.shadow.soft,
  },
  searchIcon:  { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },

  list:      { padding: 16, paddingTop: 4, paddingBottom: 24 },
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
