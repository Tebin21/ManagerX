import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { useSoldProductsStore } from '@/store/soldProductsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import type { SoldProductRecord, SoldSortBy, SoldPaymentFilter } from '@/types/soldProducts';
import { fmtIQD, formatDateShort as fmtDate } from '@/utils/formatters';

const SORT_KEYS: SoldSortBy[] = ['date', 'customer', 'product', 'profit'];
const FILTER_KEYS: SoldPaymentFilter[] = ['all', 'cash', 'fib', 'debt'];

const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  cash: { bg: '#D1FAE5', text: '#065F46' },
  fib:  { bg: '#DBEAFE', text: '#1E40AF' },
  debt: { bg: '#FEE2E2', text: '#991B1B' },
};

interface CardProps {
  item: SoldProductRecord;
  colors: ReturnType<typeof useAppTheme>['colors'];
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function SoldProductCardImpl({ item, colors, t }: CardProps) {
  const badge = PAYMENT_COLORS[item.paymentMethod] ?? PAYMENT_COLORS.cash;
  const profitPct = item.purchasePrice > 0
    ? Math.round(((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100)
    : 0;
  const isProfit = item.profit >= 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.black }]}>
      {/* Left: image */}
      <View style={[styles.cardImage, { backgroundColor: colors.gray100 }]}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.cardImg} resizeMode="cover" fadeDuration={0} />
        ) : (
          <Ionicons name="bag-outline" size={24} color={colors.gray400} />
        )}
      </View>

      {/* Center: details */}
      <View style={styles.cardCenter}>
        <Text style={[styles.cardName, { color: colors.black }]} numberOfLines={1}>
          {item.productName}
        </Text>
        {item.itemId ? (
          <Text style={[styles.cardItemId, { color: colors.gray400 }]} numberOfLines={1}>
            ID: {item.itemId}
          </Text>
        ) : null}

        <View style={styles.cardRow}>
          <Ionicons name="receipt-outline" size={11} color={colors.gray400} />
          <Text style={[styles.cardMeta, { color: colors.gray500 }]}> {item.invoiceNumber}</Text>
        </View>

        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={11} color={colors.gray400} />
          <Text style={[styles.cardMeta, { color: colors.gray500 }]}> {fmtDate(item.soldDate)}</Text>
        </View>

        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={11} color={colors.gray400} />
          <Text style={[styles.cardMeta, { color: colors.gray500 }]} numberOfLines={1}>
            {' '}{item.customerName ?? t('soldProducts.unknown')}
          </Text>
        </View>
      </View>

      {/* Right: price + profit + payment */}
      <View style={styles.cardRight}>
        <Text style={[styles.cardTotal, { color: colors.black }]}>
          {fmtIQD(item.lineTotal)} IQD
        </Text>
        <Text style={[styles.cardQtyPrice, { color: colors.gray500 }]}>
          {item.soldQty} × {fmtIQD(item.sellingPrice)}
        </Text>

        <View style={[
          styles.profitBadge,
          { backgroundColor: isProfit ? '#D1FAE5' : '#FEE2E2' }
        ]}>
          <Text style={[styles.profitText, { color: isProfit ? '#065F46' : '#991B1B' }]}>
            {isProfit ? '+' : ''}{fmtIQD(item.profit)} IQD
          </Text>
          <Text style={[styles.profitPct, { color: isProfit ? '#059669' : '#DC2626' }]}>
            {profitPct}%
          </Text>
        </View>

        <View style={[styles.payBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.payText, { color: badge.text }]}>
            {t(`soldProducts.${item.paymentMethod}`)}
          </Text>
        </View>

        {item.remainingDebt > 0 ? (
          <Text style={[styles.debtHint, { color: '#DC2626' }]}>
            -{fmtIQD(item.remainingDebt)} IQD
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const SoldProductCard = React.memo(SoldProductCardImpl);

export default function SoldProductsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const {
    records, isLoading,
    search, sortBy, sortDir, paymentFilter,
    load, setSearch, setSortBy, toggleSortDir, setPaymentFilter,
    getFiltered,
  } = useSoldProductsStore();

  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const visible = useMemo(() => getFiltered(), [records, search, sortBy, sortDir, paymentFilter]);

  const totalRevenue = useMemo(() => visible.reduce((s, r) => s + r.lineTotal, 0), [visible]);
  const totalProfit  = useMemo(() => visible.reduce((s, r) => s + r.profit,   0), [visible]);

  const sortLabelKey: Record<SoldSortBy, string> = {
    date:     t('soldProducts.sortDate'),
    customer: t('soldProducts.sortCustomer'),
    product:  t('soldProducts.sortProduct'),
    profit:   t('soldProducts.sortProfit'),
  };

  const filterLabelKey: Record<SoldPaymentFilter, string> = {
    all:  t('soldProducts.filterAll'),
    cash: t('soldProducts.filterCash'),
    fib:  t('soldProducts.filterFib'),
    debt: t('soldProducts.filterDebt'),
  };

  const renderEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="bag-handle-outline" size={48} color={colors.gray300} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('soldProducts.noData')}</Text>
      <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('soldProducts.noDataSub')}</Text>
    </MotiView>
  );

  const renderItem = useCallback(({ item, index }: { item: SoldProductRecord; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 200, delay: index < 10 ? index * 30 : 0 }}
    >
      <SoldProductCard item={item} colors={colors} t={t} />
    </MotiView>
  ), [colors, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('soldProducts.title')}
        showBack
        onBack={() => router.back()}
        rightAction={
          <HeaderActionButton
            icon={showSearch ? 'close-outline' : 'search-outline'}
            onPress={() => {
              setShowSearch((v) => !v);
              if (showSearch) setSearch('');
            }}
          />
        }
      >
        {/* Stats bar */}
        <View style={[styles.statsRow, { backgroundColor: colors.white }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.black }]}>{fmtIQD(visible.length)}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('soldProducts.totalSold')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.black }]}>{fmtIQD(totalRevenue)}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('soldProducts.totalRevenue')} IQD</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.gray200 }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: totalProfit >= 0 ? '#059669' : '#DC2626' }]}>
              {totalProfit >= 0 ? '+' : ''}{fmtIQD(totalProfit)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('soldProducts.totalProfit')} IQD</Text>
          </View>
        </View>

        {/* Inline search */}
        {showSearch && (
          <MotiView
            from={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 44 }}
            transition={{ type: 'timing', duration: 200 }}
            style={[styles.searchWrap, { backgroundColor: colors.white }]}
          >
            <Ionicons name="search" size={16} color={colors.gray400} style={{ marginStart: 12 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.black }]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('soldProducts.search')}
              placeholderTextColor={colors.gray400}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8} style={{ marginEnd: 12 }}>
                <Ionicons name="close-circle" size={16} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </MotiView>
        )}
      </AppHeader>

      {/* Sort chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={[styles.chipsWrap, { borderBottomColor: colors.gray100 }]}
      >
        {SORT_KEYS.map((key) => {
          const active = sortBy === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => {
                if (active) toggleSortDir();
                else setSortBy(key);
              }}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark }
                  : { backgroundColor: colors.white, borderColor: colors.gray200 },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: active ? colors.white : colors.gray600 }]}>
                {sortLabelKey[key]}
              </Text>
              {active && (
                <Ionicons
                  name={sortDir === 'desc' ? 'arrow-down' : 'arrow-up'}
                  size={11}
                  color={colors.white}
                  style={{ marginStart: 3 }}
                />
              )}
            </TouchableOpacity>
          );
        })}

        <View style={[styles.chipSep, { backgroundColor: colors.gray200 }]} />

        {FILTER_KEYS.map((key) => {
          const active = paymentFilter === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setPaymentFilter(key)}
              style={[
                styles.chip,
                active
                  ? { backgroundColor: colors.gray700, borderColor: colors.gray700 }
                  : { backgroundColor: colors.white, borderColor: colors.gray200 },
              ]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, { color: active ? colors.white : colors.gray600 }]}>
                {filterLabelKey[key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Summary strip */}
      {records.length > 0 && (
        <View style={[styles.summaryStrip, { backgroundColor: colors.white, borderBottomColor: colors.gray100 }]}>
          <Text style={[styles.summaryText, { color: colors.gray500 }]}>
            {visible.length} {t('soldProducts.totalSold').toLowerCase()}
          </Text>
          <Text style={[styles.summaryTotal, { color: colors.primary }]}>
            {fmtIQD(totalRevenue)} IQD
          </Text>
        </View>
      )}

      <FlatList
        data={visible}
        keyExtractor={(item) => `${item.id}-${item.saleId}`}
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
  container:   { flex: 1 },

  // Stats
  statsRow:    { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, borderRadius: Theme.radius.lg, overflow: 'hidden' },
  statItem:    { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statValue:   { fontSize: 15, fontWeight: '700' },
  statLabel:   { fontSize: 10, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, marginVertical: 10 },

  // Search
  searchWrap:  { flexDirection: 'row', alignItems: 'center', borderRadius: Theme.radius.lg, marginHorizontal: 16, marginBottom: 10, overflow: 'hidden' },
  searchInput: { flex: 1, fontSize: 14, paddingHorizontal: 8, height: '100%' },

  // Chips
  chipsWrap:   { borderBottomWidth: 1 },
  chipsRow:    { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Theme.radius.full, borderWidth: 1.5 },
  chipText:    { fontSize: 12, fontWeight: '600' },
  chipSep:     { width: 1, height: 20, marginHorizontal: 4 },

  // Summary strip
  summaryStrip:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1 },
  summaryText:   { fontSize: 13 },
  summaryTotal:  { fontSize: 13, fontWeight: '700' },

  // List
  list:        { padding: 16, paddingBottom: 32, gap: 12 },
  listEmpty:   { flex: 1 },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:    { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Card
  card:        {
    flexDirection: 'row',
    borderRadius: Theme.radius.lg,
    padding: 14,
    gap: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage:   { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  cardImg:     { width: '100%', height: '100%' },
  cardCenter:  { flex: 1, gap: 3 },
  cardName:    { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  cardItemId:  { fontSize: 11, lineHeight: 14 },
  cardRow:     { flexDirection: 'row', alignItems: 'center' },
  cardMeta:    { fontSize: 11, lineHeight: 15 },
  cardRight:   { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  cardTotal:   { fontSize: 14, fontWeight: '700' },
  cardQtyPrice:{ fontSize: 11 },
  profitBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  profitText:  { fontSize: 11, fontWeight: '700' },
  profitPct:   { fontSize: 10, fontWeight: '600' },
  payBadge:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  payText:     { fontSize: 11, fontWeight: '700' },
  debtHint:    { fontSize: 10, fontWeight: '600' },
});
