import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { CompactAmount } from '@/components/shared/CompactAmount';
import { DateText } from '@/components/ui/DateText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/common/AppHeader';
import { KeyboardAwareScrollView } from '@/components/common/KeyboardAwareScrollView';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { DebtCard } from '@/components/customers/DebtCard';
import { SaleTimelineItem } from '@/components/customers/SaleTimelineItem';
import { FinancialTimelineItem } from '@/components/shared/FinancialTimelineItem';
import { useCustomerStore, fetchCustomerSales, fetchCustomerDebts, fetchCustomerFinancialTimeline } from '@/store/customerStore';
import { useSalesStore } from '@/store/salesStore';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { Theme } from '@/constants/theme';
import type { CustomerWithStats } from '@/types/customers';
import type { Sale, Debt } from '@/types/sales';
import type { FinancialLedgerEvent } from '@/types/debt';
import { useRTL } from '@/lib/rtl';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { customers, addDebtPayment, loadCustomers, deleteCustomer } = useCustomerStore();
  const { deleteSale } = useSalesStore();

  const [sales, setSales] = useState<Sale[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [timeline, setTimeline] = useState<FinancialLedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const errorTint = useMemo(() => getStatusTint('error', colors, isDark), [colors, isDark]);
  const warningTint = useMemo(() => getStatusTint('warning', colors, isDark), [colors, isDark]);
  const { flexDirection, textAlign, writingDirection } = useRTL();
  const customer: CustomerWithStats | undefined = customers.find((c) => c.id === Number(id));
  const sectionTitleStyle = [styles.sectionTitle, { color: colors.gray400, textAlign, writingDirection }];

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, d, tl] = await Promise.all([
        fetchCustomerSales(Number(id)),
        fetchCustomerDebts(Number(id)),
        fetchCustomerFinancialTimeline(Number(id)),
      ]);
      setSales(s);
      setDebts(d);
      setTimeline(tl);
    } catch (err) {
      console.error('Failed to load customer data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleShareInvoice = useCallback(async (sale: Sale) => {
    try {
      const { shareInvoice } = await import('@/lib/generateInvoice');
      const { loadBusiness } = await import('@/lib/sqlite');
      const biz = await loadBusiness();
      await shareInvoice(sale, {
        name: biz?.name ?? 'My Business',
        phone: biz?.phone ?? '',
        address: biz?.address ?? '',
        logoUri: biz?.logoPath ?? null,
      });
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, []);

  const handlePayment = useCallback(async (debtId: number, amount: number) => {
    await addDebtPayment(debtId, amount, Number(id));
    await loadAll();
  }, [addDebtPayment, loadAll, id]);

  const handleDeleteSale = useCallback((sale: Sale) => {
    Alert.alert(
      t('customers.deleteInvoiceTitle'),
      t('customers.deleteInvoiceMsg', { invoice: sale.invoiceNumber }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSale(sale.id);
              await loadCustomers();
              await loadAll();
            } catch {
              Alert.alert(t('common.error'), t('common.tryAgain'));
            }
          },
        },
      ]
    );
  }, [deleteSale, loadCustomers, loadAll, t]);

  const handleDeleteCustomer = useCallback(() => {
    if (!customer) return;
    Alert.alert(
      t('customers.deleteAccountTitle'),
      t('customers.deleteAccountMsg', { name: customer.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('customers.deleteAccountConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer(customer.id);
              router.back();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : '';
              if (msg === 'CUSTOMER_HAS_SALES') {
                Alert.alert(t('common.error'), t('customers.deleteBlockedSales'));
              } else if (msg === 'CUSTOMER_HAS_ACTIVE_DEBTS') {
                Alert.alert(t('common.error'), t('customers.deleteBlockedDebts'));
              } else {
                Alert.alert(t('common.error'), t('common.tryAgain'));
              }
            }
          },
        },
      ]
    );
  }, [customer, deleteCustomer, router, t]);

  const handleExportPDF = useCallback(async () => {
    if (!customer) return;
    try {
      const { shareCustomerReport } = await import('@/lib/generateInvoice');
      const { loadBusiness } = await import('@/lib/sqlite');
      const biz = await loadBusiness();
      await shareCustomerReport(customer, sales, debts, {
        name: biz?.name ?? 'My Business',
        phone: biz?.phone ?? '',
        address: biz?.address ?? '',
        logoUri: biz?.logoPath ?? null,
      });
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, [customer, sales, debts]);

  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('customers.title')} showBack />
      </View>
    );
  }

  if (!customer && !loading) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('customers.notFound')} />
        <Text style={[styles.notFound, { color: colors.gray500 }]}>{t('customers.notFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.backBtnText, { color: colors.white }]}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeDebts = debts.filter((d) => d.status === 'active' && d.remainingAmount > 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.paidAmount, 0);
  const canDeleteAccount = sales.length === 0 && activeDebts.length === 0;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.gray50 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title={customer?.name ?? '…'}
        showBack
        rightAction={
          <HeaderActionButton
            icon="create-outline"
            onPress={() => router.push(`/(app)/customers/edit/${id}` as never)}
          />
        }
      >

        {/* Phone + address chips */}
        {customer && (
          <View style={styles.chipsRow}>
            {customer.phone ? (
              <View style={styles.chip}>
                <Ionicons name="call-outline" size={12} color="#fff" />
                <Text style={styles.chipText}>{customer.phone}</Text>
              </View>
            ) : null}
            {customer.address ? (
              <View style={styles.chip}>
                <Ionicons name="location-outline" size={12} color="#fff" />
                <Text style={styles.chipText} numberOfLines={1}>{customer.address}</Text>
              </View>
            ) : null}
          </View>
        )}

      </AppHeader>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Stats grid */}
          {customer && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220 }}
              style={styles.statsGrid}
            >
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.white }]}>
                  <Ionicons name="cash-outline" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
                  <CompactAmount value={customer.totalPurchases} showCurrency={false} style={[styles.statVal, { color: colors.black }]} />
                  <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('customers.totalSpent')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.white }]}>
                  <Ionicons name="receipt-outline" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
                  <Text style={[styles.statVal, { color: colors.black }]}>{customer.saleCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('customers.totalInvoices')}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.white }, customer.remainingDebt > 0 && { backgroundColor: errorTint.bg, borderWidth: 1, borderColor: colors.error }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={customer.remainingDebt > 0 ? colors.error : colors.gray300} style={{ marginBottom: 4 }} />
                  <CompactAmount
                    value={customer.remainingDebt}
                    showCurrency={false}
                    style={[styles.statVal, { color: customer.remainingDebt > 0 ? colors.error : colors.black }]}
                  />
                  <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('customers.remainingDebt')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.white }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={totalPaid > 0 ? colors.success : colors.gray300} style={{ marginBottom: 4 }} />
                  <CompactAmount
                    value={totalPaid}
                    showCurrency={false}
                    style={[styles.statVal, { color: totalPaid > 0 ? colors.success : colors.black }]}
                  />
                  <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('customers.totalPaid')}</Text>
                </View>
              </View>
              {sales.length > 0 ? (
                <View style={[styles.activityRow, { backgroundColor: colors.white, flexDirection }]}>
                  <Ionicons name="time-outline" size={14} color={colors.gray400} />
                  <Text style={[styles.activityText, { color: colors.gray500 }]}>
                    {t('customers.lastActivity')}: <DateText value={sales[0].date ?? sales[0].createdAt} size="small" />
                  </Text>
                </View>
              ) : null}
            </MotiView>
          )}

          {/* Active debts */}
          {activeDebts.length > 0 && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 60 }}
              style={[styles.section, { backgroundColor: colors.white }]}
            >
              <Text style={sectionTitleStyle}>{t('customers.outstandingDebts')}</Text>
              {activeDebts.map((debt) => {
                const matchedSale = sales.find((s) => s.id === debt.saleId);
                return (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    invoiceNumber={matchedSale?.invoiceNumber}
                    onPayment={handlePayment}
                  />
                );
              })}
            </MotiView>
          )}

          {/* Financial timeline — permanent debt lifecycle history (created → payments → fully paid) */}
          {timeline.length > 0 && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 80 }}
              style={[styles.section, { backgroundColor: colors.white }]}
            >
              <Text style={sectionTitleStyle}>{t('customers.financialTimeline')}</Text>
              {timeline.map((event, i) => {
                const prev = timeline[i - 1];
                const showDivider = prev && prev.debtId !== event.debtId;
                return (
                  <React.Fragment key={`${event.debtId}-${event.paymentId ?? 'settled'}-${event.type}`}>
                    {showDivider && <View style={[styles.timelineDivider, { backgroundColor: colors.gray100 }]} />}
                    <FinancialTimelineItem event={event} isLast={i === timeline.length - 1} />
                  </React.Fragment>
                );
              })}
            </MotiView>
          )}

          {/* Purchase timeline */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 120 }}
            style={[styles.section, { backgroundColor: colors.white }]}
          >
            <Text style={sectionTitleStyle}>{t('customers.purchaseHistory')} ({sales.length})</Text>
            {sales.length === 0 ? (
              <Text style={[styles.noData, { color: colors.gray400 }]}>{t('customers.noHistory')}</Text>
            ) : (
              <View style={styles.timeline}>
                {sales.map((sale, i) => (
                  <SaleTimelineItem
                    key={sale.id}
                    sale={sale}
                    isLast={i === sales.length - 1}
                    onPress={() => router.push(`/(app)/sales/${sale.id}` as never)}
                    onShare={() => handleShareInvoice(sale)}
                    onEdit={() => router.push(`/(app)/sales/edit/${sale.id}` as never)}
                    onDelete={() => handleDeleteSale(sale)}
                  />
                ))}
              </View>
            )}
          </MotiView>

          {/* Notes */}
          {customer?.notes && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 160 }}
              style={[styles.section, { backgroundColor: colors.white }]}
            >
              <Text style={sectionTitleStyle}>{t('customers.notesLabel')}</Text>
              <Text style={[styles.notesText, { color: colors.black }]}>{customer.notes}</Text>
            </MotiView>
          )}

          {/* Danger Zone — Delete Customer Account */}
          {customer && (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 200 }}
              style={[styles.section, { borderWidth: 1, borderColor: colors.error, backgroundColor: colors.white }]}
            >
              <Text style={sectionTitleStyle}>
                {t('customers.deleteAccountSection')}
              </Text>

              {!canDeleteAccount ? (
                <>
                  <View style={[styles.deleteWarningBox, { backgroundColor: warningTint.bg, flexDirection }]}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                    <Text style={[styles.deleteWarningText, { color: colors.gray600, textAlign, writingDirection }]}>
                      {sales.length > 0
                        ? t('customers.deleteBlockedSalesHint', { count: sales.length })
                        : t('customers.deleteBlockedDebtsHint')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.deleteAccountBtn, { borderColor: colors.gray200, backgroundColor: colors.gray50, flexDirection }]}
                    disabled
                    activeOpacity={1}
                  >
                    <Ionicons name="person-remove-outline" size={16} color={colors.gray400} />
                    <Text style={[styles.deleteAccountBtnText, { color: colors.gray400 }]}>
                      {t('customers.deleteAccount')}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.deleteAccountBtn, { borderColor: colors.error, backgroundColor: errorTint.bg, flexDirection }]}
                  onPress={handleDeleteCustomer}
                  activeOpacity={0.82}
                >
                  <Ionicons name="person-remove-outline" size={16} color={colors.error} />
                  <Text style={[styles.deleteAccountBtnText, { color: colors.error }]}>
                    {t('customers.deleteAccount')}
                  </Text>
                </TouchableOpacity>
              )}
            </MotiView>
          )}
        </KeyboardAwareScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: AppColors) {
  return StyleSheet.create({
  container:              { flex: 1 },
  loadWrap:               { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingCenter:          { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:               { fontSize: 15, marginBottom: 16 },
  backBtn:                { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Theme.radius.md },
  backBtnText:            { fontWeight: '600', fontSize: 14 },
  // chipsRow/chip sit inside AppHeader's gradient — theme-invariant.
  chipsRow:               { flexDirection: 'row', paddingHorizontal: 20, gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  chip:                   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipText:               { fontSize: 12, color: '#fff', fontWeight: '500' },
  scroll:                 { padding: 16, paddingBottom: 40 },
  statsGrid:              { marginBottom: 14, gap: 10 },
  statsRow:               { flexDirection: 'row', gap: 10 },
  statCard:               { flex: 1, borderRadius: Theme.radius.card, padding: 14, alignItems: 'center', ...Theme.shadow.soft },
  statVal:                { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statLabel:              { fontSize: 11, fontWeight: '500' },
  section:                { borderRadius: Theme.radius.card, padding: 16, marginBottom: 14, ...Theme.shadow.soft },
  sectionTitle:           { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  timeline:               { gap: 0 },
  noData:                 { fontSize: 13, fontStyle: 'italic' },
  notesText:              { fontSize: 14, lineHeight: 20 },
  activityRow:            { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Theme.radius.card, paddingHorizontal: 14, paddingVertical: 10, ...Theme.shadow.soft },
  activityText:           { fontSize: 12, fontWeight: '500' },
  timelineDivider:        { height: 1, marginVertical: 10 },
  // Danger Zone
  deleteWarningBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: Theme.radius.md, padding: 12, marginBottom: 12 },
  deleteWarningText:      { flex: 1, fontSize: 13, lineHeight: 18 },
  deleteAccountBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Theme.radius.md, paddingVertical: 12, borderWidth: 1.5 },
  deleteAccountBtnText:   { fontSize: 14, fontWeight: '700' },
  });
}
