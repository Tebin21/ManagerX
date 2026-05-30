import React, { useEffect, useCallback, useState, type ComponentProps } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, TextInput,
  Modal, Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { BarChart } from '@/components/reports/BarChart';
import { MiniLineChart } from '@/components/reports/MiniLineChart';
import { DonutRing } from '@/components/reports/DonutRing';
import { useReportStore } from '@/store/reportStore';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import type { DateRangeKey, SmartAlert } from '@/types/reports';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

function pctOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// Translates an expense/inventory category using locale maps
function tCat(cat: string): string {
  // Try expense categories first
  const expKey = `reports.expenseCategories.${cat}`;
  const expVal = i18n.t(expKey, { defaultValue: '' });
  if (expVal) return expVal;
  // Fall back to purchase categories
  const purKey = `purchases.categories.${cat}`;
  const purVal = i18n.t(purKey, { defaultValue: cat });
  return purVal;
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
  route,
}: {
  title: string;
  action?: string;
  route?: string;
}) {
  const router = useRouter();
  return (
    <View style={sectionStyles.row}>
      <Text style={sectionStyles.title}>{title}</Text>
      {action && route && (
        <TouchableOpacity onPress={() => router.push(route as never)} style={sectionStyles.actionBtn}>
          <Text style={sectionStyles.actionText}>{action}</Text>
          <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '800', color: Colors.black },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, color, bgColor, icon, small,
}: {
  label: string; value: string; sub?: string; color?: string; bgColor?: string;
  icon: ComponentProps<typeof Ionicons>['name']; small?: boolean;
}) {
  return (
    <View style={[kpiStyles.card, bgColor ? { backgroundColor: bgColor } : null]}>
      <Ionicons name={icon} size={18} color={color ?? Colors.primary} style={{ marginBottom: 6 }} />
      <Text style={[kpiStyles.value, color ? { color } : null, small ? { fontSize: 14 } : null]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={kpiStyles.label} numberOfLines={2}>{label}</Text>
      {sub ? <Text style={kpiStyles.sub}>{sub}</Text> : null}
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1, minWidth: '28%', backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  value: { fontSize: 16, fontWeight: '800', color: Colors.black, marginBottom: 3, textAlign: 'center' },
  label: { fontSize: 10, color: Colors.gray400, textAlign: 'center', lineHeight: 14 },
  sub:   { fontSize: 9, color: Colors.gray300, textAlign: 'center', marginTop: 2 },
});

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({ alert, onDismiss }: { alert: SmartAlert; onDismiss: () => void }) {
  const router = useRouter();
  const configs = {
    error:   { bg: '#FEF2F2', border: Colors.error,   icon: Colors.error   },
    warning: { bg: '#FFFBEB', border: '#D97706',       icon: '#D97706'      },
    info:    { bg: '#EFF6FF', border: Colors.primary,  icon: Colors.primary },
  };
  const cfg = configs[alert.type];
  return (
    <MotiView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200 }}
      style={[alertStyles.banner, { backgroundColor: cfg.bg, borderLeftColor: cfg.border }]}
    >
      <Ionicons name={alert.icon as ComponentProps<typeof Ionicons>['name']} size={18} color={cfg.icon} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={[alertStyles.title, { color: cfg.border }]}>{alert.title}</Text>
        <Text style={alertStyles.body}>{alert.body}</Text>
      </View>
      {alert.action && (
        <TouchableOpacity onPress={() => router.push(alert.action!.route as never)} style={alertStyles.actionBtn}>
          <Text style={[alertStyles.actionText, { color: cfg.border }]}>{alert.action.label}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
        <Ionicons name="close" size={16} color={Colors.gray400} />
      </TouchableOpacity>
    </MotiView>
  );
}

const alertStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, padding: 12, borderLeftWidth: 4,
  },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 1 },
  body:  { fontSize: 12, color: Colors.gray500 },
  actionBtn: { marginHorizontal: 8 },
  actionText: { fontSize: 12, fontWeight: '700' },
});

