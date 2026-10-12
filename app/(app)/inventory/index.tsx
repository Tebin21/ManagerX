import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  Keyboard,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Text } from '@/components/ui/AppText';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { BulkSyncModal } from '@/components/inventory/BulkSyncModal';
import { useTranslation } from 'react-i18next';
import { ProductCard } from '@/components/inventory/ProductCard';
import { InventoryReportView } from '@/components/inventory/InventoryReportView';
import {
  InventoryFilterModal,
  type StockStatusFilter,
  type InventorySortBy,
} from '@/components/inventory/InventoryFilterModal';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { computeProductLowStock } from '@/lib/lowStock';
import type { InventoryProduct } from '@/types/inventory';
import { CompactAmount } from '@/components/shared/CompactAmount';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { PeriodFilterModal } from '@/components/shared/PeriodFilterModal';
import { AppSheet, AppSheetHeader, AppSheetOption } from '@/components/ui/AppSheet';
import { getPeriodBounds, formatPeriodLabel, isWithinRange, type PeriodKey } from '@/utils/dateRanges';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { toEnglishDigits } from '@/utils/formatters';

type InventoryNavTab = 'report' | 'products';
type ActiveCategoryTab = 'all' | 'categories';

type PendingReport =
  | { type: 'full'; products: InventoryProduct[] }
  | { type: 'lowStock'; products: InventoryProduct[] }
  | { type: 'outOfStock'; products: InventoryProduct[] }
  | { type: 'category'; products: InventoryProduct[]; categoryName: string };

