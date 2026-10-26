import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { useSavedProductStore, SavedProductPreset } from '@/store/savedProductStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { resolveImageUri } from '@/lib/imageStorage';

import { AppHeader } from '@/components/common/AppHeader';
import { KeyboardAwareScrollView, useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { ProductImagePicker } from '@/components/ui/ProductImagePicker';
import { useTranslation } from 'react-i18next';
import { usePurchaseStore } from '@/store/purchaseStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCapitalStore } from '@/store/capitalStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { Theme } from '@/constants/theme';
import { hexToRgba } from '@/lib/colorUtils';
import type { PurchaseIdType, PurchasePaymentStatus } from '@/types/purchases';
import { getProductCategories, DIRECT_SUPPLIER_NAME, isDirectSupplierName } from '@/lib/sqlite';
import { generateUniqueProductId } from '@/lib/generateId';
import { CategoryAutocompleteInput } from '@/components/shared/CategoryAutocompleteInput';
import { SupplierInputForm } from '@/components/purchases/SupplierInputForm';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { DatePickerModal } from '@/components/shared/DatePickerModal';
import { ReceiptCurrencySelector } from '@/components/shared/ReceiptCurrencySelector';
import { CheckoutActionGrid, type CheckoutMode } from '@/components/shared/CheckoutActionGrid';
import { PurchasePaymentOptionsAccordion } from '@/components/purchases/PurchasePaymentOptionsAccordion';
import { useBusinessStore } from '@/store/businessStore';
import {
  fmtExchangeRate,
  toEnglishDigits,
  toDateOnly,
  sanitizeNumericInput,
  formatExpiryCountdown,
  formatProductionAge,
} from '@/utils/formatters';
import { roundToNearest250 } from '@/utils/rounding';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD, applyKurdishFont, resolveInputIsKurdish } from '@/lib/settingsFont';
import { resolveInterFont } from '@/constants/typography';
import { useLanguageStore } from '@/store/languageStore';
import { useResponsive } from '@/hooks/useResponsive';
import type { ReceiptCurrencyMode } from '@/lib/invoiceTemplate';
import { BarcodeScannerModal } from '@/components/shared/BarcodeScannerModal';

function round(n: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}


