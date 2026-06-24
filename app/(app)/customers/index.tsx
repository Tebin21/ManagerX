import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { useTranslation } from 'react-i18next';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { useCustomerStore } from '@/store/customerStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import type { CustomerWithStats } from '@/types/customers';

export default function CustomersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { customers, isLoading, loadCustomers, searchCustomers } = useCustomerStore();

  const { colors } = useAppTheme();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadCustomers(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  }, [loadCustomers]);

  const visible = useMemo(
    () => (query.trim() ? searchCustomers(query) : customers),
    [query, customers, searchCustomers]
  );

  const { totalDebtors, totalValue } = useMemo(() => ({
    totalDebtors: customers.filter((c) => c.remainingDebt > 0).length,
    totalValue: customers.reduce((s, c) => s + c.totalPurchases, 0),
  }), [customers]);

  const renderEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="people-outline" size={48} color={colors.gray300} />
      </View>
      {query.trim() ? (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('inventory.noResultsSub')}</Text>
        </>
      ) : (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('customers.noCustomers')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('customers.noCustomersDetail')}</Text>
          <TouchableOpacity
            style={[styles.emptyAction, { backgroundColor: colors.primary }]}
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

  const handleCustomerPress = useCallback((customerId: number) => {
    router.push(`/(app)/customers/${customerId}` as never);
  }, [router]);

  const renderItem = useCallback(({ item, index }: { item: CustomerWithStats; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 200, delay: index < 10 ? index * 35 : 0 }}
    >
      <CustomerCard customer={item} onPress={handleCustomerPress} />
    </MotiView>
  ), [handleCustomerPress]);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('customers.title')} showBack onBack={() => router.back()}>

        {/* Summary strip inside header */}
        {customers.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.headerStats}
          >
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>{customers.length}</Text>
              <Text style={styles.headerStatLabel}>{t('customers.title')}</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>{totalDebtors}</Text>
              <Text style={styles.headerStatLabel}>{t('customers.activeDebts')}</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <AmountText
                value={totalValue}
                formatter={(n) => `${(n / 1000).toFixed(0)}K`}
                style={styles.headerStatVal}
              />
              <Text style={styles.headerStatLabel}>{t('customers.totalSpent')}</Text>
            </View>
          </MotiView>
        )}

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.white }]}>
          <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.black }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('customers.search')}
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

      {/* Count strip */}
      {customers.length > 0 && (
        <View style={[styles.countStrip, { backgroundColor: colors.white, borderBottomColor: colors.gray100 }]}>
          <Text style={[styles.countText, { color: colors.gray500 }]}>
            {visible.length} {visible.length === 1 ? 'customer' : 'customers'}
          </Text>
          {totalDebtors > 0 && (
            <View style={styles.debtAlert}>
              <Ionicons name="warning" size={12} color="#92400E" />
              <Text style={styles.debtAlertText}>{totalDebtors} {t('customers.withDebt')}</Text>
            </View>
          )}
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
        onScrollBeginDrag={() => Keyboard.dismiss()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1 },
  gradHeader:         { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 },
  headerStats:        { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12 },
  headerStat:         { flex: 1, alignItems: 'center' },
  headerStatVal:      { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerStatLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginTop: 2 },
  headerStatDivider:  { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  searchWrap:         { flexDirection: 'row', alignItems: 'center', borderRadius: Theme.radius.lg, marginHorizontal: 16, marginBottom: 14, paddingHorizontal: 12, height: 44, gap: 8 },
  searchIcon:         { flexShrink: 0 },
  searchInput:        { flex: 1, fontSize: 14, height: '100%' },
  countStrip:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1 },
  countText:          { fontSize: 13 },
  debtAlert:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  debtAlertText:      { fontSize: 12, fontWeight: '600', color: '#92400E' },
  list:               { padding: 16, paddingBottom: 32 },
  listEmpty:          { flex: 1 },
  emptyContainer:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:          { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:         { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub:           { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAction:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Theme.radius.full, paddingHorizontal: 20, paddingVertical: 10, marginTop: 20 },
  emptyActionText:    { fontSize: 14, fontWeight: '600', color: '#fff' },
});
