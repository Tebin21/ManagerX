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
import { getStatusTint } from '@/constants/statusTints';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { isDirectSupplierName } from '@/lib/sqlite';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
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
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isPaid = purchase.paymentStatus === 'paid';
  const statusTint = useMemo(
    () => getStatusTint(isPaid ? 'success' : 'warning', colors, isDark),
    [colors, isDark, isPaid]
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
            {isPaid ? t('common.paid') : t('common.debt')}
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
                {isKuLanguage ? 'دابینکەری ڕاستەوخۆ' : 'Direct Supplier'}
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
            borderColor: isDark ? colors.gray200 : colors.gray100,
          },
        ]}
      >
        <View style={[styles.priceRow, { flexDirection, justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={[styles.qtyBadge, { flexDirection }]}>
            <Text style={[styles.qtyLabel, { color: colors.gray400 }]}>{t('purchases.qty')}:</Text>
            <Text style={[styles.qtyValue, { color: colors.black }]}> {purchase.quantity}</Text>
          </View>
          <AmountText
            value={purchase.totalIQD}
            currency="IQD"
            style={[styles.totalAmount, { color: colors.primary }]}
          />
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
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginTop: 8,
    marginBottom: 8,
  },
  priceRow: {},
  qtyBadge: {
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 11,
  },
  qtyValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 13.5,
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
