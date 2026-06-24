import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { KeyboardAwareScrollView } from '@/components/common/KeyboardAwareScrollView';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { SaleStepIndicator } from '@/components/sales/SaleStepIndicator';
import { LossWarningBanner } from '@/components/sales/LossWarningBanner';
import { ProductSearchBar } from '@/components/sales/ProductSearchBar';
import { ProductSearchResult } from '@/components/sales/ProductSearchResult';
import { CartItemRow } from '@/components/sales/CartItemRow';
import { CartSummaryBar } from '@/components/sales/CartSummaryBar';
import { GlobalDiscountBar } from '@/components/sales/GlobalDiscountBar';
import { PaymentMethodSelector } from '@/components/sales/PaymentMethodSelector';
import { CustomerInputForm } from '@/components/sales/CustomerInputForm';
import { InvoiceView } from '@/components/sales/InvoiceView';

import { useTranslation } from 'react-i18next';
import { useInventoryStore } from '@/store/inventoryStore';
import { useCartStore } from '@/store/cartStore';
import { useSalesStore } from '@/store/salesStore';
import { useCustomerStore } from '@/store/customerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { fmtUSD } from '@/utils/formatters';
import { roundUSD } from '@/utils/rounding';

type Step = 1 | 2 | 3;


export default function NewSaleScreen() {
  const router = useRouter();
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();

  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const { colors } = useAppTheme();
  const inventory = useInventoryStore();
  const cart = useCartStore();
  const { createSale } = useSalesStore();
  const { getCustomerById } = useCustomerStore();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);

  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date());

  // Derived
  const visibleProducts = inventory.searchProducts(query, selectedCategory);
  const itemCount = cart.items.length;
  const subtotal = cart.subtotal();
  const discountTotal = cart.discountTotal();
  const globalDiscountAmount = cart.globalDiscountAmount();
  const grandTotal = cart.grandTotal();
  const remainingDebt = cart.remainingDebt();
  const hasWarning = cart.hasAnyLossWarning();
  const subtotalUsd = subtotal / exchangeRate;
  const grandTotalUsd = grandTotal / exchangeRate;

  useEffect(() => {
    inventory.loadInventory();
    cart.clearCart();
  }, []);

  useEffect(() => {
    if (!customerId) return;
    const customer = getCustomerById(Number(customerId));
    if (customer) {
      cart.setCustomerInput({
        name: customer.name,
        phone: customer.phone ?? '',
        address: customer.address ?? '',
      });
      setCustomerFound(true);
    }
  }, [customerId]);

  function getCartQty(productId: number): number {
    return cart.items.find((i) => i.product.id === productId)?.quantity ?? 0;
  }

  async function handleCompleteSale() {
    if (cart.items.length === 0) {
      Alert.alert(t('sales.cartEmpty'), t('sales.addProductsFirst'));
      return;
    }

    const nameVal = cart.customerInput.name.trim();
    const phoneVal = cart.customerInput.phone.trim();
    let hasError = false;
    if (!nameVal) { setNameError(t('customers.nameRequired')); hasError = true; }
    else setNameError('');
    if (!phoneVal) { setPhoneError(t('customers.phoneRequired')); hasError = true; }
    else setPhoneError('');
    if (hasError) return;

    setIsSubmitting(true);
    try {
      const sale = await createSale({
        items: cart.items,
        customerInput: cart.customerInput,
        paymentMethod: cart.paymentMethod,
        paidAmount: cart.paidAmount,
        saleNotes: cart.saleNotes,
        saleDate,
        subtotal: cart.subtotal,
        discountTotal: cart.discountTotal,
        globalDiscountType: cart.globalDiscountType,
        globalDiscountAmount: cart.globalDiscountAmount,
        grandTotal: cart.grandTotal,
        remainingDebt: cart.remainingDebt,
      });

      cart.clearCart();
      router.replace(`/(app)/sales/${sale.id}?new=1` as never);
    } catch (err: unknown) {
      console.error('Failed to create sale:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('STOCK_EXCEEDED|')) {
        const [, name, available, requested] = msg.split('|');
        Alert.alert(
          t('sales.stockExceededTitle'),
          t('sales.stockExceededMsg', { name, available, requested })
        );
      } else if (msg.startsWith('DUPLICATE_PHONE:')) {
        const existingName = msg.split(':')[1];
        Alert.alert(
          t('common.error'),
          t('customers.duplicatePhone') + (existingName ? `\n(${existingName})` : '') + '\n\n' + t('customers.useExisting')
        );
      } else if (msg === 'DUPLICATE_NAME') {
        Alert.alert(t('common.error'), t('customers.duplicateName') + '\n\n' + t('customers.useExisting'));
      } else {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      }
      setIsSubmitting(false);
    }
  }

  // ─── Step 1: Product Search ────────────────────────────────────────────────

  const renderStep1 = () => (
    <View style={styles.flex}>
      <AppHeader
        title={t('sales.newSale')}
        rightAction={
          itemCount > 0 ? (
            <TouchableOpacity onPress={() => setStep(2)} style={styles.cartBtn}>
              <Ionicons name="cart" size={22} color="#FFFFFF" />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            </TouchableOpacity>
          ) : undefined
        }
      >
        <SaleStepIndicator step={1} />
      </AppHeader>

      <ProductSearchBar
        query={query}
        onQueryChange={setQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={inventory.categories}
      />

      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProductSearchResult
            product={item}
            inCartQty={getCartQty(item.id)}
            onAdd={() => cart.addItem(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.gray300} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.gray500, textAlign }]}>
              {inventory.isLoading ? t('common.loading') : query ? t('inventory.noResults') : t('sales.noProducts')}
            </Text>
            {!inventory.isLoading && !query && (
              <Text style={[styles.emptySub, { color: colors.gray400, textAlign }]}>{t('sales.noInventoryMsg')}</Text>
            )}
          </View>
        }
      />

      <CartSummaryBar
        itemCount={itemCount}
        grandTotal={grandTotal}
        onPress={() => setStep(2)}
      />
    </View>
  );

  // ─── Step 2: Cart Review ───────────────────────────────────────────────────

  const renderStep2 = () => (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title={t('sales.step2')}
        onBack={() => setStep(1)}
        rightAction={<HeaderActionButton icon="add-circle-outline" onPress={() => setStep(1)} />}
      >
        <SaleStepIndicator step={2} />
      </AppHeader>

      {hasWarning && <LossWarningBanner />}

      <KeyboardAwareScrollView contentContainerStyle={styles.step2Body}>
        {cart.items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.gray500, textAlign }]}>{t('sales.cartEmpty')}</Text>
            <PrimaryButton label={t('sales.step1')} onPress={() => setStep(1)} />
          </View>
        ) : (
          <>
            {cart.items.map((item) => (
              <CartItemRow
                key={item.product.id}
                item={item}
                onUpdateQty={(qty) => cart.updateQuantity(item.product.id, qty)}
                onUpdatePrice={(price) => cart.updateSellingPrice(item.product.id, price)}
                onUpdateDiscount={(disc) => cart.updateDiscount(item.product.id, disc)}
                onUpdateDiscountType={(type) => cart.updateDiscountType(item.product.id, type)}
                onUpdateDiscountPct={(pct) => cart.updateDiscountPct(item.product.id, pct)}
                onRemove={() => cart.removeItem(item.product.id)}
              />
            ))}

            <GlobalDiscountBar
              type={cart.globalDiscountType}
              value={cart.globalDiscountValue}
              discountAmount={globalDiscountAmount}
              subtotal={subtotal}
              onTypeChange={(type) => cart.setGlobalDiscountType(type)}
              onValueChange={(val) => cart.setGlobalDiscountValue(val)}
            />

            <PremiumCard style={styles.summaryCard}>
              <Text style={[styles.summaryTitle, { color: colors.black, textAlign }]}>{t('sales.orderSummary')}</Text>
              <View style={[styles.summaryRow, { flexDirection }]}>
                <Text style={[styles.summaryLabel, { color: colors.gray500, textAlign }]}>{t('sales.subtotal')}</Text>
                <View style={[styles.summaryValueStack, { alignItems: alignEnd }]}>
                  <AmountText value={subtotal} style={[styles.summaryValue, { color: colors.black, textAlign: isRTL ? 'left' : 'right' }]} />
                  <AmountText value={roundUSD(subtotalUsd)} formatter={fmtUSD} variant="small" style={[styles.summaryValueSub, { color: colors.gray400, textAlign: isRTL ? 'left' : 'right' }]} />
                </View>
              </View>
              {discountTotal > 0 && (
                <View style={[styles.summaryRow, { flexDirection }]}>
                  <Text style={[styles.summaryLabel, { color: colors.gray500, textAlign }]}>{t('sales.totalDiscount')}</Text>
                  <AmountText value={discountTotal} prefix="−" style={[styles.summaryValue, { color: colors.success, textAlign: isRTL ? 'left' : 'right' }]} />
                </View>
              )}
              {globalDiscountAmount > 0 && (
                <View style={[styles.summaryRow, { flexDirection }]}>
                  <Text style={[styles.summaryLabel, { color: colors.gray500, textAlign }]}>{t('sales.globalDiscount')}</Text>
                  <AmountText value={globalDiscountAmount} prefix="−" style={[styles.summaryValue, { color: colors.success, textAlign: isRTL ? 'left' : 'right' }]} />
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryGrand, { borderTopColor: colors.gray100 }]}>
                <Text style={[styles.grandLabel, { color: colors.primary, textAlign }]}>{t('sales.grandTotal')}</Text>
                <View style={[styles.summaryValueStack, { alignItems: alignEnd }]}>
                  <AmountText value={grandTotal} variant="large" style={[styles.grandValue, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]} />
                  <AmountText value={roundUSD(grandTotalUsd)} formatter={fmtUSD} variant="small" style={[styles.summaryValueSub, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]} />
                </View>
              </View>
            </PremiumCard>

            <PrimaryButton
              label={t('common.continue')}
              onPress={() => setStep(3)}
            />
          </>
        )}
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );

  // ─── Step 3: Customer & Payment ───────────────────────────────────────────

  const renderStep3 = () => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title={t('sales.step3')}
        onBack={() => setStep(2)}
      >
        <SaleStepIndicator step={3} />
      </AppHeader>

      <KeyboardAwareScrollView contentContainerStyle={styles.step3Body}>

        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
          <PremiumCard style={styles.sectionCard}>
            <DateTimePicker
              value={saleDate}
              onChange={setSaleDate}
              label={t('sales.saleDate')}
              maxDate={new Date()}
            />
          </PremiumCard>
        </MotiView>

        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 40 }}>
          <PremiumCard style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.black, textAlign }]}>{t('sales.customerInfo')}</Text>
            <CustomerInputForm
              value={cart.customerInput}
              onChange={(patch) => {
                cart.setCustomerInput(patch);
                if (patch.name !== undefined && patch.name.trim()) setNameError('');
                if (patch.phone !== undefined && patch.phone.trim()) setPhoneError('');
              }}
              customerFound={customerFound}
              nameError={nameError}
              phoneError={phoneError}
            />
          </PremiumCard>
        </MotiView>

        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 80 }}>
          <PremiumCard style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.black, textAlign }]}>{t('sales.paymentMethod')}</Text>
            <PaymentMethodSelector
              selected={cart.paymentMethod}
              onChange={(m) => cart.setPaymentMethod(m)}
            />

            {cart.paymentMethod === 'debt' && (
              <View style={styles.debtSection}>
                <AppTextInput
                  label={t('sales.paidNow')}
                  placeholder="0"
                  value={cart.paidAmount}
                  onChangeText={(t) => cart.setPaidAmount(t)}
                  keyboardType="decimal-pad"
                />
                {remainingDebt > 0 && (
                  <View style={[styles.debtAlert, { flexDirection }]}>
                    <Ionicons name="time-outline" size={16} color={colors.error} />
                    <Text style={[styles.debtText, { color: colors.error, textAlign }]}>{t('sales.remainingDebt')}: <AmountText value={remainingDebt} variant="small" style={[styles.debtText, { color: colors.error }]} /></Text>
                  </View>
                )}
              </View>
            )}
          </PremiumCard>
        </MotiView>

        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 160 }}>
          <PremiumCard style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { color: colors.black, textAlign }]}>{t('sales.invoicePreview')}</Text>
            <InvoiceView
              sale={{
                id: 0,
                invoiceNumber: 'Preview',
                customerId: null,
                customerName: cart.customerInput.name || null,
                customerPhone: cart.customerInput.phone || null,
                customerAddress: cart.customerInput.address || null,
                warranty: cart.customerInput.warranty || null,
                notes: cart.saleNotes || null,
                paymentMethod: cart.paymentMethod,
                subtotal,
                discountTotal,
                globalDiscountType: cart.globalDiscountType,
                globalDiscount: globalDiscountAmount,
                grandTotal,
                paidAmount: cart.paymentMethod === 'debt' ? (parseFloat(cart.paidAmount) || 0) : grandTotal,
                remainingDebt,
                status: 'completed',
                date: saleDate.toISOString(),
                createdAt: saleDate.toISOString(),
                updatedAt: saleDate.toISOString(),
                items: cart.items.map((ci, i) => ({
                  id: i,
                  saleId: 0,
                  productId: ci.product.id,
                  productName: ci.product.name,
                  itemId: ci.product.itemId,
                  idMode: ci.product.idMode,
                  purchasePrice: ci.product.purchasePrice,
                  sellingPrice: ci.sellingPrice,
                  quantity: ci.quantity,
                  discount: ci.discount,
                  lineTotal: ci.lineTotal,
                })),
              }}
              compact={false}
            />
          </PremiumCard>
        </MotiView>

        <PrimaryButton
          label={t('sales.completeSale')}
          onPress={handleCompleteSale}
          loading={isSubmitting}
        />

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  flex:          { flex: 1 },
  cartBtn:       { position: 'relative' },
  cartBadge:     { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  listContent:   { padding: 16, paddingBottom: 100 },
  empty:         { paddingTop: 60, alignItems: 'center', padding: 20 },
  emptyIcon:     { marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  emptySub:      { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  step2Body:     { padding: 16, paddingBottom: 40 },
  summaryCard:   { marginBottom: 16 },
  summaryTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  summaryRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
  summaryLabel:      { fontSize: 14 },
  summaryValue:      { fontSize: 14, fontWeight: '600' },
  summaryValueStack: { alignItems: 'flex-end' },
  summaryValueSub:   { fontSize: 11, fontWeight: '500', marginTop: 1 },
  summaryGrand:      { borderTopWidth: 1, paddingTop: 10, marginTop: 4, marginBottom: 0 },
  grandLabel:        { fontSize: 16, fontWeight: '700' },
  grandValue:        { fontSize: 18, fontWeight: '700' },
  step3Body:     { padding: 16, paddingBottom: 40 },
  sectionCard:   { marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  debtSection:   { marginTop: 14 },
  debtAlert:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 10, marginTop: 4 },
  debtText:      { fontSize: 14, fontWeight: '600' },
  bottomSpacer:  { height: 24 },
});
