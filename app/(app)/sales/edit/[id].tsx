import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { useCustomerStore } from '@/store/customerStore';
import { getSaleById } from '@/lib/sqlite';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useRTL } from '@/lib/rtl';
import type { Sale } from '@/types/sales';

export default function EditInvoiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { editSaleInfo } = useCustomerStore();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName]       = useState('');
  const [customerPhone, setCustomerPhone]     = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [warranty, setWarranty]               = useState('');
  const [notes, setNotes]                     = useState('');
  const [extraPayment, setExtraPayment]       = useState('');
  const [discountDelta, setDiscountDelta]     = useState('');

  useEffect(() => {
    (async () => {
      if (!id) return;
      const s = await getSaleById(Number(id));
      if (s) {
        setSale(s);
        setCustomerName(s.customerName ?? '');
        setCustomerPhone(s.customerPhone ?? '');
        setCustomerAddress(s.customerAddress ?? '');
        setWarranty(s.warranty ?? '');
        setNotes(s.notes ?? '');
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!sale) return;
    const extra = parseFloat(extraPayment) || 0;
    const delta = parseFloat(discountDelta) || 0;

    if (extra < 0 || delta < 0) {
      Alert.alert(t('common.error'), t('purchases.validationBuyPrice'));
      return;
    }
    if (extra > (sale.remainingDebt ?? 0)) {
      Alert.alert(t('common.error'), `${t('common.error')}: max ${(sale.remainingDebt ?? 0).toLocaleString('en-US')} IQD`);
      return;
    }

    setSaving(true);
    try {
      await editSaleInfo(sale.id, {
        customerName:    customerName.trim()    || undefined,
        customerPhone:   customerPhone.trim()   || undefined,
        customerAddress: customerAddress.trim() || undefined,
        warranty:        warranty.trim()        || undefined,
        notes:           notes.trim()           || undefined,
        extraPayment:    extra > 0 ? extra : undefined,
        discountDelta:   delta > 0 ? delta : undefined,
      });
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return (
      <View style={styles.loadWrap}>
        <AppHeader title="" showBack />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadWrap}>
        <AppHeader title="" />
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.loadWrap}>
        <AppHeader title={t('sales.saleNotFound')} />
        <Text style={styles.notFound}>{t('sales.saleNotFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={`${t('common.edit')} ${sale.invoiceNumber}`} showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Invoice summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { textAlign }]}>{t('sales.grandTotal')}</Text>
            <Text style={styles.summaryValue}>{sale.grandTotal.toLocaleString('en-US')} IQD</Text>
          </View>
          {sale.remainingDebt > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { textAlign }]}>{t('sales.remainingDebt')}</Text>
              <Text style={[styles.summaryValue, styles.debtValue]}>
                {sale.remainingDebt.toLocaleString('en-US')} IQD
              </Text>
            </View>
          )}
        </View>

        {/* Customer info */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign }]}>{t('sales.customerInfo')}</Text>

          <Text style={[styles.label, { textAlign }]}>{t('sales.customerName')}</Text>
          <TextInput
            style={[styles.input, { textAlign }]}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder={t('sales.customerName')}
            placeholderTextColor={Colors.gray300}
          />

          <Text style={[styles.label, { textAlign }]}>{t('sales.customerPhone')}</Text>
          <TextInput
            style={styles.input}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder={t('sales.customerPhone')}
            placeholderTextColor={Colors.gray300}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { textAlign }]}>{t('sales.customerAddress')}</Text>
          <TextInput
            style={[styles.input, { textAlign }]}
            value={customerAddress}
            onChangeText={setCustomerAddress}
            placeholder={t('sales.customerAddress')}
            placeholderTextColor={Colors.gray300}
          />
        </View>

        {/* Additional */}
        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign }]}>{t('purchases.additionalSection')}</Text>

          <Text style={[styles.label, { textAlign }]}>{t('sales.warranty')}</Text>
          <TextInput
            style={[styles.input, { textAlign }]}
            value={warranty}
            onChangeText={setWarranty}
            placeholder={t('purchases.warranty')}
            placeholderTextColor={Colors.gray300}
          />

          <Text style={[styles.label, { textAlign }]}>{t('sales.notes')}</Text>
          <TextInput
            style={[styles.input, styles.textarea, { textAlign }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('purchases.notes')}
            placeholderTextColor={Colors.gray300}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Payment adjustments */}
        {sale.remainingDebt > 0 && (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { textAlign }]}>{t('debt.recordPayment')}</Text>
            <Text style={[styles.helperText, { textAlign }]}>
              {t('sales.remainingDebt')}: {sale.remainingDebt.toLocaleString('en-US')} IQD
            </Text>
            <Text style={[styles.label, { textAlign }]}>{t('sales.paidNow')}</Text>
            <TextInput
              style={styles.input}
              value={extraPayment}
              onChangeText={setExtraPayment}
              placeholder="0"
              placeholderTextColor={Colors.gray300}
              keyboardType="decimal-pad"
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { textAlign }]}>{t('sales.totalDiscount')}</Text>
          <Text style={[styles.label, { textAlign }]}>{t('sales.discount')}</Text>
          <TextInput
            style={styles.input}
            value={discountDelta}
            onChangeText={setDiscountDelta}
            placeholder="0"
            placeholderTextColor={Colors.gray300}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{t('common.saveChanges')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  loadWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:  { fontSize: 15, color: Colors.gray500 },
  gradHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 },
  scroll: { padding: 16, paddingBottom: 48 },

  summaryCard: {
    backgroundColor: Colors.softBlue,
    borderRadius: Theme.radius.md,
    padding: 14,
    marginBottom: 14,
    gap: 6,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: Colors.primaryDark, fontWeight: '500' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  debtValue: { color: Colors.error },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.card,
    padding: 16,
    marginBottom: 14,
    ...Theme.shadow.soft,
  },
  cardTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.gray400,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  helperText: { fontSize: 12, color: Colors.gray500, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.gray500, marginBottom: 6 },
  input: {
    height: Theme.input.height,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    borderRadius: Theme.input.borderRadius,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.black,
    backgroundColor: Colors.white,
    marginBottom: 14,
  },
  textarea: { height: 84, textAlignVertical: 'top', paddingTop: 12 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Theme.radius.md,
    paddingVertical: 16, ...Theme.shadow.button,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
