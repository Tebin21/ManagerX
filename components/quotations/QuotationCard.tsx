import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useRTL, RTL_SPACING, useDirectionalChevron } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { Theme } from '@/constants/theme';
import { useLanguageStore } from '@/store/languageStore';
import { fmtUSD, formatTime } from '@/utils/formatters';
import { isDirectCustomerName } from '@/lib/sqlite';
import type { Quotation } from '@/types/quotation';

export interface QuotationCardProps {
  quotation: Quotation;
  onPress: (quotation: Quotation) => void;
  onShare: (quotation: Quotation) => void;
  onDelete: (quotation: Quotation) => void;
  layout?: 'list' | 'grid';
}

function QuotationCardImpl({ quotation, onPress, onShare, onDelete, layout = 'list' }: QuotationCardProps) {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isAr = useLanguageStore((s) => s.language === 'ar');
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const { isTablet, isTabletLandscape } = useResponsive();
  const styles = useMemo(() => getStyles(isTablet, isTabletLandscape, isDark), [isTablet, isTabletLandscape, isDark]);

  const usdValue = quotation.exchangeRate > 0 ? quotation.grandTotal / quotation.exchangeRate : 0;
  const itemsCount = quotation.items?.length || 0;
  const printCount = quotation.printCount || 0;
  const isPrinted = printCount > 0;

  const isDirectCust = !quotation.customerName || isDirectCustomerName(quotation.customerName);
  const displayCustomerName = isDirectCust
    ? (isAr ? 'زبون مباشر' : isKuLanguage ? 'کڕیاری ڕاستەوخۆ' : 'Direct Customer')
    : quotation.customerName;

  const handleDeletePrompt = () => {
    Alert.alert(
      isAr ? 'حذف عرض السعر' : isKuLanguage ? 'سڕینەوەی عەرز' : 'Delete Quotation',
      isAr
        ? `هل أنت متأكد من حذف عرض السعر ${quotation.quotationNumber}؟`
        : isKuLanguage
        ? `ئایا دڵنیایت لە سڕینەوەی عەرزی ${quotation.quotationNumber}؟`
        : `Are you sure you want to delete quotation ${quotation.quotationNumber}?`,
      [
        { text: isAr ? 'إلغاء' : isKuLanguage ? 'پاشگەزبوونەوە' : 'Cancel', style: 'cancel' },
        { text: isAr ? 'حذف' : isKuLanguage ? 'سڕینەوە' : 'Delete', style: 'destructive', onPress: () => onDelete(quotation) },
      ]
    );
  };

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
        onPress={() => onPress(quotation)}
        activeOpacity={0.82}
      >
        {/* Top Badges Row */}
        <View style={[styles.gridTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.gridPillBadge, { backgroundColor: colors.softBlue }]}>
            <Ionicons name="document-text" size={12} color={colors.primary} />
            <IdText style={[styles.gridPillText, { color: colors.primary, fontWeight: '700' }]}>
              {quotation.quotationNumber}
            </IdText>
          </View>

          <View style={[styles.gridDateBadge, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}>
            <Text style={[styles.gridDateText, { color: colors.gray500 }]}>
              {quotation.date}
            </Text>
          </View>
        </View>

        {/* Large Center Avatar */}
        <View style={styles.gridAvatarWrap}>
          <View style={[styles.gridAvatar, { backgroundColor: colors.softBlue }]}>
            <Ionicons
              name="receipt-outline"
              size={isTabletLandscape ? 32 : isTablet ? 28 : 24}
              color={colors.primary}
            />
          </View>
        </View>

        {/* Customer / Company Name & Phone */}
        <View style={styles.gridInfoWrap}>
          <Text
            style={[
              styles.gridName,
              { color: colors.black, textAlign: 'center' },
            ]}
            numberOfLines={1}
          >
            {displayCustomerName}
          </Text>
          {quotation.customerPhone ? (
            <View style={[styles.gridPhoneRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="call-outline" size={isTablet ? 13 : 11} color={colors.gray400} />
              <Text style={[styles.gridPhone, { color: colors.gray400 }]}>
                {quotation.customerPhone}
              </Text>
            </View>
          ) : null}

          {/* Print Status Badge */}
          <View
            style={[
              styles.printStatusBadge,
              isPrinted
                ? {
                    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
                    borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#86EFAC',
                  }
                : {
                    backgroundColor: isDark ? colors.gray200 : colors.gray100,
                    borderColor: isDark ? colors.gray300 : 'transparent',
                  },
              { marginTop: 4, flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name={isPrinted ? 'print' : 'print-outline'}
              size={11}
              color={isPrinted ? (isDark ? '#4ADE80' : '#15803D') : colors.gray400}
            />
            <Text
              style={[
                styles.printStatusText,
                { color: isPrinted ? (isDark ? '#4ADE80' : '#15803D') : colors.gray400 },
              ]}
            >
              {isPrinted
                ? (isAr ? `مطبوع (${printCount})` : isKuLanguage ? `چاپکراوە (${printCount})` : `Printed (${printCount})`)
                : (isAr ? 'غير مطبوع' : isKuLanguage ? 'چاپ نەکراوە' : 'Not printed')}
            </Text>
          </View>
        </View>

        {/* Stats Box */}
        <View style={[styles.gridStatsBox, { backgroundColor: isDark ? colors.gray200 : colors.gray50 }]}>
          <View style={styles.gridStatItem}>
            <Text style={[styles.gridStatLabel, { color: colors.gray400 }]}>
              {isAr ? 'المجموع الكلي' : isKuLanguage ? 'کۆی گشتی' : 'Total'}
            </Text>
            {quotation.currencyMode === 'usd' ? (
              <Text style={[styles.gridStatValue, { color: colors.primary, fontWeight: '800', direction: 'ltr' }]}>
                ${fmtUSD(usdValue)} USD
              </Text>
            ) : (
              <AmountText
                value={quotation.grandTotal}
                currency="IQD"
                variant={isTablet ? 'default' : 'small'}
                style={[styles.gridStatValue, { color: colors.primary }]}
              />
            )}
            {(!quotation.currencyMode || quotation.currencyMode === 'both') && usdValue > 0 && (
              <Text style={[styles.gridUsdText, { color: colors.success }]}>
                ≈ ${fmtUSD(usdValue)}
              </Text>
            )}
          </View>
        </View>

        {/* Bottom Actions Row */}
        <View style={[styles.gridActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.gray100 }]}>
          <TouchableOpacity
            style={[styles.gridActionBtn, { flex: 1, backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF9C3' }]}
            onPress={() => onPress(quotation)}
            hitSlop={6}
          >
            <Ionicons name="receipt-outline" size={14} color={colors.primary} />
            <Text style={[styles.gridActionBtnText, { color: colors.primary }]}>
              {isAr ? 'فاتورة' : isKuLanguage ? 'وەسڵ' : 'Invoice'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridActionBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEE2E2' }]}
            onPress={handleDeletePrompt}
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={14} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ─── Standard List Row Layout (Full-width row) ─────────────────────────────
  const cardPad = isTabletLandscape ? 18 : isTablet ? 16 : (isRTL ? RTL_SPACING.cardPad : 14);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.white,
          flexDirection,
          padding: cardPad,
          marginBottom: isTablet ? 10 : (isRTL ? RTL_SPACING.cardGap : 8),
        },
      ]}
      onPress={() => onPress(quotation)}
      activeOpacity={0.82}
    >
      {/* Avatar Icon */}
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: colors.softBlue,
            marginEnd: isRTL ? 0 : (isTablet ? 14 : 12),
            marginStart: isRTL ? (isTablet ? 14 : RTL_SPACING.gapXl) : 0,
          },
        ]}
      >
        <Ionicons
          name="document-text-outline"
          size={isTablet ? 22 : 18}
          color={colors.primary}
        />
      </View>

      {/* Main Body */}
      <View style={[styles.body, { gap: isRTL ? RTL_SPACING.stackGap : 2 }]}>
        <View style={[styles.nameRow, { flexDirection, gap: 6, marginBottom: 2, flexWrap: 'wrap' }]}>
          <Text style={[styles.name, { color: colors.black, textAlign }]} numberOfLines={1}>
            {displayCustomerName}
          </Text>
          <View style={[styles.idBadge, { backgroundColor: colors.softBlue }]}>
            <IdText style={[styles.idBadgeText, { color: colors.primary }]}>
              {quotation.quotationNumber}
            </IdText>
          </View>

          {/* Print Status Badge */}
          <View
            style={[
              styles.printStatusBadge,
              isPrinted
                ? {
                    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7',
                    borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : '#86EFAC',
                  }
                : {
                    backgroundColor: isDark ? colors.gray200 : colors.gray100,
                    borderColor: isDark ? colors.gray300 : 'transparent',
                  },
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name={isPrinted ? 'print' : 'print-outline'}
              size={11}
              color={isPrinted ? (isDark ? '#4ADE80' : '#15803D') : colors.gray400}
            />
            <Text
              style={[
                styles.printStatusText,
                { color: isPrinted ? (isDark ? '#4ADE80' : '#15803D') : colors.gray400 },
              ]}
            >
              {isPrinted
                ? (isAr ? `مطبوع (${printCount})` : isKuLanguage ? `چاپکراوە (${printCount})` : `Printed (${printCount})`)
                : (isAr ? 'غير مطبوع' : isKuLanguage ? 'چاپ نەکراوە' : 'Not printed')}
            </Text>
          </View>
        </View>

        {quotation.customerPhone ? (
          <View style={[styles.phoneRow, { flexDirection, gap: 4, marginBottom: 2 }]}>
            <Ionicons name="call-outline" size={isTablet ? 14 : 12} color={colors.gray400} />
            <Text style={[styles.phone, { color: colors.gray400, textAlign }]}>
              {quotation.customerPhone}
            </Text>
          </View>
        ) : null}

        <View style={[styles.subRow, { flexDirection, gap: 4, alignItems: 'center' }]}>
          <Ionicons name="time-outline" size={12} color={colors.gray400} />
          <Text style={[styles.sub, { color: colors.gray400, textAlign }]}>
            {quotation.date} {quotation.time ? `• ${formatTime(quotation.time)}` : ''}
          </Text>
        </View>
      </View>

      {/* Right Column: Amount + Quick Actions */}
      <View style={[styles.rightCol, { alignItems: isRTL ? 'flex-start' : 'flex-end', marginEnd: isRTL ? 0 : 4, marginStart: isRTL ? 4 : 0 }]}>
        {quotation.currencyMode === 'usd' ? (
          <Text style={[{ color: colors.primary, fontWeight: '800', fontSize: isTablet ? 16 : 13.5, direction: 'ltr' }]}>
            ${fmtUSD(usdValue)} USD
          </Text>
        ) : (
          <AmountText
            value={quotation.grandTotal}
            currency="IQD"
            variant={isTablet ? 'default' : 'small'}
            style={[{ color: colors.primary, fontWeight: '800' }]}
          />
        )}
        {(!quotation.currencyMode || quotation.currencyMode === 'both') && usdValue > 0 && (
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success, marginTop: 1 }}>
            ≈ ${fmtUSD(usdValue)}
          </Text>
        )}

        <View style={[styles.rowActions, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 6, gap: 6 }]}>
          <TouchableOpacity
            style={[styles.miniActionBtn, { backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF9C3' }]}
            onPress={() => onPress(quotation)}
            hitSlop={6}
          >
            <Ionicons name="receipt-outline" size={13} color={colors.primary} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
              {isAr ? 'فاتورة' : isKuLanguage ? 'وەسڵ' : 'Invoice'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.miniActionBtn, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEE2E2' }]}
            onPress={handleDeletePrompt}
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={13} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const QuotationCard = React.memo(QuotationCardImpl);

function getStyles(isTablet: boolean, isTabletLandscape: boolean, isDark: boolean) {
  return StyleSheet.create({
    // ─── List Layout Styles ───
    card: {
      borderRadius: isTablet ? 16 : 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      ...Theme.shadow.card,
    },
    avatar: {
      width: isTabletLandscape ? 44 : isTablet ? 40 : 36,
      height: isTabletLandscape ? 44 : isTablet ? 40 : 36,
      borderRadius: isTablet ? 12 : 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      flex: 1,
      justifyContent: 'center',
    },
    nameRow: {
      alignItems: 'center',
    },
    name: {
      fontSize: isTabletLandscape ? 15 : isTablet ? 14 : 13.5,
      fontWeight: '700',
      flexShrink: 1,
    },
    idBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 6,
    },
    idBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
    printStatusBadge: {
      alignItems: 'center',
      gap: 3.5,
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 6,
      borderWidth: 1,
    },
    printStatusText: {
      fontSize: 10,
      fontWeight: '700',
    },
    phoneRow: {
      alignItems: 'center',
    },
    phone: {
      fontSize: isTablet ? 12.5 : 11.5,
    },
    subRow: {
      alignItems: 'center',
    },
    sub: {
      fontSize: isTablet ? 12 : 11,
    },
    subDot: {
      fontSize: 11,
    },
    rightCol: {
      justifyContent: 'center',
    },
    rowActions: {
      alignItems: 'center',
    },
    miniActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },

    // ─── Grid Layout Styles ───
    gridCard: {
      flex: 1,
      borderRadius: isTablet ? 16 : 12,
      borderWidth: 1,
      padding: isTabletLandscape ? 14 : isTablet ? 12 : 10,
      justifyContent: 'space-between',
      ...Theme.shadow.card,
    },
    gridTopRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    gridPillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 8,
    },
    gridPillText: {
      fontSize: 11,
    },
    gridDateBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    gridDateText: {
      fontSize: 10,
      fontWeight: '500',
    },
    gridAvatarWrap: {
      alignItems: 'center',
      marginVertical: 4,
    },
    gridAvatar: {
      width: isTabletLandscape ? 50 : isTablet ? 44 : 40,
      height: isTabletLandscape ? 50 : isTablet ? 44 : 40,
      borderRadius: isTablet ? 14 : 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridInfoWrap: {
      alignItems: 'center',
      marginBottom: 6,
    },
    gridName: {
      fontSize: isTabletLandscape ? 14 : isTablet ? 13 : 12.5,
      fontWeight: '700',
      marginBottom: 2,
    },
    gridPhoneRow: {
      alignItems: 'center',
      gap: 3,
    },
    gridPhone: {
      fontSize: 11,
    },
    gridStatsBox: {
      borderRadius: 8,
      padding: 6,
      marginBottom: 8,
      alignItems: 'center',
    },
    gridStatItem: {
      alignItems: 'center',
      width: '100%',
    },
    gridStatLabel: {
      fontSize: 10,
      marginBottom: 2,
    },
    gridStatValue: {
      fontWeight: '800',
    },
    gridUsdText: {
      fontSize: 10.5,
      fontWeight: '600',
      marginTop: 1,
    },
    gridActionsRow: {
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 6,
      borderTopWidth: 1,
      gap: 4,
    },
    gridActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      flex: 1,
    },
    gridActionBtnText: {
      fontSize: 10.5,
      fontWeight: '700',
    },
  });
}
