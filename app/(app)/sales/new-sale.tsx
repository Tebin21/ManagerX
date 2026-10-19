import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { InventoryProduct } from '@/types/inventory';
import { MotiView } from 'moti';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';

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
import { ReceiptCurrencySelector } from '@/components/shared/ReceiptCurrencySelector';
import { CheckoutActionGrid, type CheckoutMode } from '@/components/shared/CheckoutActionGrid';
import { useBusinessStore } from '@/store/businessStore';
import * as Haptics from 'expo-haptics';

import { useTranslation } from 'react-i18next';
import { useInventoryStore } from '@/store/inventoryStore';
import { useCartStore } from '@/store/cartStore';
import { useSalesStore } from '@/store/salesStore';
import { useCustomerStore } from '@/store/customerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL } from '@/lib/rtl';
import { hexToRgba } from '@/lib/colorUtils';
import { useLanguageStore } from '@/store/languageStore';
import { BarcodeScannerModal } from '@/components/shared/BarcodeScannerModal';
import { fmtUSD, fmtIQD } from '@/utils/formatters';
import { roundUSD, roundToNearest250 } from '@/utils/rounding';
import { useResponsive } from '@/hooks/useResponsive';
import type { ReceiptCurrencyMode } from '@/lib/invoiceTemplate';
import { DIRECT_CUSTOMER_NAME, isDirectCustomerName } from '@/lib/sqlite';

type Step = 1 | 2 | 3;

