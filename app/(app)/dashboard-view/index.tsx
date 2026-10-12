import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { Text } from '@/components/ui/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useBusinessStore } from '@/store/businessStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { PeriodFilterModal } from '@/components/shared/PeriodFilterModal';
import { usePeriodFilter } from '@/hooks/usePeriodFilter';
import { formatDateShort } from '@/utils/dateRanges';
import {
  getDashboardOverviewStats,
  getDashboardRecentActivities,
  type DashboardOverviewStats,
  type DashboardActivityItem,
} from '@/lib/sqlite';
import { DashboardHeroSlider } from '@/components/dashboard/DashboardHeroSlider';
import { DashboardMetricSquare } from '@/components/dashboard/DashboardMetricSquare';
import { DashboardActivityFeed } from '@/components/dashboard/DashboardActivityFeed';
import { useResponsive } from '@/hooks/useResponsive';

export default function DashboardViewScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');

  // Period filter state (defaults to 'all' for complete store overview)
  const { period, bounds, periodSheetVisible, setPeriodSheetVisible, handlePeriodSelect } =
    usePeriodFilter('all');

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<DashboardOverviewStats>({
    totalRevenue: 0,
    totalSales: 0,
    totalInvoices: 0,
    totalPurchasesCost: 0,
    totalPurchasesCount: 0,
    expectedProfit: 0,
    totalDiscount: 0,
    totalExpenses: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalItems: 0,
    lowStockCount: 0,
    customerDebtTotal: 0,
    supplierDebtTotal: 0,
  });

  const [activities, setActivities] = useState<DashboardActivityItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all dashboard metrics & activity feed
  const loadDashboardData = useCallback(async () => {
    try {
      const fromStr = period === 'all' ? undefined : bounds.from.toISOString();
      const toStr = period === 'all' ? undefined : bounds.to.toISOString();

      const [overviewData, recentActs] = await Promise.all([
        getDashboardOverviewStats(fromStr, toStr),
        getDashboardRecentActivities(40, fromStr, toStr, isKurdish ? 'ku' : 'en'),
      ]);

      setStats(overviewData);
      setActivities(recentActs);
    } catch (err) {
      console.error('[DashboardViewScreen] error loading data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [period, bounds, isKurdish]);

  // Formatted period badge label for activity feed and PDF export
  const periodLabel = useMemo(() => {
    switch (period) {
      case 'today':
        return isKurdish ? 'ئەمڕۆ' : 'Today';
      case 'week':
        return isKurdish ? 'ئەم هەفتەیە' : 'This Week';
      case 'month':
        return isKurdish ? 'ئەم مانگە' : 'This Month';
      case 'year':
        return isKurdish ? 'ئەمساڵ' : 'This Year';
      case 'all':
        return isKurdish ? 'هەموو کات' : 'All Time';
      case 'custom':
        return `${formatDateShort(bounds.from)} - ${formatDateShort(bounds.to)}`;
      default:
        return isKurdish ? 'ئەمڕۆ' : 'Today';
    }
  }, [period, bounds, isKurdish]);

  // Export complete Dashboard report as PDF
  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const business = useBusinessStore.getState();
      const { shareDashboardReport } = await import('@/lib/generateInvoice');
      await shareDashboardReport(
        stats,
        activities,
        periodLabel,
        {
          name: business.name || 'My Store',
          phone: business.phone || '',
          address: business.address || '',
          logoUri: business.logoUri ?? null,
        }
      );
    } catch (err) {
      console.error('[DashboardViewScreen] Export PDF failed:', err);
      Alert.alert(isKurdish ? 'هەڵە' : 'Error', String(err));
    } finally {
      setIsExporting(false);
    }
  }, [stats, activities, periodLabel, isKurdish]);

  useEffect(() => {
    setIsLoading(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Header */}
      <AppHeader
        title={t('dashboard.dashboardModule')}
        showBack
        rightAction={
          <HeaderActionButton
            icon="funnel-outline"
            onPress={() => setPeriodSheetVisible(true)}
          />
        }
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
        exportPdfLabel={isKurdish ? 'دەرکردنی ڕاپۆرتی داشبۆرد بە PDF' : 'Export Dashboard Report (PDF)'}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[styles.scrollContent, isTablet && styles.tabletContainer]}
      >
        {/* 1. Hero Image Banner with 5s Auto-sliding and Long-press manager */}
        <DashboardHeroSlider />

        {/* 2. Section Header: Analytics Grid */}
        <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.sectionTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="stats-chart" size={18} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.darkBlue, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {isKurdish ? 'ئامار و زانیارییەکان' : 'Analytics & Overview'}
            </Text>
          </View>

          {/* Action Row: Export PDF & Read-only badge */}
          <View style={[styles.sectionActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              onPress={handleExportPdf}
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
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
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
                {isKurdish ? 'تەنها بینین' : 'View Only'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. 12 Square Metric Cards Grid */}
        {isLoading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.gray400 }]}>
              {t('common.loading')}
            </Text>
          </View>
        ) : (
          <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* 1. Total Revenue / داهات */}
            <DashboardMetricSquare
              title={t('dashboard.totalRevenue')}
              value={stats.totalRevenue}
              isCurrency
              icon="wallet"
              color="#10B981"
              subtitle={isKurdish ? 'داهات' : 'Revenue'}
              delay={30}
            />

            {/* 2. Total Purchases Cost / کۆی بەهای کڕین */}
            <DashboardMetricSquare
              title={t('dashboard.totalPurchasesCost')}
              value={stats.totalPurchasesCost}
              isCurrency
              icon="bag-handle"
              color="#8B5CF6"
              subtitle={isKurdish ? 'کڕینەکان' : 'Purchases'}
              delay={60}
            />

            {/* 3. Total Expenses / کۆی مەسروفات و خەرجییەکان */}
            <DashboardMetricSquare
              title={isKurdish ? 'کۆی مەسروفات' : 'Total Expenses'}
              value={stats.totalExpenses}
              isCurrency
              icon="cash-outline"
              color="#E11D48"
              subtitle={isKurdish ? 'مەسروفات' : 'Expenses'}
              delay={80}
            />

            {/* 4. Expected Net Profit / کۆی قازانجی چاوەڕوانکراو */}
            <DashboardMetricSquare
              title={t('dashboard.expectedProfit')}
              value={stats.expectedProfit}
              isCurrency
              icon="trending-up"
              color={stats.expectedProfit >= 0 ? '#059669' : colors.error}
              subtitle={
                stats.expectedProfit >= 0
                  ? isKurdish
                    ? 'قازانج'
                    : 'Profit'
                  : isKurdish
                  ? 'زەرەر'
                  : 'Loss'
              }
              delay={100}
            />

            {/* 4. Total Sales / کۆی فرۆشتنەکان */}
            <DashboardMetricSquare
              title={t('dashboard.totalSalesCount')}
              value={stats.totalSales}
              isCurrency
              icon="receipt"
              color="#06B6D4"
              subtitle={isKurdish ? 'فرۆشراو' : 'Sales'}
              delay={120}
            />

            {/* 5. Total Invoices / کۆی پسوولەکان (count) */}
            <DashboardMetricSquare
              title={t('dashboard.totalInvoices')}
              value={stats.totalInvoices}
              icon="document-text"
              color="#6366F1"
              subtitle={isKurdish ? 'پسوولە' : 'Invoices'}
              delay={150}
            />

            {/* 6. Total Customers / کۆی کڕیارەکان (count) */}
            <DashboardMetricSquare
              title={t('dashboard.totalCustomers')}
              value={stats.totalCustomers}
              icon="people"
              color="#F59E0B"
              subtitle={isKurdish ? 'کڕیار' : 'Customers'}
              delay={180}
            />

            {/* 7. Total Suppliers / کۆی دابینکەران (count) */}
            <DashboardMetricSquare
              title={t('dashboard.totalSuppliers')}
              value={stats.totalSuppliers}
              icon="business"
              color="#14B8A6"
              subtitle={isKurdish ? 'دابینکەر' : 'Suppliers'}
              delay={210}
            />

            {/* 8. Total Products / کۆی کاڵاکان (count) */}
            <DashboardMetricSquare
              title={t('dashboard.totalItems')}
              value={stats.totalItems}
              icon="cube"
              color="#EC4899"
              subtitle={isKurdish ? 'کاڵا' : 'Items'}
              delay={240}
            />

            {/* 9. Low Stock Alert / کەمیی کاڵا (count) */}
            <DashboardMetricSquare
              title={t('dashboard.lowStockAlert')}
              value={stats.lowStockCount}
              icon="alert-circle"
              color="#EF4444"
              isAlert={stats.lowStockCount > 0}
              subtitle={
                stats.lowStockCount > 0
                  ? isKurdish
                    ? 'ئاگاداری'
                    : 'Low'
                  : isKurdish
                  ? 'باشە'
                  : 'OK'
              }
              delay={270}
            />

            {/* 10. Customer Receivables / قەرزی لای کڕیاران */}
            <DashboardMetricSquare
              title={t('dashboard.customerDebts')}
              value={stats.customerDebtTotal}
              isCurrency
              icon="arrow-down-circle"
              color="#EA580C"
              subtitle={isKurdish ? 'لای کڕیار' : 'Receivables'}
              delay={300}
            />

            {/* 11. Supplier Payables / قەرزی دابینکەران */}
            <DashboardMetricSquare
              title={t('dashboard.supplierDebts')}
              value={stats.supplierDebtTotal}
              isCurrency
              icon="arrow-up-circle"
              color="#DC2626"
              subtitle={isKurdish ? 'قەرزی سەرشان' : 'Payables'}
              delay={330}
            />

            {/* 12. Total Discounts / کۆی داشکاندن */}
            <DashboardMetricSquare
              title={t('dashboard.totalDiscounts')}
              value={stats.totalDiscount}
              isCurrency
              icon="pricetag"
              color="#8B5CF6"
              subtitle={isKurdish ? 'داشکاندن' : 'Discounts'}
              delay={360}
            />
          </View>
        )}

        {/* 4. Live Activity History Feed */}
        <DashboardActivityFeed
          activities={activities}
          isLoading={isLoading && !refreshing}
          periodLabel={periodLabel}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabletContainer: {
    maxWidth: 760,
    alignSelf: 'center',
    width: '100%',
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
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
});
