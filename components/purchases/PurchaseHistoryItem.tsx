import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '@/constants/theme';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL, RTL_SPACING } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { isDirectSupplierName } from '@/lib/sqlite';
import { useLanguageStore } from '@/store/languageStore';
import type { Purchase } from '@/types/purchases';

interface Props {
  purchase: Purchase;
  onPress: () => void;
  onDelete: () => void;
}

export function PurchaseHistoryItem({ purchase, onPress, onDelete }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isTablet } = useResponsive();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const styles = useMemo(() => getStyles(colors, isTablet), [colors, isTablet]);
  const isPaid = purchase.paymentStatus === 'paid';
  const statusTint = useMemo(
    () => getStatusTint(isPaid ? 'success' : 'warning', colors, isDark),
    [colors, isDark, isPaid]
  );
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();

  const isDirectSupplier = isDirectSupplierName(purchase.supplierName);
  const headerPad = isTablet ? 18 : (isRTL ? RTL_SPACING.cardPad : 14);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Header row */}
      <View style={[styles.header, { flexDirection, padding: headerPad }]}>
        <View style={[styles.headerLeft, { flexDirection, gap: isRTL ? RTL_SPACING.gap : 10 }]}>
          <View style={[styles.numBadge, { backgroundColor: colors.primary }]}>
            <IdText style={styles.numText}>{purchase.purchaseNumber}</IdText>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.productName, { textAlign }]} numberOfLines={1}>{purchase.productName}</Text>
            {purchase.supplierName ? (
              isDirectSupplier ? (
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginTop: isRTL ? RTL_SPACING.title : 1 }}>
                  <Ionicons name="flash" size={11} color="#D97706" />
                  <Text style={[styles.supplierName, { color: isDark ? '#FBBF24' : '#B45309', fontWeight: '700', textAlign }]} numberOfLines={1}>
                    {isKuLanguage ? 'دابینکەری ڕاستەوخۆ' : 'Direct Supplier'}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.supplierName, { textAlign, marginTop: isRTL ? RTL_SPACING.title : 1 }]} numberOfLines={1}>{purchase.supplierName}</Text>
              )
            ) : null}
            {(purchase.supplierPhone || purchase.supplierAddress) && !isDirectSupplier ? (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                {Boolean(purchase.supplierPhone) && (
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="call-outline" size={10} color={colors.gray400} />
                    <Text style={{ fontSize: 11, color: colors.gray400 }}>{purchase.supplierPhone}</Text>
                  </View>
                )}
                {Boolean(purchase.supplierAddress) && (
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 3, flexShrink: 1 }}>
                    <Ionicons name="location-outline" size={10} color={colors.gray400} />
                    <Text style={{ fontSize: 11, color: colors.gray400 }} numberOfLines={1}>{purchase.supplierAddress}</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </View>
        <View style={[styles.headerRight, { alignItems: alignEnd, gap: isRTL ? RTL_SPACING.gapSm : 4 }]}>
          <DateText value={purchase.createdAt} size={isTablet ? 'default' : 'small'} style={[styles.date, { textAlign }]} />
          <View style={[styles.statusBadge, { backgroundColor: statusTint.bg }]}>
            <Text style={[styles.statusText, { color: statusTint.text }]}>
              {isPaid ? t('common.paid') : t('common.debt')}
            </Text>
          </View>
        </View>
      </View>

      {/* Detail row */}
      <View style={[styles.details, { paddingVertical: isTablet ? 16 : (isRTL ? RTL_SPACING.gap : 12) }]}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>{t('purchases.qty')}</Text>
          <Text style={styles.detailValue}>{purchase.quantity}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>{t('purchases.buyPrice')}</Text>
          <AmountText value={purchase.buyPriceIQD} currency="IQD" style={styles.detailValue} />
        </View>
        <View style={styles.divider} />
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { marginBottom: isRTL ? RTL_SPACING.title : 2 }]}>{t('purchases.totalLabel')}</Text>
          <AmountText value={purchase.totalIQD} currency="IQD" style={[styles.detailValue, { color: colors.primary }]} />
        </View>
      </View>

      {/* Actions row */}
      <View style={[styles.actions, { flexDirection, paddingHorizontal: headerPad }]}>
        <View style={[styles.purchaseNum, { flexDirection, gap: isRTL ? RTL_SPACING.gapSm : 4 }]}>
          <Ionicons name="receipt-outline" size={isTablet ? 16 : 13} color={colors.gray400} />
          <IdText size={isTablet ? 'default' : 'small'} style={[styles.purchaseNumText, { textAlign }]}>{purchase.purchaseNumber}</IdText>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={isTablet ? 20 : 16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function getStyles(colors: AppColors, isTablet: boolean) {
  return StyleSheet.create({
    card: {
      flex: isTablet ? 1 : undefined,
      backgroundColor: colors.white,
      borderRadius: isTablet ? 16 : Theme.radius.card,
      marginBottom: 12,
      ...Theme.shadow.soft,
      overflow: 'hidden',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray100,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    numBadge: {
      borderRadius: 8,
      paddingHorizontal: isTablet ? 10 : 8,
      paddingVertical: isTablet ? 5 : 3,
      minWidth: isTablet ? 40 : 32,
      alignItems: 'center',
    },
    numText: { fontSize: isTablet ? 14 : 12, fontWeight: '700', color: colors.white },
    headerInfo: { flex: 1 },
    productName: { fontSize: isTablet ? 18 : 15, fontWeight: '700', color: colors.black },
    supplierName: { fontSize: isTablet ? 14 : 12, color: colors.gray500, marginTop: 1 },

    headerRight: { alignItems: 'flex-end', gap: 4 },
    date: { fontSize: isTablet ? 13 : 11, color: colors.gray400 },
    statusBadge: {
      paddingHorizontal: isTablet ? 10 : 8,
      paddingVertical: isTablet ? 4 : 2,
      borderRadius: isTablet ? 12 : 10,
    },
    statusText: { fontSize: isTablet ? 13 : 11, fontWeight: '700' },

    details: {
      flexDirection: 'row',
      paddingHorizontal: isTablet ? 18 : 14,
      paddingVertical: isTablet ? 16 : 12,
    },
    detailItem: { flex: 1, alignItems: 'center' },
    detailLabel: { fontSize: isTablet ? 13 : 11, color: colors.gray400, marginBottom: 2 },
    detailValue: { fontSize: isTablet ? 16 : 13, fontWeight: '600', color: colors.black },
    divider: { width: 1, backgroundColor: colors.gray100, marginVertical: 2 },

    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingBottom: isTablet ? 14 : 12,
    },
    purchaseNum: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    purchaseNumText: { fontSize: isTablet ? 13 : 11, color: colors.gray400 },
    deleteBtn: { padding: 6 },
  });
}
