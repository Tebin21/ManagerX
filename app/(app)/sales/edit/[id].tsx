import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/common/AppHeader';
import { LoadingView } from '@/components/ui/LoadingView';
import { KeyboardAwareScrollView, useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { PaymentMethodSelector } from '@/components/sales/PaymentMethodSelector';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { hexToRgba } from '@/lib/colorUtils';
import { useSalesStore } from '@/store/salesStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getSaleById, searchCustomersList } from '@/lib/sqlite';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { Typography } from '@/constants/typography';
import type { Sale, PaymentMethod, Product } from '@/types/sales';
import type { Customer } from '@/types/customers';
import { roundToNearest250 } from '@/utils/rounding';
import { toEnglishDigits, sanitizeNumericInput } from '@/utils/formatters';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';

const HEADER_TITLE_STYLE = { ...Typography.title, color: '#FFFFFF', letterSpacing: 0.15 };

interface EditItem {
  productId: number;
  productName: string;
  itemId: string | null;
  idMode: 'repeatable' | 'unique';
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  discount: number;
  lineTotal: number;
}

function calcLineTotal(price: number, qty: number, disc: number): number {
  return Math.max(0, roundToNearest250((price - disc) * qty));
}


export default function EditInvoiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { colors, isDark } = useAppTheme();
  const { updateSale } = useSalesStore();
  const inventory = useInventoryStore();
  const scrollIntoView = useKeyboardAwareFocus();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const [sale, setSale]     = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Customer fields
  const [customerName, setCustomerName]       = useState('');
  const [customerPhone, setCustomerPhone]     = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [warranty, setWarranty]               = useState('');
  const [notes, setNotes]                     = useState('');
  const [nameError, setNameError]             = useState('');
  const [phoneError, setPhoneError]           = useState('');

  // Customer autocomplete
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);

  // Items
  const [items, setItems] = useState<EditItem[]>([]);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmountStr, setPaidAmountStr] = useState('');

  // Product picker
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productQuery, setProductQuery]           = useState('');

  const baseCurrency  = useSettingsStore((s) => s.baseCurrency);
  const exchangeRate  = useSettingsStore((s) => s.exchangeRate) || 1310;
  const isUSD         = baseCurrency === 'USD';

  // Computed
  const subtotal      = items.reduce((s, i) => s + i.lineTotal, 0);
  const discountTotal = items.reduce((s, i) => s + i.discount * i.quantity, 0);
  const grandTotal    = subtotal;

  const maxDownPayment = useMemo(() => {
    if (isUSD) {
      const totalUSD = Math.round((grandTotal / exchangeRate) * 100) / 100;
      return totalUSD > 0.01 ? Math.round((totalUSD - 0.01) * 100) / 100 : 0;
    }
    return grandTotal > 250 ? grandTotal - 250 : 0;
  }, [grandTotal, isUSD, exchangeRate]);

  const maxDownPaymentIQD = useMemo(() => {
    if (isUSD) {
      return Math.min(roundToNearest250(maxDownPayment * exchangeRate), Math.max(0, grandTotal - 250));
    }
    return maxDownPayment;
  }, [maxDownPayment, isUSD, exchangeRate, grandTotal]);

  const rawPaidNum    = parseFloat(toEnglishDigits(paidAmountStr).replace(/,/g, '')) || 0;
  const isPaidExceeded = paymentMethod === 'debt' && rawPaidNum > maxDownPayment;
  const maxDownPaymentDisplay = isUSD ? `$${maxDownPayment}` : `${maxDownPayment.toLocaleString()} IQD`;
  const rawPaidIQD    = isUSD ? roundToNearest250(rawPaidNum * exchangeRate) : roundToNearest250(rawPaidNum);
  const paidAmount    = paymentMethod === 'debt'
    ? Math.max(0, Math.min(rawPaidIQD, maxDownPaymentIQD))
    : grandTotal;
  const remainingDebt = paymentMethod === 'debt' ? Math.max(0, grandTotal - paidAmount) : 0;

  const visibleProducts = inventory.searchProducts(productQuery, 'all').filter(
    (p) => p.isActive && p.quantity > 0
  );

  useEffect(() => {
    inventory.loadInventory();
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
        setPaymentMethod(s.paymentMethod);
        if (s.paymentMethod === 'debt') {
          const displayedPaid = isUSD
            ? (s.exchangeRateUsed ? Math.round((s.paidAmount / s.exchangeRateUsed) * 100) / 100 : Math.round((s.paidAmount / exchangeRate) * 100) / 100)
            : s.paidAmount;
          setPaidAmountStr(displayedPaid > 0 ? String(displayedPaid) : '');
        } else {
          setPaidAmountStr(String(s.paidAmount));
        }
        setItems(
          (s.items ?? []).map((si) => ({
            productId:     si.productId,
            productName:   si.productName,
            itemId:        si.itemId,
            idMode:        si.idMode,
            purchasePrice: si.purchasePrice,
            sellingPrice:  si.sellingPrice,
            quantity:      si.quantity,
            discount:      si.discount,
            lineTotal:     si.lineTotal,
          }))
        );
      }
      setLoading(false);
    })();
  }, [id]);

  // Customer autocomplete
  const handleCustomerNameChange = useCallback(async (text: string) => {
    setCustomerName(text);
    if (nameError && text.trim()) setNameError('');
    if (text.trim().length < 2) { setCustomerSuggestions([]); setShowCustomerSuggestions(false); return; }
    try {
      const results = await searchCustomersList(text.trim());
      setCustomerSuggestions(results);
      setShowCustomerSuggestions(results.length > 0);
    } catch { /* noop */ }
  }, [nameError]);

  const handleCustomerPhoneChange = useCallback(async (text: string) => {
    const cleanPhone = sanitizeNumericInput(text, 'phone-pad');
    setCustomerPhone(cleanPhone);
    if (phoneError && cleanPhone.trim()) setPhoneError('');
    if (cleanPhone.trim().length < 4) { setCustomerSuggestions([]); setShowCustomerSuggestions(false); return; }
    try {
      const results = await searchCustomersList(cleanPhone.trim());
      setCustomerSuggestions(results);
      setShowCustomerSuggestions(results.length > 0);
    } catch { /* noop */ }
  }, [phoneError]);

  const handleSelectCustomer = useCallback((c: Customer) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone ? sanitizeNumericInput(c.phone, 'phone-pad') : '');
    setCustomerAddress(c.address ?? '');
    setCustomerSuggestions([]);
    setShowCustomerSuggestions(false);
    setCustomerFound(true);
    setNameError('');
    setPhoneError('');
  }, []);

  // Item helpers
  const updateItemField = useCallback(
    (index: number, field: Partial<EditItem>) => {
      setItems((prev) => {
        const next = [...prev];
        const updated = { ...next[index], ...field };
        updated.lineTotal = calcLineTotal(updated.sellingPrice, updated.quantity, updated.discount);
        next[index] = updated;
        return next;
      });
    },
    []
  );

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addProductToItems = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.productId === product.id);
      if (existing >= 0) {
        const next = [...prev];
        const it = next[existing];
        const qty = it.quantity + 1;
        next[existing] = { ...it, quantity: qty, lineTotal: calcLineTotal(it.sellingPrice, qty, it.discount) };
        return next;
      }
      return [
        ...prev,
        {
          productId:     product.id,
          productName:   product.name,
          itemId:        product.itemId,
          idMode:        product.idMode,
          purchasePrice: product.purchasePrice,
          sellingPrice:  product.sellingPrice,
          quantity:      1,
          discount:      0,
          lineTotal:     product.sellingPrice,
        },
      ];
    });
    setShowProductPicker(false);
    setProductQuery('');
  }, []);

  const handleSave = async () => {
    const nameVal  = customerName.trim();
    const phoneVal = customerPhone.trim();
    let hasError = false;
    if (!nameVal)  { setNameError(t('customers.nameRequired'));  hasError = true; }
    if (!phoneVal) { setPhoneError(t('customers.phoneRequired')); hasError = true; }
    if (hasError) return;

    if (items.length === 0) {
      Alert.alert(t('common.error'), t('sales.cartEmpty'));
      return;
    }

    if (grandTotal <= 0) {
      Alert.alert(
        isKuLanguage ? 'نرخی پسوڵە ناتوانێت سفر بێت' : t('common.error'),
        isKuLanguage
          ? 'پسوڵەی فرۆشتن نابێت بێ نرخ (سفر) بێت. تکایە نرخی بەرهەمەکان دیاری بکە.'
          : 'Sale invoice total cannot be zero.'
      );
      return;
    }

    const zeroPriceItem = items.find((i) => i.sellingPrice <= 0);
    if (zeroPriceItem) {
      Alert.alert(
        isKuLanguage ? 'نرخی کاڵا دیاری نەکراوە' : t('common.error'),
        isKuLanguage
          ? `کاڵای «${zeroPriceItem.productName}» نرخی سفرە. پسوڵە نابێت بە نرخی سفر تەواو بکرێت.`
          : `Item "${zeroPriceItem.productName}" has zero price. Invoices cannot be completed with zero price.`
      );
      return;
    }

    if (paymentMethod === 'debt' && rawPaidNum > 0 && (rawPaidNum > maxDownPayment || rawPaidIQD >= grandTotal)) {
      Alert.alert(t('common.error'), t('sales.validationAmountPaidDebt'));
      return;
    }

    setSaving(true);
    try {
      await updateSale(Number(id), {
        customerId:      sale?.customerId ?? null,
        customerName:    nameVal,
        customerPhone:   phoneVal,
        customerAddress: customerAddress.trim() || null,
        warranty:        warranty.trim() || null,
        notes:           notes.trim() || null,
        paymentMethod,
        subtotal,
        discountTotal,
        globalDiscountType: sale?.globalDiscountType ?? 'none',
        globalDiscount: sale?.globalDiscount ?? 0,
        grandTotal,
        paidAmount,
        remainingDebt,
        items,
      });
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('sales.editSale')} showBack />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('sales.editSale')} showBack />
        <LoadingView />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('sales.saleNotFound')} showBack />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.gray500, marginTop: 16 }}>{t('sales.saleNotFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.gray50 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title={
          <>
            {t('sales.editInvoice')} · <IdText style={HEADER_TITLE_STYLE}>{sale.invoiceNumber}</IdText>
          </>
        }
        showBack
      />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Customer Section ── */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>
            {t('sales.customerInfo')}
          </Text>

          <AppTextInput
            label={`${t('sales.customerName')} *`}
            placeholder={t('common.required')}
            value={customerName}
            onChangeText={handleCustomerNameChange}
            error={nameError}
            returnKeyType="next"
          />

          {showCustomerSuggestions && (
            <MotiView
              from={{ opacity: 0, translateY: -4 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 150 }}
              style={styles.suggestionDropdown}
            >
              {customerSuggestions.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.suggestionRow,
                    {
                      flexDirection,
                      borderBottomColor: colors.gray200,
                      backgroundColor: isDark ? colors.gray100 : colors.white,
                    },
                  ]}
                  onPress={() => handleSelectCustomer(c)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="person-outline" size={14} color={colors.primary} />
                  <View style={styles.suggestionInfo}>
                    <Text style={[styles.suggestionName, { textAlign, color: colors.black }]}>{c.name}</Text>
                    {c.phone ? <Text style={[styles.suggestionPhone, { textAlign, color: colors.gray400 }]}>{c.phone}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </MotiView>
          )}

          {customerFound && (
            <MotiView
              from={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 200 }}
              style={[
                styles.foundBadge,
                {
                  flexDirection,
                  backgroundColor: isDark ? hexToRgba(colors.success, 0.15) : '#F0FDF4',
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={[styles.foundText, { textAlign, color: colors.success }]}>Returning customer — info filled in</Text>
            </MotiView>
          )}

          <AppTextInput
            label={`${t('sales.customerPhone')} *`}
            placeholder={t('common.required')}
            value={customerPhone}
            onChangeText={handleCustomerPhoneChange}
            keyboardType="phone-pad"
            error={phoneError}
            returnKeyType="next"
          />

          <AppTextInput
            label={t('sales.customerAddress')}
            placeholder={t('common.optional')}
            value={customerAddress}
            onChangeText={setCustomerAddress}
            returnKeyType="next"
          />
        </View>

        {/* ── Items Section ── */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>
            {t('sales.editItems')}
          </Text>

          {items.length === 0 ? (
            <Text style={[styles.emptyItems, { color: colors.gray400, textAlign }]}>{t('sales.cartEmpty')}</Text>
          ) : (
            items.map((item, idx) => (
              <View key={`${item.productId}-${idx}`} style={[styles.itemCard, { borderColor: colors.gray100 }]}>
                <View style={[styles.itemHeader, { flexDirection }]}>
                  <Text style={[styles.itemName, { color: colors.black, textAlign }]} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <TouchableOpacity onPress={() => removeItem(idx)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.itemFields, { flexDirection }]}>
                  {/* Qty */}
                  <View style={styles.itemFieldGroup}>
                    <Text style={[styles.itemFieldLabel, { color: colors.gray400, textAlign }]}>{t('sales.qty')}</Text>
                    <QuantityStepper
                      compact
                      min={1}
                      value={toEnglishDigits(String(item.quantity))}
                      onChangeText={(text) => {
                        const n = parseInt(toEnglishDigits(text), 10);
                        if (!isNaN(n) && n >= 1) updateItemField(idx, { quantity: n });
                      }}
                    />
                  </View>

                  {/* Price */}
                  <View style={styles.itemFieldGroup}>
                    <Text style={[styles.itemFieldLabel, { color: colors.gray400, textAlign }]}>{t('sales.price')}</Text>
                    <TextInput
                      style={[styles.itemInput, { borderColor: colors.gray200, color: colors.black, textAlign: 'right', writingDirection: 'ltr' }]}
                      value={toEnglishDigits(String(item.sellingPrice))}
                      onChangeText={(v) => updateItemField(idx, { sellingPrice: parseFloat(toEnglishDigits(v).replace(/,/g, '')) || 0 })}
                      onEndEditing={() => updateItemField(idx, { sellingPrice: roundToNearest250(item.sellingPrice) })}
                      keyboardType="decimal-pad"
                      onFocus={scrollIntoView}
                    />
                  </View>

                  {/* Discount */}
                  <View style={styles.itemFieldGroup}>
                    <Text style={[styles.itemFieldLabel, { color: colors.gray400, textAlign }]}>{t('sales.discount')}</Text>
                    <TextInput
                      style={[styles.itemInput, { borderColor: colors.gray200, color: colors.black, textAlign: 'right', writingDirection: 'ltr' }]}
                      value={toEnglishDigits(String(item.discount))}
                      onChangeText={(v) => updateItemField(idx, { discount: parseFloat(toEnglishDigits(v).replace(/,/g, '')) || 0 })}
                      onEndEditing={() => updateItemField(idx, { discount: roundToNearest250(item.discount) })}
                      keyboardType="decimal-pad"
                      onFocus={scrollIntoView}
                    />
                  </View>
                </View>

                <View style={[styles.itemTotalRow, { flexDirection }]}>
                  <Text style={[styles.itemTotalLabel, { color: colors.gray400, textAlign }]}>{t('sales.lineTotal')}</Text>
                  <AmountText value={item.lineTotal} currency="IQD" style={[styles.itemTotalValue, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]} />
                </View>
              </View>
            ))
          )}

          {/* Add Product button */}
          <TouchableOpacity
            style={[styles.addProductBtn, { borderColor: colors.primary, flexDirection }]}
            onPress={() => setShowProductPicker((v) => !v)}
          >
            <Ionicons name={showProductPicker ? 'chevron-up' : 'add-circle-outline'} size={18} color={colors.primary} />
            <Text style={[styles.addProductText, { color: colors.primary }]}>
              {showProductPicker ? 'Close' : t('sales.addProduct')}
            </Text>
          </TouchableOpacity>

          {/* Inline product picker */}
          {showProductPicker && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 200 }}
            >
              <TextInput
                style={[
                  styles.productSearch,
                  { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.gray50, textAlign, writingDirection: 'ltr' },
                  applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: productQuery, placeholder: t('sales.searchProducts') }), {}),
                ]}
                placeholder={t('sales.searchProducts')}
                placeholderTextColor={colors.gray400}
                value={productQuery}
                onChangeText={setProductQuery}
                onFocus={scrollIntoView}
              />
              <View style={{ maxHeight: 220 }}>
                <FlatList
                  data={visibleProducts.slice(0, 20)}
                  keyExtractor={(item) => String(item.id)}
                  scrollEnabled
                  keyboardShouldPersistTaps="handled"
                  onScrollBeginDrag={() => Keyboard.dismiss()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.productPickerRow, { borderBottomColor: colors.gray100, flexDirection }]}
                      onPress={() => addProductToItems(item)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.productPickerInfo}>
                        <Text style={[styles.productPickerName, { color: colors.black, textAlign }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.productPickerMeta, { color: colors.gray400, textAlign }]}>
                          <AmountText value={item.sellingPrice} currency="IQD" variant="small" style={styles.productPickerMeta} /> · Qty: {item.quantity}
                        </Text>
                      </View>
                      <Ionicons name="add-circle" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={[styles.noProducts, { color: colors.gray400 }]}>{t('inventory.noResults')}</Text>
                  }
                />
              </View>
            </MotiView>
          )}
        </View>

        {/* ── Order Summary ── */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>
            {t('sales.orderSummary')}
          </Text>
          <View style={[styles.summaryRow, { flexDirection }]}>
            <Text style={[styles.summaryLabel, { color: colors.gray500, textAlign }]}>{t('sales.subtotal')}</Text>
            <AmountText value={subtotal} currency="IQD" style={[styles.summaryValue, { color: colors.black, textAlign: isRTL ? 'left' : 'right' }]} />
          </View>
          {discountTotal > 0 && (
            <View style={[styles.summaryRow, { flexDirection }]}>
              <Text style={[styles.summaryLabel, { color: colors.gray500, textAlign }]}>{t('sales.totalDiscount')}</Text>
              <AmountText value={discountTotal} currency="IQD" prefix="−" style={[styles.summaryValue, { color: colors.success, textAlign: isRTL ? 'left' : 'right' }]} />
            </View>
          )}
          <View style={[styles.summaryRow, styles.grandRow, { borderTopColor: colors.gray100, flexDirection }]}>
            <Text style={[styles.grandLabel, { color: colors.primary, textAlign }]}>{t('sales.grandTotal')}</Text>
            <AmountText value={grandTotal} currency="IQD" variant="large" style={[styles.grandValue, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]} />
          </View>
        </View>

        {/* ── Payment Section ── */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>
            {t('sales.paymentMethod')}
          </Text>
          <PaymentMethodSelector
            selected={paymentMethod}
            onChange={setPaymentMethod}
          />
          {paymentMethod === 'debt' && (
            <View style={styles.debtSection}>
              <AppTextInput
                label={`${t('sales.paidNow')} (${isUSD ? 'USD' : 'IQD'})`}
                placeholder={isUSD ? '0.00' : '0'}
                value={toEnglishDigits(paidAmountStr)}
                onChangeText={(v) => setPaidAmountStr(sanitizeNumericInput(v, 'decimal-pad'))}
                onEndEditing={() => {
                  const raw = parseFloat(toEnglishDigits(paidAmountStr).replace(/,/g, '')) || 0;
                  if (raw > maxDownPayment) {
                    setPaidAmountStr(maxDownPayment > 0 ? String(maxDownPayment) : '');
                  }
                }}
                keyboardType="decimal-pad"
                forceLatin
                error={isPaidExceeded ? t('sales.downPaymentMustBeLess') : undefined}
              />
              <Text style={[{ fontSize: 12, color: colors.gray400, marginTop: 4, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {t('sales.maxDownPayment')} {maxDownPaymentDisplay}
              </Text>
              {remainingDebt > 0 && (
                <View style={[styles.debtAlert, { backgroundColor: '#FEE2E2', flexDirection }]}>
                  <Ionicons name="time-outline" size={16} color={colors.error} />
                  <Text style={[styles.debtText, { color: colors.error, textAlign }]}>
                    {t('sales.remainingDebt')}: <AmountText value={remainingDebt} variant="small" style={[styles.debtText, { color: colors.error }]} />
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Notes & Warranty ── */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>
            {t('purchases.additionalSection')}
          </Text>
          <AppTextInput
            label={t('sales.warranty')}
            placeholder={t('common.optional')}
            value={warranty}
            onChangeText={setWarranty}
            returnKeyType="next"
          />
          <AppTextInput
            label={t('sales.notes')}
            placeholder={t('common.optional')}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={{ height: 72, textAlignVertical: 'top', paddingTop: 10 }}
            returnKeyType="done"
          />
        </View>

        <PrimaryButton
          label={t('common.saveChanges')}
          onPress={handleSave}
          loading={saving}
        />

        <View style={{ height: 32 }} />
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:    { padding: 16, paddingBottom: 48 },

  card: {
    borderRadius: Theme.radius.card,
    padding: 16,
    marginBottom: 14,
    ...Theme.shadow.soft,
  },
  cardTitle: {
    fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 14,
  },

  // Customer suggestions
  suggestionDropdown: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginTop: -10,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    gap: 10,
  },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 13, fontWeight: '600', color: Colors.black },
  suggestionPhone: { fontSize: 12, color: Colors.gray400, marginTop: 1 },
  foundBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 14, marginTop: -8,
  },
  foundText: { fontSize: 12, color: Colors.success, fontWeight: '600' },

  // Items
  emptyItems: { fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
  itemCard: {
    borderWidth: 1, borderRadius: 10,
    padding: 12, marginBottom: 10,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  itemName:   { flex: 1, fontSize: 14, fontWeight: '600', marginEnd: 8 },
  itemFields: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  itemFieldGroup: { flex: 1 },
  itemFieldLabel: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  itemInput: {
    height: 36, borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 10, fontSize: 14,
  },
  itemTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  itemTotalLabel: { fontSize: 11, fontWeight: '600' },
  itemTotalValue: { fontSize: 14, fontWeight: '700' },

  addProductBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 10, marginTop: 4,
  },
  addProductText: { fontSize: 13, fontWeight: '600' },
  productSearch: {
    height: 40, borderWidth: 1.5, borderRadius: 8,
    paddingHorizontal: 12, fontSize: 14,
    marginTop: 10, marginBottom: 6,
  },
  productPickerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  productPickerInfo: { flex: 1 },
  productPickerName: { fontSize: 13, fontWeight: '600' },
  productPickerMeta: { fontSize: 12, marginTop: 2 },
  noProducts: { textAlign: 'center', paddingVertical: 16, fontSize: 13 },

  // Summary
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  grandRow:     { borderTopWidth: 1, paddingTop: 10, marginTop: 4, marginBottom: 0 },
  grandLabel:   { fontSize: 16, fontWeight: '700' },
  grandValue:   { fontSize: 18, fontWeight: '700' },

  // Payment
  debtSection: { marginTop: 14 },
  debtAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 10, borderRadius: 10, marginTop: 4,
  },
  debtText: { fontSize: 14, fontWeight: '600' },
});
