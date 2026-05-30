import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/common/AppHeader';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { ProductImagePicker } from '@/components/ui/ProductImagePicker';
import { useTranslation } from 'react-i18next';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import { PURCHASE_CATEGORIES } from '@/types/purchases';
import type { PurchaseIdType, PurchasePaymentStatus } from '@/types/purchases';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function round(n: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function NewPurchaseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { textAlign } = useRTL();
  const { createPurchase } = usePurchaseStore();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);

  // ─── Required fields ────────────────────────────────────────────────────────
  const [supplierName, setSupplierName]     = useState('');
  const [date, setDate]                     = useState(todayISO());
  const [productName, setProductName]       = useState('');
  const [qty, setQty]                       = useState('1');
  const [buyIQD, setBuyIQD]                 = useState('');
  const [buyUSD, setBuyUSD]                 = useState('');

  // ─── ID type ────────────────────────────────────────────────────────────────
  const [idType, setIdType]                 = useState<PurchaseIdType | null>(null);
  const [sharedId, setSharedId]             = useState('');
  const [customIds, setCustomIds]           = useState<string[]>(['']);

  // ─── Optional fields ────────────────────────────────────────────────────────
  const [sellIQD, setSellIQD]               = useState('');
  const [sellUSD, setSellUSD]               = useState('');
  const [category, setCategory]             = useState('');
  const [warranty, setWarranty]             = useState('');
  const [description, setDescription]       = useState('');
  const [notes, setNotes]                   = useState('');
  const [supplierPhone, setSupplierPhone]   = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [paymentStatus, setPaymentStatus]   = useState<PurchasePaymentStatus>('paid');

  const [imageUri, setImageUri]             = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const qtyNum     = Math.max(1, parseInt(qty) || 1);
  const buyIQDNum  = parseFloat(buyIQD) || 0;
  const sellIQDNum = parseFloat(sellIQD) || 0;
  const totalIQD   = qtyNum * buyIQDNum;
  const profitIQD  = (sellIQDNum - buyIQDNum) * qtyNum;

  // ─── Currency sync ──────────────────────────────────────────────────────────
  function onBuyIQDChange(val: string) {
    setBuyIQD(val);
    const n = parseFloat(val) || 0;
    setBuyUSD(n > 0 ? String(round(n / exchangeRate, 2)) : '');
  }

  function onBuyUSDChange(val: string) {
    setBuyUSD(val);
    const n = parseFloat(val) || 0;
    setBuyIQD(n > 0 ? String(round(n * exchangeRate, 0)) : '');
  }

  function onSellIQDChange(val: string) {
    setSellIQD(val);
    const n = parseFloat(val) || 0;
    setSellUSD(n > 0 ? String(round(n / exchangeRate, 2)) : '');
  }

  function onSellUSDChange(val: string) {
    setSellUSD(val);
    const n = parseFloat(val) || 0;
    setSellIQD(n > 0 ? String(round(n * exchangeRate, 0)) : '');
  }

  // ─── Qty change → rebuild custom ID slots ─────────────────────────────────
  function onQtyChange(val: string) {
    setQty(val);
    const n = Math.min(100, Math.max(1, parseInt(val) || 1));
    if (idType === 'custom') {
      setCustomIds((prev) => {
        const next = Array.from({ length: n }, (_, i) => prev[i] ?? '');
        return next;
      });
    }
  }

  // ─── ID type selection ──────────────────────────────────────────────────────
  function selectIdType(type: PurchaseIdType) {
    setIdType(type);
    if (type === 'custom') {
      setCustomIds(Array.from({ length: qtyNum }, (_, i) => customIds[i] ?? ''));
    }
  }

  function updateCustomId(idx: number, val: string) {
    setCustomIds((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }

  // ─── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    if (!productName.trim()) {
      Alert.alert(t('common.required'), t('purchases.validationRequired'));
      return false;
    }
    if (!date.trim()) {
      Alert.alert(t('common.required'), t('purchases.validationDate'));
      return false;
    }
    const q = parseInt(qty) || 0;
    if (q < 1 || q > 100) {
      Alert.alert(t('common.error'), t('purchases.validationQty'));
      return false;
    }
    if (buyIQDNum <= 0) {
      Alert.alert(t('common.required'), t('purchases.validationBuyPrice'));
      return false;
    }
    if (!idType) {
      Alert.alert(t('common.required'), t('purchases.validationIdType'));
      return false;
    }
    return true;
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return;

    const finalItemIds =
      idType === 'shared'
        ? [sharedId.trim()]
        : customIds.map((v) => v.trim());

    setIsSubmitting(true);
    try {
      const purchase = await createPurchase({
        date,
        supplierName,
        supplierPhone,
        supplierAddress,
        productName,
        category,
        quantity: qtyNum,
        buyPriceIQD: buyIQDNum,
        buyPriceUSD: parseFloat(buyUSD) || round(buyIQDNum / exchangeRate, 2),
        sellPriceIQD: sellIQDNum,
        sellPriceUSD: parseFloat(sellUSD) || round(sellIQDNum / exchangeRate, 2),
        exchangeRate,
        idType,
        itemIds: finalItemIds,
        warranty,
        description,
        notes,
        paymentStatus,
        imageUri,
      });

      router.replace(`/(app)/purchases/${purchase.id}?new=1` as never);
    } catch (err) {
      console.error('Failed to save purchase:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
      setIsSubmitting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('purchases.newPurchase')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Card 1: Required ──────────────────────────────── */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.gray500, borderBottomColor: colors.gray100, textAlign }]}>{t('purchases.requiredInfo')}</Text>

            <AppTextInput
              label={t('purchases.productName')}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. iPhone 16 Pro"
              returnKeyType="next"
            />

            <AppTextInput
              label={t('purchases.date')}
              value={date}
              onChangeText={setDate}
              placeholder={t('purchases.datePlaceholder')}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
            />

            <AppTextInput
              label={t('purchases.supplierName')}
              value={supplierName}
              onChangeText={setSupplierName}
              placeholder="e.g. Apple Inc."
              returnKeyType="next"
            />

            <AppTextInput
              label={t('purchases.qty')}
              value={qty}
              onChangeText={onQtyChange}
              keyboardType="number-pad"
              placeholder="1"
              returnKeyType="next"
            />

            {/* Buy Price Row */}
            <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>{t('purchases.buyPrice')}</Text>
            <View style={styles.priceRow}>
              <View style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
                <Text style={[styles.currencyBadge, { color: colors.primary, backgroundColor: colors.softBlue }]}>IQD</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.black }]}
                  value={buyIQD}
                  onChangeText={onBuyIQDChange}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.gray400}
                  returnKeyType="next"
                />
              </View>
              <View style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
                <Text style={[styles.currencyBadge, { color: colors.primary, backgroundColor: colors.softBlue }]}>USD</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.black }]}
                  value={buyUSD}
                  onChangeText={onBuyUSDChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.gray400}
                  returnKeyType="next"
                />
              </View>
            </View>
            <Text style={[styles.rateNote, { color: colors.gray400, textAlign }]}>{t('purchases.rateNote', { rate: exchangeRate.toLocaleString('en-US') })}</Text>

            {/* Auto Total */}
            <View style={[styles.totalBox, { backgroundColor: colors.softBlue, borderColor: colors.mediumBlue }]}>
              <Text style={[styles.totalLabel, { color: colors.gray500 }]}>{t('purchases.autoTotal')}</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>{fmt(totalIQD)} IQD</Text>
            </View>

            {/* ID Type */}
            <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>{t('purchases.idType')}</Text>
            <View style={styles.idTypeRow}>
              <TouchableOpacity
                style={[styles.idTypeBtn,
                  idType === 'shared'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { borderColor: colors.gray200, backgroundColor: colors.white }
                ]}
                onPress={() => selectIdType('shared')}
                activeOpacity={0.8}
              >
                <Text style={[styles.idTypeBtnText, { color: idType === 'shared' ? colors.white : colors.gray500 }]}>
                  {t('purchases.sharedId')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.idTypeBtn,
                  idType === 'custom'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { borderColor: colors.gray200, backgroundColor: colors.white }
                ]}
                onPress={() => selectIdType('custom')}
                activeOpacity={0.8}
              >
                <Text style={[styles.idTypeBtnText, { color: idType === 'custom' ? colors.white : colors.gray500 }]}>
                  {t('purchases.customIds')}
                </Text>
              </TouchableOpacity>
            </View>

            {idType === 'shared' && (
              <AppTextInput
                label={t('purchases.sharedIdLabel')}
                value={sharedId}
                onChangeText={setSharedId}
                placeholder="e.g. SN-12345"
                returnKeyType="done"
              />
            )}

            {idType === 'custom' && (
              <View style={styles.customIdsContainer}>
                {Array.from({ length: qtyNum }, (_, i) => (
                  <View key={i} style={styles.customIdRow}>
                    <View style={[styles.customIdBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.customIdBadgeText, { color: colors.white }]}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={[styles.customIdInput, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.gray50 }]}
                      value={customIds[i] ?? ''}
                      onChangeText={(val) => updateCustomId(i, val)}
                      placeholder={`ID for item ${i + 1}`}
                      placeholderTextColor={colors.gray400}
                      returnKeyType={i < qtyNum - 1 ? 'next' : 'done'}
                      maxLength={9}
                    />
                  </View>
                ))}
              </View>
            )}
          </PremiumCard>

          {/* ── Card 2: Optional ──────────────────────────────── */}
          <PremiumCard style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.gray500, borderBottomColor: colors.gray100, textAlign }]}>{t('purchases.optionalInfo')}</Text>

            {/* Product Image */}
            <ProductImagePicker
              uri={imageUri}
              onSelect={setImageUri}
              onRemove={() => setImageUri(null)}
              label={t('purchases.productImage')}
            />

            {/* Sell Price Row */}
            <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>{t('purchases.sellPrice')}</Text>
            <View style={styles.priceRow}>
              <View style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
                <Text style={[styles.currencyBadge, { color: colors.primary, backgroundColor: colors.softBlue }]}>IQD</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.black }]}
                  value={sellIQD}
                  onChangeText={onSellIQDChange}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.gray400}
                  returnKeyType="next"
                />
              </View>
              <View style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
                <Text style={[styles.currencyBadge, { color: colors.primary, backgroundColor: colors.softBlue }]}>USD</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.black }]}
                  value={sellUSD}
                  onChangeText={onSellUSDChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.gray400}
                  returnKeyType="next"
                />
              </View>
            </View>

            {sellIQDNum > 0 && (
              <View style={[styles.totalBox, { backgroundColor: profitIQD >= 0 ? '#F0FDF4' : '#FEF2F2', borderColor: profitIQD >= 0 ? '#BBF7D0' : '#FECACA' }]}>
                <Text style={[styles.totalLabel, { color: colors.gray500 }]}>{t('purchases.profitLabel')}</Text>
                <Text style={[styles.totalValue, { color: profitIQD >= 0 ? colors.success : colors.error }]}>
                  {profitIQD >= 0 ? '+' : ''}{fmt(profitIQD)} IQD
                </Text>
              </View>
            )}

            {/* Category chips */}
            <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>{t('purchases.category')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {PURCHASE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip,
                    category === cat
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { borderColor: colors.gray200, backgroundColor: colors.white }
                  ]}
                  onPress={() => setCategory(category === cat ? '' : cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryChipText, { color: category === cat ? colors.white : colors.gray500 }, category === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <AppTextInput
              label={t('purchases.supplierPhone')}
              value={supplierPhone}
              onChangeText={setSupplierPhone}
              placeholder="e.g. 0770 123 4567"
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            <AppTextInput
              label={t('purchases.supplierAddress')}
              value={supplierAddress}
              onChangeText={setSupplierAddress}
              placeholder="e.g. Sulaymaniyah, Iraq"
              returnKeyType="next"
            />

            <AppTextInput
              label={t('purchases.warranty')}
              value={warranty}
              onChangeText={setWarranty}
              placeholder="e.g. 1 year"
              returnKeyType="next"
            />

            <AppTextInput
              label={t('purchases.description')}
              value={description}
              onChangeText={setDescription}
              placeholder="Product description..."
              multiline
              numberOfLines={3}
              style={styles.textarea}
              returnKeyType="next"
            />

            <AppTextInput
              label={t('purchases.notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes..."
              multiline
              numberOfLines={3}
              style={styles.textarea}
            />

            {/* Payment Status */}
            <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>{t('purchases.paymentStatus')}</Text>
            <View style={styles.paymentRow}>
              <TouchableOpacity
                style={[styles.payBtn, paymentStatus === 'paid' ? styles.payBtnPaid : { borderColor: colors.gray200, backgroundColor: colors.white }]}
                onPress={() => setPaymentStatus('paid')}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color={paymentStatus === 'paid' ? colors.success : colors.gray400} />
                <Text style={[styles.payBtnText, { color: paymentStatus === 'paid' ? colors.success : colors.gray500 }]}>{t('purchases.paid')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payBtn, paymentStatus === 'debt' ? styles.payBtnDebt : { borderColor: colors.gray200, backgroundColor: colors.white }]}
                onPress={() => setPaymentStatus('debt')}
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle" size={18} color={paymentStatus === 'debt' ? colors.error : colors.gray400} />
                <Text style={[styles.payBtnText, { color: paymentStatus === 'debt' ? colors.error : colors.gray500 }]}>{t('purchases.debt')}</Text>
              </TouchableOpacity>
            </View>
          </PremiumCard>

          {/* ── Actions ───────────────────────────────────────── */}
          <View style={styles.actions}>
            <PrimaryButton
              label={isSubmitting ? t('purchases.saving') : t('purchases.savePurchase')}
              onPress={handleSave}
              loading={isSubmitting}
              disabled={isSubmitting}
            />
            <PrimaryButton
              label={t('purchases.reset')}
              onPress={() => {
                setProductName(''); setDate(todayISO()); setSupplierName('');
                setQty('1'); setBuyIQD(''); setBuyUSD(''); setSellIQD(''); setSellUSD('');
                setIdType(null); setSharedId(''); setCustomIds(['']);
                setCategory(''); setWarranty(''); setDescription(''); setNotes('');
                setSupplierPhone(''); setSupplierAddress(''); setPaymentStatus('paid');
                setImageUri(null);
              }}
              variant="ghost"
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  flex:       { flex: 1 },
  gradHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  body:       { padding: 16, paddingBottom: 40 },
  card:       { marginBottom: 16 },

  sectionTitle: {
    fontSize:      11,
    fontWeight:    '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom:  16,
  },
  fieldLabel: {
    fontSize:      13,
    fontWeight:    '500',
    marginBottom:  8,
    letterSpacing: 0.2,
  },

  priceRow:   { flexDirection: 'row', gap: 10, marginBottom: 4 },
  priceField: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    borderWidth:   1.5,
    borderRadius:  Theme.input.borderRadius,
    overflow:      'hidden',
  },
  currencyBadge: {
    fontSize:          11,
    fontWeight:        '700',
    paddingHorizontal: 8,
    paddingVertical:   4,
    alignSelf:         'stretch',
    textAlignVertical: 'center',
    lineHeight:        44,
  },
  priceInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 15 },
  rateNote:   { fontSize: 11, marginBottom: 16, marginTop: 2 },

  totalBox: {
    borderWidth:    1.5,
    borderRadius:   Theme.radius.md,
    padding:        14,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   16,
  },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '800' },

  idTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  idTypeBtn: {
    flex:           1,
    height:         44,
    borderWidth:    1.5,
    borderRadius:   Theme.radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  idTypeBtnActive:     { },
  idTypeBtnText:       { fontSize: 14, fontWeight: '600' },
  idTypeBtnTextActive: { },

  customIdsContainer: { marginBottom: 4 },
  customIdRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  customIdBadge: {
    width:          28,
    height:         28,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  customIdBadgeText: { fontSize: 12, fontWeight: '700' },
  customIdInput: {
    flex:              1,
    height:            44,
    borderWidth:       1.5,
    borderRadius:      Theme.radius.md,
    paddingHorizontal: 12,
    fontSize:          14,
  },

  categoryScroll:        { marginBottom: 16 },
  categoryScrollContent: { gap: 8, paddingBottom: 4 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      Theme.radius.full,
    borderWidth:       1.5,
  },
  categoryChipActive:     { },
  categoryChipText:       { fontSize: 13, fontWeight: '500' },
  categoryChipTextActive: { fontWeight: '600' },

  paymentRow: { flexDirection: 'row', gap: 10 },
  payBtn: {
    flex:           1,
    height:         46,
    borderWidth:    1.5,
    borderRadius:   Theme.radius.md,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
  },
  payBtnPaid: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  payBtnDebt: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  payBtnText: { fontSize: 14, fontWeight: '600' },

  textarea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  actions:  { gap: 10 },
});
