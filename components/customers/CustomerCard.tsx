import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';
import type { CustomerWithStats } from '@/types/customers';
import { fmtIQD, formatDateShort } from '@/utils/formatters';

interface Props {
  customer: CustomerWithStats;
  /** Id-based so the parent can pass one stable callback for every row —
   *  required for React.memo below to actually skip unrelated rows. */
  onPress: (customerId: number) => void;
}

function CustomerCardImpl({ customer, onPress }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const hasDebt = customer.remainingDebt > 0;
  const lastDate = customer.lastPurchaseDate ? formatDateShort(customer.lastPurchaseDate) : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.white, flexDirection, padding: isRTL ? RTL_SPACING.cardPad : 14 }]}
      onPress={() => onPress(customer.id)}
      activeOpacity={0.82}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.softBlue, marginEnd: isRTL ? RTL_SPACING.gapLg : 12 }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={[styles.nameRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8 }]}>
          <Text style={[styles.name, { color: colors.black, textAlign }]} numberOfLines={1}>
            {customer.name}
          </Text>
          {hasDebt && (
            <View style={styles.debtBadge}>
              <Text style={styles.debtBadgeText}>{t('common.debt')}</Text>
            </View>
          )}
        </View>
        {customer.phone ? (
          <View style={[styles.phoneRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4 }]}>
            <Ionicons name="call-outline" size={12} color={colors.gray400} />
            <Text style={[styles.phone, { color: colors.gray400, textAlign }]}>{customer.phone}</Text>
          </View>
        ) : null}
        <View style={[styles.subRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4, flexWrap: 'wrap' }]}>
          <Text style={[styles.sub, { color: colors.gray400, textAlign, marginBottom: 0 }]}>
            {customer.saleCount} {t('suppliers.purchases')}
          </Text>
          <Text style={[styles.subDot, { color: colors.gray400 }]}>·</Text>
          <Text style={[styles.sub, { color: colors.gray400, textAlign, marginBottom: 0 }]}>
            {fmtIQD(customer.totalPurchases)} IQD
          </Text>
        </View>
        {hasDebt && (
          <View style={[styles.debtRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4 }]}>
            <Text style={[styles.debtRowLabel, { color: colors.gray400, textAlign }]}>
              {t('debt.remainingLabel')}
            </Text>
            <Text style={[styles.debtRowValue, { color: colors.gray400, textAlign }]}>
              {fmtIQD(customer.remainingDebt)} IQD
            </Text>
          </View>
        )}
        {lastDate ? (
          <View style={[styles.dateRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4 }]}>
            <Ionicons name="time-outline" size={11} color={colors.gray300} />
            <Text style={[styles.dateText, { color: colors.gray400, textAlign }]}>
              {t('suppliers.lastPurchase')}: {lastDate}
            </Text>
          </View>
        ) : null}
      </View>

      <Ionicons name={chevronForward as never} size={18} color={colors.gray300} />
    </TouchableOpacity>
  );
}

export const CustomerCard = React.memo(CustomerCardImpl);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800' },
  body:       { flex: 1 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name:       { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  debtBadge:  { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  debtBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  phoneRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  phone:      { fontSize: 12 },
  sub:        { fontSize: 12, marginBottom: 2 },
  subRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  subDot:     { fontSize: 12 },
  debtRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  debtRowLabel:  { fontSize: 12 },
  debtRowValue:  { fontSize: 12 },
  dateRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dateText:   { fontSize: 11 },
});
