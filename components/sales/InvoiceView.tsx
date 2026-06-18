import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import type { Sale } from '@/types/sales';
import { fmtIQD, formatDateTime } from '@/utils/formatters';

interface Props {
  sale: Sale;
  compact?: boolean;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash', fib: 'FIB', debt: 'Debt',
};
const PAYMENT_BG: Record<string, string> = {
  cash: '#D1FAE5', fib: '#DBEAFE', debt: '#FEE2E2',
};

export function InvoiceView({ sale, compact = false }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();

  const paymentTextColor: Record<string, string> = {
    cash: '#065F46', fib: colors.darkBlue, debt: '#991B1B',
  };
  const items = sale.items ?? [];

  return (
    <View>
      {/* Header row */}
      <View style={[styles.headerRow, { flexDirection }]}>
        <View>
          <Text style={[styles.invoiceNumber, { textAlign }]}>{sale.invoiceNumber}</Text>
          <Text style={[styles.date, { textAlign }]}>{formatDateTime(sale.date ?? sale.createdAt)}</Text>
        </View>
        <View style={[styles.payBadge, { backgroundColor: PAYMENT_BG[sale.paymentMethod] }]}>
          <Text style={[styles.payBadgeText, { color: paymentTextColor[sale.paymentMethod] }]}>
            {PAYMENT_LABEL[sale.paymentMethod]}
          </Text>
        </View>
      </View>

      {/* Customer info */}
      {(sale.customerName || sale.customerPhone) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>Customer</Text>
          {sale.customerName ? <Text style={[styles.infoText, { textAlign }]}>{sale.customerName}</Text> : null}
          {sale.customerPhone ? <Text style={[styles.infoSub, { textAlign }]}>{sale.customerPhone}</Text> : null}
          {sale.customerAddress ? <Text style={[styles.infoSub, { textAlign }]}>{sale.customerAddress}</Text> : null}
        </View>
      )}

      {/* Warranty */}
      {sale.warranty ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>Warranty</Text>
          <Text style={[styles.infoText, { textAlign }]}>{sale.warranty}</Text>
        </View>
      ) : null}

      {/* Items */}
      {!compact && items.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>Items</Text>
          {items.map((item, i) => (
            <View key={item.id ?? i} style={[styles.itemRow, { flexDirection }]}>
              <View style={styles.itemLeft}>
                <Text style={[styles.itemName, { textAlign }]}>{item.productName}</Text>
                {item.itemId ? <Text style={[styles.itemId, { color: colors.primary, textAlign }]}>#{item.itemId}</Text> : null}
              </View>
              <Text style={[styles.itemQty, { textAlign: isRTL ? 'left' : 'right' }]}>×{item.quantity}</Text>
              <Text style={[styles.itemTotal, { textAlign: isRTL ? 'left' : 'right' }]}>{fmtIQD(item.lineTotal)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Totals */}
      <View style={[styles.section, styles.totalsSection]}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { textAlign }]}>Subtotal</Text>
          <Text style={[styles.totalValue, { textAlign: isRTL ? 'left' : 'right' }]}>{fmtIQD(sale.subtotal)}</Text>
        </View>
        {sale.discountTotal > 0 && (
          <View style={[styles.totalRow, { flexDirection }]}>
            <Text style={[styles.totalLabel, { textAlign }]}>Item Discounts</Text>
            <Text style={[styles.totalValue, { color: Colors.success, textAlign: isRTL ? 'left' : 'right' }]}>−{fmtIQD(sale.discountTotal)}</Text>
          </View>
        )}
        {(sale.globalDiscount ?? 0) > 0 && (
          <View style={[styles.totalRow, { flexDirection }]}>
            <Text style={[styles.totalLabel, { textAlign }]}>Global Discount</Text>
            <Text style={[styles.totalValue, { color: Colors.success, textAlign: isRTL ? 'left' : 'right' }]}>−{fmtIQD(sale.globalDiscount!)}</Text>
          </View>
        )}
        <View style={[styles.totalRow, styles.grandRow]}>
          <Text style={[styles.grandLabel, { color: colors.primary, textAlign }]}>Grand Total</Text>
          <Text style={[styles.grandValue, { color: colors.primary, textAlign: isRTL ? 'left' : 'right' }]}>{fmtIQD(sale.grandTotal)}</Text>
        </View>
        {sale.paymentMethod === 'debt' && (
          <>
            <View style={[styles.totalRow, { flexDirection }]}>
              <Text style={[styles.totalLabel, { textAlign }]}>Paid</Text>
              <Text style={[styles.totalValue, { color: Colors.success, textAlign: isRTL ? 'left' : 'right' }]}>{fmtIQD(sale.paidAmount)}</Text>
            </View>
            {sale.remainingDebt > 0 && (
              <View style={[styles.totalRow, { flexDirection }]}>
                <Text style={[styles.totalLabel, { color: Colors.error, textAlign }]}>Remaining Debt</Text>
                <Text style={[styles.totalValue, { color: Colors.error, fontWeight: '700', textAlign: isRTL ? 'left' : 'right' }]}>
                  {fmtIQD(sale.remainingDebt)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Notes */}
      {sale.notes ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { textAlign }]}>Notes</Text>
          <Text style={[styles.infoSub, { textAlign }]}>{sale.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  invoiceNumber: { fontSize: 17, fontWeight: '700', color: Colors.black, marginBottom: 2 },
  date: { fontSize: 13, color: Colors.gray500 },
  payBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  payBadgeText: { fontSize: 13, fontWeight: '700' },
  section: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    paddingTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  infoText: { fontSize: 14, fontWeight: '600', color: Colors.black, marginBottom: 2 },
  infoSub: { fontSize: 13, color: Colors.gray600, lineHeight: 18 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: Colors.black },
  itemId: { fontSize: 11, marginTop: 1 },
  itemQty: { fontSize: 13, color: Colors.gray500, marginHorizontal: 12 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: Colors.black },
  totalsSection: { backgroundColor: Colors.gray50, borderRadius: Theme.radius.card, padding: 12, borderTopWidth: 0, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 13, color: Colors.gray500 },
  totalValue: { fontSize: 13, fontWeight: '600', color: Colors.black },
  grandRow: { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.gray200, marginBottom: 0 },
  grandLabel: { fontSize: 15, fontWeight: '700' },
  grandValue: { fontSize: 18, fontWeight: '700' },
});
