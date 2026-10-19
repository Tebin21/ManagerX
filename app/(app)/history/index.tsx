import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Keyboard,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';

import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { DashboardMetricSquare } from '@/components/dashboard/DashboardMetricSquare';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { SupplierCard } from '@/components/suppliers/SupplierCard';
import { useCustomerStore } from '@/store/customerStore';
import { useSupplierStore } from '@/store/supplierStore';
import { useDebtStore } from '@/store/debtStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { Theme, MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import type { CustomerWithStats } from '@/types/customers';
import type { SupplierWithStats } from '@/types/suppliers';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { isDateWithinRange, getPeriodBounds, formatDateShort, type PeriodKey } from '@/utils/dateRanges';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { CustomDateRangeModal } from '@/components/shared/CustomDateRangeModal';

type HistoryTab = 'report' | 'customers' | 'suppliers';

// Forces a numeric Text/AmountText to render LTR + left-aligned regardless of app language.
const NUMBER_LTR = { textAlign: 'left' as const, writingDirection: 'ltr' as const };

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, writingDirection } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();

  const historyGridLayout = useSettingsStore((s) => s.historyGridLayout);
  const setHistoryGridLayout = useSettingsStore((s) => s.setHistoryGridLayout);

  const { customers, isLoading: custLoading, loadCustomers } = useCustomerStore();
  const { suppliers, isLoading: supLoading, loadSuppliers } = useSupplierStore();
  const { purchaseDebts, loadAll: loadDebts } = useDebtStore();

  const [tab, setTab] = useState<HistoryTab>('report');
  const [query, setQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const [custRefreshing, setCustRefreshing] = useState(false);
  const [supRefreshing, setSupRefreshing] = useState(false);

  // Period filter state — defaults to 'today' (ئەمڕۆ)
  const [periodKey, setPeriodKey] = useState<PeriodKey>('today');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [fromVal, setFromVal] = useState('');
  const [toVal, setToVal] = useState('');

  const isGridView = historyGridLayout;
  const numColumns = isGridView
    ? (isTabletLandscape ? 4 : isTablet ? 3 : 2)
    : (isTabletLandscape ? 2 : 1);

  const styles = useMemo(
    () => getStyles(colors, isTablet, isTabletLandscape),
    [colors, isTablet, isTabletLandscape]
  );

  const loadAllData = useCallback(async () => {
    await Promise.all([loadCustomers(), loadSuppliers(), loadDebts()]);
  }, [loadCustomers, loadSuppliers, loadDebts]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  const onRefreshCustomers = useCallback(async () => {
    setCustRefreshing(true);
    await loadCustomers();
    setCustRefreshing(false);
  }, [loadCustomers]);

  const onRefreshSuppliers = useCallback(async () => {
    setSupRefreshing(true);
    await loadSuppliers();
    setSupRefreshing(false);
  }, [loadSuppliers]);

  // Search expansion / collapse
  const handleExpandSearch = useCallback(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchExpanded(true);
    if (tab === 'report') {
      setTab('customers');
    }
  }, [tab]);

  const handleCollapseSearch = useCallback((clearQuery = false) => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchExpanded(false);
    if (clearQuery) {
      setQuery('');
    }
    Keyboard.dismiss();
  }, []);

  // Date bounds for current period filter
  const bounds = useMemo(() => {
    if (periodKey === 'custom' && customRange) {
      return getPeriodBounds('custom', customRange.from, customRange.to);
    }
    return getPeriodBounds(periodKey);
  }, [periodKey, customRange]);

  const periodKeys: PeriodKey[] = ['today', 'week', 'month', 'year', 'all', 'custom'];
  const periodLabels: Record<PeriodKey, string> = {
    today: isKuLanguage ? 'ئەمڕۆ' : 'Today',
    week: isKuLanguage ? 'ئەم هەفتەیە' : 'This Week',
    month: isKuLanguage ? 'ئەم مانگە' : 'This Month',
    year: isKuLanguage ? 'ئەمساڵ' : 'This Year',
    all: isKuLanguage ? 'هەمووی' : 'All Time',
    custom: isKuLanguage ? 'دیاریکراو' : 'Custom',
  };

  const periodDisplayLabel = useMemo(() => {
    if (periodKey === 'custom' && customRange) {
      return `${formatDateShort(customRange.from)} - ${formatDateShort(customRange.to)}`;
    }
    return periodLabels[periodKey] || periodLabels.all;
  }, [periodKey, customRange, periodLabels]);

  // Filter by date bounds
  const periodFilteredCustomers = useMemo(() => {
    if (periodKey === 'all') return customers;
    return customers.filter((c) =>
      isDateWithinRange(c.lastPurchaseDate ?? c.createdAt, bounds.from, bounds.to)
    );
  }, [customers, periodKey, bounds]);

  const periodFilteredSuppliers = useMemo(() => {
    if (periodKey === 'all') return suppliers;
    return suppliers.filter((s) =>
      isDateWithinRange(s.lastPurchaseDate ?? s.createdAt, bounds.from, bounds.to)
    );
  }, [suppliers, periodKey, bounds]);

  // Search filter on top of date bounds
  const visibleCustomers = useMemo(() => {
    if (!query.trim()) return periodFilteredCustomers;
    const q = query.trim().toLowerCase();
    return periodFilteredCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [periodFilteredCustomers, query]);

  const visibleSuppliers = useMemo(() => {
    if (!query.trim()) return periodFilteredSuppliers;
    const q = query.trim().toLowerCase();
    return periodFilteredSuppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q))
    );
  }, [periodFilteredSuppliers, query]);

  // Grid layout dummy fillers for equal sizing on incomplete rows
  type CustomerOrFiller = CustomerWithStats | { id: string; isFiller: true };
  type SupplierOrFiller = SupplierWithStats | { id: string; isFiller: true };

  const gridFormattedCustomers: CustomerOrFiller[] = useMemo(() => {
    if (!isGridView || numColumns <= 1 || visibleCustomers.length === 0) {
      return visibleCustomers;
    }
    const remainder = visibleCustomers.length % numColumns;
    if (remainder === 0) return visibleCustomers;
    const needed = numColumns - remainder;
    const fillers: CustomerOrFiller[] = Array.from({ length: needed }, (_, i) => ({
      id: `__cust_filler_${i}`,
      isFiller: true,
    }));
    return [...visibleCustomers, ...fillers];
  }, [visibleCustomers, isGridView, numColumns]);

  const gridFormattedSuppliers: SupplierOrFiller[] = useMemo(() => {
    if (!isGridView || numColumns <= 1 || visibleSuppliers.length === 0) {
      return visibleSuppliers;
    }
    const remainder = visibleSuppliers.length % numColumns;
    if (remainder === 0) return visibleSuppliers;
    const needed = numColumns - remainder;
    const fillers: SupplierOrFiller[] = Array.from({ length: needed }, (_, i) => ({
      id: `__sup_filler_${i}`,
      isFiller: true,
    }));
    return [...visibleSuppliers, ...fillers];
  }, [visibleSuppliers, isGridView, numColumns]);

  // ── Metrics & Calculations for Report Dashboard ──
  const reportTotalCustSpent = useMemo(
    () => periodFilteredCustomers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0),
    [periodFilteredCustomers]
  );

  const reportTotalSupSpent = useMemo(
    () => periodFilteredSuppliers.reduce((sum, s) => sum + (s.totalSpent || 0), 0),
    [periodFilteredSuppliers]
  );

  const reportCustDebtors = useMemo(
    () => periodFilteredCustomers.filter((c) => (c.remainingDebt || 0) > 0).length,
    [periodFilteredCustomers]
  );

  const reportActiveSupplierDebts = useMemo(() => {
    return new Set(
      purchaseDebts
        .filter((d) => d.status === 'active' && d.remainingAmount > 0)
        .map((d) => d.supplierName.toLowerCase())
    ).size;
  }, [purchaseDebts]);

  const reportNetActivity = reportTotalCustSpent - reportTotalSupSpent;
  const netActivityColor = reportNetActivity >= 0 ? '#10B981' : colors.error;
  const netActivityDesc = reportNetActivity >= 0
    ? t('history.netActivityPositive')
    : t('history.netActivityNegative');

  const topPreviewCustomers = useMemo(() => {
    return [...periodFilteredCustomers]
      .sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0))
      .slice(0, 3);
  }, [periodFilteredCustomers]);

  const topPreviewSuppliers = useMemo(() => {
    return [...periodFilteredSuppliers]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 3);
  }, [periodFilteredSuppliers]);

  // Card click navigations
  const handleCustomerPress = useCallback((customerId: number) => {
    router.push(`/(app)/customers/${customerId}` as never);
  }, [router]);

  const handleSupplierPress = useCallback((supplierId: number) => {
    router.push(`/(app)/suppliers/${supplierId}` as never);
  }, [router]);

  const renderCustomerEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="people-outline" size={isTablet ? 56 : 48} color={colors.gray300} />
      </View>
      {query.trim() || periodKey !== 'all' ? (
        <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
      ) : (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('customers.noCustomers')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('customers.noCustomersDetail')}</Text>
          <TouchableOpacity
            style={[styles.emptyAction, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => router.push('/(app)/sales/new-sale' as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="cart-outline" size={18} color={colors.white} />
            <Text style={styles.emptyActionText}>{t('customers.makeFirstSale')}</Text>
          </TouchableOpacity>
        </>
      )}
    </MotiView>
  );

  const renderSupplierEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="business-outline" size={isTablet ? 56 : 48} color={colors.gray300} />
      </View>
      {query.trim() || periodKey !== 'all' ? (
        <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
      ) : (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('suppliers.noSuppliers')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('suppliers.noSuppliersDetail')}</Text>
          <TouchableOpacity
            style={[styles.emptyAction, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => router.push('/(app)/purchases/new-purchase' as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="cart-outline" size={18} color={colors.white} />
            <Text style={styles.emptyActionText}>{t('purchases.newPurchase')}</Text>
          </TouchableOpacity>
        </>
      )}
    </MotiView>
  );

  const renderCustomer = useCallback(({ item, index }: { item: CustomerOrFiller; index: number }) => {
    if ('isFiller' in item && item.isFiller) {
      return (
        <View
          style={{
            flex: 1,
            marginBottom: isTablet ? 12 : 8,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          }}
          pointerEvents="none"
        />
      );
    }
    const customer = item as CustomerWithStats;
    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: index < 10 ? index * 35 : 0 }}
        style={{ flex: 1 }}
      >
        <CustomerCard
          customer={customer}
          onPress={handleCustomerPress}
          layout={isGridView ? 'grid' : 'list'}
        />
      </MotiView>
    );
  }, [handleCustomerPress, isGridView, isTablet]);

  const renderSupplier = useCallback(({ item, index }: { item: SupplierOrFiller; index: number }) => {
    if ('isFiller' in item && item.isFiller) {
      return (
        <View
          style={{
            flex: 1,
            marginBottom: isTablet ? 12 : 8,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          }}
          pointerEvents="none"
        />
      );
    }
    const supplier = item as SupplierWithStats;
    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: index < 10 ? index * 35 : 0 }}
        style={{ flex: 1 }}
      >
        <SupplierCard
          supplier={supplier}
          onPress={handleSupplierPress}
          layout={isGridView ? 'grid' : 'list'}
        />
      </MotiView>
    );
  }, [handleSupplierPress, isGridView, isTablet]);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {/* ── Top Header ── */}
      <AppHeader
        title={t('history.title')}
        showBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(app)' as never);
        }}
        rightAction={
          tab !== 'report' ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                } catch {}
                setHistoryGridLayout(!historyGridLayout);
              }}
              style={[
                styles.layoutToggleBtn,
                isTablet && { width: 44, height: 44, borderRadius: 22 },
              ]}
              accessibilityLabel={historyGridLayout ? 'List View' : 'Grid View'}
            >
              <Ionicons
                name={historyGridLayout ? 'list' : 'grid'}
                size={isTablet ? 22 : 18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* ── 3-Tab Segmented Switcher (Report, Customers, Suppliers) ── */}
      <View style={[styles.segmentWrapper, { backgroundColor: colors.white, borderBottomColor: colors.gray200 }]}>
        <View style={[styles.segmentTrack, { backgroundColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Tab 1: ڕاپۆرت (Report) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { setTab('report'); handleCollapseSearch(true); }}
            style={[
              styles.segmentBtn,
              tab === 'report' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="stats-chart-outline"
              size={isTablet ? 18 : 16}
              color={tab === 'report' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: tab === 'report' ? '#FFFFFF' : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {t('history.reportTab')}
            </Text>
          </TouchableOpacity>

          {/* Tab 2: کڕیاران (Customers) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { setTab('customers'); handleCollapseSearch(true); }}
            style={[
              styles.segmentBtn,
              tab === 'customers' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="people-outline"
              size={isTablet ? 18 : 16}
              color={tab === 'customers' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: tab === 'customers' ? '#FFFFFF' : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {t('history.customersTab')}
            </Text>
            {periodFilteredCustomers.length > 0 && (
              <View style={[styles.tabBadge, tab === 'customers' ? { backgroundColor: 'rgba(255,255,255,0.3)' } : { backgroundColor: colors.gray200 }]}>
                <Text style={[styles.tabBadgeText, { color: tab === 'customers' ? '#fff' : colors.gray700 }, NUMBER_LTR]}>
                  {periodFilteredCustomers.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Tab 3: دابینکەران (Suppliers) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { setTab('suppliers'); handleCollapseSearch(true); }}
            style={[
              styles.segmentBtn,
              tab === 'suppliers' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="business-outline"
              size={isTablet ? 18 : 16}
              color={tab === 'suppliers' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: tab === 'suppliers' ? '#FFFFFF' : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {t('history.suppliersTab')}
            </Text>
            {periodFilteredSuppliers.length > 0 && (
              <View style={[styles.tabBadge, tab === 'suppliers' ? { backgroundColor: 'rgba(255,255,255,0.3)' } : { backgroundColor: colors.gray200 }]}>
                <Text style={[styles.tabBadgeText, { color: tab === 'suppliers' ? '#fff' : colors.gray700 }, NUMBER_LTR]}>
                  {periodFilteredSuppliers.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Period Filter Horizontal Bar (with expandable search icon on right of هەمووی) ── */}
      <View
        style={[
          styles.filterWrapper,
          {
            backgroundColor: colors.white,
            borderBottomWidth: tab === 'report' ? 1 : 0,
            borderBottomColor: colors.gray200,
          },
        ]}
      >
        {isSearchExpanded ? (
          <View style={[styles.expandedSearchContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.expandedSearchBox,
                {
                  backgroundColor: isDark ? colors.gray100 : colors.gray50,
                  borderColor: colors.primary,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="search" size={17} color={colors.primary} />
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.expandedSearchInput,
                  {
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                  isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: query }), {}),
                ]}
                placeholder={tab === 'suppliers' ? t('history.searchSuppliers') : t('history.searchCustomers')}
                placeholderTextColor={colors.gray400}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoFocus
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => handleCollapseSearch(true)}
              style={[styles.closeSearchBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.filterRowContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Search Icon Button - positioned on the right of هەمووی in Kurdish RTL */}
            <TouchableOpacity
              onPress={handleExpandSearch}
              style={[
                styles.searchIconBtn,
                {
                  backgroundColor: query ? colors.primary : (isDark ? colors.gray100 : colors.gray100),
                  borderColor: query ? colors.primary : colors.gray200,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="search"
                size={16}
                color={query ? '#0F172A' : (isDark ? colors.gray600 : colors.gray700)}
              />
            </TouchableOpacity>

            {/* Period Filter ScrollView */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={[styles.filterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              {periodKeys.map((key) => {
                const active = periodKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: active ? colors.primary : colors.gray100,
                        borderColor: active ? colors.primary : colors.gray200,
                      },
                    ]}
                    onPress={() => {
                      if (key === 'custom') {
                        setFromVal(customRange?.from || '');
                        setToVal(customRange?.to || '');
                        setCustomOpen(true);
                      } else {
                        setPeriodKey(key);
                        setCustomRange(null);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: active ? '#FFFFFF' : colors.gray600 },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                      ]}
                    >
                      {periodLabels[key]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Selected date range info label when custom is chosen */}
        {periodKey === 'custom' && customRange && !isSearchExpanded && (
          <Text style={[styles.rangeLabel, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
            {formatDateShort(customRange.from)} - {formatDateShort(customRange.to)}
          </Text>
        )}
      </View>

      {/* ── Tab Content ── */}
      {tab === 'report' ? (
        /* ═══════════════════════════════════════════════════════════════
           TAB 1: ڕاپۆرت (REPORT DASHBOARD VIEW)
           ═══════════════════════════════════════════════════════════════ */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.reportScrollContent, isTablet && contentContainerStyle]}
          refreshControl={
            <RefreshControl
              refreshing={custLoading || supLoading}
              onRefresh={loadAllData}
              tintColor={colors.primary}
            />
          }
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            if (isSearchExpanded) handleCollapseSearch(false);
          }}
          onTouchStart={() => {
            if (isSearchExpanded) handleCollapseSearch(false);
          }}
        >
          {/* 4 Dashboard Metric Squares */}
          <View style={[styles.metricGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* 1. Customer Purchases */}
            <DashboardMetricSquare
              title={t('history.customerPurchases')}
              value={reportTotalCustSpent}
              isCurrency
              icon="people"
              color="#10B981"
              subtitle={isKuLanguage ? 'کۆی فرۆشراو بە کڕیاران' : 'Customer Sales'}
              delay={30}
            />

            {/* 2. Supplier Purchases */}
            <DashboardMetricSquare
              title={t('history.supplierExpenses')}
              value={reportTotalSupSpent}
              isCurrency
              icon="business"
              color={colors.primary}
              subtitle={isKuLanguage ? 'کۆی کڕدراو لە دابینکەر' : 'Supplier Purchases'}
              delay={60}
            />

            {/* 3. Customer Debtors */}
            <DashboardMetricSquare
              title={t('history.activeDebtors')}
              value={reportCustDebtors}
              icon="alert-circle"
              color={reportCustDebtors > 0 ? colors.error : colors.gray500}
              subtitle={reportCustDebtors > 0 ? (isKuLanguage ? 'کڕیاری قەرزدار' : 'Active Debtors') : (isKuLanguage ? 'سفر' : 'None')}
              isAlert={reportCustDebtors > 0}
              delay={90}
            />

            {/* 4. Active Supplier Debts */}
            <DashboardMetricSquare
              title={t('history.activeSupplierDebts')}
              value={reportActiveSupplierDebts}
              icon="layers"
              color="#6366F1"
              subtitle={isKuLanguage ? 'دابینکەری قەرزدار' : 'Supplier Debts'}
              delay={120}
            />
          </View>

          {/* Net Activity Balance Card */}
          <View style={[styles.netBalanceCard, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
            <View style={[styles.netBalanceTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.netBalanceIconBox, { backgroundColor: netActivityColor + '18' }]}>
                <Ionicons
                  name={reportNetActivity >= 0 ? 'shield-checkmark-outline' : 'trending-down-outline'}
                  size={22}
                  color={netActivityColor}
                />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={[
                    styles.netBalanceTitle,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('history.netActivityBalance')}
                </Text>
                <Text style={[styles.netBalanceSubtitle, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>
                  {netActivityDesc}
                </Text>
              </View>
              <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                <AmountText
                  value={Math.abs(reportNetActivity)}
                  currency="IQD"
                  variant="large"
                  style={[styles.netBalanceAmount, { color: netActivityColor }, NUMBER_LTR]}
                />
              </View>
            </View>
          </View>

          {/* Quick Customers Preview Section */}
          <View style={[styles.previewSection, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
            <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people-outline" size={17} color={colors.primary} />
                <Text
                  style={[
                    styles.previewTitle,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('history.topCustomers')}
                </Text>
                <Text style={{ fontSize: 12, color: colors.gray400 }}>
                  ({periodFilteredCustomers.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setTab('customers'); setQuery(''); }}
                style={[styles.previewViewAll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={[styles.previewViewAllText, { color: colors.primary }]}>
                  {t('history.viewAll')}
                </Text>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {topPreviewCustomers.length === 0 ? (
              <Text style={[styles.previewEmptyText, { color: colors.gray400 }]}>
                {t('customers.noCustomers')}
              </Text>
            ) : (
              topPreviewCustomers.map((cust) => (
                <TouchableOpacity
                  key={cust.id}
                  onPress={() => handleCustomerPress(cust.id)}
                  style={[styles.previewRow, { borderTopColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.previewName, { color: colors.black }]} numberOfLines={1}>
                      {cust.name}
                    </Text>
                    <Text style={[styles.previewSub, { color: colors.gray400 }]}>
                      {cust.phone || '—'} {cust.lastPurchaseDate ? `• ${formatDateShort(cust.lastPurchaseDate)}` : ''}
                    </Text>
                  </View>
                  <AmountText
                    value={cust.totalPurchases || 0}
                    currency="IQD"
                    style={[{ fontSize: 14, fontWeight: '800', color: colors.primary }, NUMBER_LTR]}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Quick Suppliers Preview Section */}
          <View style={[styles.previewSection, { backgroundColor: colors.white, borderColor: colors.gray200, marginBottom: 28 }]}>
            <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="business-outline" size={17} color={colors.primary} />
                <Text
                  style={[
                    styles.previewTitle,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {t('history.topSuppliers')}
                </Text>
                <Text style={{ fontSize: 12, color: colors.gray400 }}>
                  ({periodFilteredSuppliers.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setTab('suppliers'); setQuery(''); }}
                style={[styles.previewViewAll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={[styles.previewViewAllText, { color: colors.primary }]}>
                  {t('history.viewAll')}
                </Text>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {topPreviewSuppliers.length === 0 ? (
              <Text style={[styles.previewEmptyText, { color: colors.gray400 }]}>
                {t('suppliers.noSuppliers')}
              </Text>
            ) : (
              topPreviewSuppliers.map((sup) => (
                <TouchableOpacity
                  key={sup.id}
                  onPress={() => handleSupplierPress(sup.id)}
                  style={[styles.previewRow, { borderTopColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.previewName, { color: colors.black }]} numberOfLines={1}>
                      {sup.name}
                    </Text>
                    <Text style={[styles.previewSub, { color: colors.gray400 }]}>
                      {sup.phone || '—'} {sup.lastPurchaseDate ? `• ${formatDateShort(sup.lastPurchaseDate)}` : ''}
                    </Text>
                  </View>
                  <AmountText
                    value={sup.totalSpent || 0}
                    currency="IQD"
                    style={[{ fontSize: 14, fontWeight: '800', color: colors.primary }, NUMBER_LTR]}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      ) : tab === 'customers' ? (
        /* ═══════════════════════════════════════════════════════════════
           TAB 2: کڕیاران (CUSTOMERS LIST)
           ═══════════════════════════════════════════════════════════════ */
        <>
          {/* Quick summary strip */}
          <View style={[styles.summaryStrip, { backgroundColor: colors.white, borderBottomColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.summaryStripText,
                { color: colors.gray500 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {periodDisplayLabel}{query ? ` (${isKuLanguage ? 'گەڕان' : 'Search'})` : ''}: {visibleCustomers.length} {t('history.customersTab')}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[styles.summaryStripText, { color: colors.gray500 }]}>
                {isKuLanguage ? 'کۆی کڕینیان:' : 'Total Purchases:'}
              </Text>
              <AmountText
                value={visibleCustomers.reduce((s, c) => s + (c.totalPurchases || 0), 0)}
                currency="IQD"
                variant="small"
                style={[{ color: colors.primary, fontWeight: '700' }, NUMBER_LTR]}
              />
            </View>
          </View>

          <FlatList
            key={`cust_${isGridView ? 'grid' : 'list'}_${numColumns}`}
            data={gridFormattedCustomers}
            renderItem={renderCustomer}
            keyExtractor={(item) => String(item.id)}
            numColumns={numColumns}
            contentContainerStyle={[
              styles.listContent,
              isTablet && contentContainerStyle,
              visibleCustomers.length === 0 && styles.listEmpty,
            ]}
            columnWrapperStyle={
              isGridView && numColumns > 1
                ? { gap: isTablet ? 12 : 8, marginBottom: isTablet ? 12 : 8 }
                : undefined
            }
            refreshControl={
              <RefreshControl
                refreshing={custRefreshing || custLoading}
                onRefresh={onRefreshCustomers}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={renderCustomerEmpty}
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              if (isSearchExpanded && !query) {
                handleCollapseSearch(false);
              }
            }}
          />
        </>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           TAB 3: دابینکەران (SUPPLIERS LIST)
           ═══════════════════════════════════════════════════════════════ */
        <>
          {/* Quick summary strip */}
          <View style={[styles.summaryStrip, { backgroundColor: colors.white, borderBottomColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.summaryStripText,
                { color: colors.gray500 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {periodDisplayLabel}{query ? ` (${isKuLanguage ? 'گەڕان' : 'Search'})` : ''}: {visibleSuppliers.length} {t('history.suppliersTab')}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[styles.summaryStripText, { color: colors.gray500 }]}>
                {isKuLanguage ? 'کۆی خەرجکراو:' : 'Total Spent:'}
              </Text>
              <AmountText
                value={visibleSuppliers.reduce((s, sup) => s + (sup.totalSpent || 0), 0)}
                currency="IQD"
                variant="small"
                style={[{ color: colors.primary, fontWeight: '700' }, NUMBER_LTR]}
              />
            </View>
          </View>

          <FlatList
            key={`sup_${isGridView ? 'grid' : 'list'}_${numColumns}`}
            data={gridFormattedSuppliers}
            renderItem={renderSupplier}
            keyExtractor={(item) => String(item.id)}
            numColumns={numColumns}
            contentContainerStyle={[
              styles.listContent,
              isTablet && contentContainerStyle,
              visibleSuppliers.length === 0 && styles.listEmpty,
            ]}
            columnWrapperStyle={
              isGridView && numColumns > 1
                ? { gap: isTablet ? 12 : 8, marginBottom: isTablet ? 12 : 8 }
                : undefined
            }
            refreshControl={
              <RefreshControl
                refreshing={supRefreshing || supLoading}
                onRefresh={onRefreshSuppliers}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={renderSupplierEmpty}
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              if (isSearchExpanded && !query) {
                handleCollapseSearch(false);
              }
            }}
          />
        </>
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
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

function getStyles(colors: AppColors, isTablet: boolean, isTabletLandscape: boolean) {
  return StyleSheet.create({
    container: { flex: 1 },

    layoutToggleBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ── Segmented Control Switcher (outside AppHeader) ──
    segmentWrapper: {
      paddingHorizontal: isTabletLandscape ? 24 : 16,
      paddingVertical: isTabletLandscape ? 14 : 10,
      borderBottomWidth: 1,
    },
    segmentTrack: {
      borderRadius: isTabletLandscape ? 16 : 12,
      padding: isTabletLandscape ? 5 : 3,
      gap: isTabletLandscape ? 8 : 4,
    },
    segmentBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: isTabletLandscape ? 13 : isTablet ? 11 : 9,
      paddingHorizontal: isTabletLandscape ? 12 : 6,
      borderRadius: isTabletLandscape ? 12 : 9,
      gap: 6,
    },
    segmentBtnActive: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    segmentBtnText: {
      fontSize: isTabletLandscape ? 15.5 : isTablet ? 14.5 : 13,
      fontWeight: '700',
    },
    tabBadge: {
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
    },
    tabBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },

    // ── Period Filter Pills ──
    filterWrapper: {
      borderBottomWidth: 0,
    },
    filterRowContainer: {
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    searchIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },
    expandedSearchContainer: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignItems: 'center',
      gap: 8,
      width: '100%',
    },
    expandedSearchBox: {
      flex: 1,
      height: 38,
      borderRadius: 19,
      borderWidth: 1.2,
      paddingHorizontal: 12,
      alignItems: 'center',
      gap: 8,
    },
    expandedSearchInput: {
      flex: 1,
      fontSize: 13.5,
      paddingVertical: 0,
    },
    closeSearchBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterRow: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 18,
      borderWidth: 1,
    },
    filterPillText: {
      fontSize: 12.5,
      fontWeight: '600',
    },
    rangeLabel: {
      fontSize: 11,
      fontWeight: '500',
      paddingHorizontal: 16,
      paddingBottom: 6,
    },

    // ── Report Dashboard View ──
    reportScrollContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 24,
    },
    metricGrid: {
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    netBalanceCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 2,
    },
    netBalanceTop: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    netBalanceIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    netBalanceTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 2,
    },
    netBalanceSubtitle: {
      fontSize: 11,
      lineHeight: 15,
    },
    netBalanceAmount: {
      fontWeight: '800',
    },

    previewSection: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 2,
    },
    previewHeader: {
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    previewTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    previewViewAll: {
      alignItems: 'center',
      gap: 3,
    },
    previewViewAllText: {
      fontSize: 12,
      fontWeight: '700',
    },
    previewEmptyText: {
      fontSize: 12.5,
      paddingVertical: 10,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    previewRow: {
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
    },
    previewName: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    previewSub: {
      fontSize: 11,
    },

    // ── Summary Strip for lists ──
    summaryStrip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
    },
    summaryStripText: {
      fontSize: 12.5,
      fontWeight: '600',
    },

    listContent: {
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
      width: 88,
      height: 88,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 14.5,
      textAlign: 'center',
      lineHeight: 22,
    },
    emptyAction: {
      alignItems: 'center',
      gap: 8,
      borderRadius: Theme.radius.full,
      paddingHorizontal: 22,
      paddingVertical: 12,
      marginTop: 22,
    },
    emptyActionText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalBox: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 4,
    },
    modalSub: {
      fontSize: 13,
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 6,
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      marginBottom: 14,
    },
    modalActions: {
      gap: 10,
      marginTop: 8,
    },
    modalCancel: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    modalCancelText: {
      fontSize: 14,
      color: '#6B7280',
      fontWeight: '600',
    },
    modalConfirm: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      alignItems: 'center',
    },
    modalConfirmText: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