export default function NewPurchaseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { textAlign, flexDirection, isRTL } = useRTL();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const useThreeColumns = isTablet && isTabletLandscape;
  const { createPurchase } = usePurchaseStore();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate) || 1310;
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const isUSD = baseCurrency === 'USD';
  const expiryTrackingEnabled = useSettingsStore((s) => s.expiryTrackingEnabled);
  const { isEnabled: isCapitalEnabled, getDrawerBalance } = useCapitalStore();
  const { colors, isDark } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const col1ScrollRef = useRef<ScrollView>(null);
  const col2ScrollRef = useRef<ScrollView>(null);
  const col3ScrollRef = useRef<ScrollView>(null);
  const scrollIntoView = useKeyboardAwareFocus();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const inventoryProducts = useInventoryStore((s) => s.products);
  const { savedPresets, findByName, findByCode, savePreset, syncFromInventory } = useSavedProductStore();

  useEffect(() => {
    if (inventoryProducts && inventoryProducts.length > 0) {
      syncFromInventory(inventoryProducts);
    }
  }, [inventoryProducts, syncFromInventory]);

  const [drawerBalance, setDrawerBalance] = useState<number | null>(null);

  useEffect(() => {
    if (isCapitalEnabled) {
      getDrawerBalance().then((bal) => {
        setDrawerBalance(Number.isFinite(bal) ? bal : 0);
      }).catch(() => {});
    }
  }, [isCapitalEnabled, getDrawerBalance]);

  // ─── Required fields ────────────────────────────────────────────────────────
  const [supplierName, setSupplierName]     = useState('');
  const isDirectSupplier = isDirectSupplierName(supplierName);
  const [purchaseDate, setPurchaseDate]     = useState(() => new Date());
  const [productName, setProductName]       = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [qty, setQty]                       = useState('1');
  const [buyIQD, setBuyIQD]                 = useState('');
  const [buyUSD, setBuyUSD]                 = useState('');

  // ─── Bound Product Identity (Strict ID-Product Name Integrity) ────────────
  // When an existing product is auto-filled (by name or barcode), this tracks its original name and ID.
  // Rule: "کە ناوی بەرەهەمەکە گۆرا نابێ لەسەر هەمان ئایدی بمێنێ چونکە ئیتر ئەو ئایدە تایبەت دەبێ بەو بەرهەمە"
  const [boundProductIdentity, setBoundProductIdentity] = useState<{ name: string; itemId: string } | null>(null);
  const [idClearedNotice, setIdClearedNotice] = useState<string | null>(null);

  const handleSelectSavedItem = (preset: SavedProductPreset) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}

    // 1. Basic details & photo
    setProductName(preset.name);
    if (preset.description) {
      setItemDescription(preset.description);
    }
    if (preset.category) {
      setCategory(preset.category);
    }
    if (preset.imageUri) {
      setImageUri(preset.imageUri);
    }
    if (preset.websiteDescription) {
      setWebsiteDescription(preset.websiteDescription);
    }
    if (preset.warranty) {
      setWarranty(preset.warranty);
    }

    // 2. Barcode / Item ID binding
    if (preset.itemId) {
      setIdType('shared');
      setSharedId(preset.itemId);
      setBoundProductIdentity({ name: preset.name, itemId: preset.itemId });
      setIdClearedNotice(null);
    }

    // 3. Prices (Buy & Sell in IQD and USD)
    if (preset.buyPriceIQD && preset.buyPriceIQD > 0) {
      setBuyIQD(String(preset.buyPriceIQD));
      if (preset.buyPriceUSD) {
        setBuyUSD(String(preset.buyPriceUSD));
      } else {
        setBuyUSD(String(round(preset.buyPriceIQD / exchangeRate, 2)));
      }
    }
    if (preset.sellPriceIQD && preset.sellPriceIQD > 0) {
      setSellIQD(String(preset.sellPriceIQD));
      if (preset.sellPriceUSD) {
        setSellUSD(String(preset.sellPriceUSD));
      } else {
        setSellUSD(String(round(preset.sellPriceIQD / exchangeRate, 2)));
      }
    }

    // 4. Supplier Auto-fill (can be freely edited by user anytime)
    if (preset.supplierName) {
      setSupplierName(preset.supplierName);
      if (preset.supplierPhone) setSupplierPhone(preset.supplierPhone);
      if (preset.supplierAddress) setSupplierAddress(preset.supplierAddress);
      if (preset.selectedSupplierId) {
        setSelectedSupplierId(preset.selectedSupplierId);
      } else {
        import('@/lib/sqlite').then(({ findSupplierByNameOrPhone }) => {
          findSupplierByNameOrPhone(preset.supplierName, preset.supplierPhone).then((supp) => {
            if (supp) setSelectedSupplierId(supp.id);
          }).catch(() => {});
        }).catch(() => {});
      }
    }
  };

  const handleProductNameChange = (val: string) => {
    setProductName(val);
    setIdClearedNotice(null);

    // If this form had an ID bound to a specific product name:
    // If the name is changed, detach the ID so it won't be hijacked for a different product!
    if (boundProductIdentity && boundProductIdentity.itemId) {
      const isDifferent = val.trim().toLowerCase() !== boundProductIdentity.name.trim().toLowerCase();
      if (isDifferent) {
        if (sharedId === boundProductIdentity.itemId) {
          setSharedId('');
        }
        const prevName = boundProductIdentity.name;
        const prevId = boundProductIdentity.itemId;
        setBoundProductIdentity(null);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        } catch {}
        setIdClearedNotice(
          isKuLanguage
            ? `ئایدی (${prevId}) لادرا چونکە ناوی بەرهەمەکە گۆڕدرا و ئەو ئایدیە تایبەتە بە «${prevName}»`
            : `ID (${prevId}) was removed because product name changed (dedicated to "${prevName}")`
        );
      }
    }
  };

  const matchingPresets = React.useMemo(() => {
    const q = productName.trim().toLowerCase();
    if (q.length < 1) return [];
    return savedPresets.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [savedPresets, productName]);

  // ─── ID type ────────────────────────────────────────────────────────────────
  const [idType, setIdType]                 = useState<PurchaseIdType | null>(null);
  const [sharedId, setSharedId]             = useState('');
  const [customIds, setCustomIds]           = useState<string[]>(['']);
  const [isGeneratingShared,   setIsGeneratingShared]   = useState(false);
  const [generatingCustomIdxs, setGeneratingCustomIdxs] = useState<Set<number>>(new Set());

  // ─── Existing Product Detection for Repurchase / Restock ───────────────────
  const existingInventoryProduct = React.useMemo(() => {
    const cleanName = productName.trim().toLowerCase();
    if (!cleanName) return null;

    // 1. By bound identity
    if (boundProductIdentity?.name && boundProductIdentity.name.trim().toLowerCase() === cleanName) {
      const match = inventoryProducts.find(
        (p) => p.name.trim().toLowerCase() === cleanName ||
               (boundProductIdentity.itemId && p.itemId && p.itemId.trim().toLowerCase() === boundProductIdentity.itemId.trim().toLowerCase())
      );
      if (match) return match;
    }

    // 2. By exact name in inventoryProducts
    const matchByName = inventoryProducts.find(
      (p) => p.name.trim().toLowerCase() === cleanName
    );
    if (matchByName) return matchByName;

    // 3. By saved presets
    const matchPreset = savedPresets.find(
      (p) => p.name.trim().toLowerCase() === cleanName
    );
    if (matchPreset) {
      const invP = inventoryProducts.find(
        (p) => (matchPreset.itemId && p.itemId && p.itemId.trim().toLowerCase() === matchPreset.itemId.trim().toLowerCase()) ||
               p.name.trim().toLowerCase() === matchPreset.name.trim().toLowerCase()
      );
      if (invP) return invP;
      return {
        id: 0,
        name: matchPreset.name,
        itemId: matchPreset.itemId ?? '',
        quantity: 0,
        purchasePrice: matchPreset.buyPriceIQD || 0,
        sellingPrice: matchPreset.sellPriceIQD || 0,
        category: matchPreset.category || 'General',
      } as any;
    }

    return null;
  }, [productName, boundProductIdentity, inventoryProducts, savedPresets]);

  const isRepurchasingExisting = Boolean(existingInventoryProduct);
  const existingProductLockedId = existingInventoryProduct?.itemId || boundProductIdentity?.itemId || sharedId;

  // Auto-lock and auto-fill existing product ID when repurchasing
  useEffect(() => {
    if (existingInventoryProduct) {
      const targetId = existingInventoryProduct.itemId || boundProductIdentity?.itemId;
      if (targetId && sharedId !== targetId) {
        setSharedId(targetId);
      }
      if (idType !== 'shared') {
        setIdType('shared');
      }
      if (!boundProductIdentity || boundProductIdentity.name.trim().toLowerCase() !== existingInventoryProduct.name.trim().toLowerCase()) {
        setBoundProductIdentity({
          name: existingInventoryProduct.name,
          itemId: targetId || '',
        });
      }
      // Auto-fill prices if empty
      if (!buyIQD && existingInventoryProduct.purchasePrice > 0) {
        setBuyIQD(String(existingInventoryProduct.purchasePrice));
        setBuyUSD(String((existingInventoryProduct as any).buyPriceUsd || round(existingInventoryProduct.purchasePrice / exchangeRate, 2)));
      }
      if (!sellIQD && existingInventoryProduct.sellingPrice > 0) {
        setSellIQD(String(existingInventoryProduct.sellingPrice));
        setSellUSD(String((existingInventoryProduct as any).sellPriceUsd || round(existingInventoryProduct.sellingPrice / exchangeRate, 2)));
      }
      if (!category && existingInventoryProduct.category) {
        setCategory(existingInventoryProduct.category);
      }

      // Auto-fill previous supplier if empty
      const existingSuppName = (existingInventoryProduct as any).supplierName;
      if (!supplierName && existingSuppName) {
        const existingSuppPhone = (existingInventoryProduct as any).supplierPhone || '';
        const existingSuppAddr = (existingInventoryProduct as any).supplierAddress || '';
        setSupplierName(existingSuppName);
        if (existingSuppPhone) setSupplierPhone(existingSuppPhone);
        if (existingSuppAddr) setSupplierAddress(existingSuppAddr);
        import('@/lib/sqlite').then(({ findSupplierByNameOrPhone }) => {
          findSupplierByNameOrPhone(existingSuppName, existingSuppPhone).then((supp) => {
            if (supp) setSelectedSupplierId(supp.id);
          }).catch(() => {});
        }).catch(() => {});
      }
    }
  }, [existingInventoryProduct]);

  // ─── Barcode Scanner ────────────────────────────────────────────────────────
  const [scannerVisible, setScannerVisible] = useState(false);
  const [targetCustomIdx, setTargetCustomIdx] = useState<number | null>(null);

  const handleOpenScanner = (customIdx?: number) => {
    setTargetCustomIdx(customIdx !== undefined ? customIdx : null);
    setScannerVisible(true);
  };

  const findProductPresetByCode = (code: string): SavedProductPreset | null => {
    const clean = code.trim().toLowerCase();
    if (!clean) return null;
    const fromStore = findByCode(clean);
    if (fromStore) return fromStore;

    const fromInv = inventoryProducts.find(
      (p) => p.itemId && p.itemId.trim().toLowerCase() === clean
    );
    if (fromInv) {
      return {
        id: `inv_${fromInv.id}`,
        name: fromInv.name,
        description: fromInv.itemDescription || fromInv.description || null,
        imageUri: fromInv.imageUri || fromInv.imageRemoteUrl || null,
        itemId: fromInv.itemId,
        category: fromInv.category || null,
        buyPriceIQD: fromInv.purchasePrice,
        buyPriceUSD: fromInv.buyPriceUsd,
        sellPriceIQD: fromInv.sellingPrice,
        sellPriceUSD: fromInv.sellPriceUsd,
        supplierName: fromInv.supplierName,
        supplierPhone: fromInv.supplierPhone,
        supplierAddress: fromInv.supplierAddress,
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  };

  const handleScanSingle = (code: string) => {
    const cleanCode = toEnglishDigits(code).trim();
    if (!cleanCode) return;

    const matched = findProductPresetByCode(cleanCode);

    if (matched) {
      const currentTrimmedName = productName.trim().toLowerCase();
      const matchedName = matched.name.trim();

      // Case 1: Name is empty OR matches the existing product
      if (!currentTrimmedName || currentTrimmedName === matchedName.toLowerCase()) {
        handleSelectSavedItem(matched);
        if (targetCustomIdx !== null) {
          updateCustomId(targetCustomIdx, cleanCode);
        } else {
          setIdType('shared');
          setSharedId(cleanCode);
        }
        return;
      }

      // Case 2: Name is already filled with a DIFFERENT product name!
      // Strict ID dedication rule: prevent hijacking the ID!
      Alert.alert(
        isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'ID is Dedicated to Another Product',
        isKuLanguage
          ? `ئەم بارکۆدە (${cleanCode}) پێشتر بۆ بەرهەمی «${matchedName}» دیاریکراوە و تایبەتە پێی.\n\nناتوانرێت ئەم ئایدیە بۆ بەرهەمی «${productName.trim()}» دابنرێت چونکە ناوی جیاوازە.`
          : `Barcode (${cleanCode}) is already dedicated to "${matchedName}". It cannot be assigned to "${productName.trim()}".`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: isKuLanguage ? `بۆ «${matchedName}» بگۆڕە` : `Switch to "${matchedName}"`,
            onPress: () => {
              handleSelectSavedItem(matched);
              if (targetCustomIdx !== null) {
                updateCustomId(targetCustomIdx, cleanCode);
              } else {
                setIdType('shared');
                setSharedId(cleanCode);
              }
            },
          },
        ]
      );
      return;
    }

    // New unknown barcode
    if (targetCustomIdx !== null) {
      updateCustomId(targetCustomIdx, cleanCode);
    } else {
      if (idType === 'shared') {
        setSharedId(cleanCode);
      } else {
        const firstEmpty = customIds.findIndex((val) => !val.trim());
        const idx = firstEmpty >= 0 ? firstEmpty : 0;
        updateCustomId(idx, cleanCode);
      }
    }
  };

  const handleSharedIdBlur = () => {
    if (!sharedId.trim()) return;
    const cleanCode = sharedId.trim();
    const matched = findProductPresetByCode(cleanCode);

    if (matched) {
      const currentTrimmedName = productName.trim().toLowerCase();
      const matchedName = matched.name.trim();

      if (!currentTrimmedName || currentTrimmedName === matchedName.toLowerCase()) {
        handleSelectSavedItem(matched);
      } else {
        Alert.alert(
          isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'ID is Dedicated to Another Product',
          isKuLanguage
            ? `ئەم ئایدیە (${cleanCode}) تایبەتە بە بەرهەمی «${matchedName}» و ناتوانرێت بۆ بەرهەمی «${productName.trim()}» بەکاربێت.`
            : `ID (${cleanCode}) is dedicated to "${matchedName}" and cannot be used for "${productName.trim()}".`,
          [
            { text: t('common.cancel'), style: 'cancel', onPress: () => setSharedId('') },
            {
              text: isKuLanguage ? `بۆ «${matchedName}» بگۆڕە` : `Switch to "${matchedName}"`,
              onPress: () => handleSelectSavedItem(matched),
            },
          ]
        );
      }
    }
  };

  const handleApplyBatchIds = (codes: string[]) => {
    if (!codes || codes.length === 0) return;
    if (codes.length === 1 && idType === 'shared') {
      setSharedId(codes[0]);
      return;
    }
    // Multiple codes or custom ID mode
    setIdType('custom');
    setQty(String(codes.length));
    setCustomIds(codes);
  };

  const removeCustomIdSlot = (idx: number) => {
    if (qtyNum <= 1) {
      updateCustomId(0, '');
      return;
    }
    setCustomIds((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setQty(String(next.length));
      return next;
    });
  };

  // ─── Optional fields ────────────────────────────────────────────────────────
  const [sellIQD, setSellIQD]               = useState('');
  const [sellUSD, setSellUSD]               = useState('');
  const [category, setCategory]             = useState('');
  const [warranty, setWarranty]             = useState('');
  const [notes, setNotes]                   = useState('');
  const [websiteDescription, setWebsiteDescription] = useState('');
  const [supplierPhone, setSupplierPhone]   = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>();
  const savedPaymentStatusPref = useSettingsStore((s) => s.purchasePaymentStatusPreference);
  const savedReceiptCurrencyPref = useSettingsStore((s) => s.purchaseReceiptCurrencyPreference);
  const savedCheckoutModePref = useSettingsStore((s) => s.purchaseCheckoutModePreference);
  const savedDebtDownPaymentMethodPref = useSettingsStore((s) => s.purchaseDebtDownPaymentMethodPreference);
  const setPaymentStatusPreference = useSettingsStore((s) => s.setPurchasePaymentStatusPreference);
  const setReceiptCurrencyPreference = useSettingsStore((s) => s.setPurchaseReceiptCurrencyPreference);
  const setCheckoutModePreference = useSettingsStore((s) => s.setPurchaseCheckoutModePreference);
  const setDebtDownPaymentMethodPreference = useSettingsStore((s) => s.setPurchaseDebtDownPaymentMethodPreference);

  const [paymentStatus, setPaymentStatusState] = useState<PurchasePaymentStatus>(savedPaymentStatusPref || 'paid');
  const [amountPaid, setAmountPaid]         = useState('');
  const [initialPaymentMethod, setInitialPaymentMethodState] = useState<'cash' | 'fib'>(savedDebtDownPaymentMethodPref || 'cash');

  const [imageUri, setImageUri]             = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [receiptCurrency, setReceiptCurrencyState] = useState<ReceiptCurrencyMode>(savedReceiptCurrencyPref || 'iqd');
  const [checkoutMode, setCheckoutModeState] = useState<CheckoutMode>(savedCheckoutModePref || 'normal');

  const setPaymentStatus = (status: PurchasePaymentStatus) => {
    setPaymentStatusState(status);
    setPaymentStatusPreference(status);
  };

  const setInitialPaymentMethod = (method: 'cash' | 'fib') => {
    setInitialPaymentMethodState(method);
    setDebtDownPaymentMethodPreference(method);
  };

  const setReceiptCurrency = (curr: ReceiptCurrencyMode) => {
    setReceiptCurrencyState(curr);
    setReceiptCurrencyPreference(curr);
  };

  const setCheckoutMode = (mode: CheckoutMode) => {
    setCheckoutModeState(mode);
    setCheckoutModePreference(mode);
  };

  // ─── Expiry & Production Dates ──────────────────────────────────────────────
  const [productionDate, setProductionDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate]         = useState<Date | null>(null);
  const [showProdPicker, setShowProdPicker] = useState(false);
  const [showExpPicker, setShowExpPicker]   = useState(false);

  const handleSetProductionQuick = (type: 'today' | 'yesterday' | 'clear') => {
    try { Haptics.selectionAsync().catch(() => {}); } catch {}
    if (type === 'clear') {
      setProductionDate(null);
    } else if (type === 'today') {
      setProductionDate(new Date());
    } else if (type === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      setProductionDate(d);
    }
  };

  const handleAddExpiryMonths = (months: number) => {
    try { Haptics.selectionAsync().catch(() => {}); } catch {}
    const base = productionDate || new Date();
    const target = new Date(base);
    target.setMonth(target.getMonth() + months);
    setExpiryDate(target);
  };

  const handleClearExpiry = () => {
    try { Haptics.selectionAsync().catch(() => {}); } catch {}
    setExpiryDate(null);
  };

  useEffect(() => {
    getProductCategories().then(setAvailableCategories).catch(() => {});
  }, []);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const qtyNum       = Math.max(1, parseInt(qty) || 1);
  const buyIQDNum    = parseFloat(toEnglishDigits(buyIQD).replace(/,/g, '')) || 0;
  const sellIQDNum   = parseFloat(toEnglishDigits(sellIQD).replace(/,/g, '')) || 0;
  const totalIQD     = qtyNum * buyIQDNum;
  const profitIQD    = (sellIQDNum - buyIQDNum) * qtyNum;

  const maxDownPayment = useMemo(() => {
    if (isUSD) {
      const totalUSD = Math.round((totalIQD / exchangeRate) * 100) / 100;
      return totalUSD > 0.01 ? Math.round((totalUSD - 0.01) * 100) / 100 : 0;
    }
    return totalIQD > 250 ? totalIQD - 250 : 0;
  }, [totalIQD, isUSD, exchangeRate]);

  const maxDownPaymentIQD = useMemo(() => {
    if (isUSD) {
      return Math.min(roundToNearest250(maxDownPayment * exchangeRate), Math.max(0, totalIQD - 250));
    }
    return maxDownPayment;
  }, [maxDownPayment, isUSD, exchangeRate, totalIQD]);

  const rawPaidNum   = parseFloat(toEnglishDigits(amountPaid).replace(/,/g, '')) || 0;
  const isPaidExceeded = paymentStatus === 'debt' && rawPaidNum > maxDownPayment;
  const maxDownPaymentDisplay = isUSD ? `$${maxDownPayment}` : `${maxDownPayment.toLocaleString()} IQD`;
  const rawPaidIQD = isUSD ? roundToNearest250(rawPaidNum * exchangeRate) : roundToNearest250(rawPaidNum);
  const amountPaidIQD = paymentStatus === 'debt' ? Math.max(0, Math.min(rawPaidIQD, maxDownPaymentIQD)) : rawPaidIQD;
  const remainingDebt = paymentStatus === 'debt' ? Math.max(0, totalIQD - amountPaidIQD) : 0;
  const cashNeeded    = paymentStatus === 'paid' ? totalIQD : (paymentStatus === 'debt' && initialPaymentMethod === 'cash' ? amountPaidIQD : 0);
  const projectedBalance = (drawerBalance ?? 0) - cashNeeded;
  const isInsufficientCash = isCapitalEnabled && drawerBalance !== null && cashNeeded > drawerBalance;

  // Sample placeholders for pricing inputs (dynamically converted via system exchange rate)
  const sampleBuyUSD = 20;
  const sampleBuyIQDStr = useMemo(
    () => roundToNearest250(sampleBuyUSD * exchangeRate).toLocaleString('en-US'),
    [exchangeRate]
  );
  const sampleSellUSD = 25;
  const sampleSellIQDStr = useMemo(
    () => roundToNearest250(sampleSellUSD * exchangeRate).toLocaleString('en-US'),
    [exchangeRate]
  );

  // ─── Currency sync ──────────────────────────────────────────────────────────
  function onBuyIQDChange(val: string) {
    const clean = sanitizeNumericInput(val, 'decimal-pad');
    setBuyIQD(clean);
    const n = parseFloat(clean.replace(/,/g, '')) || 0;
    setBuyUSD(n > 0 ? String(round(n / exchangeRate, 2)) : '');
  }

  function onBuyUSDChange(val: string) {
    const clean = sanitizeNumericInput(val, 'decimal-pad');
    setBuyUSD(clean);
    const n = parseFloat(clean.replace(/,/g, '')) || 0;
    setBuyIQD(n > 0 ? String(roundToNearest250(n * exchangeRate)) : '');
  }

  function onSellIQDChange(val: string) {
    const clean = sanitizeNumericInput(val, 'decimal-pad');
    setSellIQD(clean);
    const n = parseFloat(clean.replace(/,/g, '')) || 0;
    setSellUSD(n > 0 ? String(round(n / exchangeRate, 2)) : '');
  }

  function onSellUSDChange(val: string) {
    const clean = sanitizeNumericInput(val, 'decimal-pad');
    setSellUSD(clean);
    const n = parseFloat(clean.replace(/,/g, '')) || 0;
    setSellIQD(n > 0 ? String(roundToNearest250(n * exchangeRate)) : '');
  }

  // ─── Qty change → rebuild custom ID slots ─────────────────────────────────
  function onQtyChange(val: string) {
    const clean = sanitizeNumericInput(val, 'number-pad');
    setQty(clean);
    const n = Math.min(100, Math.max(1, parseInt(clean) || 1));
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

  // ─── Random ID generation ────────────────────────────────────────────────────
  function setCustomGenerating(idx: number, on: boolean) {
    setGeneratingCustomIdxs((prev) => {
      const next = new Set(prev);
      on ? next.add(idx) : next.delete(idx);
      return next;
    });
  }

  async function handleGenerateSharedId() {
    if (isGeneratingShared) return;
    setIsGeneratingShared(true);
    try {
      setSharedId(await generateUniqueProductId([]));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert(t('common.error'), msg === 'ID_EXHAUSTED'
        ? t('purchases.idExhausted') : t('common.tryAgain'));
    } finally {
      setIsGeneratingShared(false);
    }
  }

  async function handleGenerateCustomId(idx: number) {
    if (generatingCustomIdxs.has(idx)) return;
    setCustomGenerating(idx, true);
    try {
      const siblings = customIds.filter((_, i) => i !== idx);
      updateCustomId(idx, await generateUniqueProductId(siblings));
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert(t('common.error'), msg === 'ID_EXHAUSTED'
        ? t('purchases.idExhausted') : t('common.tryAgain'));
    } finally {
      setCustomGenerating(idx, false);
    }
  }

  // ─── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    if (!productName.trim()) {
      Alert.alert(t('common.required'), t('purchases.validationRequired'));
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
    if (idType === 'shared' && sharedId.trim()) {
      const cleanCode = sharedId.trim().toLowerCase();
      const conflict = inventoryProducts.find(
        (p) => p.itemId && p.itemId.trim().toLowerCase() === cleanCode
      );
      if (conflict && conflict.name.trim().toLowerCase() !== productName.trim().toLowerCase()) {
        Alert.alert(
          isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'Dedicated ID',
          isKuLanguage
            ? `ئەم ئایدیە (${sharedId.trim()}) پێشتر بۆ بەرهەمی «${conflict.name}» تۆمارکراوە و تایبەتە پێی. ناتوانرێت بۆ بەرهەمی «${productName.trim()}» بەکاربێت.`
            : `ID (${sharedId.trim()}) is dedicated to "${conflict.name}" and cannot be used for "${productName.trim()}".`
        );
        return false;
      }
    }
    if (paymentStatus === 'debt') {
      if (rawPaidNum > 0 && (rawPaidNum > maxDownPayment || rawPaidIQD >= totalIQD)) {
        Alert.alert(t('common.error'), t('purchases.validationAmountPaidDebt'));
        return false;
      }
    }
    return true;
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return;

    // Cash drawer balance check when Capital system is enabled
    const capitalStore = useCapitalStore.getState();
    if (capitalStore.isEnabled) {
      const needed = paymentStatus === 'paid' ? totalIQD : (paymentStatus === 'debt' && initialPaymentMethod === 'cash' ? amountPaidIQD : 0);
      if (needed > 0) {
        const availableBalance = await capitalStore.getDrawerBalance();
        if (needed > availableBalance) {
          Alert.alert(
            t('capital.insufficientTitle'),
            t('capital.cannotPurchaseDueToBalance') +
              '\n\n' +
              t('capital.insufficientBody', {
                needed: roundToNearest250(needed).toLocaleString(),
                available: Math.max(0, Math.round(availableBalance)).toLocaleString(),
              })
          );
          return;
        }
      }
    }

    const finalItemIds =
      idType === 'shared'
        ? [sharedId.trim()]
        : customIds.map((v) => v.trim());

    setIsSubmitting(true);
    try {
      const purchase = await createPurchase({
        date: purchaseDate.toISOString(),
        supplierName: isDirectSupplier ? DIRECT_SUPPLIER_NAME : supplierName,
        supplierPhone: isDirectSupplier ? '' : supplierPhone,
        supplierAddress: isDirectSupplier ? '' : supplierAddress,
        productName,
        category,
        quantity: qtyNum,
        buyPriceIQD: roundToNearest250(buyIQDNum),
        buyPriceUSD: parseFloat(buyUSD) || round(buyIQDNum / exchangeRate, 2),
        sellPriceIQD: roundToNearest250(sellIQDNum),
        sellPriceUSD: parseFloat(sellUSD) || round(sellIQDNum / exchangeRate, 2),
        exchangeRate,
        idType,
        itemIds: finalItemIds,
        warranty,
        description: '',
        notes,
        websiteDescription,
        itemDescription,
        paymentStatus,
        initialAmountPaid: paymentStatus === 'debt' ? amountPaidIQD : 0,
        initialPaymentMethod: paymentStatus === 'debt' ? initialPaymentMethod : (paymentStatus === 'fib' ? 'fib' : 'cash'),
        imageUri,
        selectedSupplierId: isDirectSupplier ? undefined : selectedSupplierId,
        productionDate: productionDate ? toDateOnly(productionDate) : null,
        expiryDate: expiryDate ? toDateOnly(expiryDate) : null,
      });

      // Auto-persist complete product preset to saved library
      try {
        savePreset({
          name: productName.trim() || undefined,
          description: itemDescription.trim() || null,
          imageUri: imageUri || null,
          itemId: sharedId.trim() || (customIds[0]?.trim()) || null,
          category: category.trim() || null,
          buyPriceIQD: roundToNearest250(buyIQDNum),
          buyPriceUSD: parseFloat(buyUSD) || round(buyIQDNum / exchangeRate, 2),
          sellPriceIQD: roundToNearest250(sellIQDNum),
          sellPriceUSD: parseFloat(sellUSD) || round(sellIQDNum / exchangeRate, 2),
          supplierName: isDirectSupplier ? DIRECT_SUPPLIER_NAME : (supplierName.trim() || null),
          supplierPhone: isDirectSupplier ? null : (supplierPhone.trim() || null),
          supplierAddress: isDirectSupplier ? null : (supplierAddress.trim() || null),
          selectedSupplierId: isDirectSupplier ? null : selectedSupplierId,
          warranty: warranty.trim() || null,
          notes: notes.trim() || null,
          websiteDescription: websiteDescription.trim() || null,
        });
      } catch { /* non-critical */ }

      if (category.trim()) {
        try {
          const { addManagedCategory } = await import('@/lib/sqlite');
          await addManagedCategory(category.trim());
        } catch { /* non-critical */ }
      }

      const resetForm = () => {
        setProductName(''); setPurchaseDate(new Date()); setSupplierName('');
        setQty('1'); setBuyIQD(''); setBuyUSD(''); setSellIQD(''); setSellUSD('');
        setIdType(null); setSharedId(''); setCustomIds(['']);
        setSupplierPhone(''); setSupplierAddress(''); setSelectedSupplierId(undefined);
        const currentPrefs = useSettingsStore.getState();
        setPaymentStatusState(currentPrefs.purchasePaymentStatusPreference || 'paid');
        setAmountPaid('');
        setInitialPaymentMethodState(currentPrefs.purchaseDebtDownPaymentMethodPreference || 'cash');
        setImageUri(null);
        setReceiptCurrencyState(currentPrefs.purchaseReceiptCurrencyPreference || 'iqd');
        setCheckoutModeState(currentPrefs.purchaseCheckoutModePreference || 'normal');
        setBoundProductIdentity(null);
        setIdClearedNotice(null);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        col1ScrollRef.current?.scrollTo({ y: 0, animated: true });
        col2ScrollRef.current?.scrollTo({ y: 0, animated: true });
        col3ScrollRef.current?.scrollTo({ y: 0, animated: true });
      };

      if (checkoutMode === 'print') {
        const business = useBusinessStore.getState();
        const { directPrintPurchaseInvoice } = await import('@/lib/generateInvoice');
        const purchaseItems = [{
          productName: purchase.productName,
          category: purchase.category,
          quantity: purchase.quantity,
          buyPriceIQD: purchase.buyPriceIQD,
          lineTotalIQD: purchase.totalIQD,
          idType: purchase.idType,
          itemIds: finalItemIds,
        }];
        directPrintPurchaseInvoice(
          purchase,
          purchaseItems,
          {
            name: business.name || 'My Store',
            phone: business.phone || '',
            address: business.address || '',
            logoUri: business.logoUri ?? null,
          },
          receiptCurrency
        ).catch((printErr) => {
          console.error('[Purchase] Print error:', printErr);
        });
        resetForm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (checkoutMode === 'normal') {
        resetForm();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        router.replace(`/(app)/purchases/${purchase.id}?new=1&currency=${receiptCurrency}` as never);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('ID_BELONGS_TO_ANOTHER_PRODUCT|')) {
        const parts = msg.split('|');
        const ownerName = parts[1] || '';
        const idVal = parts[2] || '';
        Alert.alert(
          isKuLanguage ? 'ئەم ئایدیە تایبەتە بە بەرهەمێکی تر' : 'Dedicated ID',
          isKuLanguage
            ? `ئەم ئایدیە (${idVal}) تایبەتە بە بەرهەمی «${ownerName}» و ناتوانرێت بۆ بەرهەمێکی تری جیاواز بەکاربێت.`
            : `This ID (${idVal}) is dedicated to "${ownerName}" and cannot be used for another product.`
        );
      } else if (msg.startsWith('DUPLICATE_ITEM_ID|')) {
        const ids = msg.split('|')[1];
        Alert.alert(t('inventory.duplicateItemIdTitle'), t('inventory.duplicateItemIdBody', { id: ids }));
      } else if (msg.startsWith('DUPLICATE_PHONE:')) {
        const existingName = msg.split(':')[1];
        Alert.alert(
          t('common.error'),
          t('suppliers.duplicatePhone') + (existingName ? `\n(${existingName})` : '') + '\n\n' + t('suppliers.useExisting')
        );
      } else if (msg === 'DUPLICATE_NAME') {
        Alert.alert(t('common.error'), t('suppliers.duplicateName') + '\n\n' + t('suppliers.useExisting'));
      } else if (msg.startsWith('ITEM_LIMIT_REACHED|')) {
        const [used, limit] = msg.split('|')[1].split(',');
        Alert.alert(
          t('inventory.itemLimitReachedTitle'),
          t('inventory.itemLimitReachedBody', { used, limit }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('settings.upgradeScreen.title'), onPress: () => router.push('/(app)/settings/plan-limits' as never) },
          ]
        );
      } else {
        console.error('Failed to save purchase:', err);
        Alert.alert(t('common.error'), t('common.tryAgain'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Render Components ──────────────────────────────────────────────────────

  // 1. Product Info Card
  const cardProductInfo = (
    <PremiumCard style={[styles.card, isTablet && styles.cardTablet]}>
      <View style={[styles.cardHeaderRow, { flexDirection }]}>
        <View style={[styles.cardHeaderIconBox, { backgroundColor: colors.softBlue }]}>
          <Ionicons name="cube-outline" size={isTablet ? 22 : 18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardHeaderTitle,
              isTablet && { fontSize: 17 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black, textAlign },
            ]}
          >
            {isKuLanguage ? 'زانیاری بەرهەم' : t('purchases.productInfo', 'Product Information')}
          </Text>
          <Text
            style={[
              styles.cardHeaderSub,
              isTablet && { fontSize: 13 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
              { color: colors.gray400, textAlign },
            ]}
          >
            {isKuLanguage ? 'ناو، وەسف، وێنە و پۆلێنی کاڵا' : 'Name, details, image and category'}
          </Text>
        </View>
      </View>

      <AppTextInput
        label={t('purchases.productName')}
        value={productName}
        onChangeText={handleProductNameChange}
        onEndEditing={() => {
          if (!boundProductIdentity) {
            const match = findByName(productName);
            if (match) {
              handleSelectSavedItem(match);
            }
          }
        }}
        placeholder={t('purchases.productNameNewPlaceholder')}
        returnKeyType="next"
      />

      {/* ID Detached Notice Banner if product name changed */}
      {Boolean(idClearedNotice) && (
        <View
          style={[
            styles.idNoticeBanner,
            {
              backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7',
              borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="information-circle" size={17} color="#D97706" />
          <Text
            style={[
              styles.idNoticeText,
              { color: isDark ? '#FBBF24' : '#B45309', textAlign },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {idClearedNotice}
          </Text>
        </View>
      )}

      {/* Quick Auto-Fill Suggestion Chips when typing product name */}
      {matchingPresets.length > 0 && (!boundProductIdentity || boundProductIdentity.name.trim().toLowerCase() !== productName.trim().toLowerCase()) && (
        <View style={styles.presetsSuggestionWrap}>
          <View style={[styles.presetsHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={[styles.presetsHeaderText, { color: colors.primary }]}>
              {isKuLanguage
                ? 'بەرهەمە پاشەکەوتکراوەکان (داگرە بۆ پڕکردنەوەی خۆکارانەی نرخ و زانیاری):'
                : 'Saved items (tap to auto-fill details & prices):'}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.presetsScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            {matchingPresets.map((preset) => (
              <TouchableOpacity
                key={preset.id}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                    borderColor: isDark ? colors.gray200 : colors.primary + '50',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => handleSelectSavedItem(preset)}
                activeOpacity={0.8}
              >
                {preset.imageUri ? (
                  <Image
                    source={{ uri: resolveImageUri(preset.imageUri) || preset.imageUri }}
                    style={styles.presetChipImage}
                  />
                ) : (
                  <View style={[styles.presetChipImage, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="cube-outline" size={16} color={colors.primary} />
                  </View>
                )}
                <View style={{ gap: 2 }}>
                  <Text
                    style={[
                      styles.presetChipName,
                      { color: colors.black },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {preset.name}
                  </Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 4, alignItems: 'center' }}>
                    {Boolean(preset.itemId) && (
                      <Text style={[styles.presetChipDesc, { color: colors.primary }]} numberOfLines={1}>
                        #{preset.itemId}
                      </Text>
                    )}
                    {Boolean(preset.buyPriceIQD && preset.buyPriceIQD > 0) && (
                      <Text style={[styles.presetChipDesc, { color: colors.gray400 }]} numberOfLines={1}>
                        · {preset.buyPriceIQD?.toLocaleString()} د.ع
                      </Text>
                    )}
                  </View>
                </View>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.primary}
                  style={{ marginStart: 4 }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <AppTextInput
        value={itemDescription}
        onChangeText={setItemDescription}
        placeholder={t('purchases.itemDescriptionPlaceholder')}
        maxLength={30}
        returnKeyType="next"
      />

      <CategoryAutocompleteInput
        label={t('purchases.category')}
        value={category}
        onChange={setCategory}
        categories={availableCategories}
        placeholder={t('purchases.categoryPlaceholder')}
        inputStyle={isRTL ? { fontSize: 13, fontFamily: SETTINGS_KURDISH_FONT } : undefined}
      />

      {/* Product Image */}
      <ProductImagePicker
        uri={imageUri}
        onSelect={setImageUri}
        onRemove={() => setImageUri(null)}
        label={t('purchases.productImage')}
        onSelectSavedItem={handleSelectSavedItem}
      />

      <AppTextInput
        label={t('purchases.notes')}
        value={notes}
        onChangeText={setNotes}
        placeholder={t('purchases.notesPlaceholder')}
        multiline
        numberOfLines={3}
        style={[styles.textarea, isRTL && { fontSize: 13 }]}
      />

      <View style={{ flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign, marginBottom: 0 }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
          {t('purchases.websiteDescription')}
        </Text>
        <TouchableOpacity
          style={{
            flexDirection,
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            borderWidth: 1,
            backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : '#FEF3C7',
            borderColor: isDark ? '#D97706' : '#FDE68A',
          }}
          onPress={() => {
            if (itemDescription?.trim()) {
              setWebsiteDescription(itemDescription.trim());
            } else if (notes?.trim()) {
              setWebsiteDescription(notes.trim().slice(0, 30));
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="copy-outline" size={13} color={isDark ? '#FBBF24' : '#B45309'} />
          <Text style={[{ fontSize: 11, fontWeight: '700', color: isDark ? '#FBBF24' : '#B45309' }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
            {t('purchases.sameAsItemDescription')}
          </Text>
        </TouchableOpacity>
      </View>

      <AppTextInput
        value={websiteDescription}
        onChangeText={setWebsiteDescription}
        placeholder={t('purchases.websiteDescriptionPlaceholder')}
        maxLength={30}
        returnKeyType="next"
        style={isRTL ? { fontSize: 13 } : undefined}
      />
      <Text style={[styles.hintText, { color: colors.gray400, textAlign }]}>
        {t('purchases.websiteDescriptionHint')}
      </Text>
    </PremiumCard>
  );

  // 2. Quantity & IDs Card
  const cardQuantityAndIds = (
    <PremiumCard style={[styles.card, isTablet && styles.cardTablet]}>
      <View style={[styles.cardHeaderRow, { flexDirection }]}>
        <View style={[styles.cardHeaderIconBox, { backgroundColor: isRepurchasingExisting ? (isDark ? 'rgba(212, 175, 55, 0.2)' : '#FEF3C7') : colors.softBlue }]}>
          <Ionicons name={isRepurchasingExisting ? "cube-outline" : "barcode-outline"} size={isTablet ? 22 : 18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardHeaderTitle,
              isTablet && { fontSize: 17 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black, textAlign },
            ]}
          >
            {isKuLanguage ? 'بڕ و ناسێنەری کاڵا' : 'Quantity & Item IDs'}
          </Text>
          <Text
            style={[
              styles.cardHeaderSub,
              isTablet && { fontSize: 13 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
              { color: colors.gray400, textAlign },
            ]}
          >
            {isRepurchasingExisting
              ? (isKuLanguage ? 'دیاریکردنی عەدەد بۆ کۆگاکردنەوەی کاڵای کۆن' : 'Set quantity to restock existing product')
              : (isKuLanguage ? 'ژمارەی دانە، کۆدی بارکۆد یان ئایدی' : 'Units count, barcode scanner, or unique IDs')}
          </Text>
        </View>
      </View>

      <QuantityStepper
        label={t('purchases.qty')}
        value={qty}
        onChangeText={onQtyChange}
        min={1}
        max={100}
        placeholder={t('purchases.qtyPlaceholder')}
      />

      {isRepurchasingExisting ? (
        /* ── Locked Existing Product Card for Repurchasing / Restock ── */
        <View
          style={[
            styles.existingProductBanner,
            {
              backgroundColor: isDark ? 'rgba(212, 175, 55, 0.08)' : '#FFFBEB',
              borderColor: isDark ? 'rgba(212, 175, 55, 0.28)' : '#FDE68A',
            },
          ]}
        >
          {/* Header Row: Lock Icon + Title + Status Badge */}
          <View style={[styles.existingProductHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.existingProductLockIcon, { backgroundColor: hexToRgba(colors.primary, 0.18) }]}>
              <Ionicons name="lock-closed" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={[styles.existingProductTitleLine, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text
                  style={[
                    styles.existingProductTitle,
                    { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'ئایدی کاڵای کۆن (نەگۆڕە)' : 'Existing Product ID (Locked)'}
                </Text>
                <View
                  style={[
                    styles.restockBadge,
                    {
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5',
                      borderColor: isDark ? 'rgba(16, 185, 129, 0.40)' : '#A7F3D0',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.restockBadgeText,
                      { color: '#10B981' },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKuLanguage ? 'دووبارە کڕینەوە' : 'Restock'}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.existingProductSub,
                  { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKuLanguage
                  ? 'ئەم کاڵایە لە کۆگادا تۆمارە؛ تەنها عەدەد زیاد دەکرێت بە هەمان ئایدی و بارکۆدی کۆن.'
                  : 'Product exists in inventory. Only quantity will be added using the same ID.'}
              </Text>
            </View>
          </View>

          {/* Details Row: Barcode & Current Stock */}
          <View style={[styles.existingProductDetailsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.existingIdDisplayBox,
                {
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isDark ? colors.gray200 : colors.gray200,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="barcode-outline" size={17} color={colors.primary} />
              <Text
                style={[
                  styles.existingIdDisplayLabel,
                  { color: colors.gray500 },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKuLanguage ? 'ئایدی / بارکۆد:' : 'ID / Barcode:'}
              </Text>
              <Text
                style={[
                  styles.existingIdDisplayValue,
                  { color: colors.black },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {existingProductLockedId || (isKuLanguage ? 'دیاریکراو' : 'Assigned')}
              </Text>
            </View>

            {existingInventoryProduct.quantity !== undefined && (
              <View
                style={[
                  styles.existingStockDisplayBox,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.30)' : '#A7F3D0',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="cube-outline" size={15} color="#10B981" />
                <Text
                  style={[
                    styles.existingStockDisplayText,
                    { color: isDark ? '#34D399' : '#047857' },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage
                    ? `مەوجودی ئێستا: ${existingInventoryProduct.quantity} دانە`
                    : `Stock: ${existingInventoryProduct.quantity} pcs`}
                </Text>
              </View>
            )}
          </View>

          {/* Stock Projection Info (Current + New) */}
          <View style={[styles.stockProjectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="trending-up-outline" size={14} color={colors.primary} />
            <Text
              style={[
                styles.stockProjectionText,
                { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
            >
              {isKuLanguage
                ? `دوای کڕینی ئەم ${qtyNum} دانەیە، کۆی گشتی کۆگا دەبێتە ${(existingInventoryProduct.quantity || 0) + qtyNum} دانە.`
                : `After purchasing ${qtyNum} units, total inventory will be ${(existingInventoryProduct.quantity || 0) + qtyNum} pcs.`}
            </Text>
          </View>
        </View>
      ) : (
        <>

      {/* ID Type */}
      <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign: isRTL ? 'right' : 'left' }]}>{t('purchases.idType')}</Text>
      <View style={[styles.idTypeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.idTypeBtn,
            isTablet && { height: 50, borderRadius: 14 },
            idType === 'shared'
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { borderColor: colors.gray200, backgroundColor: colors.white }
          ]}
          onPress={() => selectIdType('shared')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.idTypeBtnText,
            isTablet && { fontSize: 15.5 },
            isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            { color: idType === 'shared' ? colors.white : colors.gray500 }
          ]}>
            {t('purchases.sharedId')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.idTypeBtn,
            isTablet && { height: 50, borderRadius: 14 },
            idType === 'custom'
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { borderColor: colors.gray200, backgroundColor: colors.white }
          ]}
          onPress={() => selectIdType('custom')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.idTypeBtnText,
            isTablet && { fontSize: 15.5 },
            isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            { color: idType === 'custom' ? colors.white : colors.gray500 }
          ]}>
            {t('purchases.customIds')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Prominent Barcode / QR Scanner Button Banner */}
      <TouchableOpacity
        style={[
          styles.scanBarcodeBanner,
          {
            borderColor: colors.primary,
            backgroundColor: colors.primary + '12',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={() => handleOpenScanner()}
        activeOpacity={0.8}
      >
        <View style={[styles.scanIconBadge, { backgroundColor: colors.primary }]}>
          <Ionicons name="barcode-outline" size={24} color="#FFFFFF" />
        </View>
        <View style={[styles.scanBannerTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text
            style={[
              styles.scanBannerTitle,
              {
                color: colors.primary,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
                alignSelf: 'stretch',
              },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {isKuLanguage ? 'سکانی بارکۆد یان QR' : 'Scan Barcode or QR'}
          </Text>
          <Text
            style={[
              styles.scanBannerSub,
              {
                color: colors.gray500,
                textAlign: isRTL ? 'right' : 'left',
                writingDirection: isRTL ? 'rtl' : 'ltr',
                alignSelf: 'stretch',
              },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {isKuLanguage
              ? 'کامێرای مۆبایل بکەرەوە بۆ تۆمارکردنی خێرای ئایدی'
              : 'Open camera to auto-fill product ID instantly'}
          </Text>
        </View>
        <View
          style={[
            styles.scanActionPill,
            {
              backgroundColor: colors.primary,
              flexDirection: isRTL ? 'row-reverse' : 'row',
              gap: 4,
            },
          ]}
        >
          <Ionicons name="camera" size={16} color="#FFFFFF" />
          <Text
            style={[
              styles.scanActionPillText,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {isKuLanguage ? 'سکان' : 'Scan'}
          </Text>
        </View>
      </TouchableOpacity>

      {idType === 'shared' && (
        <View
          style={[
            styles.customIdCardBox,
            {
              backgroundColor: isDark ? colors.gray100 : '#F8FAFC',
              borderColor: isDark ? colors.gray200 : colors.gray200,
            },
          ]}
        >
          <View
            style={[
              styles.customIdCardHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.customIdCardTitleGroup,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={[styles.customIdBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="layers" size={14} color={colors.white} />
              </View>
              <Text
                style={[
                  styles.customIdCardTitle,
                  { color: colors.black },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {t('purchases.sharedIdLabel')}
              </Text>
            </View>

            <View
              style={[
                styles.customIdActionsGroup,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <TouchableOpacity
                onPress={() => handleOpenScanner()}
                style={[
                  styles.itemActionBtn,
                  { borderColor: colors.primary, backgroundColor: colors.softBlue },
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="barcode-outline" size={14} color={colors.primary} />
                <Text
                  style={[
                    styles.itemActionBtnText,
                    { color: colors.primary },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'سکان' : 'Scan'}
                </Text>
              </TouchableOpacity>

              <GenerateIdButton
                loading={isGeneratingShared}
                onPress={handleGenerateSharedId}
              />
            </View>
          </View>

          <View
            style={[
              styles.customIdInputWrapNew,
              {
                borderColor: colors.gray200,
                backgroundColor: colors.white,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={[styles.customIdInputIconBox, { backgroundColor: colors.softBlue }]}>
              <Ionicons name="barcode-outline" size={17} color={colors.primary} />
            </View>
            <View style={styles.customIdInputInner}>
              <TextInput
                style={[
                  styles.customIdInputNew,
                  {
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    writingDirection: isRTL ? 'rtl' : 'ltr',
                    fontFamily: (sharedId && resolveInputIsKurdish({ isKuLanguage, value: sharedId }))
                      ? SETTINGS_KURDISH_FONT_BOLD
                      : resolveInterFont('600'),
                  },
                ]}
                value={sharedId}
                onChangeText={(val) => setSharedId(toEnglishDigits(val))}
                returnKeyType="done"
                onFocus={scrollIntoView}
              />
              {!sharedId && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.customIdPlaceholderOverlay,
                    {
                      alignItems: isRTL ? 'flex-end' : 'flex-start',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.customIdPlaceholderText,
                      {
                        color: colors.gray400,
                        textAlign: isRTL ? 'right' : 'left',
                        writingDirection: isRTL ? 'rtl' : 'ltr',
                      },
                    ]}
                  >
                    {isKuLanguage ? 'کۆد یان بارکۆدی هاوبەش بنووسە یان سکان بکە' : 'e.g. SN-12345 or scan barcode'}
                  </Text>
                </View>
              )}
            </View>
            {Boolean(sharedId) && (
              <TouchableOpacity
                onPress={() => setSharedId('')}
                style={styles.customIdClearIcon}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.gray400} />
              </TouchableOpacity>
            )}
          </View>

          {/* Bound Product Indicator */}
          {Boolean(boundProductIdentity && boundProductIdentity.itemId && sharedId === boundProductIdentity.itemId) && (
            <View
              style={[
                styles.idBoundBanner,
                {
                  backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
                  borderColor: isDark ? 'rgba(16,185,129,0.3)' : '#A7F3D0',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={15} color="#10B981" />
              <Text
                style={[
                  styles.idBoundText,
                  { color: isDark ? '#34D399' : '#047857', textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKuLanguage
                  ? `ئەم ئایدیە گرێدراوە و تایبەتە بە «${boundProductIdentity?.name ?? ''}»`
                  : `This ID is dedicated and bound to "${boundProductIdentity?.name ?? ''}"`}
              </Text>
            </View>
          )}
        </View>
      )}

      {idType === 'custom' && (
        <View style={styles.customIdsContainer}>
          <View style={[styles.customIdsHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
              <Ionicons name="barcode" size={17} color={colors.primary} />
              <Text
                numberOfLines={1}
                style={[
                  styles.customIdsHeaderTitle,
                  { color: colors.primary },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKuLanguage ? `ئایدیی تایبەت بۆ هەر ئایتەمێک (${qtyNum} دانە)` : `Custom Item IDs (${qtyNum})`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                const next = qtyNum + 1;
                setQty(String(next));
                setCustomIds((prev) => [...prev, '']);
              }}
              style={[
                styles.addSlotBtn,
                { borderColor: colors.primary, backgroundColor: colors.softBlue },
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text
                style={[
                  styles.addSlotBtnText,
                  { color: colors.primary },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKuLanguage ? 'زیادکردنی ئایتم' : 'Add Item'}
              </Text>
            </TouchableOpacity>
          </View>

          {Array.from({ length: qtyNum }, (_, i) => (
            <View
              key={i}
              style={[
                styles.customIdCardBox,
                {
                  backgroundColor: isDark ? colors.gray100 : '#F8FAFC',
                  borderColor: isDark ? colors.gray200 : colors.gray200,
                },
              ]}
            >
              {/* Card Header Row: Item Badge on Right (in RTL), Action Buttons on Left */}
              <View
                style={[
                  styles.customIdCardHeader,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View
                  style={[
                    styles.customIdCardTitleGroup,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.customIdBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.customIdBadgeText, { color: colors.white }]}>{i + 1}</Text>
                  </View>
                  <Text
                    style={[
                      styles.customIdCardTitle,
                      { color: colors.black },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKuLanguage ? `ئایتەمی #${i + 1}` : `Item #${i + 1}`}
                  </Text>
                </View>

                {/* Actions group: Scan, Generate, Delete */}
                <View
                  style={[
                    styles.customIdActionsGroup,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleOpenScanner(i)}
                    style={[
                      styles.itemActionBtn,
                      { borderColor: colors.primary, backgroundColor: colors.softBlue },
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="barcode-outline" size={14} color={colors.primary} />
                    <Text
                      style={[
                        styles.itemActionBtnText,
                        { color: colors.primary },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isKuLanguage ? 'سکان' : 'Scan'}
                    </Text>
                  </TouchableOpacity>

                  <GenerateIdButton
                    loading={generatingCustomIdxs.has(i)}
                    onPress={() => handleGenerateCustomId(i)}
                  />

                  {qtyNum > 1 && (
                    <TouchableOpacity
                      onPress={() => removeCustomIdSlot(i)}
                      style={[
                        styles.customIdDeleteBtn,
                        {
                          backgroundColor: isDark ? hexToRgba(colors.error, 0.15) : '#FEE2E2',
                          borderColor: isDark ? hexToRgba(colors.error, 0.35) : '#FECACA',
                        },
                      ]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Full-width Spacious Input Row */}
              <View
                style={[
                  styles.customIdInputWrapNew,
                  {
                    borderColor: colors.gray200,
                    backgroundColor: colors.white,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View style={[styles.customIdInputIconBox, { backgroundColor: colors.softBlue }]}>
                  <Ionicons name="qr-code-outline" size={17} color={colors.primary} />
                </View>
                <View style={styles.customIdInputInner}>
                  <TextInput
                    style={[
                      styles.customIdInputNew,
                      {
                        color: colors.black,
                        textAlign: isRTL ? 'right' : 'left',
                        writingDirection: isRTL ? 'rtl' : 'ltr',
                        fontFamily: (customIds[i] && resolveInputIsKurdish({ isKuLanguage, value: customIds[i] }))
                          ? SETTINGS_KURDISH_FONT_BOLD
                          : resolveInterFont('600'),
                      },
                    ]}
                    value={customIds[i] ?? ''}
                    onChangeText={(val) => updateCustomId(i, toEnglishDigits(val))}
                    returnKeyType={i < qtyNum - 1 ? 'next' : 'done'}
                    onFocus={scrollIntoView}
                  />
                  {!customIds[i] && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.customIdPlaceholderOverlay,
                        {
                          alignItems: isRTL ? 'flex-end' : 'flex-start',
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.customIdPlaceholderText,
                          {
                            color: colors.gray400,
                            textAlign: isRTL ? 'right' : 'left',
                            writingDirection: isRTL ? 'rtl' : 'ltr',
                          },
                        ]}
                      >
                        {isKuLanguage ? `کۆد یان بارکۆدی ئایتەمی ${i + 1}` : `Barcode / ID for item ${i + 1}`}
                      </Text>
                    </View>
                  )}
                </View>
                {Boolean(customIds[i]) && (
                  <TouchableOpacity
                    onPress={() => updateCustomId(i, '')}
                    style={styles.customIdClearIcon}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.gray400} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
        </>
      )}
    </PremiumCard>
  );

  // 2b. Expiry & Production Dates Card (shown when expiryTrackingEnabled is active)
  const cardExpiryDates = (() => {
    if (!expiryTrackingEnabled) return null;
    const prodAgeText = productionDate ? formatProductionAge(productionDate, isKuLanguage) : null;
    const expiryCountdown = expiryDate ? formatExpiryCountdown(expiryDate, isKuLanguage) : null;

    return (
    <PremiumCard
      padding={isTablet ? 24 : 13}
      style={[
        styles.card,
        {
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          backgroundColor: isDark ? '#1E293B' : colors.white,
          borderRadius: isTablet ? 22 : 16,
        },
        isTablet && styles.cardTablet,
      ]}
    >
      <View style={[styles.cardHeaderRow, { flexDirection, marginBottom: isTablet ? 14 : 10, gap: isTablet ? 12 : 10 }]}>
        <View
          style={[
            styles.cardHeaderIconBox,
            {
              width: isTablet ? 42 : 34,
              height: isTablet ? 42 : 34,
              borderRadius: isTablet ? 13 : 10,
              backgroundColor: hexToRgba('#F59E0B', isDark ? 0.22 : 0.12),
            },
          ]}
        >
          <Ionicons name="time-outline" size={isTablet ? 22 : 17} color="#F59E0B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardHeaderTitle,
              { fontSize: isTablet ? 17 : 14.5, color: colors.black, textAlign },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {isKuLanguage ? 'بەرواری بەسەرچوون و دەرچوون' : 'Production & Expiry Dates'}
          </Text>
          <Text
            style={[
              styles.cardHeaderSub,
              { fontSize: isTablet ? 13 : 11, color: colors.gray400, textAlign, marginTop: 1 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {isKuLanguage
              ? 'دیاریکردنی بەرواری دروستکردن و بەسەرچوون بۆ چاودێری سەلامەتی'
              : 'Record manufacturing and expiration dates for quality & stock alerts'}
          </Text>
        </View>
      </View>

      {/* Production Date Section */}
      <View style={{ gap: isTablet ? 7 : 5, marginTop: 2 }}>
        <Text style={[styles.fieldLabel, { fontSize: isTablet ? 13.5 : 12, color: colors.gray600, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
          {isKuLanguage ? 'بەرواری دەرچوون / دروستکردن (Production Date)' : 'Production Date'}
        </Text>
        <View style={[styles.expiryDateActionRow, { flexDirection, gap: isTablet ? 8 : 6 }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowProdPicker(true)}
            style={[
              styles.datePickerBtn,
              {
                height: isTablet ? 46 : 38,
                borderRadius: isTablet ? 12 : 9,
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : colors.gray50,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : colors.gray200,
                flexDirection,
                paddingHorizontal: isTablet ? 14 : 10,
                gap: isTablet ? 10 : 8,
              },
            ]}
          >
            <Ionicons name="construct-outline" size={isTablet ? 18 : 16} color={colors.primary} />
            <Text style={[styles.datePickerBtnText, { fontSize: isTablet ? 14.5 : 13, color: productionDate ? colors.black : colors.gray400 }]}>
              {productionDate ? toDateOnly(productionDate) : (isKuLanguage ? 'دیاری نەکراوە' : 'Not set')}
            </Text>
          </TouchableOpacity>

          <View style={[styles.quickChipsWrap, { flexDirection, gap: isTablet ? 8 : 5 }]}>
            <TouchableOpacity
              onPress={() => handleSetProductionQuick('today')}
              style={[
                styles.smallChip,
                {
                  height: isTablet ? 46 : 38,
                  paddingVertical: 0,
                  paddingHorizontal: isTablet ? 14 : 10,
                  borderRadius: isTablet ? 12 : 9,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.gray100,
                },
              ]}
            >
              <Text style={[styles.smallChipText, { fontSize: isTablet ? 13.5 : 12, color: colors.black }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {isKuLanguage ? 'ئەمڕۆ' : 'Today'}
              </Text>
            </TouchableOpacity>

            {productionDate && (
              <TouchableOpacity
                onPress={() => handleSetProductionQuick('clear')}
                style={[
                  styles.smallChip,
                  {
                    height: isTablet ? 46 : 38,
                    width: isTablet ? 46 : 38,
                    paddingHorizontal: 0,
                    paddingVertical: 0,
                    borderRadius: isTablet ? 12 : 9,
                    backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                  },
                ]}
              >
                <Ionicons name="close" size={isTablet ? 18 : 15} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {productionDate && prodAgeText && (
          <View style={[styles.dateCountdownSubRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="construct-outline" size={12} color={colors.primary} />
            <Text style={[styles.dateCountdownSubText, { color: colors.gray500, writingDirection: isKuLanguage ? 'rtl' : 'ltr' }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
              {prodAgeText}
            </Text>
          </View>
        )}
      </View>

      {/* Expiry Date Section */}
      <View style={{ gap: isTablet ? 7 : 5, marginTop: isTablet ? 12 : 8 }}>
        <Text style={[styles.fieldLabel, { fontSize: isTablet ? 13.5 : 12, color: colors.gray600, textAlign }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
          {isKuLanguage ? 'بەرواری بەسەرچوون (Expiry Date)' : 'Expiry Date'}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowExpPicker(true)}
          style={[
            styles.datePickerBtn,
            {
              height: isTablet ? 46 : 38,
              borderRadius: isTablet ? 12 : 9,
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : colors.gray50,
              borderColor: expiryDate
                ? expiryCountdown?.status === 'expired'
                  ? colors.error
                  : expiryCountdown?.status === 'warning'
                  ? '#F59E0B'
                  : colors.primary
                : isDark
                ? 'rgba(255, 255, 255, 0.10)'
                : colors.gray200,
              flexDirection,
              paddingHorizontal: isTablet ? 14 : 10,
              gap: isTablet ? 10 : 8,
            },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={isTablet ? 18 : 16}
            color={
              expiryDate
                ? expiryCountdown?.status === 'expired'
                  ? colors.error
                  : expiryCountdown?.status === 'warning'
                  ? '#F59E0B'
                  : colors.primary
                : colors.primary
            }
          />
          <Text
            style={[
              styles.datePickerBtnText,
              { fontSize: isTablet ? 14.5 : 13, color: expiryDate ? (isDark ? '#FBBF24' : '#D97706') : colors.gray400 },
              expiryDate && { fontWeight: '700' },
            ]}
          >
            {expiryDate ? toDateOnly(expiryDate) : (isKuLanguage ? 'دیاری نەکراوە' : 'Not set')}
          </Text>

          {/* Inline Badge right next to the date */}
          {expiryCountdown && (
            <View
              style={[
                styles.inlineCountdownBadge,
                {
                  paddingHorizontal: isTablet ? 10 : 7,
                  paddingVertical: isTablet ? 4 : 2,
                  borderRadius: isTablet ? 8 : 6,
                  backgroundColor:
                    expiryCountdown.status === 'expired'
                      ? (isDark ? hexToRgba(colors.error, 0.18) : '#FEE2E2')
                      : expiryCountdown.status === 'warning'
                      ? (isDark ? hexToRgba('#F59E0B', 0.18) : '#FEF3C7')
                      : (isDark ? hexToRgba(colors.success, 0.18) : '#DCFCE7'),
                  borderColor:
                    expiryCountdown.status === 'expired'
                      ? colors.error
                      : expiryCountdown.status === 'warning'
                      ? '#F59E0B'
                      : colors.success,
                },
              ]}
            >
              <Text
                style={[
                  styles.inlineCountdownBadgeText,
                  {
                    fontSize: isTablet ? 12 : 11,
                    color:
                      expiryCountdown.status === 'expired'
                        ? colors.error
                        : expiryCountdown.status === 'warning'
                        ? (isDark ? '#FBBF24' : '#B45309')
                        : colors.success,
                    writingDirection: isKuLanguage ? 'rtl' : 'ltr',
                  },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {expiryCountdown.badgeText}
              </Text>
            </View>
          )}

          {expiryDate && (
            <TouchableOpacity
              onPress={handleClearExpiry}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginStart: 'auto' }}
            >
              <Ionicons name="close-circle" size={isTablet ? 18 : 16} color="#EF4444" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Clear, prominent helper banner right below the button */}
        {expiryCountdown && (
          <View
            style={[
              styles.expiryNoticeBanner,
              isTablet && { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, gap: 8 },
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                backgroundColor:
                  expiryCountdown.status === 'expired'
                    ? (isDark ? hexToRgba(colors.error, 0.15) : '#FEF2F2')
                    : expiryCountdown.status === 'warning'
                    ? (isDark ? hexToRgba('#F59E0B', 0.15) : '#FFFBEB')
                    : (isDark ? hexToRgba(colors.success, 0.15) : '#F0FDF4'),
                borderColor:
                  expiryCountdown.status === 'expired'
                    ? (isDark ? hexToRgba(colors.error, 0.35) : '#FECACA')
                    : expiryCountdown.status === 'warning'
                    ? (isDark ? hexToRgba('#F59E0B', 0.35) : '#FDE68A')
                    : (isDark ? hexToRgba(colors.success, 0.35) : '#BBF7D0'),
              },
            ]}
          >
            <Ionicons
              name={
                expiryCountdown.status === 'expired'
                  ? 'alert-circle'
                  : expiryCountdown.status === 'warning'
                  ? 'hourglass-outline'
                  : 'shield-checkmark-outline'
              }
              size={isTablet ? 16 : 14}
              color={
                expiryCountdown.status === 'expired'
                  ? colors.error
                  : expiryCountdown.status === 'warning'
                  ? '#F59E0B'
                  : colors.success
              }
            />
            <Text
              style={[
                styles.expiryNoticeText,
                {
                  fontSize: isTablet ? 12.5 : 11.5,
                  color:
                    expiryCountdown.status === 'expired'
                      ? colors.error
                      : expiryCountdown.status === 'warning'
                      ? (isDark ? '#FBBF24' : '#B45309')
                      : (isDark ? '#34D399' : '#059669'),
                  textAlign,
                  writingDirection: isKuLanguage ? 'rtl' : 'ltr',
                },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {expiryCountdown.text}
            </Text>
          </View>
        )}

        {/* Quick Expiry Duration Shortcut Chips */}
        <Text style={[styles.shortcutHint, { fontSize: isTablet ? 12 : 11, color: colors.gray400, textAlign, marginTop: isTablet ? 5 : 3 }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
          {isKuLanguage ? 'هەڵبژاردنی خێرا لە ئەمڕۆوە:' : 'Quick shortcuts from today:'}
        </Text>

        <View style={[styles.durationChipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'nowrap', gap: isTablet ? 6 : 5, marginTop: 1 }]}>
          {[
            { label: isKuLanguage ? '+١ مانگ' : '+1M', months: 1 },
            { label: isKuLanguage ? '+٣ مانگ' : '+3M', months: 3 },
            { label: isKuLanguage ? '+٦ مانگ' : '+6M', months: 6 },
            { label: isKuLanguage ? '+١ ساڵ' : '+1Y', months: 12 },
            { label: isKuLanguage ? '+٢ ساڵ' : '+2Y', months: 24 },
          ].map((chip) => (
            <TouchableOpacity
              key={chip.months}
              activeOpacity={0.78}
              onPress={() => handleAddExpiryMonths(chip.months)}
              style={[
                styles.durationChip,
                {
                  flex: 1,
                  paddingHorizontal: isTablet ? 4 : 2,
                  paddingVertical: isTablet ? 9 : 6,
                  borderRadius: isTablet ? 10 : 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.28)' : '#FDE68A',
                },
              ]}
            >
              <Text
                style={[
                  styles.durationChipText,
                  { fontSize: isTablet ? 12 : 11, color: isDark ? '#FBBF24' : '#B45309', textAlign: 'center' },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Production Date Picker Modal */}
      <DatePickerModal
        visible={showProdPicker}
        onClose={() => setShowProdPicker(false)}
        currentDate={productionDate}
        onSelect={(d) => setProductionDate(d)}
        onClear={() => setProductionDate(null)}
        mode="production"
        title={isKuLanguage ? 'دیاریکردنی بەرواری دەرچوون' : 'Select Production Date'}
      />

      {/* Expiry Date Picker Modal */}
      <DatePickerModal
        visible={showExpPicker}
        onClose={() => setShowExpPicker(false)}
        currentDate={expiryDate}
        onSelect={(d) => setExpiryDate(d)}
        onClear={() => setExpiryDate(null)}
        mode="expiry"
        title={isKuLanguage ? 'دیاریکردنی بەرواری بەسەرچوون' : 'Select Expiry Date'}
      />
    </PremiumCard>
  );
})();

  // 3. Supplier Card
  const cardSupplier = (
    <PremiumCard style={[styles.card, isTablet && styles.cardTablet]}>
      <View style={[styles.cardHeaderRow, { flexDirection }]}>
        <View style={[styles.cardHeaderIconBox, { backgroundColor: colors.softBlue }]}>
          <Ionicons name="business-outline" size={isTablet ? 22 : 18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardHeaderTitle,
              isTablet && { fontSize: 17 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black, textAlign },
            ]}
          >
            {isKuLanguage ? 'زانیاری دابینکەر و بەروار' : 'Supplier & Date'}
          </Text>
          <Text
            style={[
              styles.cardHeaderSub,
              isTablet && { fontSize: 13 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
              { color: colors.gray400, textAlign },
            ]}
          >
            {isKuLanguage ? 'دیاریکردنی فرۆشیار و کاتی تۆمارکردن' : 'Supplier details and intake timestamp'}
          </Text>
        </View>
      </View>

      {isDirectSupplier ? (
        <MotiView
          from={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 180 }}
          style={[
            styles.directSupplierActiveCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFBEB',
              borderColor: '#D97706',
            },
          ]}
        >
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.directSupplierIconWrap, { backgroundColor: '#D97706' }]}>
                <Ionicons name="flash" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text
                  style={[
                    styles.directSupplierActiveTitle,
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    { color: isDark ? '#FBBF24' : '#92400E', textAlign },
                  ]}
                >
                  {isKuLanguage ? 'دابینکەری ڕاستەوخۆ (سیستەم)' : 'Direct Supplier (System)'}
                </Text>
                <Text
                  style={[
                    styles.directSupplierActiveBadge,
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                    { color: isDark ? '#FDE68A' : '#B45309', textAlign },
                  ]}
                >
                  {isKuLanguage ? 'ئەکاونتی هەمیشەیی پارێزراو' : 'Protected Permanent Account'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSupplierName('');
                setSupplierPhone('');
                setSupplierAddress('');
                setSelectedSupplierId(undefined);
              }}
              style={[
                styles.directSupplierChangeBtn,
                {
                  backgroundColor: isDark ? '#334155' : '#FDE68A',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              activeOpacity={0.75}
            >
              <Ionicons name="refresh-outline" size={14} color={isDark ? '#F1F5F9' : '#78350F'} />
              <Text
                style={[
                  styles.directSupplierChangeBtnText,
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  { color: isDark ? '#F1F5F9' : '#78350F' },
                ]}
              >
                {isKuLanguage ? 'گۆڕین' : 'Change'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.directSupplierActiveDesc,
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
              { color: isDark ? '#CBD5E1' : '#78350F', textAlign },
            ]}
          >
            {isKuLanguage
              ? 'ئەم کڕینە راستەوخۆ لەسەر ئەکاونتی هەمیشەیی دابینکەری ڕاستەوخۆ پاشەکەوت دەکرێت. هیچ فۆرم و بۆشاییەک پێویست بە پڕکردنەوە ناکات.'
              : 'This purchase will be automatically logged under the permanent Direct Supplier account. No fields need to be filled.'}
          </Text>
        </MotiView>
      ) : (
        <>
          <TouchableOpacity
            style={[
              styles.directSupplierBtn,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                backgroundColor: isDark ? '#1E293B' : '#FFFBEB',
                borderColor: isDark ? '#D97706' : '#F59E0B',
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setSupplierName(DIRECT_SUPPLIER_NAME);
              setSupplierPhone('');
              setSupplierAddress('');
              setSelectedSupplierId(undefined);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.directSupplierIconWrap, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.25)' : '#FEF3C7' }]}>
              <Ionicons name="flash" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.directSupplierBtnTitle,
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  { color: isDark ? '#FBBF24' : '#B45309', textAlign },
                ]}
              >
                {isKuLanguage ? 'دابینکەری ڕاستەوخۆ ⚡' : 'Direct Supplier ⚡'}
              </Text>
              <Text
                style={[
                  styles.directSupplierBtnSub,
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                  { color: isDark ? '#E2E8F0' : '#78350F', textAlign },
                ]}
              >
                {isKuLanguage ? 'کڕینی دەستبەجێ بەبێ پێویستی بە ژمارە و ناونیشان' : 'Quick intake without phone or address'}
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#D97706" />
          </TouchableOpacity>

          <SupplierInputForm
            name={supplierName}
            phone={supplierPhone}
            address={supplierAddress}
            onNameChange={setSupplierName}
            onPhoneChange={setSupplierPhone}
            onAddressChange={setSupplierAddress}
            onSupplierSelect={(id) => setSelectedSupplierId(id > 0 ? id : undefined)}
          />
        </>
      )}

      <DateTimePicker
        value={purchaseDate}
        onChange={setPurchaseDate}
        label={t('purchases.date')}
        maxDate={new Date()}
      />
    </PremiumCard>
  );

  // 4. Pricing Card
  const cardPricing = (
    <PremiumCard style={[styles.card, isTablet && styles.cardTablet]}>
      <View style={[styles.cardHeaderRow, { flexDirection }]}>
        <View style={[styles.cardHeaderIconBox, { backgroundColor: colors.softBlue }]}>
          <Ionicons name="cash-outline" size={isTablet ? 22 : 18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardHeaderTitle,
              isTablet && { fontSize: 17 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black, textAlign },
            ]}
          >
            {isKuLanguage ? 'نرخی کڕین، فرۆشتن و قازانج' : 'Pricing & Profit'}
          </Text>
          <Text
            style={[
              styles.cardHeaderSub,
              isTablet && { fontSize: 13 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
              { color: colors.gray400, textAlign },
            ]}
          >
            {isKuLanguage ? 'تێچووی کڕین بە دینار و دۆلار لەگەڵ قازانج' : 'Unit buy/sell rates with live profit margin'}
          </Text>
        </View>
      </View>

      {/* Buy Price Row */}
      <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>{t('purchases.buyPrice')}</Text>
      <View style={[styles.priceRow, { flexDirection }]}>
        <View style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.gray50, flexDirection }]}>
          <Text style={[styles.currencyBadge, { color: colors.primary, backgroundColor: colors.softBlue }]}>IQD</Text>
          <TextInput
            style={[styles.priceInput, { color: colors.black, textAlign: 'left', writingDirection: 'ltr' }]}
            value={buyIQD}
            onChangeText={onBuyIQDChange}
            onEndEditing={() => {
              const r = roundToNearest250(parseFloat(buyIQD) || 0);
              setBuyIQD(r > 0 ? String(r) : '');
              setBuyUSD(r > 0 ? String(round(r / exchangeRate, 2)) : '');
            }}
            keyboardType="decimal-pad"
            placeholder={sampleBuyIQDStr}
            placeholderTextColor={colors.gray400}
            returnKeyType="next"
            onFocus={scrollIntoView}
          />
        </View>
        <View style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.gray50, flexDirection }]}>
          <Text style={[styles.currencyBadge, { color: colors.primary, backgroundColor: colors.softBlue }]}>USD</Text>
          <TextInput
            style={[styles.priceInput, { color: colors.black, textAlign: 'left', writingDirection: 'ltr' }]}
            value={buyUSD}
            onChangeText={onBuyUSDChange}
            keyboardType="decimal-pad"
            placeholder={String(sampleBuyUSD)}
            placeholderTextColor={colors.gray400}
            returnKeyType="next"
            onFocus={scrollIntoView}
          />
        </View>
      </View>
      <Text style={[styles.rateNote, { color: colors.gray400, textAlign }]}>{t('purchases.rateNote', { rate: fmtExchangeRate(exchangeRate) })}</Text>

      {/* Auto Total */}
      <View style={[styles.totalBox, { backgroundColor: colors.softBlue, borderColor: colors.mediumBlue, flexDirection }]}>
        <Text style={[styles.totalLabel, { color: colors.gray500 }]}>{t('purchases.autoTotal')}</Text>
        <AmountText value={totalIQD} currency="IQD" style={[styles.totalValue, { color: colors.primary }]} />
      </View>

      {/* Sell Price Row */}
      <Text style={[styles.fieldLabel, { color: colors.gray600, textAlign }]}>{t('purchases.sellPrice')}</Text>
      <View style={[styles.priceRow, { flexDirection }]}>
        <View style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.gray50, flexDirection }]}>
          <Text style={[styles.currencyBadge, { color: colors.primary, backgroundColor: colors.softBlue }]}>IQD</Text>
          <TextInput
            style={[styles.priceInput, { color: colors.black, textAlign: 'left', writingDirection: 'ltr' }]}
            value={sellIQD}
            onChangeText={onSellIQDChange}
            onEndEditing={() => {
              const r = roundToNearest250(parseFloat(sellIQD) || 0);
              setSellIQD(r > 0 ? String(r) : '');
              setSellUSD(r > 0 ? String(round(r / exchangeRate, 2)) : '');
            }}
            keyboardType="decimal-pad"
            placeholder={sampleSellIQDStr}
            placeholderTextColor={colors.gray400}
            returnKeyType="next"
            onFocus={scrollIntoView}
          />
        </View>
        <View style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.gray50, flexDirection }]}>
          <Text style={[styles.currencyBadge, { color: colors.primary, backgroundColor: colors.softBlue }]}>USD</Text>
          <TextInput
            style={[styles.priceInput, { color: colors.black, textAlign: 'left', writingDirection: 'ltr' }]}
            value={sellUSD}
            onChangeText={onSellUSDChange}
            keyboardType="decimal-pad"
            placeholder={String(sampleSellUSD)}
            placeholderTextColor={colors.gray400}
            returnKeyType="next"
            onFocus={scrollIntoView}
          />
        </View>
      </View>

      {sellIQDNum > 0 && (
        <View
          style={[
            styles.totalBox,
            {
              backgroundColor: profitIQD >= 0
                ? (isDark ? hexToRgba(colors.success, 0.15) : '#F0FDF4')
                : (isDark ? hexToRgba(colors.error, 0.15) : '#FEF2F2'),
              borderColor: profitIQD >= 0
                ? (isDark ? hexToRgba(colors.success, 0.35) : '#BBF7D0')
                : (isDark ? hexToRgba(colors.error, 0.35) : '#FECACA'),
              flexDirection,
            },
          ]}
        >
          <Text style={[styles.totalLabel, { color: colors.gray500 }]}>{t('purchases.profitLabel')}</Text>
          <AmountText
            value={profitIQD}
            currency="IQD"
            prefix={profitIQD >= 0 ? '+' : ''}
            style={[styles.totalValue, { color: profitIQD >= 0 ? colors.success : colors.error }]}
          />
        </View>
      )}

      <AppTextInput
        label={t('purchases.warranty')}
        value={warranty}
        onChangeText={setWarranty}
        placeholder={t('purchases.warrantyPlaceholder')}
        returnKeyType="next"
        style={isRTL ? { fontSize: 13 } : undefined}
      />
    </PremiumCard>
  );

  // 5. Checkout & Payment Card
  const cardCheckout = (
    <PremiumCard style={[styles.card, isTablet && styles.cardTablet]}>
      <View style={[styles.cardHeaderRow, { flexDirection }]}>
        <View style={[styles.cardHeaderIconBox, { backgroundColor: colors.softBlue }]}>
          <Ionicons name="wallet-outline" size={isTablet ? 22 : 18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardHeaderTitle,
              isTablet && { fontSize: 17 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              { color: colors.black, textAlign },
            ]}
          >
            {isKuLanguage ? 'پارەدان و تەواوکردن' : 'Payment & Checkout'}
          </Text>
          <Text
            style={[
              styles.cardHeaderSub,
              isTablet && { fontSize: 13 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
              { color: colors.gray400, textAlign },
            ]}
          >
            {isKuLanguage ? 'جۆری پارەدان، سندوقی کاش و چاپکردنی وەسڵ' : 'Payment terms, cash drawer check & invoice printing'}
          </Text>
        </View>
      </View>

      <PurchasePaymentOptionsAccordion
        paymentStatus={paymentStatus}
        onSelectPaymentStatus={setPaymentStatus}
        amountPaid={amountPaid}
        onChangeAmountPaid={(v) => setAmountPaid(sanitizeNumericInput(v, 'decimal-pad'))}
        onEndEditingAmountPaid={() => {
          const n = parseFloat(toEnglishDigits(amountPaid).replace(/,/g, '')) || 0;
          if (n > maxDownPayment) {
            setAmountPaid(maxDownPayment > 0 ? String(maxDownPayment) : '');
          }
        }}
        maxDownPayment={maxDownPayment}
        maxDownPaymentDisplay={maxDownPaymentDisplay}
        isPaidExceeded={isPaidExceeded}
        initialPaymentMethod={initialPaymentMethod}
        onSelectInitialPaymentMethod={setInitialPaymentMethod}
        rawPaidNum={rawPaidNum}
        remainingDebt={remainingDebt}
        isUSD={isUSD}
        receiptCurrency={receiptCurrency}
        onSelectReceiptCurrency={setReceiptCurrency}
        isCapitalEnabled={isCapitalEnabled}
        drawerBalance={drawerBalance}
        isInsufficientCash={isInsufficientCash}
        cashNeeded={cashNeeded}
        projectedBalance={projectedBalance}
        checkoutMode={checkoutMode}
        onSelectCheckoutMode={setCheckoutMode}
      />

      <View style={[styles.actions, isTablet && { gap: 14 }]}>
        <PrimaryButton
          label={
            isSubmitting
              ? t('purchases.saving')
              : checkoutMode === 'print'
              ? (isKuLanguage ? 'تۆمارکردن و پرینت 🖨️' : 'Save & Print 🖨️')
              : (isKuLanguage ? 'تۆمارکردنی کڕین (ئاسایی) ✓' : 'Save Purchase (Normal) ✓')
          }
          onPress={handleSave}
          loading={isSubmitting}
          disabled={isSubmitting}
        />
        <PrimaryButton
          label={t('purchases.reset')}
          onPress={() => {
            setProductName(''); setPurchaseDate(new Date()); setSupplierName('');
            setQty('1'); setBuyIQD(''); setBuyUSD(''); setSellIQD(''); setSellUSD('');
            setIdType(null); setSharedId(''); setCustomIds(['']);
            setCategory(''); setWarranty(''); setNotes('');
            setSupplierPhone(''); setSupplierAddress('');
            const currentPrefs = useSettingsStore.getState();
            setPaymentStatusState(currentPrefs.purchasePaymentStatusPreference || 'paid');
            setAmountPaid('');
            setInitialPaymentMethodState(currentPrefs.purchaseDebtDownPaymentMethodPreference || 'cash');
            setImageUri(null);
            setReceiptCurrencyState(currentPrefs.purchaseReceiptCurrencyPreference || 'iqd');
            setCheckoutModeState(currentPrefs.purchaseCheckoutModePreference || 'normal');
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            col1ScrollRef.current?.scrollTo({ y: 0, animated: true });
            col2ScrollRef.current?.scrollTo({ y: 0, animated: true });
            col3ScrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          variant="ghost"
        />
      </View>
    </PremiumCard>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('purchases.newPurchase')} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {useThreeColumns ? (
          /* 3 Independent Columns Layout on Large Tablet Screens (iPad Landscape / Wide Tablet) */
          <View
            style={[
              styles.flex,
              isTablet && contentContainerStyle,
              styles.threeColsLandscapeContainer,
            ]}
          >
            <View
              style={[
                styles.threeColsLandscapeRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              {/* Column 1 (Right in RTL, Left in LTR: Product Info & Supplier) */}
              <View style={styles.threeColSide}>
                <KeyboardAwareScrollView
                  ref={col1ScrollRef}
                  style={styles.flex}
                  contentContainerStyle={styles.threeColScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  overScrollMode="never"
                  extraScrollSpace={24}
                >
                  <View style={styles.threeColCardsWrap}>
                    {cardProductInfo}
                    {cardSupplier}
                  </View>
                </KeyboardAwareScrollView>
              </View>

              {/* Column 2 (Middle in both RTL & LTR: Pricing, Profit & Checkout/Save) */}
              <View style={styles.threeColMiddle}>
                <KeyboardAwareScrollView
                  ref={col2ScrollRef}
                  style={styles.flex}
                  contentContainerStyle={styles.threeColMiddleScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  overScrollMode="never"
                  extraScrollSpace={24}
                >
                  <View style={styles.threeColCardsWrap}>
                    {cardPricing}
                    {cardCheckout}
                  </View>
                </KeyboardAwareScrollView>
              </View>

              {/* Column 3 (Left in RTL, Right in LTR: Quantity & Item Barcodes / IDs, Expiry Dates) */}
              <View style={styles.threeColSide}>
                <KeyboardAwareScrollView
                  ref={col3ScrollRef}
                  style={styles.flex}
                  contentContainerStyle={styles.threeColScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  extraScrollSpace={30}
                >
                  <View style={styles.threeColCardsWrap}>
                    {cardQuantityAndIds}
                    {cardExpiryDates}
                  </View>
                </KeyboardAwareScrollView>
              </View>
            </View>
          </View>
        ) : (
          <KeyboardAwareScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.body,
              isTablet && contentContainerStyle,
              isTablet && { padding: 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {isTablet ? (
              /* 2 Balanced Columns Layout on Medium Tablet (iPad Portrait) */
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  gap: 20,
                  alignItems: 'flex-start',
                  width: '100%',
                }}
              >
                {/* Column 1: Product, IDs & Expiry */}
                <View style={{ flex: 1, gap: 20 }}>
                  {cardProductInfo}
                  {cardQuantityAndIds}
                  {cardExpiryDates}
                </View>

                {/* Column 2: Supplier, Pricing & Checkout */}
                <View style={{ flex: 1, gap: 20 }}>
                  {cardSupplier}
                  {cardPricing}
                  {cardCheckout}
                </View>
              </View>
            ) : (
              /* 1 Column Layout on Phone */
              <View style={{ gap: 16 }}>
                {cardProductInfo}
                {cardQuantityAndIds}
                {cardExpiryDates}
                {cardSupplier}
                {cardPricing}
                {cardCheckout}
              </View>
            )}
          </KeyboardAwareScrollView>
        )}
      </KeyboardAvoidingView>

      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        mode={targetCustomIdx !== null ? 'single' : 'batch_ids'}
        title={isKuLanguage ? 'سکانی بارکۆدی کاڵا' : 'Scan Product Barcode'}
        subtitle={
          targetCustomIdx !== null
            ? (isKuLanguage ? 'کۆد بۆ ئەم بەرهەمە سکان بکە' : 'Scan barcode for this item')
            : (isKuLanguage ? 'کۆدەکان یەک لەدوای یەک سکان بکە بۆ وەسڵی کڕین' : 'Scan item codes sequentially for this purchase')
        }
        initialCodes={
          targetCustomIdx !== null
            ? (customIds[targetCustomIdx] ? [customIds[targetCustomIdx]] : [])
            : idType === 'custom'
            ? customIds.filter(Boolean)
            : sharedId
            ? [sharedId]
            : []
        }
        onScanSingle={handleScanSingle}
        onApplyBatchIds={handleApplyBatchIds}
      />
    </View>
  );
}

function GenerateIdButton({
  loading,
  onPress,
}: {
  loading: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { flexDirection } = useRTL();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
      style={[
        genBtnStyles.btn,
        {
          backgroundColor: colors.softBlue,
          borderColor:     colors.primary,
          opacity:         loading ? 0.5 : 1,
          flexDirection,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size={12} color={colors.primary} />
      ) : (
        <Ionicons name="dice-outline" size={15} color={colors.primary} />
      )}
      <Text style={[genBtnStyles.label, { color: colors.primary }]}>
        {t('purchases.generateId')}
      </Text>
    </TouchableOpacity>
  );
}

const genBtnStyles = StyleSheet.create({
  btn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3.5,
    height:            30,
    paddingHorizontal: 7,
    borderRadius:      7,
    borderWidth:       1.2,
  },
  label: { fontSize: 11, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container:  { flex: 1 },
  flex:       { flex: 1 },
  body:       { padding: 16, paddingBottom: 40 },
  card:       { marginBottom: 16 },
  cardTablet: {
    padding: 24,
    borderRadius: 22,
    marginBottom: 0,
  },
  cardHeaderRow: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardHeaderIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardHeaderSub: {
    fontSize: 12,
    marginTop: 2,
  },
  drawerCardInner: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 10,
    marginBottom: 8,
  },

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
  hintText: {
    fontSize:     11,
    marginTop:    -8,
    marginBottom: 12,
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

  /* Existing Product Repurchase Locked Banner */
  existingProductBanner: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginTop: 8,
  },
  existingProductHeaderRow: {
    alignItems: 'center',
    gap: 10,
  },
  existingProductLockIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  existingProductTitleLine: {
    alignItems: 'center',
    gap: 8,
  },
  existingProductTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  restockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  restockBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  existingProductSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  existingProductDetailsRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  existingIdDisplayBox: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 6,
  },
  existingIdDisplayLabel: {
    fontSize: 12,
  },
  existingIdDisplayValue: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  existingStockDisplayBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 6,
  },
  existingStockDisplayText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stockProjectionRow: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  stockProjectionText: {
    fontSize: 11.5,
    flex: 1,
  },

  idTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  idTypeBtn: {
    flex:           1,
    height:         44,
    borderWidth:    1.5,
    borderRadius:   Theme.radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  idTypeBtnText:       { fontSize: 14, fontWeight: '600' },

  customIdsContainer: { marginBottom: 4 },
  customIdRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  customIdBadge: {
    width:          24,
    height:         24,
    borderRadius:   12,
    alignItems:     'center',
    justifyContent: 'center',
  },
  customIdBadgeText: { fontSize: 11, fontWeight: '700' },
  customIdsHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
    gap: 8,
  },
  customIdsHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 7,
    borderWidth: 1.2,
    gap: 3,
    flexShrink: 0,
  },
  addSlotBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  customIdCardBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  customIdCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  customIdCardTitleGroup: {
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  customIdCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  customIdActionsGroup: {
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  itemActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    height: 30,
    paddingHorizontal: 7,
    borderRadius: 7,
    borderWidth: 1.2,
  },
  itemActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customIdInputWrapNew: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    overflow: 'hidden',
    gap: 8,
  },
  customIdInputIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customIdInputInner: {
    flex: 1,
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  customIdInputNew: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  customIdPlaceholderOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 2,
  },
  customIdPlaceholderText: {
    fontSize: 13.5,
  },
  customIdInputWrap: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderRadius: Theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  customIdInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    paddingVertical: 0,
  },
  customIdClearIcon: {
    padding: 2,
    marginLeft: 4,
  },
  customIdDeleteBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1,
  },

  scanBarcodeBanner: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  scanIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBannerTextWrap: {
    flex: 1,
  },
  scanBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  scanBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  scanActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  scanActionPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  smallScanIconBtn: {
    width: 38,
    height: 38,
    borderRadius: Theme.radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  paymentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  payBtn: {
    flex:           1,
    height:         48,
    borderWidth:    1.5,
    borderRadius:   Theme.radius.md,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            8,
  },
  payBtnPaid: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  payBtnFib:  { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  payBtnDebt: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  payBtnText: { fontSize: 13, fontWeight: '700' },

  textarea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  actions:  { gap: 10 },

  drawerCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  drawerCardTitleGroup: {
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  drawerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  drawerActivePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  drawerActivePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  drawerMetricsContainer: {
    gap: 8,
    marginBottom: 4,
  },
  drawerMetricRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerMetricRowHighlight: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  drawerMetricLabelGroup: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  drawerMetricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerMetricRowLabel: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  drawerMetricRowVal: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 0,
  },
  drawerMetricRowValBold: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 0,
  },
  drawerWarningBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  drawerWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  /* Presets suggestions strip */
  presetsSuggestionWrap: {
    marginTop: -4,
    marginBottom: 12,
    gap: 6,
  },
  presetsHeaderRow: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 2,
  },
  presetsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presetsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 8,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  presetChipImage: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  presetChipName: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetChipDesc: {
    fontSize: 10,
    maxWidth: 110,
  },
  directSupplierBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  directSupplierIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directSupplierBtnTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  directSupplierBtnSub: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  directSupplierActiveCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  directSupplierActiveTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  directSupplierActiveBadge: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  directSupplierChangeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
  },
  directSupplierChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  directSupplierActiveDesc: {
    fontSize: 12,
    lineHeight: 19,
    marginTop: 4,
  },
  threeColsLandscapeContainer: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  threeColsLandscapeRow: {
    flex: 1,
    gap: 16,
    width: '100%',
  },
  threeColSide: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  threeColMiddle: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  threeColScrollContent: {
    paddingBottom: 16,
  },
  threeColMiddleScrollContent: {
    paddingBottom: 20,
  },
  threeColCardsWrap: {
    gap: 18,
    paddingBottom: 36,
  },
  threeColMiddleCardsWrap: {
    gap: 18,
    paddingBottom: 36,
  },
  datePickerBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  datePickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expiryDateActionRow: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  quickChipsWrap: {
    alignItems: 'center',
    gap: 6,
  },
  smallChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallChipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  shortcutHint: {
    fontSize: 11.5,
    marginTop: 2,
  },
  durationChipsRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  durationChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  idNoticeBanner: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    alignItems: 'center',
    gap: 8,
  },
  idNoticeText: {
    fontSize: 12,
    flex: 1,
  },
  idBoundBanner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'center',
    gap: 8,
  },
  idBoundText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  dateCountdownSubRow: {
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
    paddingHorizontal: 4,
  },
  dateCountdownSubText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inlineCountdownBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginStart: 8,
  },
  inlineCountdownBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  expiryNoticeBanner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  expiryNoticeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
