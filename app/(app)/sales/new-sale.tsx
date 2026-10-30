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
  LayoutAnimation,
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
import { CheckoutActionGrid, type CheckoutMode } from '@/components/shared/CheckoutActionGrid';
import { InvoiceAboutPolicyAccordion } from '@/components/sales/InvoiceAboutPolicyAccordion';
import { useBusinessStore } from '@/store/businessStore';
import { directPrintInvoice, directPrintThermalInvoice } from '@/lib/generateInvoice';
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
import { fmtUSD, fmtIQD, toEnglishDigits, sanitizeNumericInput } from '@/utils/formatters';
import { roundUSD, roundToNearest250 } from '@/utils/rounding';
import { useResponsive } from '@/hooks/useResponsive';
import type { ReceiptCurrencyMode } from '@/lib/invoiceTemplate';
import { DIRECT_CUSTOMER_NAME, isDirectCustomerName, getProductBatches } from '@/lib/sqlite';
import type { Product } from '@/types/sales';

type Step = 1 | 2 | 3;

export default function NewSaleScreen() {
  const router = useRouter();

  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const { colors, isDark } = useAppTheme();
  const { isTablet, isTabletLandscape, cardColumns, contentContainerStyle, headerButtonSize, headerIconSize, width: screenWidth } = useResponsive();
  const errorTint = getStatusTint('error', colors, isDark);
  const inventory = useInventoryStore();
  const cart = useCartStore();
  const { createSale } = useSalesStore();
  const { getCustomerById } = useCustomerStore();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const salesProductGridLayout = useSettingsStore((s) => s.salesProductGridLayout);
  const setSalesProductGridLayout = useSettingsStore((s) => s.setSalesProductGridLayout);
  const showSalesInvoicePreview = useSettingsStore((s) => s.showSalesInvoicePreview);
  const setShowSalesInvoicePreview = useSettingsStore((s) => s.setShowSalesInvoicePreview);
  const isUSD = baseCurrency === 'USD';

  const isGridView = salesProductGridLayout;
  const numColumns = isGridView
    ? (isTabletLandscape ? 4 : isTablet ? 3 : 2)
    : 1;

  const { customerId } = useLocalSearchParams<{ customerId?: string }>();

  const [step, setStep] = useState<Step>(1);
  const [activeCartIndex, setActiveCartIndex] = useState(0);
  const cartScrollRef = React.useRef<ScrollView>(null);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saleDate, setSaleDate] = useState(() => new Date());
  const [receiptCurrency, setReceiptCurrency] = useState<ReceiptCurrencyMode>('iqd');
  const saleCheckoutModePref = useSettingsStore((s) => s.saleCheckoutModePreference);
  const setSaleCheckoutModePref = useSettingsStore((s) => s.setSaleCheckoutModePreference);
  const checkoutMode: CheckoutMode = saleCheckoutModePref || 'normal';
  const setCheckoutMode = setSaleCheckoutModePref;

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
  const maxDownPayment = cart.maxDownPayment();
  const rawPaidNum = parseFloat(toEnglishDigits(cart.paidAmount).replace(/,/g, '')) || 0;

  // Clamp active cart index on item removal
  useEffect(() => {
    if (activeCartIndex >= cart.items.length && cart.items.length > 0) {
      setActiveCartIndex(cart.items.length - 1);
    }
  }, [cart.items.length, activeCartIndex]);

  const mobileCardWidth = Math.min(screenWidth - 44, 380);

  const onCartScroll = (e: any) => {
    const offsetX = e.nativeEvent?.contentOffset?.x ?? 0;
    const itemFullWidth = mobileCardWidth + 10;
    const index = Math.round(offsetX / itemFullWidth);
    const clamped = Math.max(0, Math.min(index, cart.items.length - 1));
    if (clamped !== activeCartIndex) {
      setActiveCartIndex(clamped);
    }
  };

  const scrollToCartIndex = (index: number) => {
    const target = Math.max(0, Math.min(index, cart.items.length - 1));
    setActiveCartIndex(target);
    cartScrollRef.current?.scrollTo({
      x: target * (mobileCardWidth + 10),
      animated: true,
    });
  };
  const isPaidExceeded = cart.paymentMethod === 'debt' && rawPaidNum > maxDownPayment;
  const maxDownPaymentDisplay = isUSD ? `$${maxDownPayment}` : `${maxDownPayment.toLocaleString()} IQD`;
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

  const handleAddToCart = async (product: InventoryProduct | Product) => {
    cart.addItem(product);
    try {
      const batches = await getProductBatches(product.id, product.name, product.itemId);
      if (batches.length > 0) {
        cart.setAvailableBatches(product.id, batches);
      }
    } catch (err) {
      console.warn('Failed to fetch batches on add:', err);
    }
  };

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

    handleAddToCart(found);

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

    const total = cart.grandTotal();
    if (total <= 0) {
      Alert.alert(
        isKuLanguage ? 'نرخی پسوڵە ناتوانێت سفر بێت' : t('common.error'),
        isKuLanguage
          ? 'پسوڵەی فرۆشتن نابێت بێ نرخ (سفر) بێت. تکایە نرخی بەرهەمەکان دیاری بکە.'
          : 'Sale invoice total cannot be zero. Please enter product prices.'
      );
      return;
    }

    const zeroPriceItem = cart.items.find((i) => i.sellingPrice <= 0);
    if (zeroPriceItem) {
      Alert.alert(
        isKuLanguage ? 'نرخی کاڵا دیاری نەکراوە' : t('common.error'),
        isKuLanguage
          ? `کاڵای «${zeroPriceItem.product.name}» نرخی سفرە. پسوڵە نابێت بە نرخی سفر تەواو بکرێت.`
          : `Item "${zeroPriceItem.product.name}" has zero price. Invoices cannot be completed with zero price.`
      );
      return;
    }

    if (cart.paymentMethod === 'cash' || cart.paymentMethod === 'fib') {
      if (total <= 0) {
        Alert.alert(
          isKuLanguage ? 'پسوڵەی کاش نابێت سفر بێت' : t('common.error'),
          isKuLanguage
            ? 'بە کاش پسوڵەی سفرمان نییە. تکایە نرخی بەرهەمەکان بنووسە.'
            : 'Cash invoices cannot be zero.'
        );
        return;
      }
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

    if (cart.paymentMethod === 'debt') {
      const maxDown = cart.maxDownPayment();
      const rawPaid = parseFloat(toEnglishDigits(cart.paidAmount).replace(/,/g, '')) || 0;
      if (rawPaid > 0 && (rawPaid > maxDown || cart.effectivePaidIQD() >= cart.grandTotal())) {
        Alert.alert(t('common.error'), t('sales.validationAmountPaidDebt'));
        return;
      }
    }

    const { checkSalesLimit } = await import('@/lib/usageLimits');
    const salesCheck = await checkSalesLimit();
    if (!salesCheck.allowed) {
      const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
      showUsageLimitModal();
      return;
    }

    setIsSubmitting(true);
    try {
      const sale = await createSale({
        items: cart.items,
        customerInput: cart.customerInput,
        paymentMethod: cart.paymentMethod,
        paidAmount: cart.paidAmount,
        initialPaymentMethod: cart.initialPaymentMethod,
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
      setIsSubmitting(false);

      if (checkoutMode === 'print') {
        const business = useBusinessStore.getState();
        // Fire print in background so checkout screen transitions instantly without blocking on printer modal
        directPrintInvoice(
          sale,
          {
            name: business.name || 'My Store',
            phone: business.phone || '',
            address: business.address || '',
            logoUri: business.logoUri ?? null,
          },
          receiptCurrency
        ).catch((printErr) => {
          console.error('[Sale] Direct print error:', printErr);
        });

        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
        setStep(1);
      } else if (checkoutMode === 'print58' || checkoutMode === 'print80' || checkoutMode === 'print110') {
        const business = useBusinessStore.getState();
        const thermalWidth = checkoutMode === 'print58' ? '58mm' : checkoutMode === 'print80' ? '80mm' : '110mm';
        // Fire thermal print in background without blocking
        directPrintThermalInvoice(
          sale,
          {
            name: business.name || 'My Store',
            phone: business.phone || '',
            address: business.address || '',
            logoUri: business.logoUri ?? null,
          },
          thermalWidth,
          receiptCurrency
        ).catch((printErr) => {
          console.error('[Sale] Direct thermal print error:', printErr);
        });

        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
        setStep(1);
      } else if (checkoutMode === 'normal') {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
        setStep(1);
      } else {
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
      } else if (msg.startsWith('USAGE_LIMIT_')) {
        const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
        showUsageLimitModal();
      } else {
        Alert.alert(t('common.error'), t('common.tryAgain'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const getCompleteButtonLabel = () => {
    if (checkoutMode === 'print') {
      return isKuLanguage ? 'تەواوکردن و پرینت A4 🖨️' : 'Complete & Print A4 🖨️';
    }
    if (checkoutMode === 'print58') {
      return isKuLanguage ? 'تەواوکردن و پرینت 58mm 🖨️' : 'Complete & Print 58mm 🖨️';
    }
    if (checkoutMode === 'print80') {
      return isKuLanguage ? 'تەواوکردن و پرینت 80mm 🖨️' : 'Complete & Print 80mm 🖨️';
    }
    if (checkoutMode === 'print110') {
      return isKuLanguage ? 'تەواوکردن و پرینت 110mm 🖨️' : 'Complete & Print 110mm 🖨️';
    }
    return isKuLanguage ? 'تەواوکردنی فرۆشتن ✓' : 'Complete Sale ✓';
  };

  // ─── Step 1: Product Search ────────────────────────────────────────────────

  const renderStep1 = () => (
    <View style={styles.flex}>
      <AppHeader
        title={t('sales.newSale')}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isTablet ? 12 : 8 }}>
            {/* Grid vs List Layout Toggle Button */}
            <HeaderActionButton
              icon={salesProductGridLayout ? 'list-outline' : 'grid-outline'}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                } catch {}
                setSalesProductGridLayout(!salesProductGridLayout);
              }}
            />

            {itemCount > 0 && (
              <TouchableOpacity
                onPress={() => setStep(2)}
                style={[
                  styles.cartBtn,
                  isTablet && {
                    width: headerButtonSize,
                    height: headerButtonSize,
                    borderRadius: Math.round(headerButtonSize * 0.28),
                  },
                ]}
              >
                <Ionicons name="cart" size={isTablet ? (headerIconSize + 2) : 22} color="#FFFFFF" />
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        }
      >
        <SaleStepIndicator step={1} />

        {/* Simplified & Clean Barcode Scanner Banner with Single Icon */}
        <TouchableOpacity
          style={[
            styles.navBarScanBanner,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderColor: isDark ? hexToRgba(colors.primary, 0.25) : 'rgba(0,0,0,0.06)',
              borderWidth: 1,
            },
          ]}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            } catch {}
            setScannerOpen(true);
          }}
          activeOpacity={0.82}
        >
          <View style={[styles.navBarScanContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.navBarScanIconCircle,
                {
                  backgroundColor: isDark ? hexToRgba(colors.primary, 0.18) : '#FEF3C7',
                  borderColor: isDark ? hexToRgba(colors.primary, 0.3) : '#FDE68A',
                },
              ]}
            >
              <Ionicons name="barcode-outline" size={24} color={isDark ? colors.primary : '#725D18'} />
            </View>
            <View style={[styles.navBarScanTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.navBarScanTitle, { color: colors.black }]}>
                {isKuLanguage ? 'سکانەری بارکۆد و QR' : 'Barcode & QR Scanner'}
              </Text>
              <Text style={[styles.navBarScanSub, { color: colors.gray400 }]}>
                {isKuLanguage ? 'بەرهەمەکان سکان بکە بۆ سەبەتە' : 'Scan items rapidly into cart'}
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
            const cartItem = cart.items.find((ci) => ci.product.id === product.id);
            return (
              <ProductSearchResult
                product={product}
                inCartQty={getCartQty(product.id)}
                selectedBatch={cartItem?.selectedBatch}
                availableBatches={cartItem?.availableBatches}
                onSelectBatch={(batch) => cart.updateBatch(product.id, batch)}
                onAdd={() => handleAddToCart(product)}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isTablet ? 12 : 8 }}>
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
                    <Ionicons name="barcode-outline" size={isTablet ? 20 : 18} color="#FFFFFF" />
                    <Text
                      style={[
                        styles.step2ScanBtnText,
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        isTablet && { fontSize: 14.5 },
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
                    <Ionicons name="add-circle-outline" size={isTablet ? 20 : 18} color={colors.primary} />
                    <Text
                      style={[
                        styles.step2AddBtnText,
                        { color: colors.primary },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        isTablet && { fontSize: 14.5 },
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
                    onUpdateBatch={(batch) => cart.updateBatch(item.product.id, batch)}
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
              <Ionicons name="barcode-outline" size={isTablet ? 20 : 18} color="#FFFFFF" />
              <Text
                style={[
                  styles.step2ScanBtnText,
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  isTablet && { fontSize: 14.5 },
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
              <Ionicons name="add-circle-outline" size={isTablet ? 20 : 18} color={colors.primary} />
              <Text
                style={[
                  styles.step2AddBtnText,
                  { color: colors.primary },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  isTablet && { fontSize: 14.5 },
                ]}
              >
                {isKuLanguage ? 'زیادکردنی بەرهەم' : 'Add Items'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cart Items on Mobile (Horizontal Swipeable Carousel with Micro Cue) vs Tablet (Multi-column Grid) */}
          {isTablet ? (
            <View style={[styles.cartGrid, styles.cartGridTablet, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {cart.items.map((item) => (
                <View key={item.product.id} style={[styles.cartGridCol, styles.cartGridColTablet]}>
                  <CartItemRow
                    item={item}
                    onUpdateQty={(qty) => cart.updateQuantity(item.product.id, qty)}
                    onUpdatePrice={(price) => cart.updateSellingPrice(item.product.id, price)}
                    onUpdateDiscount={(disc) => cart.updateDiscount(item.product.id, disc)}
                    onUpdateDiscountType={(type) => cart.updateDiscountType(item.product.id, type)}
                    onUpdateDiscountPct={(pct) => cart.updateDiscountPct(item.product.id, pct)}
                    onUpdateBatch={(batch) => cart.updateBatch(item.product.id, batch)}
                    onRemove={() => cart.removeItem(item.product.id)}
                  />
                </View>
              ))}
            </View>
          ) : cart.items.length <= 1 ? (
            <View style={styles.cartGridCol}>
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.product.id}
                  item={item}
                  onUpdateQty={(qty) => cart.updateQuantity(item.product.id, qty)}
                  onUpdatePrice={(price) => cart.updateSellingPrice(item.product.id, price)}
                  onUpdateDiscount={(disc) => cart.updateDiscount(item.product.id, disc)}
                  onUpdateDiscountType={(type) => cart.updateDiscountType(item.product.id, type)}
                  onUpdateDiscountPct={(pct) => cart.updateDiscountPct(item.product.id, pct)}
                  onUpdateBatch={(batch) => cart.updateBatch(item.product.id, batch)}
                  onRemove={() => cart.removeItem(item.product.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.cartCarouselContainer}>
              {/* Micro Indicator Bar above cards */}
              <View style={[styles.mobileSwipeIndicatorRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Counter & Micro Dots */}
                <View style={[styles.mobileSwipeCounterWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.mobileSwipeCounterText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isKuLanguage
                      ? `کاڵای ${activeCartIndex + 1} لە ${cart.items.length}`
                      : `Item ${activeCartIndex + 1} of ${cart.items.length}`}
                  </Text>
                  <View style={[styles.microDotsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {cart.items.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.microDot,
                          i === activeCartIndex
                            ? [styles.microDotActive, { backgroundColor: colors.primary }]
                            : [styles.microDotInactive, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : colors.gray300 }],
                        ]}
                      />
                    ))}
                  </View>
                </View>

                {/* Very Small Swipe-Left Micro Hint ("هێمایەکی بچووک بچووک کە ئاماژە بێت بۆ لێفت ساید کردن") */}
                {activeCartIndex < cart.items.length - 1 ? (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => scrollToCartIndex(activeCartIndex + 1)}
                    style={[
                      styles.microSwipeHintPill,
                      {
                        backgroundColor: isDark ? hexToRgba(colors.primary, 0.15) : hexToRgba(colors.primary, 0.1),
                        borderColor: isDark ? hexToRgba(colors.primary, 0.32) : hexToRgba(colors.primary, 0.28),
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons name="arrow-back" size={11} color={colors.primary} />
                    <Text
                      style={[
                        styles.microSwipeHintText,
                        { color: colors.primary },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isKuLanguage ? 'خلیسکاندن بۆ لای چەپ' : 'Swipe left'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => scrollToCartIndex(0)}
                    style={[
                      styles.microSwipeHintPill,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray100,
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.gray200,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons name="arrow-forward" size={11} color={colors.gray500} />
                    <Text
                      style={[
                        styles.microSwipeHintText,
                        { color: colors.gray500 },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isKuLanguage ? 'گەڕانەوە بۆ سەرەتا' : 'Back to first'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Smooth Horizontal Snapping ScrollView with Peek */}
              <View style={styles.carouselWrapper}>
                <ScrollView
                  ref={cartScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  directionalLockEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  snapToInterval={mobileCardWidth + 10}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  style={[
                    styles.cartMobileScroll,
                    isRTL ? { transform: [{ scaleX: -1 }] } : undefined,
                  ]}
                  contentContainerStyle={[
                    styles.cartMobileScrollContent,
                    { gap: 10, paddingEnd: 12 },
                  ]}
                  onScroll={onCartScroll}
                  scrollEventThrottle={16}
                >
                  {cart.items.map((item) => (
                    <View
                      key={item.product.id}
                      style={[
                        { width: mobileCardWidth },
                        isRTL && { transform: [{ scaleX: -1 }] },
                      ]}
                    >
                      <CartItemRow
                        item={item}
                        onUpdateQty={(qty) => cart.updateQuantity(item.product.id, qty)}
                        onUpdatePrice={(price) => cart.updateSellingPrice(item.product.id, price)}
                        onUpdateDiscount={(disc) => cart.updateDiscount(item.product.id, disc)}
                        onUpdateDiscountType={(type) => cart.updateDiscountType(item.product.id, type)}
                        onUpdateDiscountPct={(pct) => cart.updateDiscountPct(item.product.id, pct)}
                        onUpdateBatch={(batch) => cart.updateBatch(item.product.id, batch)}
                        onRemove={() => cart.removeItem(item.product.id)}
                      />
                    </View>
                  ))}
                </ScrollView>

                {/* Left Micro Cue Chevron (when there are more items to the left) */}
                {activeCartIndex < cart.items.length - 1 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => scrollToCartIndex(activeCartIndex + 1)}
                    style={[
                      styles.sideMicroChevronLeft,
                      {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.94)' : 'rgba(255, 255, 255, 0.94)',
                        borderColor: isDark ? 'rgba(255,255,255,0.18)' : colors.gray200,
                      },
                    ]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="chevron-back" size={12} color={colors.primary} />
                  </TouchableOpacity>
                )}

                {/* Right Micro Cue Chevron (when on card > 0, to slide back) */}
                {activeCartIndex > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => scrollToCartIndex(activeCartIndex - 1)}
                    style={[
                      styles.sideMicroChevronRight,
                      {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.94)' : 'rgba(255, 255, 255, 0.94)',
                        borderColor: isDark ? 'rgba(255,255,255,0.18)' : colors.gray200,
                      },
                    ]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

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

  const renderInvoicePreviewSection = (compact: boolean) => (
    <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 160 }}>
      <View
        style={[
          styles.invoicePreviewCard,
          {
            backgroundColor: isDark ? '#1E293B' : colors.white,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.accordionHeaderBtn,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          onPress={() => {
            try { Haptics.selectionAsync().catch(() => {}); } catch {}
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowSalesInvoicePreview(!showSalesInvoicePreview);
          }}
          activeOpacity={0.8}
        >
          {/* Start: Icon + Title & Subtitle */}
          <View style={[styles.accordionHeaderLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.accordionHeaderIconBox,
                { backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.12) },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={17}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text
                style={[
                  styles.accordionTitle,
                  { color: colors.black, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
                numberOfLines={1}
              >
                {t('sales.invoicePreview')}
              </Text>
              <Text
                style={[
                  styles.accordionSub,
                  { color: colors.gray400, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
                numberOfLines={1}
              >
                {showSalesInvoicePreview
                  ? (isKuLanguage ? 'داخستنی پێشبینین' : 'Hide Preview')
                  : (isKuLanguage ? 'پیشاندانی پسوولە' : 'Show Preview')}
              </Text>
            </View>
          </View>

          {/* End: Status Pill + Circular Chevron */}
          <View style={[styles.accordionHeaderRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.accordionStatusPill,
                {
                  backgroundColor: showSalesInvoicePreview
                    ? (isDark ? 'rgba(212, 175, 55, 0.15)' : '#FEF3C7')
                    : (isDark ? 'rgba(255, 255, 255, 0.06)' : colors.gray100),
                  borderColor: showSalesInvoicePreview
                    ? (isDark ? 'rgba(212, 175, 55, 0.35)' : '#FDE68A')
                    : (isDark ? 'rgba(255, 255, 255, 0.12)' : colors.gray200),
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons
                name={showSalesInvoicePreview ? 'eye-outline' : 'eye-off-outline'}
                size={13}
                color={showSalesInvoicePreview ? (isDark ? '#FBBF24' : '#B45309') : (isDark ? colors.gray400 : colors.gray600)}
              />
              <Text
                style={[
                  styles.accordionStatusPillText,
                  {
                    color: showSalesInvoicePreview ? (isDark ? '#FBBF24' : '#B45309') : (isDark ? colors.gray400 : colors.gray600),
                  },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {showSalesInvoicePreview
                  ? (isKuLanguage ? 'کراوەیە' : 'Visible')
                  : (isKuLanguage ? 'پیشاندان' : 'Preview')}
              </Text>
            </View>

            <View
              style={[
                styles.accordionChevronCircle,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.gray100 },
              ]}
            >
              <Ionicons
                name={showSalesInvoicePreview ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primary}
              />
            </View>
          </View>
        </TouchableOpacity>

        {showSalesInvoicePreview && (
          <View style={[styles.invoicePreviewExpandedWrapper, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200 }]}>
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
                initialPaymentMethod: cart.initialPaymentMethod,
                subtotal,
                discountTotal,
                globalDiscountType: cart.globalDiscountType,
                globalDiscount: globalDiscountAmount,
                grandTotal,
                paidAmount: cart.paymentMethod === 'debt'
                  ? cart.effectivePaidIQD()
                  : grandTotal,
                remainingDebt: cart.remainingDebt(),
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
              compact={compact}
            />
          </View>
        )}
      </View>
    </MotiView>
  );

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
                  <PremiumCard style={styles.sectionCard} padding={14}>
                    <DateTimePicker
                      value={saleDate}
                      onChange={setSaleDate}
                      label={t('sales.saleDate')}
                      maxDate={new Date()}
                      style={{ marginBottom: 0 }}
                    />
                  </PremiumCard>
                </MotiView>

                <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 40 }}>
                  <PremiumCard style={styles.sectionCard} padding={14}>
                    <Text style={[styles.sectionTitle, { color: colors.black, textAlign, fontSize: 18, marginBottom: 8 }]}>{t('sales.customerInfo')}</Text>
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

                {renderInvoicePreviewSection(true)}
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
                  <PremiumCard style={styles.sectionCard} padding={14}>
                    <Text style={[styles.sectionTitle, { color: colors.black, textAlign, fontSize: 18, marginBottom: 10 }]}>{t('sales.paymentMethod')}</Text>
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
                          onChangeText={(t) => cart.setPaidAmount(sanitizeNumericInput(toEnglishDigits(t), 'decimal-pad'))}
                          onEndEditing={() => {
                            const n = parseFloat(toEnglishDigits(cart.paidAmount).replace(/,/g, '')) || 0;
                            if (n > maxDownPayment) {
                              cart.setPaidAmount(maxDownPayment > 0 ? String(maxDownPayment) : '');
                            }
                          }}
                          keyboardType="decimal-pad"
                          forceLatin
                          error={isPaidExceeded ? t('sales.downPaymentMustBeLess') : undefined}
                        />
                        <Text style={[{ fontSize: 12, color: colors.gray400, marginTop: 4, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                          {t('sales.maxDownPayment')} {maxDownPaymentDisplay}
                        </Text>
                        {(parseFloat(toEnglishDigits(cart.paidAmount).replace(/,/g, '')) || 0) > 0 && (
                          <View style={{ marginTop: 10, marginBottom: 12 }}>
                            <Text
                              style={[
                                { color: colors.gray500, fontSize: 13, marginBottom: 8, textAlign },
                                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                              ]}
                            >
                              {t('sales.downPaymentMethod', 'شێوازی پارەدانی پێشەکی')}
                            </Text>
                            <View style={[{ flexDirection, gap: 8 }]}>
                              <TouchableOpacity
                                onPress={() => cart.setInitialPaymentMethod('cash')}
                                activeOpacity={0.8}
                                style={[
                                  styles.downPayBtn,
                                  cart.initialPaymentMethod === 'cash'
                                    ? { borderColor: colors.primary, backgroundColor: colors.softBlue }
                                    : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.gray50 },
                                  { flexDirection },
                                ]}
                              >
                                <Ionicons
                                  name="cash-outline"
                                  size={18}
                                  color={cart.initialPaymentMethod === 'cash' ? colors.primary : colors.gray400}
                                />
                                <Text
                                  style={[
                                    styles.downPayBtnText,
                                    { color: cart.initialPaymentMethod === 'cash' ? colors.primary : colors.gray500 },
                                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                                  ]}
                                >
                                  {t('sales.cash', 'کاش')}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => cart.setInitialPaymentMethod('fib')}
                                activeOpacity={0.8}
                                style={[
                                  styles.downPayBtn,
                                  cart.initialPaymentMethod === 'fib'
                                    ? { borderColor: '#3B82F6', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF' }
                                    : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.gray50 },
                                  { flexDirection },
                                ]}
                              >
                                <Ionicons
                                  name="phone-portrait-outline"
                                  size={17}
                                  color={cart.initialPaymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray400}
                                />
                                <Text
                                  style={[
                                    styles.downPayBtnText,
                                    { color: cart.initialPaymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray500 },
                                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                                  ]}
                                >
                                  {t('sales.fib', 'FIB')}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
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

                <CheckoutActionGrid
                  mode={checkoutMode}
                  onSelectMode={setCheckoutMode}
                  type="sale"
                  receiptCurrency={receiptCurrency}
                  onSelectReceiptCurrency={setReceiptCurrency}
                />

                <InvoiceAboutPolicyAccordion />

                <View style={{ marginTop: 12 }}>
                  <PrimaryButton
                    label={getCompleteButtonLabel()}
                    onPress={handleCompleteSale}
                    loading={isSubmitting}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={[styles.step3Body, isTablet && contentContainerStyle]}>
          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
            <PremiumCard style={styles.sectionCard} padding={12}>
              <DateTimePicker
                value={saleDate}
                onChange={setSaleDate}
                label={t('sales.saleDate')}
                maxDate={new Date()}
                style={{ marginBottom: 0 }}
              />
            </PremiumCard>
          </MotiView>

          <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300, delay: 40 }}>
            <PremiumCard style={styles.sectionCard} padding={12}>
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
            <PremiumCard style={styles.sectionCard} padding={12}>
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
                    onChangeText={(t) => cart.setPaidAmount(sanitizeNumericInput(toEnglishDigits(t), 'decimal-pad'))}
                    onEndEditing={() => {
                      const n = parseFloat(toEnglishDigits(cart.paidAmount).replace(/,/g, '')) || 0;
                      if (n > maxDownPayment) {
                        cart.setPaidAmount(maxDownPayment > 0 ? String(maxDownPayment) : '');
                      }
                    }}
                    keyboardType="decimal-pad"
                    forceLatin
                    error={isPaidExceeded ? t('sales.downPaymentMustBeLess') : undefined}
                  />
                  <Text style={[{ fontSize: 12, color: colors.gray400, marginTop: 4, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {t('sales.maxDownPayment')} {maxDownPaymentDisplay}
                  </Text>
                  {(parseFloat(toEnglishDigits(cart.paidAmount).replace(/,/g, '')) || 0) > 0 && (
                    <View style={{ marginTop: 10, marginBottom: 12 }}>
                      <Text
                        style={[
                          { color: colors.gray500, fontSize: 13, marginBottom: 8, textAlign },
                          isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {t('sales.downPaymentMethod', 'شێوازی پارەدانی پێشەکی')}
                      </Text>
                      <View style={[{ flexDirection, gap: 8 }]}>
                        <TouchableOpacity
                          onPress={() => cart.setInitialPaymentMethod('cash')}
                          activeOpacity={0.8}
                          style={[
                            styles.downPayBtn,
                            cart.initialPaymentMethod === 'cash'
                              ? { borderColor: colors.primary, backgroundColor: colors.softBlue }
                              : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.gray50 },
                            { flexDirection },
                          ]}
                        >
                          <Ionicons
                            name="cash-outline"
                            size={18}
                            color={cart.initialPaymentMethod === 'cash' ? colors.primary : colors.gray400}
                          />
                          <Text
                            style={[
                              styles.downPayBtnText,
                              { color: cart.initialPaymentMethod === 'cash' ? colors.primary : colors.gray500 },
                              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                            ]}
                          >
                            {t('sales.cash', 'کاش')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => cart.setInitialPaymentMethod('fib')}
                          activeOpacity={0.8}
                          style={[
                            styles.downPayBtn,
                            cart.initialPaymentMethod === 'fib'
                              ? { borderColor: '#3B82F6', backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF' }
                              : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.gray50 },
                            { flexDirection },
                          ]}
                        >
                          <Ionicons
                            name="phone-portrait-outline"
                            size={17}
                            color={cart.initialPaymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray400}
                          />
                          <Text
                            style={[
                              styles.downPayBtnText,
                              { color: cart.initialPaymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray500 },
                              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                            ]}
                          >
                            {t('sales.fib', 'FIB')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
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

          {renderInvoicePreviewSection(false)}

          <CheckoutActionGrid
            mode={checkoutMode}
            onSelectMode={setCheckoutMode}
            type="sale"
            receiptCurrency={receiptCurrency}
            onSelectReceiptCurrency={setReceiptCurrency}
          />

          <InvoiceAboutPolicyAccordion />

          <View style={{ marginTop: 12 }}>
            <PrimaryButton
              label={getCompleteButtonLabel()}
              onPress={handleCompleteSale}
              loading={isSubmitting}
            />
          </View>

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
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBarScanTextCol: {
    flex: 1,
  },
  navBarScanTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1F2937',
  },
  navBarScanSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1.5,
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
    minHeight: 42,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cartGrid: {
    width: '100%',
  },
  cartGridTablet: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  cartGridCol: {
    width: '100%',
  },
  cartGridColTablet: {
    width: '48.8%',
  },
  cartCarouselContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 6,
  },
  carouselWrapper: {
    width: '100%',
    position: 'relative',
  },
  cartMobileScroll: {
    width: '100%',
    overflow: 'visible',
  },
  cartMobileScrollContent: {
    alignItems: 'stretch',
    paddingVertical: 2,
  },
  mobileSwipeIndicatorRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  mobileSwipeCounterWrap: {
    alignItems: 'center',
    gap: 8,
  },
  mobileSwipeCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  microDotsRow: {
    alignItems: 'center',
    gap: 4,
  },
  microDot: {
    height: 4,
    borderRadius: 2,
  },
  microDotActive: {
    width: 12,
  },
  microDotInactive: {
    width: 4,
  },
  microSwipeHintPill: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  microSwipeHintText: {
    fontSize: 10.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
  sideMicroChevronLeft: {
    position: 'absolute',
    left: -4,
    top: '42%',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  sideMicroChevronRight: {
    position: 'absolute',
    right: -4,
    top: '42%',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
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
  step3Body:     { padding: 14, paddingBottom: 40 },
  sectionCard:   { marginBottom: 8 },
  sectionTitle:  { fontSize: 14.5, fontWeight: '700', marginBottom: 8 },
  debtSection:   { marginTop: 14 },
  downPayBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  downPayBtnText:{ fontSize: 14, fontWeight: '700' },
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
  invoicePreviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 6,
    overflow: 'hidden',
  },
  accordionHeaderBtn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  accordionHeaderLeft: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  accordionHeaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  accordionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  accordionHeaderRight: {
    alignItems: 'center',
    gap: 8,
  },
  accordionStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 5,
  },
  accordionStatusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accordionChevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoicePreviewExpandedWrapper: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
  },
});
