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
import { CompactAmount } from '@/components/shared/CompactAmount';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { useTranslation } from 'react-i18next';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { useCustomerStore } from '@/store/customerStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { Theme } from '@/constants/theme';
import type { CustomerWithStats } from '@/types/customers';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { applyKurdishFont, resolveInputIsKurdish } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';

export default function CustomersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { customers, isLoading, loadCustomers, searchCustomers } = useCustomerStore();

  const { colors, isDark } = useAppTheme();
  const { isTablet, contentContainerStyle, cardColumns } = useResponsive();
  const warningTint = useMemo(() => getStatusTint('warning', colors, isDark), [colors, isDark]);
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { isRTL, textAlign, writingDirection, flexDirection } = useRTL();
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
            <Text style={[styles.emptyActionText, { color: colors.white }]}>{t('customers.makeFirstSale')}</Text>
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
      style={isTablet ? { flex: 1 } : undefined}
    >
      <CustomerCard customer={item} onPress={handleCustomerPress} />
    </MotiView>
  ), [handleCustomerPress, isTablet]);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('customers.title')} showBack onBack={() => router.back()}>

        {/* Summary strip inside header */}
        {customers.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={[styles.headerStats, isTablet && { paddingVertical: 18, marginHorizontal: 28 }, { flexDirection }]}
          >
            <View style={styles.headerStat}>
              <Text style={[styles.headerStatVal, isTablet && { fontSize: 24 }]}>{customers.length}</Text>
              <Text style={[styles.headerStatLabel, isTablet && { fontSize: 13 }]}>{t('customers.title')}</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={[styles.headerStatVal, isTablet && { fontSize: 24 }]}>{totalDebtors}</Text>
              <Text style={[styles.headerStatLabel, isTablet && { fontSize: 13 }]}>{t('customers.activeDebts')}</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <CompactAmount value={totalValue} showCurrency={false} style={[styles.headerStatVal, isTablet && { fontSize: 24 }]} />
              <Text style={[styles.headerStatLabel, isTablet && { fontSize: 13 }]}>{t('customers.totalSpent')}</Text>
            </View>
          </MotiView>
        )}

        {/* Search */}
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.white, flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 8 },
            isTablet && { height: 54, marginHorizontal: 24, borderRadius: 16 },
          ]}
        >
          <Ionicons name="search" size={isTablet ? 20 : 16} color={colors.gray400} style={styles.searchIcon} />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: colors.black,
                textAlign,
                writingDirection,
              },
              isTablet && { fontSize: 17 },
              isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: query }), {}),
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('customers.search')}
            placeholderTextColor={colors.gray400}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={isTablet ? 20 : 16} color={colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </AppHeader>

      {/* Count strip */}
      {customers.length > 0 && (
        <View
          style={[
            styles.countStrip,
            { backgroundColor: colors.white, borderBottomColor: colors.gray100, flexDirection },
            isTablet && { paddingVertical: 14 },
            isTablet && contentContainerStyle,
          ]}
        >
          <Text style={[styles.countText, isTablet && { fontSize: 15 }, { color: colors.gray500 }]}>
            {visible.length} {visible.length === 1 ? 'customer' : 'customers'}
          </Text>
          {totalDebtors > 0 && (
            <View style={styles.debtAlert}>
              <Ionicons name="warning" size={isTablet ? 15 : 12} color={warningTint.text} />
              <Text style={[styles.debtAlertText, isTablet && { fontSize: 14 }, { color: warningTint.text }]}>{totalDebtors} {t('customers.withDebt')}</Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        key={`cust-list-${cardColumns}`}
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        numColumns={cardColumns}
        columnWrapperStyle={isTablet ? { gap: 12 } : undefined}
        contentContainerStyle={[styles.list, isTablet && contentContainerStyle, visible.length === 0 && styles.listEmpty]}
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
  debtAlertText:      { fontSize: 12, fontWeight: '600' },
  list:               { padding: 16, paddingBottom: 32 },
  listEmpty:          { flex: 1 },
  emptyContainer:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:          { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:         { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub:           { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAction:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Theme.radius.full, paddingHorizontal: 20, paddingVertical: 10, marginTop: 20 },
  emptyActionText:    { fontSize: 14, fontWeight: '600' },
});
