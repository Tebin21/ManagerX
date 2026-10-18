import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useTranslation } from 'react-i18next';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import type { CustomerWithStats } from '@/types/customers';

interface Props {
  customer: CustomerWithStats;
  /** Id-based so the parent can pass one stable callback for every row —
   *  required for React.memo below to actually skip unrelated rows. */
  onPress: (customerId: number) => void;
}

function CustomerCardImpl({ customer, onPress }: Props) {
  const { colors, isDark } = useAppTheme();
  const debtTint = getStatusTint('warning', colors, isDark);
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const { isTablet, isTabletLandscape } = useResponsive();
  const styles = useMemo(() => getStyles(isTablet, isTabletLandscape), [isTablet, isTabletLandscape]);
  const hasDebt = customer.remainingDebt > 0;

  const cardPad = isTabletLandscape ? 20 : isTablet ? 18 : (isRTL ? RTL_SPACING.cardPad : 14);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.white, flexDirection, padding: cardPad, marginBottom: isTablet ? 12 : (isRTL ? RTL_SPACING.cardGap : 8) }]}
      onPress={() => onPress(customer.id)}
      activeOpacity={0.82}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.softBlue, marginEnd: isRTL ? 0 : (isTablet ? 16 : 12), marginStart: isRTL ? (isTablet ? 16 : RTL_SPACING.gapXl) : 0 }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {customer.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Body */}
      <View style={[styles.body, { gap: isRTL ? RTL_SPACING.stackGap : 0 }]}>
        <View style={[styles.nameRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8, marginBottom: isRTL ? 0 : 2 }]}>
          <Text style={[styles.name, { color: colors.black, textAlign }]} numberOfLines={1}>
            {customer.name}
          </Text>
          {hasDebt && (
            <View style={[styles.debtBadge, { backgroundColor: debtTint.bg }]}>
              <Text style={[styles.debtBadgeText, { color: debtTint.text }]}>{t('common.debt')}</Text>
            </View>
          )}
        </View>
        {customer.phone ? (
          <View style={[styles.phoneRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4, marginBottom: isRTL ? 0 : 2 }]}>
            <Ionicons name="call-outline" size={isTablet ? 15 : 12} color={colors.gray400} />
            <Text style={[styles.phone, { color: colors.gray400, textAlign }]}>{customer.phone}</Text>
          </View>
        ) : null}
        <View style={[styles.subRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4, flexWrap: 'wrap', marginBottom: isRTL ? 0 : 2 }]}>
          <Text style={[styles.sub, { color: colors.gray400, textAlign, marginBottom: 0 }]}>
            {customer.saleCount} {t('suppliers.purchases')}
          </Text>
          <Text style={[styles.subDot, { color: colors.gray400 }]}>·</Text>
          <AmountText value={customer.totalPurchases} currency="IQD" variant={isTablet ? 'default' : 'small'} style={[styles.sub, { color: colors.gray400, textAlign, marginBottom: 0 }]} />
        </View>
        {hasDebt && (
          <View style={[styles.debtRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4, marginTop: isRTL ? 0 : 2 }]}>
            <Text style={[styles.debtRowLabel, { color: colors.gray400, textAlign }]}>
              {t('debt.remainingLabel')}
            </Text>
            <AmountText value={customer.remainingDebt} currency="IQD" variant={isTablet ? 'default' : 'small'} style={[styles.debtRowValue, { color: colors.gray400, textAlign }]} />
          </View>
        )}
        {customer.lastPurchaseDate ? (
          <View style={[styles.dateRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4, marginTop: isRTL ? 0 : 2 }]}>
            <Ionicons name="time-outline" size={isTablet ? 14 : 11} color={colors.gray300} />
            <Text style={[styles.dateText, { color: colors.gray400, textAlign }]}>
              {t('suppliers.lastPurchase')}: <DateText value={customer.lastPurchaseDate} size={isTablet ? 'default' : 'small'} />
            </Text>
          </View>
        ) : null}
      </View>

      <Ionicons name={chevronForward as never} size={isTablet ? 22 : 18} color={colors.gray300} style={{ marginEnd: isRTL ? RTL_SPACING.gapSm : 0 }} />
    </TouchableOpacity>
  );
}

export const CustomerCard = React.memo(CustomerCardImpl);

function getStyles(isTablet: boolean, isTabletLandscape: boolean = false) {
  return StyleSheet.create({
    card: {
      flex: isTablet ? 1 : undefined,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: isTabletLandscape ? 18 : isTablet ? 16 : 14,
      padding: isTabletLandscape ? 18 : 14,
      marginBottom: isTabletLandscape ? 12 : 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    avatar: {
      width: isTabletLandscape ? 60 : isTablet ? 52 : 44,
      height: isTabletLandscape ? 60 : isTablet ? 52 : 44,
      borderRadius: isTabletLandscape ? 18 : isTablet ? 15 : 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginEnd: isTabletLandscape ? 16 : 12,
    },
    avatarText: { fontSize: isTabletLandscape ? 24 : isTablet ? 22 : 18, fontWeight: '800' },
    body:       { flex: 1 },
    nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    name:       { fontSize: isTabletLandscape ? 19.5 : isTablet ? 18 : 15, fontWeight: '700', flexShrink: 1 },
    debtBadge:  { borderRadius: 6, paddingHorizontal: isTabletLandscape ? 12 : isTablet ? 10 : 8, paddingVertical: isTabletLandscape ? 5 : isTablet ? 4 : 2 },
    debtBadgeText: { fontSize: isTabletLandscape ? 13 : isTablet ? 12 : 10, fontWeight: '700' },
    phoneRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
    phone:      { fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12 },
    sub:        { fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12, marginBottom: 2 },
    subRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    subDot:     { fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12 },
    debtRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    debtRowLabel:  { fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12 },
    debtRowValue:  { fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12 },
    dateRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    dateText:   { fontSize: isTabletLandscape ? 14 : isTablet ? 13 : 11 },
  });
}
