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
import { useLocalSearchParams } from 'expo-router';
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
import { fmtIQD, fmtUSD } from '@/utils/formatters';


type FieldKey =
  | 'name' | 'category'
  | 'sellPriceIQD' | 'sellPriceUSD' | 'lowStockThreshold'
  | 'warranty' | 'description' | 'notes' | 'imageUri' | 'websiteDescription';

export default function EditProductScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { editProduct, categories: availableCategories } = useInventoryStore();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
  const globalLowStockThreshold = useSettingsStore((s) => s.globalLowStockThreshold);
  const { colors } = useAppTheme();
  const { flexDirection, textAlign } = useRTL();
  const insets = useSafeAreaInsets();
  const scrollIntoView = useKeyboardAwareFocus();

  const [product, setProduct] = useState<InventoryProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName]               = useState('');
  const [category, setCategory]       = useState('');
  const [sellIQD, setSellIQD]         = useState('');
  const [sellUSD, setSellUSD]         = useState('');
  const [warranty, setWarranty]       = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes]             = useState('');
  const [imageUri, setImageUri]       = useState<string | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [websiteDescription, setWebsiteDescription] = useState('');

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
        setCategory(p.category);
        setSellIQD(String(p.sellingPrice));
        setSellUSD(String(p.sellPriceUsd));
        setWarranty(p.warranty ?? '');
        setDescription(p.description ?? '');
        setNotes(p.notes ?? '');
        setImageUri(p.imageUri ?? null);
        setLowStockThreshold(p.lowStockThreshold != null ? String(p.lowStockThreshold) : '');
        setWebsiteDescription(p.websiteDescription ?? '');
      }
      setLoading(false);
    })();
    return () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); };
  }, [id]);

  const syncSellIQD = (val: string) => {
    setSellIQD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) setSellUSD(String(roundUSD(n / exchangeRate)));
  };

  const syncSellUSD = (val: string) => {
    setSellUSD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) setSellIQD(String(roundToNearest250(n * exchangeRate)));
  };

  const handleSave = useCallback(async () => {
    if (!product) return;
    if (!name.trim()) { Alert.alert(t('common.required'), t('inventory.errorSave')); return; }
    const sellPrice = roundToNearest250(parseFloat(sellIQD) || 0);
    if (isNaN(sellPrice) || sellPrice < 0) { Alert.alert(t('common.error'), t('inventory.errorSave')); return; }

    // Detect which fields changed
    const changed = new Set<FieldKey>();
    if (name.trim() !== product.name)            changed.add('name');
    if (category !== product.category)           changed.add('category');
    if (sellPrice !== product.sellingPrice)      changed.add('sellPriceIQD');
    if (warranty.trim() !== (product.warranty ?? ''))       changed.add('warranty');
    if (description.trim() !== (product.description ?? '')) changed.add('description');
    if (notes.trim() !== (product.notes ?? ''))             changed.add('notes');
    if (imageUri !== product.imageUri)           changed.add('imageUri');
    if (websiteDescription.trim() !== (product.websiteDescription ?? '')) changed.add('websiteDescription');
    const parsedThreshold = lowStockThreshold.trim() ? parseInt(lowStockThreshold, 10) : null;
    if (parsedThreshold !== (product.lowStockThreshold ?? null)) changed.add('lowStockThreshold');

    setSaving(true);
    try {
      const data: Partial<NewProductData> = {
        name:               name.trim(),
        category,
        sellingPrice:       sellPrice,
        sellPriceUsd:       parseFloat(sellUSD) || 0,
        warranty:           warranty.trim() || null,
        description:        description.trim() || null,
        notes:              notes.trim() || null,
        imageUri,
        lowStockThreshold:  (!isNaN(parsedThreshold as number) && parsedThreshold !== null && (parsedThreshold as number) > 0) ? parsedThreshold : null,
        lowStockEnabled:    null,
        websiteDescription: websiteDescription.trim() || null,
      };
      await editProduct(product.id, data);

      // Animate changed fields
      if (changed.size > 0) {
        setChangedFields(changed);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setChangedFields(new Set()), 2000);
      }

      Alert.alert(t('common.done'), t('inventory.saveChanges'), [{ text: t('common.done') }]);
    } catch (err) {
      console.error('Failed to save product:', err);
      Alert.alert(t('common.error'), t('inventory.errorSave'));
    } finally {
      setSaving(false);
    }
  }, [product, name, category, sellIQD, sellUSD, warranty, description, notes, imageUri, lowStockThreshold, websiteDescription, editProduct]);

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
              style={[styles.input, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign }]}
              value={name}
              onChangeText={setName}
              placeholder={t('inventory.productName')}
              placeholderTextColor={colors.gray300}
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
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
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

        {/* Additional */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400, textAlign }]}>{t('inventory.additionalInfo')}</Text>

          <MotiView animate={{ backgroundColor: fieldBg('warranty') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('inventory.warranty')}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign }]}
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
              style={[styles.input, styles.textarea, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign }]}
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
              style={[styles.input, styles.textarea, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign }]}
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
            <Text style={[styles.label, { color: colors.gray500, textAlign }]}>{t('inventory.websiteDescription')}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white, textAlign }]}
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
              <Text style={styles.saveBtnText}>Save Changes</Text>
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
});
