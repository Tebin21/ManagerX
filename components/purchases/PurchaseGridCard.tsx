import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { getStatusTint, getBlueTint } from '@/constants/statusTints';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { isDirectSupplierName } from '@/lib/sqlite';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import type { Purchase } from '@/types/purchases';

interface Props {
  purchase: Purchase;
  onPress: () => void;
  onDelete: () => void;
}

export function PurchaseGridCard({ purchase, onPress, onDelete }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isTablet } = useResponsive();
  const currentLang = useLanguageStore((s) => s.language);
  const isKuLanguage = currentLang === 'ku';
  const isAr = currentLang === 'ar';
  const isKuOrAr = isKuLanguage || isAr;
  const isPaid = purchase.paymentStatus === 'paid';
  const isFib = purchase.paymentStatus === 'fib';
  const statusTint = useMemo(
    () => isFib ? getBlueTint(isDark) : getStatusTint(isPaid ? 'success' : 'warning', colors, isDark),
    [colors, isDark, isPaid, isFib]
  );
  const { isRTL, textAlign, flexDirection, alignEnd } = useRTL();
  const isDirectSupplier = isDirectSupplierName(purchase.supplierName);

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
      {/* Top Header: Badge + Status */}
      <View style={[styles.topRow, { flexDirection }]}>
        <View style={[styles.numBadge, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
          <IdText style={[styles.numText, { color: colors.primary }]}>{purchase.purchaseNumber}</IdText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusTint.bg }]}>
          <Text style={[styles.statusText, { color: statusTint.text }]}>
            {isFib ? 'FIB' : (isPaid ? t('common.paid') : t('common.debt'))}
          </Text>
        </View>
      </View>

      {/* Main Info */}
      <View style={styles.bodyContent}>
        <Text
          style={[
            styles.productName,
            isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            { color: colors.black, textAlign },
          ]}
          numberOfLines={2}
        >
          {purchase.productName}
        </Text>

        {/* Supplier Info */}
        {purchase.supplierName ? (
          isDirectSupplier ? (
            <View style={[styles.metaRow, { flexDirection, gap: 4, marginTop: 4 }]}>
              <Ionicons name="flash" size={12} color="#D97706" />
              <Text
                style={[
                  styles.supplierText,
                  { color: isDark ? '#FBBF24' : '#B45309', fontWeight: '700', textAlign },
                ]}
                numberOfLines={1}
              >
                {isAr ? 'مورد مباشر' : isKuLanguage ? 'دابینکەری ڕاستەوخۆ' : 'Direct Supplier'}
              </Text>
            </View>
          ) : (
            <View style={[styles.metaRow, { flexDirection, gap: 4, marginTop: 4 }]}>
              <Ionicons name="business-outline" size={12} color={colors.gray400} />
              <Text style={[styles.supplierText, { color: colors.gray500, textAlign }]} numberOfLines={1}>
                {purchase.supplierName}
              </Text>
            </View>
          )
        ) : null}

        {/* Optional Supplier Phone / Address */}
        {(purchase.supplierPhone || purchase.supplierAddress) && !isDirectSupplier ? (
          <View style={[styles.metaRow, { flexDirection, gap: 8, marginTop: 3 }]}>
            {Boolean(purchase.supplierPhone) && (
              <View style={[styles.inlineSnippet, { flexDirection }]}>
                <Ionicons name="call-outline" size={10} color={colors.gray400} />
                <Text style={[styles.snippetText, { color: colors.gray400 }]} numberOfLines={1}>
                  {purchase.supplierPhone}
                </Text>
              </View>
            )}
            {Boolean(purchase.supplierAddress) && (
              <View style={[styles.inlineSnippet, { flexDirection }]}>
                <Ionicons name="location-outline" size={10} color={colors.gray400} />
                <Text style={[styles.snippetText, { color: colors.gray400 }]} numberOfLines={1}>
                  {purchase.supplierAddress}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>

      {/* Pricing & Qty Highlight Box */}
      <View
        style={[
          styles.pricingBox,
          {
            backgroundColor: isDark ? colors.gray100 : colors.gray50,
            borderColor: isDark ? colors.gray200 : hexToRgba(colors.gray200, 0.8),
          },
        ]}
      >
        {/* Quantity Row */}
        <View style={[styles.priceRow, { flexDirection, justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text
            style={[
              styles.qtyLabel,
              { color: colors.gray400, textAlign },
              isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
            numberOfLines={1}
          >
            {isAr ? 'الكمية' : isKuLanguage ? 'بڕ' : 'Quantity'}
          </Text>
          <View style={[styles.qtyBadge, { backgroundColor: isDark ? colors.gray200 : hexToRgba(colors.gray300, 0.45) }]}>
            <Text style={[styles.qtyValue, { color: colors.black }]} numberOfLines={1}>
              {purchase.quantity}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.priceDivider, { backgroundColor: isDark ? colors.gray200 : hexToRgba(colors.gray200, 0.6) }]} />

        {/* Total Cost Row */}
        <View style={[styles.priceRow, { flexDirection, justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text
            style={[
              styles.priceLabel,
              { color: colors.gray400, textAlign },
              isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
            numberOfLines={1}
          >
            {isAr ? 'المجموع' : isKuLanguage ? 'کۆی گشتی' : 'Total'}
          </Text>
          <View style={{ flex: 1, minWidth: 0, alignItems: alignEnd, paddingLeft: isRTL ? 0 : 6, paddingRight: isRTL ? 6 : 0 }}>
            <AmountText
              value={purchase.totalIQD}
              currency="IQD"
              variant="small"
              style={[styles.totalAmount, { color: colors.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            />
          </View>
        </View>
      </View>

      {/* Footer: Date & Delete */}
      <View style={[styles.footerRow, { flexDirection }]}>
        <DateText value={purchase.createdAt} size="small" style={{ color: colors.gray400, fontSize: 11 }} />
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={8}
          style={[styles.deleteBtn, { backgroundColor: hexToRgba(colors.error, 0.08) }]}
        >
          <Ionicons name="trash-outline" size={14} color={colors.error} />
        </TouchableOpacity>
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
  productName: {
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 20,
  },
  metaRow: {
    alignItems: 'center',
  },
  supplierText: {
    fontSize: 11.5,
    fontWeight: '500',
    flexShrink: 1,
  },
  inlineSnippet: {
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  snippetText: {
    fontSize: 10.5,
  },
  pricingBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  priceRow: {
    width: '100%',
  },
  priceDivider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  qtyBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  qtyValue: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  footerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
