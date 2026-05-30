import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
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
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import type { InventoryFilter, InventorySortOrder } from '@/types/inventory';

const FILTER_KEYS: InventoryFilter[] = ['all', 'lowStock', 'paid', 'debt'];

export default function InventoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    stats, categories, isLoading,
    filter, sortOrder, selectedCategory,
    loadInventory, setFilter, setCategory,
    getFilteredProducts,
  } = useInventoryStore();

  const { colors } = useAppTheme();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadInventory(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  }, [loadInventory]);

  const onExportPDF = useCallback(async () => {
    const { getFilteredProducts: gfp } = useInventoryStore.getState();
    const products = gfp('');
    if (products.length === 0) {
      Alert.alert(t('common.error'), t('inventory.noInventoryDetail'));
      return;
    }
    try {
      const { shareInventoryReport } = await import('@/lib/generateInvoice');
      const { loadBusiness } = await import('@/lib/sqlite');
      const biz = await loadBusiness();
      await shareInventoryReport(
        products,
        useInventoryStore.getState().stats!,
        { name: biz?.name ?? 'My Business', phone: biz?.phone ?? '', address: biz?.address ?? '', logoUri: biz?.logoPath ?? null }
      );
    } catch (err) {
      console.error('Failed to export inventory:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, []);

  const visible = getFilteredProducts(query);

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
            style={[styles.emptyAction, { backgroundColor: colors.primary }]}
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

  const renderItem = ({ item, index }: { item: ReturnType<typeof getFilteredProducts>[0]; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 200, delay: Math.min(index * 35, 350) }}
    >
      <ProductCard
        product={item}
        onPress={() => router.push(`/(app)/inventory/${item.id}` as never)}
      />
    </MotiView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('inventory.title')}
        showBack
        onBack={() => router.back()}
        rightAction={<HeaderActionButton icon="share-outline" onPress={onExportPDF} />}
      >

        {/* Stats grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <InventoryStatsCard
                label={t('inventory.products')}
                value={String(stats.totalProducts)}
                icon="cube"
                delay={0}
              />
              <InventoryStatsCard
                label={t('inventory.totalQty')}
                value={String(stats.totalQuantity)}
                icon="layers"
                delay={60}
              />
            </View>
            <View style={styles.statsRow}>
              <InventoryStatsCard
                label={t('inventory.totalValue')}
                value={`${stats.totalValueIQD.toLocaleString('en-US')} IQD`}
                icon="wallet"
                delay={120}
              />
              <InventoryStatsCard
                label={t('inventory.lowStock')}
                value={String(stats.lowStockCount)}
                icon="warning"
                accent={stats.lowStockCount > 0}
                delay={180}
              />
            </View>
          </View>
        )}

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.white }]}>
          <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.black }]}
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

      {/* Category filter */}
      {categories.length > 0 && (
        <View style={styles.categoryWrap}>
          <CategoryFilterBar
            categories={categories}
            selected={selectedCategory}
            onSelect={setCategory}
          />
        </View>
      )}

      {/* Filter chips — static map avoids broken dynamic key generation */}
      <View style={styles.filterRow}>
        {FILTER_KEYS.map((key) => {
          const filterLabel: Record<string, string> = {
            all:      t('inventory.filterAll'),
            lowStock: t('inventory.filterLow'),
            paid:     t('inventory.filterPaid'),
            debt:     t('inventory.filterDebt'),
          };
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.filterChip,
                filter === key
                  ? { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark }
                  : { borderColor: colors.gray200, backgroundColor: colors.white }
              ]}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, { color: filter === key ? colors.white : colors.gray600 }]}>
                {filterLabel[key] ?? key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary strip */}
      {(stats?.totalProducts ?? 0) > 0 && (
        <View style={[styles.summaryStrip, { backgroundColor: colors.white, borderBottomColor: colors.gray100 }]}>
          <Text style={[styles.summaryText, { color: colors.gray500 }]}>
            {visible.length} {t('inventory.products')}
          </Text>
          <Text style={[styles.summaryTotal, { color: colors.primary }]}>
            {visible.reduce((s, p) => s + p.purchasePrice * p.quantity, 0).toLocaleString('en-US')} IQD
          </Text>
        </View>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  gradHeader:   { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 },
  statsGrid:    { paddingHorizontal: 16, gap: 10, marginTop: 8, marginBottom: 12 },
  statsRow:     { flexDirection: 'row', gap: 10 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', borderRadius: Theme.radius.lg, marginHorizontal: 16, marginBottom: 14, paddingHorizontal: 12, height: 44, gap: 8 },
  searchIcon:   { flexShrink: 0 },
  searchInput:  { flex: 1, fontSize: 14, height: '100%' },
  categoryWrap: { paddingTop: 14, paddingBottom: 4 },
  filterRow:    { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 8 },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Theme.radius.full, borderWidth: 1.5 },
  filterChipActive: {},
  filterChipText:   { fontSize: 12, fontWeight: '600' },
  filterChipTextActive: {},
  summaryStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1 },
  summaryText:  { fontSize: 13 },
  summaryTotal: { fontSize: 13, fontWeight: '700' },
  list:         { padding: 16, paddingBottom: 32 },
  listEmpty:    { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:    { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAction:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Theme.radius.full, paddingHorizontal: 20, paddingVertical: 10, marginTop: 20 },
  emptyActionText: { fontSize: 14, fontWeight: '600' },
});
