import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PurchaseHistoryItem } from '@/components/purchases/PurchaseHistoryItem';
import { PurchaseGridCard } from '@/components/purchases/PurchaseGridCard';
import { PeriodFilterModal } from '@/components/shared/PeriodFilterModal';
import { useTranslation } from 'react-i18next';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBusinessStore } from '@/store/businessStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import type { Purchase } from '@/types/purchases';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT_REGULAR } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { isDateWithinRange, formatDateShort, type PeriodKey } from '@/utils/dateRanges';
import { sharePurchasesAuditReport } from '@/lib/generateInvoice';
import * as Haptics from 'expo-haptics';

export default function PurchaseHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const { flexDirection, textAlign, writingDirection, isRTL } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isAr = useLanguageStore((s) => s.language === 'ar');
  const isKuOrAr = isKuLanguage || isAr;
  const { purchases, loadPurchases, deletePurchase } = usePurchaseStore();

  const purchaseHistoryGridLayout = useSettingsStore((s) => s.purchaseHistoryGridLayout);
  const setPurchaseHistoryGridLayout = useSettingsStore((s) => s.setPurchaseHistoryGridLayout);
  const viewMode: 'grid' | 'list' = purchaseHistoryGridLayout ? 'grid' : 'list';

  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
    loadPurchases();
  }, [loadPurchases]);

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
    await loadPurchases();
    setRefreshing(false);
  }, [loadPurchases]);

  function confirmDelete(purchase: Purchase) {
    Alert.alert(
      t('purchases.deleteConfirmTitle'),
      t('purchases.deleteConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('purchases.confirmDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePurchase(purchase.id);
            } catch (err: any) {
              if (err?.message === 'PURCHASE_HAS_SALES') {
                Alert.alert(t('purchases.cannotDeleteTitle'), t('purchases.cannotDeleteHasSales'));
              } else if (err?.message === 'PURCHASE_HAS_ACTIVE_DEBT') {
                Alert.alert(t('purchases.cannotDeleteTitle'), t('purchases.cannotDeleteHasDebt'));
              } else {
                Alert.alert(t('common.error'), t('common.tryAgain'));
              }
            }
          },
        },
      ]
    );
  }

  // Filter purchases by selected period bounds
  const periodFilteredPurchases = useMemo(() => {
    if (period === 'all') return purchases;
    return purchases.filter((p) => {
      const dStr = p.date ? (p.date.length === 10 ? `${p.date}T12:00:00` : p.date) : p.createdAt;
      return isDateWithinRange(dStr, bounds.from, bounds.to);
    });
  }, [purchases, period, bounds]);

  // Search filter on top of the period-filtered purchases: product, supplier name, phone, address, etc.
  const visible = useMemo(() => {
    if (!query.trim()) return periodFilteredPurchases;
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return periodFilteredPurchases.filter((p) => {
      const num = (p.purchaseNumber || '').toLowerCase();
      const prod = (p.productName || '').toLowerCase();
      const supp = (p.supplierName || '').toLowerCase();
      const phone = (p.supplierPhone || '').toLowerCase();
      const addr = (p.supplierAddress || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const notes = (p.notes || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const warranty = (p.warranty || '').toLowerCase();
      const phoneDigits = (p.supplierPhone || '').replace(/\D/g, '');
      const matchPhoneDigits = Boolean(qDigits.length > 2 && phoneDigits.includes(qDigits));
      const matchItemIds = Boolean(p.itemIds?.some((id) => id.toLowerCase().includes(q)));

      return (
        num.includes(q) ||
        prod.includes(q) ||
        supp.includes(q) ||
        phone.includes(q) ||
        matchPhoneDigits ||
        addr.includes(q) ||
        cat.includes(q) ||
        notes.includes(q) ||
        desc.includes(q) ||
        warranty.includes(q) ||
        matchItemIds
      );
    });
  }, [query, periodFilteredPurchases]);

  // Human readable label for active period
  const periodDisplayLabel = useMemo(() => {
    if (period === 'today') return isAr ? 'اليوم' : isKuLanguage ? 'ئەمڕۆ' : 'Today';
    if (period === 'week') return isAr ? 'هذا الأسبوع' : isKuLanguage ? 'ئەم هەفتەیە' : 'This Week';
    if (period === 'month') return isAr ? 'هذا الشهر' : isKuLanguage ? 'ئەم مانگە' : 'This Month';
    if (period === 'year') return isAr ? 'هذا العام' : isKuLanguage ? 'ئەم ساڵ' : 'This Year';
    if (period === 'all') return isAr ? 'الكل' : isKuLanguage ? 'هەمووی' : 'All Time';
    return `${formatDateShort(bounds.from)} → ${formatDateShort(bounds.to)}`;
  }, [period, bounds, isKuLanguage, isAr]);

  // Export PDF Purchases Audit Report
  const handleExportPdf = useCallback(async () => {
    if (visible.length === 0) {
      Alert.alert(
        isKuLanguage ? 'ئاگاداری' : 'Notice',
        t('purchases.noPurchasesToExport')
      );
      return;
    }
    setIsExporting(true);
    try {
      const business = useBusinessStore.getState();
      await sharePurchasesAuditReport(visible, periodDisplayLabel, {
        name: business.name || 'My Store',
        phone: business.phone || '',
        address: business.address || '',
        logoUri: business.logoUri ?? null,
      });
    } catch (err) {
      console.error('[PurchaseHistory] Export PDF failed:', err);
      Alert.alert(isKuLanguage ? 'هەڵە' : 'Error', String(err));
    } finally {
      setIsExporting(false);
    }
  }, [visible, periodDisplayLabel, isKuLanguage, t]);

  const hasQuery = query.trim().length > 0;

  const renderEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons
          name={hasQuery ? 'search-outline' : purchases.length === 0 ? 'cart-outline' : 'calendar-outline'}
          size={48}
          color={colors.gray300}
        />
      </View>
      {hasQuery ? (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('inventory.noResultsSub')}</Text>
        </>
      ) : purchases.length === 0 ? (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('purchases.noHistory')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('purchases.noHistoryDetail')}</Text>
          <TouchableOpacity
            style={[styles.emptyAction, { backgroundColor: colors.primary, flexDirection }]}
            onPress={() => router.push('/(app)/purchases/new-purchase' as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={[styles.emptyActionText, { color: colors.white }]}>{t('purchases.addFirstPurchase')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('purchases.noPurchasesInPeriod')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>
            {`${periodDisplayLabel} — ${t('purchases.noPurchasesToExport')}`}
          </Text>
          {period !== 'all' && (
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
                {t('purchases.allPeriods')}
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
                  {purchases.length}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </>
      )}
    </MotiView>
  );

type PurchaseOrFiller = Purchase | { id: string | number; isFiller: true };

  const numColumns = useMemo(() => {
    if (viewMode === 'list') {
      return isTablet ? (isTabletLandscape ? 2 : 1) : 1;
    }
    // 'grid' mode (چوارگۆشە)
    return isTabletLandscape ? 4 : isTablet ? 3 : 2;
  }, [viewMode, isTablet, isTabletLandscape]);

  // Balance out incomplete rows in multi-column view with transparent fillers
  const gridFormattedPurchases: PurchaseOrFiller[] = useMemo(() => {
    if (numColumns <= 1 || visible.length === 0) {
      return visible;
    }
    const remainder = visible.length % numColumns;
    if (remainder === 0) return visible;
    const needed = numColumns - remainder;
    const fillers: PurchaseOrFiller[] = Array.from({ length: needed }, (_, i) => ({
      id: `__purch_filler_${i}`,
      isFiller: true as const,
    }));
    return [...visible, ...fillers];
  }, [visible, numColumns]);

  const renderItem = ({ item, index }: { item: PurchaseOrFiller; index: number }) => {
    if ('isFiller' in item && item.isFiller) {
      return <View style={{ flex: 1, marginBottom: 12, backgroundColor: 'transparent' }} />;
    }
    const purch = item as Purchase;
    return (
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: Math.min(index * 25, 250) }}
        style={{ flex: 1 }}
      >
        {viewMode === 'grid' ? (
          <PurchaseGridCard
            purchase={purch}
            onPress={() => router.push({ pathname: '/(app)/invoices', params: { tab: 'purchases', id: String(purch.id) } } as never)}
            onDelete={() => confirmDelete(purch)}
          />
        ) : (
          <PurchaseHistoryItem
            purchase={purch}
            onPress={() => router.push({ pathname: '/(app)/invoices', params: { tab: 'purchases', id: String(purch.id) } } as never)}
            onDelete={() => confirmDelete(purch)}
          />
        )}
      </MotiView>
    );
  };

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

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('purchases.history')}
        showBack
        onBack={() => router.back()}
        rightAction={
          <View style={[styles.headerActions, { flexDirection, gap: isTablet ? 12 : 8 }]}>
            <HeaderActionButton
              icon={purchaseHistoryGridLayout ? 'list-outline' : 'grid-outline'}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                } catch {}
                setPurchaseHistoryGridLayout(!purchaseHistoryGridLayout);
              }}
            />
            <HeaderActionButton
              icon="document-text-outline"
              onPress={handleExportPdf}
            />
            <HeaderActionButton
              icon="add"
              onPress={() => router.push('/(app)/purchases/new-purchase' as never)}
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
                placeholder={t('purchases.searchPlaceholder')}
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

      {/* Summary Strip */}
      {purchases.length > 0 && (
        <View
          style={[
            styles.summaryStrip,
            { backgroundColor: colors.white, borderBottomColor: colors.gray100, flexDirection },
            isTablet && {
              maxWidth: isTabletLandscape ? 1320 : 1040,
              alignSelf: 'center',
              width: '100%',
              paddingHorizontal: isTabletLandscape ? 32 : 24,
            },
            isTablet && { paddingVertical: 14 },
          ]}
        >
          <View style={[styles.summaryLeft, { flexDirection }]}>
            <Text style={[styles.summaryText, { color: colors.gray500 }, isTablet && { fontSize: 15 }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_REGULAR }]}>
              {visible.length} {isAr ? 'فاتورة شراء' : isKuLanguage ? 'پسوولەی کڕین' : visible.length === 1 ? 'purchase' : 'purchases'}
            </Text>
          </View>

          <AmountText
            value={visible.reduce((s, p) => s + p.totalIQD, 0)}
            currency="IQD total"
            variant={isTablet ? "default" : "small"}
            style={[styles.summaryTotal, { color: colors.primary }]}
          />
        </View>
      )}

      {/* Purchases List */}
      <FlatList
        key={`purch-hist-${viewMode}-${numColumns}-${isRTL ? 'rtl' : 'ltr'}`}
        data={gridFormattedPurchases}
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
        contentContainerStyle={[
          styles.list,
          isTablet && contentContainerStyle,
          visible.length === 0 && styles.listEmpty,
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
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
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
        exportPdfLabel={isKuLanguage ? 'دەرکردنی جەردی کڕینەکان بە PDF' : 'Export Purchases Audit (PDF)'}
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


  summaryStrip: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  summaryLeft: {
    alignItems: 'center',
    gap: 8,
  },
  summaryText: { fontSize: 13 },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryTotal: { fontSize: 13, fontWeight: '700' },

  list: { padding: 16, paddingBottom: 32 },
  listEmpty: { flex: 1 },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAction: {
    alignItems: 'center',
    gap: 6,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 20,
  },
  emptyActionText: { fontSize: 14, fontWeight: '600' },
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
