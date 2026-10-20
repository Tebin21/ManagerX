import React from 'react';
import { View, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { PremiumCard } from '@/components/ui/PremiumCard';
import type { ReceiptCurrencyMode } from '@/lib/invoiceTemplate';

const OPTIONS: { key: ReceiptCurrencyMode; labelKey: string }[] = [
  { key: 'iqd', labelKey: 'receiptCurrency.iqdOnly' },
  { key: 'usd', labelKey: 'receiptCurrency.usdOnly' },
  { key: 'both', labelKey: 'receiptCurrency.both' },
];


interface Props {
  value: ReceiptCurrencyMode;
  onChange: (mode: ReceiptCurrencyMode) => void;
  inner?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ReceiptCurrencySelector({ value, onChange, inner = false, style }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();

  const content = (
    <>
      <View style={[styles.titleRow, { flexDirection }]}>
        <Ionicons name="cash-outline" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.black, textAlign }]}>{t('receiptCurrency.title')}</Text>
      </View>
      <View style={[styles.toggleRow, { borderColor: colors.gray200, backgroundColor: inner ? colors.white : colors.gray50, flexDirection }]}>
        {OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onChange(opt.key)}
              activeOpacity={0.85}
              style={[styles.pill, active && { backgroundColor: colors.primary }]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.pillText, { color: active ? Colors.white : colors.gray500 }]}
              >
                {t(opt.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  if (inner) {
    return (
      <View style={[styles.innerCard, { borderColor: colors.gray200, backgroundColor: colors.gray50 }, style]}>
        {content}
      </View>
    );
  }

  return (
    <PremiumCard style={[styles.card, style]}>
      {content}
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 14 },
  innerCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginBottom: 16,
  },
  titleRow: { alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { fontSize: 13.5, fontWeight: '700' },
  toggleRow: { borderRadius: 9, borderWidth: 1, overflow: 'hidden' },
  pill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
});

