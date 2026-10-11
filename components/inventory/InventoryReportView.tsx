import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { DashboardMetricSquare } from '@/components/dashboard/DashboardMetricSquare';
import { computeProductLowStock } from '@/lib/lowStock';
import { useSettingsStore } from '@/store/settingsStore';
import type { InventoryProduct, InventoryStats } from '@/types/inventory';
import { toEnglishDigits } from '@/utils/formatters';

interface Props {
  products: InventoryProduct[];
  stats: InventoryStats | null;
  onExportPdf: () => void;
  isExporting: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

export function InventoryReportView({
  products,
  stats,
  onExportPdf,
  isExporting,
  onRefresh,
  refreshing,
}: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const { globalLowStockEnabled, globalLowStockThreshold } = useSettingsStore();

  // 1. Core financial and inventory metrics
  const totalCostValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.purchasePrice || 0) * (p.quantity || 0), 0);
  }, [products]);

  const totalSellingValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.sellingPrice || 0) * (p.quantity || 0), 0);
  }, [products]);

  const expectedProfit = totalSellingValue - totalCostValue;

  const totalQuantity = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.quantity || 0), 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) =>
      computeProductLowStock(p, globalLowStockEnabled, globalLowStockThreshold)
    );
  }, [products, globalLowStockEnabled, globalLowStockThreshold]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => p.isActive && p.quantity === 0);
  }, [products]);

  const suppliersCount = useMemo(() => {
    return new Set(products.map((p) => p.supplierName).filter(Boolean)).size;
  }, [products]);

  const debtValue = useMemo(() => {
    return products
      .filter((p) => p.paymentStatus === 'debt')
      .reduce((acc, p) => acc + (p.purchasePrice || 0) * (p.quantity || 0), 0);
  }, [products]);

  const paidValue = useMemo(() => {
    return products
      .filter((p) => p.paymentStatus === 'paid')
      .reduce((acc, p) => acc + (p.purchasePrice || 0) * (p.quantity || 0), 0);
  }, [products]);

  // 2. Category distribution
  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; qty: number; cost: number }> = {};
    products.forEach((p) => {
      const cat = p.category?.trim() || (isKuLanguage ? 'گشتی' : 'General');
      if (!map[cat]) map[cat] = { count: 0, qty: 0, cost: 0 };
      map[cat].count += 1;
      map[cat].qty += p.quantity || 0;
      map[cat].cost += (p.purchasePrice || 0) * (p.quantity || 0);
    });

    return Object.entries(map).sort((a, b) => b[1].cost - a[1].cost);
  }, [products, isKuLanguage]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Section Header Row (Dashboard Style) ── */}
      <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.sectionTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="stats-chart" size={18} color={colors.primary} />
          </View>
          <Text
            style={[
              styles.sectionHeading,
              { color: colors.darkBlue, textAlign },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
            ]}
          >
            {t('inventory.inventoryAnalytics')}
          </Text>
        </View>

        {/* Action Row: Export PDF & Read-only badge */}
        <View style={[styles.sectionActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            onPress={onExportPdf}
            disabled={isExporting}
            activeOpacity={0.8}
            style={[
              styles.pdfActionBtn,
              {
                backgroundColor: colors.primary + '16',
                borderColor: colors.primary + '40',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={13} color={colors.primary} />
                <Text
                  style={[
                    styles.pdfActionText,
                    { color: colors.primary },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  PDF
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View
            style={[
              styles.readOnlyBadge,
              {
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderColor: colors.gray200,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="eye-outline" size={13} color={colors.gray400} />
            <Text style={[styles.readOnlyText, { color: colors.gray400 }]}>
              {isKuLanguage ? 'تەنها بینین' : 'View Only'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── 10 Square Metric Cards Grid (Dashboard Style) ── */}
      <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* 1. Total Inventory Cost / کۆی بەهای کڕینەوە */}
        <DashboardMetricSquare
          title={t('inventory.totalCostValue')}
          value={totalCostValue}
          isCurrency
          icon="wallet"
          color="#10B981"
          subtitle={isKuLanguage ? 'بەهای کڕین' : 'Cost Value'}
          delay={30}
        />

        {/* 2. Total Potential Selling Value / کۆی بەهای فرۆشتنەوە */}
        <DashboardMetricSquare
          title={t('inventory.totalSellingValue')}
          value={totalSellingValue}
          isCurrency
          icon="pricetags"
          color="#8B5CF6"
          subtitle={isKuLanguage ? 'فرۆشتنەوە' : 'Selling'}
          delay={60}
        />

        {/* 3. Expected Profit Margin / قازانجی چاوەڕوانکراو */}
        <DashboardMetricSquare
          title={t('inventory.expectedProfit')}
          value={expectedProfit}
          isCurrency
          icon="trending-up"
          color={expectedProfit >= 0 ? '#059669' : colors.error}
          subtitle={
            expectedProfit >= 0
              ? isKuLanguage
                ? 'قازانج'
                : 'Profit'
              : isKuLanguage
              ? 'زەرەر'
              : 'Loss'
          }
          delay={90}
        />

        {/* 4. Total Products Count / کۆی جۆری بەرهەمەکان */}
        <DashboardMetricSquare
          title={t('inventory.products')}
          value={products.length}
          icon="cube"
          color="#06B6D4"
          subtitle={isKuLanguage ? 'بەرهەم' : 'Items'}
          delay={120}
        />

        {/* 5. Total Units In Stock / کۆی بڕی بەردەست */}
        <DashboardMetricSquare
          title={t('inventory.totalUnits')}
          value={totalQuantity}
          icon="layers"
          color="#6366F1"
          subtitle={isKuLanguage ? 'کۆی بڕ' : 'Pieces'}
          delay={150}
        />

        {/* 6. Low Stock Alert / کەمیی کۆگا */}
        <DashboardMetricSquare
          title={t('inventory.lowStock')}
          value={lowStockProducts.length}
          icon="alert-circle"
          color="#EF4444"
          isAlert={lowStockProducts.length > 0}
          subtitle={
            lowStockProducts.length > 0
              ? isKuLanguage
                ? 'ئاگاداری'
                : 'Low'
              : isKuLanguage
              ? 'باشە'
              : 'OK'
          }
          delay={180}
        />

        {/* 7. Out of Stock / کاڵای تەواوبوو (بڕی ٠) */}
        <DashboardMetricSquare
          title={t('inventory.outOfStock')}
          value={outOfStockProducts.length}
          icon="close-circle"
          color="#F59E0B"
          isAlert={outOfStockProducts.length > 0}
          subtitle={isKuLanguage ? 'سفر' : 'Zero'}
          delay={210}
        />

        {/* 8. Active Suppliers Count / کۆی دابینکەران */}
        <DashboardMetricSquare
          title={t('inventory.suppliersCount')}
          value={suppliersCount}
          icon="business"
          color="#14B8A6"
          subtitle={isKuLanguage ? 'دابینکەر' : 'Suppliers'}
          delay={240}
        />

        {/* 9. Paid Stock Value / بەهای کاڵای پارەدراو */}
        <DashboardMetricSquare
          title={t('inventory.paidStock')}
          value={paidValue}
          isCurrency
          icon="checkmark-circle"
          color="#10B981"
          subtitle={isKuLanguage ? 'پارەدراو' : 'Paid'}
          delay={270}
        />

        {/* 10. Debt-funded Stock Value / بەهای کاڵای قەرزدار */}
        <DashboardMetricSquare
          title={t('inventory.debtStock')}
          value={debtValue}
          isCurrency
          icon="arrow-up-circle"
          color="#DC2626"
          subtitle={isKuLanguage ? 'قەرز' : 'Debt'}
          delay={300}
        />
      </View>

      {/* ── Category Breakdown Card ── */}
      {categoryStats.length > 0 && (
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : colors.gray100,
            },
          ]}
        >
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.cardTitle,
                { color: colors.darkBlue, textAlign },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {t('inventory.categoryDistribution')}
            </Text>
          </View>

          <View style={styles.categoryList}>
            {categoryStats.map(([catName, data], index) => {
              const percent = totalCostValue > 0 ? (data.cost / totalCostValue) * 100 : 0;
              const isLast = index === categoryStats.length - 1;

              return (
                <View key={`cat_stat_${catName}`} style={styles.catRowWrap}>
                  <View style={[styles.catRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.catLeft}>
                      <Text
                        style={[
                          styles.catName,
                          { color: colors.darkBlue, textAlign },
                          isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        ]}
                      >
                        {catName}
                      </Text>
                      <Text style={[styles.catSub, { color: colors.gray400, textAlign }]}>
                        {toEnglishDigits(data.count)} {t('inventory.products')} • {toEnglishDigits(data.qty)} {t('inventory.totalQty')}
                      </Text>
                    </View>

                    <View style={[styles.catRight, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                      <AmountText
                        value={data.cost}
                        style={[styles.catAmount, { color: colors.primary }]}
                        variant="small"
                      />
                      <Text style={[styles.catPercent, { color: colors.gray400, writingDirection: 'ltr' }]}>
                        %{toEnglishDigits(Math.round(percent))}
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min(100, Math.max(3, percent))}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>

                  {!isLast && (
                    <View style={[styles.catDivider, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Low Stock Preview Box (Read-Only) ── */}
      {lowStockProducts.length > 0 && (
        <View
          style={[
            styles.cardContainer,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: colors.error + '40',
            },
          ]}
        >
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: colors.error + '18' }]}>
              <Ionicons name="warning-outline" size={18} color={colors.error} />
            </View>
            <Text
              style={[
                styles.cardTitle,
                { color: colors.error, textAlign },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {isKuLanguage
                ? `ئاگاداری کەمیی کاڵاکان (${toEnglishDigits(lowStockProducts.length)})`
                : `Low Stock Warning (${lowStockProducts.length})`}
            </Text>
          </View>

          <View style={styles.lowStockList}>
            {lowStockProducts.slice(0, 6).map((item, idx) => (
              <View
                key={`low_${item.id}_${idx}`}
                style={[
                  styles.lowStockRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  idx < Math.min(6, lowStockProducts.length) - 1 && {
                    borderBottomColor: isDark ? colors.gray200 : colors.gray100,
                    borderBottomWidth: 1,
                  },
                ]}
              >
                <View style={styles.lowStockInfo}>
                  <Text
                    style={[
                      styles.lowStockName,
                      { color: colors.darkBlue, textAlign },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={[styles.lowStockCat, { color: colors.gray400, textAlign }]}>
                    {item.category || (isKuLanguage ? 'گشتی' : 'General')}
                  </Text>
                </View>

                <View
                  style={[
                    styles.lowStockBadge,
                    {
                      backgroundColor: colors.error + '18',
                      borderColor: colors.error + '40',
                    },
                  ]}
                >
                  <Text style={[styles.lowStockBadgeText, { color: colors.error, writingDirection: 'ltr' }]}>
                    {toEnglishDigits(item.quantity)} {item.unit || (isKuLanguage ? 'دانە' : 'pcs')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleGroup: {
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionActions: {
    alignItems: 'center',
    gap: 6,
  },
  pdfActionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  pdfActionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  readOnlyBadge: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  readOnlyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    marginHorizontal: 16,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryList: {
    gap: 12,
  },
  catRowWrap: {
    gap: 6,
  },
  catRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLeft: {
    flex: 1,
  },
  catName: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  catSub: {
    fontSize: 11,
  },
  catRight: {
    gap: 2,
  },
  catAmount: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  catPercent: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  catDivider: {
    height: 1,
    marginTop: 6,
  },
  lowStockList: {
    gap: 0,
  },
  lowStockRow: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  lowStockCat: {
    fontSize: 11,
  },
  lowStockBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  lowStockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
