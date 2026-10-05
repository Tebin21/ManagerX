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
import { attachItemsToSales } from '@/lib/sqlite';
import { shareSalesAuditReport } from '@/lib/generateInvoice';
import type { Sale } from '@/types/sales';

interface FilterPill {
  key: PeriodKey;
  labelKey: string;
}

const FILTER_PILLS: FilterPill[] = [
  { key: 'today',  labelKey: 'common.today' },
  { key: 'week',   labelKey: 'common.thisWeek' },
  { key: 'month',  labelKey: 'common.thisMonth' },
  { key: 'year',   labelKey: 'reports.year' },
  { key: 'custom', labelKey: 'reports.custom' },
  { key: 'all',    labelKey: 'sales.allPeriods' },
];

export default function SalesHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, flexDirection } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { sales, searchSales, loadSales, isLoading } = useSalesStore();

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
  const summary = useMemo(() => {
    const totalRev = results.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalDebt = results.reduce((sum, s) => sum + (s.remainingDebt || 0), 0);
    const totalPaid = results.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    return {
      count: results.length,
      totalRevenue: totalRev,
      totalDebt,
      totalPaid,
    };
  }, [results]);

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

  const renderItem = useCallback(
    ({ item }: { item: Sale }) => (
      <SaleHistoryItem sale={item} onPress={() => router.push(`/(app)/sales/${item.id}` as never)} />
    ),
    [router]
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
              icon="calendar-outline"
              onPress={() => setPeriodSheetVisible(true)}
            />
            <HeaderActionButton
              icon="share-outline"
              onPress={handleExportPdf}
              loading={isExporting}
            />
          </View>
        }
      />

      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.white, flexDirection }]}>
        <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
        <TextInput
          style={[
            styles.searchInput,
            {
              color: colors.black,
              textAlign: searchIsRTL ? 'right' : 'left',
              writingDirection: searchIsRTL ? 'rtl' : 'ltr',
            },
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
            <Ionicons name="close-circle" size={16} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Period Filter Quick Pills */}
      <View style={styles.pillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.pillsScroll, { flexDirection }]}
        >
          {FILTER_PILLS.map((pill) => {
            const isActive = period === pill.key;
            return (
              <TouchableOpacity
                key={pill.key}
                onPress={() => {
                  if (pill.key === 'custom') {
                    setPeriodSheetVisible(true);
                  } else {
                    handlePeriodSelect(pill.key);
                  }
                }}
                activeOpacity={0.8}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isActive ? colors.primary : (isDark ? colors.gray100 : colors.white),
                    borderColor: isActive ? colors.primary : colors.gray200,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: isActive ? '#FFFFFF' : (isDark ? colors.gray600 : colors.gray700),
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {t(pill.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Summary KPI Strip */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: isDark ? colors.gray100 : colors.white,
            borderColor: colors.gray200,
            flexDirection,
          },
        ]}
      >
        <View style={styles.summaryLeft}>
          <View style={[styles.summaryTitleRow, { flexDirection }]}>
            <Text style={[styles.summaryTitle, { color: colors.gray500 }]}>
              {periodDisplayLabel}:
            </Text>
            <Text style={[styles.summaryCount, { color: colors.gray400 }]}>
              ({summary.count} {t('sales.invoicesCount')})
            </Text>
          </View>
          <View style={[styles.summaryAmountRow, { flexDirection }]}>
            <AmountText
              value={summary.totalRevenue}
              currency="IQD"
              style={[styles.summaryTotal, { color: colors.primary }]}
            />
            {summary.totalDebt > 0 && (
              <View style={[styles.debtBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEF2F2' }]}>
                <Text style={styles.debtBadgeText}>
                  - {t('sales.remainingDebt')}: <AmountText value={summary.totalDebt} variant="small" style={{ color: colors.error }} />
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleExportPdf}
          disabled={isExporting || results.length === 0}
          activeOpacity={0.85}
          style={[
            styles.pdfBtn,
            {
              backgroundColor: colors.softBlue,
              borderColor: colors.primary + '30',
              opacity: results.length === 0 ? 0.5 : 1,
            },
          ]}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={17} color={colors.primary} />
              <Text style={[styles.pdfBtnText, { color: colors.primary }]}>
                {t('sales.salesAudit')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Sales Invoices List */}
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, results.length === 0 && styles.listEmpty]}
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
                style={[styles.emptyActionBtn, { backgroundColor: colors.softBlue, borderColor: colors.primary + '35' }]}
                activeOpacity={0.8}
              >
                <Ionicons name="infinite-outline" size={16} color={colors.primary} />
                <Text style={[styles.emptyActionBtnText, { color: colors.primary }]}>
                  {t('sales.allPeriods')} ({sales.length})
                </Text>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerActions: {
    alignItems: 'center',
    gap: 8,
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

  pillsContainer: {
    marginBottom: 8,
  },
  pillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12.5,
  },

  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    ...Theme.shadow.soft,
  },
  summaryLeft: {
    flex: 1,
    gap: 2,
  },
  summaryTitleRow: {
    alignItems: 'center',
    gap: 6,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryCount: {
    fontSize: 11.5,
  },
  summaryAmountRow: {
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryTotal: {
    fontSize: 17,
    fontWeight: '800',
  },
  debtBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  debtBadgeText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },

  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pdfBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
