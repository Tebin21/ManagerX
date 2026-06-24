import React, { useEffect, useCallback, useState, useRef, type ComponentProps } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, TextInput,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { DonutRing } from '@/components/reports/DonutRing';
import { useReportStore } from '@/store/reportStore';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { DateRangeKey } from '@/types/reports';
import { fmtIQD } from '@/utils/formatters';
import { useRTL } from '@/lib/rtl';
import { CashBalanceCard } from '@/components/dashboard/CashBalanceCard';
import { ExpensesCard } from '@/components/dashboard/ExpensesCard';
import { CompactAmount } from '@/components/shared/CompactAmount';
import { AppSheet, AppSheetHeader, AppSheetOption } from '@/components/ui/AppSheet';

// ─── Helpers ──────────────────────────────────────────────────────────────────


function tCat(cat: string): string {
  const expKey = `reports.expenseCategories.${cat}`;
  const expVal = i18n.t(expKey, { defaultValue: '' });
  if (expVal) return expVal;
  return i18n.t(`purchases.categories.${cat}`, { defaultValue: cat });
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title, icon, action, route,
}: {
  title: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  action?: string;
  route?: string;
}) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  return (
    <View style={[secStyles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[secStyles.left, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {icon && (
          <View style={[secStyles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name={icon} size={14} color={colors.primary} />
          </View>
        )}
        <Text style={[secStyles.title, { textAlign }]}>{title}</Text>
      </View>
      {action && route && (
        <TouchableOpacity onPress={() => router.push(route as never)} style={[secStyles.actionBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[secStyles.actionText, { color: colors.primary }]}>{action}</Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={13} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 22, marginBottom: 8 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  iconWrap: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: Colors.black },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontSize: 13, fontWeight: '600' },
});

// ─── Big Metric Row (icon + label + large value) ──────────────────────────────

function BigMetricRow({
  label, amount, sub, color, icon,
}: {
  label: string; amount: number; sub?: string;
  color?: string; icon: ComponentProps<typeof Ionicons>['name'];
}) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const resolvedColor = color ?? colors.primary;
  return (
    <View style={[bmStyles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={[
        bmStyles.iconBox,
        { backgroundColor: `${resolvedColor}15` },
        isRTL ? { marginStart: 12 } : { marginEnd: 12 },
      ]}>
        <Ionicons name={icon} size={20} color={resolvedColor} />
      </View>
      <View style={bmStyles.info}>
        <Text style={[bmStyles.label, { textAlign }]}>{label}</Text>
        {sub ? <Text style={[bmStyles.sub, { textAlign }]}>{sub}</Text> : null}
      </View>
      <CompactAmount
        value={amount}
        style={[bmStyles.value, { color: resolvedColor, textAlign: isRTL ? 'left' : 'right' }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      />
    </View>
  );
}

const bmStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.black },
  sub: { fontSize: 11, color: Colors.gray400, marginTop: 1 },
  value: { fontSize: 15, fontWeight: '800', maxWidth: '52%' },
});

// ─── Stat Chip Row ─────────────────────────────────────────────────────────────

function StatChipsRow({ chips }: { chips: { value: React.ReactNode; label: string; color?: string }[] }) {
  return (
    <View style={scStyles.row}>
      {chips.map((c, i) => (
        <View
          key={i}
          style={[
            scStyles.chip,
            i > 0 && { borderStartWidth: 1, borderStartColor: Colors.gray100 },
          ]}
        >
          {typeof c.value === 'string' || typeof c.value === 'number' ? (
            <Text style={[scStyles.value, scStyles.ltrTabular, c.color ? { color: c.color } : null]}>{c.value}</Text>
          ) : c.value}
          <Text style={scStyles.label}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

const scStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderTopColor: Colors.gray100, paddingTop: 12 },
  chip: { flex: 1, alignItems: 'center' },
  value: { fontSize: 16, fontWeight: '800', color: Colors.black, marginBottom: 2 },
  ltrTabular: { writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
  label: { fontSize: 10, color: Colors.gray400, textAlign: 'center' },
});

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, total, color }: { value: number; total: number; color?: string }) {
  const { colors } = useAppTheme();
  const resolvedColor = color ?? colors.primary;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View style={pbStyles.track}>
      <View style={[pbStyles.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: resolvedColor }]} />
    </View>
  );
}

const pbStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: Colors.gray100, borderRadius: 3, overflow: 'hidden', marginVertical: 4 },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Rank Badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const badgeColors = ['#F59E0B', '#9CA3AF', '#D97706'];
  const bg = badgeColors[rank - 1] ?? Colors.gray200;
  return (
    <View style={[rkStyles.badge, { backgroundColor: bg }]}>
      <Text style={rkStyles.text}>#{rank}</Text>
    </View>
  );
}

const rkStyles = StyleSheet.create({
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 11, fontWeight: '800', color: '#fff' },
});

// ─── Filter Period Bottom Sheet ───────────────────────────────────────────────

function FilterPeriodSheet({
  visible, onClose, current, onChange,
}: {
  visible: boolean;
  onClose: () => void;
  current: DateRangeKey;
  onChange: (key: DateRangeKey, from?: string, to?: string) => void;
}) {
  const { colors } = useAppTheme();
  const scrollIntoView = useKeyboardAwareFocus();
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');

  type Option = { key: DateRangeKey; label: string; icon: ComponentProps<typeof Ionicons>['name'] };
  const options: Option[] = [
    { key: 'today',  label: i18n.t('common.today'),     icon: 'today-outline' },
    { key: 'week',   label: i18n.t('common.thisWeek'),  icon: 'calendar-outline' },
    { key: 'month',  label: i18n.t('common.thisMonth'), icon: 'calendar-number-outline' },
    { key: 'year',   label: i18n.t('reports.year'),     icon: 'stats-chart-outline' },
    { key: 'custom', label: i18n.t('reports.custom'),   icon: 'options-outline' },
  ];

  return (
    <AppSheet visible={visible} onClose={onClose}>
      <AppSheetHeader title={i18n.t('reports.filterByPeriod')} />

      {options.map(({ key, icon, label }) => {
        const active = current === key;
        return (
          <AppSheetOption
            key={key}
            icon={icon}
            label={label}
            active={active}
            indicator="check"
            onPress={() => {
              if (key !== 'custom') { onChange(key); onClose(); }
              else { onChange('custom'); }
            }}
          />
        );
      })}

      {current === 'custom' && (
        <View style={fpStyles.customBox}>
          <Text style={[fpStyles.dateLabel, { color: Colors.gray600 }]}>{i18n.t('reports.fromDate')} (YYYY-MM-DD)</Text>
          <TextInput
            style={[fpStyles.dateInput, { color: Colors.black, borderColor: Colors.gray200 }]}
            placeholder="2026-01-01"
            placeholderTextColor={Colors.gray400}
            value={customFrom}
            onChangeText={setCustomFrom}
            onFocus={scrollIntoView}
          />
          <Text style={[fpStyles.dateLabel, { color: Colors.gray600 }]}>{i18n.t('reports.toDate')} (YYYY-MM-DD)</Text>
          <TextInput
            style={[fpStyles.dateInput, { color: Colors.black, borderColor: Colors.gray200 }]}
            placeholder="2026-12-31"
            placeholderTextColor={Colors.gray400}
            value={customTo}
            onChangeText={setCustomTo}
            onFocus={scrollIntoView}
          />
          <TouchableOpacity
            style={[fpStyles.applyBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (customFrom && customTo) {
                if (customFrom > customTo) {
                  Alert.alert(i18n.t('common.error'), i18n.t('reports.invalidDateRange'));
                  return;
                }
                onChange('custom', `${customFrom}T00:00:00.000Z`, `${customTo}T23:59:59.999Z`);
                onClose();
              } else {
                Alert.alert(i18n.t('common.required'), i18n.t('purchases.validationDate'));
              }
            }}
          >
            <Text style={fpStyles.applyText}>{i18n.t('reports.apply')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </AppSheet>
  );
}

const fpStyles = StyleSheet.create({
  customBox:   { marginTop: 8 },
  dateLabel:   { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  dateInput:   { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  applyBtn:    { borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  applyText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Financial Summary Card ───────────────────────────────────────────────────

function FinancialCard({
  label, amount, icon, color,
}: {
  label: string;
  amount: number;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  const { isRTL, textAlign } = useRTL();
  return (
    <View style={[fcStyles.card, { backgroundColor: `${color}0D` }]}>
      <View style={[fcStyles.iconBox, { backgroundColor: `${color}1A`, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[fcStyles.label, { textAlign }]}>{label}</Text>
      <CompactAmount
        value={amount}
        showCurrency={false}
        style={[fcStyles.value, { color, textAlign }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
      />
      <Text style={[fcStyles.currency, { textAlign }]}>IQD</Text>
    </View>
  );
}

const fcStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray500,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  currency: {
    fontSize: 11,
    color: Colors.gray400,
    fontWeight: '600',
  },
});

function FinancialSummaryGrid({
  totalSales, netProfit, totalLoss, remainingDebt,
}: {
  totalSales: number;
  netProfit: number;
  totalLoss: number;
  remainingDebt: number;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 360 }}
      style={fsgStyles.grid}
    >
      <View style={fsgStyles.row}>
        <FinancialCard
          label={t('reports.totalSales')}
          amount={totalSales}
          icon="trending-up"
          color={colors.primary}
        />
        <FinancialCard
          label={t('reports.netProfit')}
          amount={netProfit}
          icon="cash"
          color={Colors.success}
        />
      </View>
      <View style={fsgStyles.row}>
        <FinancialCard
          label={t('reports.totalLoss')}
          amount={totalLoss}
          icon="trending-down"
          color={Colors.error}
        />
        <FinancialCard
          label={t('reports.remainingDebt')}
          amount={remainingDebt}
          icon="time"
          color={Colors.warning}
        />
      </View>
    </MotiView>
  );
}

const fsgStyles = StyleSheet.create({
  grid: { paddingHorizontal: 16, gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
});

// ─── Export Report Modal ──────────────────────────────────────────────────────

function buildExportDateRange(
  key: 'today' | 'week' | 'month' | 'year' | 'custom',
  customFrom: string,
  customTo: string,
): { from: string; to: string; label: string } {
  const now = new Date();
  const labels: Record<string, string> = {
    today:  i18n.t('reports.dailyReport'),
    week:   i18n.t('reports.weeklyReport'),
    month:  i18n.t('reports.monthlyReport'),
    year:   i18n.t('reports.yearlyReport'),
    custom: i18n.t('reports.customRange'),
  };
  if (key === 'custom') {
    const label = customFrom && customTo ? `${customFrom} – ${customTo}` : i18n.t('reports.customRange');
    return { from: `${customFrom}T00:00:00.000Z`, to: `${customTo}T23:59:59.999Z`, label };
  }
  const start = new Date(now);
  if      (key === 'today') { start.setHours(0, 0, 0, 0); }
  else if (key === 'week')  { start.setDate(start.getDate() - 7); }
  else if (key === 'month') { start.setMonth(start.getMonth() - 1); }
  else if (key === 'year')  { start.setFullYear(start.getFullYear() - 1); }
  return { from: start.toISOString(), to: now.toISOString(), label: labels[key] };
}

function ExportReportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  type ExportPeriod = 'today' | 'week' | 'month' | 'year' | 'custom';
  const { flexDirection } = useRTL();
  const scrollIntoView = useKeyboardAwareFocus();
  const [period, setPeriod]       = useState<ExportPeriod>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');
  const [loading, setLoading]     = useState(false);

  const options: { key: ExportPeriod; label: string; desc: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'today',  label: t('reports.dailyReport'),   desc: t('reports.dailyReportDesc'),   icon: 'today-outline' },
    { key: 'week',   label: t('reports.weeklyReport'),  desc: t('reports.weeklyReportDesc'),  icon: 'calendar-outline' },
    { key: 'month',  label: t('reports.monthlyReport'), desc: t('reports.monthlyReportDesc'), icon: 'calendar-number-outline' },
    { key: 'year',   label: t('reports.yearlyReport'),  desc: t('reports.yearlyReportDesc'),  icon: 'stats-chart-outline' },
    { key: 'custom', label: t('reports.customRange'),   desc: t('reports.customRangeDesc'),   icon: 'options-outline' },
  ];

  async function handleGenerate() {
    if (loading) return;
    if (period === 'custom') {
      if (!customFrom || !customTo) { Alert.alert(t('common.required'), t('purchases.validationDate')); return; }
      if (customFrom > customTo)    { Alert.alert(t('common.error'),    t('reports.invalidDateRange')); return; }
    }
    setLoading(true);
    try {
      const range = buildExportDateRange(period, customFrom, customTo);
      const {
        getFinancialSummaryCards, getSalesReportData, getPurchaseReportData,
        getProfitLossData, getInventoryReportSummary, getDebtReportData,
        getLossAnalysis, getAllExpenses, loadBusiness,
      } = await import('@/lib/sqlite');

      const [
        financialCards, salesData, purchaseData, plData,
        inventoryData, debtData, lossAnalysis, expenses, biz,
      ] = await Promise.all([
        getFinancialSummaryCards(range.from, range.to),
        getSalesReportData(range.from, range.to),
        getPurchaseReportData(range.from, range.to),
        getProfitLossData(range.from, range.to),
        getInventoryReportSummary(),
        getDebtReportData(),
        getLossAnalysis(range.from, range.to),
        getAllExpenses(range.from, range.to),
        loadBusiness(),
      ]);

      const dateRange = { key: period as never, from: range.from, to: range.to, label: range.label };

      const { shareFinancialReport } = await import('@/lib/generateInvoice');
      await shareFinancialReport(
        { financialCards, salesData, purchaseData, plData, inventoryData, debtData, lossAnalysis, expenses, dateRange },
        { name: biz?.name ?? 'My Business', phone: biz?.phone ?? '', address: biz?.address ?? '', logoUri: biz?.logoPath ?? null },
      );
      onClose();
    } catch {
      Alert.alert(t('common.error'), t('reports.errorExport'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppSheet visible={visible} onClose={onClose}>
      <AppSheetHeader title={t('reports.exportReportTitle')} onClose={onClose} />

      <Text style={ermStyles.sectionLabel}>{t('reports.selectPeriod')}</Text>

      {options.map((opt) => (
        <AppSheetOption
          key={opt.key}
          icon={opt.icon}
          label={opt.label}
          subtitle={opt.desc}
          active={period === opt.key}
          indicator="check"
          onPress={() => setPeriod(opt.key)}
        />
      ))}

      {period === 'custom' && (
        <View style={ermStyles.customDates}>
          <Text style={ermStyles.dateLabel}>{t('reports.fromDate')} (YYYY-MM-DD)</Text>
          <TextInput
            style={ermStyles.dateInput}
            placeholder="2026-01-01"
            placeholderTextColor={Colors.gray400}
            value={customFrom}
            onChangeText={setCustomFrom}
            onFocus={scrollIntoView}
            editable={!loading}
          />
          <Text style={ermStyles.dateLabel}>{t('reports.toDate')} (YYYY-MM-DD)</Text>
          <TextInput
            style={ermStyles.dateInput}
            placeholder="2026-12-31"
            placeholderTextColor={Colors.gray400}
            value={customTo}
            onChangeText={setCustomTo}
            onFocus={scrollIntoView}
            editable={!loading}
          />
        </View>
      )}

      <TouchableOpacity
        style={[ermStyles.generateBtn, loading && ermStyles.generateBtnLoading, { flexDirection }]}
        onPress={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={ermStyles.generateText}>{t('reports.generating')}</Text>
          </>
        ) : (
          <>
            <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
            <Text style={ermStyles.generateText}>{t('reports.generatePDF')}</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={ermStyles.hint}>{t('reports.pdfHint')}</Text>
    </AppSheet>
  );
}

const ermStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.gray500,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  customDates: { marginTop: 4, marginBottom: 4 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: Colors.gray600, marginBottom: 6, marginTop: 10 },
  dateInput: {
    borderWidth: 1, borderColor: Colors.gray200, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.black,
  },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#111111', borderRadius: 14,
    paddingVertical: 14, marginTop: 16,
  },
  generateBtnLoading: { backgroundColor: Colors.gray400 },
  generateText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  hint: { fontSize: 11, color: Colors.gray400, textAlign: 'center', marginTop: 10 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const {
    dateRange, isLoading, financialCards,
    salesData, purchaseData, plData, inventoryData,
    debtData, topProfitable, monthlyRevenue, expenses,
    cashBalance, dashboardExpenseTotals,
    setDateRange, reload,
  } = useReportStore();

  const [isExporting, setIsExporting]         = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Only auto-reset to "today" the first time this screen is focused in a
  // session — once the user explicitly picks a range via the filter sheet,
  // returning to this tab/screen shouldn't silently discard their choice
  // (and re-trigger a reload) on every focus.
  const hasUserSetRangeRef = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!hasUserSetRangeRef.current) setDateRange('today');
  }, [setDateRange]));

  const handleDateRangeChange = useCallback((key: DateRangeKey, from?: string, to?: string) => {
    hasUserSetRangeRef.current = true;
    setDateRange(key, from, to);
  }, [setDateRange]);

  // ── Export PDF ────────────────────────────────────────────────────────────────
  async function exportPDF() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { shareFullReport } = await import('@/lib/generateInvoice');
      const { loadBusiness }    = await import('@/lib/sqlite');
      const biz = await loadBusiness();
      await shareFullReport(
        { salesData, purchaseData, plData, inventoryData, debtData, topProfitable, monthlyRevenue, expenses, dateRange },
        { name: biz?.name ?? 'My Business', phone: biz?.phone ?? '', address: biz?.address ?? '', logoUri: biz?.logoPath ?? null }
      );
    } catch {
      Alert.alert(t('common.error'), t('reports.errorExport'));
    } finally {
      setIsExporting(false);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  // New top financial cards
  const cardTotalSales    = financialCards?.totalSales            ?? 0;
  const cardNetProfit     = financialCards?.netProfit             ?? 0;
  const cardTotalLoss     = financialCards?.totalLoss             ?? 0;
  const cardRemainingDebt = financialCards?.remainingCustomerDebt ?? 0;

  // Existing P&L / section values (unchanged)
  const revenue      = salesData?.totalRevenue  ?? 0;
  const netProfit    = plData?.netProfit         ?? 0;
  const totalExp     = plData?.totalExpenses     ?? 0;
  const custDebt     = debtData?.totalSalesDebt    ?? 0;
  const suppDebt     = debtData?.totalPurchaseDebt ?? 0;
  const combinedDebt = custDebt + suppDebt;
  const expectedRev  = inventoryData?.stockValueSell  ?? 0;
  const potProfit    = inventoryData?.potentialProfit ?? 0;


  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={t('reports.title')}
        showBack
        onBack={() => router.back()}
        rightAction={
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <HeaderActionButton icon="options-outline" onPress={() => setFilterSheetOpen(true)} />
            <HeaderActionButton icon="download-outline" onPress={() => setExportModalOpen(true)} />
          </View>
        }
      />

      <ExportReportModal visible={exportModalOpen} onClose={() => setExportModalOpen(false)} />
      <FilterPeriodSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        current={dateRange.key}
        onChange={handleDateRangeChange}
      />

      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('reports.loading')}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} tintColor={colors.primary} />}
        >

          {/* ─── 1. Financial Summary Cards ─── */}
          <SectionHeader title={t('reports.financialSummary')} icon="stats-chart" />
          <FinancialSummaryGrid
            totalSales={cardTotalSales}
            netProfit={cardNetProfit}
            totalLoss={cardTotalLoss}
            remainingDebt={cardRemainingDebt}
          />

          {/* ─── Net Cash Balance ─── */}
          {cashBalance && (
            <View style={styles.cashBalanceCard}>
              <CashBalanceCard data={cashBalance} />
            </View>
          )}

          {/* ─── 2. Purchase Spending ─── */}
          <SectionHeader title={t('reports.purchaseSpending')} icon="bag-handle" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 30 }}>
            <PremiumCard style={styles.card}>
              <BigMetricRow
                label={t('reports.purchaseSpendingDesc')}
                amount={purchaseData?.totalCost ?? 0}
                icon="bag-handle"
                color="#7C3AED"
              />
            </PremiumCard>
          </MotiView>

          {/* ─── 3. Expected Profit ─── */}
          <SectionHeader title={t('reports.expectedProfit')} icon="bulb" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 60 }}>
            <PremiumCard style={styles.card}>
              <BigMetricRow
                label={t('reports.expectedProfitDesc')}
                amount={potProfit}
                icon="bulb"
                color={potProfit >= 0 ? Colors.warning : Colors.error}
              />
            </PremiumCard>
          </MotiView>

          {/* ─── 4. Sales Revenue ─── */}
          <SectionHeader title={t('reports.salesRevenue')} icon="trending-up" action={t('sales.history')} route="/(app)/sales/history" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 80 }}>
            <PremiumCard style={styles.card}>
              <BigMetricRow
                label={t('reports.grossRevenue')}
                amount={revenue}
                icon="trending-up"
                color={colors.primary}
              />
              <BigMetricRow
                label={`💵 ${t('sales.cash')}`}
                amount={salesData?.cashRevenue ?? 0}
                icon="cash"
                color={Colors.success}
                sub={`${salesData?.cashCount ?? 0} ${t('reports.salesCount')}`}
              />
              <BigMetricRow
                label={`📱 ${t('sales.fib')}`}
                amount={salesData?.fibRevenue ?? 0}
                icon="phone-portrait"
                color={colors.primary}
                sub={`${salesData?.fibCount ?? 0} ${t('reports.salesCount')}`}
              />
              <BigMetricRow
                label={`📋 ${t('common.debt')}`}
                amount={salesData?.debtRevenue ?? 0}
                icon="document-text"
                color={Colors.warning}
                sub={`${salesData?.debtCount ?? 0} ${t('reports.salesCount')}`}
              />
              <StatChipsRow chips={[
                { value: fmtIQD(salesData?.totalItemsSold ?? 0), label: t('reports.totalSoldProducts') },
                { value: String(salesData?.totalSales ?? 0),  label: t('reports.totalInvoices') },
                { value: <CompactAmount value={salesData?.avgOrderValue ?? 0} showCurrency={false} style={scStyles.value} />, label: `${t('reports.avgOrderValue')} IQD` },
              ]} />

              {revenue > 0 && (
                <View style={{ marginTop: 14 }}>
                  <DonutRing
                    segments={[
                      { label: t('sales.cash'),  value: salesData?.cashRevenue ?? 0, color: Colors.success },
                      { label: t('sales.fib'),   value: salesData?.fibRevenue  ?? 0, color: colors.primary },
                      { label: t('common.debt'), value: salesData?.debtRevenue ?? 0, color: Colors.warning },
                    ]}
                    size={100}
                    strokeWidth={14}
                    centerLabel={String(salesData?.totalSales ?? 0)}
                    centerSub={t('reports.salesCount')}
                  />
                </View>
              )}

              {(salesData?.totalDiscounts ?? 0) > 0 && (
                <View style={[styles.discountChip, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="pricetag" size={12} color="#D97706" />
                  <View style={[styles.discountInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={styles.discountText}>{t('reports.discountsGiven')}:</Text>
                    <CompactAmount value={salesData?.totalDiscounts ?? 0} style={styles.discountText} />
                  </View>
                </View>
              )}
            </PremiumCard>
          </MotiView>

          {/* ─── 5. Purchase Costs ─── */}
          <SectionHeader title={t('reports.purchaseCosts')} icon="cart" action={t('purchases.history')} route="/(app)/purchases" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 100 }}>
            <PremiumCard style={styles.card}>
              <BigMetricRow
                label={t('reports.totalCost')}
                amount={purchaseData?.totalCost ?? 0}
                icon="cart"
                color={Colors.gray600}
              />
              <BigMetricRow
                label={t('common.paid')}
                amount={purchaseData?.paidCost ?? 0}
                icon="checkmark-circle"
                color={Colors.success}
                sub={`${purchaseData?.paidCount ?? 0} ${t('reports.salesCount')}`}
              />
              <BigMetricRow
                label={t('common.debt')}
                amount={purchaseData?.debtCost ?? 0}
                icon="time"
                color={(purchaseData?.debtCost ?? 0) > 0 ? Colors.warning : Colors.success}
                sub={`${purchaseData?.debtCount ?? 0} ${t('reports.salesCount')}`}
              />
              <StatChipsRow chips={[
                { value: String(purchaseData?.totalPurchases ?? 0), label: t('reports.totalPurchasesCount') },
                { value: String(purchaseData?.uniqueSuppliers ?? 0), label: t('reports.uniqueSuppliers') },
                { value: fmtIQD(purchaseData?.totalUnits ?? 0), label: t('inventory.totalQty') },
              ]} />
              {purchaseData?.topSupplier && (
                <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="star" size={12} color={Colors.warning} />
                  <Text style={[styles.topText, { textAlign }]}>
                    {t('reports.topSupplierLabel')}: {purchaseData.topSupplier} (<CompactAmount value={purchaseData.topSupplierCost} style={styles.topText} />)
                  </Text>
                </View>
              )}
            </PremiumCard>
          </MotiView>

          {/* ─── 6. Expenses ─── */}
          {dashboardExpenseTotals && (
            <View style={styles.card}>
              <ExpensesCard totals={dashboardExpenseTotals} showLink={false} />
            </View>
          )}
          <SectionHeader title={t('reports.expensesTitle')} icon="wallet" action={t('common.edit')} route="/(app)/reports/expenses" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 120 }}>
            <PremiumCard style={styles.card}>
              {expenses.length === 0 ? (
                <TouchableOpacity style={[styles.addExpenseCta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => router.push('/(app)/reports/expenses' as never)}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.addExpenseText, { color: colors.primary }]}>{t('reports.addFirstExpense')}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <BigMetricRow
                    label={t('reports.totalExpenses')}
                    amount={totalExp}
                    icon="wallet"
                    color={Colors.error}
                  />
                  {(plData?.expenseBreakdown ?? []).map((e) => (
                    <View key={e.category} style={{ marginTop: 10 }}>
                      <View style={[styles.catHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.catLabel, { textAlign }]}>{tCat(e.category)}</Text>
                        <CompactAmount value={e.total} style={[styles.catValue, { textAlign: isRTL ? 'left' : 'right' }]} />
                      </View>
                      <ProgressBar value={e.total} total={totalExp} color={Colors.error} />
                    </View>
                  ))}
                </>
              )}
            </PremiumCard>
          </MotiView>

          {/* ─── 7. Debt Overview ─── */}
          <SectionHeader title={t('reports.debtOverview')} icon="warning" action={t('reports.alertActionView')} route="/(app)/debt" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 140 }}>
            <PremiumCard style={styles.card}>
              <BigMetricRow
                label={t('reports.customerDebt')}
                amount={custDebt}
                icon="person"
                color={custDebt > 0 ? Colors.warning : Colors.success}
                sub={`${debtData?.activeSalesCount ?? 0} ${t('reports.salesCount')}`}
              />
              <BigMetricRow
                label={t('reports.supplierDebt')}
                amount={suppDebt}
                icon="business"
                color={suppDebt > 0 ? Colors.error : Colors.success}
                sub={`${debtData?.activePurchaseCount ?? 0} ${t('reports.salesCount')}`}
              />
              <View style={styles.dividerLine} />
              <View style={[styles.debtTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.debtTotalLabel, { textAlign }]}>{t('reports.combinedDebt')}</Text>
                <CompactAmount
                  value={combinedDebt}
                  style={[styles.debtTotalValue, { color: combinedDebt > 0 ? Colors.error : Colors.success, textAlign: isRTL ? 'left' : 'right' }]}
                />
              </View>
              {(debtData?.overdueCount ?? 0) > 0 && (
                <View style={[styles.overdueChip, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="time" size={13} color={Colors.error} />
                  <Text style={[styles.overdueText, { textAlign }]}>
                    {t('reports.alertOverdueTitle', { count: debtData?.overdueCount })}
                  </Text>
                </View>
              )}
              {(debtData?.salesDebtOriginal ?? 0) > 0 && (
                <View style={{ marginTop: 10 }}>
                  <View style={[styles.catHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.catLabel, { textAlign }]}>{t('reports.grossMargin')} (Collection Rate)</Text>
                    <Text style={[styles.catValue, { textAlign: isRTL ? 'left' : 'right' }]}>{(debtData?.collectionRate ?? 0).toFixed(0)}%</Text>
                  </View>
                  <ProgressBar value={debtData?.salesDebtCollected ?? 0} total={debtData?.salesDebtOriginal ?? 1} color={Colors.success} />
                </View>
              )}
            </PremiumCard>
          </MotiView>

          {/* ─── 8. Inventory Potential ─── */}
          <SectionHeader title={t('reports.inventoryPotential')} icon="cube" action={t('inventory.title')} route="/(app)/inventory" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 160 }}>
            <PremiumCard style={styles.card}>
              <BigMetricRow
                label={t('reports.expectedRevenue')}
                amount={expectedRev}
                icon="trending-up"
                color={colors.primary}
                sub={t('reports.stockSellValue')}
              />
              <BigMetricRow
                label={t('reports.potentialProfit')}
                amount={potProfit}
                icon="cash"
                color={potProfit >= 0 ? Colors.success : Colors.error}
              />
              <BigMetricRow
                label={t('reports.stockCostValue')}
                amount={inventoryData?.stockValueCost ?? 0}
                icon="cart"
                color={Colors.gray600}
              />
              <StatChipsRow chips={[
                { value: String(inventoryData?.activeProducts ?? 0), label: t('inventory.products') },
                { value: fmtIQD(inventoryData?.totalStockUnits ?? 0),   label: t('inventory.totalQty') },
                {
                  value: String(inventoryData?.lowStockCount ?? 0),
                  label: t('inventory.lowStock'),
                  color: (inventoryData?.lowStockCount ?? 0) > 0 ? Colors.warning : undefined,
                },
              ]} />
              {(inventoryData?.categoryCounts ?? []).slice(0, 4).map((cat) => (
                <View key={cat.category} style={{ marginTop: 10 }}>
                  <View style={[styles.catHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.catLabel, { textAlign }]}>{tCat(cat.category)}</Text>
                    <CompactAmount value={cat.value} style={[styles.catValue, { textAlign: isRTL ? 'left' : 'right' }]} />
                  </View>
                  <ProgressBar value={cat.value} total={inventoryData?.stockValueCost ?? 1} color={colors.primary} />
                </View>
              ))}
            </PremiumCard>
          </MotiView>


          {/* ─── Profit Summary ─── */}
          <SectionHeader title={t('reports.profit')} icon="analytics" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 100 }}>
            <PremiumCard style={styles.card}>
              <BigMetricRow
                label={t('reports.netProfit')}
                amount={netProfit}
                icon="cash"
                color={netProfit >= 0 ? Colors.success : Colors.error}
              />
            </PremiumCard>
          </MotiView>

          {/* ─── 9. Most Profitable Products ─── */}
          <SectionHeader title={t('reports.topProducts')} icon="star" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 180 }}>
            <PremiumCard style={styles.card}>
              {topProfitable.length === 0 ? (
                <Text style={styles.emptyCard}>{t('reports.noSalesData')}</Text>
              ) : (
                topProfitable.map((p, i) => (
                  <View key={p.productName} style={[styles.rankRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <RankBadge rank={i + 1} />
                    <View style={styles.rankInfo}>
                      <Text style={[styles.rankName, { textAlign }]} numberOfLines={1}>{p.productName}</Text>
                      <Text style={[styles.rankSub, { textAlign }]}>
                        {t('reports.soldMargin', { qty: p.totalQty, pct: p.marginPct.toFixed(1) })}
                      </Text>
                    </View>
                    <CompactAmount
                      value={p.grossProfit}
                      style={[styles.rankValue, { color: p.grossProfit >= 0 ? Colors.success : Colors.error, textAlign: isRTL ? 'left' : 'right' }]}
                    />
                  </View>
                ))
              )}
            </PremiumCard>
          </MotiView>

          {/* ─── 10. Customer & Supplier History ─── */}
          <SectionHeader title={t('reports.customerSupplierHistory')} icon="people" action={t('reports.alertActionView')} route="/(app)/customers" />
          <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 200 }}>
            <PremiumCard style={styles.card}>
              <Text style={[styles.subSectionTitle, { textAlign }]}>{t('dashboard.customers')}</Text>
              <TopCustomersSection />
              <View style={styles.subSectionDivider} />
              <Text style={[styles.subSectionTitle, { textAlign }]}>{t('reports.supplierHistoryTitle')}</Text>
              <TopSuppliersSection />
            </PremiumCard>
          </MotiView>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Top Customers ────────────────────────────────────────────────────────────

