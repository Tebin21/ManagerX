import React from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useKeyboardAwareFocus } from '@/components/common/KeyboardAwareScrollView';
import { useTranslation } from 'react-i18next';
import { useRTL } from '@/lib/rtl';
import type { GlobalDiscountType } from '@/types/sales';
import { fmtIQD } from '@/utils/formatters';

interface Props {
  type: GlobalDiscountType;
  value: number;
  discountAmount: number;
  subtotal: number;
  onTypeChange: (type: GlobalDiscountType) => void;
  onValueChange: (value: number) => void;
}

const TYPES: { key: GlobalDiscountType; label: string }[] = [
  { key: 'none', label: '—' },
  { key: 'percentage', label: '%' },
  { key: 'amount', label: 'IQD' },
];

export function GlobalDiscountBar({ type, value, discountAmount, subtotal, onTypeChange, onValueChange }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const scrollIntoView = useKeyboardAwareFocus();

  const [inputText, setInputText] = React.useState('');

  function handleValueChange(val: string) {
    setInputText(val);
    onValueChange(parseFloat(val) || 0);
  }

  function handleTypeChange(newType: GlobalDiscountType) {
    setInputText('');
    onValueChange(0);
    onTypeChange(newType);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.white ?? Colors.white }]}>
      <View style={[styles.titleRow, { flexDirection }]}>
        <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.black, textAlign }]}>{t('sales.globalDiscount')}</Text>
      </View>

      {/* Type toggle */}
      <View style={[styles.toggleRow, { borderColor: colors.gray200, backgroundColor: colors.gray50 }]}>
        {TYPES.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.pill,
              type === opt.key && { backgroundColor: colors.primary },
            ]}
            onPress={() => handleTypeChange(opt.key)}
          >
            <Text style={[styles.pillText, { color: type === opt.key ? Colors.white : colors.gray500 }]}>
              {opt.key === 'none' ? t('sales.globalDiscountNone') : opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Value input — only when type is not 'none' */}
      {type !== 'none' && (
        <View style={styles.inputSection}>
          <TextInput
            style={[styles.input, { borderColor: colors.gray200, backgroundColor: colors.gray50, color: colors.black, textAlign: 'right', writingDirection: 'ltr' }]}
            value={inputText}
            onChangeText={handleValueChange}
            keyboardType="decimal-pad"
            placeholder={type === 'percentage' ? '0%' : '0 IQD'}
            placeholderTextColor={colors.gray400}
            selectTextOnFocus
            onFocus={scrollIntoView}
          />

          {discountAmount > 0 && (
            <View style={[styles.previewBadge, { backgroundColor: colors.softBlue ?? '#EFF6FF', flexDirection }]}>
              <Text style={[styles.previewText, { color: colors.primary, textAlign }]}>
                −{fmtIQD(discountAmount)} IQD
              </Text>
              {subtotal > 0 && (
                <Text style={[styles.previewPct, { color: colors.gray500, textAlign }]}>
                  ({((discountAmount / subtotal) * 100).toFixed(1)}% {t('sales.ofTotal')})
                </Text>
              )}
            </View>
          )}
        </View>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '700' },

  toggleRow: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  pillText: { fontSize: 13, fontWeight: '700' },

  inputSection: { gap: 8 },
  input: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  previewBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  previewText: { fontSize: 14, fontWeight: '700' },
  previewPct: { fontSize: 12 },
});
