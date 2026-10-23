import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';
import { KeyboardAwareScrollView, useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { ProductImagePicker } from '@/components/ui/ProductImagePicker';
import { LockedFieldRow } from '@/components/ui/LockedFieldRow';

import { useTranslation } from 'react-i18next';
import { getInventoryProductById } from '@/lib/sqlite';
import { useInventoryStore } from '@/store/inventoryStore';
import { CategoryAutocompleteInput } from '@/components/shared/CategoryAutocompleteInput';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '@/constants/theme';
import type { InventoryProduct, NewProductData } from '@/types/inventory';
import { roundToNearest250, roundUSD } from '@/utils/rounding';
import { fmtIQD, fmtUSD, toDateOnly, toEnglishDigits, formatExpiryCountdown, formatProductionAge } from '@/utils/formatters';
import { hexToRgba } from '@/lib/colorUtils';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useSavedProductStore } from '@/store/savedProductStore';
import { DatePickerModal } from '@/components/shared/DatePickerModal';


type FieldKey =
  | 'name' | 'category'
  | 'sellPriceIQD' | 'sellPriceUSD' | 'lowStockThreshold'
  | 'warranty' | 'description' | 'notes' | 'imageUri' | 'websiteDescription' | 'itemDescription'
  | 'productionDate' | 'expiryDate';

