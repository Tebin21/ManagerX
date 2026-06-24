import React, { useEffect, useState, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { useTranslation } from 'react-i18next';
import { useSupplierStore } from '@/store/supplierStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import type { SupplierWithStats } from '@/types/suppliers';
import { fmtIQD } from '@/utils/formatters';
import { useDirectionalChevron } from '@/lib/rtl';

function SupplierCard({ supplier, onPress }: { supplier: SupplierWithStats; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { chevronForward } = useDirectionalChevron();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.white }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.cardAvatar, { backgroundColor: colors.softBlue }]}>
        <Ionicons name="business-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.black }]} numberOfLines={1}>{supplier.name}</Text>
        {supplier.phone ? (
          <Text style={[styles.cardPhone, { color: colors.gray400 }]}>{supplier.phone}</Text>
        ) : null}
        <Text style={[styles.cardSub, { color: colors.gray400 }]}>
          {supplier.purchaseCount} {t('suppliers.purchases')} · {fmtIQD(supplier.totalSpent)} IQD
        </Text>
      </View>
      <Ionicons name={chevronForward as never} size={18} color={colors.gray300} />
    </TouchableOpacity>
  );
}

export default function SuppliersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { suppliers, isLoading, loadSuppliers, searchSuppliers } = useSupplierStore();
  const { colors } = useAppTheme();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadSuppliers(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSuppliers();
    setRefreshing(false);
  }, [loadSuppliers]);

  const visible = query.trim() ? searchSuppliers(query) : suppliers;
  const totalSpent = suppliers.reduce((s, sup) => s + sup.totalSpent, 0);

  const renderEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="business-outline" size={48} color={colors.gray300} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('suppliers.noSuppliers')}</Text>
      <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('suppliers.noSuppliersDetail')}</Text>
    </MotiView>
  );

  const renderItem = ({ item, index }: { item: SupplierWithStats; index: number }) => (
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
      <AppHeader title={t('suppliers.title')} showBack onBack={() => router.back()}>
        {suppliers.length > 0 && (
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
              <Text style={styles.headerStatVal}>{fmtIQD(totalSpent)}</Text>
              <Text style={styles.headerStatLabel}>{t('suppliers.totalSpent')} IQD</Text>
            </View>
          </MotiView>
        )}

        <View style={[styles.searchWrap, { backgroundColor: colors.white }]}>
          <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.black }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('suppliers.search')}
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
        onScrollBeginDrag={() => Keyboard.dismiss()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  headerStats:     { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 12 },
  headerStat:      { flex: 1, alignItems: 'center' },
  headerStatVal:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginTop: 2 },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 4 },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', borderRadius: Theme.radius.lg, marginHorizontal: 16, marginBottom: 14, paddingHorizontal: 12, height: 44, gap: 8, backgroundColor: '#fff' },
  searchIcon:      { flexShrink: 0 },
  searchInput:     { flex: 1, fontSize: 14, height: '100%' },
  list:            { padding: 16, paddingBottom: 32 },
  listEmpty:       { flex: 1 },
  emptyContainer:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:       { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:      { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub:        { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  card:            { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardAvatar:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginEnd: 12 },
  cardBody:        { flex: 1 },
  cardName:        { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardPhone:       { fontSize: 12, marginBottom: 2 },
  cardSub:         { fontSize: 12 },
});