export default function NewSaleScreen() {
  const router = useRouter();

  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape, cardColumns, contentContainerStyle } = useResponsive();
  const errorTint = getStatusTint('error', colors, isDark);
  const inventory = useInventoryStore();
  const cart = useCartStore();
  const { createSale } = useSalesStore();
  const { getCustomerById } = useCustomerStore();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const salesProductGridLayout = useSettingsStore((s) => s.salesProductGridLayout);
  const setSalesProductGridLayout = useSettingsStore((s) => s.setSalesProductGridLayout);
  const isUSD = baseCurrency === 'USD';

  const isGridView = salesProductGridLayout;
  const numColumns = isGridView
    ? (isTabletLandscape ? 4 : isTablet ? 3 : 2)
    : 1;

  const { customerId } = useLocalSearchParams<{ customerId?: string }>();

  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date());
  const [receiptCurrency, setReceiptCurrency] = useState<ReceiptCurrencyMode>('iqd');
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('normal');

  // Derived
  const visibleProducts = inventory.searchProducts(query, selectedCategory);
  type ProductItem = (typeof visibleProducts)[number];
  type ProductOrFiller = ProductItem | { id: string; isFiller: true };

  const gridFormattedProducts: ProductOrFiller[] = useMemo(() => {
    if (!isGridView || numColumns <= 1 || visibleProducts.length === 0) {
      return visibleProducts;
    }
    const remainder = visibleProducts.length % numColumns;
    if (remainder === 0) return visibleProducts;
    const needed = numColumns - remainder;
    const fillers: ProductOrFiller[] = Array.from({ length: needed }, (_, i) => ({
      id: `__grid_filler_${i}`,
      isFiller: true,
    }));
    return [...visibleProducts, ...fillers];
  }, [visibleProducts, isGridView, numColumns]);
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

  function handleDecreaseQty(productId: number) {
    const current = getCartQty(productId);
    if (current <= 1) {
      cart.removeItem(productId);
    } else {
      cart.updateQuantity(productId, current - 1);
    }
  }

  // ─── Barcode Scanner ────────────────────────────────────────────────────────
  const [scannerOpen, setScannerOpen] = useState(false);
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const handleScanMulti = async (code: string) => {
    const cleanCode = code.trim();
    const lowerCode = cleanCode.toLowerCase();

    // 1. Exact match on itemId
    // 2. Exact match on id
    // 3. Exact match on name
    // 4. Partial match on itemId
    // 5. Partial match on name
    const found =
      inventory.products.find(
        (p) => p.isActive && p.itemId && p.itemId.trim().toLowerCase() === lowerCode
      ) ||
      inventory.products.find(
        (p) => p.isActive && String(p.id) === cleanCode
      ) ||
      inventory.products.find(
        (p) => p.isActive && p.name.trim().toLowerCase() === lowerCode
      ) ||
      inventory.products.find(
        (p) => p.isActive && p.itemId && p.itemId.toLowerCase().includes(lowerCode)
      ) ||
      inventory.products.find(
        (p) => p.isActive && p.name.toLowerCase().includes(lowerCode)
      );

    if (!found) {
      return {
        success: false,
        message: isKuLanguage
          ? `ئەم کۆدە لە کۆگا نەدۆزرایەوە: ${cleanCode}`
          : `No product found for code: ${cleanCode}`,
      };
    }

    const inCart = getCartQty(found.id);
    if (found.quantity <= 0) {
      return {
        success: false,
        message: isKuLanguage
          ? `بەرهەمی "${found.name}" لە کۆگا نەماوە`
          : `"${found.name}" is out of stock`,
      };
    }

    if (inCart >= found.quantity) {
      return {
        success: false,
        message: isKuLanguage
          ? `بڕی بەردەست لە کۆگا (${found.quantity}) لە سەبەتەدایە`
          : `Max available stock (${found.quantity}) already in cart`,
      };
    }

    cart.addItem(found);

    return {
      success: true,
      title: found.name,
      message: isKuLanguage
        ? `زیادکرا: ${found.name} (بڕ: ${inCart + 1})`
        : `Added: ${found.name} (Qty: ${inCart + 1})`,
    };
  };

  const handleFinishScanner = (_scannedCount: number) => {
    setScannerOpen(false);
    // User request: "کە لە سکانەکە هاتە دەرەوە دەبێ لە بەشی داشکاندنو نرخەکان بێت"
    if (cart.items.length > 0) {
      setStep(2);
    }
  };

  async function handleCompleteSale() {
    if (cart.items.length === 0) {
      Alert.alert(t('sales.cartEmpty'), t('sales.addProductsFirst'));
      return;
    }

    const isDirectCust = isDirectCustomerName(cart.customerInput.name);
    const nameVal = cart.customerInput.name.trim();
    const phoneVal = cart.customerInput.phone.trim();
    let hasError = false;
    if (!isDirectCust) {
      if (!nameVal) { setNameError(t('customers.nameRequired')); hasError = true; }
      else setNameError('');
      if (!phoneVal) { setPhoneError(t('customers.phoneRequired')); hasError = true; }
      else setPhoneError('');
      if (hasError) return;
    } else {
      setNameError('');
      setPhoneError('');
    }

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

      if (checkoutMode === 'print') {
        const business = useBusinessStore.getState();
        const { directPrintInvoice } = await import('@/lib/generateInvoice');
        await directPrintInvoice(
          sale,
          {
            name: business.name || 'My Store',
            phone: business.phone || '',
            address: business.address || '',
            logoUri: business.logoUri ?? null,
          },
          receiptCurrency
        );
        cart.clearCart();
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
        setStep(1);
      } else if (checkoutMode === 'normal') {
        cart.clearCart();
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
        setStep(1);
      } else {
        cart.clearCart();
        router.replace(`/(app)/sales/${sale.id}?new=1&currency=${receiptCurrency}` as never);
      }
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isTablet ? 10 : 8 }}>
            {/* Grid vs List Layout Toggle Button */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                } catch {}
                setSalesProductGridLayout(!salesProductGridLayout);
              }}
              style={[
                styles.layoutToggleBtn,
                isTablet && { width: 44, height: 44, borderRadius: 22 },
              ]}
              accessibilityLabel={salesProductGridLayout ? 'List View' : 'Grid View'}
            >
              <Ionicons
                name={salesProductGridLayout ? 'list' : 'grid'}
                size={isTablet ? 22 : 18}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setScannerOpen(true)}
              style={[
                styles.headerScanBtn,
                isTablet && { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="barcode-outline" size={isTablet ? 22 : 19} color="#FFFFFF" />
              <Text style={[styles.headerScanBtnText, isTablet && { fontSize: 14 }]}>
                {isKuLanguage ? 'سکان' : 'Scan'}
              </Text>
            </TouchableOpacity>

            {itemCount > 0 && (
              <TouchableOpacity onPress={() => setStep(2)} style={styles.cartBtn}>
                <Ionicons name="cart" size={isTablet ? 24 : 22} color="#FFFFFF" />
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        }
      >
        <SaleStepIndicator step={1} />

        {/* Large & Beautiful Barcode Scanner Banner in navigation header */}
        <TouchableOpacity
          style={[
            styles.navBarScanBanner,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor: isDark ? colors.gray200 : 'transparent',
              borderWidth: isDark ? 1 : 0,
            },
          ]}
          onPress={() => setScannerOpen(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.navBarScanContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.navBarScanIconCircle,
                {
                  backgroundColor: isDark ? hexToRgba(colors.primary, 0.18) : '#FEF3C7',
                },
              ]}
            >
              <Ionicons name="barcode-outline" size={24} color={isDark ? colors.primary : '#725D18'} />
            </View>
            <View style={[styles.navBarScanTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.navBarScanTitle, { color: colors.black }]}>
                {isKuLanguage ? 'سکانەری بارکۆد و QR بۆ فرۆشتن' : 'Barcode & QR Scanner for Sales'}
              </Text>
              <Text style={[styles.navBarScanSub, { color: colors.gray400 }]}>
                {isKuLanguage ? 'بەرهەمەکان یەک لەدوای یەک سکان بکە بۆ سەبەتە' : 'Scan multiple items rapidly into cart'}
              </Text>
            </View>
            <View
              style={[
                styles.navBarScanActionBadge,
                {
                  backgroundColor: isDark ? hexToRgba(colors.primary, 0.18) : '#FEF3C7',
                  borderColor: isDark ? hexToRgba(colors.primary, 0.35) : '#FDE68A',
                },
              ]}
            >
              <Ionicons name="camera" size={16} color={isDark ? colors.primary : '#725D18'} style={{ marginRight: 4 }} />
              <Text style={[styles.navBarScanActionText, { color: isDark ? colors.primary : '#725D18' }]}>
                {isKuLanguage ? 'سکان' : 'Scan'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </AppHeader>

      <View style={[styles.flex, isTablet && contentContainerStyle]}>
        <ProductSearchBar
          query={query}
          onQueryChange={setQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={inventory.categories}
        />

        <FlatList
          key={`sale-products-${isGridView ? 'grid' : 'list'}-${numColumns}-${isRTL ? 'rtl' : 'ltr'}`}
          data={gridFormattedProducts}
          keyExtractor={(item) => String(item.id)}
          numColumns={numColumns}
          columnWrapperStyle={
            numColumns > 1
              ? {
                  gap: isTablet ? 12 : 8,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                }
              : undefined
          }
          renderItem={({ item }) => {
            if ('isFiller' in item && item.isFiller) {
              return (
                <View
                  style={{
                    flex: 1,
                    marginBottom: isTablet ? 12 : 8,
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                  }}
                  pointerEvents="none"
                />
              );
            }
            const product = item as ProductItem;
            return (
              <ProductSearchResult
                product={product}
                inCartQty={getCartQty(product.id)}
                onAdd={() => cart.addItem(product)}
                onDecrease={() => handleDecreaseQty(product.id)}
                layout={isGridView ? 'grid' : 'list'}
              />
            );
          }}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: isTablet ? 120 : 90 },
          ]}
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
    </View>
  );

  // ─── Step 2: Cart Review ───────────────────────────────────────────────────

  const renderStep2 = () => (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AppHeader
        title={t('sales.step2')}
        onBack={() => setStep(1)}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HeaderActionButton icon="barcode-outline" onPress={() => setScannerOpen(true)} />
            <HeaderActionButton icon="add-circle-outline" onPress={() => setStep(1)} />
          </View>
        }
      >
        <SaleStepIndicator step={2} />
      </AppHeader>

      {hasWarning && <LossWarningBanner />}

      {cart.items.length === 0 ? (
        <KeyboardAwareScrollView contentContainerStyle={[styles.step2Body, isTablet && contentContainerStyle]}>
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.gray500, textAlign }]}>{t('sales.cartEmpty')}</Text>
            <PrimaryButton label={t('sales.step1')} onPress={() => setStep(1)} />
          </View>
        </KeyboardAwareScrollView>
      ) : isTabletLandscape ? (
        <View style={[styles.flex, isTablet && contentContainerStyle, styles.step2LandscapeContainer]}>
          <View style={[styles.step2LandscapeRow, { flexDirection }]}>
            {/* Items Column (Right in Kurdish RTL): SCROLLABLE */}
            <View style={styles.step2ItemsCol}>
              <KeyboardAwareScrollView
                style={styles.flex}
                contentContainerStyle={{ paddingBottom: 60 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* Quick Actions: Scan More / Add Items */}
                <View style={[styles.step2ActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row', gap: isTablet ? 12 : 10, marginBottom: 12 }]}>
                  <TouchableOpacity
                    style={[
                      styles.step2ScanBtn,
                      {
                        backgroundColor: colors.primary,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                      styles.step2BtnTablet,
                    ]}
                    onPress={() => setScannerOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="barcode-outline" size={isTablet ? 24 : 20} color="#FFFFFF" />
                    <Text
                      style={[
                        styles.step2ScanBtnText,
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        isTablet && { fontSize: 16 },
                      ]}
                    >
                      {isKuLanguage ? 'سکانی زیاتر' : 'Scan More'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.step2AddBtn,
                      {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + '14',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                      styles.step2BtnTablet,
                    ]}
                    onPress={() => setStep(1)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={isTablet ? 24 : 20} color={colors.primary} />
                    <Text
                      style={[
                        styles.step2AddBtnText,
                        { color: colors.primary },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        isTablet && { fontSize: 16 },
                      ]}
                    >
                      {isKuLanguage ? 'زیادکردنی بەرهەم' : 'Add Items'}
                    </Text>
                  </TouchableOpacity>
                </View>

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
              </KeyboardAwareScrollView>
            </View>

            {/* Left Column in RTL (Discounts, Summary, Direct Sale, Continue Button): FIXED IN PLACE */}
            <View style={styles.step2FixedSideCol}>
              <ScrollView
                style={styles.flex}
                contentContainerStyle={{ gap: 14, paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <GlobalDiscountBar
                  type={cart.globalDiscountType}
                  value={cart.globalDiscountValue}
                  discountAmount={globalDiscountAmount}
                  subtotal={subtotal}
                  onTypeChange={(type) => cart.setGlobalDiscountType(type)}
                  onValueChange={(val) => cart.setGlobalDiscountValue(val)}
                />

                <PremiumCard style={styles.summaryCard}>
                  <Text style={[styles.summaryTitle, { color: colors.black, textAlign, fontSize: 18, marginBottom: 14 }]}>{t('sales.orderSummary')}</Text>
                  <View style={[styles.summaryRow, { flexDirection }]}>
                    <Text style={[styles.summaryLabel, { color: colors.gray500, textAlign, fontSize: 15 }]}>{t('sales.subtotal')}</Text>
                    <View style={[styles.summaryValueStack, { alignItems: alignEnd }]}>
                      <AmountText value={subtotal} style={[styles.summaryValue, { color: colors.black, textAlign: isRTL ? 'left' : 'right', fontSize: 18 }]} />
                      {isUSD ? (
                        <Text style={[styles.summaryValueSub, { color: colors.gray400, textAlign: isRTL ? 'left' : 'right' }]}>
                          {fmtIQD(subtotal)} IQD
                        </Text>
                      ) : (
                        <Text style={[styles.summaryValueSub, { color: colors.gray400, textAlign: isRTL ? 'left' : 'right' }]}>
                          {fmtUSD(subtotalUsd)} USD
                        </Text>
                      )}
                    </View>
                  </View>
                  {discountTotal > 0 && (
                    <View style={[styles.summaryRow, { flexDirection }]}>
                      <Text style={[styles.summaryLabel, { color: colors.gray500, textAlign, fontSize: 15 }]}>{t('sales.totalDiscount')}</Text>
                      <AmountText value={discountTotal} prefix="−" style={[styles.summaryValue, { color: colors.success, textAlign: isRTL ? 'left' : 'right', fontSize: 18 }]} />
                    </View>
                  )}
                  {globalDiscountAmount > 0 && (
                    <View style={[styles.summaryRow, { flexDirection }]}>
                      <Text style={[styles.summaryLabel, { color: colors.gray500, textAlign, fontSize: 15 }]}>{t('sales.globalDiscount')}</Text>
                      <AmountText value={globalDiscountAmount} prefix="−" style={[styles.summaryValue, { color: colors.success, textAlign: isRTL ? 'left' : 'right', fontSize: 18 }]} />
                    </View>
                  )}
                  <View style={[styles.summaryRow, styles.summaryGrand, { flexDirection, borderTopColor: colors.gray100, paddingTop: 14, marginTop: 8 }]}>
                    <Text style={[styles.grandLabel, { color: colors.primary, textAlign, fontSize: 20 }]}>{t('sales.grandTotal')}</Text>
                    <View style={[styles.summaryValueStack, { alignItems: alignEnd }]}>
                      <AmountText value={grandTotal} variant="large" style={[styles.grandValue, { color: colors.primary, textAlign: isRTL ? 'left' : 'right', fontSize: 26 }]} />
                      {isUSD ? (
                        <Text style={[styles.summaryValueSub, { color: colors.primary, textAlign: isRTL ? 'left' : 'right', fontSize: 14 }]}>
                          {fmtIQD(grandTotal)} IQD
                        </Text>
                      ) : (
                        <Text style={[styles.summaryValueSub, { color: colors.primary, textAlign: isRTL ? 'left' : 'right', fontSize: 14 }]}>
                          {fmtUSD(grandTotalUsd)} USD
                        </Text>
                      )}
                    </View>
                  </View>
                </PremiumCard>

                <PrimaryButton
                  label={t('common.continue')}
                  onPress={() => setStep(3)}
                />
              </ScrollView>
            </View>
          </View>
        </View>
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={[styles.step2Body, isTablet && contentContainerStyle]}>
          {/* Quick Actions: Scan More / Add Items */}
          <View style={[styles.step2ActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row', gap: isTablet ? 12 : 10 }]}>
            <TouchableOpacity
              style={[
                styles.step2ScanBtn,
                {
                  backgroundColor: colors.primary,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
                isTablet && styles.step2BtnTablet,
              ]}
              onPress={() => setScannerOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="barcode-outline" size={isTablet ? 24 : 20} color="#FFFFFF" />
              <Text
                style={[
                  styles.step2ScanBtnText,
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  isTablet && { fontSize: 16 },
                ]}
              >
                {isKuLanguage ? 'سکانی زیاتر' : 'Scan More'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.step2AddBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + '14',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
                isTablet && styles.step2BtnTablet,
              ]}
              onPress={() => setStep(1)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={isTablet ? 24 : 20} color={colors.primary} />
              <Text
                style={[
                  styles.step2AddBtnText,
                  { color: colors.primary },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  isTablet && { fontSize: 16 },
                ]}
              >
                {isKuLanguage ? 'زیادکردنی بەرهەم' : 'Add Items'}
              </Text>
            </TouchableOpacity>
          </View>

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
                {isUSD ? (
                  <Text style={[styles.summaryValueSub, { color: colors.gray400, textAlign: isRTL ? 'left' : 'right' }]}>
                    {fmtIQD(subtotal)} IQD
                  </Text>
                ) : (
                  <Text style={[styles.summaryValueSub, { color: colors.gray400, textAlign: isRTL ? 'left' : 'right' }]}>
                    {fmtUSD(subtotalUsd)} USD
                  </Text>
                )}
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
            <View style={[styles.summaryRow, styles.summaryGrand, { flexDirection, borderTopColor: colors.gray100 }]}>
              <Text style={[styles.grandLabel, { color: colors.primary, textAlign }]}>{t('sales.grandTotal')}</Text>
              <View style={[styles.summaryValueStack, { alignItems: alignEnd }]}>
                <AmountText value={grandTotal} variant="large" style={[styles.grandValue, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]} />
                {isUSD ? (
                  <Text style={[styles.summaryValueSub, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]}>
                    {fmtIQD(grandTotal)} IQD
                  </Text>
                ) : (
                  <Text style={[styles.summaryValueSub, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]}>
                    {fmtUSD(grandTotalUsd)} USD
                  </Text>
                )}
              </View>
            </View>
          </PremiumCard>

          <PrimaryButton
            label={t('common.continue')}
            onPress={() => setStep(3)}
          />
        </KeyboardAwareScrollView>
      )}
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

      {isTabletLandscape ? (
        <View style={[styles.flex, isTablet && contentContainerStyle, styles.step3LandscapeContainer]}>
          <View style={[styles.step3LandscapeRow, { flexDirection }]}>
            {/* Scrollable Column (Right in Kurdish RTL): Date, Customer, Invoice */}
            <View style={styles.step3ScrollCol}>
              <KeyboardAwareScrollView
                style={styles.flex}
                contentContainerStyle={{ gap: 16, paddingBottom: 60 }}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
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
                    <Text style={[styles.sectionTitle, { color: colors.black, textAlign, fontSize: 18, marginBottom: 12 }]}>{t('sales.customerInfo')}</Text>
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

                <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 160 }}>
                  <PremiumCard style={styles.sectionCard}>
                    <Text style={[styles.sectionTitle, { color: colors.black, textAlign, fontSize: 18, marginBottom: 12 }]}>{t('sales.invoicePreview')}</Text>
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
                        paidAmount: cart.paymentMethod === 'debt'
                          ? (isUSD ? roundToNearest250((parseFloat(cart.paidAmount) || 0) * exchangeRate) : (parseFloat(cart.paidAmount) || 0))
                          : grandTotal,
                        remainingDebt,
                        status: 'completed',
                        exchangeRateUsed: exchangeRate,
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
                      compact={true}
                    />
                  </PremiumCard>
                </MotiView>
              </KeyboardAwareScrollView>
            </View>

            {/* Fixed Column (Left in Kurdish RTL): Payment Method, Currency, Actions, Submit */}
            <View style={styles.step3FixedCol}>
              <ScrollView
                style={styles.flex}
                contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                overScrollMode="never"
              >
                <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 80 }}>
                  <PremiumCard style={styles.sectionCard}>
                    <Text style={[styles.sectionTitle, { color: colors.black, textAlign, fontSize: 18, marginBottom: 14 }]}>{t('sales.paymentMethod')}</Text>
                    <PaymentMethodSelector
                      selected={cart.paymentMethod}
                      onChange={(m) => cart.setPaymentMethod(m)}
                    />

                    {cart.paymentMethod === 'debt' && (
                      <View style={styles.debtSection}>
                        <AppTextInput
                          label={`${t('sales.paidNow')} (${isUSD ? 'USD' : 'IQD'})`}
                          placeholder={isUSD ? '0.00' : '0'}
                          value={cart.paidAmount}
                          onChangeText={(t) => cart.setPaidAmount(t)}
                          keyboardType="decimal-pad"
                        />
                        {remainingDebt > 0 && (
                          <View style={[styles.debtAlert, { backgroundColor: errorTint.bg, flexDirection }]}>
                            <Ionicons name="time-outline" size={16} color={errorTint.text} />
                            <Text style={[styles.debtText, { color: errorTint.text, textAlign }]}>{t('sales.remainingDebt')}: <AmountText value={remainingDebt} variant="small" style={[styles.debtText, { color: errorTint.text }]} /></Text>
                          </View>
                        )}
                      </View>
                    )}
                  </PremiumCard>
                </MotiView>

                <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 200 }}>
                  <ReceiptCurrencySelector value={receiptCurrency} onChange={setReceiptCurrency} />
                </MotiView>

                <CheckoutActionGrid
                  mode={checkoutMode}
                  onSelectMode={setCheckoutMode}
                  type="sale"
                />

                <PrimaryButton
                  label={
                    checkoutMode === 'print'
                      ? (isKuLanguage ? 'تەواوکردن و پرینت 🖨️' : 'Complete & Print 🖨️')
                      : (isKuLanguage ? 'تەواوکردنی فرۆشتن ✓' : 'Complete Sale ✓')
                  }
                  onPress={handleCompleteSale}
                  loading={isSubmitting}
                />
              </ScrollView>
            </View>
          </View>
        </View>
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={[styles.step3Body, isTablet && contentContainerStyle]}>
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
                    label={`${t('sales.paidNow')} (${isUSD ? 'USD' : 'IQD'})`}
                    placeholder={isUSD ? '0.00' : '0'}
                    value={cart.paidAmount}
                    onChangeText={(t) => cart.setPaidAmount(t)}
                    keyboardType="decimal-pad"
                  />
                  {remainingDebt > 0 && (
                    <View style={[styles.debtAlert, { backgroundColor: errorTint.bg, flexDirection }]}>
                      <Ionicons name="time-outline" size={16} color={errorTint.text} />
                      <Text style={[styles.debtText, { color: errorTint.text, textAlign }]}>{t('sales.remainingDebt')}: <AmountText value={remainingDebt} variant="small" style={[styles.debtText, { color: errorTint.text }]} /></Text>
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
                  paidAmount: cart.paymentMethod === 'debt'
                    ? (isUSD ? roundToNearest250((parseFloat(cart.paidAmount) || 0) * exchangeRate) : (parseFloat(cart.paidAmount) || 0))
                    : grandTotal,
                  remainingDebt,
                  status: 'completed',
                  exchangeRateUsed: exchangeRate,
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

          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 200 }}>
            <ReceiptCurrencySelector value={receiptCurrency} onChange={setReceiptCurrency} />
          </MotiView>

          <CheckoutActionGrid
            mode={checkoutMode}
            onSelectMode={setCheckoutMode}
            type="sale"
          />

          <PrimaryButton
            label={
              checkoutMode === 'print'
                ? (isKuLanguage ? 'تەواوکردن و پرینت 🖨️' : 'Complete & Print 🖨️')
                : (isKuLanguage ? 'تەواوکردنی فرۆشتن ✓' : 'Complete Sale ✓')
            }
            onPress={handleCompleteSale}
            loading={isSubmitting}
          />

          <View style={styles.bottomSpacer} />
        </KeyboardAwareScrollView>
      )}
    </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => handleFinishScanner(0)}
        mode="multi"
        title={isKuLanguage ? 'سکانەری بەرهەمەکانی فرۆشتن' : 'Sales Barcode Scanner'}
        subtitle={isKuLanguage ? 'کامێرا بگرە لەسەر بارکۆدەکان بۆ زیادکردنی ڕاستەوخۆ' : 'Scan items rapidly into cart'}
        onScanMulti={handleScanMulti}
        onFinishMulti={handleFinishScanner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  flex:          { flex: 1 },
  cartBtn:       { position: 'relative' },
  cartBadge:     { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  layoutToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerScanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  navBarScanBanner: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  navBarScanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navBarScanIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBarScanTextCol: {
    flex: 1,
  },
  navBarScanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  navBarScanSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  navBarScanActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  navBarScanActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#725D18',
  },
  step2ActionRow: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  step2ScanBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  step2ScanBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  step2AddBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  step2AddBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  step2BtnTablet: {
    minHeight: 52,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
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
  debtAlert:     { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginTop: 4 },
  debtText:      { fontSize: 14, fontWeight: '600' },
  bottomSpacer:  { height: 24 },

  step2LandscapeContainer: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  step2LandscapeRow: {
    flex: 1,
    gap: 20,
    width: '100%',
  },
  step2ItemsCol: {
    flex: 1.3,
    height: '100%',
    overflow: 'hidden',
  },
  step2FixedSideCol: {
    flex: 0.9,
    height: '100%',
    overflow: 'hidden',
  },
  step3LandscapeContainer: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  step3LandscapeRow: {
    flex: 1,
    gap: 20,
    width: '100%',
  },
  step3ScrollCol: {
    flex: 1.05,
    height: '100%',
    overflow: 'hidden',
  },
  step3FixedCol: {
    flex: 0.95,
    height: '100%',
    overflow: 'hidden',
  },
});
