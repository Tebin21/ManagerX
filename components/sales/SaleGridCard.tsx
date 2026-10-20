import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import type { Sale } from '@/types/sales';

interface Props {
  sale: Sale;
  onPress: () => void;
}

export function SaleGridCard({ sale, onPress }: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  const isDirectCustomer =
    !sale.customerName ||
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

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.white,
          borderColor: isDark ? colors.gray200 : hexToRgba(colors.gray200, 0.6),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Top Header: Invoice ID Badge + Payment Status Badge */}
      <View style={[styles.topRow, { flexDirection }]}>
        <View style={[styles.numBadge, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
          <IdText style={[styles.numText, { color: colors.primary }]}>{sale.invoiceNumber}</IdText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.statusText, { color: badge.text }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Main Customer Info */}
      <View style={styles.bodyContent}>
        {isDirectCustomer ? (
          <View style={[styles.customerRow, { flexDirection, gap: 5 }]}>
            <Ionicons name="flash" size={13} color="#D97706" />
            <Text
              style={[
                styles.customerName,
                { color: isDark ? '#FBBF24' : '#B45309', fontWeight: '700', textAlign },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
              numberOfLines={1}
            >
              {isKuLanguage ? 'کڕیاری ڕاستەوخۆ' : 'Direct Customer'}
            </Text>
          </View>
        ) : (
          <View style={[styles.customerRow, { flexDirection, gap: 5 }]}>
            <Ionicons name="person-outline" size={13} color={colors.gray400} />
            <Text
              style={[
                styles.customerName,
                { color: colors.black, textAlign },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
              numberOfLines={2}
            >
              {sale.customerName}
            </Text>
          </View>
        )}

        {/* Customer Phone if available */}
        {sale.customerPhone ? (
          <View style={[styles.phoneRow, { flexDirection, gap: 4, marginTop: 4 }]}>
            <Ionicons name="call-outline" size={10} color={colors.gray400} />
            <Text style={[styles.phoneText, { color: colors.gray400 }]} numberOfLines={1}>
              {sale.customerPhone}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Pricing Box */}
      <View
        style={[
          styles.pricingBox,
          {
            backgroundColor: isDark ? colors.gray100 : colors.gray50,
            borderColor: isDark ? colors.gray200 : colors.gray100,
          },
        ]}
      >
        <View style={[styles.priceRow, { flexDirection, justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={[styles.priceLabel, { color: colors.gray400 }]}>
            {isKuLanguage ? 'کۆی گشتی' : 'Total'}
          </Text>
          <AmountText
            value={sale.grandTotal}
            style={[styles.totalAmount, { color: colors.primary }]}
          />
        </View>

        {sale.remainingDebt > 0 && (
          <View style={[styles.debtRow, { flexDirection, justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }]}>
            <Text style={[styles.debtLabel, { color: colors.error }]}>
              {isKuLanguage ? 'قەرز' : 'Debt'}
            </Text>
            <AmountText
              value={sale.remainingDebt}
              prefix="−"
              currency="debt"
              variant="small"
              style={[styles.debtAmount, { color: colors.error }]}
            />
          </View>
        )}
      </View>

      {/* Footer: Date & Chevron */}
      <View style={[styles.footerRow, { flexDirection }]}>
        <DateText
          value={sale.date ?? sale.createdAt}
          size="small"
          style={{ color: colors.gray400, fontSize: 11 }}
        />
        <Ionicons name={chevronForward as never} size={14} color={colors.gray300} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'space-between',
    minHeight: 185,
    ...Theme.shadow.soft,
  },
  topRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  numBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  numText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bodyContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  customerRow: {
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    flexShrink: 1,
  },
  phoneRow: {
    alignItems: 'center',
  },
  phoneText: {
    fontSize: 10.5,
  },
  pricingBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginTop: 8,
    marginBottom: 8,
  },
  priceRow: {},
  priceLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  debtRow: {},
  debtLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  debtAmount: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
});
