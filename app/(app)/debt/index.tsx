import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Keyboard,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { DashboardMetricSquare } from '@/components/dashboard/DashboardMetricSquare';
import { useDebtStore } from '@/store/debtStore';
import { useBusinessStore } from '@/store/businessStore';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { Theme } from '@/constants/theme';
import { getOverdueLevel, getDebtDisplayStatus } from '@/types/debt';
import type { SalesDebtDetail, PurchaseDebt } from '@/types/debt';
import { fmtIQD } from '@/utils/formatters';
import { roundToNearest250 } from '@/utils/rounding';
import { useRTL, useDirectionalChevron, RTL_SPACING } from '@/lib/rtl';
import { isDateWithinRange, getPeriodBounds, formatDateShort, type PeriodKey } from '@/utils/dateRanges';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { shareDebtsAuditReport } from '@/lib/generateInvoice';
import { DebtPdfExportModal } from '@/components/debt/DebtPdfExportModal';
import type { DebtReportSections } from '@/lib/debtReportTemplate';


function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// Forces a numeric Text/AmountText to render LTR + left-aligned regardless of app language.
const NUMBER_LTR = { textAlign: 'left' as const, writingDirection: 'ltr' as const };

type SummaryTone = 'primary' | 'error' | 'neutral';
function getToneStyles(colors: AppColors, isDark: boolean): Record<SummaryTone, { wrapBg: string; iconColor: string; valueColor: string }> {
  const errorTint = getStatusTint('error', colors, isDark);
  return {
    primary: { wrapBg: colors.softBlue, iconColor: colors.primary, valueColor: colors.primary },
    error:   { wrapBg: errorTint.bg,    iconColor: colors.error,    valueColor: colors.error },
    neutral: { wrapBg: colors.gray100,  iconColor: colors.gray500,  valueColor: colors.black },
  };
}

// ─── Overdue Badge ─────────────────────────────────────────────────────────────

function OverdueBadge({ level }: { level: 0 | 1 | 2 }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  if (level === 0) return null;
  const bg  = level === 2 ? colors.error : colors.warning;
  const txt = level === 2 ? i18n.t('debt.overdueLong') : i18n.t('debt.overdueShort');
  return (
    <View style={[styles.overdueBadge, { backgroundColor: bg }]}>
      <Text style={[styles.overdueBadgeText, { color: colors.white }]}>{txt}</Text>
    </View>
  );
}

// ─── Status Pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const errorTint = getStatusTint('error', colors, isDark);
  const warningTint = getStatusTint('warning', colors, isDark);
  const successTint = getStatusTint('success', colors, isDark);
  const configs: Record<string, { bg: string; fg: string; label: string }> = {
    unpaid:  { bg: errorTint.bg,    fg: errorTint.text,   label: i18n.t('debt.statusUnpaid')  },
    partial: { bg: warningTint.bg,  fg: warningTint.text, label: i18n.t('debt.statusPartial') },
    overdue: { bg: colors.error,    fg: colors.white,     label: i18n.t('debt.statusOverdue') },
    paid:    { bg: successTint.bg,  fg: successTint.text, label: i18n.t('debt.statusPaid')   },
  };
  const cfg = configs[status] ?? configs.unpaid;
  return (
    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusPillText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const pct = total > 0 ? Math.min(1, paid / total) : 0;
  const color = pct >= 1 ? colors.success : pct > 0 ? colors.warning : colors.error;
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  );
}

// ─── Sales Debt Card ───────────────────────────────────────────────────────────

function SalesDebtCardImpl({
  debt,
  onPay,
}: {
  debt: SalesDebtDetail;
  /** Id-based so the parent passes one stable callback for every row. */
  onPay: (debtId: number) => void;
}) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet), [colors, isTablet]);
  const { flexDirection, alignEnd } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const overdueLevel = getOverdueLevel(debt.lastPaymentAt, debt.createdAt, debt.remainingAmount);
  const displayStatus = getDebtDisplayStatus(debt.paidAmount, debt.remainingAmount, overdueLevel);

  const initials = debt.customerName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250 }}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push(`/(app)/debt/sales/${debt.id}` as never)}
      >
        <View style={[styles.cardTop, { flexDirection }]}>
          <View style={[styles.cardAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.cardAvatarText, { color: colors.primary }]}>{initials || '?'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{debt.customerName}</Text>
            <Text style={styles.cardSub}>
              <IdText size="small" style={styles.cardSub}>{debt.invoiceNumber}</IdText> · <DateText value={debt.createdAt} size="small" style={styles.cardSub} />
            </Text>
            {debt.lastPaymentAt && (
              <Text style={styles.cardSub2}>{i18n.t('debt.lastPaymentDaysAgo', { count: daysAgo(debt.lastPaymentAt) })}</Text>
            )}
          </View>
          <View style={[styles.cardRight, { alignItems: alignEnd }]}>
            <StatusPill status={displayStatus} />
            <OverdueBadge level={overdueLevel} />
          </View>
        </View>

        <View style={styles.cardAmounts}>
          <AmountText value={debt.remainingAmount} currency="IQD" variant="large" style={[styles.amountRemaining, { color: colors.primary }, NUMBER_LTR]} />
          <View style={{ flexDirection, flexWrap: 'wrap' }}>
            <LTRNumber style={styles.amountSub}>{fmtIQD(debt.remainingAmount)}</LTRNumber>
            <Text style={styles.amountSub}> </Text>
            <Text style={styles.amountSub}>{i18n.t('debt.owedByCustomer')}</Text>
          </View>
        </View>

        <ProgressBar paid={debt.paidAmount} total={debt.originalAmount} />

        <View style={styles.cardActionsStack}>
          <TouchableOpacity
            style={[styles.quickPayBtnFull, { backgroundColor: colors.primary, flexDirection }]}
            onPress={() => onPay(debt.id)}
          >
            <Ionicons name="flash" size={14} color={colors.white} />
            <Text style={[styles.quickPayText, { color: colors.white }]}>{i18n.t('debt.payCustomer')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.detailBtnRow, { flexDirection }]}
            onPress={() => router.push(`/(app)/debt/sales/${debt.id}` as never)}
          >
            <Text style={[styles.detailBtnText, { color: colors.primary }]}>{i18n.t('debt.details')}</Text>
            <Ionicons name={chevronForward as never} size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