// ─── Date Range Picker ────────────────────────────────────────────────────────

function DateRangePicker({
  current,
  onChange,
}: {
  current: DateRangeKey;
  onChange: (key: DateRangeKey, from?: string, to?: string) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');

  const keys: DateRangeKey[] = ['today', 'week', 'month', 'year', 'custom'];
  const labels: Record<DateRangeKey, string> = {
    today:  i18n.t('common.today'),
    week:   i18n.t('common.thisWeek'),
    month:  i18n.t('common.thisMonth'),
    year:   i18n.t('reports.year'),
    custom: i18n.t('reports.custom'),
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={drStyles.row}
      >
        {keys.map((key) => (
          <TouchableOpacity
            key={key}
            style={[drStyles.pill, current === key && drStyles.pillActive]}
            onPress={() => {
              if (key === 'custom') {
                setCustomOpen(true);
              } else {
                onChange(key);
              }
            }}
          >
            <Text style={[drStyles.pillText, current === key && drStyles.pillTextActive]}>
              {labels[key]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Custom date range modal */}
      <Modal visible={customOpen} animationType="fade" transparent>
        <View style={drStyles.overlay}>
          <View style={drStyles.modal}>
            <Text style={drStyles.modalTitle}>{i18n.t('reports.customRange')}</Text>
            <Text style={drStyles.dateLabel}>{i18n.t('reports.fromDate')} (YYYY-MM-DD)</Text>
            <TextInput
              style={drStyles.dateInput}
              placeholder="2026-01-01"
              placeholderTextColor={Colors.gray400}
              value={customFrom}
              onChangeText={setCustomFrom}
            />
            <Text style={drStyles.dateLabel}>{i18n.t('reports.toDate')} (YYYY-MM-DD)</Text>
            <TextInput
              style={drStyles.dateInput}
              placeholder="2026-12-31"
              placeholderTextColor={Colors.gray400}
              value={customTo}
              onChangeText={setCustomTo}
            />
            <View style={drStyles.modalActions}>
              <TouchableOpacity style={drStyles.cancelBtn} onPress={() => setCustomOpen(false)}>
                <Text style={drStyles.cancelText}>{i18n.t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={drStyles.applyBtn}
                onPress={() => {
                  if (customFrom && customTo) {
                    onChange('custom', `${customFrom}T00:00:00.000Z`, `${customTo}T23:59:59.999Z`);
                    setCustomOpen(false);
                  } else {
                    Alert.alert(i18n.t('common.required'), i18n.t('purchases.validationDate'));
                  }
                }}
              >
                <Text style={drStyles.applyText}>{i18n.t('reports.apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const drStyles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pillActive: { backgroundColor: '#fff' },
  pillText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  pillTextActive: { color: Colors.primary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.black, marginBottom: 16 },
  dateLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray600, marginBottom: 6 },
  dateInput: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.black, marginBottom: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: Colors.gray200, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: Colors.gray500 },
  applyBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  applyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Stat Row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={statRowStyles.row}>
      <Text style={statRowStyles.label}>{label}</Text>
      <Text style={[statRowStyles.value, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const statRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  label: { fontSize: 13, color: Colors.gray500 },
  value: { fontSize: 14, fontWeight: '700', color: Colors.black },
});

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, total, color = Colors.primary }: { value: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View style={pbStyles.track}>
      <View style={[pbStyles.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: Colors.gray100, borderRadius: 3, overflow: 'hidden', marginVertical: 4 },
  fill:  { height: '100%', borderRadius: 3 },
});

// ─── Rank Badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const colors = ['#F59E0B', '#9CA3AF', '#D97706'];
  const bg = colors[rank - 1] ?? Colors.gray200;
  return (
    <View style={[rankStyles.badge, { backgroundColor: bg }]}>
      <Text style={rankStyles.text}>#{rank}</Text>
    </View>
  );
}

const rankStyles = StyleSheet.create({
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  text:  { fontSize: 11, fontWeight: '800', color: '#fff' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const {
    dateRange, isLoading, salesData, purchaseData, plData, inventoryData,
    debtData, topProfitable, monthlyRevenue, dailyChart, expenses,
    setDateRange, reload,
  } = useReportStore();

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  useEffect(() => { reload(); }, [reload]);

  useFocusEffect(
    useCallback(() => { reload(); }, [reload])
  );

  // ── Smart alerts — built with translated strings ─────────────────────────────
  const allAlerts: SmartAlert[] = [];

  if (plData && plData.netProfit < 0 && plData.grossRevenue > 0) {
    allAlerts.push({
      id: 'loss',
      type: 'error',
      icon: 'trending-down',
      title: t('reports.alertLossTitle'),
      body:  t('reports.alertLossBody', { amount: fmt(Math.abs(plData.netProfit)) }),
    });
  }
  if (plData && plData.grossMarginPct < 10 && plData.grossMarginPct > 0 && plData.grossRevenue > 0) {
    allAlerts.push({
      id: 'margin',
      type: 'warning',
      icon: 'alert-circle',
      title: t('reports.alertMarginTitle'),
      body:  t('reports.alertMarginBody', { pct: plData.grossMarginPct.toFixed(1) }),
    });
  }
  if (debtData && debtData.overdueCount > 0) {
    allAlerts.push({
      id: 'overdue',
      type: 'warning',
      icon: 'time',
      title: t('reports.alertOverdueTitle', { count: debtData.overdueCount }),
      body:  t('reports.alertOverdueBody'),
      action: { label: t('reports.alertActionView'), route: '/(app)/debt' },
    });
  }
  if (inventoryData && inventoryData.outOfStockCount > 0) {
    allAlerts.push({
      id: 'stock',
      type: 'info',
      icon: 'cube',
      title: t('reports.alertStockTitle', { count: inventoryData.outOfStockCount }),
      body:  t('reports.alertStockBody'),
      action: { label: t('reports.alertActionView'), route: '/(app)/inventory' },
    });
  }

  const visibleAlerts = allAlerts.filter((a) => !dismissedAlerts.includes(a.id));

  // ── Export PDF ────────────────────────────────────────────────────────────
  async function exportPDF() {
    try {
      const { shareFullReport } = await import('@/lib/generateInvoice');
      const { loadBusiness } = await import('@/lib/sqlite');
      const biz = await loadBusiness();
      await shareFullReport({
        salesData, purchaseData, plData, inventoryData,
        debtData, topProfitable, monthlyRevenue, expenses, dateRange,
      }, {
        name:    biz?.name    ?? 'My Business',
        phone:   biz?.phone   ?? '',
        address: biz?.address ?? '',
        logoUri: biz?.logoPath ?? null,
      });
    } catch {
      Alert.alert(t('common.error'), t('reports.errorExport'));
    }
  }

  // ── Bar chart data from monthlyRevenue ─────────────────────────────────────
  const barData = monthlyRevenue.map((r) => ({
    label: r.period.slice(5), // MM portion — numbers stay English
    value: r.revenue,
    secondaryValue: Math.max(0, r.profit),
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('reports.title')}
        showBack
        onBack={() => router.back()}
        rightAction={<HeaderActionButton icon="share-outline" onPress={exportPDF} />}
      >
        <DateRangePicker current={dateRange.key} onChange={setDateRange} />
      </AppHeader>

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('reports.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={reload} tintColor={colors.primary} />
          }
        >

          {/* Smart alerts */}
          {visibleAlerts.map((alert) => (
            <AlertBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => setDismissedAlerts((prev) => [...prev, alert.id])}
            />
          ))}

          {/* ── Overview KPIs ── */}
          <SectionHeader title={t('reports.grossRevenue')} />
          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
            <View style={styles.kpiGrid}>
              <KPICard
                label={t('reports.revenue')}
                value={`${fmtShort(salesData?.totalRevenue ?? 0)} IQD`}
                icon="trending-up"
                color={Colors.primary}
              />
              <KPICard
                label={t('reports.netProfit')}
                value={`${fmtShort(plData?.netProfit ?? 0)} IQD`}
                icon="cash"
                color={(plData?.netProfit ?? 0) >= 0 ? Colors.success : Colors.error}
              />
              <KPICard
                label={t('reports.totalPurchases')}
                value={String(salesData?.totalSales ?? 0)}
                icon="receipt"
              />
            </View>
            <View style={[styles.kpiGrid, { marginTop: 8 }]}>
              <KPICard
                label={t('reports.totalCost')}
                value={`${fmtShort(purchaseData?.totalCost ?? 0)} IQD`}
                icon="cart"
                color={Colors.gray600}
              />
              <KPICard
                label={t('reports.overdueCount')}
                value={`${fmtShort(debtData?.combinedDebt ?? 0)} IQD`}
                icon="warning"
                color={(debtData?.combinedDebt ?? 0) > 0 ? Colors.warning : Colors.success}
              />
              <KPICard
                label={t('reports.expenses')}
                value={`${fmtShort(plData?.totalExpenses ?? 0)} IQD`}
                icon="wallet"
                color={Colors.error}
              />
            </View>
          </MotiView>

          {/* ── Revenue Trend ── */}
          {barData.length > 0 && (
            <>
              <SectionHeader title={t('reports.revenue')} />
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 400, delay: 80 }}>
                <PremiumCard style={styles.card}>
                  <Text style={styles.cardLabel}>{t('reports.last6Months')} (IQD)</Text>
                  <BarChart
                    data={barData}
                    height={150}
                    showSecondary
                    primaryColor={Colors.primary}
                    secondaryColor={Colors.success}
                  />
                </PremiumCard>
              </MotiView>
            </>
          )}

          {/* ── Sales ── */}
          <SectionHeader title={t('dashboard.sales')} action={t('sales.history')} route="/(app)/sales/history" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 100 }}>
            <PremiumCard style={styles.card}>
              <View style={styles.threeChips}>
                <View style={styles.chip}>
                  <Text style={styles.chipValue}>{fmtShort(salesData?.cashRevenue ?? 0)}</Text>
                  <Text style={styles.chipLabel}>💵 {t('sales.cash')}</Text>
                </View>
                <View style={[styles.chip, styles.chipCenter]}>
                  <Text style={styles.chipValue}>{fmtShort(salesData?.fibRevenue ?? 0)}</Text>
                  <Text style={styles.chipLabel}>📱 {t('sales.fib')}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipValue}>{fmtShort(salesData?.debtRevenue ?? 0)}</Text>
                  <Text style={styles.chipLabel}>📋 {t('common.debt')}</Text>
                </View>
              </View>

              {(salesData?.totalRevenue ?? 0) > 0 && (
                <View style={{ marginTop: 14 }}>
                  <DonutRing
                    segments={[
                      { label: t('sales.cash'),   value: salesData?.cashRevenue ?? 0, color: Colors.success },
                      { label: t('sales.fib'),    value: salesData?.fibRevenue  ?? 0, color: Colors.primary },
                      { label: t('common.debt'),  value: salesData?.debtRevenue ?? 0, color: Colors.warning },
                    ]}
                    size={110}
                    strokeWidth={16}
                    centerLabel={`${salesData?.totalSales ?? 0}`}
                    centerSub={t('reports.salesCount')}
                  />
                </View>
              )}

              {(salesData?.totalDiscounts ?? 0) > 0 && (
                <View style={styles.discountChip}>
                  <Ionicons name="pricetag" size={12} color="#D97706" />
                  <Text style={styles.discountText}>
                    {t('reports.discountsGiven')}: {fmt(salesData?.totalDiscounts ?? 0)} IQD
                  </Text>
                </View>
              )}
            </PremiumCard>
          </MotiView>

          {/* ── Purchases ── */}
          <SectionHeader title={t('dashboard.purchases')} action={t('purchases.history')} route="/(app)/purchases" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 120 }}>
            <PremiumCard style={styles.card}>
              <StatRow label={t('reports.totalCost')} value={`${fmt(purchaseData?.totalCost ?? 0)} IQD`} />
              <StatRow
                label={t('common.paid')}
                value={`${fmt(purchaseData?.paidCost ?? 0)} IQD`}
                color={Colors.success}
              />
              <StatRow
                label={t('common.debt')}
                value={`${fmt(purchaseData?.debtCost ?? 0)} IQD`}
                color={(purchaseData?.debtCost ?? 0) > 0 ? Colors.warning : Colors.success}
              />
              <StatRow label={t('customers.totalInvoices')} value={String(purchaseData?.totalPurchases ?? 0)} />
              <StatRow label={t('reports.uniqueSuppliers')} value={String(purchaseData?.uniqueSuppliers ?? 0)} />
              {purchaseData?.topSupplier && (
                <View style={styles.topSupplier}>
                  <Ionicons name="star" size={12} color={Colors.warning} />
                  <Text style={styles.topSupplierText}>
                    {t('reports.topSupplierLabel')}: {purchaseData.topSupplier} ({fmtShort(purchaseData.topSupplierCost)} IQD)
                  </Text>
                </View>
              )}
            </PremiumCard>
          </MotiView>

          {/* ── Profit & Loss ── */}
          <SectionHeader title={t('reports.profit')} />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 140 }}>
            <PremiumCard style={styles.card}>
              <View style={styles.plRow}>
                <Text style={styles.plLabel}>{t('reports.grossRevenue')}</Text>
                <Text style={[styles.plValue, { color: Colors.primary }]}>
                  {fmt(plData?.grossRevenue ?? 0)} IQD
                </Text>
              </View>
              <View style={styles.plRow}>
                <Text style={[styles.plLabel, { color: Colors.gray400 }]}>{t('reports.cost')} (COGS)</Text>
                <Text style={[styles.plValue, { color: Colors.error }]}>
                  −{fmt(plData?.totalCOGS ?? 0)} IQD
                </Text>
              </View>
              <View style={[styles.plRow, styles.plSubtotal]}>
                <Text style={styles.plSubLabel}>{t('reports.profit')}</Text>
                <Text style={[styles.plSubValue, { color: (plData?.grossProfit ?? 0) >= 0 ? Colors.success : Colors.error }]}>
                  {fmt(plData?.grossProfit ?? 0)} IQD
                  <Text style={styles.plPct}> ({(plData?.grossMarginPct ?? 0).toFixed(1)}%)</Text>
                </Text>
              </View>
              {(plData?.expenseBreakdown ?? []).map((e) => (
                <View key={e.category} style={[styles.plRow, { paddingLeft: 12 }]}>
                  <Text style={[styles.plLabel, { color: Colors.gray400 }]}>{tCat(e.category)}</Text>
                  <Text style={[styles.plValue, { color: Colors.error }]}>
                    −{fmt(e.total)} IQD
                  </Text>
                </View>
              ))}
              {(plData?.totalExpenses ?? 0) > 0 && (
                <View style={styles.plRow}>
                  <Text style={styles.plLabel}>{t('reports.totalExpenses')}</Text>
                  <Text style={[styles.plValue, { color: Colors.error }]}>
                    −{fmt(plData?.totalExpenses ?? 0)} IQD
                  </Text>
                </View>
              )}
              <View style={[styles.plRow, styles.plNet]}>
                <Text style={styles.plNetLabel}>{t('reports.netProfit')}</Text>
                <Text style={[styles.plNetValue, { color: (plData?.netProfit ?? 0) >= 0 ? Colors.success : Colors.error }]}>
                  {fmt(plData?.netProfit ?? 0)} IQD
                </Text>
              </View>

              {/* 30-day mini line chart */}
              {dailyChart.length >= 3 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.miniChartLabel}>{t('reports.profit')}</Text>
                  <MiniLineChart
                    data={dailyChart.map((d) => ({ value: d.profit }))}
                    height={56}
                    color={(plData?.netProfit ?? 0) >= 0 ? Colors.success : Colors.error}
                  />
                </View>
              )}
            </PremiumCard>
          </MotiView>

          {/* ── Inventory ── */}
          <SectionHeader title={t('dashboard.inventory')} action={t('inventory.title')} route="/(app)/inventory" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 160 }}>
            <PremiumCard style={styles.card}>
              <View style={styles.kpiGrid}>
                <KPICard
                  label={t('inventory.totalValue')}
                  value={`${fmtShort(inventoryData?.stockValueSell ?? 0)} IQD`}
                  icon="cube"
                  color={Colors.primary}
                />
                <KPICard
                  label={t('reports.profit')}
                  value={`${fmtShort(inventoryData?.potentialProfit ?? 0)} IQD`}
                  icon="trending-up"
                  color={Colors.success}
                />
                <KPICard
                  label={t('inventory.lowStock')}
                  value={String(inventoryData?.lowStockCount ?? 0)}
                  icon="warning"
                  color={(inventoryData?.lowStockCount ?? 0) > 0 ? Colors.warning : Colors.success}
                />
              </View>
              <View style={[styles.kpiGrid, { marginTop: 8 }]}>
                <KPICard
                  label={t('inventory.soldBadge')}
                  value={String(inventoryData?.outOfStockCount ?? 0)}
                  icon="close-circle"
                  color={(inventoryData?.outOfStockCount ?? 0) > 0 ? Colors.error : Colors.success}
                />
                <KPICard
                  label={t('inventory.products')}
                  value={String(inventoryData?.activeProducts ?? 0)}
                  icon="apps"
                />
                <KPICard
                  label={t('inventory.totalQty')}
                  value={fmt(inventoryData?.totalStockUnits ?? 0)}
                  icon="layers"
                />
              </View>

              {/* Category breakdown — categories translated via tCat() */}
              {(inventoryData?.categoryCounts ?? []).slice(0, 4).map((cat) => (
                <View key={cat.category} style={{ marginTop: 10 }}>
                  <View style={styles.catHeaderRow}>
                    <Text style={styles.catLabel}>{tCat(cat.category)}</Text>
                    <Text style={styles.catValue}>{fmtShort(cat.value)} IQD</Text>
                  </View>
                  <ProgressBar
                    value={cat.value}
                    total={inventoryData?.stockValueCost ?? 1}
                    color={Colors.primary}
                  />
                </View>
              ))}
            </PremiumCard>
          </MotiView>

          {/* ── Debt Overview ── */}
          <SectionHeader title={t('debt.title')} action={t('reports.alertActionView')} route="/(app)/debt" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 180 }}>
            <PremiumCard style={styles.card}>
              <View style={styles.threeChips}>
                <View style={styles.chip}>
                  <Text style={[styles.chipValue, { color: Colors.warning }]}>
                    {fmtShort(debtData?.totalSalesDebt ?? 0)}
                  </Text>
                  <Text style={styles.chipLabel}>{t('debt.customerOwes')}</Text>
                </View>
                <View style={[styles.chip, styles.chipCenter]}>
                  <Text style={[styles.chipValue, { color: Colors.error }]}>
                    {fmtShort(debtData?.totalPurchaseDebt ?? 0)}
                  </Text>
                  <Text style={styles.chipLabel}>{t('debt.weOweSupplier')}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={[styles.chipValue, { color: (debtData?.overdueCount ?? 0) > 0 ? Colors.error : Colors.success }]}>
                    {debtData?.overdueCount ?? 0}
                  </Text>
                  <Text style={styles.chipLabel}>{t('debt.overdueDebts')}</Text>
                </View>
              </View>
              {(debtData?.salesDebtOriginal ?? 0) > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.catHeaderRow}>
                    <Text style={styles.catLabel}>{t('reports.grossMargin')}</Text>
                    <Text style={styles.catValue}>{(debtData?.collectionRate ?? 0).toFixed(0)}%</Text>
                  </View>
                  <ProgressBar
                    value={debtData?.salesDebtCollected ?? 0}
                    total={debtData?.salesDebtOriginal ?? 1}
                    color={Colors.success}
                  />
                </View>
              )}
            </PremiumCard>
          </MotiView>

          {/* ── Top Customers ── */}
          <SectionHeader title={t('dashboard.customers')} action={t('reports.alertActionView')} route="/(app)/customers" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 200 }}>
            <PremiumCard style={styles.card}>
              <TopCustomersSection />
            </PremiumCard>
          </MotiView>

          {/* ── Most Profitable Products ── */}
          <SectionHeader title={t('reports.profit')} />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 220 }}>
            <PremiumCard style={styles.card}>
              {topProfitable.length === 0 ? (
                <Text style={styles.emptyCard}>{t('reports.noSalesData')}</Text>
              ) : (
                topProfitable.map((p, i) => (
                  <View key={p.productName} style={styles.rankRow}>
                    <RankBadge rank={i + 1} />
                    <View style={styles.rankInfo}>
                      <Text style={styles.rankName} numberOfLines={1}>{p.productName}</Text>
                      <Text style={styles.rankSub}>
                        {t('reports.soldMargin', { qty: p.totalQty, pct: p.marginPct.toFixed(1) })}
                      </Text>
                    </View>
                    <Text style={[styles.rankValue, { color: p.grossProfit >= 0 ? Colors.success : Colors.error }]}>
                      {fmtShort(p.grossProfit)} IQD
                    </Text>
                  </View>
                ))
              )}
            </PremiumCard>
          </MotiView>

          {/* ── Expenses Summary ── */}
          <SectionHeader title={t('reports.expensesTitle')} action={t('common.edit')} route="/(app)/reports/expenses" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 240 }}>
            <PremiumCard style={styles.card}>
              {expenses.length === 0 ? (
                <TouchableOpacity
                  style={styles.addExpenseCta}
                  onPress={() => router.push('/(app)/reports/expenses' as never)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.addExpenseText}>{t('reports.addFirstExpense')}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.expTotalRow}>
                    <Text style={styles.expTotalLabel}>{t('reports.totalPeriod')}</Text>
                    <Text style={styles.expTotalValue}>
                      {fmt(expenses.reduce((s, e) => s + e.amount, 0))} IQD
                    </Text>
                  </View>
                  {(plData?.expenseBreakdown ?? []).map((e) => (
                    <View key={e.category} style={{ marginBottom: 8 }}>
                      <View style={styles.catHeaderRow}>
                        <Text style={styles.catLabel}>{tCat(e.category)}</Text>
                        <Text style={styles.catValue}>{fmtShort(e.total)} IQD</Text>
                      </View>
                      <ProgressBar
                        value={e.total}
                        total={plData?.totalExpenses ?? 1}
                        color={Colors.error}
                      />
                    </View>
                  ))}
                  {expenses.slice(0, 3).map((exp) => (
                    <View key={exp.id} style={styles.miniExpRow}>
                      <Text style={styles.miniExpDate}>{exp.date}</Text>
                      <Text style={styles.miniExpCat}>{tCat(exp.category)}</Text>
                      <Text style={styles.miniExpAmt}>{fmtShort(exp.amount)} IQD</Text>
                    </View>
                  ))}
                </>
              )}
            </PremiumCard>
          </MotiView>

          {/* ── Quick Actions ── */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickBtn} onPress={exportPDF}>
              <Ionicons name="document-text" size={18} color="#fff" />
              <Text style={styles.quickBtnText}>{t('reports.exportPDF')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnOutline]}
              onPress={() => router.push('/(app)/debt' as never)}
            >
              <Ionicons name="wallet" size={18} color={Colors.primary} />
              <Text style={[styles.quickBtnText, { color: Colors.primary }]}>{t('debt.title')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, styles.quickBtnOutline]}
              onPress={() => router.push('/(app)/inventory' as never)}
            >
              <Ionicons name="cube" size={18} color={Colors.primary} />
              <Text style={[styles.quickBtnText, { color: Colors.primary }]}>{t('dashboard.inventory')}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Top Customers Sub-Component ───────────────────────────────────────────────

