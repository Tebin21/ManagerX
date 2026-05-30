import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { DebtCard } from '@/components/customers/DebtCard';
import { SaleTimelineItem } from '@/components/customers/SaleTimelineItem';
import { useCustomerStore, fetchCustomerSales, fetchCustomerDebts } from '@/store/customerStore';
import { useSalesStore } from '@/store/salesStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import type { CustomerWithStats } from '@/types/customers';
import type { Sale, Debt } from '@/types/sales';

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { customers, addDebtPayment, loadCustomers } = useCustomerStore();
  const { deleteSale } = useSalesStore();

  const [sales, setSales] = useState<Sale[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const { colors } = useAppTheme();
  const customer: CustomerWithStats | undefined = customers.find((c) => c.id === Number(id));

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        fetchCustomerSales(Number(id)),
        fetchCustomerDebts(Number(id)),
      ]);
      setSales(s);
      setDebts(d);
    } catch (err) {
      console.error('Failed to load customer data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDeleteSale = useCallback((sale: Sale) => {
    Alert.alert(
      t('sales.deleteTitle'),
      t('sales.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('sales.confirmDelete'),
          style: 'destructive',
          onPress: async () => {
            await deleteSale(sale.id);
            await loadCustomers();
            await loadAll();
          },
        },
      ]
    );
  }, [deleteSale, loadCustomers, loadAll]);

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
    await addDebtPayment(debtId, amount);
    await loadAll();
  }, [addDebtPayment, loadAll]);

  const handleCall = useCallback(() => {
    if (!customer?.phone) return;
    Linking.openURL(`tel:${customer.phone}`);
  }, [customer]);

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
          <Text style={styles.backBtnText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeDebts = debts.filter((d) => d.status === 'active' && d.remainingAmount > 0);
  const firstPurchase = sales.length > 0
    ? new Date(sales[sales.length - 1].createdAt).toLocaleDateString()
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
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
              <TouchableOpacity style={styles.chip} onPress={handleCall}>
                <Ionicons name="call-outline" size={12} color="#fff" />
                <Text style={styles.chipText}>{customer.phone}</Text>
              </TouchableOpacity>
            ) : null}
            {customer.address ? (
              <View style={styles.chip}>
                <Ionicons name="location-outline" size={12} color="#fff" />
                <Text style={styles.chipText} numberOfLines={1}>{customer.address}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {customer?.phone && (
            <TouchableOpacity style={[styles.qaBtn, { backgroundColor: colors.white }]} onPress={handleCall}>
              <Ionicons name="call" size={18} color={colors.primary} />
              <Text style={[styles.qaBtnText, { color: colors.primary }]}>{t('customers.call')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.qaBtn, { backgroundColor: colors.white }]}
            onPress={() => router.push('/(app)/sales/new-sale' as never)}
          >
            <Ionicons name="cart" size={18} color={colors.primary} />
            <Text style={[styles.qaBtnText, { color: colors.primary }]}>{t('customers.newSale')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qaBtn, { backgroundColor: colors.white }]} onPress={handleExportPDF}>
            <Ionicons name="document-text" size={18} color={colors.primary} />
            <Text style={[styles.qaBtnText, { color: colors.primary }]}>{t('customers.exportPDF')}</Text>
          </TouchableOpacity>
        </View>
      </AppHeader>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                  <Text style={[styles.statVal, { color: colors.black }]}>{customer.totalPurchases.toLocaleString('en-US')}</Text>
                  <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('customers.totalSpent')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.white }]}>
                  <Text style={[styles.statVal, { color: colors.black }]}>{customer.saleCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('customers.totalInvoices')}</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.white }, customer.remainingDebt > 0 && styles.statCardDebt]}>
                  <Text style={[styles.statVal, { color: customer.remainingDebt > 0 ? colors.error : colors.black }]}>
                    {customer.remainingDebt.toLocaleString('en-US')}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('customers.remainingDebt')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.white }]}>
                  <Text style={[styles.statVal, { color: colors.black }]}>{firstPurchase ?? '—'}</Text>
                  <Text style={[styles.statLabel, { color: colors.gray400 }]}>{t('customers.firstPurchase')}</Text>
                </View>
              </View>
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
              <Text style={[styles.sectionTitle, { color: colors.gray400 }]}>{t('customers.outstandingDebts')}</Text>
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

          {/* Purchase timeline */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220, delay: 120 }}
            style={[styles.section, { backgroundColor: colors.white }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.gray400 }]}>{t('customers.purchaseHistory')} ({sales.length})</Text>
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
              <Text style={[styles.sectionTitle, { color: colors.gray400 }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.black }]}>{customer.notes}</Text>
            </MotiView>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  loadWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingCenter:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:     { fontSize: 15, marginBottom: 16 },
  backBtn:      { paddingHorizontal: 20, paddingVertical: 10, borderRadius: Theme.radius.md },
  backBtnText:  { color: '#fff', fontWeight: '600', fontSize: 14 },
  gradHeader:   { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 },
  chipsRow:     { flexDirection: 'row', paddingHorizontal: 20, gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipText:     { fontSize: 12, color: '#fff', fontWeight: '500' },
  quickActions: { flexDirection: 'row', marginHorizontal: 16, gap: 10 },
  qaBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 10 },
  qaBtnText:    { fontSize: 12, fontWeight: '700' },
  scroll:       { padding: 16, paddingBottom: 40 },
  statsGrid:    { marginBottom: 14, gap: 10 },
  statsRow:     { flexDirection: 'row', gap: 10 },
  statCard:     { flex: 1, borderRadius: Theme.radius.card, padding: 14, ...Theme.shadow.soft },
  statCardDebt: { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FECACA' },
  statVal:      { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statValDebt:  { },
  statLabel:    { fontSize: 11, fontWeight: '500' },
  section:      { borderRadius: Theme.radius.card, padding: 16, marginBottom: 14, ...Theme.shadow.soft },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  timeline:     { gap: 0 },
  noData:       { fontSize: 13, fontStyle: 'italic' },
  notesText:    { fontSize: 14, lineHeight: 20 },
});
