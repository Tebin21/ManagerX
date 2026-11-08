import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProductSearchBar } from '@/components/sales/ProductSearchBar';
import { ProductSearchResult } from '@/components/sales/ProductSearchResult';
import { CartSummaryBar } from '@/components/sales/CartSummaryBar';
import { SaleStepIndicator } from '@/components/sales/SaleStepIndicator';
import { BarcodeScannerModal } from '@/components/shared/BarcodeScannerModal';
import { EditDefaultNotesModal } from '@/components/quotations/EditDefaultNotesModal';
import { useInventoryStore } from '@/store/inventoryStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCustomerStore } from '@/store/customerStore';
import { useSettingsStore, type ReceiptPaperSize } from '@/store/settingsStore';
import { useQuotationStore } from '@/store/quotationStore';
import { useLanguageStore } from '@/store/languageStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shareQuotationInvoice, directPrintQuotationInvoice } from '@/lib/generateInvoice';
import type { CheckoutMode } from '@/components/shared/CheckoutActionGrid';
import { PrintFormatPickerModal } from '@/components/shared/PrintFormatPickerModal';
import {
  getOrCreateCustomerAccount,
  searchCustomersList,
  DIRECT_CUSTOMER_NAME,
  ensureDirectCustomer,
} from '@/lib/sqlite';
import { fmtIQD, fmtUSD, formatDateTimeUI, formatTime, sanitizeNumericInput, toEnglishDigits } from '@/utils/formatters';
import { Theme } from '@/constants/theme';
import { hexToRgba } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT_REGULAR, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import type { Quotation, QuotationItem, QuotationCurrencyMode } from '@/types/quotation';
import type { InventoryProduct } from '@/types/inventory';
import type { Product } from '@/types/sales';
import type { Customer } from '@/types/customers';
import type { GlobalDiscountType } from '@/types/sales';
import * as Haptics from 'expo-haptics';

type Step = 1 | 2 | 3;

