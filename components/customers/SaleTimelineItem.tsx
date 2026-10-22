import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { DateText } from '@/components/ui/DateText';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { getStatusTint } from '@/constants/statusTints';
import { useRTL, useDirectionalChevron } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import type { Sale } from '@/types/sales';

interface Props {
  sale: Sale;
  isLast: boolean;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SaleTimelineItem({ sale, isLast, onPress, onEdit, onDelete }: Props) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const debtTint = useMemo(() => getStatusTint('warning', colors, isDark), [colors, isDark]);
  const { isRTL, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const hasDebt = (sale.remainingDebt ?? 0) > 0;

  const methodBadgeStyle = useMemo(() => {
    switch (sale.paymentMethod) {
      case 'debt':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
          border: isDark ? '#D97706' : '#FDE68A',
          text: isDark ? '#FBBF24' : '#D97706',
          label: isKuLanguage ? 'قەرز' : 'Debt',
        };
      case 'fib':
        return {
          bg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
          border: isDark ? '#2563EB' : '#BFDBFE',
          text: isDark ? '#60A5FA' : '#1D4ED8',
          label: 'FIB',
        };
      case 'cash':
      default:
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
          border: isDark ? '#059669' : '#A7F3D0',
          text: isDark ? '#34D399' : '#059669',
          label: isKuLanguage ? 'کاش' : 'Cash',
        };
    }
  }, [sale.paymentMethod, isDark, isKuLanguage]);

  return (
    <View style={[styles.row, { flexDirection }]}>
      {/* Timeline spine */}
      <View style={styles.spine}>
        <View style={[styles.dot, hasDebt ? styles.dotDebt : styles.dotPaid]} />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Main Invoice Card */}
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        {/* Header: Invoice #, Date, and Badges */}
        <View style={[styles.cardHeader, { flexDirection }]}>
          <View style={styles.headerInfo}>
            <View style={[styles.invoiceRow, { flexDirection }]}>
              <Ionicons name="receipt-outline" size={15} color={colors.primary} />
              <IdText style={styles.invoiceNumber}>#{sale.invoiceNumber}</IdText>
            </View>
            <View style={[styles.dateRow, { flexDirection }]}>
              <Ionicons name="calendar-outline" size={12} color={colors.gray400} />
              <DateText value={sale.date ?? sale.createdAt} size="small" style={styles.dateText} />
            </View>
          </View>

          <View style={[styles.badgesContainer, { flexDirection }]}>
            <View style={[styles.methodBadge, { backgroundColor: methodBadgeStyle.bg, borderColor: methodBadgeStyle.border }]}>
              <Text style={[styles.methodText, { color: methodBadgeStyle.text }]}>
                {methodBadgeStyle.label}
              </Text>
            </View>
            {hasDebt && (
              <View style={[styles.debtBadge, { backgroundColor: debtTint.bg, borderColor: isDark ? colors.warning : '#FDE68A' }]}>
                <AmountText
                  value={sale.remainingDebt}
                  currency={isKuLanguage ? 'قەرز' : 'Debt'}
                  variant="small"
                  style={[styles.debtBadgeText, { color: debtTint.text }]}
                />
              </View>
            )}
          </View>
        </View>

        {/* Product Items Summary */}
        {sale.items && sale.items.length > 0 && (
          <View style={[styles.itemsBox, { flexDirection }]}>
            <View style={styles.itemsIconWrap}>
              <Ionicons name="cube-outline" size={13} color={colors.primary} />
            </View>
            <View style={styles.itemsTextContainer}>
              <Text style={[styles.itemsSummary, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                {sale.items
                  .map((i) => (i.quantity > 1 ? `${i.productName} (${i.quantity}x)` : i.productName))
                  .join(' ، ')}
              </Text>
            </View>
          </View>
        )}

        {/* Financial Metrics Row */}
        <View style={[styles.totalsBox, { flexDirection }]}>
          {/* Grand Total */}
          <View style={styles.totalCol}>
            <Text style={[styles.totalLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isKuLanguage ? 'کۆی گشتی' : 'Grand Total'}
            </Text>
            <AmountText
              value={sale.grandTotal}
              style={[styles.totalValue, { textAlign: isRTL ? 'right' : 'left' }]}
            />
          </View>

          {/* Paid Amount */}
          <View style={styles.totalCol}>
            <Text style={[styles.totalLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isKuLanguage ? 'بڕی دراو' : 'Paid'}
            </Text>
            <AmountText
              value={sale.paidAmount}
              style={[styles.paidValue, { textAlign: isRTL ? 'right' : 'left' }]}
            />
          </View>

          {/* Discount (if > 0) */}
          {sale.discountTotal > 0 && (
            <View style={styles.totalCol}>
              <Text style={[styles.totalLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {isKuLanguage ? 'داشکاندن' : 'Discount'}
              </Text>
              <AmountText
                value={sale.discountTotal}
                prefix="-"
                style={[styles.discountValue, { textAlign: isRTL ? 'right' : 'left' }]}
              />
            </View>
          )}

          {/* Remaining Debt (if > 0) */}
          {hasDebt && (
            <View style={styles.totalCol}>
              <Text style={[styles.totalLabel, { color: colors.warning, textAlign: isRTL ? 'right' : 'left' }]}>
                {isKuLanguage ? 'قەرزی ماوە' : 'Remaining'}
              </Text>
              <AmountText
                value={sale.remainingDebt}
                style={[styles.debtTotalValue, { textAlign: isRTL ? 'right' : 'left' }]}
              />
            </View>
          )}
        </View>

        {/* Actions Row: Edit & Delete (No Share button) + Details chevron */}
        <View style={[styles.actionsRow, { flexDirection }]}>
          <View style={[styles.actionButtons, { flexDirection }]}>
            {onEdit && (
              <TouchableOpacity
                style={[styles.actionBtn, { flexDirection }]}
                onPress={onEdit}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.primary }]}>
                  {isKuLanguage ? 'دەستکاریکردن' : 'Edit'}
                </Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn, { flexDirection }]}
                onPress={onDelete}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={14} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>
                  {isKuLanguage ? 'سڕینەوە' : 'Delete'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.detailsLink, { flexDirection }]}>
            <Text style={styles.detailsText}>
              {isKuLanguage ? 'وردەکاری' : 'Details'}
            </Text>
            <Ionicons name={chevronForward as never} size={15} color={colors.gray400} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function getStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    spine: {
      alignItems: 'center',
      width: 16,
      paddingTop: 8,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: isDark ? colors.gray100 : colors.white,
    },
    dotPaid: { backgroundColor: colors.success },
    dotDebt: { backgroundColor: colors.warning },
    line: {
      width: 2,
      flex: 1,
      backgroundColor: isDark ? colors.gray300 : colors.gray200,
      marginTop: 4,
    },

    card: {
      flex: 1,
      backgroundColor: isDark ? colors.gray50 : colors.gray50,
      borderRadius: Theme.radius.md,
      padding: 13,
      borderWidth: 1,
      borderColor: colors.gray200,
      ...Theme.shadow.soft,
    },

    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    headerInfo: {
      gap: 3,
    },
    invoiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    invoiceNumber: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.black,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dateText: {
      fontSize: 11,
      color: colors.gray400,
    },

    badgesContainer: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    methodBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
    },
    methodText: {
      fontSize: 11,
      fontWeight: '700',
    },
    debtBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
    },
    debtBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },

    itemsBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : colors.white,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginBottom: 10,
    },
    itemsIconWrap: {
      width: 22,
      height: 22,
      borderRadius: 6,
      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemsTextContainer: {
      flex: 1,
      marginHorizontal: 8,
    },
    itemsSummary: {
      fontSize: 12,
      color: colors.gray600,
      lineHeight: 16,
    },

    totalsBox: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : colors.white,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray200,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
      gap: 8,
    },
    totalCol: {
      flex: 1,
      gap: 2,
    },
    totalLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.gray400,
    },
    totalValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.black,
    },
    paidValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.success,
    },
    discountValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.error,
    },
    debtTotalValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.warning,
    },

    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? colors.gray200 : colors.gray200,
    },
    actionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    deleteBtn: {},
    actionText: {
      fontSize: 12,
      fontWeight: '600',
    },
    detailsLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    detailsText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.gray400,
    },
  });
}
