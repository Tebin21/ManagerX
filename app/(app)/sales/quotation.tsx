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
import { useSettingsStore } from '@/store/settingsStore';
import { useQuotationStore } from '@/store/quotationStore';
import { useLanguageStore } from '@/store/languageStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { shareQuotationInvoice } from '@/lib/generateInvoice';
import {
  getOrCreateCustomerAccount,
  searchCustomersList,
  DIRECT_CUSTOMER_NAME,
  ensureDirectCustomer,
} from '@/lib/sqlite';
import { fmtIQD, fmtUSD, formatTime, sanitizeNumericInput } from '@/utils/formatters';
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
    if (items.length === 0) {
      Alert.alert(
        isKuLanguage ? 'سەبەتە بەتاڵە' : 'Cart Empty',
        isKuLanguage ? 'تکایە لانیکەم یەک بەرهەم دیاری بکە.' : 'Please add at least one product.'
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

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}

      // 4. Advance to Step 3 (Official Quotation Invoice View)
      setStep(3);
    } catch (err) {
      console.error('[Quotation] Generate error:', err);
      Alert.alert('Error', isKuLanguage ? 'نەتوانرا عەرزەکە دروست بکرێت.' : 'Could not generate quotation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSharePDF = async (quoteToShare?: Quotation) => {
    const q = quoteToShare || generatedQuotation;
    if (!q) return;
    setIsGenerating(true);
    try {
      await shareQuotationInvoice(
        q,
        {
          name: business.name,
          phone: business.phone,
          address: business.address,
          logoUri: business.logoUri,
        },
        q.currencyMode || currencyMode || 'both'
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
          onScanPress={() => setScannerOpen(true)}
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
          isTablet && { padding: 16, borderRadius: 12, gap: 12 },
          { backgroundColor: '#FEF9C3', borderColor: '#F59E0B' },
        ]}
      >
        <Ionicons name="information-circle-outline" size={isTablet ? 22 : 18} color="#D97706" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: isTablet ? 14 : 12.5, fontWeight: '800', color: '#92400E', textAlign: isRTL ? 'right' : 'left' }}>
            {isKuLanguage
              ? 'سەرنج: ئەم وەسڵە تەنها بۆ عەرزی نرخە و وەسڵی فرۆشتن نییە'
              : 'NOTE: THIS DOCUMENT IS A PRICE QUOTATION ONLY'}
          </Text>
          <Text style={{ fontSize: isTablet ? 12 : 11, color: '#B45309', textAlign: isRTL ? 'right' : 'left', marginTop: 2 }}>
            {isKuLanguage
              ? 'سەرجەم نرخەکان پێشنیارکراون بۆ شەریکە و کڕیار.'
              : 'All prices are offered for quotation purposes.'}
          </Text>
        </View>
      </View>
    );

    // 1. Selected Products List
    const renderProductsCard = () => (
      <PremiumCard style={[styles.card, isTablet && { padding: 18, borderRadius: 16 }]}>
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 8 : 6 }}>
            <Ionicons name="list-outline" size={isTablet ? 22 : 18} color={colors.primary} />
            <Text style={[styles.cardTitle, isTablet && { fontSize: 16.5 }, { color: colors.black }]}>
              {isKuLanguage ? 'کاڵاکانی عەرز' : 'Quotation Items'} ({itemCount})
            </Text>
          </View>
          <TouchableOpacity onPress={() => setStep(1)} hitSlop={8}>
            <Text style={{ fontSize: isTablet ? 13.5 : 12, fontWeight: '700', color: colors.primary }}>
              {isKuLanguage ? '+ زیادکردنی تر' : '+ Add More'}
            </Text>
          </TouchableOpacity>
        </View>

        {items.map((it, idx) => (
          <View
            key={it.id}
            style={[
              styles.itemRowCard,
              isTablet && { padding: 14, borderRadius: 10, gap: 10, marginBottom: 10 },
              {
                backgroundColor: isDark ? colors.gray200 : colors.gray50,
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray200,
              },
            ]}
          >
            {/* Row 1: Name, Code & Delete */}
            <View style={[styles.itemRowHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.itemNumBadge,
                  isTablet && { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
                  { backgroundColor: isDark ? colors.gray300 : colors.gray200 },
                ]}
              >
                <Text style={{ fontSize: isTablet ? 13 : 11, fontWeight: '800', color: colors.primary }}>#{idx + 1}</Text>
              </View>
              <View style={{ flex: 1, marginHorizontal: isTablet ? 10 : 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.itemName, isTablet && { fontSize: 16 }, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                  {it.productName}
                </Text>
                {it.itemId ? <IdText size="small" style={isTablet ? { fontSize: 13 } : undefined}>{it.itemId}</IdText> : null}
              </View>
              <TouchableOpacity onPress={() => handleRemoveItem(it.productId)} hitSlop={8}>
                <Ionicons name="trash-outline" size={isTablet ? 21 : 17} color={colors.error} />
              </TouchableOpacity>
            </View>

            {/* Row 2: Price, Quantity Stepper, Item Discount */}
            <View style={[styles.itemControlsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Quantity Stepper */}
              <View style={[styles.stepperWrap, isTablet && { gap: 10 }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[
                    styles.stepBtn,
                    isTablet && { width: 36, height: 36, borderRadius: 8 },
                    { backgroundColor: isDark ? colors.gray300 : colors.gray200 },
                  ]}
                  onPress={() => handleDecreaseQty(it.productId)}
                >
                  <Ionicons name="remove" size={isTablet ? 18 : 14} color={colors.black} />
                </TouchableOpacity>
                <Text style={[styles.stepQty, isTablet && { fontSize: 16, minWidth: 28 }, { color: colors.black }]}>
                  {it.quantity}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.stepBtn,
                    isTablet && { width: 36, height: 36, borderRadius: 8 },
                    { backgroundColor: colors.primary },
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

              {/* Unit Price Display */}
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={{ fontSize: isTablet ? 12 : 10, color: colors.gray400 }}>{isKuLanguage ? 'نرخی تاک:' : 'Unit Price:'}</Text>
                <AmountText value={it.unitPrice} currency="IQD" variant="small" style={{ fontWeight: '700', color: colors.black, fontSize: isTablet ? 15 : undefined }} />
              </View>

              {/* Line Total */}
              <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                <Text style={{ fontSize: isTablet ? 12 : 10, color: colors.gray400 }}>{isKuLanguage ? 'کۆی کاڵا:' : 'Line Total:'}</Text>
                <AmountText value={it.lineTotal} currency="IQD" variant="small" style={{ fontWeight: '800', color: colors.primary, fontSize: isTablet ? 16.5 : undefined }} />
              </View>
            </View>
          </View>
        ))}
      </PremiumCard>
    );

    // 2. Global Discount Section & Financial Totals Preview
    const renderDiscountAndTotalsCard = () => (
      <PremiumCard style={[styles.card, isTablet && { padding: 18, borderRadius: 16 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleDiscountExpanded}
          style={[
            styles.cardHeader,
            {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: isDiscountExpanded ? 12 : 8,
            },
          ]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 10 : 8, flex: 1 }}>
            <View style={[styles.discountHeaderIconWrap, isTablet && { width: 42, height: 42, borderRadius: 10 }, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="pricetag-outline" size={isTablet ? 21 : 17} color={colors.primary} />
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
                      ? `${colors.primary}20`
                      : (isDark ? colors.gray300 : colors.gray200),
                  borderColor:
                    globalDiscountType !== 'none' && globalDiscountValue > 0
                      ? colors.primary
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
                        ? colors.primary
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

            <View style={[styles.chevronWrap, isTablet && { width: 30, height: 30, borderRadius: 15 }, { backgroundColor: isDark ? colors.gray300 : colors.gray200 }]}>
              <Ionicons
                name={isDiscountExpanded ? 'chevron-up' : 'chevron-down'}
                size={isTablet ? 18 : 16}
                color={colors.gray600}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Discount Controls (Visible only when expanded) */}
        {isDiscountExpanded && (
          <View style={[styles.discountControlsSection, { borderTopColor: colors.gray200 }]}>
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
                        backgroundColor: active ? colors.primary : (isDark ? colors.gray200 : colors.gray100),
                        borderColor: active ? colors.primary : colors.gray300,
                      },
                    ]}
                    onPress={() => {
                      setGlobalDiscountType(dType);
                      if (dType === 'none') setGlobalDiscountValue(0);
                    }}
                  >
                    <Text style={[styles.discountTypeBtnText, isTablet && { fontSize: 14 }, { color: active ? '#FFFFFF' : colors.gray600 }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Value Input */}
            {globalDiscountType !== 'none' && (
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {globalDiscountType === 'percentage'
                    ? (isKuLanguage ? 'ڕێژەی داشکاندن (%):' : 'Discount Percentage (%):')
                    : (isKuLanguage ? 'بڕی داشکاندن بە دینار:' : 'Discount Amount (IQD):')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isTablet && { fontSize: 16, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
                    {
                      backgroundColor: isDark ? colors.gray200 : colors.gray50,
                      borderColor: colors.gray300,
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
                  backgroundColor: isDark ? colors.gray200 : colors.gray100,
                  borderColor: colors.gray300,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="checkmark-done" size={isTablet ? 18 : 15} color={colors.primary} />
              <Text style={{ fontSize: isTablet ? 14 : 12, fontWeight: '700', color: colors.primary }}>
                {isKuLanguage ? 'تەواو و جێگیرکردنی داشکاندن' : 'Done & Apply Discount'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Financial Totals Preview */}
        <View style={[styles.summaryTotalsBox, isTablet && { padding: 16, borderRadius: 12, gap: 8 }, { backgroundColor: isDark ? colors.gray200 : colors.gray50, borderTopColor: colors.primary }]}>
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={{ fontSize: isTablet ? 14 : 12.5, color: colors.gray500 }}>{isKuLanguage ? 'کۆی سەرەتایی:' : 'Subtotal:'}</Text>
            <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '700', color: colors.gray600, direction: 'ltr' }}>
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
          <View style={[styles.summaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 4, paddingTop: isTablet ? 8 : 6, borderTopWidth: 1, borderTopColor: colors.gray300 }]}>
            <Text style={{ fontSize: isTablet ? 17 : 14.5, fontWeight: '800', color: colors.black }}>{isKuLanguage ? 'کۆی گشتی:' : 'Grand Total:'}</Text>
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text style={{ fontSize: isTablet ? 22 : 18, fontWeight: '900', color: colors.primary, direction: 'ltr' }}>
                {currencyMode === 'usd'
                  ? `$${fmtUSD(grandTotalUSD)} USD`
                  : currencyMode === 'iqd'
                  ? `${fmtIQD(grandTotal)} IQD`
                  : isUSD
                  ? `$${fmtUSD(grandTotalUSD)} USD`
                  : `${fmtIQD(grandTotal)} IQD`}
              </Text>
              {currencyMode === 'both' && (
                <Text style={{ fontSize: isTablet ? 14 : 12, fontWeight: '700', color: colors.success, direction: 'ltr', marginTop: 2 }}>
                  {isUSD ? `≈ ${fmtIQD(grandTotal)} IQD` : `≈ $${fmtUSD(grandTotalUSD)} USD`}
                </Text>
              )}
            </View>
          </View>
        </View>
      </PremiumCard>
    );

    // 3. Company / Customer Details & Account Auto-Save
    const renderClientInfoCard = () => (
      <PremiumCard style={[styles.card, isTablet && { padding: 18, borderRadius: 16 }]}>
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 8 : 6 }}>
            <Ionicons name="business-outline" size={isTablet ? 22 : 18} color={colors.primary} />
            <Text style={[styles.cardTitle, isTablet && { fontSize: 16.5 }, { color: colors.black }]}>
              {isKuLanguage ? 'زانیاری کۆمپانیا یان کڕیار' : 'Company / Client Info'}
            </Text>
          </View>

          {/* Direct Quote Toggle Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleToggleDirectQuotation}
            style={[
              styles.directQuoteBtn,
              isTablet && { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 10 },
              {
                backgroundColor: isDirectCustomer ? colors.primary : isDark ? colors.gray200 : '#FEF3C7',
                borderColor: isDirectCustomer ? colors.primary : '#F59E0B',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons
              name={isDirectCustomer ? 'checkmark-circle' : 'flash'}
              size={isTablet ? 16 : 13}
              color={isDirectCustomer ? '#FFFFFF' : '#D97706'}
            />
            <Text
              style={[
                styles.directQuoteBtnText,
                isTablet && { fontSize: 13 },
                { color: isDirectCustomer ? '#FFFFFF' : '#B45309' },
              ]}
            >
              {isDirectCustomer
                ? (isKuLanguage ? 'عەرزی ڕاستەوخۆ (چالاکە)' : 'Direct Quote (Active)')
                : (isKuLanguage ? 'عەرزی ڕاستەوخۆ' : 'Direct Quote')}
            </Text>
          </TouchableOpacity>
        </View>

        {isDirectCustomer ? (
          <View
            style={[
              styles.directQuoteActiveCard,
              isTablet && { padding: 18, borderRadius: 14, gap: 14 },
              {
                backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : '#F0FDF4',
                borderColor: isDark ? '#166534' : '#86EFAC',
              },
            ]}
          >
            <View style={[styles.directQuoteRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.directQuoteIconBadge, isTablet && { width: 44, height: 44, borderRadius: 22 }, { backgroundColor: '#22C55E' }]}>
                <Ionicons name="flash" size={isTablet ? 22 : 18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={{ fontSize: isTablet ? 15.5 : 13.5, fontWeight: '800', color: '#15803D' }}>
                  {isKuLanguage ? 'عەرزی ڕاستەوخۆ چالاکە' : 'Direct Quotation Active'}
                </Text>
                <Text style={{ fontSize: isTablet ? 13 : 11.5, color: '#166534', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }}>
                  {isKuLanguage
                    ? 'پێویست بە پڕکردنەوەی هیچ زانیارییەک ناکات • ئەکاونتی کڕیاری ڕاستەوخۆ دیاری کراوە'
                    : 'No client info needed • Direct customer system account linked'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleToggleDirectQuotation}
              style={[
                styles.switchBackBtn,
                isTablet && { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
                {
                  borderColor: isDark ? colors.gray300 : '#BBF7D0',
                  backgroundColor: isDark ? colors.gray200 : '#FFFFFF',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="create-outline" size={isTablet ? 16 : 14} color={colors.primary} />
              <Text style={{ fontSize: isTablet ? 13.5 : 12, fontWeight: '700', color: colors.primary }}>
                {isKuLanguage ? 'گۆڕین بۆ ناوی کۆمپانیا یان کڕیار' : 'Switch to Custom Company / Client'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Company Name with Autocomplete */}
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isKuLanguage ? 'ناوی کۆمپانیا / کڕیار:' : 'Company / Client Name:'}
              </Text>
              <TextInput
                ref={nameInputRef}
                style={[
                  styles.input,
                  isTablet && { fontSize: 16, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
                  {
                    backgroundColor: nameError
                      ? (isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2')
                      : (isDark ? colors.gray200 : colors.gray50),
                    borderColor: nameError ? '#EF4444' : selectedCustomerId ? '#22C55E' : colors.gray300,
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
                placeholder={isKuLanguage ? 'ناوی کۆمپانیا یان کڕیار بنووسە (داواکراوە)...' : 'Enter company or client name (required)...'}
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
                      color: '#DC2626',
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
                <View style={[styles.suggestionsBox, { backgroundColor: isDark ? colors.gray200 : colors.white, borderColor: colors.primary }]}>
                  <View style={[styles.suggestionsHeader, { backgroundColor: isDark ? colors.gray300 : '#F8FAFC', borderBottomColor: isDark ? colors.gray200 : '#E2E8F0', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="sparkles" size={isTablet ? 15 : 13} color={colors.primary} />
                    <Text style={{ fontSize: isTablet ? 12.5 : 11, fontWeight: '700', color: colors.primary }}>
                      {isKuLanguage ? 'کۆمپانیا و کڕیارە تۆمارکراوەکان (بۆ عەرزی دووبارە):' : 'Saved Companies & Clients (For Repeat Quotes):'}
                    </Text>
                  </View>
                  {suggestions.map((cust) => (
                    <TouchableOpacity
                      key={cust.id}
                      style={[styles.suggestionItem, { borderBottomColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={() => handleSelectCustomer(cust)}
                    >
                      <Ionicons name="business" size={isTablet ? 19 : 16} color={colors.primary} />
                      <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '700', color: colors.black }}>{cust.name}</Text>
                        {cust.phone ? <Text style={{ fontSize: isTablet ? 13 : 11.5, color: colors.gray500 }}>{cust.phone}</Text> : null}
                        {cust.address ? <Text style={{ fontSize: isTablet ? 12 : 10.5, color: colors.gray400 }}>{cust.address}</Text> : null}
                      </View>
                      <View style={[styles.miniPill, { backgroundColor: colors.softBlue }]}>
                        <Text style={{ fontSize: isTablet ? 12 : 10.5, color: colors.primary, fontWeight: '700' }}>
                          {isKuLanguage ? 'دیاریکردن' : 'Select'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Phone & Address Inputs */}
            <View style={[styles.twoInputsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isKuLanguage ? 'ژمارەی مۆبایل:' : 'Phone Number:'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isTablet && { fontSize: 16, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
                    {
                      backgroundColor: isDark ? colors.gray200 : colors.gray50,
                      borderColor: colors.gray300,
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
                  placeholder="0770 123 4567"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {isKuLanguage ? 'ناونیشان:' : 'Address:'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isTablet && { fontSize: 16, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
                    {
                      backgroundColor: isDark ? colors.gray200 : colors.gray50,
                      borderColor: colors.gray300,
                      color: colors.black,
                      textAlign: isRTL ? 'right' : 'left',
                      fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined,
                      fontWeight: 'normal',
                    },
                  ]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder={isKuLanguage ? 'شار، شەقام...' : 'City, Street...'}
                  placeholderTextColor={colors.gray400}
                />
              </View>
            </View>
          </>
        )}
      </PremiumCard>
    );

    // 4. Quotation Terms & Notes with Edit Default Button
    const renderTermsCard = () => (
      <PremiumCard style={[styles.card, isTablet && { padding: 18, borderRadius: 16 }]}>
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 8 : 6 }}>
            <Ionicons name="document-text-outline" size={isTablet ? 22 : 18} color={colors.primary} />
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
                backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF9C3',
                borderColor: colors.primary,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            onPress={() => setEditDefaultNotesOpen(true)}
          >
            <Ionicons name="settings-outline" size={isTablet ? 15 : 13} color={colors.primary} />
            <Text style={{ fontSize: isTablet ? 12.5 : 11, fontWeight: '700', color: colors.primary }}>
              {isKuLanguage ? 'گۆڕینی تێبینی بنەڕەتی' : 'Edit Default'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Current Notes Input */}
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left' }]}>
            {isKuLanguage ? 'تێبینی بۆ ئەم عەرزە (پێشنیار دەکرێت بۆ کڕیار):' : 'Notes for this quote:'}
          </Text>
          <TextInput
            style={[
              styles.input,
              isTablet && { minHeight: 84, fontSize: 15, lineHeight: 24, paddingVertical: 12, paddingHorizontal: 14 },
              {
                backgroundColor: isDark ? colors.gray200 : colors.gray50,
                borderColor: colors.gray300,
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
          <Text style={[styles.inputLabel, isTablet && { fontSize: 13.5 }, { textAlign: isRTL ? 'right' : 'left' }]}>
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
                        backgroundColor: active ? colors.primary : (isDark ? colors.gray200 : colors.gray100),
                        borderColor: active ? colors.primary : colors.gray300,
                      },
                    ]}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      } catch {}
                      setValidityDays(days);
                    }}
                  >
                    <Text style={{ fontSize: isTablet ? 13.5 : 12, fontWeight: '700', color: active ? '#FFFFFF' : colors.gray700 }}>
                      {isKuLanguage ? `${days} ڕۆژ` : `${days} Days`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Direct Compact Number Input */}
            <View
              style={[
                styles.validityDirectInputBox,
                isTablet && { minWidth: 86, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 10 },
                {
                  backgroundColor: isDark ? colors.gray200 : colors.gray50,
                  borderColor: ![3, 7, 15, 30].includes(validityDays) && validityDays > 0 ? colors.primary : colors.gray300,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <TextInput
                style={[
                  styles.validityDirectInput,
                  isTablet && { fontSize: 15, minWidth: 34 },
                  {
                    color: colors.black,
                    textAlign: 'center',
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                    fontWeight: 'normal',
                  },
                ]}
                keyboardType="number-pad"
                value={validityDays > 0 ? String(validityDays) : ''}
                onChangeText={(val) => {
                  const clean = sanitizeNumericInput(val, 'number-pad');
                  const num = parseInt(clean, 10) || 0;
                  setValidityDays(num);
                }}
                placeholder="0"
                placeholderTextColor={colors.gray400}
              />
              <Text style={{ fontSize: isTablet ? 13 : 11.5, fontWeight: '700', color: colors.gray600 }}>
                {isKuLanguage ? 'ڕۆژ' : 'Days'}
              </Text>
            </View>
          </View>
        </View>
      </PremiumCard>
    );

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
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: showCurrencyOptions ? colors.primary : (isDark ? colors.gray300 : colors.gray200),
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 12 : 10, flex: 1 }}>
            <View
              style={[
                styles.currencyTriggerIconBox,
                isTablet && { width: 40, height: 40, borderRadius: 10 },
                { backgroundColor: isDark ? hexToRgba(colors.primary, 0.18) : '#FEF3C7' },
              ]}
            >
              <Ionicons name="cash-outline" size={isTablet ? 22 : 18} color={colors.primary} />
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
              <Text style={{ fontSize: isTablet ? 12.5 : 11, color: colors.gray500, marginTop: 1 }}>
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
                  backgroundColor: isDark ? hexToRgba(colors.primary, 0.22) : '#FEF9C3',
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.currencyActiveBadgeText,
                  isTablet && { fontSize: 13.5 },
                  {
                    color: colors.primary,
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
              color={colors.gray500}
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
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderColor: colors.primary,
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
                        backgroundColor: active ? colors.primary : isDark ? colors.gray200 : colors.gray50,
                        borderColor: active ? colors.primary : (isDark ? colors.gray300 : colors.gray200),
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
                      color={active ? '#FFFFFF' : colors.gray600}
                    />
                    <Text
                      style={[
                        styles.currencyPillText,
                        isTablet && { fontSize: 13 },
                        {
                          color: active ? '#FFFFFF' : colors.gray700,
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

    // 6. Generate Button
    const renderGenerateButton = () => (
      <View style={{ marginTop: isTablet ? 14 : 10, marginBottom: 40 }}>
        <PrimaryButton
          label={isGenerating ? (isKuLanguage ? 'دروستکردنی وەسڵ...' : 'Generating...') : (isKuLanguage ? 'دروستکردن و بینینی وەسڵی عەرز' : 'Generate & Preview Quotation')}
          onPress={handleGenerateQuotation}
          loading={isGenerating}
        />
      </View>
    );

    return (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AppHeader
          title={isKuLanguage ? 'داشکاندن و وەسڵ' : 'Review & Terms'}
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
          <PremiumCard style={[styles.invoiceCard, isTablet && { padding: 22, borderRadius: 20 }]}>
            {/* Top Badge & Number */}
            <View style={[styles.invoiceTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.invoiceDocBadge,
                  isTablet && { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
                  { backgroundColor: isDark ? colors.gray200 : '#F1F5F9', borderColor: colors.gray200, borderWidth: 1 },
                ]}
              >
                <Ionicons name="document-text" size={isTablet ? 16 : 13} color={colors.primary} />
                <Text
                  style={{
                    fontSize: isTablet ? 13.5 : 11.5,
                    fontWeight: '800',
                    color: colors.black,
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
                { backgroundColor: isDark ? colors.gray200 : colors.gray50, borderColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <Ionicons name="information-circle-outline" size={isTablet ? 20 : 16} color={colors.gray500} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: isTablet ? 13.5 : 11.5,
                    fontWeight: '700',
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                  }}
                >
                  {isKuLanguage
                    ? 'ئەم وەسڵە تەنها بۆ عەرزی نرخە و وەسڵی فەرمی فرۆشتن نییە'
                    : 'THIS DOCUMENT IS A PRICE QUOTATION ONLY AND NOT A SALES INVOICE'}
                </Text>
                <Text style={{ fontSize: isTablet ? 12 : 10.5, color: colors.gray500, textAlign: isRTL ? 'right' : 'left', marginTop: 1 }}>
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
                { backgroundColor: isDark ? colors.gray200 : colors.gray50, borderColor: colors.gray200 },
              ]}
            >
              <View style={[styles.clientRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: isTablet ? 13 : 11, color: colors.gray400, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                  {isKuLanguage ? 'پێشکەش دەکرێت بە:' : 'Presented To:'}
                </Text>
                <Text style={{ fontSize: isTablet ? 13 : 11, color: colors.gray400, direction: 'ltr' }}>
                  {q.date} {q.time ? `• ${q.time}` : ''}
                </Text>
              </View>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text
                    style={{
                      fontSize: isTablet ? 19 : 15.5,
                      fontWeight: '800',
                      color: colors.black,
                      textAlign: isRTL ? 'right' : 'left',
                      fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined,
                    }}
                  >
                    {q.customerName}
                  </Text>
                  {q.customerPhone ? (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Ionicons name="call-outline" size={isTablet ? 15 : 12} color={colors.gray400} />
                      <Text style={{ fontSize: isTablet ? 14 : 12, color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }}>
                        {q.customerPhone}
                      </Text>
                    </View>
                  ) : null}
                  {q.customerAddress ? (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                      <Ionicons name="location-outline" size={isTablet ? 15 : 12} color={colors.gray400} />
                      <Text style={{ fontSize: isTablet ? 14 : 12, color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }}>
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
                        backgroundColor: isDark ? colors.gray300 : '#FFFFFF',
                        borderColor: colors.gray300,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: isTablet ? 12 : 10, color: colors.gray500, marginBottom: 1, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                      {isKuLanguage ? 'ماوەی عەرز' : 'Validity'}
                    </Text>
                    <Text
                      style={{
                        fontSize: isTablet ? 16.5 : 14,
                        fontWeight: '800',
                        color: colors.black,
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
              <View style={[styles.itemsHeaderRow, isTablet && { paddingBottom: 10, marginBottom: 6 }, { borderColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isTablet ? 8 : 6 }}>
                  <Text style={{ fontSize: isTablet ? 14.5 : 12.5, fontWeight: '800', color: colors.black, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined }}>
                    {isKuLanguage ? 'لیستی کاڵا پێشنیارکراوەکان' : 'Quoted Items'}
                  </Text>
                  <Text style={{ fontSize: isTablet ? 13 : 11, color: colors.gray400 }}>
                    ({q.items.length} {isKuLanguage ? 'کاڵا' : 'items'})
                  </Text>
                </View>
                <Text style={{ fontSize: isTablet ? 13 : 11, color: colors.gray400, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
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
                      borderBottomColor: colors.gray100,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  {/* Distinct Number Chip */}
                  <View style={[styles.itemIndexPill, isTablet && { width: 28, height: 28, borderRadius: 14 }, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}>
                    <Text style={[styles.itemIndexText, isTablet && { fontSize: 13 }, { color: colors.gray500 }]}>{idx + 1}</Text>
                  </View>

                  {/* Product Details */}
                  <View style={{ flex: 1, marginHorizontal: isTablet ? 12 : 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={{ fontSize: isTablet ? 16 : 13.5, fontWeight: '700', color: colors.black }} numberOfLines={1}>
                      {it.productName}
                    </Text>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Text style={{ fontSize: isTablet ? 13 : 11, color: colors.gray500, direction: 'ltr' }}>
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
                  <Text style={{ fontSize: isTablet ? 16 : 13.5, fontWeight: '800', color: colors.black, direction: 'ltr' }}>
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
                  { backgroundColor: isDark ? colors.gray200 : colors.gray50, borderColor: colors.gray200, marginTop: 14 },
                ]}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="document-text-outline" size={isTablet ? 15 : 12} color={colors.gray500} />
                  <Text style={{ fontSize: isTablet ? 13 : 11, fontWeight: '700', color: colors.gray500, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined }}>
                    {isKuLanguage ? 'تێبینی و مەرجەکان:' : 'Terms & Conditions:'}
                  </Text>
                </View>
                <Text style={{ fontSize: isTablet ? 14 : 12, color: colors.black, lineHeight: isTablet ? 22 : 18, textAlign: isRTL ? 'right' : 'left' }}>
                  {q.notes}
                </Text>
              </View>
            ) : null}

            {/* Totals Section */}
            <View style={[styles.invoiceTotalsBox, isTablet && { marginTop: 16, paddingTop: 14, gap: 8 }, { borderTopColor: colors.gray200, marginTop: 14 }]}>
              {q.discountTotal > 0 && (
                <>
                  <View style={[styles.invoiceTotRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ fontSize: isTablet ? 14.5 : 12.5, color: colors.gray500, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                      {isKuLanguage ? 'کۆی سەرەتایی:' : 'Subtotal:'}
                    </Text>
                    <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '700', color: colors.black, direction: 'ltr' }}>
                      {formatRowPrice(q.subtotal)}
                    </Text>
                  </View>
                  <View style={[styles.invoiceTotRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={{ fontSize: isTablet ? 14.5 : 12.5, color: colors.gray500, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_REGULAR : undefined }}>
                      {isKuLanguage ? 'داشکاندن:' : 'Discount:'}
                    </Text>
                    <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '700', color: isDark ? '#4ADE80' : '#15803D', direction: 'ltr' }}>
                      −{formatRowPrice(q.discountTotal)}
                    </Text>
                  </View>
                </>
              )}
              <View style={[styles.invoiceGrandTotRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={{ fontSize: isTablet ? 18 : 15, fontWeight: '800', color: colors.black, fontFamily: isKuLanguage ? SETTINGS_KURDISH_FONT_BOLD : undefined }}>
                  {isKuLanguage ? 'کۆی گشتی:' : 'Grand Total:'}
                </Text>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={{ fontSize: isTablet ? 24 : 17.5, fontWeight: '900', color: colors.black, direction: 'ltr' }}>
                    {grandTotalPrimary}
                  </Text>
                  {grandTotalSecondary ? (
                    <Text style={{ fontSize: isTablet ? 15 : 12, fontWeight: '700', color: colors.gray500, direction: 'ltr', marginTop: 2 }}>
                      {grandTotalSecondary}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </PremiumCard>

          {/* Action Buttons */}
          <View style={{ gap: isTablet ? 14 : 10, marginTop: isTablet ? 18 : 14, marginBottom: 40 }}>
            <PrimaryButton
              label={isGenerating ? (isKuLanguage ? 'دروستکردنی PDF...' : 'Creating PDF...') : (isKuLanguage ? 'هاوبەشکردن و چاپکردنی PDF' : 'Share & Print PDF')}
              onPress={() => handleSharePDF(q)}
              loading={isGenerating}
            />

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
                { borderColor: colors.gray300, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={handleResetForNewQuote}
            >
              <Ionicons name="add-circle-outline" size={isTablet ? 20 : 17} color={colors.gray600} />
              <Text style={{ fontSize: isTablet ? 15 : 13, fontWeight: '600', color: colors.gray600 }}>
                {isKuLanguage ? 'دروستکردنی عەرزی نوێ' : 'Create New Quote'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      {step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}

      {/* Barcode Scanner Modal */}
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
  },
  card: {
    padding: 14,
    borderRadius: Theme.radius.md,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 10,
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
});
