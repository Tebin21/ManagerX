import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import type { CustomerWithStats } from '@/types/customers';
import { fmtIQD, formatDateShort } from '@/utils/formatters';

interface Props {
  customer: CustomerWithStats;
  onPress: () => void;
}

export function CustomerCard({ customer, onPress }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const hasDebt = customer.remainingDebt > 0;
  const lastDate = customer.lastPurchaseDate ? formatDateShort(customer.lastPurchaseDate) : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.white, flexDirection }]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.softBlue }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <View style={[styles.nameRow, { flexDirection }]}>
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
          <View style={[styles.phoneRow, { flexDirection }]}>
            <Ionicons name="call-outline" size={12} color={colors.gray400} />
            <Text style={[styles.phone, { color: colors.gray400, textAlign }]}>{customer.phone}</Text>
          </View>
        ) : null}
        <Text style={[styles.sub, { color: colors.gray400, textAlign }]}>
          {customer.saleCount} {t('suppliers.purchases')} · {fmtIQD(customer.totalPurchases)} IQD
          {hasDebt ? `  ·  ${fmtIQD(customer.remainingDebt)} IQD ${t('customers.remainingDebt').split(' ')[0]}` : ''}
        </Text>
        {lastDate ? (
          <View style={[styles.dateRow, { flexDirection }]}>
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
  dateRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  dateText:   { fontSize: 11 },
});
