import React, { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, TextInput, TouchableOpacity,
  RefreshControl, StyleSheet, Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PurchaseHistoryItem } from '@/components/purchases/PurchaseHistoryItem';
import { useTranslation } from 'react-i18next';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import type { Purchase } from '@/types/purchases';
import { fmtIQD } from '@/utils/formatters';

export default function PurchaseHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { flexDirection } = useRTL();
  const { purchases, isLoading, loadPurchases, deletePurchase, searchPurchases } =
    usePurchaseStore();

  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadPurchases(); }, []);

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
        { text: t('purchases.confirmDelete'), style: 'destructive', onPress: () => deletePurchase(purchase.id) },
      ]
    );
  }

  const visible = query.trim() ? searchPurchases(query) : purchases;

  const renderEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="cart-outline" size={48} color={colors.gray300} />
      </View>
      {query.trim() ? (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('inventory.noResultsSub')}</Text>
        </>
      ) : (
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
      )}
    </MotiView>
  );

  const renderItem = ({ item, index }: { item: Purchase; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 200, delay: Math.min(index * 40, 400) }}
    >
      <PurchaseHistoryItem
        purchase={item}
        onPress={() => router.push(`/(app)/purchases/${item.id}` as never)}
        onDelete={() => confirmDelete(item)}
      />
    </MotiView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('purchases.history')}
        rightAction={
          <HeaderActionButton
            icon="add"
            onPress={() => router.push('/(app)/purchases/new-purchase' as never)}
          />
        }
      />

      <View style={[styles.searchWrap, { backgroundColor: colors.white, flexDirection }]}>
        <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.black }]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('purchases.searchPlaceholder')}
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

      {purchases.length > 0 && (
        <View style={[styles.summaryStrip, { backgroundColor: colors.white, borderBottomColor: colors.gray100, flexDirection }]}>
          <Text style={[styles.summaryText, { color: colors.gray500 }]}>
            {visible.length} {visible.length === 1 ? 'purchase' : 'purchases'}
          </Text>
          <Text style={[styles.summaryTotal, { color: colors.primary }]}>
            {fmtIQD(visible.reduce((s, p) => s + p.totalIQD, 0))} IQD total
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
  container:   { flex: 1 },
  gradHeader:  { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 },

  searchWrap: {
    flexDirection:    'row',
    alignItems:       'center',
    borderRadius:     Theme.radius.lg,
    marginHorizontal: 16,
    marginTop:        8,
    paddingHorizontal:12,
    height:           44,
    gap:              8,
  },
  searchIcon:  { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },

  summaryStrip: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    paddingHorizontal:20,
    paddingVertical:  10,
    borderBottomWidth:1,
  },
  summaryText:  { fontSize: 13 },
  summaryTotal: { fontSize: 13, fontWeight: '700' },

  list:      { padding: 16, paddingBottom: 32 },
  listEmpty: { flex: 1 },

  emptyContainer: {
    flex:             1,
    alignItems:       'center',
    justifyContent:   'center',
    paddingVertical:  60,
    paddingHorizontal:32,
  },
  emptyIcon: {
    width:          88,
    height:         88,
    borderRadius:   24,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   16,
  },
  emptyTitle:      { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub:        { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAction:     {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              6,
    borderRadius:     Theme.radius.full,
    paddingHorizontal:20,
    paddingVertical:  10,
    marginTop:        20,
  },
  emptyActionText: { fontSize: 14, fontWeight: '600' },
});