function TopCustomersSection() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, textAlign } = useRTL();
  const [customers, setCustomers] = useState<{
    name: string; phone: string | null; totalPurchases: number; saleCount: number;
  }[]>([]);

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
        <TouchableOpacity key={c.name} style={[styles.rankRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => router.push('/(app)/customers' as never)}>
          <RankBadge rank={i + 1} />
          <View style={styles.rankInfo}>
            <Text style={[styles.rankName, { textAlign }]} numberOfLines={1}>{c.name}</Text>
            <Text style={[styles.rankSub, { textAlign }]}>
              {t('reports.invoiceCount', { count: c.saleCount })}{c.phone ? ` · ${c.phone}` : ''}
            </Text>
          </View>
          <CompactAmount value={c.totalPurchases} style={[styles.rankValue, { textAlign: isRTL ? 'left' : 'right' }]} />
        </TouchableOpacity>
      ))}
    </>
  );
}

// ─── Top Suppliers ────────────────────────────────────────────────────────────

function TopSuppliersSection() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, textAlign } = useRTL();
  const [suppliers, setSuppliers] = useState<{
    name: string; phone: string | null; totalSpent: number; purchaseCount: number;
  }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { getTopSuppliers } = await import('@/lib/sqlite');
        setSuppliers(await getTopSuppliers(5));
      } catch {}
    })();
  }, []);

  if (suppliers.length === 0) {
    return <Text style={styles.emptyCard}>{t('reports.noSupplierData')}</Text>;
  }

  return (
    <>
      {suppliers.map((s, i) => (
        <TouchableOpacity key={s.name} style={[styles.rankRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => router.push('/(app)/suppliers' as never)}>
          <RankBadge rank={i + 1} />
          <View style={styles.rankInfo}>
            <Text style={[styles.rankName, { textAlign }]} numberOfLines={1}>{s.name}</Text>
            <Text style={[styles.rankSub, { textAlign }]}>
              {t('reports.purchaseCount', { count: s.purchaseCount })}{s.phone ? ` · ${s.phone}` : ''}
            </Text>
          </View>
          <CompactAmount value={s.totalSpent} style={[styles.rankValue, { color: Colors.warning, textAlign: isRTL ? 'left' : 'right' }]} />
        </TouchableOpacity>
      ))}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: Colors.gray400 },

  scrollBody: { paddingBottom: 20 },
  card: { marginHorizontal: 16, marginBottom: 4 },
  cashBalanceCard: { marginHorizontal: 16, marginBottom: 4, marginTop: 20 },

  // ── Discount chip ──────────────────────────────────────────────────────────
  discountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12,
    backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  discountInner: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  discountText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  // ── Top supplier highlight ─────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.gray100,
  },
  topText: { fontSize: 12, color: Colors.gray500, fontWeight: '600', flex: 1 },

  // ── Debt overview ──────────────────────────────────────────────────────────
  dividerLine: { height: 1, backgroundColor: Colors.gray100, marginVertical: 10 },
  debtTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  debtTotalLabel: { fontSize: 14, fontWeight: '700', color: Colors.black },
  debtTotalValue: { fontSize: 15, fontWeight: '800' },
  overdueChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8,
    backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  overdueText: { fontSize: 12, color: Colors.error, fontWeight: '600' },

  // ── Category progress ──────────────────────────────────────────────────────
  catHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catLabel: { fontSize: 12, color: Colors.gray500 },
  catValue: { fontSize: 12, fontWeight: '700', color: Colors.black },

  // ── Rank rows ──────────────────────────────────────────────────────────────
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 14, fontWeight: '600', color: Colors.black },
  rankSub: { fontSize: 11, color: Colors.gray400, marginTop: 1 },
  rankValue: { fontSize: 14, fontWeight: '800', color: Colors.success, maxWidth: '45%' },

  emptyCard: { fontSize: 13, color: Colors.gray400, textAlign: 'center', paddingVertical: 12 },
  subSectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.gray500, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },
  subSectionDivider: { height: 1, backgroundColor: Colors.gray100, marginVertical: 14 },

  // ── Expenses add CTA ───────────────────────────────────────────────────────
  addExpenseCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addExpenseText: { fontSize: 14, fontWeight: '600' },

});
