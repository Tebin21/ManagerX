import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { TimeText } from '@/components/ui/TimeText';
import { LTRNumber } from '@/components/ui/LTRNumber';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { LoadingView } from '@/components/ui/LoadingView';
import { KeyboardAwareScrollView, useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { getPurchaseDebtById, getDebtPayments, getPurchaseById } from '@/lib/sqlite';
import { sharePurchaseDebtReport } from '@/lib/generateInvoice';
import { useBusinessStore } from '@/store/businessStore';
import { useDebtStore } from '@/store/debtStore';
import { Colors } from '@/constants/colors';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { Theme } from '@/constants/theme';
import { getOverdueLevel, getDebtDisplayStatus } from '@/types/debt';
import type { PurchaseDebt, DebtPayment, DebtPaymentReceiptData } from '@/types/debt';
import { DebtPaymentReceiptModal } from '@/components/debt/DebtPaymentReceiptModal';
import type { Purchase } from '@/types/purchases';
import { roundToNearest250 } from '@/utils/rounding';
import { toEnglishDigits, sanitizeNumericInput, fmtIQD } from '@/utils/formatters';
import { useRTL } from '@/lib/rtl';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const errorTint = getStatusTint('error', colors, isDark);
  const warningTint = getStatusTint('warning', colors, isDark);
  const successTint = getStatusTint('success', colors, isDark);
  const map: Record<string, { bg: string; fg: string }> = {
    unpaid:  { bg: errorTint.bg,   fg: errorTint.text },
    partial: { bg: warningTint.bg, fg: warningTint.text },
    overdue: { bg: colors.error,   fg: colors.white },
    paid:    { bg: successTint.bg, fg: successTint.text },
  };
  const c = map[status] ?? map.unpaid;
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusBadgeText, { color: c.fg }]}>
        {i18n.t(`debt.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
      </Text>
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
      <MotiView
        from={{ width: '0%' }}
        animate={{ width: `${Math.round(pct * 100)}%` as any }}
        transition={{ type: 'timing', duration: 600, delay: 200 }}
        style={[styles.progressFill, { backgroundColor: color }]}
      />
    </View>
  );
}

// ─── Payment Timeline Item ─────────────────────────────────────────────────────

function PaymentTimelineItem({
  payment,
  isLast,
}: {
  payment: DebtPayment;
  isLast: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const paidTint = useMemo(() => getStatusTint('success', colors, isDark), [colors, isDark]);
  const { flexDirection, textAlign } = useRTL();
  return (
    <View style={[styles.timelineItem, { flexDirection }]}>
      <View style={styles.timelineDotCol}>
        <View style={[styles.timelineDot, { backgroundColor: colors.error }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineCard}>
        <Text style={[styles.timelineDate, { textAlign }]}>
          <DateText value={payment.createdAt} size="small" /> · <TimeText value={payment.createdAt} style={styles.timelineDate} />
        </Text>
        <View style={[styles.timelineAmountRow, { flexDirection, alignItems: 'center' }]}>
          <View style={[styles.timelineAmountChip, { backgroundColor: paidTint.bg }]}>
            <Text style={[styles.timelineAmountChipText, { color: paidTint.text }]}>
              <AmountText value={payment.amount} prefix="+" currency="IQD" variant="small" style={[styles.timelineAmountChipText, { color: paidTint.text }]} /> {i18n.t('debt.paidLabel')}
            </Text>
          </View>
          {payment.paymentMethod ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                backgroundColor: payment.paymentMethod.toLowerCase() === 'fib'
                  ? (isDark ? 'rgba(59, 130, 246, 0.2)' : '#EFF6FF')
                  : (isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5'),
                borderWidth: 1,
                borderColor: payment.paymentMethod.toLowerCase() === 'fib'
                  ? (isDark ? '#60A5FA' : '#93C5FD')
                  : (isDark ? '#34D399' : '#A7F3D0'),
                marginHorizontal: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: payment.paymentMethod.toLowerCase() === 'fib'
                    ? (isDark ? '#93C5FD' : '#1D4ED8')
                    : (isDark ? '#6EE7B7' : '#047857'),
                }}
              >
                {payment.paymentMethod.toLowerCase() === 'fib' ? 'FIB' : (i18n.language === 'ar' ? 'نقداً' : i18n.language === 'ku' ? 'کاش' : 'Cash')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.timelineRemaining, { textAlign }]}>
          {i18n.t('debt.remainingLabel')}: <AmountText value={payment.remainingAfter} currency="IQD" variant="small" style={styles.timelineRemaining} />
        </Text>
        {payment.note ? (
          <Text style={[styles.timelineNote, { textAlign }]}>{payment.note}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function PurchaseDebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { payPurchaseDebt } = useDebtStore();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const paidTint = useMemo(() => getStatusTint('success', colors, isDark), [colors, isDark]);
  const scrollIntoView = useKeyboardAwareFocus();
  const { isRTL, textAlign, flexDirection, valueAlign } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isArLanguage = useLanguageStore((s) => s.language === 'ar');
  const business = useBusinessStore();

  const [debt, setDebt]         = useState<PurchaseDebt | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  const [payValue, setPayValue]         = useState('');
  const [paymentDate, setPaymentDate]   = useState(() => new Date());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'fib'>('cash');
  const [showPayForm, setShowPayForm]   = useState(false);
  const [isPaying, setIsPaying]         = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<DebtPaymentReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const debtId = Number(id);
  const debtGradient: [string, string] = [Colors.errorDark, Colors.error];

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [d, p] = await Promise.all([
        getPurchaseDebtById(debtId),
        getDebtPayments(debtId, 'purchase'),
      ]);
      setDebt(d);
      setPayments(p);
      if (d?.purchaseId) {
        const pur = await getPurchaseById(d.purchaseId);
        setPurchase(pur);
      }
    } catch (err) {
      console.error('Failed to load purchase debt detail:', err);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [debtId]);

  useEffect(() => { load(); }, [load]);

  async function handleShareReport() {
    if (!debt) return;
    setIsSharing(true);
    try {
      await sharePurchaseDebtReport(debt, payments, {
        name: business.name,
        phone: business.phone,
        address: business.address,
        logoUri: business.logoUri,
      }, purchase);
    } catch (err) {
      console.error('Failed to share purchase debt report:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setIsSharing(false);
    }
  }

  async function handlePay() {
    const amt = roundToNearest250(parseFloat(toEnglishDigits(payValue).replace(/,/g, '')) || 0);
    if (!amt || amt <= 0) {
      Alert.alert(t('common.error'), t('debt.invalidAmount'));
      return;
    }
    if (!debt) return;
    setIsPaying(true);
    try {
      const ts = paymentDate.toISOString();
      const receipt = await payPurchaseDebt(debtId, amt, ts, paymentMethod);

      // Instant, optimistic patch so the screen reflects the payment in this
      // same tick — the silent reload below then reconciles payment history.
      const clamped = Math.min(amt, debt.remainingAmount);
      const newRemaining = Math.max(0, debt.remainingAmount - clamped);
      setDebt({
        ...debt,
        paidAmount: debt.paidAmount + clamped,
        remainingAmount: newRemaining,
        status: newRemaining <= 0 ? 'settled' : 'active',
        lastPaymentAt: ts,
      });

      setPayValue('');
      setPaymentDate(new Date());
      setPaymentMethod('cash');
      setShowPayForm(false);
      await load({ silent: true });

      setCreatedReceipt(receipt);
      setShowReceiptModal(true);
    } catch {
      Alert.alert(t('common.error'), t('debt.errorPayment'));
    } finally {
      setIsPaying(false);
    }
  }

  if (!id || isNaN(debtId)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('debt.debtDetails', 'وردەکاریی قەرز')} gradient={debtGradient} showBack />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('debt.debtDetails', 'وردەکاریی قەرز')} gradient={debtGradient} showBack />
        <LoadingView />
      </View>
    );
  }

  if (!debt) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }, styles.center]}>
        <AppHeader title={t('debt.notFound')} gradient={debtGradient} />
        <Text style={styles.notFound}>{t('debt.notFound')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.notFoundBack, { color: colors.primary }]}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const overdueLevel  = getOverdueLevel(debt.lastPaymentAt, debt.createdAt, debt.remainingAmount);
  const displayStatus = getDebtDisplayStatus(debt.paidAmount, debt.remainingAmount, overdueLevel);
  const pctPaid       = debt.originalAmount > 0
    ? Math.round((debt.paidAmount / debt.originalAmount) * 100)
    : 0;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.gray50 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title={debt.supplierName}
        showBack
        gradient={[Colors.errorDark, Colors.error]}
        rightAction={
          <HeaderActionButton
            icon="share-outline"
            onPress={handleShareReport}
            disabled={isSharing}
          />
        }
      >
        {(debt.supplierPhone || debt.supplierAddress) ? (
          <View style={[styles.headerMeta, { flexDirection }]}>
            {debt.supplierPhone ? (
              <View style={[styles.headerMetaItem, { flexDirection }]}>
                <Ionicons name="call" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.headerMetaText}>{debt.supplierPhone}</Text>
              </View>
            ) : null}
            {debt.supplierPhone && debt.supplierAddress ? <View style={styles.headerMetaDot} /> : null}
            {debt.supplierAddress ? (
              <View style={[styles.headerMetaItem, { flexDirection }]}>
                <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
                <Text style={styles.headerMetaText} numberOfLines={1}>{debt.supplierAddress}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </AppHeader>

      <KeyboardAwareScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <PremiumCard style={styles.section}>
            <View style={[styles.statusRow, { flexDirection }]}>
              <View>
                <Text style={[styles.remainingLabel, { textAlign }]}>{t('debt.weOweSupplier')}</Text>
                <AmountText value={debt.remainingAmount} currency="IQD" variant="hero" style={[styles.remainingAmount, { color: colors.error }]} />
              </View>
              <StatusBadge status={displayStatus} />
            </View>

            <ProgressBar paid={debt.paidAmount} total={debt.originalAmount} />

            <Text style={[styles.progressPct, { textAlign }]}>
              <LTRNumber style={styles.progressPct}>{pctPaid}%</LTRNumber> {t('debt.pctPaidSupplier')}
            </Text>

            <View style={[styles.amountRow, { flexDirection }]}>
              <View style={styles.amountCell}>
                <Text style={[styles.amountCellLabel, { textAlign }]}>{t('debt.totalOwedLabel')}</Text>
                <AmountText value={debt.originalAmount} currency="IQD" style={styles.amountCellValue} />
              </View>
              <View style={styles.amountDivider} />
              <View style={styles.amountCell}>
                <Text style={[styles.amountCellLabel, { textAlign }]}>{t('debt.paidLabel')}</Text>
                <AmountText value={debt.paidAmount} currency="IQD" style={[styles.amountCellValue, { color: colors.success }]} />
              </View>
            </View>
          </PremiumCard>
        </MotiView>

        {/* Purchase info & Batch details */}
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 80 }}>
          <PremiumCard style={styles.section}>
            <View style={[styles.sectionHeaderRow, { flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }]}>
              <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
                <Ionicons name="layers-outline" size={17} color={colors.primary} />
                <Text style={[styles.sectionTitle, { textAlign, marginBottom: 0 }]}>{t('debt.purchaseDetails')}</Text>
              </View>
              {debt.batchNumber ? (
                <View style={[styles.batchNumPill, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.batchNumPillText, { color: colors.white }]}>
                    {isArLanguage ? `وجبة ${debt.batchNumber}` : isKuLanguage ? `وەجبەی ${debt.batchNumber}` : `Batch #${debt.batchNumber}`}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={[styles.infoLabel, { textAlign }]}>{t('purchases.purchaseNumber')}</Text>
              <IdText style={[styles.infoValue, { textAlign: valueAlign }]}>{debt.purchaseNumber ?? '—'}</IdText>
            </View>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={[styles.infoLabel, { textAlign }]}>{t('inventory.date')}</Text>
              <DateText value={debt.createdAt} style={[styles.infoValue, { textAlign: valueAlign }]} />
            </View>
            {debt.totalBatches && debt.totalBatches > 1 ? (
              <View style={[styles.infoRow, { flexDirection }]}>
                <Text style={[styles.infoLabel, { textAlign }]}>{isArLanguage ? 'إجمالي وجبات المنتج' : isKuLanguage ? 'کۆی وەجبەکانی بەرهەم' : 'Total Batches'}</Text>
                <Text style={[styles.infoValue, { textAlign: valueAlign, color: colors.primary, fontWeight: '700' }]}>
                  {debt.totalBatches} {isArLanguage ? 'وجبات' : isKuLanguage ? 'وەجبە' : 'batches'}
                </Text>
              </View>
            ) : null}

            {purchase ? (
              <View style={styles.itemCard}>
                <View style={[styles.itemNameRow, { flexDirection, justifyContent: 'space-between' }]}>
                  <Text style={[styles.itemName, { textAlign }]} numberOfLines={1}>{purchase.productName}</Text>
                  {purchase.quantity > 1 ? (
                    <Text style={styles.itemQtyBadge}>×{purchase.quantity}</Text>
                  ) : null}
                </View>
                <AmountText value={purchase.totalIQD} currency="IQD" style={[styles.itemPrice, { textAlign: valueAlign }]} />
                
                <View style={[styles.itemMetaRow, { flexDirection, justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }]}>
                  <View style={[styles.itemBatchBadge, { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : '#FEF9C3', borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : '#FDE047' }]}>
                    <Ionicons name="layers" size={11} color={colors.primary} />
                    <Text style={[styles.itemBatchBadgeText, { color: isDark ? '#FDE047' : '#854D0E' }]}>
                      {isArLanguage ? `وجبة ${debt.batchNumber || 1}` : isKuLanguage ? `وەجبەی ${debt.batchNumber || 1}` : `Batch #${debt.batchNumber || 1}`}
                      {debt.totalBatches && debt.totalBatches > 1 ? ` (${isArLanguage ? `من إجمالي ${debt.totalBatches}` : isKuLanguage ? `لە کۆی ${debt.totalBatches}` : `of ${debt.totalBatches}`})` : ''}
                    </Text>
                  </View>
                  {purchase.itemIds.length > 0 ? (
                    <Text style={[styles.itemId, { textAlign: 'right' }]}>{t('invoicePdf.itemIdLabel')}: <IdText size="small" style={styles.itemId}>{purchase.itemIds.join(', ')}</IdText></Text>
                  ) : null}
                </View>

                {purchase.expiryDate ? (
                  <View style={[styles.infoRow, { flexDirection, marginTop: 6, marginBottom: 0 }]}>
                    <Text style={[styles.infoLabel, { textAlign }]}>{isArLanguage ? 'تاريخ انتهاء الصلاحية' : isKuLanguage ? 'بەرواری بەسەرچوون' : 'Expiry Date'}</Text>
                    <DateText value={purchase.expiryDate} style={[styles.infoValue, { textAlign: 'right', color: colors.warning }]} />
                  </View>
                ) : null}

                {purchase.warranty ? (
                  <View style={[styles.infoRow, { flexDirection, marginTop: 6, marginBottom: 0 }]}>
                    <Text style={[styles.infoLabel, { textAlign }]}>{t('purchases.warranty')}</Text>
                    <Text style={[styles.infoValue, { textAlign: 'right' }]}>{purchase.warranty}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {debt.notes ? (
              <View style={[styles.infoRow, { flexDirection }]}>
                <Text style={[styles.infoLabel, { textAlign }]}>{t('purchases.notes')}</Text>
                <Text style={[styles.infoValue, { textAlign: 'right' }]}>{debt.notes}</Text>
              </View>
            ) : null}

            {/* Clear batch debt notice */}
            <View style={[styles.batchDebtNoticeBanner, { flexDirection, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#FECACA' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.error} />
              <Text style={[styles.batchDebtNoticeText, { color: isDark ? '#FCA5A5' : '#991B1B', textAlign: isRTL ? 'right' : 'left' }]}>
                {isArLanguage
                  ? `هذا الدين (${fmtIQD(debt.remainingAmount)} دينار) خاص بالوجبة رقم ${debt.batchNumber || 1} لهذا المنتج من المورد`
                  : isKuLanguage
                  ? `ئەم قەرزە (${fmtIQD(debt.remainingAmount)} دینار) تایبەتە بە وەجبەی ${debt.batchNumber || 1}ی ئەم بەرهەمە لە دابینکەر`
                  : `This debt (${fmtIQD(debt.remainingAmount)} IQD) belongs to Batch #${debt.batchNumber || 1} purchased from this supplier`}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={[styles.actionButtonsRow, { flexDirection, gap: 8, marginTop: 12 }]}>
              {purchase ? (
                <TouchableOpacity
                  style={[styles.viewPurchaseBtn, { flex: 1, flexDirection }]}
                  onPress={() => router.push(`/(app)/purchases/${debt.purchaseId}` as never)}
                >
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                  <Text style={[styles.viewPurchaseBtnText, { color: colors.primary }]}>{t('inventory.viewPurchaseInvoice')}</Text>
                </TouchableOpacity>
              ) : null}
              {debt.productId ? (
                <TouchableOpacity
                  style={[styles.viewInventoryBtn, { flex: 1, flexDirection, backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : '#FEF9C3', borderColor: colors.primary }]}
                  onPress={() => router.push(`/(app)/inventory/${debt.productId}` as never)}
                >
                  <Ionicons name="layers" size={14} color={colors.primary} />
                  <Text style={[styles.viewInventoryBtnText, { color: isDark ? '#FDE047' : '#854D0E' }]}>
                    {isArLanguage ? 'وجبات المخزن' : isKuLanguage ? 'وەجبەکانی کۆگا' : 'Inventory Batches'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </PremiumCard>
        </MotiView>

        {/* Payment history */}
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 160 }}>
          <PremiumCard style={styles.section}>
            <Text style={[styles.sectionTitle, { textAlign }]}>
              {t('debt.paymentHistory')}{payments.length > 0 ? ` (${payments.length})` : ''}
            </Text>
            {payments.length === 0 ? (
              <Text style={styles.noPayments}>{t('debt.noPayments')}</Text>
            ) : (
              payments.map((p, i) => (
                <PaymentTimelineItem
                  key={p.id}
                  payment={p}
                  isLast={i === payments.length - 1}
                />
              ))
            )}
          </PremiumCard>
        </MotiView>

        {/* Add payment */}
        {debt.remainingAmount > 0 ? (
          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 220 }}>
            {!showPayForm ? (
              <TouchableOpacity
                style={[styles.addPayBtn, { backgroundColor: colors.error, flexDirection }]}
                onPress={() => setShowPayForm(true)}
              >
                <Ionicons name="add-circle" size={20} color={colors.white} />
                <Text style={[styles.addPayBtnText, { color: colors.white }]}>{t('debt.paySupplier')}</Text>
              </TouchableOpacity>
            ) : (
              <PremiumCard style={styles.section}>
                <Text style={[styles.sectionTitle, { textAlign }]}>{t('debt.recordPayment')}</Text>
                <Text style={[styles.payRemaining, { color: colors.error, textAlign }]}>
                  {t('debt.remainingLabel')}: <AmountText value={debt.remainingAmount} currency="IQD" variant="small" style={[styles.payRemaining, { color: colors.error }]} />
                </Text>
                <TextInput
                  style={[
                    styles.payInput,
                    { textAlign: isRTL ? 'right' : 'left', writingDirection: 'ltr' },
                    applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: payValue, placeholder: t('debt.amountPlaceholder'), keyboardType: 'decimal-pad' }), {}),
                  ]}
                  placeholder={t('debt.amountPlaceholder')}
                  placeholderTextColor={colors.gray400}
                  keyboardType="decimal-pad"
                  value={payValue}
                  onChangeText={(v) => setPayValue(sanitizeNumericInput(v, 'decimal-pad'))}
                  onEndEditing={() => {
                    const r = roundToNearest250(parseFloat(toEnglishDigits(payValue).replace(/,/g, '')) || 0);
                    setPayValue(r > 0 ? String(r) : '');
                  }}
                  onFocus={scrollIntoView}
                  autoFocus
                />
                <DateTimePicker
                  value={paymentDate}
                  onChange={setPaymentDate}
                  label={t('debt.paymentDate')}
                  maxDate={new Date()}
                />
                <View style={{ marginBottom: 14 }}>
                  <Text style={[{ fontSize: 13, color: colors.gray500, marginBottom: 8, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {t('debt.paymentMethod', 'شێوازی پارەدان')}
                  </Text>
                  <View style={[{ flexDirection, gap: 8 }]}>
                    <TouchableOpacity
                      onPress={() => setPaymentMethod('cash')}
                      activeOpacity={0.8}
                      style={[
                        styles.methodBtn,
                        paymentMethod === 'cash'
                          ? { borderColor: colors.primary, backgroundColor: colors.softBlue }
                          : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.gray50 },
                        { flexDirection },
                      ]}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={17}
                        color={paymentMethod === 'cash' ? colors.primary : colors.gray400}
                      />
                      <Text
                        style={[
                          styles.methodBtnText,
                          { color: paymentMethod === 'cash' ? colors.primary : colors.gray500 },
                          isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {t('debt.cash', 'کاش')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setPaymentMethod('fib')}
                      activeOpacity={0.8}
                      style={[
                        styles.methodBtn,
                        paymentMethod === 'fib'
                          ? { borderColor: '#3B82F6', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF' }
                          : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.gray50 },
                        { flexDirection },
                      ]}
                    >
                      <Ionicons
                        name="phone-portrait-outline"
                        size={16}
                        color={paymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray400}
                      />
                      <Text
                        style={[
                          styles.methodBtnText,
                          { color: paymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray500 },
                          isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {t('debt.fib', 'FIB')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.payActions, { flexDirection }]}>
                  <TouchableOpacity
                    style={styles.payCancel}
                    onPress={() => { setShowPayForm(false); setPayValue(''); }}
                  >
                    <Text style={styles.payCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.payConfirm, { backgroundColor: colors.error }, isPaying && { opacity: 0.6 }]}
                    onPress={handlePay}
                    disabled={isPaying}
                  >
                    {isPaying
                      ? <ActivityIndicator size="small" color={colors.white} />
                      : <Text style={[styles.payConfirmText, { color: colors.white }]}>{t('common.confirm')}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </PremiumCard>
            )}
          </MotiView>
        ) : (
          <View style={[styles.settledBanner, { backgroundColor: paidTint.bg, flexDirection }]}>
            <Ionicons name="checkmark-circle" size={20} color={paidTint.text} />
            <Text style={[styles.settledText, { color: paidTint.text }]}>{t('debt.fullyPaidSupplier')}</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </KeyboardAwareScrollView>

      {/* ── Debt Payment Receipt 4-Size Modal ── */}
      <DebtPaymentReceiptModal
        visible={showReceiptModal}
        receipt={createdReceipt}
        onClose={() => {
          setShowReceiptModal(false);
          setCreatedReceipt(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: AppColors) {
  return StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  // headerMeta sits inside AppHeader's fixed red gradient — theme-invariant.
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  headerMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },

  body: { padding: 16, paddingTop: 14 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.black, marginBottom: 12 },

  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  remainingLabel: { fontSize: 12, color: colors.gray400, marginBottom: 2 },
  remainingAmount: { fontSize: 26, fontWeight: '800' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },

  progressTrack: { height: 8, backgroundColor: colors.gray100, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressPct: { fontSize: 12, color: colors.gray400, marginBottom: 14 },

  amountRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: 12,
  },
  amountCell: { flex: 1, alignItems: 'center' },
  amountDivider: { width: 1, backgroundColor: colors.gray100 },
  amountCellLabel: { fontSize: 12, color: colors.gray400, marginBottom: 3 },
  amountCellValue: { fontSize: 15, fontWeight: '700', color: colors.black },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 13, color: colors.gray400 },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.black, flex: 1 },

  // Item summary
  itemCard: {
    paddingVertical: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    gap: 3,
  },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.black, flexShrink: 1 },
  itemQtyBadge: { fontSize: 12, fontWeight: '600', color: colors.gray400 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: colors.black },
  itemId: { fontSize: 11, color: colors.gray400 },

  viewPurchaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  viewPurchaseBtnText: { fontSize: 12, fontWeight: '700' },

  sectionHeaderRow: {
    flexDirection: 'row',
  },
  batchNumPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  batchNumPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemBatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  itemBatchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  batchDebtNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  batchDebtNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  viewInventoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewInventoryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  noPayments: { fontSize: 13, color: colors.gray400, textAlign: 'center', paddingVertical: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  timelineDotCol: { alignItems: 'center', width: 20 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 14,
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.gray100, marginTop: 4 },
  timelineCard: {
    flex: 1,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  timelineDate: { fontSize: 11, color: colors.gray400 },
  timelineAmountRow: { flexDirection: 'row', marginTop: 2, marginBottom: 2 },
  timelineAmountChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timelineAmountChipText: { fontSize: 13, fontWeight: '700' },
  timelineRemaining: { fontSize: 12, color: colors.gray500 },
  timelineNote: { fontSize: 12, color: colors.gray400, fontStyle: 'italic', marginTop: 2 },

  addPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.md,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 14,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addPayBtnText: { fontSize: 15, fontWeight: '700' },
  payRemaining: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  payInput: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.black,
    marginBottom: 14,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  payActions: { flexDirection: 'row', gap: 10 },
  payCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payCancelText: { fontSize: 14, fontWeight: '600', color: colors.gray500 },
  payConfirm: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payConfirmText: { fontSize: 14, fontWeight: '700' },

  settledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 14,
  },
  settledText: { fontSize: 14, fontWeight: '600' },

  notFound: { fontSize: 16, color: colors.gray500, marginBottom: 12 },
  notFoundBack: { fontSize: 14, fontWeight: '600' },
  });
}