export default function InventoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    stats,
    categories,
    managedCategories,
    isLoading,
    selectedCategory,
    loadInventory,
    setCategory,
    loadManagedCategories,
    addCategory,
    deleteCategory,
    renameCategory,
  } = useInventoryStore();

  const products = useInventoryStore((s) => s.products);

  const { colors, isDark } = useAppTheme();
  const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  // Navigation Tab: 'report' MUST ALWAYS BE DEFAULT on open as requested!
  const [activeNavTab, setActiveNavTab] = useState<InventoryNavTab>('report');

  useFocusEffect(
    useCallback(() => {
      setActiveNavTab('report');
    }, [])
  );

  const activeTabTextColor = useMemo(() => {
    try {
      const clean = (colors.primary || '#D4AF37').replace('#', '');
      const r = parseInt(clean.slice(0, 2), 16);
      const g = parseInt(clean.slice(2, 4), 16);
      const b = parseInt(clean.slice(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 150 ? '#0F172A' : '#FFFFFF';
    } catch {
      return '#0F172A';
    }
  }, [colors.primary]);

  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<ActiveCategoryTab>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const handleFocusSearch = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchFocused(true);
  }, []);

  const handleDismissSearch = useCallback(() => {
    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchFocused(false);
  }, []);

  // Enhanced Filter & Sort states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('all');
  const [sortBy, setSortBy] = useState<InventorySortBy>('newest');

  // Modals
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [bulkSyncModalVisible, setBulkSyncModalVisible] = useState(false);
  const [catPickerVisible, setCatPickerVisible] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [pendingReport, setPendingReport] = useState<PendingReport | null>(null);

  const { isRTL, textAlign, writingDirection, flexDirection } = useRTL();
  const { isTablet, contentContainerStyle, cardColumns } = useResponsive();

  useEffect(() => {
    loadInventory();
    loadManagedCategories();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  }, [loadInventory]);

  const handleTabChange = useCallback(
    (tab: ActiveCategoryTab | 'history') => {
      if (tab === 'history') {
        router.push('/(app)/inventory/history' as never);
        return;
      }
      setActiveCategoryTab(tab);
      if (tab === 'all') setCategory('all');
    },
    [router, setCategory]
  );

  // PDF Audit Report Handlers
  const handleFullReport = useCallback(() => {
    setReportModalVisible(false);
    if (products.length === 0) {
      Alert.alert(t('common.error'), t('inventory.noInventoryDetail'));
      return;
    }
    setPendingReport({ type: 'full', products });
    setPeriodModalVisible(true);
  }, [products, t]);

  const handleLowStockReport = useCallback(() => {
    setReportModalVisible(false);
    const lowStockProducts = products.filter((p) =>
      computeProductLowStock(p, globalLowStockEnabled, globalLowStockThreshold)
    );
    if (lowStockProducts.length === 0) {
      Alert.alert(t('inventory.noLowStockProducts'), t('inventory.noLowStockProductsDetail'));
      return;
    }
    setPendingReport({ type: 'lowStock', products: lowStockProducts });
    setPeriodModalVisible(true);
  }, [products, globalLowStockEnabled, globalLowStockThreshold, t]);

  const handleOutOfStockReport = useCallback(() => {
    setReportModalVisible(false);
    const outOfStockProducts = products.filter((p) => p.isActive && p.quantity === 0);
    if (outOfStockProducts.length === 0) {
      Alert.alert(t('inventory.noOutOfStockProducts'), t('inventory.noOutOfStockProductsDetail'));
      return;
    }
    setPendingReport({ type: 'outOfStock', products: outOfStockProducts });
    setPeriodModalVisible(true);
  }, [products, t]);

  const handleCategoryReport = useCallback(
    (catName: string) => {
      setCatPickerVisible(false);
      const catProducts = products.filter((p) => p.category === catName);
      if (catProducts.length === 0) {
        Alert.alert(t('common.error'), t('inventory.noInventoryDetail'));
        return;
      }
      setPendingReport({ type: 'category', products: catProducts, categoryName: catName });
      setPeriodModalVisible(true);
    },
    [products, t]
  );

  const handlePeriodSelect = useCallback(
    async (key: PeriodKey, customFrom?: string, customTo?: string) => {
      setPeriodModalVisible(false);
      const report = pendingReport;
      setPendingReport(null);
      if (!report) return;

      const { from, to } = getPeriodBounds(key, customFrom, customTo);
      const periodLabel = formatPeriodLabel(key, from, to);
      const filtered = report.products.filter((p) => isWithinRange(p, from, to));
      if (filtered.length === 0) {
        Alert.alert(t('inventory.noRecordsInPeriod'), t('inventory.noRecordsInPeriodDetail'));
        return;
      }

      setReportGenerating(true);
      try {
        const { loadBusiness } = await import('@/lib/sqlite');
        const biz = await loadBusiness();
        const business = {
          name: biz?.name ?? 'My Business',
          phone: biz?.phone ?? '',
          address: biz?.address ?? '',
          logoUri: biz?.logoPath ?? null,
        };

        if (report.type === 'full') {
          const { shareFullInventoryReport } = await import('@/lib/generateInvoice');
          await shareFullInventoryReport(
            filtered,
            business,
            globalLowStockEnabled,
            globalLowStockThreshold,
            periodLabel
          );
        } else if (report.type === 'lowStock') {
          const { shareLowStockInventoryReport } = await import('@/lib/generateInvoice');
          await shareLowStockInventoryReport(filtered, business, periodLabel);
        } else if (report.type === 'outOfStock') {
          const { shareOutOfStockInventoryReport } = await import('@/lib/generateInvoice');
          await shareOutOfStockInventoryReport(filtered, business, periodLabel);
        } else {
          const { shareCategoryInventoryReport } = await import('@/lib/generateInvoice');
          await shareCategoryInventoryReport(filtered, report.categoryName, business, periodLabel);
        }
      } catch {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      } finally {
        setReportGenerating(false);
      }
    },
    [pendingReport, globalLowStockEnabled, globalLowStockThreshold, t]
  );

  // Category management handlers
  const handleAddCategory = useCallback(async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      await addCategory(name);
      setNewCatName('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'CATEGORY_ALREADY_EXISTS') {
        Alert.alert(t('inventory.manageCategoriesTitle'), t('inventory.duplicateCategory'));
      } else {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      }
    }
  }, [newCatName, addCategory, t]);

  const handleDeleteCategory = useCallback(
    (cat: { name: string; productCount: number; isDefault: boolean }) => {
      if (cat.isDefault) {
        Alert.alert(t('inventory.manageCategoriesTitle'), t('inventory.categoryIsDefault'));
        return;
      }
      if (cat.productCount > 0) {
        Alert.alert(
          t('inventory.manageCategoriesTitle'),
          t('inventory.categoryHasProducts', { count: cat.productCount })
        );
        return;
      }
      Alert.alert(
        t('inventory.manageCategoriesTitle'),
        t('inventory.deleteCategoryConfirm', { name: cat.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteCategory(cat.name);
              } catch {
                Alert.alert(t('common.error'), t('common.tryAgain'));
              }
            },
          },
        ]
      );
    },
    [deleteCategory, t]
  );

  const handleStartRename = useCallback((cat: { name: string; isDefault: boolean }) => {
    if (cat.isDefault) return;
    setEditingCategory(cat.name);
    setEditCatName(cat.name);
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditingCategory(null);
    setEditCatName('');
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (!editingCategory) return;
    const name = editCatName.trim();
    if (!name || name === editingCategory) {
      handleCancelRename();
      return;
    }
    try {
      await renameCategory(editingCategory, name);
      handleCancelRename();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'CATEGORY_ALREADY_EXISTS') {
        Alert.alert(t('inventory.manageCategoriesTitle'), t('inventory.duplicateCategory'));
      } else {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      }
    }
  }, [editingCategory, editCatName, renameCategory, handleCancelRename, t]);

  // Comprehensive Filter & Search & Sort Pipeline
  const visible = useMemo(() => {
    let list = [...products];

    // 1. Text Search query
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((p) => {
        const nameMatch = p.name?.toLowerCase().includes(q);
        const supplierMatch = p.supplierName?.toLowerCase().includes(q);
        const idMatch = p.itemId?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        return nameMatch || supplierMatch || idMatch || catMatch;
      });
    }

    // 2. Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // 3. Stock Status Filter
    if (stockStatusFilter === 'inStock') {
      list = list.filter((p) => p.quantity > 0);
    } else if (stockStatusFilter === 'lowStock') {
      list = list.filter((p) =>
        computeProductLowStock(p, globalLowStockEnabled, globalLowStockThreshold)
      );
    } else if (stockStatusFilter === 'outOfStock') {
      list = list.filter((p) => p.isActive && p.quantity === 0);
    } else if (stockStatusFilter === 'paid') {
      list = list.filter((p) => p.paymentStatus === 'paid');
    } else if (stockStatusFilter === 'debt') {
      list = list.filter((p) => p.paymentStatus === 'debt');
    }

    // 4. Sorting
    list.sort((a, b) => {
      if (sortBy === 'newest') return (b.id || 0) - (a.id || 0);
      if (sortBy === 'oldest') return (a.id || 0) - (b.id || 0);
      if (sortBy === 'price_high') return (b.sellingPrice || 0) - (a.sellingPrice || 0);
      if (sortBy === 'price_low') return (a.sellingPrice || 0) - (b.sellingPrice || 0);
      if (sortBy === 'qty_high') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'qty_low') return (a.quantity || 0) - (b.quantity || 0);
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      return 0;
    });

    return list;
  }, [
    products,
    query,
    selectedCategory,
    stockStatusFilter,
    sortBy,
    globalLowStockEnabled,
    globalLowStockThreshold,
  ]);

  const totalVisible = useMemo(
    () => visible.reduce((s, p) => s + (p.purchasePrice || 0) * (p.quantity || 0), 0),
    [visible]
  );

  const currentFilterLabel = useMemo(() => {
    if (stockStatusFilter === 'inStock') return t('inventory.inStockFilter');
    if (stockStatusFilter === 'lowStock') return t('inventory.filterLow');
    if (stockStatusFilter === 'outOfStock') return t('inventory.outOfStockFilter');
    if (stockStatusFilter === 'paid') return t('inventory.filterPaid');
    if (stockStatusFilter === 'debt') return t('inventory.filterDebt');
    if (selectedCategory !== 'all') return selectedCategory;
    return t('inventory.filterAll');
  }, [stockStatusFilter, selectedCategory, t]);

  const handleResetFilters = useCallback(() => {
    setStockStatusFilter('all');
    setCategory('all');
    setSortBy('newest');
    setQuery('');
  }, [setCategory]);

  const isFilterActive = useMemo(() => {
    return (
      stockStatusFilter !== 'all' ||
      selectedCategory !== 'all' ||
      sortBy !== 'newest' ||
      query.trim().length > 0
    );
  }, [stockStatusFilter, selectedCategory, sortBy, query]);

  const categoryChips = useMemo(() => {
    const list: {
      id: string;
      label: string;
      icon?: any;
      isActive: boolean;
      onPress: () => void;
    }[] = [
      {
        id: 'all',
        label: t('inventory.filterAll'),
        icon: 'apps-outline',
        isActive: selectedCategory === 'all',
        onPress: () => {
          setCategory('all');
        },
      },
    ];

    // Append Category chips
    categories.forEach((catName) => {
      list.push({
        id: `cat_${catName}`,
        label: catName,
        isActive: selectedCategory === catName,
        onPress: () => {
          setCategory(selectedCategory === catName ? 'all' : catName);
        },
      });
    });

    return list;
  }, [selectedCategory, categories, setCategory, t]);

  const renderEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="cube-outline" size={48} color={colors.gray300} />
      </View>
      {query.trim() || stockStatusFilter !== 'all' || selectedCategory !== 'all' ? (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>
            {t('inventory.noResultsSub')}
          </Text>
          <TouchableOpacity
            style={[styles.resetFilterAction, { backgroundColor: colors.primary + '18' }]}
            onPress={handleResetFilters}
          >
            <Text style={[styles.resetFilterText, { color: colors.primary }]}>
              {isKuLanguage ? 'سڕینەوەی فلتەرەکان' : 'Reset Filters'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>
            {t('inventory.noInventory')}
          </Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>
            {t('inventory.noInventoryDetail')}
          </Text>
          <TouchableOpacity
            style={[styles.emptyAction, { backgroundColor: colors.primary, flexDirection }]}
            onPress={() => router.push('/(app)/purchases/new-purchase' as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={[styles.emptyActionText, { color: colors.white }]}>
              {t('inventory.addFirstPurchase')}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </MotiView>
  );

  const handleProductPress = useCallback(
    (productId: number) => {
      router.push(`/(app)/inventory/${productId}` as never);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: InventoryProduct; index: number }) => {
      const isLowStock = computeProductLowStock(
        item,
        globalLowStockEnabled,
        globalLowStockThreshold
      );
      return (
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 18,
            stiffness: 200,
            delay: index < 10 ? index * 35 : 0,
          }}
          style={isTablet ? { flex: 1 } : undefined}
        >
          <ProductCard product={item} onPress={handleProductPress} isLowStock={isLowStock} />
        </MotiView>
      );
    },
    [globalLowStockEnabled, globalLowStockThreshold, handleProductPress, isTablet]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {/* ── App Header with 2 Segmented Navigation Tabs: [ڕاپۆرت] and [بەرهەمەکان] ── */}
      {/* ── App Header ── */}
      <AppHeader
        title={t('inventory.title')}
        showBack
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(app)' as never);
          }
        }}
        rightAction={
          <View style={{ flexDirection, gap: 8, alignItems: 'center' }}>
            <HeaderActionButton
              icon="storefront-outline"
              size={36}
              iconSize={19}
              onPress={() => setBulkSyncModalVisible(true)}
            />
            <HeaderActionButton
              icon="document-text-outline"
              size={36}
              iconSize={19}
              onPress={() => setReportModalVisible(true)}
              loading={reportGenerating}
            />
          </View>
        }
      />

      {/* ── Segmented Tab Switcher (Report & Products) — Styled outside header exactly like Expenses ── */}
      <View style={[styles.segmentWrapper, { backgroundColor: colors.white, borderBottomColor: colors.gray200 }]}>
        <View style={[styles.segmentTrack, { backgroundColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Tab 1: ڕاپۆرت (Report) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveNavTab('report')}
            style={[
              styles.segmentBtn,
              activeNavTab === 'report' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="bar-chart-outline"
              size={isTablet ? 18 : 16}
              color={activeNavTab === 'report' ? activeTabTextColor : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeNavTab === 'report' ? activeTabTextColor : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('inventory.tabReport')}
            </Text>
          </TouchableOpacity>

          {/* Tab 2: بەرهەمەکان (Products) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveNavTab('products')}
            style={[
              styles.segmentBtn,
              activeNavTab === 'products' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={isTablet ? 18 : 16}
              color={activeNavTab === 'products' ? activeTabTextColor : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: activeNavTab === 'products' ? activeTabTextColor : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('inventory.tabProducts')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SCREEN BODY: Tab 1 = Report, Tab 2 = Products ── */}
      {activeNavTab === 'report' ? (
        /* ═══════════ TAB 1: REPORT VIEW (DASHBOARD STYLE) ═══════════ */
        <InventoryReportView
          products={products}
          stats={stats}
          onExportPdf={() => setReportModalVisible(true)}
          isExporting={reportGenerating}
          onRefresh={onRefresh}
          refreshing={refreshing || isLoading}
        />
      ) : (
        /* ═══════════ TAB 2: PRODUCTS VIEW (CATALOG & SEARCH) ═══════════ */
        <View style={styles.productsBody}>
          {/* 1. Integrated Search & Quick Actions Bar */}
          <View style={[styles.searchActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Search Input Box (Expands to full width when focused) */}
            <View
              style={[
                styles.searchBox,
                isTablet && { height: 50, borderRadius: 14 },
                {
                  backgroundColor: isDark ? colors.gray100 : colors.white,
                  borderColor: isDark ? colors.gray200 : colors.gray200,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons
                name="search"
                size={isTablet ? 18 : 16}
                color={colors.gray400}
                style={styles.searchIcon}
              />
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.searchInput,
                  isTablet && { fontSize: 16 },
                  {
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                  isKuLanguage &&
                    applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: query }), {}),
                ]}
                value={query}
                onChangeText={setQuery}
                onFocus={handleFocusSearch}
                onBlur={() => {
                  if (!query.trim()) handleDismissSearch();
                }}
                placeholder={
                  isSearchFocused
                    ? (isKuLanguage ? 'گەڕانی بەرهەم، دابینکەر، کۆدی تەواو...' : t('inventory.search'))
                    : (isKuLanguage ? 'گەڕانی بەرهەم...' : t('inventory.search'))
                }
                placeholderTextColor={colors.gray400}
                returnKeyType="search"
                clearButtonMode="never"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={isTablet ? 18 : 16} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel / Dismiss button when search is expanded */}
            {isSearchFocused && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleDismissSearch}
                style={styles.searchCancelBtn}
              >
                <Text
                  style={[
                    styles.searchCancelBtnText,
                    { color: colors.primary },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isKuLanguage ? 'داخستن' : t('common.cancel')}
                </Text>
              </TouchableOpacity>
            )}

            {/* When search is not focused: Show the 4 action buttons */}
            {!isSearchFocused && (
              <>
                {/* Filter & Sort Modal Trigger */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setFilterModalVisible(true)}
                  style={[
                    styles.actionSquareBtn,
                    isTablet && { width: 50, height: 50, borderRadius: 14 },
                    (stockStatusFilter !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest')
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : {
                          backgroundColor: isDark ? colors.gray100 : colors.white,
                          borderColor: isDark ? colors.gray200 : colors.gray200,
                        },
                  ]}
                >
                  <Ionicons
                    name="options-outline"
                    size={isTablet ? 20 : 18}
                    color={
                      (stockStatusFilter !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest')
                        ? colors.white
                        : isDark ? colors.gray600 : colors.darkBlue
                    }
                  />
                  {(stockStatusFilter !== 'all' || selectedCategory !== 'all' || sortBy !== 'newest') && (
                    <View style={[styles.filterActiveDot, { backgroundColor: colors.white }]} />
                  )}
                </TouchableOpacity>

                {/* Stock Alerts Bell */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(app)/inventory/stock-alerts' as never)}
                  style={[
                    styles.actionSquareBtn,
                    isTablet && { width: 50, height: 50, borderRadius: 14 },
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.white,
                      borderColor: isDark ? colors.gray200 : colors.gray200,
                    },
                  ]}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={isTablet ? 20 : 18}
                    color={stats?.lowStockCount ? colors.warning : colors.gray500}
                  />
                  {!!stats?.lowStockCount && (
                    <View style={[styles.bellBadge, { backgroundColor: colors.warning }]}>
                      <Text style={[styles.bellBadgeText, { color: colors.white }]}>
                        {stats.lowStockCount > 9 ? '9+' : String(stats.lowStockCount)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Stock Movements History */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(app)/inventory/history' as never)}
                  style={[
                    styles.actionSquareBtn,
                    isTablet && { width: 50, height: 50, borderRadius: 14 },
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.white,
                      borderColor: isDark ? colors.gray200 : colors.gray200,
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={isTablet ? 20 : 18} color={colors.gray500} />
                </TouchableOpacity>

                {/* Category Management */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setCatModalVisible(true)}
                  style={[
                    styles.actionSquareBtn,
                    isTablet && { width: 50, height: 50, borderRadius: 14 },
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.white,
                      borderColor: isDark ? colors.gray200 : colors.gray200,
                    },
                  ]}
                >
                  <Ionicons name="pricetags-outline" size={isTablet ? 19 : 17} color={colors.gray500} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* 2. Category Filter Chips Row (Clean, dedicated categories bar) */}
          <View style={styles.chipsStripWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
              contentContainerStyle={styles.chipsScrollContent}
            >
              {categoryChips.map((chip) => (
                <TouchableOpacity
                  key={chip.id}
                  activeOpacity={0.8}
                  onPress={chip.onPress}
                  style={[
                    styles.unifiedChip,
                    isRTL && { transform: [{ scaleX: -1 }] },
                    chip.isActive
                      ? [styles.unifiedChipActive, { backgroundColor: colors.primary, borderColor: colors.primary }]
                      : {
                          backgroundColor: isDark ? colors.gray100 : colors.white,
                          borderColor: isDark ? colors.gray200 : colors.gray200,
                        },
                  ]}
                >
                  {chip.icon && (
                    <Ionicons
                      name={chip.icon}
                      size={13}
                      color={chip.isActive ? colors.white : colors.gray500}
                    />
                  )}
                  <Text
                    style={[
                      styles.unifiedChipText,
                      {
                        color: chip.isActive
                          ? colors.white
                          : isDark
                          ? colors.gray600
                          : colors.darkBlue,
                      },
                      isKuLanguage && {
                        fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                        fontWeight: 'normal',
                      },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 3. Slim, Minimal Summary Line */}
          <View
            style={[
              styles.summaryStatusLine,
              {
                borderBottomColor: isDark ? colors.gray200 : colors.gray100,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={[styles.summaryTextGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text
                style={[
                  styles.summaryCountText,
                  { color: isDark ? colors.gray600 : colors.darkBlue },
                  isKuLanguage && {
                    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                    fontWeight: 'normal',
                  },
                ]}
              >
                {toEnglishDigits(visible.length)} {t('inventory.products')}
              </Text>
              <Text style={[styles.summaryDot, { color: colors.gray400 }]}>•</Text>
              <Text style={[styles.summaryValueLabel, { color: colors.gray400 }]}>
                {isKuLanguage ? 'کۆی بەها:' : 'Total:'}
              </Text>
              <CompactAmount
                value={totalVisible}
                style={[styles.summaryCountText, { color: colors.primary }]}
              />
            </View>

            {isFilterActive && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleResetFilters}
                style={[styles.resetFilterLink, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Ionicons name="refresh-outline" size={12} color={colors.primary} />
                <Text
                  style={[
                    styles.resetFilterLinkText,
                    { color: colors.primary },
                    isKuLanguage && {
                      fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                      fontWeight: 'normal',
                    },
                  ]}
                >
                  {isKuLanguage ? 'سڕینەوەی فلتەر' : 'Clear Filters'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 6. Products FlatList */}
          <FlatList
            key={`inv-list-${cardColumns}`}
            data={visible}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            numColumns={cardColumns}
            columnWrapperStyle={isTablet ? { gap: 12 } : undefined}
            contentContainerStyle={[
              styles.list,
              isTablet && contentContainerStyle,
              visible.length === 0 && styles.listEmpty,
            ]}
            ListEmptyComponent={renderEmpty}
            removeClippedSubviews
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={11}
            refreshControl={
              <RefreshControl
                refreshing={refreshing || isLoading}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={handleDismissSearch}
            onTouchStart={() => {
              if (isSearchFocused && !query.trim()) {
                handleDismissSearch();
              }
            }}
          />
        </View>
      )}

      {/* ── Enhanced Filter & Sort Modal ── */}
      <InventoryFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setCategory}
        stockStatus={stockStatusFilter}
        onSelectStockStatus={setStockStatusFilter}
        sortBy={sortBy}
        onSelectSortBy={setSortBy}
        onReset={handleResetFilters}
      />

      {/* ── Report Picker Sheet ── */}
      <AppSheet visible={reportModalVisible} onClose={() => setReportModalVisible(false)}>
        <AppSheetHeader title={t('inventory.reports')} onClose={() => setReportModalVisible(false)} />

        <AppSheetOption
          icon="reader-outline"
          label={t('inventory.reportFull')}
          subtitle={t('inventory.reportFullSub')}
          indicator="chevron"
          onPress={handleFullReport}
        />
        <AppSheetOption
          icon="alert-circle-outline"
          label={t('inventory.reportLowStock')}
          subtitle={t('inventory.reportLowStockSub')}
          indicator="chevron"
          onPress={handleLowStockReport}
        />
        <AppSheetOption
          icon="close-circle-outline"
          label={t('inventory.reportOutOfStock')}
          subtitle={t('inventory.reportOutOfStockSub')}
          indicator="chevron"
          onPress={handleOutOfStockReport}
        />
        <AppSheetOption
          icon="folder-outline"
          label={t('inventory.reportCategory')}
          subtitle={t('inventory.reportCategorySub')}
          indicator="chevron"
          onPress={() => {
            setReportModalVisible(false);
            setCatPickerVisible(true);
          }}
        />
      </AppSheet>

      {/* ── Category Picker Sheet (for Category Report) ── */}
      <AppSheet visible={catPickerVisible} onClose={() => setCatPickerVisible(false)}>
        <AppSheetHeader
          title={t('inventory.reportSelectCategory')}
          onClose={() => setCatPickerVisible(false)}
        />
        {categories.map((cat) => (
          <AppSheetOption
            key={cat}
            icon="folder-outline"
            label={cat}
            indicator="chevron"
            onPress={() => handleCategoryReport(cat)}
          />
        ))}
      </AppSheet>

      {/* ── Date Period Modal (for PDF generation) ── */}
      <PeriodFilterModal
        visible={periodModalVisible}
        onClose={() => {
          setPeriodModalVisible(false);
          setPendingReport(null);
        }}
        onSelect={handlePeriodSelect}
        current="all"
        includeAll
      />

      {/* ── Categories Management Modal ── */}
      <Modal
        visible={catModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCatModalVisible(false)}
      >
        <View style={styles.catModalOverlay}>
          <View style={[styles.catModalContent, { backgroundColor: isDark ? colors.gray100 : colors.white }]}>
            {/* Header */}
            <View style={[styles.catModalHeader, { flexDirection }]}>
              <Text
                style={[
                  styles.catModalTitle,
                  { color: colors.darkBlue, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('inventory.manageCategoriesTitle')}
              </Text>
              <TouchableOpacity onPress={() => setCatModalVisible(false)} style={styles.catModalClose}>
                <Ionicons name="close" size={22} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            {/* Add new category input */}
            <View style={[styles.catAddRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 }]}>
              <TextInput
                style={[
                  styles.catAddInput,
                  {
                    backgroundColor: isDark ? colors.gray200 : colors.gray50,
                    borderColor: colors.gray200,
                    color: colors.black,
                    textAlign,
                    writingDirection,
                  },
                  isKuLanguage &&
                    applyKurdishFont(
                      resolveInputIsKurdish({ isKuLanguage, value: newCatName }),
                      {}
                    ),
                ]}
                placeholder={t('inventory.newCategoryPlaceholder')}
                placeholderTextColor={colors.gray400}
                value={newCatName}
                onChangeText={setNewCatName}
                returnKeyType="done"
                onSubmitEditing={handleAddCategory}
              />
              <TouchableOpacity
                style={[styles.catAddBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddCategory}
              >
                <Ionicons name="add" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* Managed categories list */}
            <ScrollView style={styles.catList} showsVerticalScrollIndicator={false}>
              {managedCategories.map((cat) => (
                <View
                  key={cat.name}
                  style={[
                    styles.catListItem,
                    { borderBottomColor: isDark ? colors.gray200 : colors.gray100, flexDirection },
                  ]}
                >
                  {editingCategory === cat.name ? (
                    <View style={[styles.catEditRow, { flexDirection }]}>
                      <TextInput
                        style={[
                          styles.catEditInput,
                          {
                            backgroundColor: isDark ? colors.gray200 : colors.gray50,
                            color: colors.black,
                            textAlign,
                            writingDirection,
                          },
                        ]}
                        value={editCatName}
                        onChangeText={setEditCatName}
                        autoFocus
                      />
                      <TouchableOpacity onPress={handleConfirmRename} style={styles.catEditActionBtn}>
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleCancelRename} style={styles.catEditActionBtn}>
                        <Ionicons name="close" size={18} color={colors.gray400} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={[styles.catItemInfo, { flexDirection }]}>
                        <Text
                          style={[
                            styles.catItemName,
                            { color: colors.darkBlue },
                            isKuLanguage && {
                              fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                              fontWeight: 'normal',
                            },
                          ]}
                        >
                          {cat.name}
                        </Text>
                        <Text style={[styles.catItemCount, { color: colors.gray400 }]}>
                          ({toEnglishDigits(cat.productCount)})
                        </Text>
                        {cat.isDefault && (
                          <View
                            style={[styles.defaultBadge, { backgroundColor: colors.gray100 }]}
                          >
                            <Text style={[styles.defaultBadgeText, { color: colors.gray500 }]}>
                              {t('inventory.defaultCategoryBadge')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.catItemActions, { flexDirection }]}>
                        {!cat.isDefault && (
                          <>
                            <TouchableOpacity
                              onPress={() => handleStartRename(cat)}
                              style={styles.catActionBtn}
                            >
                              <Ionicons name="pencil-outline" size={16} color={colors.gray500} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteCategory(cat)}
                              style={styles.catActionBtn}
                            >
                              <Ionicons name="trash-outline" size={16} color={colors.error} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Online store bulk sync modal ── */}
      <BulkSyncModal
        visible={bulkSyncModalVisible}
        onClose={() => setBulkSyncModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 8,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  productsBody: {
    flex: 1,
  },
  searchActionsRow: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    alignItems: 'center',
    gap: 6,
  },
  searchBox: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 11,
    alignItems: 'center',
    gap: 6,
  },
  searchIcon: {
    marginEnd: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  searchCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionSquareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  chipsStripWrap: {
    marginBottom: 6,
  },
  chipsScrollContent: {
    paddingHorizontal: 16,
    gap: 7,
    alignItems: 'center',
    paddingVertical: 2,
  },
  unifiedChip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  unifiedChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  unifiedChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryStatusLine: {
    marginHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryTextGroup: {
    alignItems: 'center',
    gap: 6,
  },
  summaryCountText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  summaryDot: {
    fontSize: 12,
  },
  summaryValueLabel: {
    fontSize: 12,
  },
  resetFilterLink: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  resetFilterLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  list: {
    padding: 12,
    paddingBottom: 40,
    gap: 10,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyAction: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resetFilterAction: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 4,
  },
  resetFilterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  catModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  catModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  catModalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  catModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  catModalClose: {
    padding: 4,
  },
  catAddRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  catAddInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  catAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catList: {
    maxHeight: 320,
  },
  catListItem: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  catItemInfo: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  catItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  catItemCount: {
    fontSize: 12,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  catItemActions: {
    alignItems: 'center',
    gap: 12,
  },
  catActionBtn: {
    padding: 4,
  },
  catEditRow: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  catEditInput: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  catEditActionBtn: {
    padding: 6,
  },
});
