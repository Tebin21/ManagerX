import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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
}

export function ReceiptCurrencySelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { textAlign, flexDirection } = useRTL();

  return (
    <PremiumCard style={styles.card}>
      <View style={[styles.titleRow, { flexDirection }]}>
        <Ionicons name="cash-outline" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.black, textAlign }]}>{t('receiptCurrency.title')}</Text>
      </View>
      <View style={[styles.toggleRow, { borderColor: colors.gray200, backgroundColor: colors.gray50, flexDirection }]}>
        {OPTIONS.map((opt) => {
          const active = value === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onChange(opt.key)}
              activeOpacity={0.85}
              style={[styles.pill, active && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.pillText, { color: active ? Colors.white : colors.gray500 }]}>
                {t(opt.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 14 },
  titleRow: { alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '700' },
  toggleRow: { borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  pill: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  pillText: { fontSize: 12.5, fontWeight: '700' },
});
