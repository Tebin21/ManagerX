import React, { useState, useRef, useEffect } from 'react';
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
import { ReceiptCurrencySelector } from '@/components/shared/ReceiptCurrencySelector';
import { CheckoutActionGrid, type CheckoutMode } from '@/components/shared/CheckoutActionGrid';
import { useBusinessStore } from '@/store/businessStore';
import { fmtExchangeRate, toEnglishDigits } from '@/utils/formatters';
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
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
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

  const handleSelectSavedItem = (preset: SavedProductPreset) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}
    setImageUri(preset.imageUri);
    setProductName(preset.name);
    if (preset.description) {
      setItemDescription(preset.description);
    }
    if (preset.category && !category) {
      setCategory(preset.category);
    }
    if (preset.itemId && !sharedId) {
      setIdType('shared');
      setSharedId(preset.itemId);
    }
  };

  const matchingPresets = React.useMemo(() => {
    const q = productName.trim().toLowerCase();
    if (q.length < 1) return [];
    return savedPresets.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [savedPresets, productName]);

  // ─── ID type ────────────────────────────────────────────────────────────────
  const [idType, setIdType]                 = useState<PurchaseIdType | null>(null);
  const [sharedId, setSharedId]             = useState('');
  const [customIds, setCustomIds]           = useState<string[]>(['']);
  const [isGeneratingShared,   setIsGeneratingShared]   = useState(false);
  const [generatingCustomIdxs, setGeneratingCustomIdxs] = useState<Set<number>>(new Set());

  // ─── Barcode Scanner ────────────────────────────────────────────────────────
  const [scannerVisible, setScannerVisible] = useState(false);
  const [targetCustomIdx, setTargetCustomIdx] = useState<number | null>(null);

  const handleOpenScanner = (customIdx?: number) => {
    setTargetCustomIdx(customIdx !== undefined ? customIdx : null);
    setScannerVisible(true);
  };

  const handleScanSingle = (code: string) => {
    if (targetCustomIdx !== null) {
      updateCustomId(targetCustomIdx, code);
    } else {
      if (idType === 'shared') {
        setSharedId(code);
      } else {
        const firstEmpty = customIds.findIndex((val) => !val.trim());
        const idx = firstEmpty >= 0 ? firstEmpty : 0;
        updateCustomId(idx, code);
      }
    }

    // Auto-match against saved presets by code/barcode
    const matched = findByCode(code);
    if (matched) {
      if (!productName.trim()) setProductName(matched.name);
      if (!itemDescription.trim() && matched.description) setItemDescription(matched.description);
      if (!imageUri && matched.imageUri) setImageUri(matched.imageUri);
      if (!category.trim() && matched.category) setCategory(matched.category);
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
  const [paymentStatus, setPaymentStatus]   = useState<PurchasePaymentStatus>('paid');
  const [amountPaid, setAmountPaid]         = useState('');

  const [imageUri, setImageUri]             = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [receiptCurrency, setReceiptCurrency] = useState<ReceiptCurrencyMode>('iqd');
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('normal');

  useEffect(() => {
    getProductCategories().then(setAvailableCategories).catch(() => {});
  }, []);

  // ─── Derived ────────────────────────────────────────────────────────────────
  const qtyNum       = Math.max(1, parseInt(qty) || 1);
  const buyIQDNum    = parseFloat(buyIQD) || 0;
  const sellIQDNum   = parseFloat(sellIQD) || 0;
  const totalIQD     = qtyNum * buyIQDNum;
  const profitIQD    = (sellIQDNum - buyIQDNum) * qtyNum;
  const amountPaidNum = roundToNearest250(Math.max(0, parseFloat(amountPaid) || 0));
  const remainingDebt = Math.max(0, totalIQD - amountPaidNum);
  const cashNeeded    = paymentStatus === 'paid' ? totalIQD : (paymentStatus === 'debt' ? amountPaidNum : 0);
  const projectedBalance = (drawerBalance ?? 0) - cashNeeded;
  const isInsufficientCash = isCapitalEnabled && drawerBalance !== null && cashNeeded > drawerBalance;

  // ─── Currency sync ──────────────────────────────────────────────────────────
  function onBuyIQDChange(val: string) {
    setBuyIQD(val);
    const n = parseFloat(val) || 0;
    setBuyUSD(n > 0 ? String(round(n / exchangeRate, 2)) : '');
  }

  function onBuyUSDChange(val: string) {
    setBuyUSD(val);
    const n = parseFloat(val) || 0;
    setBuyIQD(n > 0 ? String(roundToNearest250(n * exchangeRate)) : '');
  }

  function onSellIQDChange(val: string) {
    setSellIQD(val);
    const n = parseFloat(val) || 0;
    setSellUSD(n > 0 ? String(round(n / exchangeRate, 2)) : '');
  }

  function onSellUSDChange(val: string) {
    setSellUSD(val);
    const n = parseFloat(val) || 0;
    setSellIQD(n > 0 ? String(roundToNearest250(n * exchangeRate)) : '');
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
    if (paymentStatus === 'debt' && amountPaidNum > totalIQD) {
      Alert.alert(t('common.error'), t('purchases.validationAmountPaid'));
      return false;
    }
    return true;
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return;

    // Cash drawer balance check when Capital system is enabled
    const capitalStore = useCapitalStore.getState();
    if (capitalStore.isEnabled) {
      const needed = paymentStatus === 'paid' ? totalIQD : (paymentStatus === 'debt' ? amountPaidNum : 0);
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
        initialAmountPaid: paymentStatus === 'debt' ? amountPaidNum : 0,
        imageUri,
        selectedSupplierId: isDirectSupplier ? undefined : selectedSupplierId,
      });

      // Auto-persist to saved presets library
      if (imageUri) {
        try {
          savePreset({
            name: productName.trim() || undefined,
            description: itemDescription.trim() || null,
            imageUri,
            itemId: sharedId.trim() || (customIds[0]?.trim()) || null,
            category: category.trim() || null,
          });
        } catch { /* non-critical */ }
      }

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
        setCategory(''); setWarranty(''); setNotes('');
        setSupplierPhone(''); setSupplierAddress(''); setSelectedSupplierId(undefined); setPaymentStatus('paid');
        setAmountPaid('');
        setImageUri(null);
        setReceiptCurrency('iqd');
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
        await directPrintPurchaseInvoice(
          purchase,
          purchaseItems,
          {
            name: business.name || 'My Store',
            phone: business.phone || '',
            address: business.address || '',
            logoUri: business.logoUri ?? null,
          },
          receiptCurrency
        );
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
      if (msg.startsWith('DUPLICATE_ITEM_ID|')) {
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
        onChangeText={setProductName}
        onEndEditing={() => {
          const match = findByName(productName);
          if (match) {
            if (!imageUri && match.imageUri) {
              setImageUri(match.imageUri);
            }
            if (!itemDescription && match.description) {
              setItemDescription(match.description);
            }
            if (!category && match.category) {
              setCategory(match.category);
            }
          }
        }}
        placeholder={t('purchases.productNameNewPlaceholder')}
        returnKeyType="next"
      />

      {/* Quick Auto-Fill Suggestion Chips when typing product name */}
      {matchingPresets.length > 0 && !imageUri && (
        <View style={styles.presetsSuggestionWrap}>
          <View style={[styles.presetsHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={[styles.presetsHeaderText, { color: colors.primary }]}>
              {isKuLanguage
                ? 'ئایتمە سەڤکراوەکان (داگرە بۆ پڕکردنەوەی وێنە و وەسف):'
                : 'Saved items (tap to auto-fill photo & details):'}
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
                <Image
                  source={{ uri: preset.imageUri }}
                  style={styles.presetChipImage}
                />
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
                  {Boolean(preset.description) && (
                    <Text style={[styles.presetChipDesc, { color: colors.gray400 }]} numberOfLines={1}>
                      {preset.description}
                    </Text>
                  )}
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

      <AppTextInput
        label={t('purchases.websiteDescription')}
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
        <View style={[styles.cardHeaderIconBox, { backgroundColor: colors.softBlue }]}>
          <Ionicons name="barcode-outline" size={isTablet ? 22 : 18} color={colors.primary} />
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
            {isKuLanguage ? 'ژمارەی دانە، کۆدی بارکۆد یان ئایدی' : 'Units count, barcode scanner, or unique IDs'}
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
    </PremiumCard>
  );

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
            placeholder={t('purchases.buyPriceIQDPlaceholder')}
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
            placeholder={t('purchases.buyPriceUSDPlaceholder')}
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
            placeholder="0"
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
            placeholder="0.00"
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

      {/* Payment Status */}
      <Text
        style={[
          styles.fieldLabel,
          { color: colors.gray600, textAlign, marginBottom: 10 },
          isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
        ]}
      >
        {t('purchases.paymentStatus')}
      </Text>
      <View style={[styles.paymentRow, { flexDirection }]}>
        <TouchableOpacity
          style={[
            styles.payBtn,
            paymentStatus === 'paid'
              ? (isDark
                  ? { backgroundColor: hexToRgba(colors.success, 0.18), borderColor: colors.success }
                  : styles.payBtnPaid)
              : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.white },
            { flexDirection },
          ]}
          onPress={() => setPaymentStatus('paid')}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color={paymentStatus === 'paid' ? colors.success : colors.gray400} />
          <Text
            style={[
              styles.payBtnText,
              { color: paymentStatus === 'paid' ? colors.success : colors.gray500 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {t('purchases.paid')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.payBtn,
            paymentStatus === 'debt'
              ? (isDark
                  ? { backgroundColor: hexToRgba(colors.error, 0.18), borderColor: colors.error }
                  : styles.payBtnDebt)
              : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.white },
            { flexDirection },
          ]}
          onPress={() => setPaymentStatus('debt')}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle" size={18} color={paymentStatus === 'debt' ? colors.error : colors.gray400} />
          <Text
            style={[
              styles.payBtnText,
              { color: paymentStatus === 'debt' ? colors.error : colors.gray500 },
              isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {t('purchases.debt')}
          </Text>
        </TouchableOpacity>
      </View>

      {paymentStatus === 'debt' && (
        <View style={{ marginBottom: 4 }}>
          <AppTextInput
            label={t('purchases.amountPaid')}
            value={amountPaid}
            onChangeText={setAmountPaid}
            keyboardType="decimal-pad"
            placeholder={t('purchases.amountPaidPlaceholder')}
            returnKeyType="done"
            forceLatin
          />
          <View
            style={[
              styles.totalBox,
              {
                backgroundColor: isDark ? hexToRgba(colors.error, 0.15) : '#FEF2F2',
                borderColor: isDark ? hexToRgba(colors.error, 0.35) : '#FECACA',
                flexDirection,
                marginBottom: 16,
              },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.gray500 }]}>{t('purchases.remainingDebt')}</Text>
            <AmountText value={remainingDebt} currency="IQD" style={[styles.totalValue, { color: colors.error }]} />
          </View>
        </View>
      )}

      <ReceiptCurrencySelector value={receiptCurrency} onChange={setReceiptCurrency} inner />

      {/* Cash Drawer Live Indicator (Capital System) */}
      {isCapitalEnabled && drawerBalance !== null && (
        <View
          style={[
            styles.drawerCardInner,
            {
              borderColor: isInsufficientCash ? colors.error : colors.primary + '35',
              backgroundColor: isDark ? colors.white : colors.gray50,
            },
          ]}
        >
          <View style={[styles.drawerCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.drawerCardTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.drawerIconBox,
                  { backgroundColor: (isInsufficientCash ? colors.error : colors.primary) + (isDark ? '24' : '18') },
                ]}
              >
                <Ionicons
                  name="wallet"
                  size={18}
                  color={isInsufficientCash ? colors.error : colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.drawerCardTitle,
                  { color: colors.black, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('capital.drawerStatusTitle')}
              </Text>
            </View>

            <View
              style={[
                styles.drawerActivePill,
                { backgroundColor: (isInsufficientCash ? colors.error : colors.primary) + (isDark ? '24' : '14') },
              ]}
            >
              <Text
                style={[
                  styles.drawerActivePillText,
                  { color: isInsufficientCash ? colors.error : colors.primary },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isInsufficientCash ? t('common.error') : t('capital.statusActive')}
              </Text>
            </View>
          </View>

          {/* 3 Metric Rows */}
          <View style={styles.drawerMetricsContainer}>
            {/* 1. Available Balance Now */}
            <View
              style={[
                styles.drawerMetricRow,
                {
                  backgroundColor: isDark ? colors.white : colors.white,
                  borderColor: colors.gray200,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={[styles.drawerMetricLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.drawerMetricIconCircle, { backgroundColor: colors.softBlue }]}>
                  <Ionicons name="wallet-outline" size={16} color={colors.primary} />
                </View>
                <Text
                  style={[
                    styles.drawerMetricRowLabel,
                    { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {t('capital.drawerBalanceNow')}
                </Text>
              </View>
              <AmountText
                value={drawerBalance}
                currency="IQD"
                style={[styles.drawerMetricRowVal, { color: colors.black }]}
              />
            </View>

            {/* 2. Cash Needed for this purchase */}
            <View
              style={[
                styles.drawerMetricRow,
                {
                  backgroundColor: isDark ? colors.white : colors.white,
                  borderColor: colors.gray200,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={[styles.drawerMetricLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View
                  style={[
                    styles.drawerMetricIconCircle,
                    {
                      backgroundColor: isInsufficientCash
                        ? (isDark ? hexToRgba(colors.error, 0.18) : '#FEE2E2')
                        : (isDark ? hexToRgba(colors.warning, 0.18) : '#FEF3C7'),
                    },
                  ]}
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={isInsufficientCash ? colors.error : colors.warning}
                  />
                </View>
                <Text
                  style={[
                    styles.drawerMetricRowLabel,
                    { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {t('capital.drawerCashNeeded')}
                </Text>
              </View>
              <AmountText
                value={cashNeeded}
                currency="IQD"
                style={[
                  styles.drawerMetricRowVal,
                  { color: isInsufficientCash ? colors.error : colors.warning },
                ]}
              />
            </View>

            {/* 3. Projected Balance After Purchase */}
            <View
              style={[
                styles.drawerMetricRowHighlight,
                {
                  backgroundColor: isInsufficientCash
                    ? (isDark ? hexToRgba(colors.error, 0.15) : '#FEF2F2')
                    : (isDark ? hexToRgba(colors.success, 0.15) : '#F0FDF4'),
                  borderColor: isInsufficientCash
                    ? (isDark ? hexToRgba(colors.error, 0.5) : '#FECACA')
                    : (isDark ? hexToRgba(colors.success, 0.5) : '#BBF7D0'),
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={[styles.drawerMetricLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View
                  style={[
                    styles.drawerMetricIconCircle,
                    {
                      backgroundColor: isInsufficientCash
                        ? (isDark ? hexToRgba(colors.error, 0.25) : '#FEE2E2')
                        : (isDark ? hexToRgba(colors.success, 0.25) : '#DCFCE7'),
                    },
                  ]}
                >
                  <Ionicons
                    name={isInsufficientCash ? 'alert-circle-outline' : 'shield-checkmark-outline'}
                    size={17}
                    color={isInsufficientCash ? colors.error : colors.success}
                  />
                </View>
                <Text
                  style={[
                    styles.drawerMetricRowLabel,
                    {
                      color: isInsufficientCash ? colors.error : colors.success,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {t('capital.drawerBalanceAfter')}
                </Text>
              </View>
              <AmountText
                value={projectedBalance}
                currency="IQD"
                variant="default"
                style={[
                  styles.drawerMetricRowValBold,
                  { color: isInsufficientCash ? colors.error : colors.success },
                ]}
              />
            </View>
          </View>

          {/* Insufficient Warning Banner */}
          {isInsufficientCash && (
            <View
              style={[
                styles.drawerWarningBanner,
                {
                  backgroundColor: isDark ? hexToRgba(colors.error, 0.15) : '#FEF2F2',
                  borderColor: isDark ? hexToRgba(colors.error, 0.35) : '#FECACA',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text
                style={[
                  styles.drawerWarningText,
                  { color: colors.error, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {t('capital.insufficientBanner')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Checkout Mode Action Grid */}
      <CheckoutActionGrid
        mode={checkoutMode}
        onSelectMode={setCheckoutMode}
        type="purchase"
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
            setSupplierPhone(''); setSupplierAddress(''); setPaymentStatus('paid');
            setAmountPaid('');
            setImageUri(null);
            setReceiptCurrency('iqd');
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
              {/* Column 1 (Right in RTL: Product Info & Supplier) - scrolls to content end and stops */}
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

              {/* Column 2 (Middle: Quantity & Item Barcodes / IDs) - independently scrollable */}
              <View style={styles.threeColMiddle}>
                <KeyboardAwareScrollView
                  ref={col2ScrollRef}
                  style={styles.flex}
                  contentContainerStyle={styles.threeColMiddleScrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  extraScrollSpace={30}
                >
                  <View style={styles.threeColMiddleCardsWrap}>
                    {cardQuantityAndIds}
                  </View>
                </KeyboardAwareScrollView>
              </View>

              {/* Column 3 (Left in RTL: Pricing, Profit & Checkout/Save) - scrolls to content end and stops */}
              <View style={styles.threeColSide}>
                <KeyboardAwareScrollView
                  ref={col3ScrollRef}
                  style={styles.flex}
                  contentContainerStyle={styles.threeColScrollContent}
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
                {/* Column 1: Product & IDs */}
                <View style={{ flex: 1, gap: 20 }}>
                  {cardProductInfo}
                  {cardQuantityAndIds}
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
  payBtnDebt: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  payBtnText: { fontSize: 14, fontWeight: '700' },

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
    paddingBottom: 36,
  },
});
