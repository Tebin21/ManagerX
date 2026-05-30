import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { getSalesDebtById, getDebtPayments, getSaleById, addPaymentToDebt, loadBusiness } from '@/lib/sqlite';
import { shareSalesDebtReport } from '@/lib/generateInvoice';
import { useDebtStore } from '@/store/debtStore';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { getOverdueLevel, getDebtDisplayStatus } from '@/types/debt';
import type { SalesDebtDetail, DebtPayment } from '@/types/debt';
import type { Sale } from '@/types/sales';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    unpaid:  { bg: '#FEE2E2', fg: Colors.error },
    partial: { bg: '#FEF3C7', fg: '#92400E' },
    overdue: { bg: Colors.error, fg: '#fff' },
    paid:    { bg: '#D1FAE5', fg: Colors.success },
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
  const pct = total > 0 ? Math.min(1, paid / total) : 0;
  const color = pct >= 1 ? Colors.success : pct > 0 ? '#F59E0B' : Colors.error;
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
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDotCol}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineDate}>{formatDateTime(payment.createdAt)}</Text>
        <Text style={styles.timelineAmount}>+{fmt(payment.amount)} IQD {i18n.t('debt.paidLabel')}</Text>
        <Text style={styles.timelineRemaining}>
          {i18n.t('debt.remainingLabel')}: {fmt(payment.remainingAfter)} IQD
        </Text>
        {payment.note ? (
          <Text style={styles.timelineNote}>{payment.note}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function SalesDebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { reloadAfterSale } = useDebtStore();
  const { colors } = useAppTheme();

  const [debt, setDebt]         = useState<SalesDebtDetail | null>(null);
  const [sale, setSale]         = useState<Sale | null>(null);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [payValue, setPayValue]     = useState('');
  const [showPayForm, setShowPayForm] = useState(false);
  const [isPaying, setIsPaying]     = useState(false);

  const debtId = Number(id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        getSalesDebtById(debtId),
        getDebtPayments(debtId, 'sales'),
      ]);
      setDebt(d);
      setPayments(p);
      if (d?.saleId) {
        const s = await getSaleById(d.saleId);
        setSale(s);
      }
    } catch (err) {
      console.error('Failed to load debt detail:', err);
    } finally {
      setLoading(false);
    }
  }, [debtId]);

  useEffect(() => { load(); }, [load]);

  async function handleExport() {
    if (!debt) return;
    setIsExporting(true);
    try {
      const biz = await loadBusiness();
      await shareSalesDebtReport(debt, payments, {
        name:    biz?.name    ?? 'My Business',
        phone:   biz?.phone   ?? '',
        address: biz?.address ?? '',
        logoUri: biz?.logoPath ?? null,
      });
    } catch {
      Alert.alert(t('common.error'), t('debt.errorExport'));
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePay() {
    const amt = parseFloat(payValue);
    if (!amt || amt <= 0) {
      Alert.alert(t('common.error'), t('debt.invalidAmount'));
      return;
    }
    if (!debt) return;
    setIsPaying(true);
    try {
      await addPaymentToDebt(debtId, amt);
      await reloadAfterSale();
      setPayValue('');
      setShowPayForm(false);
      await load();
    } catch {
      Alert.alert(t('common.error'), t('debt.errorPayment'));
    } finally {
      setIsPaying(false);
    }
  }

  if (!id || isNaN(debtId)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }, styles.center]}>
        <AppHeader title="" showBack />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }, styles.center]}>
        <AppHeader title="" />
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!debt) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }, styles.center]}>
        <AppHeader title={t('debt.notFound')} />
        <Text style={styles.notFound}>{t('debt.notFound')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.notFoundBack}>{t('common.goBack')}</Text>
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
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader
        title={debt.customerName}
        showBack
        rightAction={
          <HeaderActionButton
            icon="share-outline"
            onPress={handleExport}
            disabled={isExporting}
          />
        }
      >
        <View style={styles.headerMeta}>
          {debt.customerPhone ? (
            <View style={styles.chip}>
              <Ionicons name="call" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.chipText}>{debt.customerPhone}</Text>
            </View>
          ) : null}
          {debt.customerAddress ? (
            <View style={styles.chip}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.chipText}>{debt.customerAddress}</Text>
            </View>
          ) : null}
        </View>
      </AppHeader>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Status card */}
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <PremiumCard style={styles.section}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.remainingLabel}>{t('sales.remainingDebt')}</Text>
                <Text style={styles.remainingAmount}>{fmt(debt.remainingAmount)} IQD</Text>
              </View>
              <StatusBadge status={displayStatus} />
            </View>

            <ProgressBar paid={debt.paidAmount} total={debt.originalAmount} />

            <Text style={styles.progressPct}>{t('debt.pctPaidCustomer', { pct: pctPaid })}</Text>

            <View style={styles.amountRow}>
              <View style={styles.amountCell}>
                <Text style={styles.amountCellLabel}>{t('debt.totalOwedLabel')}</Text>
                <Text style={styles.amountCellValue}>{fmt(debt.originalAmount)} IQD</Text>
              </View>
              <View style={styles.amountDivider} />
              <View style={styles.amountCell}>
                <Text style={styles.amountCellLabel}>{t('debt.paidLabel')}</Text>
                <Text style={[styles.amountCellValue, { color: Colors.success }]}>
                  {fmt(debt.paidAmount)} IQD
                </Text>
              </View>
            </View>
          </PremiumCard>
        </MotiView>

        {/* Invoice info */}
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 80 }}>
          <PremiumCard style={styles.section}>
            <Text style={styles.sectionTitle}>{t('sales.invoicePreview')}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('purchases.purchaseNumber')}</Text>
              <Text style={styles.infoValue}>{debt.invoiceNumber}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('inventory.date')}</Text>
              <Text style={styles.infoValue}>{formatDate(debt.createdAt)}</Text>
            </View>
            {debt.warranty ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('sales.warranty')}</Text>
                <Text style={styles.infoValue}>{debt.warranty}</Text>
              </View>
            ) : null}
            {debt.saleNotes ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('sales.notes')}</Text>
                <Text style={styles.infoValue}>{debt.saleNotes}</Text>
              </View>
            ) : null}
          </PremiumCard>
        </MotiView>

        {/* Products from sale */}
        {sale?.items && sale.items.length > 0 ? (
          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 140 }}>
            <PremiumCard style={styles.section}>
              <Text style={styles.sectionTitle}>{t('sales.orderSummary')}</Text>
              {sale.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    {item.itemId ? (
                      <Text style={styles.itemId}>ID: {item.itemId}</Text>
                    ) : null}
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemQty}>×{item.quantity}</Text>
                    <Text style={styles.itemTotal}>{fmt(item.lineTotal)} IQD</Text>
                  </View>
                </View>
              ))}
            </PremiumCard>
          </MotiView>
        ) : null}

        {/* Payment history */}
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 200 }}>
          <PremiumCard style={styles.section}>
            <Text style={styles.sectionTitle}>
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

        {/* Add payment form */}
        {debt.remainingAmount > 0 ? (
          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 260 }}>
            {!showPayForm ? (
              <TouchableOpacity
                style={styles.addPayBtn}
                onPress={() => setShowPayForm(true)}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.addPayBtnText}>{t('debt.recordPayment')}</Text>
              </TouchableOpacity>
            ) : (
              <PremiumCard style={styles.section}>
                <Text style={styles.sectionTitle}>{t('debt.recordPayment')}</Text>
                <Text style={styles.payRemaining}>
                  {t('debt.remainingLabel')}: {fmt(debt.remainingAmount)} IQD
                </Text>
                <TextInput
                  style={styles.payInput}
                  placeholder={t('debt.amountPlaceholder')}
                  placeholderTextColor={Colors.gray400}
                  keyboardType="decimal-pad"
                  value={payValue}
                  onChangeText={setPayValue}
                  autoFocus
                />
                <View style={styles.payActions}>
                  <TouchableOpacity
                    style={styles.payCancel}
                    onPress={() => { setShowPayForm(false); setPayValue(''); }}
                  >
                    <Text style={styles.payCancelText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.payConfirm, isPaying && { opacity: 0.6 }]}
                    onPress={handlePay}
                    disabled={isPaying}
                  >
                    {isPaying
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.payConfirmText}>{t('common.confirm')}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </PremiumCard>
            )}
          </MotiView>
        ) : (
          <View style={styles.settledBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.settledText}>{t('debt.fullyPaidCustomer')}</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  gradHeader: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 16,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: '#fff' },

  body: { padding: 16, paddingTop: 14 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.black, marginBottom: 12 },

  // Status card
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  remainingLabel: { fontSize: 12, color: Colors.gray400, marginBottom: 2 },
  remainingAmount: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },

  progressTrack: { height: 8, backgroundColor: Colors.gray100, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressPct: { fontSize: 12, color: Colors.gray400, marginBottom: 14 },

  amountRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    paddingTop: 12,
  },
  amountCell: { flex: 1, alignItems: 'center' },
  amountDivider: { width: 1, backgroundColor: Colors.gray100 },
  amountCellLabel: { fontSize: 12, color: Colors.gray400, marginBottom: 3 },
  amountCellValue: { fontSize: 15, fontWeight: '700', color: Colors.black },

  // Info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 13, color: Colors.gray400 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.black, flex: 1, textAlign: 'right' },

  // Items
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.black },
  itemId: { fontSize: 11, color: Colors.gray400, marginTop: 1 },
  itemRight: { alignItems: 'flex-end', gap: 2 },
  itemQty: { fontSize: 12, color: Colors.gray400 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.black },

  // Payment timeline
  noPayments: { fontSize: 13, color: Colors.gray400, textAlign: 'center', paddingVertical: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 12 },
  timelineDotCol: { alignItems: 'center', width: 20, marginRight: 12 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.gray100, marginTop: 4 },
  timelineContent: { flex: 1 },
  timelineDate: { fontSize: 11, color: Colors.gray400, marginBottom: 2 },
  timelineAmount: { fontSize: 14, fontWeight: '700', color: Colors.success },
  timelineRemaining: { fontSize: 12, color: Colors.gray500, marginTop: 1 },
  timelineNote: { fontSize: 12, color: Colors.gray400, fontStyle: 'italic', marginTop: 2 },

  // Add payment
  addPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Theme.radius.md,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addPayBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  payRemaining: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginBottom: 12 },
  payInput: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.black,
    marginBottom: 14,
  },
  payActions: { flexDirection: 'row', gap: 10 },
  payCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payCancelText: { fontSize: 14, fontWeight: '600', color: Colors.gray500 },
  payConfirm: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  settledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 14,
  },
  settledText: { fontSize: 14, fontWeight: '600', color: Colors.success },

  notFound: { fontSize: 16, color: Colors.gray500, marginBottom: 12 },
  notFoundBack: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});
