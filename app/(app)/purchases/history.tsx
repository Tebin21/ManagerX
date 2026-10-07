import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PurchaseHistoryItem } from '@/components/purchases/PurchaseHistoryItem';
import { PeriodFilterModal } from '@/components/shared/PeriodFilterModal';
import { useTranslation } from 'react-i18next';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useBusinessStore } from '@/store/businessStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import type { Purchase } from '@/types/purchases';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { isDateWithinRange, formatDateShort, type PeriodKey } from '@/utils/dateRanges';
import { sharePurchasesAuditReport } from '@/lib/generateInvoice';

export default function PurchaseHistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isTablet, contentContainerStyle } = useResponsive();
  const { flexDirection, textAlign, writingDirection, isRTL } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { purchases, loadPurchases, deletePurchase } = usePurchaseStore();

  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Period filter state — defaults to 'today' (ئەمڕۆ)
  const {
    period,
    bounds,
    periodSheetVisible,
    setPeriodSheetVisible,
    handlePeriodSelect,
  } = usePeriodFilter();

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

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
        {
          text: t('purchases.confirmDelete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePurchase(purchase.id);
            } catch (err: any) {
              if (err?.message === 'PURCHASE_HAS_SALES') {
                Alert.alert(t('purchases.cannotDeleteTitle'), t('purchases.cannotDeleteHasSales'));
              } else if (err?.message === 'PURCHASE_HAS_ACTIVE_DEBT') {
                Alert.alert(t('purchases.cannotDeleteTitle'), t('purchases.cannotDeleteHasDebt'));
              } else {
                Alert.alert(t('common.error'), t('common.tryAgain'));
              }
            }
          },
        },
      ]
    );
  }

  // Filter purchases by selected period bounds
  const periodFilteredPurchases = useMemo(() => {
    if (period === 'all') return purchases;
    return purchases.filter((p) => {
      const dStr = p.date ? (p.date.length === 10 ? `${p.date}T12:00:00` : p.date) : p.createdAt;
      return isDateWithinRange(dStr, bounds.from, bounds.to);
    });
  }, [purchases, period, bounds]);

  // Search filter on top of the period-filtered purchases
  const visible = useMemo(() => {
    if (!query.trim()) return periodFilteredPurchases;
    const q = query.trim().toLowerCase();
    return periodFilteredPurchases.filter((p) => {
      const num = (p.purchaseNumber || '').toLowerCase();
      const prod = (p.productName || '').toLowerCase();
      const supp = (p.supplierName || '').toLowerCase();
      const phone = (p.supplierPhone || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return (
        num.includes(q) ||
        prod.includes(q) ||
        supp.includes(q) ||
        phone.includes(q) ||
        cat.includes(q)
      );
    });
  }, [query, periodFilteredPurchases]);

  // Human readable label for active period
  const periodDisplayLabel = useMemo(() => {
    if (period === 'today') return isKuLanguage ? 'ئەمڕۆ' : 'Today';
    if (period === 'week') return isKuLanguage ? 'ئەم هەفتەیە' : 'This Week';
    if (period === 'month') return isKuLanguage ? 'ئەم مانگە' : 'This Month';
    if (period === 'year') return isKuLanguage ? 'ئەم ساڵ' : 'This Year';
    if (period === 'all') return isKuLanguage ? 'هەمووی' : 'All Time';
    return `${formatDateShort(bounds.from)} → ${formatDateShort(bounds.to)}`;
  }, [period, bounds, isKuLanguage]);

  // Export PDF Purchases Audit Report
  const handleExportPdf = useCallback(async () => {
    if (visible.length === 0) {
      Alert.alert(
        isKuLanguage ? 'ئاگاداری' : 'Notice',
        t('purchases.noPurchasesToExport')
      );
      return;
    }
    setIsExporting(true);
    try {
      const business = useBusinessStore.getState();
      await sharePurchasesAuditReport(visible, periodDisplayLabel, {
        name: business.name || 'My Store',
        phone: business.phone || '',
        address: business.address || '',
        logoUri: business.logoUri ?? null,
      });
    } catch (err) {
      console.error('[PurchaseHistory] Export PDF failed:', err);
      Alert.alert(isKuLanguage ? 'هەڵە' : 'Error', String(err));
    } finally {
      setIsExporting(false);
    }
  }, [visible, periodDisplayLabel, isKuLanguage, t]);

  const hasQuery = query.trim().length > 0;

  const renderEmpty = () => (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons
          name={hasQuery ? 'search-outline' : purchases.length === 0 ? 'cart-outline' : 'calendar-outline'}
          size={48}
          color={colors.gray300}
        />
      </View>
      {hasQuery ? (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('inventory.noResults')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>{t('inventory.noResultsSub')}</Text>
        </>
      ) : purchases.length === 0 ? (
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
      ) : (
        <>
          <Text style={[styles.emptyTitle, { color: colors.black }]}>{t('purchases.noPurchasesInPeriod')}</Text>
          <Text style={[styles.emptySub, { color: colors.gray400 }]}>
            {`${periodDisplayLabel} — ${t('purchases.noPurchasesToExport')}`}
          </Text>
          {period !== 'all' && (
            <TouchableOpacity
              onPress={() => handlePeriodSelect('all')}
              style={[styles.emptyActionBtn, { backgroundColor: colors.softBlue, borderColor: colors.primary + '35', flexDirection }]}
              activeOpacity={0.8}
            >
              <Ionicons name="infinite-outline" size={16} color={colors.primary} />
              <Text style={[styles.emptyActionBtnText, { color: colors.primary }]}>
                {t('purchases.allPeriods')} ({purchases.length})
              </Text>
            </TouchableOpacity>
          )}
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
        showBack
        onBack={() => router.back()}
        rightAction={
          <View style={[styles.headerActions, { flexDirection }]}>
            <HeaderActionButton
              icon="funnel-outline"
              onPress={() => setPeriodSheetVisible(true)}
            />
            <HeaderActionButton
              icon="add"
              onPress={() => router.push('/(app)/purchases/new-purchase' as never)}
            />
          </View>
        }
      />

      {/* Search Input */}
      <View style={[styles.searchWrap, { backgroundColor: colors.white, flexDirection }, isTablet && contentContainerStyle]}>
        <Ionicons name="search" size={16} color={colors.gray400} style={styles.searchIcon} />
        <TextInput
          style={[
            styles.searchInput,
            { color: colors.black, textAlign, writingDirection },
            isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: query }), {}),
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('purchases.searchPlaceholder')}
          placeholderTextColor={colors.gray400}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Strip */}
      {purchases.length > 0 && (
        <View
          style={[
            styles.summaryStrip,
            { backgroundColor: colors.white, borderBottomColor: colors.gray100, flexDirection },
            isTablet && contentContainerStyle,
          ]}
        >
          <View style={[styles.summaryLeft, { flexDirection }]}>
            <Text style={[styles.summaryText, { color: colors.gray500 }]}>
              {visible.length} {visible.length === 1 ? 'purchase' : 'purchases'}
            </Text>
            {period !== 'all' && (
              <TouchableOpacity
                onPress={() => setPeriodSheetVisible(true)}
                style={[styles.periodBadge, { backgroundColor: colors.softBlue, flexDirection }]}
                activeOpacity={0.7}
              >
                <Ionicons name="funnel-outline" size={11} color={colors.primary} />
                <Text style={[styles.periodBadgeText, { color: colors.primary }]}>
                  {periodDisplayLabel}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <AmountText
            value={visible.reduce((s, p) => s + p.totalIQD, 0)}
            currency="IQD total"
            variant="small"
            style={[styles.summaryTotal, { color: colors.primary }]}
          />
        </View>
      )}

      {/* Purchases List */}
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          isTablet && contentContainerStyle,
          visible.length === 0 && styles.listEmpty,
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
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      />

      {/* Period Filter Modal */}
      <PeriodFilterModal
        visible={periodSheetVisible}
        onClose={() => setPeriodSheetVisible(false)}
        onSelect={handlePeriodSelect}
        current={period}
        includeAll
        onExportPdf={handleExportPdf}
        isExportingPdf={isExporting}
        exportPdfLabel={isKuLanguage ? 'دەرکردنی جەردی کڕینەکان بە PDF' : 'Export Purchases Audit (PDF)'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerActions: {
    gap: 8,
    alignItems: 'center',
  },

  searchWrap: {
    alignItems: 'center',
    borderRadius: Theme.radius.lg,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    ...Theme.shadow.soft,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },


  summaryStrip: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  summaryLeft: {
    alignItems: 'center',
    gap: 8,
  },
  summaryText: { fontSize: 13 },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryTotal: { fontSize: 13, fontWeight: '700' },

  list: { padding: 16, paddingBottom: 32 },
  listEmpty: { flex: 1 },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyAction: {
    alignItems: 'center',
    gap: 6,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 20,
  },
  emptyActionText: { fontSize: 14, fontWeight: '600' },
  emptyActionBtn: {
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
