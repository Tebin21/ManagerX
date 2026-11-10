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
import { LoadingView } from '@/components/ui/LoadingView';
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
import { useManagementStore } from '@/store/managementStore';

const DEFAULT_DASHBOARD_STATS: DashboardOverviewStats = {
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
  totalBatchesCount: 0,
  activeBatchesCount: 0,
  depletedBatchesCount: 0,
  multiBatchProductsCount: 0,
  expiringBatchesCount: 0,
  totalInstallmentSales: 0,
  totalInstallmentCollected: 0,
  totalInstallmentRemaining: 0,
  activeInstallmentAccounts: 0,
  totalInstallmentAccounts: 0,
};

export default function DashboardViewScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const isAr = useLanguageStore((s) => s.language === 'ar');

  const isEmployee = useManagementStore((s) => s.isEmployee);
  const currentPermissions = useManagementStore((s) => s.currentPermissions);
  const currentEmployeeAccount = useManagementStore((s) => s.currentEmployeeAccount);
  const widgets = currentPermissions?.dashboardWidgets;
  const activityScope = currentPermissions?.subPermissions?.activityScope ?? 'all';

  const showRevenue = !isEmployee || !widgets || widgets.kpiRevenue !== 'hidden';
  const lockRevenue = Boolean(isEmployee && widgets && widgets.kpiRevenue === 'disabled');

  const showSales = !isEmployee || !widgets || widgets.kpiSales !== 'hidden';
  const lockSales = Boolean(isEmployee && widgets && widgets.kpiSales === 'disabled');

  const showPurchases = !isEmployee || !widgets || widgets.kpiPurchases !== 'hidden';
  const lockPurchases = Boolean(isEmployee && widgets && widgets.kpiPurchases === 'disabled');

  const showExpenses = !isEmployee || !widgets || widgets.kpiExpenses !== 'hidden';
  const lockExpenses = Boolean(isEmployee && widgets && widgets.kpiExpenses === 'disabled');

  const showDebts = !isEmployee || !widgets || widgets.kpiDebts !== 'hidden';
  const lockDebts = Boolean(isEmployee && widgets && widgets.kpiDebts === 'disabled');

  const showStockAlerts = !isEmployee || !widgets || widgets.kpiStockAlerts !== 'hidden';
  const lockStockAlerts = Boolean(isEmployee && widgets && widgets.kpiStockAlerts === 'disabled');

  const showActivityFeed = !isEmployee || !widgets || widgets.activityFeed !== 'hidden';
  const lockActivityFeed = Boolean(isEmployee && widgets && widgets.activityFeed === 'disabled');

  // Period filter state (defaults to 'today')
  const { period, bounds, periodSheetVisible, setPeriodSheetVisible, handlePeriodSelect } =
    usePeriodFilter('today');

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<DashboardOverviewStats>(DEFAULT_DASHBOARD_STATS);

  const [activities, setActivities] = useState<DashboardActivityItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all dashboard metrics & activity feed
  const loadDashboardData = useCallback(async () => {
    try {
      const fromStr = period === 'all' ? undefined : bounds.from.toISOString();
      const toStr = period === 'all' ? undefined : bounds.to.toISOString();

      const filterEmail = (isEmployee && activityScope === 'own_only')
        ? currentEmployeeAccount?.email?.toLowerCase()
        : undefined;

      const [overviewData, recentActs] = await Promise.all([
        getDashboardOverviewStats(fromStr, toStr),
        getDashboardRecentActivities(40, fromStr, toStr, isKurdish ? 'ku' : 'en', filterEmail),
      ]);

      setStats(overviewData || DEFAULT_DASHBOARD_STATS);
      setActivities(Array.isArray(recentActs) ? recentActs : []);
    } catch (err) {
      console.error('[DashboardViewScreen] error loading data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [period, bounds, isKurdish, isEmployee, activityScope, currentEmployeeAccount?.email]);

  // Formatted period badge label for activity feed and PDF export
  const periodLabel = useMemo(() => {
    switch (period) {
      case 'today':
        return isAr ? 'اليوم' : isKurdish ? 'ئەمڕۆ' : 'Today';
      case 'week':
        return isAr ? 'هذا الأسبوع' : isKurdish ? 'ئەم هەفتەیە' : 'This Week';
      case 'month':
        return isAr ? 'هذا الشهر' : isKurdish ? 'ئەم مانگە' : 'This Month';
      case 'year':
        return isAr ? 'هذا العام' : isKurdish ? 'ئەمساڵ' : 'This Year';
      case 'all':
        return isAr ? 'كل الأوقات' : isKurdish ? 'هەموو کات' : 'All Time';
      case 'custom':
        return `${formatDateShort(bounds.from)} - ${formatDateShort(bounds.to)}`;
      default:
        return isAr ? 'اليوم' : isKurdish ? 'ئەمڕۆ' : 'Today';
    }
  }, [period, bounds, isKurdish, isAr]);

  // Export complete Dashboard report as PDF
  const handleExportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const business = useBusinessStore.getState();
      const { shareDashboardReport } = await import('@/lib/generateInvoice');
      await shareDashboardReport(
        stats || DEFAULT_DASHBOARD_STATS,
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
      Alert.alert(isAr ? 'خطأ' : isKurdish ? 'هەڵە' : 'Error', String(err));
    } finally {
      setIsExporting(false);
    }
  }, [stats, activities, periodLabel, isKurdish, isAr]);

  useEffect(() => {
    setIsLoading(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const safeStats = stats || DEFAULT_DASHBOARD_STATS;

  return (
    <View style={[styles.screen, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Screen Header */}
      <AppHeader
        title={t('dashboard.dashboardModule')}
        showBack
        rightAction={
          <HeaderActionButton
            icon="options-outline"
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
        exportPdfLabel={isAr ? 'تصدير تقرير لوحة التحكم (PDF)' : isKurdish ? 'دەرکردنی ڕاپۆرتی داشبۆرد بە PDF' : 'Export Dashboard Report (PDF)'}
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
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.tabletContainer,
          isTabletLandscape && styles.tabletLandscapeContainer,
        ]}
      >
        {/* 1. Hero Image Banner (Fixed max 760px centered in both portrait and landscape as requested) */}
        <View style={styles.heroSliderWrapper}>
          <DashboardHeroSlider />
        </View>

        {/* 2. Section Header: Analytics Grid */}
        <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.sectionTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.sectionIconBox,
                {
                  backgroundColor: colors.primary + '18',
                  width: isTablet ? 38 : 32,
                  height: isTablet ? 38 : 32,
                  borderRadius: isTablet ? 12 : 10,
                },
              ]}
            >
              <Ionicons name="stats-chart" size={isTablet ? 20 : 18} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.sectionHeading,
                {
                  color: colors.darkBlue,
                  textAlign,
                  fontSize: isTabletLandscape ? 19 : isTablet ? 17.5 : 16,
                },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {isAr ? 'الإحصائيات ونظرة عامة' : isKurdish ? 'ئامار و زانیارییەکان' : 'Analytics & Overview'}
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
                  paddingHorizontal: isTablet ? 14 : 9,
                  paddingVertical: isTablet ? 6 : 4.5,
                  borderRadius: isTablet ? 12 : 10,
                },
              ]}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={isTablet ? 15 : 13} color={colors.primary} />
                  <Text
                    style={[
                      styles.pdfActionText,
                      { color: colors.primary, fontSize: isTablet ? 13 : 11.5 },
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
                  paddingHorizontal: isTablet ? 12 : 8,
                  paddingVertical: isTablet ? 6 : 4,
                  borderRadius: isTablet ? 12 : 10,
                },
              ]}
            >
              <Ionicons name="eye-outline" size={isTablet ? 15 : 13} color={colors.gray400} />
              <Text
                style={[
                  styles.readOnlyText,
                  { color: colors.gray400, fontSize: isTablet ? 12.5 : 11 },
                ]}
              >
                {isAr ? 'عرض فقط' : isKurdish ? 'تەنها بینین' : 'View Only'}
              </Text>
            </View>
          </View>
        </View>

        {isLoading && !refreshing ? (
          <LoadingView showCard={false} message={t('common.pleaseWait')} style={{ paddingVertical: 40 }} />
        ) : (
          <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* 1. Total Revenue / داهات */}
            {showRevenue && (
              <DashboardMetricSquare
                title={t('dashboard.totalRevenue')}
                value={safeStats.totalRevenue}
                isCurrency
                icon="wallet"
                color="#10B981"
                subtitle={isAr ? 'الإيرادات' : isKurdish ? 'داهات' : 'Revenue'}
                delay={30}
                isLocked={lockRevenue}
              />
            )}

            {/* 2. Total Purchases Cost / کۆی بەهای کڕین */}
            {showPurchases && (
              <DashboardMetricSquare
                title={t('dashboard.totalPurchasesCost')}
                value={safeStats.totalPurchasesCost}
                isCurrency
                icon="bag-handle"
                color="#8B5CF6"
                subtitle={isAr ? 'المشتريات' : isKurdish ? 'کڕینەکان' : 'Purchases'}
                delay={60}
                isLocked={lockPurchases}
              />
            )}

            {/* 3. Total Expenses / کۆی مەسروفات و خەرجییەکان */}
            {showExpenses && (
              <DashboardMetricSquare
                title={isAr ? 'إجمالي المصروفات' : isKurdish ? 'کۆی مەسروفات' : 'Total Expenses'}
                value={safeStats.totalExpenses}
                isCurrency
                icon="cash-outline"
                color="#E11D48"
                subtitle={isAr ? 'المصروفات' : isKurdish ? 'مەسروفات' : 'Expenses'}
                delay={80}
                isLocked={lockExpenses}
              />
            )}

            {/* 4. Expected Net Profit / کۆی قازانجی چاوەڕوانکراو */}
            {showRevenue && (
              <DashboardMetricSquare
                title={t('dashboard.expectedProfit')}
                value={safeStats.expectedProfit}
                isCurrency
                icon="trending-up"
                color={safeStats.expectedProfit >= 0 ? '#059669' : colors.error}
                subtitle={
                  safeStats.expectedProfit >= 0
                    ? isAr
                      ? 'أرباح'
                      : isKurdish
                      ? 'قازانج'
                      : 'Profit'
                    : isAr
                    ? 'خسارة'
                    : isKurdish
                    ? 'زەرەر'
                    : 'Loss'
                }
                delay={100}
                isLocked={lockRevenue}
              />
            )}

            {/* 5. Total Sales / کۆی فرۆشتنەکان */}
            {showSales && (
              <DashboardMetricSquare
                title={t('dashboard.totalSalesCount')}
                value={safeStats.totalSales}
                isCurrency
                icon="receipt"
                color="#06B6D4"
                subtitle={isAr ? 'المبيعات' : isKurdish ? 'فرۆشراو' : 'Sales'}
                delay={120}
                isLocked={lockSales}
              />
            )}

            {/* 6. Total Invoices / کۆی پسوولەکان (count) */}
            {showSales && (
              <DashboardMetricSquare
                title={t('dashboard.totalInvoices')}
                value={safeStats.totalInvoices}
                icon="document-text"
                color="#6366F1"
                subtitle={isAr ? 'الفواتير' : isKurdish ? 'پسوولە' : 'Invoices'}
                delay={150}
                isLocked={lockSales}
              />
            )}

            {/* 7. Total Customers / کۆی کڕیارەکان (count) */}
            {showStockAlerts && (
              <DashboardMetricSquare
                title={t('dashboard.totalCustomers')}
                value={safeStats.totalCustomers}
                icon="people"
                color="#F59E0B"
                subtitle={isAr ? 'الزبائن' : isKurdish ? 'کڕیار' : 'Customers'}
                delay={180}
                isLocked={lockStockAlerts}
              />
            )}

            {/* 8. Total Suppliers / کۆی دابینکەران (count) */}
            {showStockAlerts && (
              <DashboardMetricSquare
                title={t('dashboard.totalSuppliers')}
                value={safeStats.totalSuppliers}
                icon="business"
                color="#14B8A6"
                subtitle={isAr ? 'الموردين' : isKurdish ? 'دابینکەر' : 'Suppliers'}
                delay={210}
                isLocked={lockStockAlerts}
              />
            )}

            {/* 9. Total Products / کۆی کاڵاکان (count) */}
            {showStockAlerts && (
              <DashboardMetricSquare
                title={t('dashboard.totalItems')}
                value={safeStats.totalItems}
                icon="cube"
                color="#EC4899"
                subtitle={isAr ? 'المنتجات' : isKurdish ? 'کاڵا' : 'Items'}
                delay={240}
                isLocked={lockStockAlerts}
              />
            )}

            {/* 10. Low Stock Alert / کەمیی کاڵا (count) */}
            {showStockAlerts && (
              <DashboardMetricSquare
                title={t('dashboard.lowStockAlert')}
                value={safeStats.lowStockCount}
                icon="alert-circle"
                color="#EF4444"
                isAlert={safeStats.lowStockCount > 0}
                subtitle={
                  safeStats.lowStockCount > 0
                    ? isAr
                      ? 'تنبيه'
                      : isKurdish
                      ? 'ئاگاداری'
                      : 'Low'
                    : isAr
                    ? 'جيد'
                    : isKurdish
                    ? 'باشە'
                    : 'OK'
                }
                delay={270}
                isLocked={lockStockAlerts}
              />
            )}

            {/* 11. Total Batches / کۆی گشتی وەجبەکان */}
            {showStockAlerts && (
              <DashboardMetricSquare
                title={t('dashboard.totalBatches')}
                value={safeStats.totalBatchesCount}
                icon="layers"
                color="#6366F1"
                subtitle={isAr ? 'الوجبات' : isKurdish ? 'وەجبە' : 'Batches'}
                delay={290}
                isLocked={lockStockAlerts}
              />
            )}

            {/* 12. In-Stock Batches / وەجبە بەردەستەکان لە کۆگا */}
            {showStockAlerts && (
              <DashboardMetricSquare
                title={t('dashboard.activeBatches')}
                value={safeStats.activeBatchesCount}
                icon="cube"
                color="#10B981"
                subtitle={
                  safeStats.expiringBatchesCount > 0
                    ? isAr
                      ? `${safeStats.expiringBatchesCount} قريبة الانتهاء`
                      : isKurdish
                      ? `${safeStats.expiringBatchesCount} نزیک بەسەرچوون`
                      : `${safeStats.expiringBatchesCount} Expiring`
                    : isAr
                    ? 'في المخزن'
                    : isKurdish
                    ? 'لە کۆگادا'
                    : 'In Stock'
                }
                isAlert={safeStats.expiringBatchesCount > 0}
                delay={310}
                isLocked={lockStockAlerts}
              />
            )}

            {/* 13. Sold-Out Batches / وەجبە تەواوبووەکان */}
            {showStockAlerts && (
              <DashboardMetricSquare
                title={t('dashboard.depletedBatches')}
                value={safeStats.depletedBatchesCount}
                icon="checkmark-done-circle"
                color="#64748B"
                subtitle={isAr ? 'نفدت' : isKurdish ? 'نەماوە' : 'Sold Out'}
                delay={330}
                isLocked={lockStockAlerts}
              />
            )}

            {/* 14. Multi-Batch Products / کاڵا فرە-وەجبەکان */}
            {showStockAlerts && (
              <DashboardMetricSquare
                title={t('dashboard.multiBatchItems')}
                value={safeStats.multiBatchProductsCount}
                icon="duplicate"
                color="#F59E0B"
                subtitle={isAr ? 'متعدد الوجبات' : isKurdish ? 'فرە-وەجبە' : 'Multi-Batch'}
                delay={350}
                isLocked={lockStockAlerts}
              />
            )}

            {/* 15. Customer Receivables / قەرزی لای کڕیاران */}
            {showDebts && (
              <DashboardMetricSquare
                title={t('dashboard.customerDebts')}
                value={safeStats.customerDebtTotal}
                isCurrency
                icon="arrow-down-circle"
                color="#EA580C"
                subtitle={isAr ? 'ديون عند الزبائن' : isKurdish ? 'لای کڕیار' : 'Receivables'}
                delay={370}
                isLocked={lockDebts}
              />
            )}

            {/* 16. Supplier Payables / قەرزی دابینکەران */}
            {showDebts && (
              <DashboardMetricSquare
                title={t('dashboard.supplierDebts')}
                value={safeStats.supplierDebtTotal}
                isCurrency
                icon="arrow-up-circle"
                color="#DC2626"
                subtitle={isAr ? 'ديون للموردين' : isKurdish ? 'قەرزی سەرشان' : 'Payables'}
                delay={390}
                isLocked={lockDebts}
              />
            )}

            {/* 17. Total Installment Sales / کۆی فرۆشتنی بەقیست */}
            {showSales && (
              <DashboardMetricSquare
                title={isAr ? 'إجمالي مبيعات الأقساط' : isKurdish ? 'کۆی فرۆشتنی قیست' : 'Installment Sales'}
                value={safeStats.totalInstallmentSales}
                isCurrency
                icon="calendar-number"
                color="#6366F1"
                subtitle={isAr ? 'مبيعات الأقساط' : isKurdish ? 'فرۆشتنی قیست' : 'Installments'}
                delay={400}
              />
            )}

            {/* 18. Installment Collected / قیستی وەرگیراو */}
            {showSales && (
              <DashboardMetricSquare
                title={isAr ? 'الأقساط المستلمة' : isKurdish ? 'قیستی وەرگیراو' : 'Collected Installments'}
                value={safeStats.totalInstallmentCollected}
                isCurrency
                icon="checkmark-circle"
                color="#10B981"
                subtitle={isAr ? 'مقدمة + مدفوع' : isKurdish ? 'پێشەکی + دراو' : 'Collected'}
                delay={410}
              />
            )}

            {/* 19. Remaining Installment Debt / قەرزی ماوەی قیستەکان */}
            {showDebts && (
              <DashboardMetricSquare
                title={isAr ? 'الأقساط المتبقية' : isKurdish ? 'قەرزی ماوەی قیست' : 'Remaining Installments'}
                value={safeStats.totalInstallmentRemaining}
                isCurrency
                icon="hourglass"
                color="#EA580C"
                subtitle={isAr ? 'الدين المتبقي' : isKurdish ? 'قەرزی ماوە' : 'Remaining'}
                delay={420}
              />
            )}

            {/* 20. Active Installment Accounts / قیستە چالاکەکان */}
            {showDebts && (
              <DashboardMetricSquare
                title={isAr ? 'الأقساط النشطة' : isKurdish ? 'قیستی چالاک' : 'Active Installments'}
                value={safeStats.activeInstallmentAccounts}
                icon="people"
                color="#EC4899"
                subtitle={isAr ? 'الزبائن' : isKurdish ? 'کڕیار' : 'Customers'}
                delay={430}
              />
            )}

            {/* 21. Total Discounts / کۆی داشکاندن - spans 100% full width to fill the row seamlessly */}
            {showExpenses && (
              <DashboardMetricSquare
                title={t('dashboard.totalDiscounts')}
                value={safeStats.totalDiscount}
                isCurrency
                icon="pricetag"
                color="#8B5CF6"
                subtitle={isAr ? 'الخصومات' : isKurdish ? 'داشکاندن' : 'Discounts'}
                delay={440}
                isFullWidth
                isLocked={lockExpenses}
              />
            )}
          </View>
        )}

        {/* 4. Live Activity History Feed */}
        {showActivityFeed && (
          <DashboardActivityFeed
            activities={activities}
            isLoading={isLoading && !refreshing}
            periodLabel={periodLabel}
          />
        )}
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
    maxWidth: 1040,
    alignSelf: 'center',
    width: '100%',
  },
  tabletLandscapeContainer: {
    maxWidth: 1320,
  },
  heroSliderWrapper: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
