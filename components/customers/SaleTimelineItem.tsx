import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import type { Sale } from '@/types/sales';

interface Props {
  sale: Sale;
  isLast: boolean;
  onPress: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  fib:  'FIB',
  debt: 'Debt',
};

const METHOD_COLOR: Record<string, string> = {
  cash: Colors.success,
  fib:  Colors.primary,
  debt: Colors.warning,
};

export function SaleTimelineItem({ sale, isLast, onPress, onShare, onDelete }: Props) {
  const hasDebt = sale.remainingDebt > 0;
  const dateStr = new Date(sale.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <View style={styles.row}>
      {/* Timeline spine */}
      <View style={styles.spine}>
        <View style={[styles.dot, hasDebt ? styles.dotDebt : styles.dotPaid]} />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* Card */}
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
        {/* Header */}
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.invoice}>{sale.invoiceNumber}</Text>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
          <View style={styles.badges}>
            <View style={[styles.methodBadge, { backgroundColor: `${METHOD_COLOR[sale.paymentMethod]}20` }]}>
              <Text style={[styles.methodText, { color: METHOD_COLOR[sale.paymentMethod] }]}>
                {METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
              </Text>
            </View>
            {hasDebt && (
              <View style={styles.debtBadge}>
                <Text style={styles.debtText}>
                  {sale.remainingDebt.toLocaleString('en-US')} IQD left
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Items summary */}
        {sale.items && sale.items.length > 0 && (
          <View style={styles.itemsRow}>
            <Ionicons name="cube-outline" size={12} color={Colors.gray400} />
            <Text style={styles.itemsSummary} numberOfLines={1}>
              {sale.items.map((i) => i.productName).join(', ')}
            </Text>
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>{sale.grandTotal.toLocaleString('en-US')} IQD</Text>
          </View>
          {sale.discountTotal > 0 && (
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, styles.discountValue]}>
                -{sale.discountTotal.toLocaleString('en-US')} IQD
              </Text>
            </View>
          )}
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Paid</Text>
            <Text style={[styles.totalValue, styles.paidValue]}>
              {sale.paidAmount.toLocaleString('en-US')} IQD
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onShare} hitSlop={8}>
            <Ionicons name="share-outline" size={14} color={Colors.primary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={14} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
          </TouchableOpacity>
          <View style={styles.actionRight}>
            <Ionicons name="chevron-forward" size={16} color={Colors.gray300} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderColor: Colors.white,
  },
  dotPaid: { backgroundColor: Colors.success },
  dotDebt: { backgroundColor: Colors.warning },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.gray200,
    marginTop: 4,
  },

  card: {
    flex: 1,
    backgroundColor: Colors.white,
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
  invoice: { fontSize: 13, fontWeight: '700', color: Colors.black },
  date:    { fontSize: 11, color: Colors.gray400, marginTop: 2 },

  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  methodBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  methodText: { fontSize: 11, fontWeight: '700' },
  debtBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  debtText: { fontSize: 11, fontWeight: '600', color: '#92400E' },

  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  itemsSummary: { flex: 1, fontSize: 12, color: Colors.gray500 },

  totalsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  totalItem: {},
  totalLabel: { fontSize: 10, color: Colors.gray400, fontWeight: '600' },
  totalValue: { fontSize: 13, fontWeight: '700', color: Colors.black },
  discountValue: { color: Colors.error },
  paidValue: { color: Colors.success },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  actionRight: { marginLeft: 'auto' },
});
