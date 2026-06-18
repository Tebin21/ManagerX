import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { CustomerCard } from '@/components/customers/CustomerCard';
import { useTranslation } from 'react-i18next';
import { useCustomerStore } from '@/store/customerStore';
import { useSupplierStore } from '@/store/supplierStore';
import { useDebtStore } from '@/store/debtStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import type { CustomerWithStats } from '@/types/customers';
import type { SupplierWithStats } from '@/types/suppliers';
import { fmtIQD, formatDateShort } from '@/utils/formatters';
import { useDirectionalChevron } from '@/lib/rtl';

type Tab = 'customers' | 'suppliers';

function SupplierCard({ supplier, onPress }: { supplier: SupplierWithStats; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { chevronForward } = useDirectionalChevron();
  const { t } = useTranslation();
  const lastDate = supplier.lastPurchaseDate ? formatDateShort(supplier.lastPurchaseDate) : null;
  return (
    <TouchableOpacity
      style={[styles.supplierCard, { backgroundColor: colors.white }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.cardAvatar, { backgroundColor: colors.softBlue }]}>
        <Ionicons name="business-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.black }]} numberOfLines={1}>{supplier.name}</Text>
        {supplier.phone ? (
          <View style={styles.cardPhoneRow}>
            <Ionicons name="call-outline" size={12} color={colors.gray400} />
            <Text style={[styles.cardPhone, { color: colors.gray400 }]}>{supplier.phone}</Text>
          </View>
        ) : null}
        <Text style={[styles.cardSub, { color: colors.gray400 }]}>
          {supplier.purchaseCount} {t('suppliers.purchases')} · {fmtIQD(supplier.totalSpent)} IQD
        </Text>
        {lastDate ? (
          <View style={styles.cardDateRow}>
            <Ionicons name="time-outline" size={11} color={colors.gray300} />
            <Text style={[styles.cardDate, { color: colors.gray400 }]}>
              {t('suppliers.lastPurchase')}: {lastDate}
            </Text>
          </View>
        ) : null}
      </View>
      <Ionicons name={chevronForward as never} size={18} color={colors.gray300} />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const { customers, isLoading: custLoading, loadCustomers, searchCustomers } = useCustomerStore();
  const { suppliers, isLoading: supLoading, loadSuppliers, searchSuppliers } = useSupplierStore();
  const { purchaseDebts, loadAll: loadDebts } = useDebtStore();

  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [custQuery, setCustQuery] = useState('');
  const [supQuery, setSupQuery] = useState('');
  const [custRefreshing, setCustRefreshing] = useState(false);
  const [supRefreshing, setSupRefreshing] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadSuppliers();
    loadDebts();
  }, []);

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

  const visibleCustomers = custQuery.trim() ? searchCustomers(custQuery) : customers;
  const visibleSuppliers = supQuery.trim() ? searchSuppliers(supQuery) : suppliers;

  const totalDebtors = customers.filter((c) => c.remainingDebt > 0).length;
  const totalCustValue = customers.reduce((s, c) => s + c.totalPurchases, 0);
  const totalSupSpent = suppliers.reduce((s, sup) => s + sup.totalSpent, 0);
  const activeSupplierDebts = new Set(
    purchaseDebts
      .filter((d) => d.status === 'active' && d.remainingAmount > 0)
      .map((d) => d.supplierName.toLowerCase())
  ).size;

  const renderCustomerEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="people-outline" size={48} color={colors.gray300} />
      </View>
      {custQuery.trim() ? (
        <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
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

  const renderSupplierEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="business-outline" size={48} color={colors.gray300} />
      </View>
      {supQuery.trim() ? (
        <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
      ) : (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('suppliers.noSuppliers')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('suppliers.noSuppliersDetail')}</Text>
          <TouchableOpacity
            style={[styles.emptyAction, { backgroundColor: colors.primary }]}
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

  const renderCustomer = ({ item, index }: { item: CustomerWithStats; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 200, delay: Math.min(index * 35, 350) }}
    >
      <CustomerCard
        customer={item}
        onPress={() => router.push(`/(app)/customers/${item.id}` as never)}
      />
    </MotiView>
  );

  const renderSupplier = ({ item, index }: { item: SupplierWithStats; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 200, delay: Math.min(index * 35, 350) }}
    >
      <SupplierCard
        supplier={item}
        onPress={() => router.push(`/(app)/suppliers/${item.id}` as never)}
      />
    </MotiView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('history.title')} showBack onBack={() => router.back()}>
        {/* Stats strip */}
        {activeTab === 'customers' && customers.length > 0 && (
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
              <Text style={styles.headerStatVal}>{fmtIQD(totalCustValue)}</Text>
              <Text style={styles.headerStatLabel}>{t('customers.totalSpent')}</Text>
            </View>
          </MotiView>
        )}
        {activeTab === 'suppliers' && suppliers.length > 0 && (
          <MotiView
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.headerStats}
          >
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>{suppliers.length}</Text>
              <Text style={styles.headerStatLabel}>{t('suppliers.title')}</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>{activeSupplierDebts}</Text>
              <Text style={styles.headerStatLabel}>{t('suppliers.activeDebts')}</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal}>{fmtIQD(totalSupSpent)}</Text>
              <Text style={styles.headerStatLabel}>{t('suppliers.totalSpent')} IQD</Text>
            </View>
          </MotiView>
        )}

        {/* Tab pills */}
        <View style={[styles.tabRow, { backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16, marginBottom: 8 }]}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'customers' && { backgroundColor: '#fff' }]}
            onPress={() => setActiveTab('customers')}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={14} color={activeTab === 'customers' ? colors.primary : 'rgba(255,255,255,0.8)'} />
            <Text style={[styles.tabPillText, { color: activeTab === 'customers' ? colors.primary : 'rgba(255,255,255,0.8)' }]}>
              {t('history.customersTab')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'suppliers' && { backgroundColor: '#fff' }]}
            onPress={() => setActiveTab('suppliers')}
            activeOpacity={0.8}
          >
            <Ionicons name="business-outline" size={14} color={activeTab === 'suppliers' ? colors.primary : 'rgba(255,255,255,0.8)'} />
            <Text style={[styles.tabPillText, { color: activeTab === 'suppliers' ? colors.primary : 'rgba(255,255,255,0.8)' }]}>
              {t('history.suppliersTab')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        {activeTab === 'customers' ? (
          <View style={[styles.searchWrap, { backgroundColor: colors.white }]}>
            <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.black }]}
              value={custQuery}
              onChangeText={setCustQuery}
              placeholder={t('customers.search')}
              placeholderTextColor={colors.gray400}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {custQuery.length > 0 && (
              <TouchableOpacity onPress={() => setCustQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.searchWrap, { backgroundColor: colors.white }]}>
            <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.black }]}
              value={supQuery}
              onChangeText={setSupQuery}
              placeholder={t('suppliers.search')}
              placeholderTextColor={colors.gray400}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {supQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSupQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </AppHeader>


      {/* Customers list */}
      {activeTab === 'customers' && (
        <FlatList
          data={visibleCustomers}
          keyExtractor={(item) => `c-${item.id}`}
          renderItem={renderCustomer}
          contentContainerStyle={[styles.list, visibleCustomers.length === 0 && styles.listEmpty]}
          ListEmptyComponent={renderCustomerEmpty}
          removeClippedSubviews
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={custRefreshing || custLoading}
              onRefresh={onRefreshCustomers}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Suppliers list */}
      {activeTab === 'suppliers' && (
        <FlatList
          data={visibleSuppliers}
          keyExtractor={(item) => `s-${item.id}`}
          renderItem={renderSupplier}
          contentContainerStyle={[styles.list, visibleSuppliers.length === 0 && styles.listEmpty]}
          ListEmptyComponent={renderSupplierEmpty}
          removeClippedSubviews
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={supRefreshing || supLoading}
              onRefresh={onRefreshSuppliers}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  headerStats:       { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12 },
  headerStat:        { flex: 1, alignItems: 'center' },
  headerStatVal:     { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerStatLabel:   { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginTop: 2 },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },

  tabRow:  { flexDirection: 'row', borderRadius: Theme.radius.full, padding: 4, gap: 4, marginBottom: 8 },
  tabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Theme.radius.full, paddingVertical: 8 },
  tabPillText: { fontSize: 13, fontWeight: '700' },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', borderRadius: Theme.radius.lg, marginHorizontal: 16, marginBottom: 14, paddingHorizontal: 12, height: 44, gap: 8 },
  searchIcon:  { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },

  countStrip:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1 },
  countText:     { fontSize: 13 },
  debtAlert:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  debtAlertText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  list:      { padding: 16, paddingBottom: 32 },
  listEmpty: { flex: 1 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:      { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:     { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub:       { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAction:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Theme.radius.full, paddingHorizontal: 20, paddingVertical: 10, marginTop: 20 },
  emptyActionText:{ fontSize: 14, fontWeight: '600', color: '#fff' },

  supplierCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardAvatar:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginEnd: 12 },
  cardBody:      { flex: 1 },
  cardName:      { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardPhoneRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  cardPhone:     { fontSize: 12 },
  cardSub:       { fontSize: 12, marginBottom: 2 },
  cardDateRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardDate:      { fontSize: 11 },
});
