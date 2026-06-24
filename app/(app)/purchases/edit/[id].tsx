import React, { useEffect, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { KeyboardAwareScrollView } from '@/components/common/KeyboardAwareScrollView';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { LockedFieldRow } from '@/components/ui/LockedFieldRow';
import { ProductImagePicker } from '@/components/ui/ProductImagePicker';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { useAppTheme } from '@/contexts/ThemeContext';
import { usePurchaseStore } from '@/store/purchaseStore';
import { getPurchaseById, getSoldQuantityForPurchase } from '@/lib/sqlite';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import type { Purchase } from '@/types/purchases';
import { fmtIQD, fmtUSD } from '@/utils/formatters';
import { roundToNearest250 } from '@/utils/rounding';
import { useRTL } from '@/lib/rtl';


export default function EditPurchaseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { updatePurchase } = usePurchaseStore();
  const { isRTL, flexDirection, writingDirection } = useRTL();

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [productName, setProductName] = useState('');
  const [category, setCategory]       = useState('');
  const [sellPriceIQD, setSellPriceIQD] = useState('');
  const [sellPriceUSD, setSellPriceUSD] = useState('');
  const [warranty, setWarranty]       = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes]             = useState('');
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [soldQty, setSoldQty]         = useState(0);

  const exchangeRate = purchase?.exchangeRate ?? 1500;
  const buyNum  = purchase?.buyPriceIQD ?? 0;
  const sellNum = parseFloat(sellPriceIQD) || 0;
  const qty     = purchase?.quantity ?? 0;
  const profitIQD = (sellNum - buyNum) * qty;

  useEffect(() => {
    (async () => {
      if (!id) return;
      const p = await getPurchaseById(Number(id));
      if (p) {
        setPurchase(p);
        setProductName(p.productName);
        setCategory(p.category ?? '');
        setSellPriceIQD(String(p.sellPriceIQD));
        setSellPriceUSD(String(p.sellPriceUSD));
        setWarranty(p.warranty ?? '');
        setDescription(p.description ?? '');
        setNotes(p.notes ?? '');
        setImageUri(p.imageUri ?? null);
        const sold = await getSoldQuantityForPurchase(p.id);
        setSoldQty(sold);
      }
      setLoading(false);
    })();
  }, [id]);

  const syncSellUSD = (iqd: string) => {
    setSellPriceIQD(iqd);
    const n = parseFloat(iqd);
    if (!isNaN(n) && exchangeRate > 0) setSellPriceUSD((n / exchangeRate).toFixed(2));
  };

  const syncSellIQD = (usd: string) => {
    setSellPriceUSD(usd);
    const n = parseFloat(usd);
    if (!isNaN(n)) setSellPriceIQD(String(roundToNearest250(n * exchangeRate)));
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert(t('common.error'), t('purchases.validationRequired'));
      return;
    }

    setSaving(true);
    try {
      await updatePurchase(Number(id), {
        productName: productName.trim(),
        category: category.trim() || null,
        sellPriceIQD: roundToNearest250(sellNum),
        sellPriceUSD: parseFloat(sellPriceUSD) || 0,
        warranty: warranty.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
        imageUri,
      });
      router.back();
    } catch (err: any) {
      console.error(err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  if (!id || isNaN(Number(id))) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title="" showBack />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('purchases.editTitle')} showBack />
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!purchase) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('purchases.editTitle')} showBack />
        <Text style={[styles.notFound, { color: colors.gray500 }]}>{t('common.notFound')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.gray50 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title={`${t('purchases.editPurchase')} · ${purchase.purchaseNumber}`} showBack />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200 }}
        >
          {/* Product image */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.productImage')}</Text>
            <ProductImagePicker
              uri={imageUri}
              onSelect={setImageUri}
              onRemove={() => setImageUri(null)}
            />
          </PremiumCard>

          {/* Supplier info (read-only) */}
          {purchase.supplierName && (
            <PremiumCard style={styles.card}>
              <Text style={[styles.cardTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.supplierSection')}</Text>
              <View style={[styles.infoRow, { borderBottomColor: colors.gray100, flexDirection }]}>
                <Text style={[styles.infoLabel, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.supplierName')}</Text>
                <Text style={[styles.infoValue, { color: colors.black, textAlign: 'right' }]}>{purchase.supplierName}</Text>
              </View>
              {purchase.supplierPhone ? (
                <View style={[styles.infoRow, { borderBottomColor: colors.gray100, flexDirection }]}>
                  <Text style={[styles.infoLabel, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.supplierPhone')}</Text>
                  <Text style={[styles.infoValue, { color: colors.black, textAlign: 'right' }]}>{purchase.supplierPhone}</Text>
                </View>
              ) : null}
            </PremiumCard>
          )}

          {/* Product info */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.productInfo')}</Text>
            <LockedFieldRow
              label={t('purchases.date')}
              value={purchase.date}
              caption={t('purchases.dateLockedNote')}
              valueNumeric
            />
            <AppTextInput
              label={`${t('purchases.productName')} *`}
              value={productName}
              onChangeText={setProductName}
              placeholder={t('purchases.productNamePlaceholder')}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <AppTextInput
              label={t('purchases.category')}
              value={category}
              onChangeText={setCategory}
              placeholder={t('common.optional')}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <LockedFieldRow
              label={t('purchases.qty')}
              value={String(qty)}
              caption={t('purchases.quantityLockedNote')}
              valueNumeric
            />
            <Text style={[styles.hintText, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left', writingDirection }]}>
              {t('purchases.soldAvailableHint', { sold: soldQty, available: Math.max(0, qty - soldQty) })}
            </Text>
          </PremiumCard>

          {/* Pricing */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.pricingInfo')}</Text>
            <View style={[styles.priceRow, { flexDirection }]}>
              <View style={{ flex: 1 }}>
                <LockedFieldRow
                  label={`${t('purchases.buyPrice')} (IQD)`}
                  value={fmtIQD(purchase.buyPriceIQD)}
                  caption={t('purchases.buyPriceLockedNote')}
                  valueNumeric
                />
              </View>
              <View style={{ flex: 1 }}>
                <LockedFieldRow
                  label={`${t('purchases.buyPrice')} (USD)`}
                  value={fmtUSD(purchase.buyPriceUSD)}
                  valueNumeric
                />
              </View>
            </View>
            <View style={[styles.priceRow, { flexDirection }]}>
              <View style={{ flex: 1 }}>
                <AppTextInput
                  label={`${t('purchases.sellPrice')} (IQD)`}
                  value={sellPriceIQD}
                  onChangeText={syncSellUSD}
                  onEndEditing={() => {
                    const r = roundToNearest250(parseFloat(sellPriceIQD) || 0);
                    setSellPriceIQD(String(r));
                    if (exchangeRate > 0) setSellPriceUSD((r / exchangeRate).toFixed(2));
                  }}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  style={{ textAlign: 'left', writingDirection: 'ltr' }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppTextInput
                  label={`${t('purchases.sellPrice')} (USD)`}
                  value={sellPriceUSD}
                  onChangeText={syncSellIQD}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  style={{ textAlign: 'left', writingDirection: 'ltr' }}
                />
              </View>
            </View>

            {/* Live totals */}
            <View style={[styles.totalBox, { backgroundColor: colors.softBlue }]}>
              <View style={[styles.totalRow, { flexDirection }]}>
                <Text style={[styles.totalLabel, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.autoTotal')}</Text>
                <AmountText value={purchase.totalIQD} currency="IQD" style={[styles.totalValue, { color: colors.primary, textAlign: 'right' }]} />
              </View>
              {sellNum > 0 && (
                <View style={[styles.totalRow, { flexDirection }]}>
                  <Text style={[styles.totalLabel, { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.profitLabel')}</Text>
                  <AmountText
                    value={profitIQD}
                    currency="IQD"
                    prefix={profitIQD >= 0 ? '+' : ''}
                    style={[styles.totalValue, { color: profitIQD >= 0 ? Colors.success : Colors.error, textAlign: 'right' }]}
                  />
                </View>
              )}
            </View>
          </PremiumCard>

          {/* Payment status */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.paymentInfo')}</Text>
            <LockedFieldRow
              label={t('purchases.paymentInfo')}
              value={purchase.paymentStatus === 'paid' ? t('common.paid') : t('common.debt')}
              caption={t('purchases.paymentStatusLockedNote')}
            />
            {purchase.paymentStatus === 'debt' && (
              <View style={[styles.debtNote, { backgroundColor: '#FFF7ED' }]}>
                <Text style={[styles.debtNoteText, { color: Colors.warning, writingDirection }]}>
                  <AmountText value={purchase.totalIQD} currency="IQD" variant="small" style={[styles.debtNoteText, { color: Colors.warning }]} /> {t('common.debt')}
                </Text>
              </View>
            )}
          </PremiumCard>

          {/* Additional info */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.additionalInfo')}</Text>
            <AppTextInput
              label={t('purchases.warranty')}
              value={warranty}
              onChangeText={setWarranty}
              placeholder={t('common.optional')}
              returnKeyType="next"
            />
            <AppTextInput
              label={t('purchases.description')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('common.optional')}
              multiline
              returnKeyType="next"
            />
            <AppTextInput
              label={t('purchases.notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('purchases.notesPlaceholder')}
              multiline
              returnKeyType="done"
            />
          </PremiumCard>

          <PrimaryButton
            label={saving ? t('purchases.saving') : t('purchases.saveChanges')}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
          <View style={{ height: 32 }} />
        </MotiView>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  wrap:      { flex: 1 },
  scroll:    { padding: 16, paddingBottom: 48 },
  notFound:  { textAlign: 'center', marginTop: 40, fontSize: 16 },

  card: { marginBottom: 14 },
  cardTitle: {
    fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 14,
  },

  priceRow: { flexDirection: 'row', gap: 10 },

  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, marginBottom: 4 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  hintText:  { fontSize: 12, marginTop: -2, marginBottom: 8 },

  totalBox: { borderRadius: Theme.radius.md, padding: 14, marginTop: 10, gap: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:{ fontSize: 13 },
  totalValue:{ fontSize: 15, fontWeight: '800' },

  debtNote:     { borderRadius: Theme.radius.md, padding: 12, marginTop: 12, alignItems: 'center' },
  debtNoteText: { fontSize: 14, fontWeight: '700' },
});
