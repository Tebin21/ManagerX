import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
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
import { useTranslation } from 'react-i18next';
import { useInventoryStore } from '@/store/inventoryStore';
import { InventoryHistoryItem } from '@/components/inventory/InventoryHistoryItem';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import type { InventoryHistoryItem as HistoryItem } from '@/types/inventory';

type StatusFilter = 'all' | 'sold_out' | 'removed';

export default function InventoryHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const {
    inventoryHistory,
    loadInventoryHistory,
    permanentDeleteHistoryItem,
    restoreFromHistory,
  } = useInventoryStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInventoryHistory();
  }, []);

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
              if (msg.startsWith('ITEM_LIMIT_REACHED|')) {
                const [used, limit] = msg.split('|')[1].split(',');
                Alert.alert(
                  t('inventory.itemLimitReachedTitle'),
                  t('inventory.itemLimitReachedBody', { used, limit }),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('settings.upgradeScreen.title'), onPress: () => router.push('/(app)/settings/plan-limits' as never) },
                  ]
                );
              } else {
                Alert.alert(t('common.error'), t('common.tryAgain'));
              }
            }
          },
        },
      ]
    );
  }, [restoreFromHistory, t, router]);

  const handlePermanentDelete = useCallback((item: HistoryItem) => {
    Alert.alert(
      t('inventoryHistory.permanentDeleteTitle'),
      t('inventoryHistory.permanentDeleteMsg', { name: item.productName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('inventoryHistory.permanentDeleteConfirm'),
          style: 'destructive',
          onPress: () => permanentDeleteHistoryItem(item.id),
        },
      ]
    );
  }, [permanentDeleteHistoryItem, t]);

  const filtered: HistoryItem[] =
    statusFilter === 'all'
      ? inventoryHistory
      : inventoryHistory.filter((h) => h.status === statusFilter);

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all',      label: t('inventoryHistory.filterAll') },
    { key: 'sold_out', label: t('inventoryHistory.filterSoldOut') },
    { key: 'removed',  label: t('inventoryHistory.filterRemoved') },
  ];

  const renderEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="time-outline" size={40} color={colors.gray300} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.black }]}>
        {t('inventoryHistory.noHistory')}
      </Text>
      <Text style={[styles.emptySub, { color: colors.gray400 }]}>
        {t('inventoryHistory.noHistoryDetail')}
      </Text>
    </MotiView>
  );

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
        delay: Math.min(index * 30, 300),
      }}
    >
      <InventoryHistoryItem
        item={item}
        onRestore={item.status === 'removed' ? () => handleRestore(item) : undefined}
        onPermanentDelete={() => handlePermanentDelete(item)}
      />
    </MotiView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('inventoryHistory.title')}
        showBack
        onBack={() => router.back()}
      />

      {/* Status filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(({ key, label }) => {
          const active = statusFilter === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setStatusFilter(key)}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark }
                  : { borderColor: colors.gray200, backgroundColor: colors.white },
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: active ? colors.white : colors.gray600 },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Count strip */}
      {filtered.length > 0 && (
        <View style={[styles.countStrip, { backgroundColor: colors.white, borderBottomColor: colors.gray100 }]}>
          <Text style={[styles.countText, { color: colors.gray500 }]}>
            {filtered.length} {t('inventory.products')}
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          filtered.length === 0 && styles.listEmpty,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  filterRow:    { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 8 },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Theme.radius.full, borderWidth: 1.5 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  countStrip:   { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1 },
  countText:    { fontSize: 13 },
  list:         { padding: 16, paddingBottom: 40 },
  listEmpty:    { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:    { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