export default function EditProductScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { editProduct, categories: availableCategories } = useInventoryStore();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
  const globalLowStockThreshold = useSettingsStore((s) => s.globalLowStockThreshold);
  const expiryTrackingEnabled = useSettingsStore((s) => s.expiryTrackingEnabled);
  const { colors, isDark } = useAppTheme();
  const { flexDirection, textAlign, isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const scrollIntoView = useKeyboardAwareFocus();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const [product, setProduct] = useState<InventoryProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName]               = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [category, setCategory]       = useState('');
  const [sellIQD, setSellIQD]         = useState('');
  const [sellUSD, setSellUSD]         = useState('');
  const [warranty, setWarranty]       = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes]             = useState('');
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [websiteDescription, setWebsiteDescription] = useState('');
  const [productionDate, setProductionDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate]         = useState<Date | null>(null);
  const [showProdPicker, setShowProdPicker] = useState(false);
  const [showExpPicker, setShowExpPicker]   = useState(false);

  // Change-highlight state
  const [changedFields, setChangedFields] = useState<Set<FieldKey>>(new Set());
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const p = await getInventoryProductById(Number(id));
      if (p) {
        setProduct(p);
        setName(p.name);
        setItemDescription(p.itemDescription ?? '');
        setCategory(p.category);
        setSellIQD(String(p.sellingPrice));
        setSellUSD(String(p.sellPriceUsd));
        setWarranty(p.warranty ?? '');
        setDescription(p.description ?? '');
        setNotes(p.notes ?? '');
        setImageUri(p.imageUri || p.imageRemoteUrl || null);
        setLowStockThreshold(p.lowStockThreshold != null ? String(p.lowStockThreshold) : '');
        setWebsiteDescription(p.websiteDescription ?? '');
        if (p.productionDate) {
          try { setProductionDate(new Date(p.productionDate)); } catch {}
        }
        if (p.expiryDate) {
          try { setExpiryDate(new Date(p.expiryDate)); } catch {}
        }
      }
      setLoading(false);
    })();
    return () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); };
  }, [id]);

  const syncSellIQD = (val: string) => {
    const clean = toEnglishDigits(val);
    setSellIQD(clean);
    const n = parseFloat(clean.replace(/,/g, ''));
    if (!isNaN(n)) setSellUSD(String(roundUSD(n / exchangeRate)));
  };

  const syncSellUSD = (val: string) => {
    const clean = toEnglishDigits(val);
    setSellUSD(clean);
    const n = parseFloat(clean.replace(/,/g, ''));
    if (!isNaN(n)) setSellIQD(String(roundToNearest250(n * exchangeRate)));
  };

  const handleSave = useCallback(async () => {
    if (!product) return;
    if (!name.trim()) { Alert.alert(t('common.required'), t('inventory.errorSave')); return; }
    const sellPrice = roundToNearest250(parseFloat(toEnglishDigits(sellIQD).replace(/,/g, '')) || 0);
    if (isNaN(sellPrice) || sellPrice < 0) { Alert.alert(t('common.error'), t('inventory.errorSave')); return; }

    // Detect which fields changed
    const changed = new Set<FieldKey>();
    if (name.trim() !== product.name)            changed.add('name');
    if (itemDescription.trim() !== (product.itemDescription ?? '')) changed.add('itemDescription');
    if (category !== product.category)           changed.add('category');
    if (sellPrice !== product.sellingPrice)      changed.add('sellPriceIQD');
    if (warranty.trim() !== (product.warranty ?? ''))       changed.add('warranty');
    if (description.trim() !== (product.description ?? '')) changed.add('description');
    if (notes.trim() !== (product.notes ?? ''))             changed.add('notes');
    const initialImg = product.imageUri || product.imageRemoteUrl || null;
    if (imageUri !== initialImg)                             changed.add('imageUri');
    if (websiteDescription.trim() !== (product.websiteDescription ?? '')) changed.add('websiteDescription');
    const cleanThreshold = toEnglishDigits(lowStockThreshold).trim();
    const parsedThreshold = cleanThreshold ? parseInt(cleanThreshold, 10) : null;
    if (parsedThreshold !== (product.lowStockThreshold ?? null)) changed.add('lowStockThreshold');
    const prodStr = productionDate ? toDateOnly(productionDate) : null;
    const expStr = expiryDate ? toDateOnly(expiryDate) : null;
    if (prodStr !== (product.productionDate ?? null)) changed.add('productionDate');
    if (expStr !== (product.expiryDate ?? null)) changed.add('expiryDate');

    setSaving(true);
    try {
      const data: Partial<NewProductData> = {
        name:               name.trim(),
        itemDescription:    itemDescription.trim() || null,
        category,
        sellingPrice:       sellPrice,
        sellPriceUsd:       parseFloat(toEnglishDigits(sellUSD).replace(/,/g, '')) || 0,
        warranty:           warranty.trim() || null,
        description:        description.trim() || null,
        notes:              notes.trim() || null,
        imageUri,
        imageRemoteUrl:     imageUri && (imageUri.startsWith('http://') || imageUri.startsWith('https://')) ? imageUri : (imageUri ? product.imageRemoteUrl : null),
        lowStockThreshold:  (!isNaN(parsedThreshold as number) && parsedThreshold !== null && (parsedThreshold as number) > 0) ? parsedThreshold : null,
        lowStockEnabled:    null,
        websiteDescription: websiteDescription.trim() || null,
        productionDate:     prodStr,
        expiryDate:         expStr,
      };
      await editProduct(product.id, data);

      // Update local product state so it reflects immediately
      setProduct((prev) => prev ? ({
        ...prev,
        ...data,
        productionDate: prodStr,
        expiryDate: expStr,
      }) : null);

      if (category.trim()) {
        try {
          const { addManagedCategory } = await import('@/lib/sqlite');
          await addManagedCategory(category.trim());
        } catch {
          // ignore duplicate
        }
      }

      if (imageUri) {
        try {
          useSavedProductStore.getState().savePreset({
            name: name.trim() || undefined,
            description: itemDescription.trim() || description.trim() || null,
            imageUri,
            category: category?.trim() || null,
          });
        } catch { /* non-critical */ }
      }

      // Animate changed fields
      if (changed.size > 0) {
        setChangedFields(changed);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setChangedFields(new Set()), 2000);
      }

      Alert.alert(
        t('common.done'),
        isKuLanguage ? 'گۆڕانکارییەکان بەسەرکەوتوویی پاشەکەوت کران' : t('inventory.saveChanges'),
        [
          {
            text: isKuLanguage ? 'گەڕانەوە' : t('common.back', 'Back'),
            onPress: () => router.back(),
          },
          {
            text: isKuLanguage ? 'مانەوە لەم پەڕەیە' : t('common.done', 'Done'),
            style: 'cancel',
          },
        ]
      );
    } catch (err) {
      console.error('Failed to save product:', err);
      Alert.alert(t('common.error'), t('inventory.errorSave'));
    } finally {
      setSaving(false);
    }
  }, [
    product,
    name,
    itemDescription,
    category,
    sellIQD,
    sellUSD,
    warranty,
    description,
    notes,
    imageUri,
    lowStockThreshold,
    websiteDescription,
    productionDate,
    expiryDate,
    editProduct,
    router,
    t,
    isKuLanguage,
  ]);

  const fieldBg = (key: FieldKey) =>
    changedFields.has(key) ? colors.softBlue : 'transparent';

  const numId = Number(id);
  if (!id || isNaN(numId)) {
    return (
      <View style={[styles.loadWrap, { backgroundColor: colors.gray50 }]}>
        <AppHeader title={t('inventory.editProduct')} showBack />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadWrap, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.loadWrap, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Product not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.gray50 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader title={t('inventory.editProduct')} showBack />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Image */}
        <MotiView
          animate={{ backgroundColor: fieldBg('imageUri') }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.imageSection}
        >
          <ProductImagePicker
            uri={imageUri}
            onSelect={setImageUri}
            onRemove={() => setImageUri(null)}
            label={t('inventory.productImage')}
          />
        </MotiView>

        {/* Name */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>{t('inventory.productInfo')}</Text>

          <MotiView animate={{ backgroundColor: fieldBg('name') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('inventory.productName')}</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign },
                isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: name }), {}),
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t('inventory.productName')}
              placeholderTextColor={colors.gray300}
              onFocus={scrollIntoView}
            />
          </MotiView>

          {/* Item Description */}
          <MotiView animate={{ backgroundColor: fieldBg('itemDescription') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign },
                isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: itemDescription }), {}),
              ]}
              value={itemDescription}
              onChangeText={setItemDescription}
              placeholder={t('inventory.itemDescriptionPlaceholder')}
              placeholderTextColor={colors.gray300}
              maxLength={30}
              onFocus={scrollIntoView}
            />
          </MotiView>

          {/* Category */}
          <MotiView animate={{ backgroundColor: fieldBg('category') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <CategoryAutocompleteInput
              label={t('inventory.category')}
              value={category}
              onChange={setCategory}
              categories={availableCategories}
            />
          </MotiView>
        </View>

        {/* Pricing */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>{t('inventory.pricing')}</Text>

          <View style={[styles.priceRow, { flexDirection }]}>
            <View style={{ flex: 1 }}>
              <LockedFieldRow
                label={`${t('inventory.buyPrice')} (IQD)`}
                value={fmtIQD(product.purchasePrice)}
                caption={t('inventory.buyPriceLockedNote')}
                valueNumeric
              />
            </View>
            <View style={{ flex: 1 }}>
              <LockedFieldRow
                label={`${t('inventory.buyPrice')} (USD)`}
                value={fmtUSD(product.buyPriceUsd)}
                valueNumeric
              />
            </View>
          </View>

          <Text style={[styles.subLabel, { marginTop: 12, color: colors.gray500, textAlign }]}>{t('inventory.sellPrice')}</Text>
          <View style={[styles.priceRow, { flexDirection }]}>
            <MotiView animate={{ backgroundColor: fieldBg('sellPriceIQD') }} transition={{ type: 'timing', duration: 600 }} style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.white, flexDirection }]}>
              <Text style={[styles.priceCurrency, { color: colors.gray400 }]}>IQD</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.black, textAlign: 'left', writingDirection: 'ltr' }]}
                value={sellIQD}
                onChangeText={syncSellIQD}
                onEndEditing={() => {
                  const r = roundToNearest250(parseFloat(sellIQD) || 0);
                  setSellIQD(String(r));
                  setSellUSD(String(roundUSD(r / exchangeRate)));
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray300}
                onFocus={scrollIntoView}
              />
            </MotiView>
            <MotiView animate={{ backgroundColor: fieldBg('sellPriceUSD') }} transition={{ type: 'timing', duration: 600 }} style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.white, flexDirection }]}>
              <Text style={[styles.priceCurrency, { color: colors.gray400 }]}>USD</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.black, textAlign: 'left', writingDirection: 'ltr' }]}
                value={sellUSD}
                onChangeText={syncSellUSD}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.gray300}
                onFocus={scrollIntoView}
              />
            </MotiView>
          </View>
        </View>

        {/* Quantity */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>{t('inventory.stock')}</Text>
          <LockedFieldRow
            label={t('inventory.quantity')}
            value={String(product.quantity)}
            caption={t('inventory.quantityLockedNote')}
            valueNumeric
          />

          <MotiView
            animate={{ backgroundColor: fieldBg('lowStockThreshold') }}
            transition={{ type: 'timing', duration: 600 }}
            style={styles.fieldWrap}
          >
            <View style={[styles.alertLabelRow, { flexDirection }]}>
              <Ionicons name="notifications-outline" size={13} color={colors.warning} />
              <Text style={[styles.label, { color: colors.gray500, marginBottom: 0, textAlign }]}>{t('inventory.productAlertOverride')}</Text>
            </View>
            <Text style={[styles.hintText, { color: colors.gray400, marginBottom: 6, textAlign }]}>
              {t('inventory.productAlertOverrideHint', { threshold: globalLowStockThreshold })}
            </Text>
            <View style={[styles.alertInputRow, { flexDirection }]}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: lowStockThreshold ? '#FDE68A' : colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign: 'left', writingDirection: 'ltr' }]}
                value={toEnglishDigits(lowStockThreshold)}
                onChangeText={(v) => setLowStockThreshold(toEnglishDigits(v))}
                keyboardType="number-pad"
                placeholder={String(globalLowStockThreshold)}
                placeholderTextColor={colors.gray300}
                onFocus={scrollIntoView}
              />
              {lowStockThreshold.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => setLowStockThreshold('')}
                  style={[styles.clearBtn, { backgroundColor: colors.gray100 }]}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color={colors.gray500} />
                </TouchableOpacity>
              )}
            </View>
          </MotiView>
        </View>

        {/* Expiry & Production Dates */}
        {(expiryTrackingEnabled || (product && (product.expiryDate || product.productionDate))) && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#1E293B' : colors.white,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                padding: 13,
                borderRadius: 16,
              },
            ]}
          >
            <View style={[styles.sectionHeaderRow, { flexDirection, marginBottom: 8, gap: 8 }]}>
              <Ionicons name="time-outline" size={17} color="#F59E0B" />
              <Text style={[styles.cardTitle, { color: colors.black, textAlign, marginBottom: 0, fontSize: 13 }]}>
                {isKuLanguage ? 'بەرواری بەسەرچوون و دەرچوون' : 'Production & Expiry Dates'}
              </Text>
            </View>

            {(() => {
              const prodAgeText = productionDate ? formatProductionAge(productionDate, isKuLanguage) : null;
              const expiryCountdown = expiryDate ? formatExpiryCountdown(expiryDate, isKuLanguage) : null;

              return (
                <>
                  {/* Production Date */}
                  <View style={[styles.fieldWrap, { marginTop: 6, marginBottom: 8 }]}>
                    <Text style={[styles.label, { fontSize: 12, color: colors.gray500, textAlign, marginBottom: 4 }]}>
                      {isKuLanguage ? 'بەرواری دەرچوون / دروستکردن' : 'Production Date'}
                    </Text>
                    <View style={[styles.dateActionRow, { flexDirection, gap: 6 }]}>
                      <TouchableOpacity
                        onPress={() => setShowProdPicker(true)}
                        style={[
                          styles.dateBtn,
                          {
                            height: 38,
                            borderRadius: 9,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : colors.gray200,
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : undefined,
                            flexDirection,
                            paddingHorizontal: 10,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="construct-outline" size={16} color={colors.primary} />
                        <Text style={[styles.dateBtnText, { fontSize: 13, color: productionDate ? colors.black : colors.gray400, flex: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                          {productionDate ? toDateOnly(productionDate) : (isKuLanguage ? 'دیاری نەکراوە' : 'Not set')}
                        </Text>
                        <Ionicons name="calendar-outline" size={14} color={colors.gray400} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setProductionDate(new Date())}
                        style={[
                          styles.quickBtn,
                          {
                            height: 38,
                            borderRadius: 9,
                            paddingHorizontal: 10,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray100,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.quickBtnText, { fontSize: 12, color: colors.black }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                          {isKuLanguage ? 'ئەمڕۆ' : 'Today'}
                        </Text>
                      </TouchableOpacity>

                      {productionDate && (
                        <TouchableOpacity
                          onPress={() => setProductionDate(null)}
                          style={[
                            styles.quickBtn,
                            {
                              height: 38,
                              width: 38,
                              borderRadius: 9,
                              paddingHorizontal: 0,
                              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {productionDate && prodAgeText && (
                      <View style={[styles.dateCountdownSubRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="construct-outline" size={11} color={colors.primary} />
                        <Text style={[styles.dateCountdownSubText, { color: colors.gray500, writingDirection: isKuLanguage ? 'rtl' : 'ltr' }, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                          {prodAgeText}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Expiry Date */}
                  <View style={[styles.fieldWrap, { marginTop: 4, marginBottom: 4 }]}>
                    <Text style={[styles.label, { fontSize: 12, color: colors.gray500, textAlign, marginBottom: 4 }]}>
                      {isKuLanguage ? 'بەرواری بەسەرچوون' : 'Expiry Date'}
                    </Text>
                    <View style={[styles.dateActionRow, { flexDirection, gap: 6 }]}>
                      <TouchableOpacity
                        onPress={() => setShowExpPicker(true)}
                        style={[
                          styles.dateBtn,
                          {
                            height: 38,
                            borderRadius: 9,
                            borderColor: expiryDate
                              ? expiryCountdown?.status === 'expired'
                                ? colors.error
                                : expiryCountdown?.status === 'warning'
                                ? '#F59E0B'
                                : colors.primary
                              : isDark
                              ? 'rgba(255, 255, 255, 0.10)'
                              : colors.gray200,
                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.70)' : undefined,
                            flexDirection,
                            paddingHorizontal: 10,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={16}
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
                            styles.dateBtnText,
                            {
                              fontSize: 13,
                              color: expiryDate ? (isDark ? '#FBBF24' : '#D97706') : colors.gray400,
                              fontWeight: expiryDate ? '700' : 'normal',
                              textAlign: isRTL ? 'right' : 'left',
                            },
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

                        <Ionicons name="create-outline" size={14} color={colors.gray400} style={{ marginStart: 'auto' }} />
                      </TouchableOpacity>

                      {expiryDate && (
                        <TouchableOpacity
                          onPress={() => setExpiryDate(null)}
                          style={[
                            styles.quickBtn,
                            {
                              height: 38,
                              width: 38,
                              borderRadius: 9,
                              paddingHorizontal: 0,
                              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                            },
                          ]}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Notice Banner */}
                    {expiryCountdown && (
                      <View
                        style={[
                          styles.expiryNoticeBanner,
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
                          size={14}
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
                  </View>
                </>
              );
            })()}

              {/* Quick shortcut chips */}
              <View style={[styles.quickExpiryRow, { flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'nowrap', gap: 5, marginTop: 6 }]}>
                {[
                  { label: isKuLanguage ? '+١ مانگ' : '+1M', m: 1 },
                  { label: isKuLanguage ? '+٣ مانگ' : '+3M', m: 3 },
                  { label: isKuLanguage ? '+٦ مانگ' : '+6M', m: 6 },
                  { label: isKuLanguage ? '+١ ساڵ' : '+1Y', m: 12 },
                  { label: isKuLanguage ? '+٢ ساڵ' : '+2Y', m: 24 },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.m}
                    onPress={() => {
                      const d = new Date(productionDate || new Date());
                      d.setMonth(d.getMonth() + c.m);
                      setExpiryDate(d);
                    }}
                    style={[
                      styles.expiryChip,
                      {
                        flex: 1,
                        paddingHorizontal: 2,
                        paddingVertical: 6,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FEF3C7',
                        borderColor: isDark ? 'rgba(245, 158, 11, 0.28)' : '#FDE68A',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.expiryChipText,
                        { fontSize: 11, color: isDark ? '#FBBF24' : '#B45309', textAlign: 'center' },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

            {/* Production Date Modal */}
            <DatePickerModal
              visible={showProdPicker}
              onClose={() => setShowProdPicker(false)}
              currentDate={productionDate}
              onSelect={(d) => setProductionDate(d)}
              onClear={() => setProductionDate(null)}
              mode="production"
              title={isKuLanguage ? 'دیاریکردنی بەرواری دەرچوون' : 'Select Production Date'}
            />

            {/* Expiry Date Modal */}
            <DatePickerModal
              visible={showExpPicker}
              onClose={() => setShowExpPicker(false)}
              currentDate={expiryDate}
              onSelect={(d) => setExpiryDate(d)}
              onClear={() => setExpiryDate(null)}
              mode="expiry"
              title={isKuLanguage ? 'دیاریکردنی بەرواری بەسەرچوون' : 'Select Expiry Date'}
            />
          </View>
        )}

        {/* Additional */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>{t('inventory.additionalInfo')}</Text>

          <MotiView animate={{ backgroundColor: fieldBg('warranty') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('inventory.warranty')}</Text>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign },
                isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: warranty }), {}),
              ]}
              value={warranty}
              onChangeText={setWarranty}
              placeholder={t('sales.warrantyPlaceholder')}
              placeholderTextColor={colors.gray300}
              onFocus={scrollIntoView}
            />
          </MotiView>

          <MotiView animate={{ backgroundColor: fieldBg('description') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('inventory.description')}</Text>
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign },
                isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: description }), {}),
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('inventory.description')}
              placeholderTextColor={colors.gray300}
              multiline
              numberOfLines={3}
              onFocus={scrollIntoView}
            />
          </MotiView>

          <MotiView animate={{ backgroundColor: fieldBg('notes') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('inventory.notes')}</Text>
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign },
                isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: notes }), {}),
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('inventory.notes')}
              placeholderTextColor={colors.gray300}
              multiline
              numberOfLines={3}
              onFocus={scrollIntoView}
            />
          </MotiView>

          <MotiView animate={{ backgroundColor: fieldBg('websiteDescription') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <View style={{ flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.label, { color: colors.gray500, textAlign, marginBottom: 0 }]}>{t('inventory.websiteDescription')}</Text>
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
                  if (description?.trim()) {
                    setWebsiteDescription(description.trim().slice(0, 30));
                  } else if (notes?.trim()) {
                    setWebsiteDescription(notes.trim().slice(0, 30));
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={12} color={isDark ? '#FBBF24' : '#B45309'} />
                <Text style={[{ fontSize: 11, fontWeight: '700', color: isDark ? '#FBBF24' : '#B45309' }, isKuLanguage && applyKurdishFont(true, {})]}>
                  {t('inventory.sameAsItemDescription')}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.input,
                { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign },
                isKuLanguage && applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: websiteDescription }), {}),
              ]}
              value={websiteDescription}
              onChangeText={setWebsiteDescription}
              placeholder={t('inventory.websiteDescriptionPlaceholder')}
              placeholderTextColor={colors.gray300}
              maxLength={30}
              onFocus={scrollIntoView}
            />
            <Text style={[styles.hintText, { color: colors.gray400, marginTop: 6, textAlign }]}>
              {t('inventory.websiteDescriptionHint')}
            </Text>
          </MotiView>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, flexDirection }, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={[styles.saveBtnText, isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {isKuLanguage ? 'پاشەکەوتکردنی گۆڕانکارییەکان' : 'Save Changes'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  loadWrap:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:         { fontSize: 15 },
  scroll:           { padding: 16, paddingBottom: 48 },
  imageSection:     { marginBottom: 14, borderRadius: Theme.radius.card, padding: 12 },
  card:             { borderRadius: Theme.radius.card, padding: 16, marginBottom: 14, ...Theme.shadow.soft },
  cardTitle:        { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  fieldWrap:        { borderRadius: Theme.radius.md, paddingVertical: 4, paddingHorizontal: 2, marginBottom: 14 },
  label:            { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input:            { height: Theme.input.height, borderWidth: 1.5, borderRadius: Theme.input.borderRadius, paddingHorizontal: 14, fontSize: 15 },
  textarea:         { height: 88, textAlignVertical: 'top', paddingTop: 12 },
  subLabel:         { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  priceRow:         { flexDirection: 'row', gap: 10 },
  priceField:       { flex: 1, borderWidth: 1.5, borderRadius: Theme.input.borderRadius, paddingHorizontal: 12, height: Theme.input.height, flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceCurrency:    { fontSize: 12, fontWeight: '700', width: 28 },
  priceInput:       { flex: 1, fontSize: 15, height: '100%' },
  saveBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Theme.radius.md, paddingVertical: 16, marginTop: 4, ...Theme.shadow.button },
  saveBtnDisabled:  { opacity: 0.65 },
  saveBtnText:      { fontSize: 16, fontWeight: '700', color: '#fff' },
  alertLabelRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  hintText:         { fontSize: 11, lineHeight: 15 },
  alertInputRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn:         { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionHeaderRow: { alignItems: 'center', gap: 8, marginBottom: 12 },
  dateActionRow:    { alignItems: 'center', gap: 8, width: '100%' },
  dateBtn:          { flex: 1, height: Theme.input.height, borderWidth: 1.5, borderRadius: Theme.input.borderRadius, paddingHorizontal: 12, alignItems: 'center', gap: 8 },
  dateBtnText:      { fontSize: 14, fontWeight: '600' },
  quickBtn:         { height: Theme.input.height, paddingHorizontal: 14, borderRadius: Theme.input.borderRadius, alignItems: 'center', justifyContent: 'center' },
  quickBtnText:     { fontSize: 13, fontWeight: '600' },
  quickExpiryRow:   { flexWrap: 'wrap', gap: 6, marginTop: 8 },
  expiryChip:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  expiryChipText:   { fontSize: 12, fontWeight: '700' },
  dateCountdownSubRow: {
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
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
    marginTop: 6,
    marginBottom: 2,
  },
  expiryNoticeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