const SalesDebtCard = React.memo(SalesDebtCardImpl);

// ─── Purchase Debt Card ────────────────────────────────────────────────────────

function PurchaseDebtCardImpl({
  debt,
  onPay,
}: {
  debt: PurchaseDebt;
  onPay: (debtId: number) => void;
}) {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet), [colors, isTablet]);
  const purchaseAvatarTint = useMemo(() => getStatusTint('error', colors, isDark), [colors, isDark]);
  const { flexDirection, alignEnd } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const overdueLevel = getOverdueLevel(debt.lastPaymentAt, debt.createdAt, debt.remainingAmount);
  const displayStatus = getDebtDisplayStatus(debt.paidAmount, debt.remainingAmount, overdueLevel);

  const initials = debt.supplierName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250 }}
    >
      <TouchableOpacity
        style={[styles.card, styles.cardPurchase]}
        activeOpacity={0.85}
        onPress={() => router.push(`/(app)/debt/purchase/${debt.id}` as never)}
      >
        <View style={[styles.cardTop, { flexDirection }]}>
          <View style={[styles.cardAvatar, { backgroundColor: purchaseAvatarTint.bg }]}>
            <Text style={[styles.cardAvatarText, { color: purchaseAvatarTint.text }]}>{initials || '?'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{debt.supplierName}</Text>
            <Text style={styles.cardSub}>
              {debt.purchaseNumber ? <IdText size="small" style={styles.cardSub}>{debt.purchaseNumber}</IdText> : i18n.t('debt.noRef')} · <DateText value={debt.createdAt} size="small" style={styles.cardSub} />
            </Text>
            {debt.lastPaymentAt && (
              <Text style={styles.cardSub2}>{i18n.t('debt.lastPaymentDaysAgo', { count: daysAgo(debt.lastPaymentAt) })}</Text>
            )}
          </View>
          <View style={[styles.cardRight, { alignItems: alignEnd }]}>
            <StatusPill status={displayStatus} />
            <OverdueBadge level={overdueLevel} />
          </View>
        </View>

        <View style={styles.cardAmounts}>
          <AmountText value={debt.remainingAmount} currency="IQD" variant="large" style={[styles.amountRemaining, { color: colors.error }, NUMBER_LTR]} />
          <View style={{ flexDirection, flexWrap: 'wrap' }}>
            <LTRNumber style={styles.amountSub}>{fmtIQD(debt.remainingAmount)}</LTRNumber>
            <Text style={styles.amountSub}> </Text>
            <Text style={styles.amountSub}>{i18n.t('debt.owedToSupplier')}</Text>
          </View>
        </View>

        <ProgressBar paid={debt.paidAmount} total={debt.originalAmount} />

        <View style={styles.cardActionsStack}>
          <TouchableOpacity
            style={[styles.quickPayBtnFull, { backgroundColor: colors.error, flexDirection }]}
            onPress={() => onPay(debt.id)}
          >
            <Ionicons name="flash" size={14} color={colors.white} />
            <Text style={[styles.quickPayText, { color: colors.white }]}>{i18n.t('debt.paySupplier')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.detailBtnRow, { flexDirection }]}
            onPress={() => router.push(`/(app)/debt/purchase/${debt.id}` as never)}
          >
            <Text style={[styles.detailBtnText, { color: colors.primary }]}>{i18n.t('debt.details')}</Text>
            <Ionicons name={chevronForward as never} size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

const PurchaseDebtCard = React.memo(PurchaseDebtCardImpl);

// ─── Quick Pay Modal ───────────────────────────────────────────────────────────

function QuickPayModal({
  visible,
  name,
  remaining,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  name: string;
  remaining: number;
  onCancel: () => void;
  onConfirm: (amount: number) => void;
}) {
  const { colors } = useAppTheme();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet), [colors, isTablet]);
  const { flexDirection, textAlign, isRTL } = useRTL();
  const [value, setValue] = useState('');

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 18 }}
        style={styles.modal}
      >
        <Text style={[styles.modalTitle, { textAlign }]}>{i18n.t('debt.recordPayment')}</Text>
        <Text style={[styles.modalSub, { textAlign }]}>{name}</Text>
        <Text style={[styles.modalRemaining, { color: colors.primary, textAlign }]}>
          {i18n.t('debt.remainingLabel')}: <AmountText value={remaining} currency="IQD" variant="small" style={[styles.modalRemaining, { color: colors.primary }, NUMBER_LTR]} />
        </Text>
        <TextInput
          style={[styles.modalInput, isRTL && { textAlign: 'right', writingDirection: 'ltr' }]}
          placeholder={i18n.t('debt.amountPlaceholder')}
          placeholderTextColor={colors.gray400}
          keyboardType="decimal-pad"
          value={value}
          onChangeText={setValue}
          onEndEditing={() => {
            const r = roundToNearest250(parseFloat(value) || 0);
            setValue(r > 0 ? String(r) : '');
          }}
          autoFocus
        />
        <View style={[styles.modalActions, { flexDirection }]}>
          <TouchableOpacity
            style={styles.modalCancel}
            onPress={() => { setValue(''); onCancel(); }}
          >
            <Text style={styles.modalCancelText}>{i18n.t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalConfirm, { backgroundColor: colors.primary }]}
            onPress={() => {
              const amt = roundToNearest250(parseFloat(value) || 0);
              if (!amt || amt <= 0) {
                Alert.alert(i18n.t('common.error'), i18n.t('debt.invalidAmount'));
                return;
              }
              setValue('');
              onConfirm(amt);
            }}
          >
            <Text style={[styles.modalConfirmText, { color: colors.white }]}>{i18n.t('common.confirm')}</Text>
          </TouchableOpacity>
        </View>
      </MotiView>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

