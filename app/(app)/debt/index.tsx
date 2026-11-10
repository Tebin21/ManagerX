import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
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
  useWindowDimensions,
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
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { Theme, MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { getOverdueLevel, getDebtDisplayStatus } from '@/types/debt';
import type { SalesDebtDetail, PurchaseDebt, DebtPaymentReceiptData } from '@/types/debt';
import { fmtIQD, toEnglishDigits, sanitizeNumericInput } from '@/utils/formatters';
import { roundToNearest250, roundUSD } from '@/utils/rounding';
import { useRTL, useDirectionalChevron, RTL_SPACING } from '@/lib/rtl';
import { isDateWithinRange, getPeriodBounds, formatDateShort, type PeriodKey } from '@/utils/dateRanges';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { shareDebtsAuditReport, shareSalesDebtReport } from '@/lib/generateInvoice';
import { getSalesDebtById, getDebtPayments, getSaleById } from '@/lib/sqlite';
import { DebtPdfExportModal } from '@/components/debt/DebtPdfExportModal';
import { DebtPaymentReceiptModal } from '@/components/debt/DebtPaymentReceiptModal';
import { CustomDateRangeModal } from '@/components/shared/CustomDateRangeModal';
import type { DebtReportSections } from '@/lib/debtReportTemplate';


function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// Forces a numeric Text/AmountText to render LTR + left-aligned regardless of app language.
const NUMBER_LTR = { textAlign: 'left' as const, writingDirection: 'ltr' as const };

function formatProductsBatchSummary(summary: string | null | undefined, isKu: boolean): string {
  if (!summary) return '';
  if (!isKu) return summary.replace(/[(（]\s*وەجبەی\s*#?(\d+)#?\s*[)）]/g, ' (Batch #$1)');
  return summary
    .replace(/[(（]\s*وەجبەی\s*#?(\d+)#?\s*[)）]/g, ' (وەجبەی $1\u200F)')
    .replace(/#(\d+)/g, '$1');
}

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
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet, isTabletLandscape), [colors, isTablet, isTabletLandscape]);
  const { flexDirection, alignEnd, isRTL } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const isUSD = baseCurrency === 'USD';
  const currentLang = useLanguageStore((s) => s.language) || 'ku';
  const isAr = currentLang === 'ar';
  const isKuLanguage = currentLang === 'ku';
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
      style={isTablet ? { flex: 1 } : undefined}
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

        {debt.productsSummary ? (
          <View
            style={[
              styles.cardBatchRow,
              {
                flexDirection,
                backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : '#FDFBF4',
                borderColor: isDark ? 'rgba(212, 175, 55, 0.25)' : '#F6E09E',
              },
            ]}
          >
            <View style={[styles.cardBatchIconBadge, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="layers-outline" size={12} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.cardBatchText,
                { color: isDark ? '#F5E6B3' : '#854D0E', textAlign: isRTL ? 'right' : 'left' },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {formatProductsBatchSummary(debt.productsSummary, isKuLanguage)}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardAmounts}>
          <View style={[styles.cardAmountsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.amountSub,
                { color: colors.gray600, textAlign: isRTL ? 'right' : 'left' },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKuLanguage
                ? 'ماوە کڕیار بیدات'
                : isAr
                ? 'متبقي في ذمة الزبون'
                : 'Owed by customer'}
            </Text>
            <AmountText
              value={debt.remainingAmount}
              currency="IQD"
              variant="large"
              style={[styles.amountRemaining, { color: colors.primary }, NUMBER_LTR]}
            />
          </View>
          {isUSD && (
            <View style={[styles.cardSecondaryAmountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.amountSubSecondaryLabel, { color: colors.gray400 }]}>
                {isKuLanguage ? 'بڕ بە دینار:' : isAr ? 'المبلغ بالدينار:' : 'In IQD:'}
              </Text>
              <LTRNumber style={[styles.amountSubSecondaryVal, { color: colors.gray500 }]}>
                {fmtIQD(debt.remainingAmount)} IQD
              </LTRNumber>
            </View>
          )}
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
  const { isTablet, isTabletLandscape } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet, isTabletLandscape), [colors, isTablet, isTabletLandscape]);
  const purchaseAvatarTint = useMemo(() => getStatusTint('error', colors, isDark), [colors, isDark]);
  const { flexDirection, alignEnd, isRTL } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const isUSD = baseCurrency === 'USD';
  const currentLang = useLanguageStore((s) => s.language) || 'ku';
  const isAr = currentLang === 'ar';
  const isKuLanguage = currentLang === 'ku';
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
      style={isTablet ? { flex: 1 } : undefined}
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

        {debt.productName ? (
          <View
            style={[
              styles.cardBatchRow,
              {
                flexDirection,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA',
              },
            ]}
          >
            <View style={[styles.cardBatchIconBadge, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="layers" size={12} color={colors.error} />
            </View>
            <Text
              style={[
                styles.cardBatchText,
                { color: isDark ? '#FCA5A5' : '#991B1B', textAlign: isRTL ? 'right' : 'left' },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {debt.productName}
              {` • ${isAr ? `الوجبة ${debt.batchNumber || 1}` : isKuLanguage ? `وەجبەی ${debt.batchNumber || 1}` : `Batch #${debt.batchNumber || 1}`}`}
              {debt.batchQuantity ? ` (${debt.batchQuantity} ${isAr ? 'قطعة' : isKuLanguage ? 'دانە' : 'pcs'})` : ''}
              {debt.totalBatches && debt.totalBatches > 1
                ? ` · ${isAr ? `من إجمالي ${debt.totalBatches} وجبات` : isKuLanguage ? `لە کۆی ${debt.totalBatches} وەجبە` : `of ${debt.totalBatches}`}`
                : ''}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardAmounts}>
          <View style={[styles.cardAmountsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.amountSub,
                { color: colors.gray600, textAlign: isRTL ? 'right' : 'left' },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKuLanguage
                ? 'ماوە بیدەین بە دابینکەر'
                : isAr
                ? 'متبقي للمورد'
                : 'Owed to supplier'}
            </Text>
            <AmountText
              value={debt.remainingAmount}
              currency="IQD"
              variant="large"
              style={[styles.amountRemaining, { color: colors.error }, NUMBER_LTR]}
            />
          </View>
          {isUSD && (
            <View style={[styles.cardSecondaryAmountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.amountSubSecondaryLabel, { color: colors.gray400 }]}>
                {isKuLanguage ? 'بڕ بە دینار:' : isAr ? 'المبلغ بالدينار:' : 'In IQD:'}
              </Text>
              <LTRNumber style={[styles.amountSubSecondaryVal, { color: colors.gray500 }]}>
                {fmtIQD(debt.remainingAmount)} IQD
              </LTRNumber>
            </View>
          )}
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
  onConfirm: (amount: number, paymentMethod: 'cash' | 'fib') => void;
}) {
  const { colors, isDark } = useAppTheme();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet), [colors, isTablet]);
  const { flexDirection, textAlign, isRTL } = useRTL();
  const currentLang = useLanguageStore((s) => s.language) || 'ku';
  const isAr = currentLang === 'ar';
  const isKuLanguage = currentLang === 'ku';
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const exchangeRate = useSettingsStore((s) => s.exchangeRate) || 1310;
  const isUSD = baseCurrency === 'USD';
  const remainingInCurrentCurrency = isUSD ? remaining / exchangeRate : remaining;

  const [value, setValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'fib'>('cash');

  useEffect(() => {
    if (visible) {
      setValue('');
      setPaymentMethod('cash');
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onCancel} />
        <MotiView
          from={{ opacity: 0, scale: 0.94, translateY: 10 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 220 }}
          style={[
            styles.modal,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.08)',
            },
          ]}
        >
          {/* ── Modal Header Row ── */}
          <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.modalHeaderTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.modalHeaderBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="wallet-outline" size={17} color={colors.primary} />
              </View>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.black },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {i18n.t('debt.recordPayment')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onCancel}
              hitSlop={10}
              style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
            >
              <Ionicons name="close" size={17} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          {/* ── Customer / Remaining Info Card ── */}
          <View
            style={[
              styles.modalInfoCard,
              {
                backgroundColor: isDark ? colors.gray200 : colors.gray50,
                borderColor: isDark ? colors.gray300 : colors.gray200,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.modalSub,
                  { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {name}
              </Text>
              <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 4 }]}>
                <Text style={{ fontSize: 13, color: colors.gray500 }}>
                  {i18n.t('debt.remainingLabel')}:
                </Text>
                <AmountText
                  value={remaining}
                  currency="IQD"
                  variant="small"
                  style={[{ color: colors.primary, fontWeight: '700' }, NUMBER_LTR]}
                />
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const fullVal = isUSD ? roundUSD(remainingInCurrentCurrency) : remainingInCurrentCurrency;
                setValue(String(fullVal));
              }}
              style={[
                styles.modalFullAmountBtn,
                { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}35` },
              ]}
            >
              <Ionicons name="flash-outline" size={13} color={colors.primary} />
              <Text
                style={[
                  styles.modalFullAmountText,
                  { color: colors.primary },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isAr ? 'كامل المبلغ' : isKuLanguage ? 'تەواوی بڕ' : 'Full'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Amount Input ── */}
          <View style={{ marginBottom: 14 }}>
            <Text
              style={[
                styles.modalFieldLabel,
                { color: colors.gray600, textAlign },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {i18n.t('debt.paidAmount', 'بڕی پارەدراو')}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: isDark ? colors.gray200 : colors.white,
                  borderColor: colors.gray200,
                  color: colors.black,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: 'ltr',
                },
                applyKurdishFont(
                  resolveInputIsKurdish({
                    isKuLanguage,
                    value,
                    placeholder: i18n.t('debt.amountPlaceholder'),
                    keyboardType: 'decimal-pad',
                  }),
                  {}
                ),
              ]}
              placeholder={i18n.t('debt.amountPlaceholder')}
              placeholderTextColor={colors.gray400}
              keyboardType="decimal-pad"
              value={value}
              onChangeText={(v) => setValue(sanitizeNumericInput(toEnglishDigits(v), 'decimal-pad'))}
              onEndEditing={() => {
                const cleanStr = toEnglishDigits(value).replace(/,/g, '');
                const parsed = parseFloat(cleanStr) || 0;
                if (parsed <= 0) {
                  setValue('');
                  return;
                }
                const r = isUSD ? roundUSD(parsed) : roundToNearest250(parsed);
                setValue(r > 0 ? String(r) : '');
              }}
              autoFocus
            />
          </View>

          {/* ── Payment Method Selector ── */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={[
                styles.modalFieldLabel,
                { color: colors.gray600, textAlign },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {i18n.t('debt.paymentMethod', 'شێوازی پارەدان')}
            </Text>
            <View style={[{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 }]}>
              <TouchableOpacity
                onPress={() => setPaymentMethod('cash')}
                activeOpacity={0.8}
                style={[
                  styles.modalMethodBtn,
                  paymentMethod === 'cash'
                    ? { borderColor: colors.primary, backgroundColor: `${colors.primary}15` }
                    : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray200 : colors.gray50 },
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={paymentMethod === 'cash' ? colors.primary : colors.gray400}
                />
                <Text
                  style={[
                    styles.modalMethodBtnText,
                    { color: paymentMethod === 'cash' ? colors.primary : colors.gray600 },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {i18n.t('debt.cash', 'کاش')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod('fib')}
                activeOpacity={0.8}
                style={[
                  styles.modalMethodBtn,
                  paymentMethod === 'fib'
                    ? { borderColor: '#3B82F6', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF' }
                    : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray200 : colors.gray50 },
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={15}
                  color={paymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray400}
                />
                <Text
                  style={[
                    styles.modalMethodBtnText,
                    { color: paymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray600 },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {i18n.t('debt.fib', 'FIB')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Actions Row ── */}
          <View style={[styles.modalActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: colors.gray200 }]}
              onPress={() => {
                setValue('');
                setPaymentMethod('cash');
                onCancel();
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.modalCancelText,
                  { color: colors.gray600 },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {i18n.t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalConfirm, { backgroundColor: colors.primary }]}
              onPress={() => {
                const cleanStr = toEnglishDigits(value).replace(/,/g, '');
                const entered = parseFloat(cleanStr) || 0;
                if (!entered || entered <= 0) {
                  Alert.alert(i18n.t('common.error'), i18n.t('debt.invalidAmount'));
                  return;
                }
                const isFullPayment = entered >= remainingInCurrentCurrency;
                const amtInIQD = isFullPayment
                  ? remaining
                  : (isUSD ? Math.round(entered * exchangeRate) : roundToNearest250(entered));

                setValue('');
                setPaymentMethod('cash');
                onConfirm(amtInIQD, paymentMethod);
              }}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modalConfirmText,
                  { color: colors.white },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {i18n.t('common.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

type Tab = 'report' | 'sales' | 'purchase';

export default function DebtScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape, contentContainerStyle, cardColumns } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet, isTabletLandscape), [colors, isTablet, isTabletLandscape]);
  const toneStyles = useMemo(() => getToneStyles(colors, isDark), [colors, isDark]);
  const { flexDirection, textAlign, writingDirection, isRTL } = useRTL();
  const currentLang = useLanguageStore((s) => s.language) || 'ku';
  const isAr = currentLang === 'ar';
  const isKuLanguage = currentLang === 'ku';
  const {
    summary, isLoading, salesDebts, purchaseDebts,
    loadAll, paySalesDebt, payPurchaseDebt,
  } = useDebtStore();

  // Tab state — ALWAYS defaults to 'report' (ڕاپۆرت) on open!
  const [tab, setTab] = useState<Tab>('report');
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExportModalOpen, setPdfExportModalOpen] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<DebtPaymentReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const filterScrollRef = useRef<ScrollView>(null);

  // Search width only grows gradually when text approaches the clear/close button
  const queryCharLength = query.length;
  const baseSearchWidth = isTablet ? (isTabletLandscape ? 300 : 260) : 200;
  const maxSearchWidth = isTablet ? (isTabletLandscape ? 440 : 380) : Math.min(width - 48, 275);
  const expandThreshold = isTablet ? (isTabletLandscape ? 22 : 18) : 11;
  const extraChars = Math.max(0, queryCharLength - expandThreshold);
  const dynamicSearchWidth = Math.min(maxSearchWidth, baseSearchWidth + extraChars * 7.5);

  const handleExpandSearch = useCallback(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchExpanded(true);
    filterScrollRef.current?.scrollTo({ x: 0, animated: true });
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

  // Period filter state — defaults to 'today' (ئەمڕۆ)
  const [periodKey, setPeriodKey] = useState<PeriodKey>('today');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [fromVal, setFromVal] = useState('');
  const [toVal, setToVal] = useState('');

  const [payTarget, setPayTarget] = useState<{
    id: number; name: string; remaining: number; type: 'sales' | 'purchase';
  } | null>(null);

  // Clear quick pay modal on tab or period switch
  useEffect(() => {
    setPayTarget(null);
  }, [tab, periodKey]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      setPayTarget(null);
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
    if (periodKey === 'all') return isAr ? 'الكل' : isKuLanguage ? 'هەمووی' : 'All Time';
    if (periodKey === 'today') return isAr ? 'اليوم' : isKuLanguage ? 'ئەمڕۆ' : 'Today';
    if (periodKey === 'week') return isAr ? 'هذا الأسبوع' : isKuLanguage ? 'ئەم هەفتەیە' : 'This Week';
    if (periodKey === 'month') return isAr ? 'هذا الشهر' : isKuLanguage ? 'ئەم مانگە' : 'This Month';
    if (periodKey === 'year') return isAr ? 'هذه السنة' : isKuLanguage ? 'ئەمساڵ' : 'This Year';
    if (customRange) return `${customRange.from} → ${customRange.to}`;
    return isAr ? 'مخصص' : isKuLanguage ? 'دیاریکراو' : 'Custom';
  }, [periodKey, customRange, isKuLanguage]);

  // Payment handler
  const handlePay = useCallback(async (amount: number, paymentMethod: 'cash' | 'fib' = 'cash') => {
    if (!payTarget) return;
    try {
      let receipt: DebtPaymentReceiptData;
      if (payTarget.type === 'sales') {
        receipt = await paySalesDebt(payTarget.id, amount, undefined, paymentMethod);
      } else {
        receipt = await payPurchaseDebt(payTarget.id, amount, undefined, paymentMethod);
      }
      setPayTarget(null);
      setCreatedReceipt(receipt);
      setShowReceiptModal(true);
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

type SalesDebtOrFiller = SalesDebtDetail | { id: string | number; isFiller: true };
type PurchaseDebtOrFiller = PurchaseDebt | { id: string | number; isFiller: true };

  const gridFormattedSalesDebts: SalesDebtOrFiller[] = useMemo(() => {
    if (cardColumns <= 1 || visibleSales.length === 0) return visibleSales;
    const remainder = visibleSales.length % cardColumns;
    if (remainder === 0) return visibleSales;
    const needed = cardColumns - remainder;
    const fillers: SalesDebtOrFiller[] = Array.from({ length: needed }, (_, i) => ({
      id: `__debt_sale_filler_${i}`,
      isFiller: true as const,
    }));
    return [...visibleSales, ...fillers];
  }, [visibleSales, cardColumns]);

  const gridFormattedPurchaseDebts: PurchaseDebtOrFiller[] = useMemo(() => {
    if (cardColumns <= 1 || visiblePurchase.length === 0) return visiblePurchase;
    const remainder = visiblePurchase.length % cardColumns;
    if (remainder === 0) return visiblePurchase;
    const needed = cardColumns - remainder;
    const fillers: PurchaseDebtOrFiller[] = Array.from({ length: needed }, (_, i) => ({
      id: `__debt_pur_filler_${i}`,
      isFiller: true as const,
    }));
    return [...visiblePurchase, ...fillers];
  }, [visiblePurchase, cardColumns]);

  const renderSalesItem = useCallback(({ item }: { item: SalesDebtOrFiller }) => {
    if ('isFiller' in item && item.isFiller) {
      return <View style={isTablet ? { flex: 1, backgroundColor: 'transparent' } : undefined} />;
    }
    return <SalesDebtCard debt={item as SalesDebtDetail} onPay={handlePaySalesPress} />;
  }, [handlePaySalesPress, isTablet]);

  const renderPurchaseItem = useCallback(({ item }: { item: PurchaseDebtOrFiller }) => {
    if ('isFiller' in item && item.isFiller) {
      return <View style={isTablet ? { flex: 1, backgroundColor: 'transparent' } : undefined} />;
    }
    return <PurchaseDebtCard debt={item as PurchaseDebt} onPay={handlePayPurchasePress} />;
  }, [handlePayPurchasePress, isTablet]);

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
      Alert.alert(isAr ? 'خطأ' : isKuLanguage ? 'هەڵە' : 'Error', String(err));
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
  const periodKeys: PeriodKey[] = ['today', 'week', 'month', 'year', 'all', 'custom'];
  const periodLabels: Record<PeriodKey, string> = {
    today:  isAr ? 'اليوم' : isKuLanguage ? 'ئەمڕۆ' : t('periodFilter.today'),
    week:   isAr ? 'هذا الأسبوع' : isKuLanguage ? 'ئەم هەفتەیە' : t('periodFilter.thisWeek'),
    month:  isAr ? 'هذا الشهر' : isKuLanguage ? 'ئەم مانگە' : t('periodFilter.thisMonth'),
    year:   isAr ? 'هذه السنة' : isKuLanguage ? 'ئەمساڵ' : t('periodFilter.thisYear'),
    all:    isAr ? 'الكل' : isKuLanguage ? 'هەمووی' : 'All',
    custom: isAr ? 'مخصص' : isKuLanguage ? 'دیاریکراو' : t('periodFilter.customRange'),
  };

  const netBalanceColor = reportNetBalance >= 0 ? '#10B981' : colors.error;
  const netBalanceDesc = reportNetBalance >= 0
    ? (isAr ? 'الرصيد لصالحنا (الزبائن مدينون أكثر)' : isKuLanguage ? 'باڵانس لە قازانجی ئێمەیە (کڕیاران زیاتر قەرزدارن)' : 'In Our Favor (Customers owe us more)')
    : (isAr ? 'الرصيد لصالح الموردين (علينا التزامات أكثر)' : isKuLanguage ? 'باڵانس لە بەرژەوەندی دابینکەرانە (دەبێت زیاتر بدەین)' : 'In Suppliers Favor (We owe suppliers more)');

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {/* ── App Header with PDF Export ── */}
      <AppHeader
        title={t('debt.title')}
        showBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(app)/dashboard' as never);
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
            onPress={() => { setTab('report'); setPayTarget(null); handleCollapseSearch(true); }}
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
            onPress={() => { setTab('sales'); setPayTarget(null); handleCollapseSearch(true); }}
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
            onPress={() => { setTab('purchase'); setPayTarget(null); handleCollapseSearch(true); }}
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
        <ScrollView
          ref={filterScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.periodScrollView,
            isRTL ? { transform: [{ scaleX: -1 }] } : undefined,
          ]}
          contentContainerStyle={[
            styles.filterRow,
            {
              paddingHorizontal: isTabletLandscape ? 24 : 16,
              gap: isTablet ? 10 : 8,
            },
          ]}
        >
          {/* Search Button / Inline Expanded Search Input */}
          {isSearchExpanded ? (
            <Pressable
              onPress={(e) => e.stopPropagation?.()}
              style={[
                styles.expandedSearchBox,
                isRTL && { transform: [{ scaleX: -1 }] },
                {
                  width: dynamicSearchWidth,
                  height: isTablet ? (isTabletLandscape ? 44 : 40) : 38,
                  borderRadius: isTablet ? 22 : 19,
                  backgroundColor: isDark ? colors.gray100 : colors.white,
                  borderColor: colors.primary,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons
                name="search"
                size={isTabletLandscape ? 19 : isTablet ? 17 : 16}
                color={colors.primary}
              />
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.expandedSearchInput,
                  {
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                    fontSize: isTablet ? (isTabletLandscape ? 15 : 14) : 13,
                  },
                  applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: query, placeholder: tab === 'purchase' ? t('debt.searchPurchases') : t('debt.searchSales') }), {}),
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
              <TouchableOpacity
                onPress={() => handleCollapseSearch(false)}
                style={[
                  styles.closeSearchBtn,
                  {
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isDark ? colors.gray200 : colors.gray100,
                  },
                ]}
                hitSlop={8}
              >
                <Ionicons
                  name="close"
                  size={isTablet ? 16 : 14}
                  color={isDark ? colors.gray600 : colors.gray500}
                />
              </TouchableOpacity>
            </Pressable>
          ) : (
            <TouchableOpacity
              onPress={handleExpandSearch}
              style={[
                styles.searchIconBtn,
                isRTL && { transform: [{ scaleX: -1 }] },
                {
                  width: isTablet ? (isTabletLandscape ? 44 : 40) : 38,
                  height: isTablet ? (isTabletLandscape ? 44 : 40) : 38,
                  borderRadius: isTablet ? 22 : 19,
                  backgroundColor: query ? colors.primary : (isDark ? colors.gray100 : colors.white),
                  borderColor: query ? colors.primary : colors.gray200,
                },
              ]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Search"
            >
              <Ionicons
                name="search"
                size={isTablet ? 19 : 16}
                color={query ? '#0F172A' : colors.primary}
              />
              {query.length > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: isDark ? '#F59E0B' : '#0F172A',
                  }}
                />
              )}
            </TouchableOpacity>
          )}

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
                activeOpacity={0.8}
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
              subtitle={isAr ? 'ديون الزبائن' : isKuLanguage ? 'قەرزی کڕیاران' : 'Receivables'}
              delay={30}
            />

            {/* 2. Supplier Payables / دەبێت بیدەین بە دابینکەر */}
            <DashboardMetricSquare
              title={t('debt.totalOwed')}
              value={reportPurchaseTotal}
              isCurrency
              icon="arrow-up-circle"
              color={colors.error}
              subtitle={isAr ? 'ديون الموردين' : isKuLanguage ? 'قەرزی دابینکەران' : 'Payables'}
              delay={60}
            />

            {/* 3. Overdue Debts / بڕی دواکەوتوو */}
            <DashboardMetricSquare
              title={t('debt.overdueDebts')}
              value={reportOverdueCount}
              icon="alert-circle"
              color={reportOverdueCount > 0 ? colors.error : colors.gray500}
              subtitle={reportOverdueCount > 0 ? (isAr ? 'متأخر' : isKuLanguage ? 'دواکەوتوو' : 'Overdue') : (isAr ? 'طبيعي' : isKuLanguage ? 'ئاسایی' : 'Normal')}
              isAlert={reportOverdueCount > 0}
              delay={90}
            />

            {/* 4. Total Debts / کۆی بڕی قەرزەکان */}
            <DashboardMetricSquare
              title={isAr ? 'إجمالي الديون' : isKuLanguage ? 'کۆی بڕی قەرزەکان' : 'Total Debts'}
              value={reportActiveDebtsCount}
              icon="layers"
              color="#6366F1"
              subtitle={isAr ? 'الديون النشطة' : isKuLanguage ? 'قەرزە چالاکەکان' : 'Active Debts'}
              delay={120}
            />
          </View>

          {/* Net Debt Balance Card */}
          <View
            style={[
              styles.netBalanceCard,
              {
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderColor: isDark ? colors.gray200 : colors.gray200,
              },
            ]}
          >
            {/* Header: Icon + Title + Status Badge */}
            <View style={[styles.netBalanceHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.netBalanceHeaderLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.netBalanceIconBox, { backgroundColor: netBalanceColor + '18' }]}>
                  <Ionicons
                    name={reportNetBalance >= 0 ? 'shield-checkmark-outline' : 'warning-outline'}
                    size={isTablet ? 22 : 18}
                    color={netBalanceColor}
                  />
                </View>
                <Text
                  style={[
                    styles.netBalanceTitle,
                    { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                  numberOfLines={1}
                >
                  {isAr ? 'صافي رصيد الديون' : isKuLanguage ? 'باڵانسی پوختەی قەرزەکان' : 'Net Debt Balance'}
                </Text>
              </View>

              {/* Status Pill Badge */}
              <View
                style={[
                  styles.netBalanceBadge,
                  {
                    backgroundColor: reportNetBalance >= 0
                      ? (isDark ? 'rgba(16, 185, 129, 0.18)' : '#DCFCE7')
                      : (isDark ? 'rgba(239, 68, 68, 0.18)' : '#FEE2E2'),
                    borderColor: reportNetBalance >= 0
                      ? (isDark ? 'rgba(16, 185, 129, 0.4)' : '#86EFAC')
                      : (isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5'),
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons
                  name={reportNetBalance >= 0 ? 'checkmark-circle' : 'alert-circle'}
                  size={11}
                  color={netBalanceColor}
                />
                <Text
                  style={[
                    styles.netBalanceBadgeText,
                    { color: netBalanceColor },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {reportNetBalance >= 0
                    ? (isAr ? 'إيجابي' : isKuLanguage ? 'ئەرێنی' : 'Positive')
                    : (isAr ? 'سلبي' : isKuLanguage ? 'نەرێنی' : 'Negative')}
                </Text>
              </View>
            </View>

            {/* Body: Responsive Amount & Explanatory Subtitle */}
            <View
              style={[
                styles.netBalanceBody,
                {
                  flexDirection: isTablet ? (isRTL ? 'row-reverse' : 'row') : 'column',
                  alignItems: isTablet ? 'center' : (isRTL ? 'flex-end' : 'flex-start'),
                  justifyContent: isTablet ? 'space-between' : 'flex-start',
                },
              ]}
            >
              <AmountText
                value={Math.abs(reportNetBalance)}
                currency="IQD"
                variant="hero"
                style={[
                  styles.netBalanceAmount,
                  {
                    color: netBalanceColor,
                    fontSize: isTablet ? 26 : 22,
                    lineHeight: isTablet ? 32 : 28,
                  },
                  NUMBER_LTR,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              />

              <Text
                style={[
                  styles.netBalanceSubtitle,
                  {
                    color: colors.gray500,
                    textAlign: isRTL ? 'right' : 'left',
                    marginTop: isTablet ? 0 : 5,
                  },
                ]}
                numberOfLines={isTablet ? 1 : 2}
              >
                {netBalanceDesc}
              </Text>
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
                  {isAr ? 'ديون الزبائن' : isKuLanguage ? 'قەرزی کڕیاران' : 'Customer Debts'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.gray400 }}>
                  ({periodFilteredSales.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setTab('sales'); setPayTarget(null); setQuery(''); }}
                style={[styles.previewViewAll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={[styles.previewViewAllText, { color: colors.primary }]}>
                  {isAr ? 'عرض الكل' : isKuLanguage ? 'بینینی هەمووی' : 'View All'}
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
                      {debt.invoiceNumber?.startsWith('F-') || debt.invoiceNumber?.startsWith('B-') ? debt.invoiceNumber : `#${debt.invoiceNumber}`} &bull; <DateText value={debt.createdAt} size="small" style={styles.previewSub} />
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
                  {isAr ? 'ديون الموردين' : isKuLanguage ? 'قەرزی دابینکەران' : 'Supplier Debts'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.gray400 }}>
                  ({periodFilteredPurchase.length})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { setTab('purchase'); setPayTarget(null); setQuery(''); }}
                style={[styles.previewViewAll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={[styles.previewViewAllText, { color: colors.primary }]}>
                  {isAr ? 'عرض الكل' : isKuLanguage ? 'بینینی هەمووی' : 'View All'}
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
                      {debt.purchaseNumber ? (debt.purchaseNumber.startsWith('F-') || debt.purchaseNumber.startsWith('B-') ? debt.purchaseNumber : `#${debt.purchaseNumber}`) : '—'} &bull; <DateText value={debt.createdAt} size="small" style={styles.previewSub} />
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
              {periodDisplayLabel}{query ? ` (${isAr ? 'بحث' : isKuLanguage ? 'گەڕان' : 'Search'})` : ''}: {visibleSales.length}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[styles.summaryStripText, { color: colors.gray500 }]}>
                {isAr ? 'المجموع المتبقي:' : isKuLanguage ? 'کۆی ماوە:' : 'Total Remaining:'}
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
            key={`debt-sales-${cardColumns}-${isRTL ? 'rtl' : 'ltr'}`}
            data={gridFormattedSalesDebts}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSalesItem}
            numColumns={cardColumns}
            columnWrapperStyle={
              cardColumns > 1
                ? {
                    gap: 12,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  }
                : undefined
            }
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
              {periodDisplayLabel}{query ? ` (${isAr ? 'بحث' : isKuLanguage ? 'گەڕان' : 'Search'})` : ''}: {visiblePurchase.length}
            </Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={[styles.summaryStripText, { color: colors.gray500 }]}>
                {isAr ? 'المجموع المتبقي:' : isKuLanguage ? 'کۆی ماوە:' : 'Total Remaining:'}
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
            key={`debt-purchase-${cardColumns}-${isRTL ? 'rtl' : 'ltr'}`}
            data={gridFormattedPurchaseDebts}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderPurchaseItem}
            numColumns={cardColumns}
            columnWrapperStyle={
              cardColumns > 1
                ? {
                    gap: 12,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  }
                : undefined
            }
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

      {/* ── Debt Payment Receipt 4-Size Modal ── */}
      <DebtPaymentReceiptModal
        visible={showReceiptModal}
        receipt={createdReceipt}
        onClose={() => {
          setShowReceiptModal(false);
          setCreatedReceipt(null);
        }}
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
      <CustomDateRangeModal
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        initialFrom={customRange?.from}
        initialTo={customRange?.to}
        onApply={(from, to) => {
          setPeriodKey('custom');
          setCustomRange({ from, to });
          setCustomOpen(false);
        }}
      />
    </View>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────

function getStyles(colors: AppColors, isTablet: boolean = false, isTabletLandscape: boolean = false) {
  return StyleSheet.create({
    container: { flex: 1 },

    // ── Segmented Control Switcher (outside AppHeader) ──
    segmentWrapper: {
      paddingHorizontal: isTabletLandscape ? 24 : 16,
      paddingVertical: isTabletLandscape ? 14 : 10,
      borderBottomWidth: 1,
    },
    segmentTrack: {
      borderRadius: isTabletLandscape ? 16 : 12,
      padding: isTabletLandscape ? 5 : 3,
      gap: isTabletLandscape ? 8 : 4,
    },
    segmentBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: isTabletLandscape ? 13 : isTablet ? 11 : 9,
      paddingHorizontal: isTabletLandscape ? 12 : 6,
      borderRadius: isTabletLandscape ? 12 : 9,
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
      fontSize: isTabletLandscape ? 15.5 : isTablet ? 14.5 : 13,
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
      paddingHorizontal: 0,
      width: '100%',
    },
    periodScrollView: {
      flex: 1,
    },
    searchIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expandedSearchContainer: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignItems: 'center',
      gap: 8,
      width: '100%',
    },
    expandedSearchBox: {
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
      paddingVertical: 8,
      gap: 8,
      alignItems: 'center',
    },
    filterPill: {
      paddingHorizontal: isTabletLandscape ? 22 : isTablet ? 18 : 14,
      paddingVertical: isTabletLandscape ? 11 : isTablet ? 9 : 6,
      borderRadius: isTablet ? 24 : 18,
      borderWidth: 1,
    },
    filterPillText: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12.5,
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
      padding: isTablet ? 16 : 14,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 5,
      elevation: 2,
    },
    netBalanceHeaderRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      width: '100%',
    },
    netBalanceHeaderLeft: {
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    netBalanceIconBox: {
      width: isTablet ? 38 : 34,
      height: isTablet ? 38 : 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    netBalanceTitle: {
      fontSize: isTablet ? 15 : 13.5,
      fontWeight: '800',
      flexShrink: 1,
    },
    netBalanceBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3.5,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      gap: 4,
    },
    netBalanceBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    netBalanceBody: {
      marginTop: 10,
      width: '100%',
    },
    netBalanceSubtitle: {
      fontSize: isTablet ? 12.5 : 11.5,
      lineHeight: isTablet ? 17 : 16,
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
      borderRadius: isTabletLandscape ? 20 : isTablet ? 18 : Theme.radius.card,
      padding: isTabletLandscape ? 22 : isTablet ? 18 : 14,
      marginBottom: isTabletLandscape ? 16 : 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 8,
      elevation: 3,
      overflow: 'hidden',
    },
    cardPurchase: { borderStartWidth: 3, borderStartColor: colors.error },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: isTabletLandscape ? 14 : 10,
      gap: 10,
    },
    cardAvatar: {
      width: isTabletLandscape ? 58 : isTablet ? 52 : 40,
      height: isTabletLandscape ? 58 : isTablet ? 52 : 40,
      borderRadius: isTabletLandscape ? 29 : isTablet ? 26 : 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardAvatarText: { fontSize: isTabletLandscape ? 20 : isTablet ? 18 : 15, fontWeight: '700' },
    cardInfo: { flex: 1, minWidth: 0 },
    cardName: { fontSize: isTabletLandscape ? 19.5 : isTablet ? 18 : 15, fontWeight: '700', color: colors.black, marginBottom: 4 },
    cardSub: { fontSize: isTabletLandscape ? 14.5 : isTablet ? 14 : 12, color: colors.gray400 },
    cardSub2: { fontSize: isTabletLandscape ? 13.5 : isTablet ? 13 : 11, color: colors.gray400, marginTop: 2 },
    cardRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },

    cardBatchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isTabletLandscape ? 12 : 10,
      paddingVertical: isTabletLandscape ? 7 : 6,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: isTabletLandscape ? 12 : 10,
      gap: 7,
      overflow: 'hidden',
    },
    cardBatchIconBadge: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    cardBatchText: {
      flex: 1,
      minWidth: 0,
      fontSize: isTabletLandscape ? 13.5 : 12,
      fontWeight: '600',
    },

    cardAmounts: {
      flexDirection: 'column',
      gap: 4,
      marginBottom: isTabletLandscape ? 12 : 10,
      width: '100%',
    },
    cardAmountsRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      width: '100%',
    },
    amountRemaining: {
      fontSize: isTabletLandscape ? 22 : isTablet ? 19 : 17.5,
      fontWeight: '800',
      flexShrink: 0,
    },
    amountSub: {
      fontSize: isTabletLandscape ? 14 : isTablet ? 13 : 12,
      color: colors.gray400,
      flexShrink: 1,
    },
    cardSecondaryAmountRow: {
      alignItems: 'center',
      gap: 4,
      marginTop: 1,
    },
    amountSubSecondaryLabel: {
      fontSize: 11,
      color: colors.gray400,
    },
    amountSubSecondaryVal: {
      fontSize: 11.5,
      fontWeight: '600',
    },

    progressTrack: {
      height: isTabletLandscape ? 8 : 6,
      backgroundColor: colors.gray100,
      borderRadius: 4,
      marginBottom: isTabletLandscape ? 14 : 12,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 4 },

    cardActionsStack: { gap: isTabletLandscape ? 10 : 8 },
    quickPayBtnFull: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: isTabletLandscape ? 12 : 8,
      paddingVertical: isTabletLandscape ? 16 : isTablet ? 14 : 10,
      gap: 6,
    },
    quickPayText: { fontSize: isTabletLandscape ? 16 : isTablet ? 15 : 13, fontWeight: '700' },
    detailBtnRow: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: isTabletLandscape ? 6 : 4,
    },
    detailBtnText: { fontSize: isTabletLandscape ? 16 : isTablet ? 15 : 13, fontWeight: '600' },

    statusPill: { borderRadius: 6, paddingHorizontal: isTabletLandscape ? 12 : isTablet ? 10 : 7, paddingVertical: isTabletLandscape ? 5 : isTablet ? 4 : 2 },
    statusPillText: { fontSize: isTabletLandscape ? 13.5 : isTablet ? 13 : 11, fontWeight: '700' },

    overdueBadge: { borderRadius: 6, paddingHorizontal: isTabletLandscape ? 10 : isTablet ? 8 : 6, paddingVertical: isTabletLandscape ? 4 : isTablet ? 3 : 2, marginTop: 3 },
    overdueBadgeText: { fontSize: isTabletLandscape ? 12.5 : isTablet ? 12 : 10, fontWeight: '700' },

    empty: { paddingTop: 60, alignItems: 'center', gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.gray500, marginTop: 8 },
    emptySub: { fontSize: 13, color: colors.gray400, textAlign: 'center' },

    // ── Quick Pay Modal ──
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: isTablet ? 24 : 16,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.52)',
    },
    modal: {
      width: '100%',
      maxWidth: isTablet ? 460 : 360,
      borderRadius: 20,
      borderWidth: 1,
      padding: isTablet ? 22 : 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 8,
    },
    modalHeaderRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    modalHeaderTitleRow: {
      alignItems: 'center',
      gap: 8,
    },
    modalHeaderBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      fontSize: isTablet ? 17 : 16,
      fontWeight: '800',
    },
    modalCloseBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalInfoCard: {
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    modalSub: {
      fontSize: isTablet ? 14.5 : 13.5,
      fontWeight: '700',
    },
    modalFullAmountBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
    },
    modalFullAmountText: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    modalFieldLabel: {
      fontSize: 12.5,
      fontWeight: '600',
      marginBottom: 6,
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: isTablet ? 12 : 10,
      fontSize: isTablet ? 16 : 15,
      fontWeight: '600',
    },
    modalMethodBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    modalMethodBtnText: {
      fontSize: 13,
      fontWeight: '700',
    },
    modalActions: {
      gap: 10,
      marginTop: 2,
    },
    modalCancel: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: isTablet ? 13 : 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelText: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '600',
    },
    modalConfirm: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: isTablet ? 13 : 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalConfirmText: {
      fontSize: isTablet ? 15 : 14,
      fontWeight: '700',
    },

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
