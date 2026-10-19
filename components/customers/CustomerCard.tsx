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
import { Theme } from '@/constants/theme';
import type { CustomerWithStats } from '@/types/customers';
import { isDirectCustomerName } from '@/lib/sqlite';
import { useLanguageStore } from '@/store/languageStore';

interface Props {
  customer: CustomerWithStats;
  /** Id-based so the parent can pass one stable callback for every row —
   *  required for React.memo below to actually skip unrelated rows. */
  onPress: (customerId: number) => void;
  layout?: 'list' | 'grid';
}

function CustomerCardImpl({ customer, onPress, layout = 'list' }: Props) {
  const { colors, isDark } = useAppTheme();
  const debtTint = getStatusTint('warning', colors, isDark);
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const { isTablet, isTabletLandscape } = useResponsive();
  const styles = useMemo(() => getStyles(isTablet, isTabletLandscape, isDark), [isTablet, isTabletLandscape, isDark]);
  const hasDebt = customer.remainingDebt > 0;

  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isDirect = isDirectCustomerName(customer.name);

  // ─── Square Grid Layout (چوار گۆشە) ──────────────────────────────────────────
  if (layout === 'grid') {
    return (
      <TouchableOpacity
        style={[
          styles.gridCard,
          {
            backgroundColor: colors.white,
            borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
          },
        ]}
        onPress={() => onPress(customer.id)}
        activeOpacity={0.82}
      >
        {/* Top Badges Row */}
        <View style={[styles.gridTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.gridPillBadge, { backgroundColor: isDirect ? '#FEF3C7' : colors.gray100 }]}>
            <Text style={[styles.gridPillText, { color: isDirect ? '#D97706' : colors.gray500, fontWeight: isDirect ? '700' : '500' }]}>
              {isDirect ? (isKuLanguage ? 'سیستەم ⚡' : 'System ⚡') : `${customer.saleCount} ${t('suppliers.purchases')}`}
            </Text>
          </View>
          {hasDebt ? (
            <View style={[styles.gridDebtBadge, { backgroundColor: debtTint.bg }]}>
              <Text style={[styles.gridDebtBadgeText, { color: debtTint.text }]}>
                {t('common.debt')}
              </Text>
            </View>
          ) : (
            <View style={[styles.gridPillBadge, { backgroundColor: colors.softBlue }]}>
              <Ionicons name="checkmark-circle-outline" size={13} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Large Center Avatar */}
        <View style={styles.gridAvatarWrap}>
          <View style={[styles.gridAvatar, { backgroundColor: isDirect ? '#FEF3C7' : colors.softBlue }]}>
            {isDirect ? (
              <Ionicons name="flash" size={isTablet ? 32 : 26} color="#D97706" />
            ) : (
              <Text style={[styles.gridAvatarText, { color: colors.primary }]}>
                {customer.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        </View>

        {/* Name & Phone */}
        <View style={styles.gridInfoWrap}>
          <Text
            style={[
              styles.gridName,
              { color: colors.black, textAlign: 'center' },
            ]}
            numberOfLines={1}
          >
            {customer.name}
          </Text>
          {customer.phone ? (
            <View style={[styles.gridPhoneRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="call-outline" size={isTablet ? 14 : 12} color={colors.gray400} />
              <Text style={[styles.gridPhone, { color: colors.gray400 }]}>
                {customer.phone}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Stats Box */}
        <View style={[styles.gridStatsBox, { backgroundColor: isDark ? colors.gray200 : colors.gray50 }]}>
          <View style={styles.gridStatItem}>
            <Text style={[styles.gridStatLabel, { color: colors.gray400 }]}>
              {t('customers.totalSpent')}
            </Text>
            <AmountText
              value={customer.totalPurchases}
              currency="IQD"
              variant={isTablet ? 'default' : 'small'}
              style={[styles.gridStatValue, { color: colors.primary }]}
            />
          </View>
          {hasDebt && (
            <View style={styles.gridStatItem}>
              <Text style={[styles.gridStatLabel, { color: colors.warning }]}>
                {t('debt.remainingLabel')}
              </Text>
              <AmountText
                value={customer.remainingDebt}
                currency="IQD"
                variant="small"
                style={[styles.gridStatValue, { color: colors.warning }]}
              />
            </View>
          )}
        </View>

        {/* Last Purchase Date */}
        {customer.lastPurchaseDate ? (
          <View style={[styles.gridDateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="time-outline" size={11} color={colors.gray300} />
            <Text style={[styles.gridDateText, { color: colors.gray400 }]}>
              <DateText value={customer.lastPurchaseDate} size="small" />
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  // ─── Standard List Row Layout (Bigger & Richer) ─────────────────────────────
  const cardPad = isTabletLandscape ? 20 : isTablet ? 18 : (isRTL ? RTL_SPACING.cardPad : 15);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.white,
          flexDirection,
          padding: cardPad,
          marginBottom: isTablet ? 12 : (isRTL ? RTL_SPACING.cardGap : 9),
        },
      ]}
      onPress={() => onPress(customer.id)}
      activeOpacity={0.82}
    >
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: isDirect ? '#FEF3C7' : colors.softBlue,
            marginEnd: isRTL ? 0 : (isTablet ? 16 : 12),
            marginStart: isRTL ? (isTablet ? 16 : RTL_SPACING.gapXl) : 0,
          },
        ]}
      >
        {isDirect ? (
          <Ionicons name="flash" size={isTablet ? 24 : 20} color="#D97706" />
        ) : (
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {customer.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      {/* Body */}
      <View style={[styles.body, { gap: isRTL ? RTL_SPACING.stackGap : 2 }]}>
        <View style={[styles.nameRow, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 8, marginBottom: 2 }]}>
          <Text style={[styles.name, { color: colors.black, textAlign }]} numberOfLines={1}>
            {customer.name}
          </Text>
          {isDirect && (
            <View style={[styles.debtBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.debtBadgeText, { color: '#D97706', fontWeight: '700' }]}>
                {isKuLanguage ? 'سیستەم ⚡' : 'System ⚡'}
              </Text>
            </View>
          )}
          {hasDebt && (
            <View style={[styles.debtBadge, { backgroundColor: debtTint.bg }]}>
              <Text style={[styles.debtBadgeText, { color: debtTint.text }]}>{t('common.debt')}</Text>
            </View>
          )}
        </View>

        {customer.phone ? (
          <View style={[styles.phoneRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 5, marginBottom: 2 }]}>
            <Ionicons name="call-outline" size={isTablet ? 15 : 13} color={colors.gray400} />
            <Text style={[styles.phone, { color: colors.gray400, textAlign }]}>{customer.phone}</Text>
          </View>
        ) : null}

        <View style={[styles.subRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 6, flexWrap: 'wrap', marginBottom: 2 }]}>
          <Text style={[styles.sub, { color: colors.gray400, textAlign }]}>
            {customer.saleCount} {t('suppliers.purchases')}
          </Text>
          <Text style={[styles.subDot, { color: colors.gray400 }]}>·</Text>
          <AmountText
            value={customer.totalPurchases}
            currency="IQD"
            variant={isTablet ? 'default' : 'small'}
            style={[styles.sub, { color: colors.gray400, textAlign }]}
          />
        </View>

        {hasDebt && (
          <View style={[styles.debtRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 5, marginTop: 2 }]}>
            <Text style={[styles.debtRowLabel, { color: colors.gray400, textAlign }]}>
              {t('debt.remainingLabel')}:
            </Text>
            <AmountText
              value={customer.remainingDebt}
              currency="IQD"
              variant={isTablet ? 'default' : 'small'}
              style={[styles.debtRowValue, { color: colors.warning, textAlign }]}
            />
          </View>
        )}

        {customer.lastPurchaseDate ? (
          <View style={[styles.dateRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4, marginTop: 2 }]}>
            <Ionicons name="time-outline" size={isTablet ? 14 : 12} color={colors.gray300} />
            <Text style={[styles.dateText, { color: colors.gray400, textAlign }]}>
              {t('suppliers.lastPurchase')}: <DateText value={customer.lastPurchaseDate} size={isTablet ? 'default' : 'small'} />
            </Text>
          </View>
        ) : null}
      </View>

      <Ionicons
        name={chevronForward as never}
        size={isTablet ? 22 : 18}
        color={colors.gray300}
        style={{ marginEnd: isRTL ? RTL_SPACING.gapSm : 0 }}
      />
    </TouchableOpacity>
  );
}

export const CustomerCard = React.memo(CustomerCardImpl);

function getStyles(isTablet: boolean, isTabletLandscape: boolean, isDark: boolean) {
  return StyleSheet.create({
    // ─── List Layout Styles ───
    card: {
      flex: isTablet ? 1 : undefined,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: isTabletLandscape ? 18 : isTablet ? 16 : 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    avatar: {
      width: isTabletLandscape ? 62 : isTablet ? 54 : 46,
      height: isTabletLandscape ? 62 : isTablet ? 54 : 46,
      borderRadius: isTabletLandscape ? 18 : isTablet ? 16 : 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: isTabletLandscape ? 26 : isTablet ? 23 : 19,
      fontWeight: '800',
    },
    body: {
      flex: 1,
    },
    nameRow: {
      alignItems: 'center',
      gap: 8,
    },
    name: {
      fontSize: isTabletLandscape ? 20 : isTablet ? 18.5 : 16,
      fontWeight: '700',
      flexShrink: 1,
    },
    debtBadge: {
      borderRadius: 6,
      paddingHorizontal: isTabletLandscape ? 10 : 8,
      paddingVertical: 2,
    },
    debtBadgeText: {
      fontSize: isTabletLandscape ? 12 : 11,
      fontWeight: '700',
    },
    phoneRow: {
      alignItems: 'center',
    },
    phone: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12.5,
    },
    subRow: {
      alignItems: 'center',
    },
    sub: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12.5,
    },
    subDot: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12.5,
    },
    debtRow: {
      alignItems: 'center',
    },
    debtRowLabel: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12.5,
    },
    debtRowValue: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12.5,
      fontWeight: '700',
    },
    dateRow: {
      alignItems: 'center',
    },
    dateText: {
      fontSize: isTabletLandscape ? 14 : isTablet ? 13 : 11.5,
    },

    // ─── Square Grid Layout Styles (چوار گۆشە) ───
    gridCard: {
      flex: 1,
      borderRadius: isTablet ? 20 : 16,
      borderWidth: 1,
      padding: isTabletLandscape ? 18 : isTablet ? 16 : 12,
      marginBottom: isTablet ? 12 : 8,
      ...Theme.shadow.soft,
      justifyContent: 'space-between',
    },
    gridTopRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    gridPillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
    },
    gridPillText: {
      fontSize: isTablet ? 12 : 10.5,
      fontWeight: '700',
    },
    gridDebtBadge: {
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    gridDebtBadgeText: {
      fontSize: isTablet ? 12 : 10.5,
      fontWeight: '700',
    },
    gridAvatarWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 6,
    },
    gridAvatar: {
      width: isTabletLandscape ? 70 : isTablet ? 62 : 50,
      height: isTabletLandscape ? 70 : isTablet ? 62 : 50,
      borderRadius: isTabletLandscape ? 22 : isTablet ? 18 : 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridAvatarText: {
      fontSize: isTabletLandscape ? 28 : isTablet ? 25 : 21,
      fontWeight: '800',
    },
    gridInfoWrap: {
      alignItems: 'center',
      marginVertical: 4,
      gap: 2,
    },
    gridName: {
      fontSize: isTabletLandscape ? 18.5 : isTablet ? 17 : 15,
      fontWeight: '800',
    },
    gridPhoneRow: {
      alignItems: 'center',
      gap: 4,
    },
    gridPhone: {
      fontSize: isTablet ? 13 : 11.5,
    },
    gridStatsBox: {
      borderRadius: 12,
      padding: isTablet ? 10 : 8,
      marginVertical: 6,
      gap: 4,
    },
    gridStatItem: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridStatLabel: {
      fontSize: isTablet ? 11.5 : 10,
      fontWeight: '600',
      marginBottom: 1,
    },
    gridStatValue: {
      fontSize: isTabletLandscape ? 16.5 : isTablet ? 15 : 13.5,
      fontWeight: '800',
    },
    gridDateRow: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: 2,
    },
    gridDateText: {
      fontSize: isTablet ? 11.5 : 10,
    },
  });
}
