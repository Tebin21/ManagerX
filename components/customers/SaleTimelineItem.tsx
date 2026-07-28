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
import type { Sale } from '@/types/sales';

interface Props {
  sale: Sale;
  isLast: boolean;
  onPress: () => void;
  onShare: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  fib:  'FIB',
  debt: 'Debt',
};

export function SaleTimelineItem({ sale, isLast, onPress, onShare, onEdit, onDelete }: Props) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const debtTint = useMemo(() => getStatusTint('warning', colors, isDark), [colors, isDark]);
  const { isRTL, flexDirection } = useRTL();
  const { chevronForward } = useDirectionalChevron();
  const hasDebt = sale.remainingDebt > 0;

  const methodColor: Record<string, string> = {
    cash: colors.success,
    fib:  colors.primary,
    debt: colors.warning,
  };
  return (
    <View style={[styles.row, { flexDirection }]}>
      {/* Timeline spine */}
      <View style={styles.spine}>
        <View style={[styles.dot, hasDebt ? styles.dotDebt : styles.dotPaid]} />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Card */}
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
        {/* Header */}
        <View style={[styles.cardTop, { flexDirection }]}>
          <View>
            <IdText style={styles.invoice}>{sale.invoiceNumber}</IdText>
            <DateText value={sale.date ?? sale.createdAt} size="small" style={styles.date} />
          </View>
          <View style={[styles.badges, { justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
            <View style={[styles.methodBadge, { backgroundColor: `${methodColor[sale.paymentMethod]}20` }]}>
              <Text style={[styles.methodText, { color: methodColor[sale.paymentMethod] }]}>
                {METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
              </Text>
            </View>
            {hasDebt && (
              <View style={[styles.debtBadge, { backgroundColor: debtTint.bg }]}>
                <AmountText value={sale.remainingDebt} currency="IQD left" variant="small" style={[styles.debtText, { color: debtTint.text }]} />
              </View>
            )}
          </View>
        </View>

        {/* Items summary */}
        {sale.items && sale.items.length > 0 && (
          <View style={[styles.itemsRow, { flexDirection }]}>
            <Ionicons name="cube-outline" size={12} color={colors.gray400} />
            <Text style={styles.itemsSummary} numberOfLines={1}>
              {sale.items.map((i) => i.productName).join(', ')}
            </Text>
          </View>
        )}

        {/* Totals */}
        <View style={[styles.totalsRow, { flexDirection }]}>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <AmountText value={sale.grandTotal} currency="IQD" style={styles.totalValue} />
          </View>
          {sale.discountTotal > 0 && (
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Discount</Text>
              <AmountText value={sale.discountTotal} currency="IQD" prefix="-" style={[styles.totalValue, styles.discountValue]} />
            </View>
          )}
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Paid</Text>
            <AmountText value={sale.paidAmount} currency="IQD" style={[styles.totalValue, styles.paidValue]} />
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { flexDirection }]}>
          <TouchableOpacity style={[styles.actionBtn, { flexDirection }]} onPress={onShare} hitSlop={8}>
            <Ionicons name="share-outline" size={14} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>Share</Text>
          </TouchableOpacity>
          {onEdit && (
            <TouchableOpacity style={[styles.actionBtn, { flexDirection }]} onPress={onEdit} hitSlop={8}>
              <Ionicons name="create-outline" size={14} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDelete]} onPress={onDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={styles.actionTextDelete}>Delete</Text>
            </TouchableOpacity>
          )}
          <View style={styles.actionRight}>
            <Ionicons name={chevronForward as never} size={16} color={colors.gray300} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function getStyles(colors: AppColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    spine: {
      alignItems: 'center',
      width: 16,
      paddingTop: 4,
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.white,
    },
    dotPaid: { backgroundColor: colors.success },
    dotDebt: { backgroundColor: colors.warning },
    line: {
      width: 2,
      flex: 1,
      backgroundColor: colors.gray200,
      marginTop: 4,
    },

    card: {
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: Theme.radius.md,
      padding: 14,
      marginBottom: 12,
      ...Theme.shadow.soft,
    },

    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    invoice: { fontSize: 13, fontWeight: '700', color: colors.black },
    date:    { fontSize: 11, color: colors.gray400, marginTop: 2 },

    badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
    methodBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    methodText: { fontSize: 11, fontWeight: '700' },
    debtBadge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    debtText: { fontSize: 11, fontWeight: '600' },

    itemsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 8,
    },
    itemsSummary: { flex: 1, fontSize: 12, color: colors.gray500 },

    totalsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 10,
      flexWrap: 'wrap',
    },
    totalItem: {},
    totalLabel: { fontSize: 10, color: colors.gray400, fontWeight: '600' },
    totalValue: { fontSize: 13, fontWeight: '700', color: colors.black },
    discountValue: { color: colors.error },
    paidValue: { color: colors.success },

    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.gray100,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionText: { fontSize: 12, fontWeight: '600' },
    actionRight:       { marginStart: 'auto' },
    actionBtnDelete:   { marginStart: 4 },
    actionTextDelete:  { fontSize: 12, fontWeight: '600', color: colors.error },
  });
}
