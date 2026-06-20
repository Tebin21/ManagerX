import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { useTranslation } from 'react-i18next';
import { InventoryStatsCard } from '@/components/inventory/InventoryStatsCard';
import { CategoryFilterBar } from '@/components/inventory/CategoryFilterBar';
import { ProductCard } from '@/components/inventory/ProductCard';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { computeProductLowStock } from '@/lib/lowStock';
import type { InventoryFilter } from '@/types/inventory';
import { fmtIQD } from '@/utils/formatters';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';

type ActiveTab = 'all' | 'categories';

const FILTER_OPTIONS: { key: InventoryFilter; labelKey: string }[] = [
  { key: 'all',      labelKey: 'inventory.filterAll' },
  { key: 'lowStock', labelKey: 'inventory.filterLow' },
  { key: 'paid',     labelKey: 'inventory.filterPaid' },
  { key: 'debt',     labelKey: 'inventory.filterDebt' },
];

export default function InventoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    stats, categories, managedCategories, isLoading,
    filter, selectedCategory,
    loadInventory, setFilter, setCategory,
    getFilteredProducts, loadManagedCategories, addCategory, deleteCategory,
  } = useInventoryStore();

  const { colors } = useAppTheme();
  const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore();
  const [query, setQuery]                     = useState('');
  const [refreshing, setRefreshing]           = useState(false);
  const [activeTab, setActiveTab]             = useState<ActiveTab>('all');
  const [catModalVisible, setCatModalVisible]       = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [newCatName, setNewCatName]                 = useState('');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [catPickerVisible, setCatPickerVisible]     = useState(false);
  const [reportGenerating, setReportGenerating]     = useState(false);
  const { chevronForward } = useDirectionalChevron();
  const { isRTL, textAlign, writingDirection, flexDirection } = useRTL();

  useEffect(() => {
    loadInventory();
    loadManagedCategories();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  }, [loadInventory]);

  const handleTabChange = useCallback((tab: ActiveTab | 'history') => {
    if (tab === 'history') {
      router.push('/(app)/inventory/history' as never);
      return;
    }
    setActiveTab(tab);
    if (tab === 'all') setCategory('all');
  }, [router, setCategory]);

  const handleFilterSelect = useCallback((f: InventoryFilter) => {
    setFilter(f);
    setFilterSheetVisible(false);
  }, [setFilter]);

  const handleFullReport = useCallback(async () => {
    setReportModalVisible(false);
    const products = useInventoryStore.getState().getFilteredProducts('');
    if (products.length === 0) {
      Alert.alert(t('common.error'), t('inventory.noInventoryDetail'));
      return;
    }
    const currentStats = useInventoryStore.getState().stats;
    if (!currentStats) { Alert.alert(t('common.error'), t('common.tryAgain')); return; }
    setReportGenerating(true);
    try {
      const { shareFullInventoryReport } = await import('@/lib/generateInvoice');
      const { loadBusiness } = await import('@/lib/sqlite');
      const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore.getState();
      const biz = await loadBusiness();
      await shareFullInventoryReport(
        products,
        currentStats,
        { name: biz?.name ?? 'My Business', phone: biz?.phone ?? '', address: biz?.address ?? '', logoUri: biz?.logoPath ?? null },
        globalLowStockEnabled,
        globalLowStockThreshold,
      );
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setReportGenerating(false);
    }
  }, [t]);

  const handleLowStockReport = useCallback(async () => {
    setReportModalVisible(false);
    const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore.getState();
    const allProducts = useInventoryStore.getState().products ?? [];
    const lowStockProducts = allProducts.filter((p) =>
      computeProductLowStock(p, globalLowStockEnabled, globalLowStockThreshold),
    );
    if (lowStockProducts.length === 0) {
      Alert.alert(t('inventory.noLowStockProducts'), t('inventory.noLowStockProductsDetail'));
      return;
    }
    setReportGenerating(true);
    try {
      const { shareLowStockInventoryReport } = await import('@/lib/generateInvoice');
      const { loadBusiness } = await import('@/lib/sqlite');
      const biz = await loadBusiness();
      await shareLowStockInventoryReport(
        lowStockProducts,
        { name: biz?.name ?? 'My Business', phone: biz?.phone ?? '', address: biz?.address ?? '', logoUri: biz?.logoPath ?? null },
      );
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setReportGenerating(false);
    }
  }, [t]);

  const handleCategoryReport = useCallback(async (catName: string) => {
    setCatPickerVisible(false);
    const allProducts = useInventoryStore.getState().getFilteredProducts('');
    const catProducts = allProducts.filter((p) => p.category === catName);
    if (catProducts.length === 0) {
      Alert.alert(t('common.error'), t('inventory.noInventoryDetail'));
      return;
    }
    setReportGenerating(true);
    try {
      const { shareCategoryInventoryReport } = await import('@/lib/generateInvoice');
      const { loadBusiness } = await import('@/lib/sqlite');
      const biz = await loadBusiness();
      await shareCategoryInventoryReport(
        catProducts,
        catName,
        { name: biz?.name ?? 'My Business', phone: biz?.phone ?? '', address: biz?.address ?? '', logoUri: biz?.logoPath ?? null },
      );
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setReportGenerating(false);
    }
  }, [t]);

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

  const handleDeleteCategory = useCallback((cat: { name: string; productCount: number; isDefault: boolean }) => {
    if (cat.isDefault) {
      Alert.alert(t('inventory.manageCategoriesTitle'), t('inventory.categoryIsDefault'));
      return;
    }
    if (cat.productCount > 0) {
      Alert.alert(t('inventory.manageCategoriesTitle'), t('inventory.categoryHasProducts', { count: cat.productCount }));
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
  }, [deleteCategory, t]);

  const visible = getFilteredProducts(query);

  const filterLabel = useMemo(() => {
    const found = FILTER_OPTIONS.find((o) => o.key === filter);
    return found ? t(found.labelKey) : t('inventory.filterAll');
  }, [filter, t]);

  const totalVisible = useMemo(
    () => visible.reduce((s, p) => s + p.purchasePrice * p.quantity, 0),
    [visible]
  );

  const TABS: { key: ActiveTab | 'history'; label: string; icon?: string }[] = [
    { key: 'all',        label: t('inventory.filterAll') },
    { key: 'categories', label: t('inventory.category') },
    { key: 'history',    label: t('inventory.viewHistory') },
  ];

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
      {query.trim() || filter !== 'all' || selectedCategory !== 'all' ? (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('inventory.noResultsSub')}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noInventory')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('inventory.noInventoryDetail')}</Text>
          <TouchableOpacity
            style={[styles.emptyAction, { backgroundColor: colors.primary, flexDirection }]}
            onPress={() => router.push('/(app)/purchases/new-purchase' as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={[styles.emptyActionText, { color: colors.white }]}>{t('inventory.addFirstPurchase')}</Text>
          </TouchableOpacity>
        </>
      )}
    </MotiView>
  );

  const renderItem = ({ item, index }: { item: ReturnType<typeof getFilteredProducts>[0]; index: number }) => {
    const isLowStock = computeProductLowStock(item, globalLowStockEnabled, globalLowStockThreshold);
    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 200, delay: Math.min(index * 35, 350) }}
      >
        <ProductCard
          product={item}
          onPress={() => router.push(`/(app)/inventory/${item.id}` as never)}
          isLowStock={isLowStock}
        />
      </MotiView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {/* ── Gradient header with stats + search ── */}
      <AppHeader
        title={t('inventory.title')}
        showBack
        onBack={() => router.back()}
        rightAction={
          <HeaderActionButton
            icon="document-text-outline"
            onPress={() => setReportModalVisible(true)}
            loading={reportGenerating}
          />
        }
      >
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <InventoryStatsCard label={t('inventory.products')}  value={String(stats.totalProducts)}  icon="cube"    delay={0} />
              <InventoryStatsCard label={t('inventory.totalQty')}  value={String(stats.totalQuantity)}  icon="layers"  delay={60} />
            </View>
            <View style={styles.statsRow}>
              <InventoryStatsCard label={t('inventory.totalValue')} value={`${fmtIQD(stats.totalValueIQD)} IQD`} icon="wallet" delay={120} />
              <InventoryStatsCard label={t('inventory.lowStock')}  value={String(stats.lowStockCount)} icon="warning" accent={stats.lowStockCount > 0} delay={180} />
            </View>
          </View>
        )}

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.white, flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
          <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.black, textAlign, writingDirection }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('inventory.search')}
            placeholderTextColor={colors.gray400}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </AppHeader>

      {/* ── Top Tab Bar: All | Categories | History | ⚙ ── */}
      <View style={[styles.tabBar, { backgroundColor: colors.white, borderBottomColor: colors.gray100, flexDirection }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabBarScroll}
          contentContainerStyle={[styles.tabBarContent, { flexDirection }]}
        >
          {TABS.map(({ key, label }) => {
            const isActive = key !== 'history' && activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleTabChange(key as ActiveTab | 'history')}
                style={[
                  styles.tab,
                  isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.gray200 },
                  { flexDirection },
                ]}
                activeOpacity={0.75}
              >
                {key === 'history' && (
                  <Ionicons name="time-outline" size={12} color={isActive ? '#fff' : colors.gray500} style={{ marginEnd: isRTL ? RTL_SPACING.gapSm : 3 }} />
                )}
                <Text style={[styles.tabText, { color: isActive ? '#fff' : colors.gray600 }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Bell icon — opens stock alerts */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/inventory/stock-alerts' as never)}
          style={[styles.iconBtn, { borderStartColor: colors.gray100 }]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="notifications-outline"
            size={18}
            color={stats?.lowStockCount ? '#EA580C' : colors.gray500}
          />
          {!!stats?.lowStockCount && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {stats.lowStockCount > 9 ? '9+' : String(stats.lowStockCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Settings icon — always visible, right-aligned */}
        <TouchableOpacity
          onPress={() => setCatModalVisible(true)}
          style={[styles.iconBtn, { borderStartColor: colors.gray100 }]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="settings-outline" size={18} color={colors.gray500} />
        </TouchableOpacity>
      </View>

      {/* ── Category filter bar (only in Categories tab) ── */}
      {activeTab === 'categories' && categories.length > 0 && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        >
          <CategoryFilterBar
            categories={categories}
            selected={selectedCategory}
            onSelect={setCategory}
          />
        </MotiView>
      )}

      {/* ── Filter button + Summary strip ── */}
      <View style={[styles.controlRow, { backgroundColor: colors.white, borderBottomColor: colors.gray100, flexDirection, gap: isRTL ? RTL_SPACING.gap : 10 }]}>
        <TouchableOpacity
          onPress={() => setFilterSheetVisible(true)}
          style={[
            styles.filterBtn,
            filter !== 'all'
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: 'transparent', borderColor: colors.gray200 },
            { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 5 },
          ]}
          activeOpacity={0.75}
        >
          <Ionicons
            name="options-outline"
            size={13}
            color={filter !== 'all' ? '#fff' : colors.gray500}
          />
          <Text style={[styles.filterBtnText, { color: filter !== 'all' ? '#fff' : colors.gray600 }]}>
            {filterLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={filter !== 'all' ? '#fff' : colors.gray400}
          />
        </TouchableOpacity>

        <View style={[styles.summaryBlock, { gap: isRTL ? RTL_SPACING.gapSm : 6 }]}>
          <Text style={[styles.summaryCount, { color: colors.gray500, textAlign }]}>
            {visible.length} {t('inventory.products')}
          </Text>
          <Text style={[styles.summaryValue, { color: colors.primary, textAlign }]}>
            {fmtIQD(totalVisible)} IQD
          </Text>
        </View>
      </View>

      {/* ── Product list ── */}
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, visible.length === 0 && styles.listEmpty]}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* ── Report Picker Modal ── */}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setReportModalVisible(false)}
        />
        <View style={[styles.filterSheet, { backgroundColor: colors.white }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.gray200 }]} />
          <View style={[styles.reportModalHeader, { flexDirection }]}>
            <Text style={[styles.reportModalTitle, { color: colors.black, textAlign }]}>
              {t('inventory.reports')}
            </Text>
            <TouchableOpacity onPress={() => setReportModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.reportOption, { borderBottomColor: colors.gray100, flexDirection, gap: isRTL ? RTL_SPACING.gap : 12, paddingVertical: isRTL ? RTL_SPACING.rowPadV : 14 }]}
            onPress={handleFullReport}
            activeOpacity={0.7}
          >
            <View style={[styles.reportIconWrap, { backgroundColor: colors.gray100 }]}>
              <Ionicons name="reader-outline" size={20} color={colors.gray600} />
            </View>
            <View style={styles.reportOptionText}>
              <Text style={[styles.reportOptionTitle, { color: colors.black, textAlign, marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>
                {t('inventory.reportFull')}
              </Text>
              <Text style={[styles.reportOptionSub, { color: colors.gray400, textAlign }]}>
                {t('inventory.reportFullSub')}
              </Text>
            </View>
            <Ionicons name={chevronForward as never} size={16} color={colors.gray300} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reportOption, { borderBottomColor: colors.gray100, flexDirection, gap: isRTL ? RTL_SPACING.gap : 12, paddingVertical: isRTL ? RTL_SPACING.rowPadV : 14 }]}
            onPress={handleLowStockReport}
            activeOpacity={0.7}
          >
            <View style={[styles.reportIconWrap, { backgroundColor: colors.gray100 }]}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.gray600} />
            </View>
            <View style={styles.reportOptionText}>
              <Text style={[styles.reportOptionTitle, { color: colors.black, textAlign, marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>
                {t('inventory.reportLowStock')}
              </Text>
              <Text style={[styles.reportOptionSub, { color: colors.gray400, textAlign }]}>
                {t('inventory.reportLowStockSub')}
              </Text>
            </View>
            <Ionicons name={chevronForward as never} size={16} color={colors.gray300} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reportOption, { borderBottomColor: colors.gray100, flexDirection, gap: isRTL ? RTL_SPACING.gap : 12, paddingVertical: isRTL ? RTL_SPACING.rowPadV : 14 }]}
            onPress={() => { setReportModalVisible(false); setCatPickerVisible(true); }}
            activeOpacity={0.7}
          >
            <View style={[styles.reportIconWrap, { backgroundColor: colors.gray100 }]}>
              <Ionicons name="folder-open-outline" size={20} color={colors.gray600} />
            </View>
            <View style={styles.reportOptionText}>
              <Text style={[styles.reportOptionTitle, { color: colors.black, textAlign, marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>
                {t('inventory.reportCategory')}
              </Text>
              <Text style={[styles.reportOptionSub, { color: colors.gray400, textAlign }]}>
                {t('inventory.reportCategorySub')}
              </Text>
            </View>
            <Ionicons name={chevronForward as never} size={16} color={colors.gray300} />
          </TouchableOpacity>

          <View style={styles.sheetBottomPad} />
        </View>
      </Modal>

      {/* ── Category Picker Modal (for Category Report) ── */}
      <Modal
        visible={catPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCatPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setCatPickerVisible(false)}
        />
        <View style={[styles.filterSheet, { backgroundColor: colors.white }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.gray200 }]} />
          <View style={[styles.reportModalHeader, { flexDirection }]}>
            <Text style={[styles.reportModalTitle, { color: colors.black, textAlign }]}>
              {t('inventory.selectCategoryTitle')}
            </Text>
            <TouchableOpacity onPress={() => setCatPickerVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.gray500} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => handleCategoryReport(cat)}
                style={[styles.sheetOption, { borderBottomColor: colors.gray100, flexDirection, paddingVertical: isRTL ? 18 : 16 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.sheetOptionText, { color: colors.black, textAlign }]}>{cat}</Text>
                <Ionicons name={chevronForward as never} size={16} color={colors.gray300} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.sheetBottomPad} />
        </View>
      </Modal>

      {/* ── Filter Bottom Sheet ── */}
      <Modal
        visible={filterSheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setFilterSheetVisible(false)}
        />
        <View style={[styles.filterSheet, { backgroundColor: colors.white }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.gray200 }]} />
          {FILTER_OPTIONS.map(({ key, labelKey }) => {
            const active = filter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleFilterSelect(key)}
                style={[styles.sheetOption, { borderBottomColor: colors.gray100, flexDirection, paddingVertical: isRTL ? 18 : 16 }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.sheetOptionText, { color: active ? colors.primary : colors.black, fontWeight: active ? '700' : '500', textAlign }]}>
                  {t(labelKey)}
                </Text>
                {active && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
          <View style={styles.sheetBottomPad} />
        </View>
      </Modal>

      {/* ── Manage Categories Modal ── */}
      <Modal visible={catModalVisible} animationType="fade" transparent onRequestClose={() => setCatModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.white }]}>
            <View style={[styles.modalHeader, { flexDirection }]}>
              <Text style={[styles.modalTitle, { color: colors.black, textAlign }]}>{t('inventory.manageCategoriesTitle')}</Text>
              <TouchableOpacity onPress={() => setCatModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            <View style={[styles.addCatRow, { borderColor: colors.gray200, flexDirection, gap: isRTL ? RTL_SPACING.gap : 10 }]}>
              <TextInput
                style={[styles.addCatInput, { color: colors.black, borderColor: colors.gray200, textAlign, writingDirection }]}
                placeholder={t('inventory.addCategory')}
                placeholderTextColor={colors.gray400}
                value={newCatName}
                onChangeText={setNewCatName}
                onSubmitEditing={handleAddCategory}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleAddCategory}
                style={[styles.addCatBtn, { backgroundColor: colors.primary }]}
                disabled={!newCatName.trim()}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.catList} contentContainerStyle={{ paddingBottom: 16 }}>
              {managedCategories.map((cat) => {
                const canDelete = !cat.isDefault && cat.productCount === 0;
                return (
                  <View key={cat.name} style={[styles.catCard, { backgroundColor: colors.gray50, flexDirection, padding: isRTL ? RTL_SPACING.gap : 12 }]}>
                    <View style={[styles.catInfo, { gap: isRTL ? RTL_SPACING.gapSm : 6 }]}>
                      <View style={[styles.catNameRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
                        <Text style={[styles.catName, { color: colors.black, textAlign }]}>{cat.name}</Text>
                        {cat.isDefault && (
                          <View style={[styles.defaultBadge, { backgroundColor: colors.primary + '18' }]}>
                            <Text style={[styles.defaultBadgeText, { color: colors.primary }]}>
                              {t('inventory.defaultLabel')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.countBadge, { backgroundColor: colors.gray200 }]}>
                        <Text style={[styles.countBadgeText, { color: colors.gray500 }]}>
                          {cat.productCount} {t('inventory.products')}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(cat)}
                      disabled={!canDelete && cat.isDefault}
                      style={[styles.deleteCatBtn, !canDelete && styles.deleteCatBtnDisabled]}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={cat.isDefault ? 'lock-closed-outline' : 'trash-outline'}
                        size={18}
                        color={canDelete ? '#EF4444' : colors.gray300}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {managedCategories.length <= 1 && (
                <Text style={[styles.noCatsText, { color: colors.gray400 }]}>
                  {t('inventory.noCustomCategories')}
                </Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },

  // Stats + Search (inside AppHeader)
  statsGrid:    { paddingHorizontal: 16, gap: 8, marginTop: 8, marginBottom: 12 },
  statsRow:     { flexDirection: 'row', gap: 8 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: Theme.radius.lg, marginHorizontal: 16, marginBottom: 14, paddingHorizontal: 12, height: 44, gap: 8 },
  searchIcon:   { flexShrink: 0 },
  searchInput:  { flex: 1, fontSize: 14, height: '100%' },

  // ── Tab bar ──
  tabBar:        { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  tabBarScroll:  { flex: 1 },
  tabBarContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 7, flexGrow: 1 },
  tab:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 7, borderRadius: Theme.radius.full },
  tabText:       { fontSize: 12, fontWeight: '600' },
  iconBtn:       { paddingHorizontal: 14, paddingVertical: 12, borderStartWidth: 1, position: 'relative' },
  bellBadge:     { position: 'absolute', top: 8, right: 8, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: '#EA580C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // ── Control row (filter + summary) ──
  controlRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderBottomWidth: 1, gap: 10 },
  filterBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: Theme.radius.full, borderWidth: 1.5 },
  filterBtnText: { fontSize: 12, fontWeight: '600' },
  summaryBlock:  { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  summaryCount:  { fontSize: 12 },
  summaryValue:  { fontSize: 12, fontWeight: '700' },

  // ── Product list ──
  list:          { padding: 16, paddingBottom: 32 },
  listEmpty:     { flex: 1 },

  // ── Empty state ──
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:      { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:     { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub:       { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAction:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Theme.radius.full, paddingHorizontal: 20, paddingVertical: 10, marginTop: 20 },
  emptyActionText:{ fontSize: 14, fontWeight: '600' },

  // ── Filter bottom sheet ──
  sheetOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  filterSheet:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12 },
  sheetHandle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetOption:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 },
  sheetOptionText:{ fontSize: 15 },
  sheetBottomPad: { height: 32 },

  // ── Report picker modal ──
  reportModalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 4 },
  reportModalTitle:   { fontSize: 17, fontWeight: '800' },
  reportOption:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  reportIconWrap:     { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reportOptionText:   { flex: 1 },
  reportOptionTitle:  { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  reportOptionSub:    { fontSize: 12 },

  // ── Manage categories modal ──
  modalOverlay:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:    { borderRadius: 24, padding: 20, maxHeight: '70%', width: '88%' },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:    { fontSize: 17, fontWeight: '800' },
  addCatRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addCatInput:   { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  addCatBtn:     { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catList:          { maxHeight: 360 },
  catCard:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 12, marginBottom: 8 },
  catInfo:          { flex: 1, gap: 6 },
  catNameRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catName:          { fontSize: 14, fontWeight: '600' },
  defaultBadge:     { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, fontWeight: '700' },
  countBadge:       { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText:   { fontSize: 11, fontWeight: '500' },
  deleteCatBtn:     { padding: 6 },
  deleteCatBtnDisabled: { opacity: 0.4 },
  noCatsText:       { fontSize: 13, textAlign: 'center', marginTop: 8 },
});