export default function SalesQuotationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const insets = useSafeAreaInsets();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const inventory = useInventoryStore();
  const business = useBusinessStore();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate) || 1310;
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const quotationProductGridLayout = useSettingsStore((s) => s.quotationProductGridLayout);
  const setQuotationProductGridLayout = useSettingsStore((s) => s.setQuotationProductGridLayout);
  const isUSD = baseCurrency === 'USD';

  const isGridView = quotationProductGridLayout;
  const numColumns = isGridView
    ? (isTabletLandscape ? 4 : isTablet ? 3 : 2)
    : 1;

  const { quotations, defaultNotes, currencyMode, addQuotation, setDefaultNotes, setCurrencyMode } = useQuotationStore();

  // Screen Flow Step: 1 = Products, 2 = Cart & Client & Discount, 3 = Invoice Preview
  const [step, setStep] = useState<Step>(1);

  // Search & Filters for Products
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [scannerOpen, setScannerOpen] = useState(false);

  // Quotation Cart Items
  const [items, setItems] = useState<QuotationItem[]>([]);

  // Discounts
  const [globalDiscountType, setGlobalDiscountType] = useState<GlobalDiscountType>('none');
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);
  const [isDiscountExpanded, setIsDiscountExpanded] = useState<boolean>(false);
  const [showCurrencyOptions, setShowCurrencyOptions] = useState<boolean>(false);
  const [showReceiptTypeOptions, setShowReceiptTypeOptions] = useState<boolean>(false);

  const savedQuotationPaperSize = useSettingsStore((s) => s.quotationPaperSizePreference);
  const defaultCheckoutMode: CheckoutMode =
    savedQuotationPaperSize === 'A4'
      ? 'print'
      : savedQuotationPaperSize === '58mm'
      ? 'print58'
      : savedQuotationPaperSize === '110mm'
      ? 'print110'
      : savedQuotationPaperSize === '80mm'
      ? 'print80'
      : 'normal';

  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>(defaultCheckoutMode);

  const toggleReceiptTypeOptions = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {}
    setShowReceiptTypeOptions((prev) => !prev);
  }, []);

  const getReceiptTypeBadgeLabel = useCallback(() => {
    switch (checkoutMode) {
      case 'normal':
        return isKuLanguage ? 'ئاسایی' : 'Normal';
      case 'print':
        return isKuLanguage ? 'پرینت A4' : 'A4 Print';
      case 'print80':
        return '80mm';
      case 'print58':
        return '58mm';
      case 'print110':
        return '110mm';
      default:
        return isKuLanguage ? 'ئاسایی' : 'Normal';
    }
  }, [checkoutMode, isKuLanguage]);

  const toggleCurrencyOptions = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {}
    setShowCurrencyOptions((prev) => !prev);
  }, []);

  const toggleDiscountExpanded = useCallback(() => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {}
    setIsDiscountExpanded((prev) => !prev);
  }, []);

  // Client / Company Details
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameError, setNameError] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInputRef = useRef<TextInput>(null);
  const step2ScrollRef = useRef<ScrollView>(null);

  const isDirectCustomer =
    companyName.trim() === DIRECT_CUSTOMER_NAME ||
    companyName.trim() === 'کڕیاری ڕاستەوخۆ' ||
    companyName.trim() === 'Direct Customer';

  const handleToggleDirectQuotation = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {}

    if (isDirectCustomer) {
      // Toggle OFF: return to manual input fields
      setCompanyName('');
      setSelectedCustomerId(undefined);
      setPhone('');
      setAddress('');
      setNameError(false);
    } else {
      // Toggle ON: activate direct quote and collapse input fields
      setNameError(false);
      setCompanyName(isKuLanguage ? DIRECT_CUSTOMER_NAME : 'Direct Customer');
      setPhone('');
      setAddress('');
      setSuggestions([]);
      setShowSuggestions(false);
      try {
        const directId = await ensureDirectCustomer();
        setSelectedCustomerId(directId);
      } catch (err) {
        console.warn('[Quotation] Failed to link direct customer id:', err);
      }
    }
  }, [isDirectCustomer, isKuLanguage]);

  // Quotation Notes & Validity
  const [notes, setNotes] = useState(defaultNotes || 'نرخەکان بەپێی گۆڕانکارییەکانی بازاڕ بۆ ماوەی ٧ ڕۆژ کاریان پێدەکرێت.');
  const [validityDays, setValidityDays] = useState<number>(7);
  const [editDefaultNotesOpen, setEditDefaultNotesOpen] = useState(false);

  // Generated Quotation for Step 3
  const [generatedQuotation, setGeneratedQuotation] = useState<Quotation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formatPickerVisible, setFormatPickerVisible] = useState(false);
  const [quoteToPrint, setQuoteToPrint] = useState<Quotation | null>(null);

  useEffect(() => {
    inventory.loadInventory();
  }, []);

  // Update current notes if defaultNotes change and current note is pristine
  useEffect(() => {
    if (defaultNotes && !notes) {
      setNotes(defaultNotes);
    }
  }, [defaultNotes]);

  // Derived Products from Inventory Search
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
      id: `__quote_grid_filler_${i}`,
      isFiller: true,
    }));
    return [...visibleProducts, ...fillers];
  }, [visibleProducts, isGridView, numColumns]);

  // Quotation Cart Math
  const itemCount = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);

  const itemsSubtotal = useMemo(
    () => items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0),
    [items]
  );

  const itemDiscountsTotal = useMemo(
    () => items.reduce((sum, it) => sum + (it.discount * it.quantity), 0),
    [items]
  );

  const globalDiscountAmount = useMemo(() => {
    const afterItemDiscounts = Math.max(0, itemsSubtotal - itemDiscountsTotal);
    if (globalDiscountType === 'percentage') {
      return (afterItemDiscounts * Math.min(100, Math.max(0, globalDiscountValue))) / 100;
    }
    if (globalDiscountType === 'amount') {
      return Math.min(afterItemDiscounts, Math.max(0, globalDiscountValue));
    }
    return 0;
  }, [itemsSubtotal, itemDiscountsTotal, globalDiscountType, globalDiscountValue]);

  const totalDiscount = itemDiscountsTotal + globalDiscountAmount;
  const grandTotal = Math.max(0, itemsSubtotal - totalDiscount);
  const grandTotalUSD = exchangeRate > 0 ? grandTotal / exchangeRate : 0;
  const itemsSubtotalUSD = exchangeRate > 0 ? itemsSubtotal / exchangeRate : 0;
  const totalDiscountUSD = exchangeRate > 0 ? totalDiscount / exchangeRate : 0;

  // Helpers for In-Cart Quantity in ProductSearchResult
  const getCartQty = useCallback(
    (productId: number) => {
      const it = items.find((i) => i.productId === productId);
      return it ? it.quantity : 0;
    },
    [items]
  );

  const handleAddToCart = useCallback(
    (product: Product | InventoryProduct) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } catch {}

      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  lineTotal: Math.max(0, (i.quantity + 1) * (i.unitPrice - i.discount)),
                }
              : i
          );
        }
        const rawSellPrice = 'sellingPrice' in product
          ? product.sellingPrice
          : ('sellPriceIqd' in product
              ? (product as any).sellPriceIqd
              : ((product as any).sellPriceUsd ? (product as any).sellPriceUsd * exchangeRate : (product as any).sellPrice || 0));
        const unitPrice = rawSellPrice || 0;
        const newItem: QuotationItem = {
          id: `${product.id}_${Date.now()}`,
          productId: product.id,
          productName: product.name,
          itemId: product.itemId || null,
          quantity: 1,
          unitPrice,
          discount: 0,
          lineTotal: unitPrice,
        };
        return [...prev, newItem];
      });
    },
    [exchangeRate]
  );

  const handleDecreaseQty = useCallback((productId: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((i) => i.productId !== productId);
      }
      return prev.map((i) =>
        i.productId === productId
          ? {
              ...i,
              quantity: i.quantity - 1,
              lineTotal: Math.max(0, (i.quantity - 1) * (i.unitPrice - i.discount)),
            }
          : i
      );
    });
  }, []);

  const handleUpdateItemDiscount = useCallback((productId: number, discountValue: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const discount = Math.max(0, Math.min(i.unitPrice, discountValue));
        return {
          ...i,
          discount,
          lineTotal: Math.max(0, i.quantity * (i.unitPrice - discount)),
        };
      })
    );
  }, []);

  const handleUpdateItemPrice = useCallback((productId: number, newPrice: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const unitPrice = Math.max(0, newPrice);
        return {
          ...i,
          unitPrice,
          lineTotal: Math.max(0, i.quantity * (unitPrice - i.discount)),
        };
      })
    );
  }, []);

  const handleRemoveItem = useCallback((productId: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  // Autocomplete suggestions for company/customer
  const fetchCustomerSuggestions = useCallback((q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const clean = q.trim();
    if (!clean) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchCustomersList(clean);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 120);
  }, []);

  const handleSelectCustomer = useCallback((cust: Customer) => {
    setCompanyName(cust.name);
    setPhone(cust.phone ? sanitizeNumericInput(cust.phone, 'phone-pad') : '');
    setAddress(cust.address || '');
    setSelectedCustomerId(cust.id);
    setSuggestions([]);
    setShowSuggestions(false);
    setNameError(false);
  }, []);

  const handleCompanyNameChange = useCallback(
    (text: string) => {
      setCompanyName(text);
      if (nameError) setNameError(false);
      setSelectedCustomerId(undefined);
      fetchCustomerSuggestions(text);
    },
    [fetchCustomerSuggestions, nameError]
  );

  const handleBarcodeScanned = useCallback(
    (code: string) => {
      const clean = code.trim();
      const match = inventory.products.find(
        (p) => (p.itemId && p.itemId.trim() === clean) || p.name.includes(clean)
      );
      if (match) {
        handleAddToCart(match);
      } else {
        Alert.alert(
          isKuLanguage ? 'کاڵا نەدۆزرایەوە' : 'Product Not Found',
          isKuLanguage ? `هیچ کاڵایەک بە باڕکۆدی ${clean} نەدۆزرایەوە.` : `No product found for barcode: ${clean}`
        );
      }
    },
    [inventory.products, handleAddToCart, isKuLanguage]
  );

  // Generate Quotation & Auto-Save Customer Account in SQLite
  const handleGenerateQuotation = async () => {
    const { checkQuotationsLimit } = await import('@/lib/usageLimits');
    const quoteCheck = await checkQuotationsLimit();
    if (!quoteCheck.allowed) {
      const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
      showUsageLimitModal();
      return;
    }

    if (items.length === 0) {
      Alert.alert(
        isKuLanguage ? 'سەبەتە بەتاڵە' : 'Cart Empty',
        isKuLanguage ? 'تکایە لانیکەم یەک بەرهەم دیاری بکە.' : 'Please add at least one product.'
      );
      return;
    }

    // Validation: Quotation invoice CANNOT be zero or have zero price items
    const zeroPriceItem = items.find((i) => !i.unitPrice || i.unitPrice <= 0);
    if (zeroPriceItem || grandTotal <= 0) {
      Alert.alert(
        isKuLanguage ? 'نرخ دیاری نەکراوە' : 'Price Required',
        isKuLanguage
          ? zeroPriceItem
            ? `تکایە نرخی بەرهەمی «${zeroPriceItem.productName}» بنووسە. وەسڵی عەرز نابێت بێ نرخ (سفر) بێت.`
            : 'وەسڵی عەرز نابێت بێ نرخ (سفر) بێت. تکایە نرخی کاڵاکان بنووسە بۆ تەواوکردنی وەسڵ.'
          : 'Quotation invoice cannot be zero or empty. Please enter prices for all items.'
      );
      return;
    }

    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setNameError(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch {}
      step2ScrollRef.current?.scrollTo({ y: 260, animated: true });
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return;
    }

    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    setIsGenerating(true);
    try {
      // 1. Auto-save company/client account into SQLite
      let customerId = selectedCustomerId;
      try {
        if (isDirectCustomer) {
          customerId = await ensureDirectCustomer();
        } else {
          customerId = await getOrCreateCustomerAccount({
            name: trimmedName,
            phone: trimmedPhone || null,
            address: trimmedAddress || null,
            selectedId: selectedCustomerId,
          });
        }
        // Refresh customer store so the new account reflects everywhere immediately
        useCustomerStore.getState().loadCustomers().catch(() => {});
      } catch (e) {
        console.warn('[Quotation] Failed to auto-save customer account:', e);
      }

      // 2. Build quotation document
      const now = new Date();
      let maxSeq = 0;
      for (const q of quotations) {
        if (!q.quotationNumber) continue;
        const match = q.quotationNumber.match(/^B-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
      const quoteNum = `B-${String(maxSeq + 1).padStart(4, '0')}`;
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = formatTime(now);

      const newQuote: Quotation = {
        id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        quotationNumber: quoteNum,
        customerName: trimmedName,
        customerId: customerId || undefined,
        customerPhone: trimmedPhone || undefined,
        customerAddress: trimmedAddress || undefined,
        date: dateStr,
        time: timeStr,
        items: [...items],
        subtotal: itemsSubtotal,
        discountTotal: totalDiscount,
        grandTotal,
        exchangeRate,
        currencyMode: useQuotationStore.getState().currencyMode || currencyMode || 'both',
        notes: notes.trim() || undefined,
        validityDays,
        printCount: 0,
        createdAt: now.toISOString(),
      };

      // 3. Save to Quotation store
      addQuotation(newQuote);
      setGeneratedQuotation(newQuote);

      // If user selected a print mode, trigger direct print in background
      if (checkoutMode === 'print' || checkoutMode === 'print80' || checkoutMode === 'print58' || checkoutMode === 'print110') {
        const paperSize: ReceiptPaperSize =
          checkoutMode === 'print' ? 'A4' :
          checkoutMode === 'print58' ? '58mm' :
          checkoutMode === 'print110' ? '110mm' : '80mm';

        // Fire direct print without blocking
        directPrintQuotationInvoice(
          newQuote,
          {
            name: business.name,
            phone: business.phone,
            address: business.address,
            logoUri: business.logoUri,
          },
          newQuote.currencyMode || currencyMode || 'both',
          paperSize
        ).catch((printErr) => {
          console.error('[Quotation] Direct print error:', printErr);
        });

        useQuotationStore.getState().incrementPrintCount(newQuote.id);
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}

      // Reset form and go back directly to the sales section first screen
      handleResetForNewQuote();
      router.replace('/(app)/sales');
    } catch (err) {
      console.error('[Quotation] Generate error:', err);
      Alert.alert('Error', isKuLanguage ? 'نەتوانرا عەرزەکە دروست بکرێت.' : 'Could not generate quotation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSharePDF = (quoteToShare?: Quotation) => {
    const q = quoteToShare || generatedQuotation;
    if (!q) return;
    setQuoteToPrint(q);
    setFormatPickerVisible(true);
  };

  const handleConfirmPrintFormat = async (paperSize: ReceiptPaperSize) => {
    const q = quoteToPrint || generatedQuotation;
    if (!q) return;
    const { checkInvoicePrintLimit } = await import('@/lib/usageLimits');
    const printCheck = await checkInvoicePrintLimit();
    if (!printCheck.allowed) {
      const { showUsageLimitModal } = await import('@/store/usageLimitModalStore');
      showUsageLimitModal();
      return;
    }
    setIsGenerating(true);
    try {
      useSettingsStore.getState().setQuotationPaperSizePreference(paperSize);
      await shareQuotationInvoice(
        q,
        {
          name: business.name,
          phone: business.phone,
          address: business.address,
          logoUri: business.logoUri,
        },
        q.currencyMode || currencyMode || 'both',
        paperSize
      );
      // Increment print count in store immediately
      useQuotationStore.getState().incrementPrintCount(q.id);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}

      // Automatically reset and navigate back to beginning (Step 1)
      handleResetForNewQuote();
    } catch (err) {
      console.error('[Quotation] Share error:', err);
    } finally {
      setIsGenerating(false);
      setFormatPickerVisible(false);
      setQuoteToPrint(null);
    }
  };

  const handleResetForNewQuote = () => {
    setItems([]);
    setGlobalDiscountType('none');
    setGlobalDiscountValue(0);
    setCompanyName('');
    setPhone('');
    setAddress('');
    setSelectedCustomerId(undefined);
    setNameError(false);
    setNotes(defaultNotes || 'نرخەکان بەپێی گۆڕانکارییەکانی بازاڕ بۆ ماوەی ٧ ڕۆژ کاریان پێدەکرێت.');
    setGeneratedQuotation(null);
    setStep(1);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 1: PRODUCT PICKER & SEARCH (Matching Sales Screen 100%)
  // ═════════════════════════════════════════════════════════════════════════════
  const renderStep1 = () => (
    <View style={styles.flex}>
      <AppHeader
        title={isKuLanguage ? 'عەرزی فرۆشتن' : 'Sales Quotation'}
        gradient={isDark ? ['#0B111E', '#131D31'] : undefined}
        showBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(app)/dashboard' as never);
        }}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isTablet ? 12 : 8 }}>
            <HeaderActionButton
              icon={quotationProductGridLayout ? 'list-outline' : 'grid-outline'}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                } catch {}
                setQuotationProductGridLayout(!quotationProductGridLayout);
              }}
            />
            <HeaderActionButton
              icon="time-outline"
              onPress={() => router.push('/(app)/history?tab=quotations' as never)}
            />
          </View>
        }
      >
        <SaleStepIndicator step={1} />
      </AppHeader>

      <View style={styles.flex}>
        {/* Product Search Bar */}
        <ProductSearchBar
          query={query}
          onQueryChange={setQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={inventory.categories}
          onScanPress={Platform.OS !== 'web' ? () => setScannerOpen(true) : undefined}
        />

        {/* Product List / Grid */}
        <FlatList
          key={`quote-products-${isGridView ? 'grid' : 'list'}-${numColumns}-${isRTL ? 'rtl' : 'ltr'}`}
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
                {inventory.isLoading
                  ? t('common.loading')
                  : query
                  ? t('inventory.noResults')
                  : t('sales.noProducts')}
              </Text>
            </View>
          }
        />

        {/* Floating Cart Summary Bar */}
        <CartSummaryBar
          itemCount={itemCount}
          grandTotal={grandTotal}
          onPress={() => setStep(2)}
        />
      </View>
    </View>
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 2: CART REVIEW, DISCOUNTS, CLIENT & DEFAULT TERMS EDITING
  // ═════════════════════════════════════════════════════════════════════════════
  const renderStep2 = () => {
    // ─────────────────────────────────────────────────────────────────────────
    // Sub-components for modular responsive layout (Dual-pane on Landscape iPad)
    // ─────────────────────────────────────────────────────────────────────────

    // 0. Notice Banner
    const renderNoticeBanner = () => (
      <View
        style={[
          styles.noticeBanner,
          isTablet && { padding: 16, borderRadius: 14, gap: 12 },
          {
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FEF9C3',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.45)' : '#F59E0B',
          },
        ]}
      >
        <Ionicons name="information-circle" size={isTablet ? 22 : 19} color="#F59E0B" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: isTablet ? 14 : 12.5, fontWeight: '800', color: isDark ? '#FBBF24' : '#92400E', textAlign: isRTL ? 'right' : 'left', fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined }}>
            {isKuLanguage
              ? 'سەرنج: ئەم وەسڵە تەنها بۆ عەرزی نرخە و وەسڵی فرۆشتن نییە'
              : 'NOTE: THIS DOCUMENT IS A PRICE QUOTATION ONLY'}
          </Text>
          <Text style={{ fontSize: isTablet ? 12 : 11, color: isDark ? '#D4D4D8' : '#B45309', textAlign: isRTL ? 'right' : 'left', marginTop: 3, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
            {isKuLanguage
              ? 'سەرجەم نرخەکان پێشنیارکراون بۆ شەریکە و کڕیار.'
              : 'All prices are offered for quotation purposes.'}
          </Text>
        </View>
      </View>
    );

    // 1. Selected Products List
    const renderProductsCard = () => (
      <View
        style={[
          styles.card,
          isTablet && { padding: 18, borderRadius: 16 },
          {
            backgroundColor: isDark ? '#131D31' : colors.white,
            borderColor: isDark ? '#1F2E4D' : colors.gray200,
            borderWidth: 1,
          },
        ]}
      >
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 10 : 8 }}>
            <View style={[styles.cardHeaderIconBox, { backgroundColor: isDark ? '#1E2D4A' : '#FEF3C7' }]}>
              <Ionicons name="list-outline" size={isTablet ? 20 : 16} color={isDark ? '#3B82F6' : colors.primary} />
            </View>
            <Text style={[styles.cardTitle, isTablet && { fontSize: 16.5 }, { color: colors.black }]}>
              {isKuLanguage ? 'کاڵاکانی عەرز' : 'Quotation Items'} ({itemCount})
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setStep(1)}
            hitSlop={8}
            style={[
              styles.addMoreBtn,
              {
                backgroundColor: isDark ? 'transparent' : '#FEF9C3',
                borderColor: isDark ? '#2563EB' : colors.primary,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="add" size={14} color={isDark ? '#3B82F6' : colors.primary} />
            <Text style={{ fontSize: isTablet ? 13 : 11.5, fontWeight: '700', color: isDark ? '#3B82F6' : colors.primary }}>
              {isKuLanguage ? 'زیادکردنی تر' : 'Add More'}
            </Text>
          </TouchableOpacity>
        </View>

        {items.map((it, idx) => {
          const itemLineTotalFormatted = isUSD
            ? `${fmtUSD(it.lineTotal / (exchangeRate || 1310))} USD`
            : `${fmtIQD(it.lineTotal)} IQD`;

          return (
            <View
              key={it.id}
              style={[
                styles.itemRowCard,
                isTablet && { padding: 14, borderRadius: 12, marginBottom: 12 },
                {
                  backgroundColor: isDark ? '#172338' : colors.gray50,
                  borderColor: isDark ? '#203152' : colors.gray200,
                },
              ]}
            >
              {/* Row 1: Name, Code & Delete */}
              <View style={[styles.itemRowHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View
                  style={[
                    styles.itemNumBadge,
                    isTablet && { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
                    { backgroundColor: isDark ? '#1E2D4A' : colors.gray200 },
                  ]}
                >
                  <Text style={{ fontSize: isTablet ? 13 : 11, fontWeight: '800', color: isDark ? '#3B82F6' : colors.primary }}>#{idx + 1}</Text>
                </View>
                <View style={{ flex: 1, marginHorizontal: isTablet ? 10 : 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.itemName, isTablet && { fontSize: 16 }, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                    {it.productName}
                  </Text>
                  {it.itemId ? <IdText size="small" style={isTablet ? { fontSize: 13 } : undefined}>{it.itemId}</IdText> : null}
                </View>
                <TouchableOpacity onPress={() => handleRemoveItem(it.productId)} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={isTablet ? 21 : 18} color={colors.error} />
                </TouchableOpacity>
              </View>

              {/* Subtle Divider */}
              <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.gray200, marginVertical: 6 }} />

              {/* Row 2: Price, Quantity Stepper, Line Total */}
              <View style={[styles.itemControlsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Quantity Stepper */}
                <View style={[styles.stepperWrap, isTablet && { gap: 10 }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[
                      styles.stepBtn,
                      isTablet && { width: 36, height: 36, borderRadius: 8 },
                      { backgroundColor: isDark ? '#203152' : colors.gray200 },
                    ]}
                    onPress={() => handleDecreaseQty(it.productId)}
                  >
                    <Ionicons name="remove" size={isTablet ? 18 : 14} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={[styles.stepQty, isTablet && { fontSize: 16, minWidth: 28 }, { color: colors.black }]}>
                    {it.quantity}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.stepBtn,
                      isTablet && { width: 36, height: 36, borderRadius: 8 },
                      { backgroundColor: '#2563EB' },
                    ]}
                    onPress={() => {
                      setItems((prev) =>
                        prev.map((i) =>
                          i.productId === it.productId
                            ? {
                                ...i,
                                quantity: i.quantity + 1,
                                lineTotal: Math.max(0, (i.quantity + 1) * (i.unitPrice - i.discount)),
                              }
                            : i
                        )
                      );
                    }}
                  >
                    <Ionicons name="add" size={isTablet ? 18 : 14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Unit Price Input */}
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1, marginHorizontal: isTablet ? 12 : 8, minWidth: 90 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: isTablet ? 12 : 10, color: it.unitPrice <= 0 ? colors.error : colors.gray400, fontWeight: it.unitPrice <= 0 ? '700' : 'normal' }}>
                      {isKuLanguage ? 'نرخی تاک:' : 'Unit Price:'}
                    </Text>
                    {it.unitPrice <= 0 && (
                      <Text style={{ fontSize: 9, color: colors.error, fontWeight: '700' }}>
                        {isKuLanguage ? '(پێویستە)' : '(Required)'}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.priceInputWrap,
                      isTablet && { minWidth: 120, height: 36, paddingHorizontal: 8 },
                      {
                        borderColor: it.unitPrice <= 0 ? colors.error : (isDark ? '#25385C' : '#CBD5E1'),
                        backgroundColor: isDark ? '#121C2E' : colors.white,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.priceTextInput,
                        isTablet && { fontSize: 14.5 },
                        { color: it.unitPrice <= 0 ? colors.error : colors.black, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                      value={it.unitPrice > 0 ? String(it.unitPrice) : ''}
                      placeholder="0"
                      placeholderTextColor={colors.gray400}
                      keyboardType="numeric"
                      onChangeText={(text) => {
                        const clean = parseFloat(toEnglishDigits(text).replace(/,/g, '')) || 0;
                        handleUpdateItemPrice(it.productId, clean);
                      }}
                    />
                    <Text style={[styles.priceCurrencySuffix, { color: isDark ? '#60A5FA' : colors.primary }]}>IQD</Text>
                  </View>
                </View>

                {/* Line Total */}
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={{ fontSize: isTablet ? 12 : 10, color: colors.gray400 }}>{isKuLanguage ? 'کۆی کاڵا:' : 'Line Total:'}</Text>
                  <Text style={{ fontSize: isTablet ? 16.5 : 14, fontWeight: '800', color: isDark ? '#3B82F6' : colors.primary, direction: 'ltr' }}>
                    {itemLineTotalFormatted}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );

    // 2. Global Discount Section & Financial Totals Preview
    const renderDiscountAndTotalsCard = () => (
      <View
        style={[
          styles.card,
          isTablet && { padding: 18, borderRadius: 16 },
          {
            backgroundColor: isDark ? '#131D31' : colors.white,
            borderColor: isDark ? '#1F2E4D' : colors.gray200,
            borderWidth: 1,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleDiscountExpanded}
          style={[
            styles.cardHeader,
            {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: isDiscountExpanded ? 12 : 4,
            },
          ]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 10 : 8, flex: 1 }}>
            <View style={[styles.discountHeaderIconWrap, isTablet && { width: 42, height: 42, borderRadius: 10 }, { backgroundColor: isDark ? '#1E2D4A' : '#FEF3C7' }]}>
              <Ionicons name="pricetag-outline" size={isTablet ? 21 : 17} color={isDark ? '#3B82F6' : colors.primary} />
            </View>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.cardTitle, isTablet && { fontSize: 16.5 }, { color: colors.black }]}>
                {isKuLanguage ? 'داشکاندنی گشتی لەسەر عەرز' : 'Overall Quotation Discount'}
              </Text>
              <Text style={{ fontSize: isTablet ? 12.5 : 11, color: colors.gray400, marginTop: 1 }}>
                {isDiscountExpanded
                  ? (isKuLanguage ? 'دەست بنێ بۆ شاردنەوە و داخستن' : 'Tap to collapse')
                  : (isKuLanguage ? 'دەست بنێ بۆ دیاریکردن و دەستکاری داشکاندن' : 'Tap to set or edit discount')}
              </Text>
            </View>
          </View>

          {/* Current Discount Status Badge & Toggle Chevron */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 8 : 6 }}>
            <View
              style={[
                styles.discountStatusBadge,
                isTablet && { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
                {
                  backgroundColor:
                    globalDiscountType !== 'none' && globalDiscountValue > 0
                      ? (isDark ? 'rgba(37, 99, 235, 0.22)' : '#FEF3C7')
                      : (isDark ? '#1E2D4A' : colors.gray100),
                  borderColor:
                    globalDiscountType !== 'none' && globalDiscountValue > 0
                      ? (isDark ? '#3B82F6' : colors.primary)
                      : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.discountStatusBadgeText,
                  isTablet && { fontSize: 13 },
                  {
                    color:
                      globalDiscountType !== 'none' && globalDiscountValue > 0
                        ? (isDark ? '#60A5FA' : colors.primary)
                        : colors.gray500,
                  },
                ]}
              >
                {globalDiscountType === 'percentage' && globalDiscountValue > 0
                  ? `%${globalDiscountValue} ${isKuLanguage ? 'داشکاندن' : 'Off'}`
                  : globalDiscountType === 'amount' && globalDiscountValue > 0
                  ? `${globalDiscountValue.toLocaleString()} IQD`
                  : (isKuLanguage ? 'بێ داشکاندن' : 'No Discount')}
              </Text>
            </View>

            <View style={[styles.chevronWrap, isTablet && { width: 30, height: 30, borderRadius: 15 }, { backgroundColor: isDark ? '#1E2D4A' : colors.gray200 }]}>
              <Ionicons
                name={isDiscountExpanded ? 'chevron-up' : 'chevron-down'}
                size={isTablet ? 18 : 16}
                color={colors.gray500}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Discount Controls (Visible only when expanded) */}
        {isDiscountExpanded && (
          <View style={[styles.discountControlsSection, { borderTopColor: isDark ? '#1F2E4D' : colors.gray200 }]}>
            {/* Type selector buttons */}
            <View style={[styles.discountButtonsRow, isTablet && { gap: 12 }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {(['none', 'percentage', 'amount'] as GlobalDiscountType[]).map((dType) => {
                const active = globalDiscountType === dType;
                const label =
                  dType === 'none'
                    ? (isKuLanguage ? 'بێ داشکاندن' : 'None')
                    : dType === 'percentage'
                    ? '%'
                    : (isKuLanguage ? 'بڕ (دینار)' : 'Amount (IQD)');
                return (
                  <TouchableOpacity
                    key={dType}
                    activeOpacity={0.75}
                    style={[
                      styles.discountTypeBtn,
                      isTablet && { paddingVertical: 11, borderRadius: 10 },
                      {
                        backgroundColor: active ? '#2563EB' : (isDark ? '#172338' : colors.gray100),
                        borderColor: active ? '#2563EB' : (isDark ? '#203152' : colors.gray300),
                      },
                    ]}
                    onPress={() => {
                      setGlobalDiscountType(dType);
                      if (dType === 'none') setGlobalDiscountValue(0);
                    }}
                  >
                    <Text style={[styles.discountTypeBtnText, isTablet && { fontSize: 14 }, { color: active ? '#FFFFFF' : (isDark ? colors.gray400 : colors.gray600) }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Value Input */}
            {globalDiscountType !== 'none' && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left', color: isDark ? colors.gray400 : '#64748B' }]}>
                  {globalDiscountType === 'percentage'
                    ? (isKuLanguage ? 'ڕێژەی داشکاندن (%):' : 'Discount Percentage (%):')
                    : (isKuLanguage ? 'بڕی داشکاندن بە دینار:' : 'Discount Amount (IQD):')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isTablet && { fontSize: 16, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
                    {
                      backgroundColor: isDark ? '#121C2E' : colors.gray50,
                      borderColor: isDark ? '#1F2E4D' : colors.gray300,
                      color: colors.black,
                      textAlign: isRTL ? 'right' : 'left',
                      fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined,
                      fontWeight: 'normal',
                    },
                  ]}
                  keyboardType="decimal-pad"
                  value={globalDiscountValue > 0 ? String(globalDiscountValue) : ''}
                  onChangeText={(val) => {
                    const clean = sanitizeNumericInput(val, 'decimal-pad');
                    setGlobalDiscountValue(parseFloat(clean) || 0);
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.gray400}
                />
              </View>
            )}

            {/* Done button to collapse */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={toggleDiscountExpanded}
              style={[
                styles.discountDoneBtn,
                isTablet && { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10 },
                {
                  backgroundColor: isDark ? '#1E2D4A' : colors.gray100,
                  borderColor: isDark ? '#25385C' : colors.gray300,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="checkmark-done" size={isTablet ? 18 : 15} color={isDark ? '#3B82F6' : colors.primary} />
              <Text style={{ fontSize: isTablet ? 14 : 12, fontWeight: '700', color: isDark ? '#3B82F6' : colors.primary }}>
                {isKuLanguage ? 'تەواو و جێگیرکردنی داشکاندن' : 'Done & Apply Discount'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Financial Totals Preview */}
        <View
          style={[
            styles.summaryTotalsBox,
            isTablet && { padding: 16, borderRadius: 12, gap: 8 },
            {
              backgroundColor: isDark ? '#121C2E' : colors.gray50,
              borderColor: isDark ? '#1F2E4D' : colors.gray200,
              borderWidth: 1,
              borderTopWidth: 2,
              borderTopColor: isDark ? '#3B82F6' : colors.primary,
            },
          ]}
        >
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={{ fontSize: isTablet ? 14 : 12.5, color: colors.gray400 }}>{isKuLanguage ? 'کۆی سەرەتایی:' : 'Subtotal:'}</Text>
            <Text style={{ fontSize: isTablet ? 16 : 14, fontWeight: '800', color: colors.black, direction: 'ltr' }}>
              {isUSD ? `$${fmtUSD(itemsSubtotalUSD)} USD` : `${fmtIQD(itemsSubtotal)} IQD`}
            </Text>
          </View>
          {totalDiscount > 0 && (
            <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={{ fontSize: isTablet ? 14 : 12.5, color: colors.error }}>{isKuLanguage ? 'کۆی داشکاندن:' : 'Total Discount:'}</Text>
              <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '700', color: colors.error, direction: 'ltr' }}>
                {isUSD ? `−$${fmtUSD(totalDiscountUSD)} USD` : `−${fmtIQD(totalDiscount)} IQD`}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 4, paddingTop: isTablet ? 8 : 6, borderTopWidth: 1, borderTopColor: isDark ? '#1F2E4D' : colors.gray300 }]}>
            <Text style={{ fontSize: isTablet ? 17 : 14.5, fontWeight: '800', color: colors.black }}>{isKuLanguage ? 'کۆی گشتی:' : 'Grand Total:'}</Text>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text style={{ fontSize: isTablet ? 22 : 18, fontWeight: '900', color: isDark ? '#3B82F6' : colors.primary, direction: 'ltr' }}>
                {currencyMode === 'usd'
                  ? `$${fmtUSD(grandTotalUSD)} USD`
                  : currencyMode === 'iqd'
                  ? `${fmtIQD(grandTotal)} IQD`
                  : isUSD
                  ? `$${fmtUSD(grandTotalUSD)} USD`
                  : `${fmtIQD(grandTotal)} IQD`}
              </Text>
              {currencyMode === 'both' && (
                <Text style={{ fontSize: isTablet ? 14 : 12, fontWeight: '700', color: isDark ? '#34D399' : colors.success, direction: 'ltr', marginTop: 2 }}>
                  {isUSD ? `≈ ${fmtIQD(grandTotal)} IQD` : `≈ $${fmtUSD(grandTotalUSD)} USD`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );

    // 3. Company / Customer Details & Account Auto-Save
    const renderClientInfoCard = () => (
      <View
        style={[
          styles.card,
          isTablet && { padding: 18, borderRadius: 16 },
          {
            backgroundColor: isDark ? '#131D31' : colors.white,
            borderColor: isDark ? '#1F2E4D' : colors.gray200,
            borderWidth: 1,
          },
        ]}
      >
        {/* Date & Time Selector Box (Matching Image 4) */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left', color: isDark ? colors.gray400 : '#64748B' }]}>
            {isKuLanguage ? 'بەروار و کاتی عەرز:' : 'Quotation Date & Time:'}
          </Text>
          <View
            style={[
              styles.datePickerDisplayBox,
              {
                backgroundColor: isDark ? '#121C2E' : colors.white,
                borderColor: isDark ? '#1F2E4D' : colors.gray200,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
              <Text style={[styles.datePickerDisplayText, { color: colors.black }]}>
                {formatDateTimeUI(new Date())}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={colors.gray400} />
          </View>
        </View>

        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 10 : 8 }}>
            <View style={[styles.cardHeaderIconBox, { backgroundColor: isDark ? '#1E2D4A' : '#FEF3C7' }]}>
              <Ionicons name="business-outline" size={isTablet ? 20 : 16} color={isDark ? '#3B82F6' : colors.primary} />
            </View>
            <Text style={[styles.cardTitle, isTablet && { fontSize: 16.5 }, { color: colors.black }]}>
              {isKuLanguage ? 'زانیاری کڕیار' : 'Client Info'}
            </Text>
          </View>
        </View>

        {/* Direct Quote Banner Card (Matching Image 4) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggleDirectQuotation}
          style={[
            styles.directQuoteBannerCard,
            {
              borderColor: isDirectCustomer ? '#D4AF37' : (isDark ? '#1F2E4D' : '#E2E8F0'),
              backgroundColor: isDirectCustomer ? (isDark ? '#171D28' : '#FEF3C7') : (isDark ? '#121C2E' : '#F8FAFC'),
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={[styles.directQuoteIconCircle, { backgroundColor: isDirectCustomer ? 'rgba(212, 175, 55, 0.25)' : (isDark ? '#1E2D4A' : '#E2E8F0') }]}>
            <Ionicons name="flash" size={18} color={isDirectCustomer ? '#FBBF24' : (isDark ? '#94A3B8' : '#64748B')} />
          </View>
          <View style={{ flex: 1, marginHorizontal: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.directQuoteTitle, { color: isDirectCustomer ? '#FBBF24' : colors.black }]}>
              {isKuLanguage ? 'عەرزی ڕاستەوخۆ (کڕیاری دەستبەجێ) ⚡' : 'Direct Quotation (Walk-in) ⚡'}
            </Text>
            <Text style={[styles.directQuoteSubtitle, { color: isDark ? '#94A3B8' : colors.gray500, textAlign: isRTL ? 'right' : 'left' }]}>
              {isKuLanguage
                ? 'عەرزی دەستبەجێ بەبێ پێویستی بە ناو و مۆبایل'
                : 'Instant quote without requiring client name & phone'}
            </Text>
          </View>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={18}
            color={isDirectCustomer ? '#FBBF24' : (isDark ? '#64748B' : colors.gray400)}
          />
        </TouchableOpacity>

        {/* Input Fields when custom client is needed (Matching Image 4 Placeholders) */}
        {!isDirectCustomer && (
          <View style={{ marginTop: 12, gap: 10 }}>
            {/* Customer Name */}
            <View>
              <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left', color: isDark ? colors.gray400 : '#64748B' }]}>
                {isKuLanguage ? 'ناوی کڕیار *' : 'Client Name *'}
              </Text>
              <TextInput
                ref={nameInputRef}
                style={[
                  styles.input,
                  isTablet && { fontSize: 16, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
                  {
                    backgroundColor: nameError
                      ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2')
                      : (isDark ? '#121C2E' : colors.gray50),
                    borderColor: nameError ? '#EF4444' : selectedCustomerId ? '#22C55E' : (isDark ? '#1F2E4D' : colors.gray300),
                    borderWidth: nameError ? 1.5 : 1,
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined,
                    fontWeight: 'normal',
                  },
                ]}
                value={companyName}
                onChangeText={handleCompanyNameChange}
                onFocus={() => {
                  if (companyName.trim()) {
                    fetchCustomerSuggestions(companyName);
                  }
                }}
                placeholder={isKuLanguage ? 'نموونە: شارۆ عومەر ، ڕاژان بەهەمەن' : 'e.g. Sharo Omer, Razhan Bahman'}
                placeholderTextColor={nameError ? '#F87171' : colors.gray400}
              />
              {nameError && (
                <MotiView
                  from={{ opacity: 0, translateY: -3 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 200 }}
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 6,
                    paddingHorizontal: 2,
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={isTablet ? 16 : 14} color="#EF4444" />
                  <Text
                    style={{
                      fontSize: isTablet ? 13 : 11.5,
                      color: '#EF4444',
                      fontWeight: '700',
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                  >
                    {isKuLanguage
                      ? 'تکایە ناوی کۆمپانیا یان کڕیار بنووسە، ئەم بەشە داواکراوە'
                      : 'Please enter company or client name, this field is required'}
                  </Text>
                </MotiView>
              )}

              {/* Autocomplete Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <View style={[styles.suggestionsBox, { backgroundColor: isDark ? '#131D31' : colors.white, borderColor: colors.primary }]}>
                  <View style={[styles.suggestionsHeader, { backgroundColor: isDark ? '#1E2D4A' : '#F8FAFC', borderBottomColor: isDark ? '#25385C' : '#E2E8F0', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="sparkles" size={isTablet ? 15 : 13} color={colors.primary} />
                    <Text style={{ fontSize: isTablet ? 12.5 : 11, fontWeight: '700', color: colors.primary }}>
                      {isKuLanguage ? 'کۆمپانیا و کڕیارە تۆمارکراوەکان (بۆ عەرزی دووبارە):' : 'Saved Companies & Clients (For Repeat Quotes):'}
                    </Text>
                  </View>
                  {suggestions.map((cust) => (
                    <TouchableOpacity
                      key={cust.id}
                      style={[styles.suggestionItem, { borderBottomColor: isDark ? '#1F2E4D' : '#E2E8F0', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={() => handleSelectCustomer(cust)}
                    >
                      <Ionicons name="business" size={isTablet ? 19 : 16} color={colors.primary} />
                      <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '700', color: colors.black }}>{cust.name}</Text>
                        {cust.phone ? <Text style={{ fontSize: isTablet ? 13 : 11.5, color: colors.gray400 }}>{cust.phone}</Text> : null}
                        {cust.address ? <Text style={{ fontSize: isTablet ? 12 : 10.5, color: colors.gray500 }}>{cust.address}</Text> : null}
                      </View>
                      <View style={[styles.miniPill, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : colors.softBlue }]}>
                        <Text style={{ fontSize: isTablet ? 12 : 10.5, color: isDark ? '#60A5FA' : colors.primary, fontWeight: '700' }}>
                          {isKuLanguage ? 'دیاریکردن' : 'Select'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Phone Number */}
            <View>
              <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left', color: isDark ? colors.gray400 : '#64748B' }]}>
                {isKuLanguage ? 'ژمارەی تەلەفۆن *' : 'Phone Number *'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  isTablet && { fontSize: 16, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
                  {
                    backgroundColor: isDark ? '#121C2E' : colors.gray50,
                    borderColor: isDark ? '#1F2E4D' : colors.gray300,
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined,
                    fontWeight: 'normal',
                  },
                ]}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(val) => {
                  const clean = sanitizeNumericInput(val, 'phone-pad');
                  setPhone(clean);
                  if (clean.length >= 4) fetchCustomerSuggestions(clean);
                }}
                placeholder="نموونە: 0770 123 1212"
                placeholderTextColor={colors.gray400}
              />
            </View>

            {/* Address */}
            <View>
              <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left', color: isDark ? colors.gray400 : '#64748B' }]}>
                {isKuLanguage ? 'ناونیشان' : 'Address'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  isTablet && { fontSize: 16, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
                  {
                    backgroundColor: isDark ? '#121C2E' : colors.gray50,
                    borderColor: isDark ? '#1F2E4D' : colors.gray300,
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined,
                    fontWeight: 'normal',
                  },
                ]}
                value={address}
                onChangeText={setAddress}
                placeholder={isKuLanguage ? 'نموونە: سلێمانی - چوارچرا' : 'e.g. Sulaymaniyah - Chwarchra'}
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>
        )}
      </View>
    );

    // 4. Quotation Terms & Notes with Edit Default Button
    const renderTermsCard = () => {
      const isCustomDays = ![3, 7, 15, 30].includes(validityDays);

      return (
        <View
          style={[
            styles.card,
            isTablet && { padding: 18, borderRadius: 16 },
            {
              backgroundColor: isDark ? '#131D31' : colors.white,
              borderColor: isDark ? '#1F2E4D' : colors.gray200,
              borderWidth: 1,
            },
          ]}
        >
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 10 : 8 }}>
              <View style={[styles.cardHeaderIconBox, { backgroundColor: isDark ? '#1E2D4A' : '#FEF3C7' }]}>
                <Ionicons name="document-text-outline" size={isTablet ? 20 : 16} color={isDark ? '#3B82F6' : colors.primary} />
              </View>
              <Text style={[styles.cardTitle, isTablet && { fontSize: 16.5 }, { color: colors.black }]}>
                {isKuLanguage ? 'مەرج و تێبینییەکانی عەرز' : 'Quotation Terms & Notes'}
              </Text>
            </View>

            {/* Button to edit and persist default terms */}
            <TouchableOpacity
              style={[
                styles.editDefaultBtn,
                isTablet && { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8 },
                {
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#FEF9C3',
                  borderColor: isDark ? '#2563EB' : colors.primary,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => setEditDefaultNotesOpen(true)}
            >
              <Ionicons name="settings-outline" size={isTablet ? 15 : 13} color={isDark ? '#3B82F6' : colors.primary} />
              <Text style={{ fontSize: isTablet ? 12.5 : 11, fontWeight: '700', color: isDark ? '#3B82F6' : colors.primary }}>
                {isKuLanguage ? 'گۆڕینی تێبینی بنەڕەتی' : 'Edit Default'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current Notes Input */}
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left', color: isDark ? colors.gray400 : '#64748B' }]}>
              {isKuLanguage ? 'تێبینی بۆ ئەم عەرزە (پێشنیار دەکرێت بۆ کڕیار):' : 'Notes for this quote:'}
            </Text>
            <TextInput
              style={[
                styles.input,
                isTablet && { minHeight: 84, fontSize: 15, lineHeight: 24, paddingVertical: 12, paddingHorizontal: 14 },
                {
                  backgroundColor: isDark ? '#121C2E' : colors.gray50,
                  borderColor: isDark ? '#1F2E4D' : colors.gray300,
                  color: colors.black,
                  textAlign: isRTL ? 'right' : 'left',
                  minHeight: isTablet ? 84 : 64,
                  fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined,
                  fontWeight: 'normal',
                  lineHeight: isTablet ? 24 : 22,
                },
              ]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder={isKuLanguage ? 'مەرج و تێبینی بنووسە...' : 'Write terms...'}
              placeholderTextColor={colors.gray400}
            />
          </View>

          {/* Validity Days Selection */}
          <View style={{ marginTop: 10 }}>
            <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left', color: isDark ? colors.gray400 : '#64748B' }]}>
              {isKuLanguage ? 'ماوەی کارپێکردنی عەرزەکە:' : 'Validity Period:'}
            </Text>
            <View style={[styles.validityWrapper, isTablet && { gap: 10 }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Preset Chips: 3, 7, 15, 30 */}
              <View style={[styles.validityChipsGroup, isTablet && { gap: 8 }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {[3, 7, 15, 30].map((days) => {
                  const active = validityDays === days;
                  return (
                    <TouchableOpacity
                      key={days}
                      activeOpacity={0.75}
                      style={[
                        styles.validityChip,
                        isTablet && { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
                        {
                          backgroundColor: active ? '#2563EB' : (isDark ? '#172338' : colors.gray100),
                          borderColor: active ? '#2563EB' : (isDark ? '#203152' : colors.gray200),
                        },
                      ]}
                      onPress={() => {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        } catch {}
                        setValidityDays(days);
                      }}
                    >
                      <Text style={{ fontSize: isTablet ? 13.5 : 12, fontWeight: '700', color: active ? '#FFFFFF' : (isDark ? colors.gray400 : colors.gray700) }}>
                        {isKuLanguage ? `${days} ڕۆژ` : `${days} Days`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Direct Compact Number Input (Only filled when custom days) */}
              <View
                style={[
                  styles.validityDirectInputBox,
                  isTablet && { minWidth: 90, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
                  {
                    backgroundColor: isDark ? '#172338' : colors.gray50,
                    borderColor: isCustomDays && validityDays > 0 ? '#2563EB' : (isDark ? '#203152' : colors.gray300),
                    borderWidth: isCustomDays && validityDays > 0 ? 1.5 : 1,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.validityDirectInput,
                    isTablet && { fontSize: 15, minWidth: 36 },
                    {
                      color: isCustomDays && validityDays > 0 ? '#3B82F6' : colors.black,
                      textAlign: 'center',
                      fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                      fontWeight: 'normal',
                    },
                  ]}
                  keyboardType="number-pad"
                  value={isCustomDays && validityDays > 0 ? String(validityDays) : ''}
                  onChangeText={(val) => {
                    const clean = sanitizeNumericInput(val, 'number-pad');
                    const num = parseInt(clean, 10) || 0;
                    setValidityDays(num);
                  }}
                  placeholder={isKuLanguage ? 'دیاریکراو' : 'Custom'}
                  placeholderTextColor={colors.gray400}
                />
                {isCustomDays && validityDays > 0 ? (
                  <Text style={{ fontSize: isTablet ? 13 : 11.5, fontWeight: '700', color: isDark ? '#3B82F6' : colors.primary }}>
                    {isKuLanguage ? 'ڕۆژ' : 'Days'}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      );
    };

    // 5. Currency Display Mode Selector Button
    const renderCurrencySelector = () => (
      <View style={[styles.currencyToggleContainer, isTablet && { marginTop: 14 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleCurrencyOptions}
          style={[
            styles.currencyTriggerBtn,
            isTablet && { paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14 },
            {
              backgroundColor: isDark ? '#131D31' : colors.white,
              borderColor: showCurrencyOptions ? '#2563EB' : (isDark ? '#1F2E4D' : colors.gray200),
              borderWidth: 1,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 12 : 10, flex: 1 }}>
            <View
              style={[
                styles.currencyTriggerIconBox,
                isTablet && { width: 40, height: 40, borderRadius: 10 },
                { backgroundColor: isDark ? '#1E2D4A' : '#FEF3C7' },
              ]}
            >
              <Ionicons name="cash-outline" size={isTablet ? 22 : 18} color={isDark ? '#3B82F6' : colors.primary} />
            </View>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text
                style={[
                  styles.currencyTriggerTitle,
                  isTablet && { fontSize: 15.5 },
                  {
                    color: colors.black,
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                  },
                ]}
              >
                {isKuLanguage ? 'شێوازی پیشاندانی دراو لە وەسڵدا:' : 'Receipt Currency Display:'}
              </Text>
              <Text style={{ fontSize: isTablet ? 12.5 : 11, color: colors.gray400, marginTop: 1 }}>
                {isKuLanguage ? 'دەست بنێ بۆ دیاریکردن یان گۆڕین' : 'Tap to select or change currency'}
              </Text>
            </View>
          </View>

          {/* Currently Active Badge + Chevron */}
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 8 : 6 }}>
            <View
              style={[
                styles.currencyActiveBadge,
                isTablet && { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9 },
                {
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#FEF9C3',
                  borderColor: isDark ? '#2563EB' : colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.currencyActiveBadgeText,
                  isTablet && { fontSize: 13.5 },
                  {
                    color: isDark ? '#60A5FA' : colors.primary,
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                  },
                ]}
              >
                {currencyMode === 'usd'
                  ? (isKuLanguage ? 'تەنها دۆلار' : 'USD Only')
                  : currencyMode === 'iqd'
                  ? (isKuLanguage ? 'تەنها دینار' : 'IQD Only')
                  : (isKuLanguage ? 'دۆلار و دینار' : 'USD & IQD')}
              </Text>
            </View>

            <Ionicons
              name={showCurrencyOptions ? 'chevron-up' : 'chevron-down'}
              size={isTablet ? 18 : 16}
              color={colors.gray400}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded Currency Options */}
        {showCurrencyOptions && (
          <MotiView
            from={{ opacity: 0, translateY: -6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[
              styles.currencyExpandedCard,
              isTablet && { padding: 14, borderRadius: 14 },
              {
                backgroundColor: isDark ? '#131D31' : colors.white,
                borderColor: '#2563EB',
                borderWidth: 1.5,
              },
            ]}
          >
            <View style={[styles.currencyPillsRow, isTablet && { gap: 10 }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {[
                { id: 'both' as const, labelKu: 'دۆلار و دینار', labelEn: 'USD & IQD', icon: 'swap-horizontal' },
                { id: 'iqd' as const, labelKu: 'تەنها دینار', labelEn: 'IQD Only', icon: 'wallet-outline' },
                { id: 'usd' as const, labelKu: 'تەنها دۆلار', labelEn: 'USD Only', icon: 'logo-usd' },
              ].map((m) => {
                const active = (currencyMode || 'both') === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.75}
                    style={[
                      styles.currencyPillBtn,
                      isTablet && { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
                      {
                        backgroundColor: active ? '#2563EB' : (isDark ? '#172338' : colors.gray50),
                        borderColor: active ? '#2563EB' : (isDark ? '#203152' : colors.gray200),
                      },
                    ]}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      } catch {}
                      setCurrencyMode(m.id);
                    }}
                  >
                    <Ionicons
                      name={active ? 'checkmark-circle' : (m.icon as any)}
                      size={isTablet ? 17 : 14}
                      color={active ? '#FFFFFF' : (isDark ? colors.gray400 : colors.gray600)}
                    />
                    <Text
                      style={[
                        styles.currencyPillText,
                        isTablet && { fontSize: 13 },
                        {
                          color: active ? '#FFFFFF' : (isDark ? colors.gray400 : colors.gray700),
                          fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                        },
                      ]}
                    >
                      {isKuLanguage ? m.labelKu : m.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </MotiView>
        )}
      </View>
    );

    // 5b. Receipt Format / Design Type Selector (جۆرەکانی وەسڵ)
    const renderReceiptTypeSelector = () => {
      const receiptTypeOptions: Array<{
        id: CheckoutMode;
        titleKu: string;
        titleEn: string;
        subKu: string;
        subEn: string;
        icon: keyof typeof Ionicons.glyphMap;
        badge?: string;
      }> = [
        {
          id: 'normal',
          titleKu: 'ئاسایی',
          titleEn: 'Normal',
          subKu: 'عەرز و پاشەکەوتکردن',
          subEn: 'Save Quotation Only',
          icon: 'flash-outline',
        },
        {
          id: 'print',
          titleKu: 'پرینت A4',
          titleEn: 'A4 Print',
          subKu: 'پەڕەی فەرمی A4 • خشتەی تەواو',
          subEn: 'A4 Full Sheet',
          icon: 'document-text-outline',
          badge: 'A4',
        },
        {
          id: 'print80',
          titleKu: '80mm',
          titleEn: '80mm',
          subKu: '8.0 سم • ستاندارد',
          subEn: '8.0 cm Standard POS',
          icon: 'receipt-outline',
          badge: '8.0 cm',
        },
        {
          id: 'print58',
          titleKu: '58mm',
          titleEn: '58mm',
          subKu: '5.8 سم • وەسڵی بچووک',
          subEn: '5.8 cm Compact POS',
          icon: 'receipt-outline',
          badge: '5.8 cm',
        },
        {
          id: 'print110',
          titleKu: '110mm',
          titleEn: '110mm',
          subKu: '11.0 سم • وەسڵی پان',
          subEn: '11.0 cm Wide Thermal',
          icon: 'receipt-outline',
          badge: '11.0 cm',
        },
      ];

      return (
        <View style={[styles.currencyToggleContainer, isTablet && { marginTop: 14 }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleReceiptTypeOptions}
            style={[
              styles.currencyTriggerBtn,
              isTablet && { paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14 },
              {
                backgroundColor: isDark ? '#131D31' : colors.white,
                borderColor: showReceiptTypeOptions ? '#2563EB' : (isDark ? '#1F2E4D' : colors.gray200),
                borderWidth: 1,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            {/* Label + Icon */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 12 : 10, flex: 1 }}>
              <View
                style={[
                  styles.currencyTriggerIconBox,
                  isTablet && { width: 40, height: 40, borderRadius: 10 },
                  { backgroundColor: isDark ? '#1E2D4A' : '#FEF3C7' },
                ]}
              >
                <Ionicons name="receipt-outline" size={isTablet ? 22 : 18} color={isDark ? '#3B82F6' : colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={[
                    styles.currencyTriggerTitle,
                    isTablet && { fontSize: 15.5 },
                    {
                      color: colors.black,
                      fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                    },
                  ]}
                >
                  {isKuLanguage ? 'جۆرەکانی وەسڵ:' : 'Receipt Types / Format:'}
                </Text>
                <Text style={{ fontSize: isTablet ? 12.5 : 11, color: colors.gray400, marginTop: 1 }}>
                  {isKuLanguage ? 'دەست بنێ بۆ دیاریکردن یان گۆڕین' : 'Tap to select or change format'}
                </Text>
              </View>
            </View>

            {/* Currently Active Badge + Chevron */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 8 : 6 }}>
              <View
                style={[
                  styles.currencyActiveBadge,
                  isTablet && { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9 },
                  {
                    backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#FEF9C3',
                    borderColor: isDark ? '#2563EB' : colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencyActiveBadgeText,
                    isTablet && { fontSize: 13.5 },
                    {
                      color: isDark ? '#60A5FA' : colors.primary,
                      fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                    },
                  ]}
                >
                  {getReceiptTypeBadgeLabel()}
                </Text>
              </View>

              <Ionicons
                name={showReceiptTypeOptions ? 'chevron-up' : 'chevron-down'}
                size={isTablet ? 18 : 16}
                color={colors.gray400}
              />
            </View>
          </TouchableOpacity>

          {/* Expanded Receipt Type Options */}
          {showReceiptTypeOptions && (
            <MotiView
              from={{ opacity: 0, translateY: -6 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 180 }}
              style={[
                styles.currencyExpandedCard,
                isTablet && { padding: 14, borderRadius: 14 },
                {
                  backgroundColor: isDark ? '#131D31' : colors.white,
                  borderColor: '#2563EB',
                  borderWidth: 1.5,
                },
              ]}
            >
              <View style={{ gap: 8 }}>
                {receiptTypeOptions.map((opt) => {
                  const active = checkoutMode === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.75}
                      style={[
                        {
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: isTablet ? 12 : 10,
                          paddingHorizontal: isTablet ? 14 : 12,
                          borderRadius: 12,
                          backgroundColor: active
                            ? (isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(212, 175, 55, 0.15)')
                            : (isDark ? '#172338' : colors.gray50),
                          borderWidth: 1.5,
                          borderColor: active
                            ? (isDark ? '#2563EB' : colors.primary)
                            : (isDark ? '#203152' : colors.gray200),
                        },
                      ]}
                      onPress={() => {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        } catch {}
                        setCheckoutMode(opt.id);
                        if (opt.id === 'print') {
                          useSettingsStore.getState().setQuotationPaperSizePreference('A4');
                        } else if (opt.id === 'print80') {
                          useSettingsStore.getState().setQuotationPaperSizePreference('80mm');
                        } else if (opt.id === 'print58') {
                          useSettingsStore.getState().setQuotationPaperSizePreference('58mm');
                        } else if (opt.id === 'print110') {
                          useSettingsStore.getState().setQuotationPaperSizePreference('110mm');
                        }
                      }}
                    >
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: active
                              ? (isDark ? '#2563EB' : colors.primary)
                              : (isDark ? '#203152' : colors.gray200),
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons
                            name={opt.icon}
                            size={18}
                            color={active ? '#FFFFFF' : (isDark ? colors.gray300 : colors.gray600)}
                          />
                        </View>
                        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={{
                                fontSize: isTablet ? 14.5 : 13.5,
                                color: active ? (isDark ? '#60A5FA' : colors.primary) : colors.black,
                                fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                              }}
                            >
                              {isKuLanguage ? opt.titleKu : opt.titleEn}
                            </Text>
                            {opt.badge ? (
                              <View
                                style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 1,
                                  borderRadius: 6,
                                  backgroundColor: active
                                    ? (isDark ? '#2563EB' : colors.primary)
                                    : (isDark ? 'rgba(255,255,255,0.08)' : colors.gray200),
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    color: active ? '#FFFFFF' : colors.gray500,
                                    fontWeight: '700',
                                  }}
                                >
                                  {opt.badge}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          <Text
                            style={{
                              fontSize: 11,
                              color: colors.gray400,
                              marginTop: 1,
                              fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined,
                            }}
                          >
                            {isKuLanguage ? opt.subKu : opt.subEn}
                          </Text>
                        </View>
                      </View>

                      <Ionicons
                        name={active ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={active ? (isDark ? '#60A5FA' : colors.primary) : colors.gray400}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </MotiView>
          )}
        </View>
      );
    };

    // 6. Generate Button
    const renderGenerateButton = () => (
      <View style={{ marginTop: isTablet ? 14 : 10, marginBottom: Math.max(insets.bottom, 16) + 24 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleGenerateQuotation}
          disabled={isGenerating}
          style={[
            styles.primaryActionBtn,
            { backgroundColor: '#2563EB' },
            isGenerating && { opacity: 0.7 },
          ]}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.primaryActionBtnText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
              {isKuLanguage ? 'دروستکردنی وەسڵی عەرز' : 'Create Quotation'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );

    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AppHeader
          title={isKuLanguage ? 'داشکاندن و وەسڵ' : 'Review & Terms'}
          gradient={isDark ? ['#0B111E', '#131D31'] : undefined}
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

        <ScrollView
          ref={step2ScrollRef}
          contentContainerStyle={[
            styles.step2Body,
            isTabletLandscape
              ? { width: '100%', maxWidth: 1320, alignSelf: 'center', paddingHorizontal: 20 }
              : isTablet
              ? { width: '100%', maxWidth: 740, alignSelf: 'center', paddingHorizontal: 16 }
              : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isTabletLandscape ? (
            <View style={[styles.landscapeStep2Row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Column 1 (Right in Kurdish RTL): Items Cart & Financials */}
              <View style={styles.landscapeStep2Col}>
                {renderProductsCard()}
                {renderDiscountAndTotalsCard()}
              </View>

              {/* Column 2 (Left in Kurdish RTL): Notice + Client Information + Terms & Validity + Currency + Submit */}
              <View style={styles.landscapeStep2Col}>
                {renderNoticeBanner()}
                {renderClientInfoCard()}
                {renderTermsCard()}
                {renderCurrencySelector()}
                {renderReceiptTypeSelector()}
                {renderGenerateButton()}
              </View>
            </View>
          ) : (
            <View style={styles.step2SingleCol}>
              {renderNoticeBanner()}
              {renderProductsCard()}
              {renderDiscountAndTotalsCard()}
              {renderClientInfoCard()}
              {renderTermsCard()}
              {renderCurrencySelector()}
              {renderReceiptTypeSelector()}
              {renderGenerateButton()}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };


  // ═════════════════════════════════════════════════════════════════════════════
  // STEP 3: OFFICIAL QUOTATION INVOICE PREVIEW
  // ═════════════════════════════════════════════════════════════════════════════
  const renderStep3 = () => {
    if (!generatedQuotation) return null;
    const q = generatedQuotation;
    const effMode = q.currencyMode || currencyMode || 'both';
    const isUsdMode = effMode === 'usd';
    const isIqdMode = effMode === 'iqd';
    const isBothMode = effMode === 'both';
    const rate = q.exchangeRate || exchangeRate || 1310;
    const qUsd = rate > 0 ? q.grandTotal / rate : 0;
    const totalUSD = fmtUSD(qUsd);
    const totalIQD = fmtIQD(q.grandTotal);

    // Items currency:
    // When system is USD (or mode is usd), ALL items and subtotal are in USD!
    const isItemUsd = isUSD || isUsdMode;
    const formatRowPrice = (iqdVal: number) => {
      if (isItemUsd) {
        return `$${fmtUSD(iqdVal / rate)}`;
      }
      return `${fmtIQD(iqdVal)} IQD`;
    };

    let grandTotalPrimary = `${totalIQD} IQD`;
    let grandTotalSecondary = '';

    if (isUsdMode) {
      grandTotalPrimary = `$${totalUSD} USD`;
      grandTotalSecondary = '';
    } else if (isIqdMode) {
      grandTotalPrimary = `${totalIQD} IQD`;
      grandTotalSecondary = '';
    } else {
      // Both mode
      if (isUSD) {
        grandTotalPrimary = `$${totalUSD} USD`;
        grandTotalSecondary = `≈ ${totalIQD} IQD`;
      } else {
        grandTotalPrimary = `${totalIQD} IQD`;
        grandTotalSecondary = `≈ $${totalUSD} USD`;
      }
    }

    return (
      <View style={styles.flex}>
        <AppHeader
          title={isKuLanguage ? 'وەسڵی فەرمی عەرز' : 'Official Quotation'}
          gradient={isDark ? ['#0B111E', '#131D31'] : undefined}
          onBack={() => setStep(2)}
          rightAction={
            <HeaderActionButton
              icon="refresh-outline"
              onPress={handleResetForNewQuote}
            />
          }
        >
          <SaleStepIndicator step={3} />
        </AppHeader>

        <ScrollView
          contentContainerStyle={[
            styles.step3Body,
            {
              width: '100%',
              alignSelf: 'center',
              maxWidth: isTabletLandscape ? 820 : isTablet ? 720 : '100%',
              padding: isTablet ? 20 : 14,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Invoice Card */}
          <View
            style={[
              styles.invoiceCard,
              isTablet && { padding: 22, borderRadius: 20 },
              {
                backgroundColor: isDark ? '#131D31' : colors.white,
                borderColor: isDark ? '#1F2E4D' : colors.gray200,
                borderWidth: 1,
              },
            ]}
          >
            {/* Top Badge & Number */}
            <View style={[styles.invoiceTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.invoiceDocBadge,
                  isTablet && { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
                  { backgroundColor: isDark ? '#1E2D4A' : '#F1F5F9', borderColor: isDark ? '#25385C' : colors.gray200, borderWidth: 1 },
                ]}
              >
                <Ionicons name="document-text" size={isTablet ? 16 : 13} color={isDark ? '#60A5FA' : colors.primary} />
                <Text
                  style={{
                    fontSize: isTablet ? 13.5 : 11.5,
                    fontWeight: '800',
                    color: isDark ? '#60A5FA' : colors.black,
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                  }}
                >
                  {isKuLanguage ? 'وەسڵی عەرزی نرخ' : 'PRICE QUOTATION'}
                </Text>
              </View>
              <IdText size="default" style={isTablet ? { fontSize: 16 } : undefined}>{q.quotationNumber}</IdText>
            </View>

            {/* Official Disclaimer Notice */}
            <View
              style={[
                styles.invoiceNoticeBox,
                isTablet && { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, gap: 12 },
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FEF9C3',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.45)' : '#F59E0B',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="information-circle" size={isTablet ? 20 : 16} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: isTablet ? 13.5 : 11.5,
                    fontWeight: '700',
                    color: isDark ? '#FBBF24' : '#92400E',
                    textAlign: isRTL ? 'right' : 'left',
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                  }}
                >
                  {isKuLanguage
                    ? 'ئەم وەسڵە تەنها بۆ عەرزی نرخە و وەسڵی فەرمی فرۆشتن نییە'
                    : 'THIS DOCUMENT IS A PRICE QUOTATION ONLY AND NOT A SALES INVOICE'}
                </Text>
                <Text style={{ fontSize: isTablet ? 12 : 10.5, color: isDark ? '#CBD5E1' : '#B45309', textAlign: isRTL ? 'right' : 'left', marginTop: 1, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                  {isKuLanguage
                    ? 'سەرجەم نرخەکان پێشنیارکراون بۆ شەریکە و کڕیار.'
                    : 'All prices are offered for quotation purposes.'}
                </Text>
              </View>
            </View>

            {/* Client & Date Information */}
            <View
              style={[
                styles.invoiceClientBox,
                isTablet && { padding: 16, borderRadius: 14, gap: 6 },
                {
                  backgroundColor: isDark ? '#172338' : colors.gray50,
                  borderColor: isDark ? '#203152' : colors.gray200,
                },
              ]}
            >
              <View style={[styles.clientRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: isTablet ? 13 : 11, color: isDark ? '#94A3B8' : colors.gray400, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                  {isKuLanguage ? 'پێشکەش دەکرێت بە:' : 'Presented To:'}
                </Text>
                <Text style={{ fontSize: isTablet ? 13 : 11, color: isDark ? '#94A3B8' : colors.gray400, direction: 'ltr' }}>
                  {q.date} {q.time ? `• ${q.time}` : ''}
                </Text>
              </View>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text
                    style={{
                      fontSize: isTablet ? 19 : 15.5,
                      fontWeight: '800',
                      color: isDark ? '#FFFFFF' : colors.black,
                      textAlign: isRTL ? 'right' : 'left',
                      fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                    }}
                  >
                    {q.customerName}
                  </Text>
                  {q.customerPhone ? (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Ionicons name="call-outline" size={isTablet ? 15 : 12} color={isDark ? '#94A3B8' : colors.gray400} />
                      <Text style={{ fontSize: isTablet ? 14 : 12, color: isDark ? '#94A3B8' : colors.gray500, textAlign: isRTL ? 'right' : 'left' }}>
                        {q.customerPhone}
                      </Text>
                    </View>
                  ) : null}
                  {q.customerAddress ? (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <Ionicons name="location-outline" size={isTablet ? 15 : 12} color={isDark ? '#94A3B8' : colors.gray400} />
                      <Text style={{ fontSize: isTablet ? 14 : 12, color: isDark ? '#94A3B8' : colors.gray500, textAlign: isRTL ? 'right' : 'left' }}>
                        {q.customerAddress}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Elegant Validity Badge with fixed RTL BiDi mark */}
                {q.validityDays ? (
                  <View
                    style={[
                      styles.validityBadge,
                      isTablet && { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
                      {
                        backgroundColor: isDark ? '#131D31' : '#FFFFFF',
                        borderColor: isDark ? '#203152' : colors.gray300,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: isTablet ? 12 : 10, color: isDark ? '#94A3B8' : colors.gray400, marginBottom: 1, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                      {isKuLanguage ? 'ماوەی عەرز' : 'Validity'}
                    </Text>
                    <Text
                      style={{
                        fontSize: isTablet ? 16.5 : 14,
                        fontWeight: '800',
                        color: isDark ? '#FFFFFF' : colors.black,
                        fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                        writingDirection: isRTL ? 'rtl' : 'ltr',
                      }}
                    >
                      {isKuLanguage ? `\u200F${q.validityDays} ڕۆژ` : `${q.validityDays} Days`}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Items Table */}
            <View style={{ marginTop: isTablet ? 18 : 14 }}>
              {/* Header Row */}
              <View style={[styles.itemsHeaderRow, isTablet && { paddingBottom: 10, marginBottom: 6 }, { borderColor: isDark ? '#203152' : colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 8 : 6 }}>
                  <Text style={{ fontSize: isTablet ? 14.5 : 12.5, fontWeight: '800', color: isDark ? '#FFFFFF' : colors.black, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined }}>
                    {isKuLanguage ? 'لیستی کاڵا پێشنیارکراوەکان' : 'Quoted Items'}
                  </Text>
                  <Text style={{ fontSize: isTablet ? 13 : 11, color: isDark ? '#94A3B8' : colors.gray400 }}>
                    ({isKuLanguage ? `کاڵا ${q.items.length}` : `${q.items.length} items`})
                  </Text>
                </View>
                <Text style={{ fontSize: isTablet ? 13 : 11, color: isDark ? '#94A3B8' : colors.gray400, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                  {isKuLanguage ? 'کۆی نرخ' : 'Total'}
                </Text>
              </View>

              {q.items.map((it, idx) => (
                <View
                  key={it.id || String(idx)}
                  style={[
                    styles.invoiceItemRow,
                    isTablet && { paddingVertical: 14 },
                    {
                      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.gray100,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  {/* Distinct Number Chip */}
                  <View style={[styles.itemIndexPill, isTablet && { width: 28, height: 28, borderRadius: 14 }, { backgroundColor: isDark ? '#1E2D4A' : colors.gray100 }]}>
                    <Text style={[styles.itemIndexText, isTablet && { fontSize: 13 }, { color: isDark ? '#60A5FA' : colors.gray400 }]}>{idx + 1}</Text>
                  </View>

                  {/* Product Details */}
                  <View style={{ flex: 1, marginHorizontal: isTablet ? 12 : 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={{ fontSize: isTablet ? 16 : 13.5, fontWeight: '700', color: isDark ? '#FFFFFF' : colors.black }} numberOfLines={1}>
                      {it.productName}
                    </Text>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Text style={{ fontSize: isTablet ? 13 : 11, color: isDark ? '#94A3B8' : colors.gray400, direction: 'ltr' }}>
                        {it.quantity} × {formatRowPrice(it.unitPrice)}
                      </Text>
                      {it.discount > 0 && (
                        <Text style={{ fontSize: isTablet ? 12 : 10.5, fontWeight: '700', color: isDark ? '#4ADE80' : '#15803D', direction: 'ltr' }}>
                          (-{formatRowPrice(it.discount)})
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Line Total */}
                  <Text style={{ fontSize: isTablet ? 16 : 13.5, fontWeight: '800', color: isDark ? '#FFFFFF' : colors.black, direction: 'ltr' }}>
                    {formatRowPrice(it.lineTotal)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Notes Section */}
            {q.notes ? (
              <View
                style={[
                  styles.invoiceNotesBox,
                  isTablet && { padding: 14, borderRadius: 10, marginTop: 16 },
                  {
                    backgroundColor: isDark ? '#172338' : colors.gray50,
                    borderColor: isDark ? '#203152' : colors.gray200,
                    marginTop: 14,
                  },
                ]}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="document-text-outline" size={isTablet ? 15 : 12} color="#3B82F6" />
                  <Text style={{ fontSize: isTablet ? 13 : 11, fontWeight: '700', color: '#3B82F6', fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined }}>
                    {isKuLanguage ? 'تێبینی و مەرجەکان:' : 'Terms & Conditions:'}
                  </Text>
                </View>
                <Text style={{ fontSize: isTablet ? 14 : 12, color: isDark ? '#CBD5E1' : colors.black, lineHeight: isTablet ? 22 : 18, textAlign: isRTL ? 'right' : 'left' }}>
                  {q.notes}
                </Text>
              </View>
            ) : null}

            {/* Totals Section */}
            <View style={[styles.invoiceTotalsBox, isTablet && { marginTop: 16, paddingTop: 14, gap: 8 }, { borderTopColor: isDark ? '#203152' : colors.gray200, marginTop: 14 }]}>
              {q.discountTotal > 0 && (
                <>
                  <View style={[styles.invoiceTotRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ fontSize: isTablet ? 14.5 : 12.5, color: isDark ? '#94A3B8' : colors.gray400, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                      {isKuLanguage ? 'کۆی سەرەتایی:' : 'Subtotal:'}
                    </Text>
                    <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '700', color: isDark ? '#FFFFFF' : colors.black, direction: 'ltr' }}>
                      {formatRowPrice(q.subtotal)}
                    </Text>
                  </View>
                  <View style={[styles.invoiceTotRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ fontSize: isTablet ? 14.5 : 12.5, color: colors.error, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                      {isKuLanguage ? 'داشکاندن:' : 'Discount:'}
                    </Text>
                    <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '700', color: colors.error, direction: 'ltr' }}>
                      −{formatRowPrice(q.discountTotal)}
                    </Text>
                  </View>
                </>
              )}
              <View style={[styles.invoiceGrandTotRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: isTablet ? 18 : 15, fontWeight: '800', color: isDark ? '#FFFFFF' : colors.black, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined }}>
                  {isKuLanguage ? 'کۆی گشتی:' : 'Grand Total:'}
                </Text>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={{ fontSize: isTablet ? 24 : 17.5, fontWeight: '900', color: isDark ? '#3B82F6' : colors.primary, direction: 'ltr' }}>
                    {grandTotalPrimary}
                  </Text>
                  {grandTotalSecondary ? (
                    <Text style={{ fontSize: isTablet ? 15 : 12, fontWeight: '700', color: isDark ? '#34D399' : colors.success, direction: 'ltr', marginTop: 2 }}>
                      {grandTotalSecondary}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: isTablet ? 14 : 10, marginTop: isTablet ? 18 : 14, marginBottom: Math.max(insets.bottom, 16) + 24 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSharePDF(q)}
              disabled={isGenerating}
              style={[
                styles.primaryActionBtn,
                { backgroundColor: '#2563EB' },
                isGenerating && { opacity: 0.7 },
              ]}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.primaryActionBtnText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {isKuLanguage ? 'هاوبەشکردن و چاپکردنی PDF' : 'Share & Print PDF'}
                </Text>
              )}
            </TouchableOpacity>

            {q.printCount && q.printCount > 0 ? (
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: isTablet ? 8 : 6,
                  paddingHorizontal: isTablet ? 16 : 12,
                  borderRadius: isTablet ? 10 : 8,
                  backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
                  alignSelf: 'center',
                }}
              >
                <Ionicons name="checkmark-circle" size={isTablet ? 18 : 16} color={isDark ? '#4ADE80' : '#15803D'} />
                <Text style={{ fontSize: isTablet ? 13.5 : 12, fontWeight: '700', color: isDark ? '#4ADE80' : '#15803D' }}>
                  {isKuLanguage ? `وەسڵەکە چاپکراوە (${q.printCount} جار)` : `Quotation printed (${q.printCount} times)`}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.outlineBtn,
                isTablet && { paddingVertical: 15, borderRadius: 12 },
                {
                  backgroundColor: isDark ? '#131D31' : colors.white,
                  borderColor: isDark ? '#203152' : colors.gray300,
                  borderWidth: 1.5,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={handleResetForNewQuote}
            >
              <Ionicons name="add-circle-outline" size={isTablet ? 20 : 17} color={isDark ? '#FFFFFF' : colors.black} />
              <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '700', color: isDark ? '#FFFFFF' : colors.black, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined }}>
                {isKuLanguage ? 'دروستکردنی عەرزی نوێ' : 'Create New Quote'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0B111E' : colors.gray50 }]}>
      {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}

      {/* Barcode Scanner Modal - Mobile Only */}
      {Platform.OS !== 'web' && (
        <BarcodeScannerModal
          visible={scannerOpen}
          onClose={() => setScannerOpen(false)}
          mode="single"
          onScanSingle={(code) => {
            handleBarcodeScanned(code);
            setScannerOpen(false);
          }}
          title={isKuLanguage ? 'سکانی باڕکۆدی کاڵا بۆ عەرز' : 'Scan Product for Quote'}
        />
      )}

      {/* Persistent Default Terms & Notes Editor Modal */}
      <EditDefaultNotesModal
        visible={editDefaultNotesOpen}
        initialNotes={defaultNotes || notes}
        onClose={() => setEditDefaultNotesOpen(false)}
        onSave={(newNotes) => {
          setDefaultNotes(newNotes);
          setNotes(newNotes);
        }}
      />

      {/* Quotation Print & Share Paper Format Picker Modal */}
      <PrintFormatPickerModal
        visible={formatPickerVisible}
        onClose={() => {
          if (!isGenerating) setFormatPickerVisible(false);
        }}
        onConfirm={handleConfirmPrintFormat}
        isPrinting={isGenerating}
        initialPaperSize={useSettingsStore.getState().quotationPaperSizePreference || '80mm'}
        title={isKuLanguage ? 'قەبارەی چاپی وەسڵی عەرز' : 'Quotation Invoice Paper Size'}
        invoiceNumber={quoteToPrint?.quotationNumber || generatedQuotation?.quotationNumber}
        partyName={quoteToPrint?.customerName || generatedQuotation?.customerName || (isKuLanguage ? 'کڕیاری دیارینەکراو' : 'Customer')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  listContent: {
    padding: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  step2Body: {
    padding: 14,
    paddingTop: 18,
    gap: 12,
  },
  step2SingleCol: {
    width: '100%',
    gap: 12,
  },
  landscapeStep2Row: {
    gap: 16,
    width: '100%',
    alignItems: 'flex-start',
  },
  landscapeStep2Col: {
    flex: 1,
    gap: 12,
  },
  step3Body: {
    padding: 14,
  },
  noticeBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  card: {
    padding: 14,
    borderRadius: Theme.radius.md,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemRowCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  itemRowHeader: {
    alignItems: 'center',
  },
  itemNumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemControlsRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperWrap: {
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },
  priceInputWrap: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 6,
    height: 30,
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    minWidth: 86,
  },
  priceTextInput: {
    fontSize: 12.5,
    fontWeight: '700',
    minWidth: 46,
    padding: 0,
    margin: 0,
    flex: 1,
  },
  priceCurrencySuffix: {
    fontSize: 10,
    fontWeight: '800',
  },
  discountHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  discountStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountControlsSection: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  discountDoneBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  discountButtonsRow: {
    gap: 8,
  },
  discountTypeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountTypeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    fontFamily: SETTINGS_KURDISH_FONT_REGULAR,
  },
  twoInputsRow: {
    gap: 10,
  },
  summaryTotalsBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderTopWidth: 2,
    gap: 4,
  },
  summaryRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  suggestionsBox: {
    borderWidth: 1.5,
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  editDefaultBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  validityWrapper: {
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  validityChipsGroup: {
    gap: 6,
    flexWrap: 'wrap',
  },
  validityChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  validityDirectInputBox: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    minWidth: 72,
  },
  validityDirectInput: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 28,
    paddingVertical: 2,
    paddingHorizontal: 2,
    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
  },
  currencyToggleContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  currencyTriggerBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyTriggerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyTriggerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  currencyActiveBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  currencyActiveBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  currencyExpandedCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  currencyPillsRow: {
    gap: 8,
  },
  currencyPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  currencyPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  invoiceCard: {
    padding: 16,
    borderRadius: 16,
  },
  invoiceTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  invoiceDocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  invoiceNoticeBox: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  invoiceClientBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  clientRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validityBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemsHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  invoiceItemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  itemIndexPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIndexText: {
    fontSize: 11,
    fontWeight: '700',
  },
  invoiceTotalsBox: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 5,
  },
  invoiceTotRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceGrandTotRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  invoiceNotesBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  outlineBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  directQuoteBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  directQuoteBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  invoicesHubBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  directQuoteActiveCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
    marginTop: 4,
  },
  directQuoteRow: {
    alignItems: 'center',
    gap: 10,
  },
  directQuoteIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchBackBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  datePickerDisplayBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerDisplayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  directQuoteBannerCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  directQuoteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directQuoteTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  directQuoteSubtitle: {
    fontSize: 11.5,
  },
  primaryActionBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
