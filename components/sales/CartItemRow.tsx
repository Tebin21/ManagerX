import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { roundToNearest250, roundUSD } from '@/utils/rounding';
import { fmtIQD, fmtUSD, fmtExchangeRate } from '@/utils/formatters';
import { useTranslation } from 'react-i18next';
import { useRTL } from '@/lib/rtl';
import type { CartItem, DiscountType } from '@/types/sales';

interface Props {
  item: CartItem;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice: (price: number) => void;
  onUpdateDiscount: (discount: number) => void;
  onUpdateDiscountType: (type: DiscountType) => void;
  onUpdateDiscountPct: (pct: number) => void;
  onRemove: () => void;
}

export function CartItemRow({
  item,
  onUpdateQty,
  onUpdatePrice,
  onUpdateDiscount,
  onUpdateDiscountType,
  onUpdateDiscountPct,
  onRemove,
}: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const exchangeRate = useSettingsStore((s) => s.exchangeRate);

  const atMaxStock = item.product.idMode === 'repeatable' && item.quantity >= item.product.quantity;

  const [iqdPriceText, setIqdPriceText] = useState(String(item.sellingPrice));
  const [usdPrice, setUsdPrice] = useState(
    item.sellingPrice > 0 ? String(roundUSD(item.sellingPrice / exchangeRate)) : ''
  );
  const [iqdFocused, setIqdFocused] = useState(false);
  const [usdFocused, setUsdFocused] = useState(false);
  const [discountText, setDiscountText] = useState(
    item.discountType === 'percentage' ? String(item.discountPct) : String(item.discount)
  );

  function onIqdChange(val: string) {
    setIqdPriceText(val);
    const n = parseFloat(val) || 0;
    setUsdPrice(n > 0 ? String(roundUSD(n / exchangeRate)) : '');
    onUpdatePrice(n);
  }

  function onUsdChange(val: string) {
    setUsdPrice(val);
    const n = parseFloat(val) || 0;
    const iqd = n > 0 ? roundToNearest250(n * exchangeRate) : 0;
    setIqdPriceText(n > 0 ? String(iqd) : '');
    onUpdatePrice(iqd);
  }

  function onDiscountChange(val: string) {
    setDiscountText(val);
    const n = parseFloat(val) || 0;
    if (item.discountType === 'percentage') {
      onUpdateDiscountPct(n);
    } else {
      onUpdateDiscount(n);
    }
  }

  function switchDiscountType(type: DiscountType) {
    setDiscountText('0');
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

  return (
    <View style={[styles.card, { backgroundColor: colors.white ?? Colors.white }, item.hasLossWarning && styles.cardWarning]}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={[styles.titleRow, { flexDirection }]}>
          <Text style={[styles.name, { color: colors.black, textAlign }]} numberOfLines={1}>{item.product.name}</Text>
          {item.product.itemId ? (
            <View style={[styles.idBadge, { backgroundColor: colors.softBlue }]}>
              <Text style={[styles.idText, { color: colors.primary }]}>#{item.product.itemId}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>

      {item.hasLossWarning && (
        <Text style={[styles.warningText, { textAlign }]}>{t('sales.belowCost')}</Text>
      )}

      {/* Quantity stepper */}
      <View style={[styles.stepperRow, { flexDirection }]}>
        <Text style={[styles.fieldLabel, { color: colors.gray500, textAlign }]}>{t('sales.qty')}</Text>
        <View style={[styles.stepper, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
          <TouchableOpacity
            onPress={() => onUpdateQty(item.quantity - 1)}
            disabled={item.quantity <= 1 || item.product.idMode === 'unique'}
            style={[styles.stepBtn, (item.quantity <= 1 || item.product.idMode === 'unique') && styles.stepBtnDisabled]}
          >
            <Ionicons name="remove" size={16} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.qty, { color: colors.black }]}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => onUpdateQty(item.quantity + 1)}
            disabled={item.product.idMode === 'unique' || atMaxStock}
            style={[styles.stepBtn, (item.product.idMode === 'unique' || atMaxStock) && styles.stepBtnDisabled]}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {item.product.idMode === 'repeatable' && (
          <Text style={[styles.stockNote, { color: colors.gray400 }]}>/ {item.product.quantity}</Text>
        )}
      </View>

      {/* Selling Price — IQD / USD dual input */}
      <View style={styles.section}>
        <Text style={[styles.fieldLabel, { color: colors.gray500, textAlign }]}>{t('sales.sellingPrice')}</Text>
        <View style={styles.dualInputRow}>
          <View style={[styles.currencyField, { borderColor: colors.gray200, backgroundColor: colors.gray50, flexDirection }]}>
            <View style={[styles.currencyBadge, { backgroundColor: colors.softBlue }]}>
              <Text style={[styles.currencyCode, { color: colors.primary }]}>IQD</Text>
            </View>
            <TextInput
              style={[styles.currencyInput, { color: colors.black, textAlign: 'right', writingDirection: 'ltr' }]}
              value={iqdDisplay}
              onChangeText={onIqdChange}
              onFocus={() => setIqdFocused(true)}
              onBlur={() => setIqdFocused(false)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.gray400}
              selectTextOnFocus
            />
          </View>
          <View style={[styles.currencyField, { borderColor: colors.gray200, backgroundColor: colors.gray50, flexDirection }]}>
            <View style={[styles.currencyBadge, { backgroundColor: colors.softBlue }]}>
              <Text style={[styles.currencyCode, { color: colors.primary }]}>USD</Text>
            </View>
            <TextInput
              style={[styles.currencyInput, { color: colors.black, textAlign: 'right', writingDirection: 'ltr' }]}
              value={usdDisplay}
              onChangeText={onUsdChange}
              onFocus={() => setUsdFocused(true)}
              onBlur={() => setUsdFocused(false)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.gray400}
              selectTextOnFocus
            />
          </View>
        </View>
        <Text style={[styles.rateNote, { color: colors.gray400, textAlign }]}>
          100 USD = {fmtExchangeRate(exchangeRate)} IQD
        </Text>
      </View>

      {/* Discount */}
      <View style={styles.section}>
        <View style={[styles.discountHeader, { flexDirection }]}>
          <Text style={[styles.fieldLabel, { color: colors.gray500, textAlign }]}>{t('sales.discount')}</Text>
          {/* Toggle: % vs IQD */}
          <View style={[styles.typeToggle, { borderColor: colors.gray200 }]}>
            <TouchableOpacity
              style={[
                styles.typePill,
                item.discountType === 'percentage' && { backgroundColor: colors.primary },
              ]}
              onPress={() => switchDiscountType('percentage')}
            >
              <Text style={[styles.typePillText, { color: item.discountType === 'percentage' ? Colors.white : colors.gray500 }]}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typePill,
                item.discountType === 'amount' && { backgroundColor: colors.primary },
              ]}
              onPress={() => switchDiscountType('amount')}
            >
              <Text style={[styles.typePillText, { color: item.discountType === 'amount' ? Colors.white : colors.gray500 }]}>IQD</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TextInput
          style={[styles.discountInput, { borderColor: colors.gray200, backgroundColor: colors.gray50, color: colors.black, textAlign: 'right', writingDirection: 'ltr' }]}
          value={discountText}
          onChangeText={onDiscountChange}
          keyboardType="decimal-pad"
          placeholder={item.discountType === 'percentage' ? '0%' : '0'}
          placeholderTextColor={colors.gray400}
          selectTextOnFocus
        />
      </View>

      {/* Price preview (only when discount active) */}
      {showDiscountPreview && (
        <View style={[styles.previewRow, { backgroundColor: colors.gray50, borderColor: colors.gray100 }]}>
          <Text style={[styles.previewLabel, { color: colors.gray500 }]}>
            {fmtIQD(item.sellingPrice)}
          </Text>
          <Text style={[styles.previewMinus, { color: Colors.error }]}>
            −{fmtIQD(item.discount)}
          </Text>
          <Text style={styles.previewEq}>=</Text>
          <Text style={[styles.previewFinal, { color: Colors.success }]}>
            {fmtIQD(Math.max(0, effectivePrice))}
          </Text>
          <Text style={[styles.previewPerUnit, { color: colors.gray400 }]}>/unit</Text>
        </View>
      )}

      {/* Line total */}
      <View style={[styles.lineTotalRow, { borderTopColor: colors.gray100 }]}>
        <Text style={[styles.lineTotalLabel, { color: colors.gray400, textAlign }]}>{t('sales.lineTotal')}</Text>
        <View style={[styles.lineTotalStack, { alignItems: alignEnd }]}>
          <Text style={[styles.lineTotal, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]}>{fmtIQD(item.lineTotal)}</Text>
          <Text style={[styles.lineTotalUsd, { color: colors.gray400, textAlign: isRTL ? 'left' : 'right' }]}>
            {fmtUSD(item.lineTotal / exchangeRate)}
          </Text>
        </View>
      </View>
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
  cardWarning: {
    borderStartWidth: 3,
    borderStartColor: Colors.warning,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  idBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  idText: { fontSize: 10, fontWeight: '500' },
  deleteBtn: { padding: 4, marginStart: 8 },
  warningText: { fontSize: 11, color: Colors.warning, fontWeight: '500', marginBottom: 8 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  stepBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { opacity: 0.35 },
  qty: { minWidth: 30, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  stockNote: { fontSize: 12 },

  section: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  dualInputRow: { flexDirection: 'row', gap: 8 },
  currencyField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    height: 40,
  },
  currencyBadge: { paddingHorizontal: 8, height: '100%', alignItems: 'center', justifyContent: 'center' },
  currencyCode: { fontSize: 11, fontWeight: '700' },
  currencyInput: { flex: 1, paddingHorizontal: 8, fontSize: 14, fontWeight: '600', height: '100%' },
  rateNote: { fontSize: 11, marginTop: 4 },

  discountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typePill: { paddingHorizontal: 10, paddingVertical: 4 },
  typePillText: { fontSize: 12, fontWeight: '700' },
  discountInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
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
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  previewLabel: { fontSize: 13 },
  previewMinus: { fontSize: 13, fontWeight: '600' },
  previewEq: { fontSize: 13, color: Colors.gray400 },
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
  lineTotal: { fontSize: 18, fontWeight: '800' },
  lineTotalStack: { alignItems: 'flex-end' },
  lineTotalUsd: { fontSize: 12, fontWeight: '500', marginTop: 1 },
});
