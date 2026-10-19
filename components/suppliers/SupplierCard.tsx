import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { Theme } from '@/constants/theme';
import { isDirectSupplierName } from '@/lib/sqlite';
import { useLanguageStore } from '@/store/languageStore';
import type { SupplierWithStats } from '@/types/suppliers';

export interface SupplierCardProps {
  supplier: SupplierWithStats;
  onPress: (supplierId: number) => void;
  layout?: 'list' | 'grid';
}

function SupplierCardImpl({ supplier, onPress, layout = 'list' }: SupplierCardProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isDirect = isDirectSupplierName(supplier.name);
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const { isTablet, isTabletLandscape } = useResponsive();
  const styles = useMemo(() => getStyles(isTablet, isTabletLandscape, isDark), [isTablet, isTabletLandscape, isDark]);

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
        onPress={() => onPress(supplier.id)}
        activeOpacity={0.82}
      >
        {/* Top Badges Row */}
        <View style={[styles.gridTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.gridPillBadge, { backgroundColor: isDirect ? '#FEF3C7' : colors.softBlue }]}>
            <Ionicons name={isDirect ? "flash" : "business"} size={13} color={isDirect ? "#D97706" : colors.primary} />
            <Text style={[styles.gridPillText, { color: isDirect ? '#D97706' : colors.primary, fontWeight: isDirect ? '700' : '500' }]}>
              {isDirect ? (isKuLanguage ? 'سیستەم ⚡' : 'System ⚡') : `${supplier.purchaseCount} ${t('suppliers.purchases')}`}
            </Text>
          </View>
        </View>

        {/* Large Center Avatar */}
        <View style={styles.gridAvatarWrap}>
          <View style={[styles.gridAvatar, { backgroundColor: colors.softBlue }]}>
            <Ionicons
              name="business-outline"
              size={isTabletLandscape ? 34 : isTablet ? 30 : 26}
              color={colors.primary}
            />
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
            {supplier.name}
          </Text>
          {supplier.phone ? (
            <View style={[styles.gridPhoneRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="call-outline" size={isTablet ? 14 : 12} color={colors.gray400} />
              <Text style={[styles.gridPhone, { color: colors.gray400 }]}>
                {supplier.phone}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Stats Box */}
        <View style={[styles.gridStatsBox, { backgroundColor: isDark ? colors.gray200 : colors.gray50 }]}>
          <View style={styles.gridStatItem}>
            <Text style={[styles.gridStatLabel, { color: colors.gray400 }]}>
              {t('suppliers.totalSpent')}
            </Text>
            <AmountText
              value={supplier.totalSpent}
              currency="IQD"
              variant={isTablet ? 'default' : 'small'}
              style={[styles.gridStatValue, { color: colors.primary }]}
            />
          </View>
        </View>

        {/* Last Purchase Date */}
        {supplier.lastPurchaseDate ? (
          <View style={[styles.gridDateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="time-outline" size={11} color={colors.gray300} />
            <Text style={[styles.gridDateText, { color: colors.gray400 }]}>
              <DateText value={supplier.lastPurchaseDate} size="small" />
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
      onPress={() => onPress(supplier.id)}
      activeOpacity={0.82}
    >
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: colors.softBlue,
            marginEnd: isRTL ? 0 : (isTablet ? 16 : 12),
            marginStart: isRTL ? (isTablet ? 16 : RTL_SPACING.gapXl) : 0,
          },
        ]}
      >
        <Ionicons
          name="business-outline"
          size={isTabletLandscape ? 30 : isTablet ? 26 : 22}
          color={colors.primary}
        />
      </View>

      {/* Body */}
      <View style={[styles.body, { gap: isRTL ? RTL_SPACING.stackGap : 2 }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={[
              styles.name,
              { color: colors.black, textAlign },
            ]}
            numberOfLines={1}
          >
            {supplier.name}
          </Text>
          {isDirect && (
            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="flash" size={10} color="#D97706" />
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#D97706' }}>
                {isKuLanguage ? 'سیستەم' : 'System'}
              </Text>
            </View>
          )}
        </View>

        {supplier.phone ? (
          <View style={[styles.phoneRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 5 }]}>
            <Ionicons name="call-outline" size={isTablet ? 15 : 13} color={colors.gray400} />
            <Text style={[styles.phone, { color: colors.gray400, textAlign }]}>
              {supplier.phone}
            </Text>
          </View>
        ) : null}

        <View style={[styles.subRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 6, flexWrap: 'wrap' }]}>
          <Text style={[styles.sub, { color: colors.gray400, textAlign }]}>
            {supplier.purchaseCount} {t('suppliers.purchases')}
          </Text>
          <Text style={[styles.subDot, { color: colors.gray400 }]}>·</Text>
          <AmountText
            value={supplier.totalSpent}
            currency="IQD"
            variant={isTablet ? 'default' : 'small'}
            style={[styles.sub, { color: colors.gray400, textAlign }]}
          />
        </View>

        {supplier.lastPurchaseDate ? (
          <View style={[styles.dateRow, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4, marginTop: 2 }]}>
            <Ionicons name="time-outline" size={isTablet ? 14 : 12} color={colors.gray300} />
            <Text style={[styles.dateText, { color: colors.gray400, textAlign }]}>
              {t('suppliers.lastPurchase')}: <DateText value={supplier.lastPurchaseDate} size={isTablet ? 'default' : 'small'} />
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

export const SupplierCard = React.memo(SupplierCardImpl);

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
    body: {
      flex: 1,
    },
    name: {
      fontSize: isTabletLandscape ? 20 : isTablet ? 18.5 : 16,
      fontWeight: '700',
      marginBottom: 2,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    phone: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12.5,
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    sub: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12.5,
    },
    subDot: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 12.5,
    },
    dateRow: {
      flexDirection: 'row',
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
