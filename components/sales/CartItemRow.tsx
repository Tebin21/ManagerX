import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { roundToNearest250, roundUSD } from '@/utils/rounding';
import { fmtIQD, fmtUSD, fmtExchangeRate, toEnglishDigits, sanitizeNumericInput } from '@/utils/formatters';
import { useTranslation } from 'react-i18next';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { applyKurdishFont, resolveInputIsKurdish, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import { BatchPickerModal } from '@/components/sales/BatchPickerModal';
import { getProductBatches } from '@/lib/sqlite';
import type { CartItem, DiscountType, ProductBatch } from '@/types/sales';

interface Props {
  item: CartItem;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice: (price: number) => void;
  onUpdateDiscount: (discount: number) => void;
  onUpdateDiscountType: (type: DiscountType) => void;
  onUpdateDiscountPct: (pct: number) => void;
  onUpdateBatch?: (batch: ProductBatch) => void;
  onRemove: () => void;
}

export function CartItemRow({
  item,
  onUpdateQty,
  onUpdatePrice,
  onUpdateDiscount,
  onUpdateDiscountType,
  onUpdateDiscountPct,
  onUpdateBatch,
  onRemove,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const isUSD = baseCurrency === 'USD';
  const exchangeRate = useSettingsStore((s) => s.exchangeRate) || 1310;
  const scrollIntoView = useKeyboardAwareFocus();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const [batchPickerOpen, setBatchPickerOpen] = useState(false);
  const [batches, setBatches] = useState<ProductBatch[]>(item.availableBatches ?? []);

  React.useEffect(() => {
    let isMounted = true;
    if (!item.availableBatches || item.availableBatches.length === 0) {
      getProductBatches(item.product.id, item.product.name, item.product.itemId).then((b) => {
        if (isMounted) {
          setBatches(b);
          const isSelectedValid = item.selectedBatch && b.some(
            (batch) => batch.purchaseId === item.selectedBatch?.purchaseId && (batch.quantity ?? 0) > 0
          );
          if (!isSelectedValid && onUpdateBatch && b.length > 0) {
            onUpdateBatch(b[0]);
          }
        }
      });
    } else {
      setBatches(item.availableBatches);
    }
    return () => { isMounted = false; };
  }, [item.product.id, item.availableBatches]);

  const effectiveBatches = (item.availableBatches && item.availableBatches.length > 0) ? item.availableBatches : batches;
  const inStockBatches = effectiveBatches.filter((b) => (b.quantity ?? 0) > 0);
  const hasMultipleBatches = inStockBatches.length >= 2;

  const [iqdPriceText, setIqdPriceText] = useState(String(item.sellingPrice));
  const [usdPrice, setUsdPrice] = useState(
    item.sellingPrice > 0 ? String(roundUSD(item.sellingPrice / exchangeRate)) : ''
  );
  const [iqdFocused, setIqdFocused] = useState(false);
  const [usdFocused, setUsdFocused] = useState(false);
  const [discountFocused, setDiscountFocused] = useState(false);
  const [discountText, setDiscountText] = useState(
    item.discountType === 'percentage'
      ? (item.discountPct > 0 ? String(item.discountPct) : '')
      : (isUSD
          ? (item.discount > 0 ? String(roundUSD(item.discount / exchangeRate)) : '')
          : (item.discount > 0 ? String(item.discount) : ''))
  );

  const hasActiveDiscount =
    item.discountType === 'percentage' ? item.discountPct > 0 : item.discount > 0;
  const [showDiscountSection, setShowDiscountSection] = useState(hasActiveDiscount);

  useEffect(() => {
    if (hasActiveDiscount && !showDiscountSection) {
      setShowDiscountSection(true);
    }
  }, [hasActiveDiscount]);

  function toggleDiscountSection() {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch {}
    setShowDiscountSection((prev) => !prev);
  }

  useEffect(() => {
    if (discountFocused) return;
    if (item.discountType === 'percentage') {
      setDiscountText(item.discountPct > 0 ? String(item.discountPct) : '');
    } else {
      if (isUSD) {
        setDiscountText(item.discount > 0 ? String(roundUSD(item.discount / exchangeRate)) : '');
      } else {
        setDiscountText(item.discount > 0 ? String(item.discount) : '');
      }
    }
  }, [item.discount, item.discountPct, item.discountType, isUSD, exchangeRate, discountFocused]);

  function onIqdChange(val: string) {
    const clean = sanitizeNumericInput(val, 'decimal-pad');
    setIqdPriceText(clean);
    const n = parseFloat(clean) || 0;
    setUsdPrice(n > 0 ? String(roundUSD(n / exchangeRate)) : '');
    onUpdatePrice(n);
  }

  function onIqdBlur() {
    setIqdFocused(false);
    const clean = sanitizeNumericInput(iqdPriceText, 'decimal-pad');
    const r = roundToNearest250(parseFloat(clean) || 0);
    setIqdPriceText(String(r));
    setUsdPrice(r > 0 ? String(roundUSD(r / exchangeRate)) : '');
    onUpdatePrice(r);
  }

  function onUsdChange(val: string) {
    const clean = sanitizeNumericInput(val, 'decimal-pad');
    setUsdPrice(clean);
    const n = parseFloat(clean) || 0;
    const iqd = n > 0 ? roundToNearest250(n * exchangeRate) : 0;
    setIqdPriceText(n > 0 ? String(iqd) : '');
    onUpdatePrice(iqd);
  }

  function onDiscountChange(val: string) {
    const clean = sanitizeNumericInput(val, 'decimal-pad');
    setDiscountText(clean);
    const n = parseFloat(clean) || 0;
    if (item.discountType === 'percentage') {
      onUpdateDiscountPct(n);
    } else {
      if (isUSD) {
        onUpdateDiscount(n > 0 ? n * exchangeRate : 0);
      } else {
        onUpdateDiscount(n);
      }
    }
  }

  function onDiscountBlur() {
    setDiscountFocused(false);
    if (item.discountType === 'amount') {
      const val = parseFloat(discountText) || 0;
      if (isUSD) {
        const rounded = roundUSD(val);
        setDiscountText(val > 0 ? String(rounded) : '');
        onUpdateDiscount(rounded > 0 ? roundToNearest250(rounded * exchangeRate) : 0);
      } else {
        const r = roundToNearest250(val);
        setDiscountText(val > 0 ? String(r) : '');
        onUpdateDiscount(r);
      }
    }
  }

  function switchDiscountType(type: DiscountType) {
    setDiscountText('');
    onUpdateDiscountType(type);
  }

  const iqdDisplay = iqdFocused
    ? iqdPriceText
    : fmtIQD(parseFloat(iqdPriceText) || 0);

  const usdDisplay = usdFocused
    ? usdPrice
    : fmtUSD(parseFloat(usdPrice) || 0);

  const effectivePrice = item.sellingPrice - item.discount;
  const showDiscountPreview = item.discount > 0;

  const renderIqdField = () => (
    <View
      key="iqd"
      style={[
        styles.currencyFieldStacked,
        {
          borderColor: iqdFocused ? colors.primary : colors.gray200,
          backgroundColor: isDark ? colors.gray100 : colors.gray50,
          flexDirection,
        },
      ]}
    >
      <View style={[styles.currencyBadge, { backgroundColor: colors.softBlue }]}>
        <Text style={[styles.currencyCode, { color: colors.primary }]}>IQD</Text>
      </View>
      <TextInput
        style={[
          styles.currencyInput,
          { color: colors.black, textAlign: 'right', writingDirection: 'ltr' },
          applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: iqdDisplay, placeholder: '0', keyboardType: 'decimal-pad' }), {}),
        ]}
        value={iqdDisplay}
        onChangeText={onIqdChange}
        onFocus={(e) => {
          setIqdFocused(true);
          scrollIntoView(e);
        }}
        onBlur={onIqdBlur}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.gray400}
        selectTextOnFocus
      />
    </View>
  );

  const renderUsdField = () => (
    <View
      key="usd"
      style={[
        styles.currencyFieldStacked,
        {
          borderColor: usdFocused ? colors.primary : colors.gray200,
          backgroundColor: isDark ? colors.gray100 : colors.gray50,
          flexDirection,
        },
      ]}
    >
      <View style={[styles.currencyBadge, { backgroundColor: colors.softBlue }]}>
        <Text style={[styles.currencyCode, { color: colors.primary }]}>USD</Text>
      </View>
      <TextInput
        style={[
          styles.currencyInput,
          { color: colors.black, textAlign: 'right', writingDirection: 'ltr' },
          applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: usdDisplay, placeholder: '0.00', keyboardType: 'decimal-pad' }), {}),
        ]}
        value={usdDisplay}
        onChangeText={onUsdChange}
        onFocus={(e) => {
          setUsdFocused(true);
          scrollIntoView(e);
        }}
        onBlur={() => setUsdFocused(false)}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={colors.gray400}
        selectTextOnFocus
      />
    </View>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? colors.gray100 : colors.white,
          borderColor: isDark ? colors.gray200 : 'transparent',
          borderWidth: isDark ? 1 : 0,
        },
        item.hasLossWarning && { borderStartWidth: 3, borderStartColor: colors.warning },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.titleCol}>
          <View style={[styles.titleRow, { flexDirection, flexWrap: 'wrap', alignItems: 'center', gap: 6 }]}>
            <Text style={[styles.name, { color: colors.black, textAlign }]} numberOfLines={1}>{item.product.name}</Text>
            {item.product.itemId ? (
              <View style={[styles.idBadge, { backgroundColor: colors.softBlue }]}>
                <IdText size="small" style={[styles.idText, { color: colors.primary }]}>#{item.product.itemId}</IdText>
              </View>
            ) : null}

            {/* Interactive Batch Selector Pill (Only if 2 or more batches exist) */}
            {hasMultipleBatches && (
              <TouchableOpacity
                style={[
                  styles.batchSelectorBtn,
                  {
                    backgroundColor: isDark ? hexToRgba(colors.primary, 0.15) : '#FEF3C7',
                    borderColor: isDark ? hexToRgba(colors.primary, 0.35) : '#FDE68A',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => setBatchPickerOpen(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="layers-outline" size={13} color={isDark ? colors.primary : '#B45309'} />
                <Text
                  style={[
                    styles.batchSelectorText,
                    { color: isDark ? colors.primary : '#92400E' },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage
                    ? `وەجبەی #${item.selectedBatch?.batchNum ?? 1}`
                    : `Batch #${item.selectedBatch?.batchNum ?? 1}`}
                </Text>
                {item.selectedBatch?.isOldest && (
                  <View style={styles.batchFifoPill}>
                    <Text style={styles.batchFifoText}>
                      {isKuLanguage ? 'سەرەکی' : 'Primary'}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={12} color={isDark ? colors.primary : '#B45309'} />
              </TouchableOpacity>
            )}
          </View>
          {item.product.itemDescription ? (
            <Text style={[styles.description, { color: colors.gray500, textAlign }]} numberOfLines={1}>
              {item.product.itemDescription}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>

      {item.hasLossWarning && (
        <Text style={[styles.warningText, { color: colors.warning, textAlign }]}>{t('sales.belowCost')}</Text>
      )}

      {/* Main Row: Quantity & Discount on Right (in RTL), Stacked Selling Price on Left (in RTL) */}
      <View style={[styles.mainRow, { flexDirection }]}>
        {/* Right side in RTL: Quantity Stepper & Discount trigger */}
        <View style={styles.qtyCol}>
          <View style={[styles.labelRow, { flexDirection }]}>
            <Text style={[styles.fieldLabel, { color: colors.gray500, textAlign }]}>
              {t('sales.qty')}
            </Text>
            {item.product.idMode === 'repeatable' && (
              <Text style={[styles.stockNote, { color: colors.gray400 }]}>
                / {item.product.quantity}
              </Text>
            )}
          </View>

          <QuantityStepper
            compact
            value={String(item.quantity)}
            onChangeText={(text) => {
              const n = parseInt(text, 10);
              if (!isNaN(n)) onUpdateQty(n);
            }}
            min={1}
            max={item.product.idMode === 'repeatable' ? item.product.quantity : undefined}
            disabled={item.product.idMode === 'unique'}
            containerStyle={styles.stepperCompactContainer}
            wrapperStyle={styles.stepperWrapper}
          />

          {/* Discount Trigger Button */}
          <TouchableOpacity
            style={[
              styles.discountTriggerBtn,
              showDiscountSection && {
                borderColor: colors.primary,
                backgroundColor: isDark ? hexToRgba(colors.primary, 0.15) : '#FEF3C7',
              },
              !showDiscountSection && hasActiveDiscount && {
                borderColor: colors.primary,
                backgroundColor: colors.softBlue,
              },
              !showDiscountSection && !hasActiveDiscount && {
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.gray200,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.gray50,
              },
              { flexDirection },
            ]}
            onPress={toggleDiscountSection}
            activeOpacity={0.75}
          >
            <Ionicons
              name={hasActiveDiscount ? 'pricetag' : 'pricetag-outline'}
              size={13}
              color={hasActiveDiscount || showDiscountSection ? colors.primary : colors.gray500}
            />
            <Text
              style={[
                styles.discountTriggerText,
                {
                  color: hasActiveDiscount || showDiscountSection ? colors.primary : colors.gray600,
                },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
              numberOfLines={1}
            >
              {hasActiveDiscount
                ? (item.discountType === 'percentage'
                    ? `${item.discountPct}%`
                    : (isUSD ? fmtUSD(item.discount / exchangeRate) : fmtIQD(item.discount)))
                : t('sales.discount')}
            </Text>
            <Ionicons
              name={showDiscountSection ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={hasActiveDiscount || showDiscountSection ? colors.primary : colors.gray400}
            />
          </TouchableOpacity>
        </View>

        {/* Left side in RTL: Stacked Selling Price inputs */}
        <View style={styles.priceCol}>
          <View style={[styles.labelRow, { flexDirection }]}>
            <Text style={[styles.fieldLabel, { color: colors.gray500, textAlign }]}>
              {t('sales.sellingPrice')}
            </Text>
          </View>
          <View style={styles.priceStackedCol}>
            {isUSD ? renderUsdField() : renderIqdField()}
            {isUSD ? renderIqdField() : renderUsdField()}
          </View>
          <Text style={[styles.rateNote, { color: colors.gray400, textAlign }]}>
            100 USD = {fmtExchangeRate(exchangeRate)} IQD
          </Text>
        </View>
      </View>

      {/* Expandable Discount Section */}
      {showDiscountSection && (
        <View
          style={[
            styles.discountExpandedCard,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.gray50,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.gray200,
            },
          ]}
        >
          <View style={[styles.discountExpandedHeader, { flexDirection }]}>
            <View style={[styles.discountLabelRow, { flexDirection }]}>
              <Ionicons name="pricetag" size={13} color={colors.primary} />
              <Text
                style={[
                  styles.discountHeaderTitle,
                  { color: colors.black, textAlign },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {t('sales.discount')}
              </Text>
            </View>
            {hasActiveDiscount && (
              <TouchableOpacity
                onPress={() => {
                  onUpdateDiscount(0);
                  onUpdateDiscountPct(0);
                  setDiscountText('');
                }}
                hitSlop={8}
                style={[styles.clearDiscountBtn, { flexDirection }]}
              >
                <Ionicons name="close-circle" size={14} color={colors.error} />
                <Text
                  style={[
                    styles.clearDiscountText,
                    { color: colors.error },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'لابردنی داشکاندن' : 'Remove'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.discountExpandedControls, { flexDirection }]}>
            {/* Discount Numeric Input */}
            <TextInput
              style={[
                styles.discountInputLarge,
                {
                  borderColor: discountFocused ? colors.primary : colors.gray200,
                  backgroundColor: isDark ? colors.gray100 : colors.white,
                  color: colors.black,
                  textAlign: 'right',
                  writingDirection: 'ltr',
                },
                applyKurdishFont(resolveInputIsKurdish({ isKuLanguage, value: discountText, placeholder: item.discountType === 'percentage' ? '0%' : (isUSD ? '0.00' : '0'), keyboardType: 'decimal-pad' }), {}),
              ]}
              value={discountText}
              onChangeText={onDiscountChange}
              onFocus={(e) => {
                setDiscountFocused(true);
                scrollIntoView(e);
              }}
              onBlur={onDiscountBlur}
              keyboardType="decimal-pad"
              placeholder={item.discountType === 'percentage' ? '0%' : (isUSD ? '0.00' : '0')}
              placeholderTextColor={colors.gray400}
              selectTextOnFocus
            />

            {/* Enlarged Toggle from Image 2 — easy to tap */}
            <View
              style={[
                styles.typeToggleLarge,
                {
                  borderColor: isDark ? 'rgba(255,255,255,0.18)' : colors.gray200,
                  backgroundColor: isDark ? colors.gray100 : colors.white,
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.typePillLarge,
                  item.discountType === 'percentage' && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => switchDiscountType('percentage')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typePillTextLarge,
                    {
                      color:
                        item.discountType === 'percentage'
                          ? colors.white
                          : isDark
                          ? colors.gray300
                          : '#475569',
                    },
                  ]}
                >
                  %
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typePillLarge,
                  item.discountType === 'amount' && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => switchDiscountType('amount')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.typePillTextLarge,
                    {
                      color:
                        item.discountType === 'amount'
                          ? colors.white
                          : isDark
                          ? colors.gray300
                          : '#475569',
                    },
                  ]}
                >
                  {isUSD ? 'USD' : 'IQD'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Price preview (only when discount active) */}
          {showDiscountPreview && (
            <View
              style={[
                styles.previewRow,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.white,
                  borderColor: colors.gray200,
                  flexDirection,
                },
              ]}
            >
              <AmountText value={item.sellingPrice} variant="small" style={[styles.previewLabel, { color: colors.gray500 }]} />
              <AmountText value={item.discount} prefix="−" variant="small" style={[styles.previewMinus, { color: colors.error }]} />
              <Text style={[styles.previewEq, { color: colors.gray400 }]}>=</Text>
              <AmountText value={Math.max(0, effectivePrice)} variant="small" style={[styles.previewFinal, { color: colors.success }]} />
              <Text style={[styles.previewPerUnit, { color: colors.gray400 }]}>/unit</Text>
            </View>
          )}
        </View>
      )}

      {/* Line total */}
      <View style={[styles.lineTotalRow, { borderTopColor: colors.gray100, flexDirection }]}>
        <Text style={[styles.lineTotalLabel, { color: colors.gray400, textAlign }]}>{t('sales.lineTotal')}</Text>
        <View style={[styles.lineTotalStack, { alignItems: alignEnd }]}>
          <AmountText value={item.lineTotal} variant="large" style={[styles.lineTotal, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]} />
          {isUSD ? (
            <Text style={[styles.lineTotalUsd, { color: colors.gray400, textAlign: isRTL ? 'left' : 'right' }]}>
              {fmtIQD(item.lineTotal)} IQD
            </Text>
          ) : (
            <Text style={[styles.lineTotalUsd, { color: colors.gray400, textAlign: isRTL ? 'left' : 'right' }]}>
              {fmtUSD(item.lineTotal / exchangeRate)} USD
            </Text>
          )}
        </View>
      </View>

      {/* Batch Picker Modal */}
      {batchPickerOpen && (
        <BatchPickerModal
          visible={batchPickerOpen}
          onClose={() => setBatchPickerOpen(false)}
          batches={inStockBatches}
          selectedBatchNum={item.selectedBatch?.batchNum ?? 1}
          onSelectBatch={(batch) => {
            if (onUpdateBatch) onUpdateBatch(batch);
          }}
          productName={item.product.name}
          availableStock={item.product.quantity}
          unit={item.product.unit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Theme.radius.card,
    padding: 14,
    marginBottom: 10,
    ...Theme.shadow.card,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  titleCol: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  description: { fontSize: 12, fontWeight: '400', marginTop: 2 },
  idBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  idText: {},
  batchSelectorBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  batchSelectorText: {
    fontSize: 11,
    fontWeight: '700',
  },
  batchFifoPill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  batchFifoText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
  deleteBtn: { padding: 4, marginStart: 8 },
  warningText: { fontSize: 11, fontWeight: '500', marginBottom: 8 },

  labelRow: {
    height: 18,
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockNote: {
    fontSize: 11,
    fontWeight: '500',
  },

  mainRow: {
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  qtyCol: {
    flex: 1,
  },
  stepperCompactContainer: {
    width: '100%',
    height: 36,
  },
  stepperWrapper: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1.2,
  },
  discountTriggerBtn: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    gap: 4,
    marginTop: 6,
  },
  discountTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  priceCol: {
    flex: 1.25,
  },
  priceStackedCol: {
    gap: 6,
  },
  currencyFieldStacked: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1.2,
    alignItems: 'center',
    overflow: 'hidden',
  },
  currencyBadge: {
    paddingHorizontal: 7,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyCode: {
    fontSize: 11,
    fontWeight: '800',
  },
  currencyInput: {
    flex: 1,
    paddingHorizontal: 7,
    fontSize: 15,
    fontWeight: '700',
    height: '100%',
  },
  rateNote: {
    fontSize: 10.5,
    marginTop: 3,
  },

  discountExpandedCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  discountExpandedHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountLabelRow: {
    alignItems: 'center',
    gap: 6,
  },
  discountHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  clearDiscountBtn: {
    alignItems: 'center',
    gap: 4,
  },
  clearDiscountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  discountExpandedControls: {
    gap: 8,
    alignItems: 'center',
  },
  typeToggleLarge: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    height: 42,
    alignItems: 'stretch',
  },
  typePillLarge: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 46,
  },
  typePillTextLarge: {
    fontSize: 14,
    fontWeight: '700',
  },
  discountInputLarge: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  previewLabel: { fontSize: 13 },
  previewMinus: { fontSize: 13, fontWeight: '600' },
  previewEq: { fontSize: 13 },
  previewFinal: { fontSize: 14, fontWeight: '700' },
  previewPerUnit: { fontSize: 11 },

  lineTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 2,
  },
  lineTotalLabel: { fontSize: 12 },
  lineTotal: {},
  lineTotalStack: { alignItems: 'flex-end' },
  lineTotalUsd: { fontSize: 12, fontWeight: '500', marginTop: 1 },
});
