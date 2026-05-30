import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { AppHeader } from '@/components/common/AppHeader';

import { useTranslation } from 'react-i18next';
import { getInventoryProductById } from '@/lib/sqlite';
import { useInventoryStore } from '@/store/inventoryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import type { InventoryProduct, NewProductData } from '@/types/inventory';

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Produce', 'Medicine', 'Tools', 'General', 'Other'];

type FieldKey =
  | 'name' | 'category' | 'buyPriceIQD' | 'buyPriceUSD'
  | 'sellPriceIQD' | 'sellPriceUSD' | 'quantity'
  | 'warranty' | 'description' | 'notes' | 'imageUri';

export default function EditProductScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { editProduct } = useInventoryStore();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<InventoryProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName]               = useState('');
  const [category, setCategory]       = useState('');
  const [buyIQD, setBuyIQD]           = useState('');
  const [buyUSD, setBuyUSD]           = useState('');
  const [sellIQD, setSellIQD]         = useState('');
  const [sellUSD, setSellUSD]         = useState('');
  const [quantity, setQuantity]       = useState('');
  const [warranty, setWarranty]       = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes]             = useState('');
  const [imageUri, setImageUri]       = useState<string | null>(null);

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
        setBuyIQD(String(p.purchasePrice));
        setBuyUSD(String(p.buyPriceUsd));
        setSellIQD(String(p.sellingPrice));
        setSellUSD(String(p.sellPriceUsd));
        setQuantity(String(p.quantity));
        setWarranty(p.warranty ?? '');
        setDescription(p.description ?? '');
        setNotes(p.notes ?? '');
        setImageUri(p.imageUri ?? null);
      }
      setLoading(false);
    })();
    return () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); };
  }, [id]);

  const syncBuyIQD = (val: string) => {
    setBuyIQD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) setBuyUSD(String(Math.round((n / exchangeRate) * 100) / 100));
  };

  const syncBuyUSD = (val: string) => {
    setBuyUSD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) setBuyIQD(String(Math.round(n * exchangeRate)));
  };

  const syncSellIQD = (val: string) => {
    setSellIQD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) setSellUSD(String(Math.round((n / exchangeRate) * 100) / 100));
  };

  const syncSellUSD = (val: string) => {
    setSellUSD(val);
    const n = parseFloat(val);
    if (!isNaN(n)) setSellIQD(String(Math.round(n * exchangeRate)));
  };

  const pickImage = useCallback(async () => {
    try {
      const { launchImageLibraryAsync, MediaType } = await import('expo-image-picker');
      const result = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: false,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!product) return;
    if (!name.trim()) { Alert.alert(t('common.required'), t('inventory.errorSave')); return; }
    const buyPrice  = parseFloat(buyIQD);
    const sellPrice = parseFloat(sellIQD);
    const qty       = parseInt(quantity, 10);
    if (isNaN(buyPrice) || buyPrice < 0)  { Alert.alert(t('common.error'), t('inventory.errorSave')); return; }
    if (isNaN(sellPrice) || sellPrice < 0) { Alert.alert(t('common.error'), t('inventory.errorSave')); return; }
    if (isNaN(qty) || qty < 0)            { Alert.alert(t('common.error'), t('inventory.errorSave')); return; }

    // Detect which fields changed
    const changed = new Set<FieldKey>();
    if (name.trim() !== product.name)            changed.add('name');
    if (category !== product.category)           changed.add('category');
    if (buyPrice !== product.purchasePrice)      changed.add('buyPriceIQD');
    if (sellPrice !== product.sellingPrice)      changed.add('sellPriceIQD');
    if (qty !== product.quantity)                changed.add('quantity');
    if (warranty.trim() !== (product.warranty ?? ''))       changed.add('warranty');
    if (description.trim() !== (product.description ?? '')) changed.add('description');
    if (notes.trim() !== (product.notes ?? ''))             changed.add('notes');
    if (imageUri !== product.imageUri)           changed.add('imageUri');

    setSaving(true);
    try {
      const data: Partial<NewProductData> = {
        name:          name.trim(),
        category,
        purchasePrice: buyPrice,
        buyPriceUsd:   parseFloat(buyUSD) || 0,
        sellingPrice:  sellPrice,
        sellPriceUsd:  parseFloat(sellUSD) || 0,
        quantity:      qty,
        warranty:      warranty.trim() || null,
        description:   description.trim() || null,
        notes:         notes.trim() || null,
        imageUri,
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
  }, [product, name, category, buyIQD, buyUSD, sellIQD, sellUSD, quantity, warranty, description, notes, imageUri, editProduct]);

  const fieldBg = (key: FieldKey) =>
    changedFields.has(key) ? Colors.softBlue : 'transparent';

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
        <ActivityIndicator size="large" color={Colors.primary} />
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
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <AppHeader title={t('inventory.editProduct')} showBack />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image */}
        <MotiView
          animate={{ backgroundColor: fieldBg('imageUri') }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.imageSection}
        >
          <TouchableOpacity style={[styles.imageWrap, { backgroundColor: colors.gray100 }]} onPress={pickImage} activeOpacity={0.8}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={32} color={colors.gray400} />
                <Text style={[styles.imagePlaceholderText, { color: colors.gray400 }]}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImage}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.removeImageText, { color: colors.error }]}>Remove</Text>
            </TouchableOpacity>
          )}
        </MotiView>

        {/* Name */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400 }]}>Product Info</Text>

          <MotiView animate={{ backgroundColor: fieldBg('name') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Product Name *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white }]}
              value={name}
              onChangeText={setName}
              placeholder="Product name"
              placeholderTextColor={colors.gray300}
            />
          </MotiView>

          {/* Category */}
          <MotiView animate={{ backgroundColor: fieldBg('category') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.catChip,
                    category === c
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { borderColor: colors.gray200, backgroundColor: colors.white }
                  ]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.catChipText, { color: category === c ? colors.white : colors.gray600 }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </MotiView>
        </View>

        {/* Pricing */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400 }]}>Pricing</Text>

          <Text style={[styles.subLabel, { color: colors.gray500 }]}>Buy Price</Text>
          <View style={styles.priceRow}>
            <MotiView animate={{ backgroundColor: fieldBg('buyPriceIQD') }} transition={{ type: 'timing', duration: 600 }} style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.white }]}>
              <Text style={[styles.priceCurrency, { color: colors.gray400 }]}>IQD</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.black }]}
                value={buyIQD}
                onChangeText={syncBuyIQD}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray300}
              />
            </MotiView>
            <MotiView animate={{ backgroundColor: fieldBg('buyPriceUSD') }} transition={{ type: 'timing', duration: 600 }} style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.white }]}>
              <Text style={[styles.priceCurrency, { color: colors.gray400 }]}>USD</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.black }]}
                value={buyUSD}
                onChangeText={syncBuyUSD}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.gray300}
              />
            </MotiView>
          </View>

          <Text style={[styles.subLabel, { marginTop: 12, color: colors.gray500 }]}>Sell Price</Text>
          <View style={styles.priceRow}>
            <MotiView animate={{ backgroundColor: fieldBg('sellPriceIQD') }} transition={{ type: 'timing', duration: 600 }} style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.white }]}>
              <Text style={[styles.priceCurrency, { color: colors.gray400 }]}>IQD</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.black }]}
                value={sellIQD}
                onChangeText={syncSellIQD}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.gray300}
              />
            </MotiView>
            <MotiView animate={{ backgroundColor: fieldBg('sellPriceUSD') }} transition={{ type: 'timing', duration: 600 }} style={[styles.priceField, { borderColor: colors.gray200, backgroundColor: colors.white }]}>
              <Text style={[styles.priceCurrency, { color: colors.gray400 }]}>USD</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.black }]}
                value={sellUSD}
                onChangeText={syncSellUSD}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.gray300}
              />
            </MotiView>
          </View>
        </View>

        {/* Quantity */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400 }]}>Stock</Text>
          <MotiView animate={{ backgroundColor: fieldBg('quantity') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Quantity</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white }]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.gray300}
            />
          </MotiView>
        </View>

        {/* Additional */}
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Text style={[styles.cardTitle, { color: colors.gray400 }]}>Additional Info</Text>

          <MotiView animate={{ backgroundColor: fieldBg('warranty') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Warranty</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white }]}
              value={warranty}
              onChangeText={setWarranty}
              placeholder="e.g. 1 year"
              placeholderTextColor={colors.gray300}
            />
          </MotiView>

          <MotiView animate={{ backgroundColor: fieldBg('description') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Product description…"
              placeholderTextColor={colors.gray300}
              multiline
              numberOfLines={3}
            />
          </MotiView>

          <MotiView animate={{ backgroundColor: fieldBg('notes') }} transition={{ type: 'timing', duration: 600 }} style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.gray500 }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: colors.gray200, color: colors.black, backgroundColor: colors.white }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Internal notes…"
              placeholderTextColor={colors.gray300}
              multiline
              numberOfLines={3}
            />
          </MotiView>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && styles.saveBtnDisabled]}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  loadWrap:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound:         { fontSize: 15 },
  gradHeader:       { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16 },
  scroll:           { padding: 16, paddingBottom: 48 },
  imageSection:     { alignItems: 'center', marginBottom: 14, borderRadius: Theme.radius.card, padding: 12 },
  imageWrap:        { width: 110, height: 110, borderRadius: 20, overflow: 'hidden' },
  imagePreview:     { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  imagePlaceholderText: { fontSize: 12, fontWeight: '500' },
  removeImage:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  removeImageText:  { fontSize: 12, fontWeight: '600' },
  card:             { borderRadius: Theme.radius.card, padding: 16, marginBottom: 14, ...Theme.shadow.soft },
  cardTitle:        { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  fieldWrap:        { borderRadius: Theme.radius.md, paddingVertical: 4, paddingHorizontal: 2, marginBottom: 14 },
  label:            { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input:            { height: Theme.input.height, borderWidth: 1.5, borderRadius: Theme.input.borderRadius, paddingHorizontal: 14, fontSize: 15 },
  textarea:         { height: 88, textAlignVertical: 'top', paddingTop: 12 },
  categoryRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Theme.radius.full, borderWidth: 1.5 },
  catChipActive:    {},
  catChipText:      { fontSize: 13, fontWeight: '600' },
  catChipTextActive:{},
  subLabel:         { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  priceRow:         { flexDirection: 'row', gap: 10 },
  priceField:       { flex: 1, borderWidth: 1.5, borderRadius: Theme.input.borderRadius, paddingHorizontal: 12, height: Theme.input.height, flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceCurrency:    { fontSize: 12, fontWeight: '700', width: 28 },
  priceInput:       { flex: 1, fontSize: 15, height: '100%' },
  saveBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Theme.radius.md, paddingVertical: 16, marginTop: 4, ...Theme.shadow.button },
  saveBtnDisabled:  { opacity: 0.65 },
  saveBtnText:      { fontSize: 16, fontWeight: '700', color: '#fff' },
});