function TopCustomersSection() {
  const router = useRouter();
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Array<{
    name: string; phone: string | null; totalPurchases: number; saleCount: number;
  }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const { getTopCustomers } = await import('@/lib/sqlite');
        setCustomers(await getTopCustomers(5));
      } catch {}
    })();
  }, []);

  if (customers.length === 0) {
    return <Text style={styles.emptyCard}>{t('reports.noCustomerData')}</Text>;
  }

  return (
    <>
      {customers.map((c, i) => (
        <TouchableOpacity
          key={c.name}
          style={styles.rankRow}
          onPress={() => router.push('/(app)/customers' as never)}
        >
          <RankBadge rank={i + 1} />
          <View style={styles.rankInfo}>
            <Text style={styles.rankName} numberOfLines={1}>{c.name}</Text>
            <Text style={styles.rankSub}>
              {t('reports.invoiceCount', { count: c.saleCount })}{c.phone ? ` · ${c.phone}` : ''}
            </Text>
          </View>
          <Text style={styles.rankValue}>{fmtShort(c.totalPurchases)} IQD</Text>
        </TouchableOpacity>
      ))}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },

  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.gray400 },

  scrollBody: { paddingBottom: 20 },

  card: { marginHorizontal: 16, marginBottom: 4 },
  cardLabel: { fontSize: 12, color: Colors.gray400, marginBottom: 10, fontWeight: '600' },

  kpiGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },

  // 3-chip row
  threeChips: { flexDirection: 'row', justifyContent: 'space-around' },
  chip: { alignItems: 'center', flex: 1 },
  chipCenter: {
    borderLeftWidth: 1, borderRightWidth: 1, borderLeftColor: Colors.gray100, borderRightColor: Colors.gray100,
  },
  chipValue: { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: 3 },
  chipLabel: { fontSize: 11, color: Colors.gray400, textAlign: 'center' },

  discountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 12, backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  discountText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  topSupplier: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.gray100,
  },
  topSupplierText: { fontSize: 12, color: Colors.gray500, fontWeight: '600' },

  // P&L
  plRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  plLabel: { fontSize: 13, color: Colors.gray600 },
  plValue: { fontSize: 13, fontWeight: '700' },
  plSubtotal: { backgroundColor: Colors.softBlue, borderRadius: 8, padding: 10, borderBottomWidth: 0, marginVertical: 6 },
  plSubLabel: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  plSubValue: { fontSize: 14, fontWeight: '800' },
  plPct: { fontSize: 11, fontWeight: '600' },
  plNet: { borderTopWidth: 2, borderTopColor: Colors.gray200, borderBottomWidth: 0, marginTop: 6, paddingTop: 12 },
  plNetLabel: { fontSize: 16, fontWeight: '800', color: Colors.black },
  plNetValue: { fontSize: 16, fontWeight: '800' },
  miniChartLabel: { fontSize: 11, color: Colors.gray400, marginBottom: 6 },

  // Categories
  catHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catLabel: { fontSize: 12, color: Colors.gray500 },
  catValue: { fontSize: 12, fontWeight: '700', color: Colors.black },

  // Rank rows
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 14, fontWeight: '600', color: Colors.black },
  rankSub:  { fontSize: 11, color: Colors.gray400, marginTop: 1 },
  rankValue: { fontSize: 14, fontWeight: '800', color: Colors.success },

  emptyCard: { fontSize: 13, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },

  // Expenses
  addExpenseCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addExpenseText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  expTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  expTotalLabel: { fontSize: 13, color: Colors.gray500 },
  expTotalValue: { fontSize: 15, fontWeight: '800', color: Colors.error },
  miniExpRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: Colors.gray100 },
  miniExpDate: { fontSize: 11, color: Colors.gray400, width: 80 },
  miniExpCat: { flex: 1, fontSize: 12, color: Colors.gray600 },
  miniExpAmt: { fontSize: 13, fontWeight: '700', color: Colors.error },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 20 },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  quickBtnOutline: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.gray200, shadowColor: '#000', shadowOpacity: 0.05 },
  quickBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
