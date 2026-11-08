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
import { directPrintInvoice, directPrintThermalInvoice, type ReceiptPaperSize, type ThermalReceiptWidth } from '@/lib/generateInvoice';
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
import { CustomInstallmentModal } from '@/components/sales/CustomInstallmentModal';

type Step = 1 | 2 | 3;

const INSTALLMENT_MONTH_PRESETS = [3, 6, 12];

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
  const [customInstallmentModalOpen, setCustomInstallmentModalOpen] = useState(false);
  const [targetMonthlyInput, setTargetMonthlyInput] = useState('');

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
    const offsetX = Math.abs(e.nativeEvent?.contentOffset?.x ?? 0);
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
  const isPaidExceeded = (cart.paymentMethod === 'debt' || cart.paymentMethod === 'installment') && rawPaidNum > maxDownPayment;
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

    if (cart.paymentMethod === 'installment') {
      if (isDirectCust || !nameVal || !phoneVal) {
        Alert.alert(
          isKuLanguage ? 'کڕیاری ڕاستەوخۆ بۆ قیست ڕێگەپێنەدراوە' : t('common.error'),
          t('sales.noDirectCustomerForInstallment', 'نابێت بە کڕیاری ڕاستەوخۆ قیست بدرێت. تکایە کڕیارێک دیاری بکە یان ناو و مۆبایلی کڕیار پڕ بکەرەوە.')
        );
        if (isDirectCust || !nameVal) setNameError(t('customers.nameRequired'));
        if (isDirectCust || !phoneVal) setPhoneError(t('customers.phoneRequired'));
        return;
      }
    }

    if (cart.paymentMethod === 'debt' || cart.paymentMethod === 'installment') {
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
        installmentMonths: cart.installmentMonths,
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

      if (
        checkoutMode === 'print' ||
        checkoutMode === 'print58' ||
        checkoutMode === 'print80' ||
        checkoutMode === 'print110'
      ) {
        const business = useBusinessStore.getState();
        const paperSize: ReceiptPaperSize =
          checkoutMode === 'print58'
            ? '58mm'
            : checkoutMode === 'print80'
            ? '80mm'
            : checkoutMode === 'print110'
            ? '110mm'
            : 'A4';

        if (paperSize === 'A4') {
          // Fire A4 direct print in background so checkout screen transitions instantly
          directPrintInvoice(
            sale,
            {
              name: business.name || 'My Store',
              phone: business.phone || '',
              address: business.address || '',
              logoUri: business.logoUri ?? null,
            },
            receiptCurrency,
            'A4'
          ).catch((printErr) => {
            console.error('[Sale] Direct A4 print error:', printErr);
          });
        } else {
          // Fire thermal print (58mm, 80mm, 110mm) in background with exact chosen width
          directPrintThermalInvoice(
            sale,
            {
              name: business.name || 'My Store',
              phone: business.phone || '',
              address: business.address || '',
              logoUri: business.logoUri ?? null,
            },
            paperSize as ThermalReceiptWidth,
            receiptCurrency
          ).catch((printErr) => {
            console.error('[Sale] Direct thermal print error:', printErr);
          });
        }

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

        {/* Simplified & Clean Barcode Scanner Banner with Single Icon - Mobile Only */}
        {Platform.OS !== 'web' && (
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
        )}
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
            {Platform.OS !== 'web' && (
              <HeaderActionButton icon="barcode-outline" onPress={() => setScannerOpen(true)} />
            )}
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
                  {Platform.OS !== 'web' && (
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
                  )}

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
            {Platform.OS !== 'web' && (
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
            )}

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
              {/* Prominent Fixed Top Navigation Bar for Cart Items */}
              <View
                style={[
                  styles.cartNavHeader,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : colors.gray200,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                {/* Previous Item Button (Right in RTL, Left in LTR) */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={activeCartIndex === 0}
                  onPress={() => scrollToCartIndex(activeCartIndex - 1)}
                  style={[
                    styles.cartNavBtn,
                    {
                      opacity: activeCartIndex === 0 ? 0.35 : 1,
                      backgroundColor: activeCartIndex === 0
                        ? 'transparent'
                        : (isDark ? 'rgba(255,255,255,0.06)' : colors.gray100),
                      borderColor: activeCartIndex === 0
                        ? (isDark ? 'rgba(255,255,255,0.08)' : colors.gray200)
                        : (isDark ? '#475569' : colors.gray300),
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isRTL ? "chevron-forward" : "chevron-back"}
                    size={18}
                    color={activeCartIndex === 0 ? colors.gray400 : colors.primary}
                  />
                  <Text
                    style={[
                      styles.cartNavBtnText,
                      { color: activeCartIndex === 0 ? colors.gray400 : (isDark ? '#F8FAFC' : '#0F172A') },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKuLanguage ? 'پێشوو' : 'Prev'}
                  </Text>
                </TouchableOpacity>

                {/* Center: Counter & Interactive Dots */}
                <View style={styles.cartNavCenter}>
                  <Text
                    style={[
                      styles.cartNavCounterText,
                      { color: isDark ? '#F1F5F9' : '#0F172A' },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKuLanguage
                      ? `کاڵای ${activeCartIndex + 1} لە ${cart.items.length}`
                      : `Item ${activeCartIndex + 1} of ${cart.items.length}`}
                  </Text>
                  <View style={[styles.microDotsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {cart.items.map((_, i) => (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.7}
                        onPress={() => scrollToCartIndex(i)}
                        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                      >
                        <View
                          style={[
                            styles.microDot,
                            i === activeCartIndex
                              ? [styles.microDotActive, { backgroundColor: colors.primary }]
                              : [styles.microDotInactive, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : colors.gray300 }],
                          ]}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Next Item Button (Left in RTL, Right in LTR) */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={activeCartIndex >= cart.items.length - 1}
                  onPress={() => {
                    if (activeCartIndex < cart.items.length - 1) {
                      scrollToCartIndex(activeCartIndex + 1);
                    }
                  }}
                  style={[
                    styles.cartNavBtn,
                    {
                      opacity: activeCartIndex >= cart.items.length - 1 ? 0.35 : 1,
                      backgroundColor: activeCartIndex >= cart.items.length - 1
                        ? 'transparent'
                        : (isDark ? 'rgba(255,255,255,0.06)' : colors.gray100),
                      borderColor: activeCartIndex >= cart.items.length - 1
                        ? (isDark ? 'rgba(255,255,255,0.08)' : colors.gray200)
                        : (isDark ? '#475569' : colors.gray300),
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[
                      styles.cartNavBtnText,
                      {
                        color: activeCartIndex >= cart.items.length - 1
                          ? colors.gray400
                          : (isDark ? '#F8FAFC' : '#0F172A'),
                      },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKuLanguage ? 'دواتر' : 'Next'}
                  </Text>
                  <Ionicons
                    name={isRTL ? "chevron-back" : "chevron-forward"}
                    size={18}
                    color={activeCartIndex >= cart.items.length - 1 ? colors.gray400 : colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Fast & Smooth Horizontal Snapping ScrollView with Peek */}
              <View style={styles.carouselWrapper}>
                <ScrollView
                  ref={cartScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  directionalLockEnabled={true}
                  canCancelContentTouches={true}
                  keyboardShouldPersistTaps="handled"
                  snapToInterval={mobileCardWidth + 10}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  disableIntervalMomentum={true}
                  overScrollMode="never"
                  bounces={false}
                  scrollEventThrottle={16}
                  onMomentumScrollEnd={onCartScroll}
                  onScrollEndDrag={onCartScroll}
                  style={[
                    styles.cartMobileScroll,
                    isRTL ? { transform: [{ scaleX: -1 }] } : undefined,
                  ]}
                  contentContainerStyle={[
                    styles.cartMobileScrollContent,
                    {
                      gap: 10,
                      paddingEnd: Math.max(40, screenWidth - mobileCardWidth + 10),
                    },
                  ]}
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

                {/* Left Side Large Cue Button (Next in RTL, Prev in LTR) */}
                {((isRTL && activeCartIndex < cart.items.length - 1) || (!isRTL && activeCartIndex > 0)) && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => scrollToCartIndex(isRTL ? activeCartIndex + 1 : activeCartIndex - 1)}
                    style={[
                      styles.sideMicroChevronLeft,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: colors.primary,
                      },
                    ]}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  >
                    <Ionicons name="chevron-back" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}

                {/* Right Side Large Cue Button (Prev in RTL, Next in LTR) */}
                {((isRTL && activeCartIndex > 0) || (!isRTL && activeCartIndex < cart.items.length - 1)) && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => scrollToCartIndex(isRTL ? activeCartIndex - 1 : activeCartIndex + 1)}
                    style={[
                      styles.sideMicroChevronRight,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                        borderColor: colors.primary,
                      },
                    ]}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  >
                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
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
                  : (isKuLanguage
                      ? `پیشاندانی پسوولە • ${checkoutMode === 'print' ? 'A4' : checkoutMode === 'print58' ? '58mm' : checkoutMode === 'print80' ? '80mm' : checkoutMode === 'print110' ? '110mm' : 'ئاسایی'}`
                      : `Show Preview • ${checkoutMode === 'print' ? 'A4' : checkoutMode === 'print58' ? '58mm' : checkoutMode === 'print80' ? '80mm' : checkoutMode === 'print110' ? '110mm' : 'Normal'}`)}
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
                installmentMonths: cart.paymentMethod === 'installment' ? cart.installmentMonths : undefined,
                installmentDownPayment: cart.paymentMethod === 'installment' ? cart.effectivePaidIQD() : undefined,
                installmentMonthlyAmount: cart.paymentMethod === 'installment' ? (cart.installmentMonths > 0 ? Math.round(cart.remainingDebt() / cart.installmentMonths) : 0) : undefined,
                subtotal,
                discountTotal,
                globalDiscountType: cart.globalDiscountType,
                globalDiscount: globalDiscountAmount,
                grandTotal,
                paidAmount: (cart.paymentMethod === 'debt' || cart.paymentMethod === 'installment')
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
              currencyMode={receiptCurrency}
            />
          </View>
        )}
      </View>
    </MotiView>
  );

  const isDirectCustomer = isDirectCustomerName(cart.customerInput.name);

  const renderInstallmentSection = () => {
    if (cart.paymentMethod !== 'installment') return null;

    const remainingBal = cart.remainingDebt();
    const durationMonths = Math.max(1, cart.installmentMonths || 1);
    const remainingInCurrency = isUSD
      ? (exchangeRate ? remainingBal / exchangeRate : 0)
      : remainingBal;

    const targetMonthlyNum = parseFloat(toEnglishDigits(targetMonthlyInput).replace(/,/g, '')) || 0;
    const isTargetActive = targetMonthlyNum > 0 && Math.ceil(remainingInCurrency / targetMonthlyNum) === durationMonths;
    const baseMonthlyAmount = isTargetActive
      ? targetMonthlyNum
      : (durationMonths > 0 ? (remainingInCurrency / durationMonths) : 0);

    const lastInstallmentAmount = isTargetActive
      ? Math.max(0, remainingInCurrency - baseMonthlyAmount * (durationMonths - 1))
      : baseMonthlyAmount;
    const hasDifferentLastInstallment = isTargetActive && durationMonths > 1 && Math.abs(lastInstallmentAmount - baseMonthlyAmount) >= 0.01;

    const monthlyAmtIQD = Math.round(remainingBal / durationMonths);
    const monthlyAmtUSD = exchangeRate ? Math.round((monthlyAmtIQD / exchangeRate) * 100) / 100 : 0;

    return (
      <View style={styles.installmentContainer}>
        {/* Direct Customer Warning Banner if direct customer is selected */}
        {isDirectCustomer && (
          <View style={[styles.directCustWarningBox, { flexDirection }]}>
            <Ionicons name="warning-outline" size={20} color="#D97706" style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={[styles.directCustWarningTitle, { textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {t('sales.directCustomerInstallmentWarning', '⚠️ قیست بە کڕیاری ڕاستەوخۆ نادرێت. تکایە ناوی کڕیار و مۆبایل پڕ بکەرەوە.')}
              </Text>
              <Text style={[styles.directCustWarningDesc, { textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {t('sales.noDirectCustomerForInstallment', 'نابێت بە کڕیاری ڕاستەوخۆ قیست بدرێت. تکایە کڕیارێک دیاری بکە یان ناو و مۆبایلی کڕیار پڕ بکەرەوە.')}
              </Text>
            </View>
          </View>
        )}

        {/* 1. Down Payment (Optional) */}
        <View style={styles.installmentFieldGroup}>
          <View style={[{ flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }]}>
            <Text style={[{ fontSize: 13, color: colors.gray500, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
              {t('sales.installmentDownPayment', 'بڕی پێشەکی (ئارەزوومەندانە)')}
            </Text>
            <Text style={[{ fontSize: 11, color: colors.gray400 }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
              {rawPaidNum > 0 ? '' : (isKuLanguage ? 'بێ پێشەکی (٠)' : 'No down payment')}
            </Text>
          </View>

          <AppTextInput
            label=""
            placeholder={isUSD ? '0.00 (سەر بەستانە)' : '0 (سەر بەستانە)'}
            kurdishPlaceholderFont={true}
            value={cart.paidAmount}
            onChangeText={(text) => cart.setPaidAmount(sanitizeNumericInput(toEnglishDigits(text), 'decimal-pad'))}
            onEndEditing={() => {
              const n = parseFloat(toEnglishDigits(cart.paidAmount).replace(/,/g, '')) || 0;
              if (n > maxDownPayment) {
                cart.setPaidAmount(maxDownPayment > 0 ? String(maxDownPayment) : '');
              }
            }}
            keyboardType="decimal-pad"
            forceLatin
            style={[isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}
            error={isPaidExceeded ? t('sales.downPaymentMustBeLess') : undefined}
          />
          <Text style={[{ fontSize: 12, color: colors.gray400, marginTop: 4, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
            {t('sales.maxDownPayment')} {maxDownPaymentDisplay}
          </Text>

          {/* Down Payment Method (Cash vs FIB) if paidAmount > 0 */}
          {rawPaidNum > 0 && (
            <View style={{ marginTop: 10, marginBottom: 8 }}>
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
        </View>

        {/* 2. Duration (Months) presets: exactly 3 presets + 1 custom modal button */}
        <View style={styles.installmentFieldGroup}>
          <Text style={[{ fontSize: 13, color: colors.gray500, marginBottom: 8, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
            {t('sales.installmentMonths', 'ماوەی قیست (بە مانگ)')}
          </Text>

          <View style={[styles.durationPresetsGrid, { flexDirection: 'row', gap: 6 }]}>
            {INSTALLMENT_MONTH_PRESETS.map((m) => {
              const isSelected = cart.installmentMonths === m;
              return (
                <TouchableOpacity
                  key={m}
                  activeOpacity={0.7}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {}
                    cart.setInstallmentMonths(m);
                    cart.setCustomInstallmentMonths('');
                    const remCur = isUSD ? (exchangeRate ? cart.remainingDebt() / exchangeRate : 0) : cart.remainingDebt();
                    const calcMonthly = m > 0 ? (remCur / m) : 0;
                    setTargetMonthlyInput(isUSD ? calcMonthly.toFixed(2) : String(Math.round(calcMonthly)));
                  }}
                  style={[
                    styles.durationChip,
                    {
                      flex: 1,
                      borderColor: isSelected ? colors.primary : colors.gray200,
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.12)')
                        : (isDark ? colors.gray100 : colors.gray50),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      {
                        color: isSelected ? colors.primary : colors.gray500,
                        fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                      },
                    ]}
                  >
                    {m} {isKuLanguage ? 'مانگ' : 'mo'}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom preset button (opens centered modal like Image 2) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {}
                setCustomInstallmentModalOpen(true);
              }}
              style={[
                styles.durationChip,
                {
                  flex: 1.25,
                  borderColor: !INSTALLMENT_MONTH_PRESETS.includes(cart.installmentMonths) ? colors.primary : colors.gray200,
                  backgroundColor: !INSTALLMENT_MONTH_PRESETS.includes(cart.installmentMonths)
                    ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.12)')
                    : (isDark ? colors.gray100 : colors.gray50),
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={!INSTALLMENT_MONTH_PRESETS.includes(cart.installmentMonths) ? colors.primary : colors.gray500}
                style={{ marginEnd: 4 }}
              />
              <Text
                style={[
                  styles.durationChipText,
                  {
                    color: !INSTALLMENT_MONTH_PRESETS.includes(cart.installmentMonths) ? colors.primary : colors.gray500,
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                  },
                ]}
              >
                {!INSTALLMENT_MONTH_PRESETS.includes(cart.installmentMonths)
                  ? `${cart.installmentMonths} ${isKuLanguage ? 'مانگ' : 'mo'}`
                  : (isKuLanguage ? 'کەستەم' : 'Custom')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Desired Monthly Payment Input (Two-way calculation / flexible monthly installment) */}
        <View style={styles.installmentFieldGroup}>
          <View style={[{ flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }]}>
            <Text style={[{ fontSize: 13, color: colors.gray500, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
              {t('sales.monthlyInstallmentTarget', 'بڕی مانگانەی پێویست (دڵخواز)')}
            </Text>
            <Text style={[{ fontSize: 11, color: colors.gray400 }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
              {isUSD ? 'USD' : 'IQD'}
            </Text>
          </View>

          <AppTextInput
            label=""
            placeholder={isUSD ? '$30.00 (نموونە: ٣٠ دۆلار)' : '50,000 (نموونە: ٥٠ هەزار)'}
            kurdishPlaceholderFont={true}
            value={targetMonthlyInput}
            onChangeText={(val) => {
              const cleaned = sanitizeNumericInput(toEnglishDigits(val), 'decimal-pad');
              setTargetMonthlyInput(cleaned);
              const parsed = parseFloat(toEnglishDigits(cleaned).replace(/,/g, '')) || 0;
              if (parsed > 0) {
                const remCur = isUSD ? (exchangeRate ? cart.remainingDebt() / exchangeRate : 0) : cart.remainingDebt();
                const needed = Math.ceil(remCur / parsed);
                if (needed >= 1 && needed <= 120) {
                  cart.setInstallmentMonths(needed);
                }
              }
            }}
            keyboardType="decimal-pad"
            forceLatin
            style={[isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}
          />
          <Text style={[{ fontSize: 11, color: colors.gray400, marginTop: 2, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
            {t('sales.monthlyInstallmentDesc', 'دەتوانیت بڕی مانگانە بنووسیت تا سیستەم خۆی ژمارەی مانگەکان یەکسان بکات')}
          </Text>
        </View>

        {/* 4. Live Installment Summary Card */}
        <View
          style={[
            styles.installmentSummaryCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FEFCE8',
              borderColor: isDark ? '#334155' : '#FEF08A',
            },
          ]}
        >
          <View style={[{ flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }]}>
            <View style={[{ flexDirection, alignItems: 'center', gap: 6 }]}>
              <Ionicons name="calculator-outline" size={18} color="#D4AF37" />
              <Text style={[{ fontSize: 14, color: isDark ? '#F1F5F9' : '#854D0E', textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {isKuLanguage ? 'وردەکاری قیست' : 'Installment Summary'}
              </Text>
            </View>
            <View style={[styles.durationBadge, { backgroundColor: isDark ? '#0F172A' : '#FEF3C7' }]}>
              <Text style={[{ fontSize: 12, color: '#D4AF37' }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {durationMonths} {isKuLanguage ? 'مانگ' : 'Months'}
              </Text>
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <View style={[{ flexDirection, justifyContent: 'space-between' }]}>
              <Text style={[{ fontSize: 12, color: colors.gray400, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {t('sales.grandTotal', 'کۆی گشتی')}:
              </Text>
              <AmountText value={cart.grandTotal()} variant="small" style={{ fontSize: 13, color: colors.gray500 }} />
            </View>

            {rawPaidNum > 0 && (
              <View style={[{ flexDirection, justifyContent: 'space-between' }]}>
                <Text style={[{ fontSize: 12, color: colors.gray400, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                  {t('sales.downPayment', 'پێشەکی')}:
                </Text>
                <AmountText value={cart.effectivePaidIQD()} variant="small" style={{ fontSize: 13, color: '#16A34A' }} />
              </View>
            )}

            <View style={[{ flexDirection, justifyContent: 'space-between' }]}>
              <Text style={[{ fontSize: 12, color: colors.gray400, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {t('sales.installmentRemaining', 'بڕی ماوە بە قیست')}:
              </Text>
              <AmountText value={remainingBal} variant="small" style={{ fontSize: 13, color: errorTint.text }} />
            </View>

            <View style={[styles.installmentDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />

            {/* Monthly Installment Highlight with Uneven Last Month details */}
            <View style={[{ flexDirection, justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }]}>
              <View style={{ flex: 1, marginEnd: 8 }}>
                <Text style={[{ fontSize: 13, color: isDark ? '#F8FAFC' : '#1E293B', textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {t('sales.monthlyInstallment', 'قیستی مانگانە')}:
                </Text>
                <Text style={[{ fontSize: 11, color: colors.gray400, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                  {hasDifferentLastInstallment
                    ? `(${durationMonths - 1} ${isKuLanguage ? 'مانگ بە' : 'mo @'} ${isUSD ? '$' + fmtUSD(baseMonthlyAmount) : fmtIQD(baseMonthlyAmount)} + ${isKuLanguage ? 'کۆتایی' : 'last'} ${isUSD ? '$' + fmtUSD(lastInstallmentAmount) : fmtIQD(lastInstallmentAmount)})`
                    : `(${durationMonths} ${isKuLanguage ? 'قیستی یەکسان' : 'equal payments'})`}
                </Text>
              </View>
              <View style={{ alignItems: alignEnd }}>
                <Text style={[styles.monthlyInstallmentValue, { color: '#D4AF37' }]}>
                  {isUSD ? `$${fmtUSD(baseMonthlyAmount)}` : fmtIQD(baseMonthlyAmount)}
                </Text>
                {isUSD && (
                  <Text style={{ fontSize: 11, color: colors.gray400 }}>
                    ≈ {fmtIQD(Math.round(baseMonthlyAmount * (exchangeRate || 1310)))}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

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
                      onChange={(m) => {
                        cart.setPaymentMethod(m);
                        if (m === 'installment' && isDirectCustomerName(cart.customerInput.name)) {
                          cart.setCustomerInput({ name: '', phone: '' });
                        }
                      }}
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

                    {renderInstallmentSection()}
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
                onChange={(m) => {
                  cart.setPaymentMethod(m);
                  if (m === 'installment' && isDirectCustomerName(cart.customerInput.name)) {
                    cart.setCustomerInput({ name: '', phone: '' });
                  }
                }}
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

              {renderInstallmentSection()}
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

      {Platform.OS !== 'web' && (
        <BarcodeScannerModal
          visible={scannerOpen}
          onClose={() => handleFinishScanner(0)}
          mode="multi"
          title={isKuLanguage ? 'سکانەری بەرهەمەکانی فرۆشتن' : 'Sales Barcode Scanner'}
          subtitle={isKuLanguage ? 'کامێرا بگرە لەسەر بارکۆدەکان بۆ زیادکردنی ڕاستەوخۆ' : 'Scan items rapidly into cart'}
          onScanMulti={handleScanMulti}
          onFinishMulti={handleFinishScanner}
        />
      )}

      <CustomInstallmentModal
        visible={customInstallmentModalOpen}
        onClose={() => setCustomInstallmentModalOpen(false)}
        initialMonths={cart.installmentMonths}
        startDate={saleDate}
        remainingBalance={cart.remainingDebt()}
        isUSD={isUSD}
        exchangeRate={exchangeRate}
        onApply={(months) => {
          cart.setInstallmentMonths(months);
          cart.setCustomInstallmentMonths('');
          const remCur = isUSD ? (exchangeRate ? cart.remainingDebt() / exchangeRate : 0) : cart.remainingDebt();
          const calcMonthly = months > 0 ? (remCur / months) : 0;
          setTargetMonthlyInput(isUSD ? calcMonthly.toFixed(2) : String(Math.round(calcMonthly)));
        }}
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
  cartNavHeader: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  cartNavBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 38,
  },
  cartNavBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
  cartNavCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cartNavCounterText: {
    fontSize: 12.5,
    fontWeight: '800',
    includeFontPadding: false,
  },
  microDotsRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  microDot: {
    height: 5,
    borderRadius: 2.5,
  },
  microDotActive: {
    width: 16,
  },
  microDotInactive: {
    width: 6,
  },
  sideMicroChevronLeft: {
    position: 'absolute',
    left: -8,
    top: '44%',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
  },
  sideMicroChevronRight: {
    position: 'absolute',
    right: -8,
    top: '44%',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
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
  installmentContainer: {
    marginTop: 12,
    gap: 12,
  },
  directCustWarningBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'flex-start',
  },
  directCustWarningTitle: {
    fontSize: 13,
    color: '#D97706',
    marginBottom: 2,
  },
  directCustWarningDesc: {
    fontSize: 12,
    color: '#B45309',
  },
  installmentFieldGroup: {
    gap: 4,
  },
  durationPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationChipText: {
    fontSize: 13,
  },
  installmentSummaryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  installmentDivider: {
    height: 1,
    marginVertical: 6,
  },
  monthlyInstallmentValue: {
    fontSize: 17,
    fontWeight: '700',
  },
});
