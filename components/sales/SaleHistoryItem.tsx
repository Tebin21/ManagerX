import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';
import type { Sale } from '@/types/sales';
import { fmtIQD, formatDateShort } from '@/utils/formatters';

interface Props {
  sale: Sale;
  onPress: () => void;
}

export function SaleHistoryItem({ sale, onPress }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const { chevronForward } = useDirectionalChevron();

  const paymentColors: Record<string, { bg: string; text: string; label: string }> = {
    cash: { bg: '#D1FAE5', text: '#065F46', label: 'Cash' },
    fib:  { bg: colors.lightBlue, text: colors.darkBlue, label: 'FIB' },
    debt: { bg: '#FEE2E2', text: '#991B1B', label: 'Debt' },
  };

  const badge = paymentColors[sale.paymentMethod] ?? paymentColors.cash;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, { flexDirection, padding: isRTL ? RTL_SPACING.cardPad : 14 }]}>
      <View style={styles.left}>
        <Text style={[styles.invoice, { textAlign, marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>{sale.invoiceNumber}</Text>
        {sale.customerName ? (
          <Text style={[styles.customer, { textAlign, marginBottom: isRTL ? RTL_SPACING.title : 2 }]} numberOfLines={1}>{sale.customerName}</Text>
        ) : null}
        <Text style={[styles.date, { textAlign }]}>{formatDateShort(sale.date ?? sale.createdAt)}</Text>
      </View>

      <View style={[styles.right, { alignItems: alignEnd, marginEnd: isRTL ? RTL_SPACING.gap : 8 }]}>
        <Text style={[styles.total, { color: colors.primary, textAlign: isRTL ? 'left' : 'right', marginBottom: isRTL ? RTL_SPACING.title : 4 }]}>{fmtIQD(sale.grandTotal)}</Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
        {sale.remainingDebt > 0 ? (
          <Text style={[styles.debt, { textAlign: isRTL ? 'left' : 'right', marginTop: isRTL ? RTL_SPACING.title : 2 }]}>−{fmtIQD(sale.remainingDebt)} debt</Text>
        ) : null}
      </View>

      <Ionicons name={chevronForward as never} size={16} color={Colors.gray300} style={[styles.arrow, { marginStart: isRTL ? RTL_SPACING.gapSm : 4 }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.radius.card,
    padding: 14,
    marginBottom: 8,
    ...Theme.shadow.card,
  },
  left: { flex: 1 },
  invoice: { fontSize: 13, fontWeight: '700', color: Colors.black, marginBottom: 2 },
  customer: { fontSize: 13, color: Colors.gray600, marginBottom: 2 },
  date: { fontSize: 11, color: Colors.gray400 },
  right: { alignItems: 'flex-end', marginEnd: 8 },
  total: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  debt: { fontSize: 11, color: Colors.error, marginTop: 2, fontWeight: '500' },
  arrow: { marginStart: 4 },
});