type Tab = 'report' | 'sales' | 'purchase';

export default function DebtScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { isTablet, contentContainerStyle, cardColumns } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet), [colors, isTablet]);
  const toneStyles = useMemo(() => getToneStyles(colors, isDark), [colors, isDark]);
  const { flexDirection, textAlign, writingDirection, isRTL } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const {
    summary, isLoading, salesDebts, purchaseDebts,
    loadAll, paySalesDebt, payPurchaseDebt,
  } = useDebtStore();

  // Tab state — ALWAYS defaults to 'report' (ڕاپۆرت) on open!
  const [tab, setTab] = useState<Tab>('report');
  const [query, setQuery] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportModalOpen, setPdfExportModalOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const handleExpandSearch = useCallback(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchExpanded(true);
    if (tab === 'report') {
      setTab('sales');
    }
  }, [tab]);

  const handleCollapseSearch = useCallback((clearQuery = false) => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchExpanded(false);
    if (clearQuery) {
      setQuery('');
    }
    Keyboard.dismiss();
  }, []);

  // Period filter state — ALWAYS defaults to 'all' (هەمووی)!
  const [periodKey, setPeriodKey] = useState<PeriodKey>('all');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [fromVal, setFromVal] = useState('');
  const [toVal, setToVal] = useState('');

  const [payTarget, setPayTarget] = useState<{
    id: number; name: string; remaining: number; type: 'sales' | 'purchase';
  } | null>(null);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const onRefresh = useCallback(() => {
    loadAll();
  }, [loadAll]);

  // Date bounds for current period filter
  const bounds = useMemo(() => {
    if (periodKey === 'custom' && customRange) {
      return getPeriodBounds('custom', customRange.from, customRange.to);
    }
    return getPeriodBounds(periodKey);
  }, [periodKey, customRange]);

  // Filter lists by date bounds
  const periodFilteredSales = useMemo(() => {
    if (periodKey === 'all') return salesDebts;
    return salesDebts.filter((d) => isDateWithinRange(d.createdAt, bounds.from, bounds.to));
  }, [salesDebts, periodKey, bounds]);

  const periodFilteredPurchase = useMemo(() => {
    if (periodKey === 'all') return purchaseDebts;
    return purchaseDebts.filter((d) => isDateWithinRange(d.createdAt, bounds.from, bounds.to));
  }, [purchaseDebts, periodKey, bounds]);

  // Search filter on top of date filtered lists
  const visibleSales = useMemo(() => {
    if (!query.trim()) return periodFilteredSales;
    const q = query.trim().toLowerCase();
    return periodFilteredSales.filter((d) => {
      return (
        (d.customerName || '').toLowerCase().includes(q) ||
        (d.invoiceNumber || '').toLowerCase().includes(q) ||
        (d.customerPhone || '').toLowerCase().includes(q)
      );
    });
  }, [query, periodFilteredSales]);

  const visiblePurchase = useMemo(() => {
    if (!query.trim()) return periodFilteredPurchase;
    const q = query.trim().toLowerCase();
    return periodFilteredPurchase.filter((d) => {
      return (
        (d.supplierName || '').toLowerCase().includes(q) ||
        (d.purchaseNumber || '').toLowerCase().includes(q) ||
        (d.supplierPhone || '').toLowerCase().includes(q)
      );
    });
  }, [query, periodFilteredPurchase]);

  // Totals for Report & Overview
  const reportSalesTotal = useMemo(
    () => periodFilteredSales.reduce((s, d) => s + (d.remainingAmount || 0), 0),
    [periodFilteredSales]
  );
  const reportPurchaseTotal = useMemo(
    () => periodFilteredPurchase.reduce((s, d) => s + (d.remainingAmount || 0), 0),
    [periodFilteredPurchase]
  );
  const reportOverdueCount = useMemo(() => {
    const salesOverdue = periodFilteredSales.filter(
      (d) => getOverdueLevel(d.lastPaymentAt, d.createdAt, d.remainingAmount) > 0
    ).length;
    const purchaseOverdue = periodFilteredPurchase.filter(
      (d) => getOverdueLevel(d.lastPaymentAt, d.createdAt, d.remainingAmount) > 0
    ).length;
    return salesOverdue + purchaseOverdue;
  }, [periodFilteredSales, periodFilteredPurchase]);

  const reportActiveDebtsCount = periodFilteredSales.length + periodFilteredPurchase.length;
  const reportNetBalance = reportSalesTotal - reportPurchaseTotal;

  // Period label for PDF & UI
  const periodDisplayLabel = useMemo(() => {
    if (periodKey === 'all') return isKuLanguage ? 'هەمووی' : 'All Time';
    if (periodKey === 'today') return isKuLanguage ? 'ئەمڕۆ' : 'Today';
    if (periodKey === 'week') return isKuLanguage ? 'ئەم هەفتەیە' : 'This Week';
    if (periodKey === 'month') return isKuLanguage ? 'ئەم مانگە' : 'This Month';
    if (periodKey === 'year') return isKuLanguage ? 'ئەمساڵ' : 'This Year';
    if (customRange) return `${customRange.from} → ${customRange.to}`;
    return isKuLanguage ? 'دیاریکراو' : 'Custom';
  }, [periodKey, customRange, isKuLanguage]);

  // Payment handler
  const handlePay = useCallback(async (amount: number) => {
    if (!payTarget) return;
    try {
      if (payTarget.type === 'sales') {
        await paySalesDebt(payTarget.id, amount);
      } else {
        await payPurchaseDebt(payTarget.id, amount);
      }
      setPayTarget(null);
    } catch {
      Alert.alert(t('common.error'), t('debt.errorPayment'));
    }
  }, [payTarget, paySalesDebt, payPurchaseDebt, t]);

  const handlePaySalesPress = useCallback((debtId: number) => {
    const debt = visibleSales.find((d) => d.id === debtId);
    if (debt) setPayTarget({ id: debt.id, name: debt.customerName, remaining: debt.remainingAmount, type: 'sales' });
  }, [visibleSales]);

  const handlePayPurchasePress = useCallback((debtId: number) => {
    const debt = visiblePurchase.find((d) => d.id === debtId);
    if (debt) setPayTarget({ id: debt.id, name: debt.supplierName, remaining: debt.remainingAmount, type: 'purchase' });
  }, [visiblePurchase]);

  const renderSalesItem = useCallback(({ item }: { item: SalesDebtDetail }) => (
    <SalesDebtCard debt={item} onPay={handlePaySalesPress} />
  ), [handlePaySalesPress]);

  const renderPurchaseItem = useCallback(({ item }: { item: PurchaseDebt }) => (
    <PurchaseDebtCard debt={item} onPay={handlePayPurchasePress} />
  ), [handlePayPurchasePress]);

  // Export PDF Report handler with user-selected sections
  const handleExportPdf = useCallback(async (sections: DebtReportSections) => {
    setIsExportingPdf(true);
    try {
      const business = useBusinessStore.getState();
      const success = await shareDebtsAuditReport(
        sections,
        {
          summary: {
            totalSalesDebt: reportSalesTotal,
            totalPurchaseDebt: reportPurchaseTotal,
            activeSalesCount: periodFilteredSales.length,
            activePurchaseCount: periodFilteredPurchase.length,
            overdueCount: reportOverdueCount,
          },
          salesDebts: periodFilteredSales,
          purchaseDebts: periodFilteredPurchase,
        },
        periodDisplayLabel,
        {
          name: business.name || 'My Store',
          phone: business.phone || '',
          address: business.address || '',
          logoUri: business.logoUri ?? null,
        }
      );
      if (success) {
        setPdfExportModalOpen(false);
      }
    } catch (err) {
      console.error('[DebtScreen] PDF Export failed:', err);
      Alert.alert(isKuLanguage ? 'هەڵە' : 'Error', String(err));
    } finally {
      setIsExportingPdf(false);
    }
  }, [
    reportSalesTotal,
    reportPurchaseTotal,
    periodFilteredSales,
    periodFilteredPurchase,
    reportOverdueCount,
    periodDisplayLabel,
    isKuLanguage,
  ]);

  // Period Filter keys and labels
  const periodKeys: PeriodKey[] = ['all', 'today', 'week', 'month', 'year', 'custom'];
  const periodLabels: Record<PeriodKey, string> = {
    all:    isKuLanguage ? 'هەمووی' : 'All',
    today:  t('periodFilter.today'),
    week:   t('periodFilter.thisWeek'),
    month:  t('periodFilter.thisMonth'),
    year:   t('periodFilter.thisYear'),
    custom: t('periodFilter.customRange'),
  };

  const netBalanceColor = reportNetBalance >= 0 ? '#10B981' : colors.error;
  const netBalanceDesc = reportNetBalance >= 0
    ? (isKuLanguage ? 'باڵانس لە قازانجی ئێمەیە (کڕیاران زیاتر قەرزدارن)' : 'In Our Favor (Customers owe us more)')
    : (isKuLanguage ? 'باڵانس لە بەرژەوەندی دابینکەرانە (دەبێت زیاتر بدەین)' : 'In Suppliers Favor (We owe suppliers more)');

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {/* ── App Header with PDF Export ── */}
      <AppHeader
        title={t('debt.title')}
        showBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(app)' as never);
        }}
        rightAction={
          <HeaderActionButton
            icon="document-text-outline"
            onPress={() => setPdfExportModalOpen(true)}
            loading={isExportingPdf}
          />
        }
      />

      {/* ── 3-Tab Segmented Switcher (Report, Sales, Purchases) ── */}
      <View style={[styles.segmentWrapper, { backgroundColor: colors.white, borderBottomColor: colors.gray200 }]}>
        <View style={[styles.segmentTrack, { backgroundColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Tab 1: ڕاپۆرت (Report) - ALWAYS opens by default */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { setTab('report'); handleCollapseSearch(true); }}
            style={[
              styles.segmentBtn,
              tab === 'report' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="stats-chart-outline"
              size={isTablet ? 18 : 16}
              color={tab === 'report' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: tab === 'report' ? '#FFFFFF' : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {t('debt.reportTab')}
            </Text>
          </TouchableOpacity>

          {/* Tab 2: فرۆشتن (Sales / Customer Debts) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { setTab('sales'); handleCollapseSearch(true); }}
            style={[
              styles.segmentBtn,
              tab === 'sales' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="arrow-down-circle-outline"
              size={isTablet ? 18 : 16}
              color={tab === 'sales' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: tab === 'sales' ? '#FFFFFF' : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {t('debt.salesTab')}
            </Text>
            {periodFilteredSales.length > 0 && (
              <View style={[styles.tabBadge, tab === 'sales' ? { backgroundColor: 'rgba(255,255,255,0.3)' } : { backgroundColor: colors.gray200 }]}>
                <Text style={[styles.tabBadgeText, { color: tab === 'sales' ? '#fff' : colors.gray700 }, NUMBER_LTR]}>
                  {periodFilteredSales.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Tab 3: کڕین (Purchases / Supplier Debts) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => { setTab('purchase'); handleCollapseSearch(true); }}
            style={[
              styles.segmentBtn,
              tab === 'purchase' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="arrow-up-circle-outline"
              size={isTablet ? 18 : 16}
              color={tab === 'purchase' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: tab === 'purchase' ? '#FFFFFF' : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {t('debt.purchasesTab')}
            </Text>
            {periodFilteredPurchase.length > 0 && (
              <View style={[styles.tabBadge, tab === 'purchase' ? { backgroundColor: 'rgba(255,255,255,0.3)' } : { backgroundColor: colors.gray200 }]}>
                <Text style={[styles.tabBadgeText, { color: tab === 'purchase' ? '#fff' : colors.gray700 }, NUMBER_LTR]}>
                  {periodFilteredPurchase.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Period Filter Horizontal Bar (with expandable search icon on right of هەمووی) ── */}
      <View
        style={[
          styles.filterWrapper,
          {
            backgroundColor: colors.white,
            borderBottomWidth: tab === 'report' ? 1 : 0,
            borderBottomColor: colors.gray200,
          },
        ]}
      >
        {isSearchExpanded ? (
          <View style={[styles.expandedSearchContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.expandedSearchBox,
                {
                  backgroundColor: isDark ? colors.gray100 : colors.gray50,
                  borderColor: colors.primary,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="search" size={17} color={colors.primary} />
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.expandedSearchInput,
                  {
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                  },
                  isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: query }), {}),
                ]}
                placeholder={tab === 'purchase' ? t('debt.searchPurchases') : t('debt.searchSales')}
                placeholderTextColor={colors.gray400}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoFocus
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={colors.gray400} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => handleCollapseSearch(true)}
              style={[styles.closeSearchBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.gray600} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.filterRowContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* Search Icon Button - positioned on the right of هەمووی in Kurdish RTL */}
            <TouchableOpacity
              onPress={handleExpandSearch}
              style={[
                styles.searchIconBtn,
                {
                  backgroundColor: query ? colors.primary : (isDark ? colors.gray100 : colors.gray100),
                  borderColor: query ? colors.primary : colors.gray200,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name="search"
                size={16}
                color={query ? '#0F172A' : (isDark ? colors.gray600 : colors.gray700)}
              />
            </TouchableOpacity>

            {/* Period Filter ScrollView */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[{ flex: 1 }, isRTL ? { transform: [{ scaleX: -1 }] } : undefined]}
              contentContainerStyle={styles.filterRow}
            >
              {periodKeys.map((key) => {
                const active = periodKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.filterPill,
                      isRTL && { transform: [{ scaleX: -1 }] },
                      {
                        backgroundColor: active ? colors.primary : colors.gray100,
                        borderColor: active ? colors.primary : colors.gray200,
                      },
                    ]}
                    onPress={() => {
                      if (key === 'custom') {
                        setFromVal(customRange?.from || '');
                        setToVal(customRange?.to || '');
                        setCustomOpen(true);
                      } else {
                        setPeriodKey(key);
                        setCustomRange(null);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: active ? '#FFFFFF' : colors.gray600 },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                      ]}
                    >
                      {periodLabels[key]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {periodKey === 'custom' && customRange && !isSearchExpanded && (
          <Text style={[styles.rangeLabel, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>
            <DateText value={customRange.from} size="small" style={styles.rangeLabel} /> {' → '}
            <DateText value={customRange.to} size="small" style={styles.rangeLabel} />
          </Text>
        )}
      </View>

      {/* ── Tab Content ── */}
      {tab === 'report' ? (
        /* ═══════════════════════════════════════════════════════════════
           TAB 1: ڕاپۆرت (REPORT DASHBOARD VIEW)
           ═══════════════════════════════════════════════════════════════ */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.reportScrollContent, isTablet && contentContainerStyle]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onScrollBeginDrag={() => {
            Keyboard.dismiss();
            if (isSearchExpanded) {
              handleCollapseSearch(false);
            }
          }}
          onTouchStart={() => {
            if (isSearchExpanded) {
              handleCollapseSearch(false);
            }
          }}
        >
          {/* 4 Dashboard Metric Squares */}
          <View style={[styles.metricGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {/* 1. Customer Receivables / دەبێت کڕیار پێمان بدات */}
            <DashboardMetricSquare
              title={t('debt.totalReceivable')}
              value={reportSalesTotal}
              isCurrency
              icon="arrow-down-circle"
              color="#10B981"
              subtitle={isKuLanguage ? 'قەرزی کڕیاران' : 'Receivables'}
              delay={30}
            />

            {/* 2. Supplier Payables / دەبێت بیدەین بە دابینکەر */}
            <DashboardMetricSquare
              title={t('debt.totalOwed')}
              value={reportPurchaseTotal}
              isCurrency
              icon="arrow-up-circle"
              color={colors.error}
              subtitle={isKuLanguage ? 'قەرزی دابینکەران' : 'Payables'}
              delay={60}
            />

            {/* 3. Overdue Debts / بڕی دواکەوتوو */}
            <DashboardMetricSquare
              title={t('debt.overdueDebts')}
              value={reportOverdueCount}
              icon="alert-circle"
              color={reportOverdueCount > 0 ? colors.error : colors.gray500}
              subtitle={reportOverdueCount > 0 ? (isKuLanguage ? 'دواکەوتوو' : 'Overdue') : (isKuLanguage ? 'ئاسایی' : 'Normal')}
              isAlert={reportOverdueCount > 0}
              delay={90}
            />

            {/* 4. Total Debts / کۆی بڕی قەرزەکان */}
            <DashboardMetricSquare
              title={isKuLanguage ? 'کۆی بڕی قەرزەکان' : 'Total Debts'}
              value={reportActiveDebtsCount}
              icon="layers"
              color="#6366F1"
              subtitle={isKuLanguage ? 'قەرزە چالاکەکان' : 'Active Debts'}
              delay={120}
            />
          </View>

          {/* Net Debt Balance Card */}
          <View style={[styles.netBalanceCard, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
            <View style={[styles.netBalanceTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.netBalanceIconBox, { backgroundColor: netBalanceColor + '18' }]}>
                <Ionicons
                  name={reportNetBalance >= 0 ? 'shield-checkmark-outline' : 'warning-outline'}
                  size={22}
                  color={netBalanceColor}
                />
              </View>
              <View style={{ flex: 1, marginHorizontal: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={[
                    styles.netBalanceTitle,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isKuLanguage ? 'باڵانسی پوختەی قەرزەکان' : 'Net Debt Balance'}
                </Text>
                <Text style={[styles.netBalanceSubtitle, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>
                  {netBalanceDesc}
                </Text>
              </View>
              <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                <AmountText
                  value={Math.abs(reportNetBalance)}
                  currency="IQD"
                  variant="large"
                  style={[styles.netBalanceAmount, { color: netBalanceColor }, NUMBER_LTR]}
                />
              </View>
            </View>
          </View>

          {/* Quick Customers Debt Preview Section */}
          <View style={[styles.previewSection, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
            <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="people-outline" size={17} color={colors.primary} />
                <Text
                  style={[
                    styles.previewTitle,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isKuLanguage ? 'قەرزی کڕیاران' : 'Customer Debts'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.gray400 }}>
                  ({periodFilteredSales.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setTab('sales'); setQuery(''); }}
                style={[styles.previewViewAll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={[styles.previewViewAllText, { color: colors.primary }]}>
                  {isKuLanguage ? 'بینینی هەمووی' : 'View All'}
                </Text>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {periodFilteredSales.length === 0 ? (
              <Text style={[styles.previewEmptyText, { color: colors.gray400 }]}>
                {t('debt.noSalesDebts')}
              </Text>
            ) : (
              periodFilteredSales.slice(0, 3).map((debt) => (
                <View
                  key={debt.id}
                  style={[styles.previewRow, { borderTopColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.previewName, { color: colors.black }]} numberOfLines={1}>
                      {debt.customerName}
                    </Text>
                    <Text style={[styles.previewSub, { color: colors.gray400 }]}>
                      #{debt.invoiceNumber} &bull; <DateText value={debt.createdAt} size="small" style={styles.previewSub} />
                    </Text>
                  </View>
                  <AmountText
                    value={debt.remainingAmount}
                    currency="IQD"
                    style={[{ fontSize: 14, fontWeight: '800', color: colors.error }, NUMBER_LTR]}
                  />
                </View>
              ))
            )}
          </View>

          {/* Quick Suppliers Debt Preview Section */}
          <View style={[styles.previewSection, { backgroundColor: colors.white, borderColor: colors.gray200, marginBottom: 28 }]}>
            <View style={[styles.previewHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="business-outline" size={17} color={colors.error} />
                <Text
                  style={[
                    styles.previewTitle,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isKuLanguage ? 'قەرزی دابینکەران' : 'Supplier Debts'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.gray400 }}>
                  ({periodFilteredPurchase.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setTab('purchase'); setQuery(''); }}
                style={[styles.previewViewAll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={[styles.previewViewAllText, { color: colors.primary }]}>
                  {isKuLanguage ? 'بینینی هەمووی' : 'View All'}
                </Text>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {periodFilteredPurchase.length === 0 ? (
              <Text style={[styles.previewEmptyText, { color: colors.gray400 }]}>
                {t('debt.noPurchaseDebts')}
              </Text>
            ) : (
              periodFilteredPurchase.slice(0, 3).map((debt) => (
                <View
                  key={debt.id}
                  style={[styles.previewRow, { borderTopColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.previewName, { color: colors.black }]} numberOfLines={1}>
                      {debt.supplierName}
                    </Text>
                    <Text style={[styles.previewSub, { color: colors.gray400 }]}>
                      #{debt.purchaseNumber || '—'} &bull; <DateText value={debt.createdAt} size="small" style={styles.previewSub} />
                    </Text>
                  </View>
                  <AmountText
                    value={debt.remainingAmount}
                    currency="IQD"
                    style={[{ fontSize: 14, fontWeight: '800', color: colors.error }, NUMBER_LTR]}
                  />
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : tab === 'sales' ? (
        /* ═══════════════════════════════════════════════════════════════
           TAB 2: فرۆشتن (CUSTOMER DEBTS LIST)
           ═══════════════════════════════════════════════════════════════ */
        <>
          {/* Quick summary strip */}
          <View style={[styles.summaryStrip, { backgroundColor: colors.white, borderBottomColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.summaryStripText,
                { color: colors.gray500 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {periodDisplayLabel}{query ? ` (${isKuLanguage ? 'گەڕان' : 'Search'})` : ''}: {visibleSales.length}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[styles.summaryStripText, { color: colors.gray500 }]}>
                {isKuLanguage ? 'کۆی ماوە:' : 'Total Remaining:'}
              </Text>
              <AmountText
                value={visibleSales.reduce((s, d) => s + (d.remainingAmount || 0), 0)}
                currency="IQD"
                style={[{ fontSize: 13, fontWeight: '800', color: colors.error }, NUMBER_LTR]}
              />
            </View>
          </View>

          {/* Customer debts list */}
          <FlatList
            key={`debt-sales-${cardColumns}`}
            data={visibleSales}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSalesItem}
            numColumns={cardColumns}
            columnWrapperStyle={isTablet ? { gap: 12 } : undefined}
            contentContainerStyle={[styles.listContent, isTablet && contentContainerStyle, { flexGrow: 1 }]}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle-outline" size={56} color={colors.gray300} />
                <Text style={styles.emptyTitle}>
                  {isLoading ? t('common.loading') : (query || periodKey !== 'all') ? t('inventory.noResults') : t('debt.noSalesDebts')}
                </Text>
                {!isLoading && !query && periodKey === 'all' && (
                  <Text style={styles.emptySub}>{t('debt.noSalesDebtsDetail')}</Text>
                )}
              </View>
            }
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              if (isSearchExpanded) {
                handleCollapseSearch(false);
              }
            }}
            onTouchStart={() => {
              if (isSearchExpanded) {
                handleCollapseSearch(false);
              }
            }}
          />
        </>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           TAB 3: کڕین (SUPPLIER DEBTS LIST)
           ═══════════════════════════════════════════════════════════════ */
        <>
          {/* Quick summary strip */}
          <View style={[styles.summaryStrip, { backgroundColor: colors.white, borderBottomColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.summaryStripText,
                { color: colors.gray500 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {periodDisplayLabel}{query ? ` (${isKuLanguage ? 'گەڕان' : 'Search'})` : ''}: {visiblePurchase.length}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[styles.summaryStripText, { color: colors.gray500 }]}>
                {isKuLanguage ? 'کۆی ماوە:' : 'Total Remaining:'}
              </Text>
              <AmountText
                value={visiblePurchase.reduce((s, d) => s + (d.remainingAmount || 0), 0)}
                currency="IQD"
                style={[{ fontSize: 13, fontWeight: '800', color: colors.error }, NUMBER_LTR]}
              />
            </View>
          </View>

          {/* Supplier debts list */}
          <FlatList
            key={`debt-purchase-${cardColumns}`}
            data={visiblePurchase}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderPurchaseItem}
            numColumns={cardColumns}
            columnWrapperStyle={isTablet ? { gap: 12 } : undefined}
            contentContainerStyle={[styles.listContent, isTablet && contentContainerStyle, { flexGrow: 1 }]}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="checkmark-circle-outline" size={56} color={colors.gray300} />
                <Text style={styles.emptyTitle}>
                  {isLoading ? t('common.loading') : (query || periodKey !== 'all') ? t('inventory.noResults') : t('debt.noPurchaseDebts')}
                </Text>
                {!isLoading && !query && periodKey === 'all' && (
                  <Text style={styles.emptySub}>{t('debt.noPurchaseDebtsDetail')}</Text>
                )}
              </View>
            }
            onScrollBeginDrag={() => {
              Keyboard.dismiss();
              if (isSearchExpanded) {
                handleCollapseSearch(false);
              }
            }}
            onTouchStart={() => {
              if (isSearchExpanded) {
                handleCollapseSearch(false);
              }
            }}
          />
        </>
      )}

      {/* ── Quick Pay Modal ── */}
      <QuickPayModal
        visible={!!payTarget}
        name={payTarget?.name ?? ''}
        remaining={payTarget?.remaining ?? 0}
        onCancel={() => setPayTarget(null)}
        onConfirm={handlePay}
      />

      {/* ── PDF Export Options Modal ── */}
      <DebtPdfExportModal
        visible={pdfExportModalOpen}
        onClose={() => setPdfExportModalOpen(false)}
        onGenerate={handleExportPdf}
        isGenerating={isExportingPdf}
        salesCount={periodFilteredSales.length}
        purchasesCount={periodFilteredPurchase.length}
        periodLabel={periodDisplayLabel}
      />

      {/* ── Custom Date Range Modal ── */}
      <Modal visible={customOpen} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.customModal, { backgroundColor: colors.white }]}>
            <Text style={[styles.modalTitle, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('periodFilter.customRange')}
            </Text>
            <Text style={[styles.dateLabel, { color: colors.gray600, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('reports.fromDate')} (YYYY-MM-DD)
            </Text>
            <TextInput
              style={[styles.customDateInput, { borderColor: colors.gray200, color: colors.black }]}
              placeholder="2026-01-01"
              placeholderTextColor={colors.gray400}
              value={fromVal}
              onChangeText={setFromVal}
            />
            <Text style={[styles.dateLabel, { color: colors.gray600, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('reports.toDate')} (YYYY-MM-DD)
            </Text>
            <TextInput
              style={[styles.customDateInput, { borderColor: colors.gray200, color: colors.black }]}
              placeholder="2026-12-31"
              placeholderTextColor={colors.gray400}
              value={toVal}
              onChangeText={setToVal}
            />
            <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.gray200 }]}
                onPress={() => setCustomOpen(false)}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (!fromVal || !toVal) {
                    Alert.alert(t('common.required'), t('purchases.validationDate'));
                    return;
                  }
                  if (fromVal > toVal) {
                    Alert.alert(t('common.error'), t('reports.invalidDateRange'));
                    return;
                  }
                  setPeriodKey('custom');
                  setCustomRange({ from: fromVal, to: toVal });
                  setCustomOpen(false);
                }}
              >
                <Text style={[styles.modalConfirmText, { color: '#FFFFFF' }]}>{t('reports.apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────

function getStyles(colors: AppColors, isTablet: boolean = false) {
  return StyleSheet.create({
    container: { flex: 1 },

    // ── Segmented Control Switcher (outside AppHeader) ──
    segmentWrapper: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    segmentTrack: {
      borderRadius: 12,
      padding: 3,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      paddingHorizontal: 6,
      borderRadius: 9,
      gap: 6,
    },
    segmentBtnActive: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    segmentBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },
    tabBadge: {
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
    },
    tabBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },

    // ── Period Filter Pills ──
    filterWrapper: {
      borderBottomWidth: 0,
    },
    filterRowContainer: {
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    searchIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },
    expandedSearchContainer: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignItems: 'center',
      gap: 8,
      width: '100%',
    },
    expandedSearchBox: {
      flex: 1,
      height: 38,
      borderRadius: 19,
      borderWidth: 1.2,
      paddingHorizontal: 12,
      alignItems: 'center',
      gap: 8,
    },
    expandedSearchInput: {
      flex: 1,
      fontSize: 13.5,
      paddingVertical: 0,
    },
    closeSearchBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterRow: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 18,
      borderWidth: 1,
    },
    filterPillText: {
      fontSize: 12.5,
      fontWeight: '600',
    },
    rangeLabel: {
      fontSize: 11,
      fontWeight: '500',
      paddingHorizontal: 16,
      paddingBottom: 6,
    },

    // ── Report Dashboard View ──
    reportScrollContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 24,
    },
    metricGrid: {
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    netBalanceCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 2,
    },
    netBalanceTop: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    netBalanceIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    netBalanceTitle: {
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 2,
    },
    netBalanceSubtitle: {
      fontSize: 11,
      lineHeight: 15,
    },
    netBalanceAmount: {
      fontWeight: '800',
    },

    previewSection: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 2,
    },
    previewHeader: {
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    previewTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    previewViewAll: {
      alignItems: 'center',
      gap: 3,
    },
    previewViewAllText: {
      fontSize: 12,
      fontWeight: '700',
    },
    previewEmptyText: {
      fontSize: 12.5,
      paddingVertical: 10,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    previewRow: {
      paddingVertical: 9,
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
    },
    previewName: {
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    previewSub: {
      fontSize: 11,
    },

    // ── Search & Summary Strip ──
    searchRow: {
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 10,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      height: 42,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 13.5,
      paddingVertical: 0,
    },
    summaryStrip: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderBottomWidth: 1,
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryStripText: {
      fontSize: 11.5,
      fontWeight: '600',
    },

    listContent: {
      padding: 16,
      paddingTop: 8,
      paddingBottom: 32,
    },

    // ── Debt Cards ──
    card: {
      flex: isTablet ? 1 : undefined,
      backgroundColor: colors.white,
      borderRadius: isTablet ? 18 : Theme.radius.card,
      padding: isTablet ? 18 : 14,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
    },
    cardPurchase: { borderStartWidth: 3, borderStartColor: colors.error },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    cardAvatar: {
      width: isTablet ? 52 : 40,
      height: isTablet ? 52 : 40,
      borderRadius: isTablet ? 26 : 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginEnd: 10,
    },
    cardAvatarText: { fontSize: isTablet ? 18 : 15, fontWeight: '700' },
    cardInfo: { flex: 1 },
    cardName: { fontSize: isTablet ? 18 : 15, fontWeight: '700', color: colors.black, marginBottom: 6 },
    cardSub: { fontSize: isTablet ? 14 : 12, color: colors.gray400 },
    cardSub2: { fontSize: isTablet ? 13 : 11, color: colors.gray400, marginTop: 2 },
    cardRight: { alignItems: 'flex-end', gap: 4 },

    cardAmounts: { flexDirection: 'column', gap: 3, marginBottom: 8 },
    amountRemaining: { fontSize: isTablet ? 20 : 17, fontWeight: '800' },
    amountSub: { fontSize: isTablet ? 14 : 12, color: colors.gray400 },

    progressTrack: {
      height: 6,
      backgroundColor: colors.gray100,
      borderRadius: 3,
      marginBottom: 12,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },

    cardActionsStack: { gap: 8 },
    quickPayBtnFull: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      paddingVertical: isTablet ? 14 : 10,
      gap: 6,
    },
    quickPayText: { fontSize: isTablet ? 15 : 13, fontWeight: '600' },
    detailBtnRow: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    detailBtnText: { fontSize: isTablet ? 15 : 13, fontWeight: '600' },

    statusPill: { borderRadius: 6, paddingHorizontal: isTablet ? 10 : 7, paddingVertical: isTablet ? 4 : 2 },
    statusPillText: { fontSize: isTablet ? 13 : 11, fontWeight: '700' },

    overdueBadge: { borderRadius: 6, paddingHorizontal: isTablet ? 8 : 6, paddingVertical: isTablet ? 3 : 2, marginTop: 3 },
    overdueBadgeText: { fontSize: isTablet ? 12 : 10, fontWeight: '700' },

    empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.gray500, marginTop: 8 },
    emptySub: { fontSize: 13, color: colors.gray400, textAlign: 'center' },

    // ── Quick Pay Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modal: {
      backgroundColor: colors.white,
      borderRadius: 20,
      padding: 24,
      width: '85%',
      maxWidth: isTablet ? 540 : undefined,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    modalTitle: { fontSize: isTablet ? 21 : 18, fontWeight: '800', color: colors.black, marginBottom: 4 },
    modalSub: { fontSize: isTablet ? 16 : 14, color: colors.gray500, marginBottom: 2 },
    modalRemaining: { fontSize: isTablet ? 16 : 14, fontWeight: '600', marginBottom: 16 },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.gray200,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: isTablet ? 14 : 10,
      fontSize: isTablet ? 17 : 15,
      color: colors.black,
      marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalCancel: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.gray200,
      borderRadius: 10,
      paddingVertical: isTablet ? 15 : 12,
      alignItems: 'center',
    },
    modalCancelText: { fontSize: isTablet ? 16 : 14, fontWeight: '600', color: colors.gray500 },
    modalConfirm: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: isTablet ? 15 : 12,
      alignItems: 'center',
    },
    modalConfirmText: { fontSize: isTablet ? 16 : 14, fontWeight: '600' },

    // ── Custom Date Range Modal ──
    customModal: {
      borderRadius: 20,
      padding: 24,
      width: '90%',
      maxWidth: 420,
    },
    dateLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    customDateInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      marginBottom: 14,
    },
  });
}
