import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { useLanguageStore } from '@/store/languageStore';
import type { Sale } from '@/types/sales';

interface Props {
  sale: Sale;
  onPress: () => void;
}

export function SaleHistoryItem({ sale, onPress }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => getStyles(colors, isTablet), [colors, isTablet]);
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const isDirectCustomer = !sale.customerName ||
    sale.customerName === 'کڕیاری ڕاستەوخۆ' ||
    sale.customerName === 'Direct Customer' ||
    sale.customerName === 'Walk-in Customer';

  const cashTint = useMemo(() => getStatusTint('success', colors, isDark), [colors, isDark]);
  const debtTint = useMemo(() => getStatusTint('error', colors, isDark), [colors, isDark]);

  const paymentColors: Record<string, { bg: string; text: string; label: string }> = {
    cash: { bg: cashTint.bg, text: cashTint.text, label: isKuLanguage ? 'کاش' : 'Cash' },
    fib:  { bg: colors.lightBlue, text: colors.darkBlue, label: 'FIB' },
    debt: { bg: debtTint.bg, text: debtTint.text, label: isKuLanguage ? 'قەرز' : 'Debt' },
  };

  const badge = paymentColors[sale.paymentMethod] ?? paymentColors.cash;

  const cardPadding = isTablet ? 18 : (isRTL ? RTL_SPACING.cardPad : 14);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, { flexDirection, padding: cardPadding }]}>
      <View style={styles.left}>
        <IdText style={[styles.invoice, { textAlign, marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>{sale.invoiceNumber}</IdText>
        {isDirectCustomer ? (
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginBottom: isRTL ? RTL_SPACING.title : 2 }}>
            <Ionicons name="flash" size={12} color="#D97706" />
            <Text
              style={[
                styles.customer,
                { color: isDark ? '#FBBF24' : '#B45309', fontWeight: '700', textAlign },
              ]}
              numberOfLines={1}
            >
              {isKuLanguage ? 'کڕیاری ڕاستەوخۆ' : 'Direct Customer'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.customer, { textAlign, marginBottom: isRTL ? RTL_SPACING.title : 2 }]} numberOfLines={1}>
            {sale.customerName}
          </Text>
        )}
        <DateText value={sale.date ?? sale.createdAt} size={isTablet ? 'default' : 'small'} style={[styles.date, { textAlign }]} />
      </View>

      <View style={[styles.right, { alignItems: alignEnd, marginEnd: isRTL ? RTL_SPACING.gap : 8 }]}>
        <AmountText value={sale.grandTotal} style={[styles.total, { color: colors.primary, textAlign: isRTL ? 'left' : 'right', marginBottom: isRTL ? RTL_SPACING.title : 4 }]} />
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
        {sale.remainingDebt > 0 ? (
          <AmountText
            value={sale.remainingDebt}
            prefix="−"
            currency="debt"
            variant="small"
            style={[styles.debt, { textAlign: isRTL ? 'left' : 'right', marginTop: isRTL ? RTL_SPACING.title : 2 }]}
          />
        ) : null}
      </View>

      <Ionicons name={chevronForward as never} size={isTablet ? 20 : 16} color={colors.gray300} style={[styles.arrow, { marginStart: isRTL ? RTL_SPACING.gapSm : 4 }]} />
    </TouchableOpacity>
  );
}

function getStyles(colors: AppColors, isTablet: boolean) {
  return StyleSheet.create({
    card: {
      width: '100%',
      flex: isTablet ? 1 : undefined,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: isTablet ? 16 : Theme.radius.card,
      padding: isTablet ? 18 : 14,
      marginBottom: 8,
      ...Theme.shadow.card,
    },
    left: { flex: 1 },
    invoice: { fontSize: isTablet ? 16 : 13, fontWeight: '700', color: colors.black, marginBottom: 2 },
    customer: { fontSize: isTablet ? 15 : 13, color: colors.gray600, marginBottom: 2 },
    date: { color: colors.gray400 },
    right: { alignItems: 'flex-end', marginEnd: 8 },
    total: { fontSize: isTablet ? 19 : 16, fontWeight: '700', marginBottom: 4 },
    badge: {
      paddingHorizontal: isTablet ? 10 : 8,
      paddingVertical: isTablet ? 4 : 2,
      borderRadius: isTablet ? 9 : 8,
    },
    badgeText: { fontSize: isTablet ? 13 : 11, fontWeight: '600' },
    debt: { fontSize: isTablet ? 13 : 11, color: colors.error, marginTop: 2, fontWeight: '500' },
    arrow: { marginStart: 4 },
  });
}
