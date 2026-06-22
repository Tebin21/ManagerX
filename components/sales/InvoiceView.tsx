import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useBusinessStore } from '@/store/businessStore';
import type { Sale } from '@/types/sales';
import {
  fmtIQD, fmtUSD, formatDate, formatTime,
  getPaymentStatus, PAYMENT_STATUS_LABEL, type PaymentStatus,
} from '@/utils/formatters';

interface Props {
  sale: Sale;
  compact?: boolean;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash', fib: 'FIB', debt: 'Debt',
};

const STATUS_BG: Record<PaymentStatus, string> = {
  paid: '#D1FAE5', partial: '#FEF3C7', unpaid: '#FEE2E2',
};
const STATUS_TEXT: Record<PaymentStatus, string> = {
  paid: '#065F46', partial: '#92400E', unpaid: '#991B1B',
};

function getInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'B';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export function InvoiceView({ sale, compact = false }: Props) {
  const { colors } = useAppTheme();
  const { isRTL, textAlign, flexDirection, alignStart } = useRTL();
  const { logoUri, name: businessName } = useBusinessStore();
  const [logoFailed, setLogoFailed] = useState(false);

  const items = sale.items ?? [];
  const status = getPaymentStatus(sale);
  const exchangeRate = sale.exchangeRateUsed || 1310;
  const valueAlign = isRTL ? 'left' : 'right';

  const hasCustomer = !!(sale.customerName || sale.customerPhone || sale.customerAddress);

  return (
    <View>
      {/* Header */}
      <View style={[styles.headerRow, { flexDirection }]}>
        <View style={[styles.logoWrap, { alignItems: alignStart }]}>
          {logoUri && !logoFailed ? (
            <Image
              source={{ uri: logoUri }}
              style={styles.logo}
              resizeMode="contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <View style={[styles.logoMono, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.logoMonoText, { color: colors.gray600 }]}>{getInitials(businessName)}</Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
          <Text style={[styles.invoiceNumber, { color: colors.black, textAlign }]}>{sale.invoiceNumber}</Text>
          <View style={[styles.statusPill, { backgroundColor: STATUS_BG[status] }]}>
            <Text style={[styles.statusPillText, { color: STATUS_TEXT[status] }]}>
              {PAYMENT_STATUS_LABEL[status]}
            </Text>
          </View>
          <Text style={[styles.methodLabel, { color: colors.gray400 }]}>{PAYMENT_LABEL[sale.paymentMethod]}</Text>
        </View>
      </View>

      {/* Invoice info: two-column grid (Date/Time | Customer) */}
      <View style={[styles.card, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray400, textAlign }]}>Invoice Info</Text>
        <View style={[styles.infoGrid, { flexDirection }]}>
          <View style={styles.infoCol}>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={[styles.rowLabel, { color: colors.gray400, textAlign }]}>Date</Text>
              <Text style={[styles.rowValue, { color: colors.black, textAlign: valueAlign }]}>{formatDate(sale.date ?? sale.createdAt)}</Text>
            </View>
            <View style={[styles.infoRow, { flexDirection }]}>
              <Text style={[styles.rowLabel, { color: colors.gray400, textAlign }]}>Time</Text>
              <Text style={[styles.rowValue, { color: colors.black, textAlign: valueAlign }]}>{formatTime(sale.date ?? sale.createdAt)}</Text>
            </View>
          </View>
          {hasCustomer && (
            <View style={styles.infoCol}>
              {sale.customerName ? (
                <View style={[styles.infoRow, { flexDirection }]}>
                  <Text style={[styles.rowLabel, { color: colors.gray400, textAlign }]}>Name</Text>
                  <Text style={[styles.rowValue, { color: colors.black, textAlign: valueAlign }]}>{sale.customerName}</Text>
                </View>
              ) : null}
              {sale.customerPhone ? (
                <View style={[styles.infoRow, { flexDirection }]}>
                  <Text style={[styles.rowLabel, { color: colors.gray400, textAlign }]}>Phone</Text>
                  <Text style={[styles.rowValue, { color: colors.black, textAlign: valueAlign }]}>{sale.customerPhone}</Text>
                </View>
              ) : null}
              {sale.customerAddress ? (
                <View style={[styles.infoRow, { flexDirection }]}>
                  <Text style={[styles.rowLabel, { color: colors.gray400, textAlign }]}>Address</Text>
                  <Text style={[styles.rowValue, { color: colors.black, textAlign: valueAlign }]}>{sale.customerAddress}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>

      {/* Warranty */}
      {sale.warranty ? (
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
          <Text style={[styles.cardLabel, { color: colors.gray400, textAlign }]}>Warranty</Text>
          <Text style={[styles.blockText, { color: colors.gray600, textAlign }]}>{sale.warranty}</Text>
        </View>
      ) : null}

      {/* Items */}
      {!compact && items.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
          <Text style={[styles.cardLabel, { color: colors.gray400, textAlign }]}>Items</Text>
          {items.map((item, i) => (
            <View
              key={item.id ?? i}
              style={[
                styles.itemRow,
                { flexDirection },
                i % 2 === 1 ? { backgroundColor: colors.gray50 } : null,
              ]}
            >
              <View style={styles.itemLeft}>
                <Text style={[styles.itemName, { color: colors.black, textAlign }]}>{item.productName}</Text>
                {item.itemId ? <Text style={[styles.itemId, { color: colors.primary, textAlign }]}>#{item.itemId}</Text> : null}
                {item.discount > 0 ? (
                  <Text style={[styles.itemDiscount, { color: Colors.success, textAlign }]}>−{fmtIQD(item.discount)} IQD</Text>
                ) : null}
              </View>
              <Text style={[styles.itemQty, { color: colors.gray500, textAlign: valueAlign }]}>×{item.quantity}</Text>
              <Text style={[styles.itemTotal, { color: colors.black, textAlign: valueAlign }]}>{fmtIQD(item.lineTotal)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Payment Summary */}
      <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray400, textAlign }]}>Payment Summary</Text>
        <View style={[styles.totalRow, { flexDirection }]}>
          <Text style={[styles.totalLabel, { color: colors.gray500, textAlign }]}>Subtotal</Text>
          <Text style={[styles.totalValue, { color: colors.black, textAlign: valueAlign }]}>{fmtIQD(sale.subtotal)}</Text>
        </View>
        {sale.discountTotal > 0 && (
          <View style={[styles.totalRow, { flexDirection }]}>
            <Text style={[styles.totalLabel, { color: colors.gray500, textAlign }]}>Item Discount</Text>
            <Text style={[styles.totalValue, { color: Colors.success, textAlign: valueAlign }]}>−{fmtIQD(sale.discountTotal)}</Text>
          </View>
        )}
        {(sale.globalDiscount ?? 0) > 0 && (
          <View style={[styles.totalRow, { flexDirection }]}>
            <Text style={[styles.totalLabel, { color: colors.gray500, textAlign }]}>Invoice Discount</Text>
            <Text style={[styles.totalValue, { color: Colors.success, textAlign: valueAlign }]}>−{fmtIQD(sale.globalDiscount ?? 0)}</Text>
          </View>
        )}
        <View style={[styles.grandRow, { flexDirection, borderTopColor: colors.gray200 }]}>
          <Text style={[styles.grandLabel, { color: colors.black, textAlign }]}>Grand Total</Text>
          <Text style={[styles.grandValue, { color: colors.black, textAlign: valueAlign }]}>{fmtIQD(sale.grandTotal)}</Text>
        </View>
        {sale.paymentMethod === 'debt' && (
          <>
            {sale.paidAmount > 0 && (
              <View style={[styles.totalRow, { flexDirection }]}>
                <Text style={[styles.totalLabel, { color: colors.gray500, textAlign }]}>Paid</Text>
                <Text style={[styles.totalValue, { color: Colors.success, textAlign: valueAlign }]}>{fmtIQD(sale.paidAmount)}</Text>
              </View>
            )}
            {sale.remainingDebt > 0 && (
              <View style={[styles.totalRow, { flexDirection }]}>
                <Text style={[styles.totalLabel, { color: Colors.error, textAlign }]}>Remaining Debt</Text>
                <Text style={[styles.totalValue, { color: Colors.error, fontWeight: '700', textAlign: valueAlign }]}>
                  {fmtIQD(sale.remainingDebt)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* USD conversion */}
      <View style={[styles.card, styles.usdCard, { backgroundColor: colors.gray50, borderColor: colors.gray200, flexDirection }]}>
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.usdLabel, { color: colors.gray400, textAlign }]}>Total (USD)</Text>
          <Text style={[styles.usdAmount, { color: colors.black, textAlign }]}>${fmtUSD(sale.grandTotal / exchangeRate)}</Text>
        </View>
        <Text style={[styles.usdRate, { color: colors.gray400, textAlign: valueAlign }]}>
          Rate: {fmtIQD(exchangeRate)} IQD/USD
        </Text>
      </View>

      {/* Notes */}
      {sale.notes ? (
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
          <Text style={[styles.cardLabel, { color: colors.gray400, textAlign }]}>Notes</Text>
          <Text style={[styles.blockText, { color: colors.gray600, textAlign }]}>{sale.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logoWrap: { justifyContent: 'flex-start' },
  logo: {
    width: 56,
    height: 56,
    borderRadius: Theme.radius.md,
  },
  logoMono: {
    width: 56,
    height: 56,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMonoText: { fontSize: 18, fontWeight: '800' },
  invoiceNumber: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Theme.radius.full,
    marginBottom: 4,
  },
  statusPillText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  methodLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  card: {
    borderWidth: 1,
    borderRadius: Theme.radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  infoGrid: { flexWrap: 'wrap', gap: 12 },
  infoCol: { flex: 1, minWidth: 140 },
  infoRow: { justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 12.5, flexShrink: 0 },
  rowValue: { fontSize: 13, fontWeight: '600', flex: 1, marginLeft: 8 },

  blockText: { fontSize: 13, lineHeight: 19 },

  itemRow: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Theme.radius.sm,
  },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600' },
  itemId: { fontSize: 11, marginTop: 1 },
  itemDiscount: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  itemQty: { fontSize: 13, marginHorizontal: 12 },
  itemTotal: { fontSize: 14, fontWeight: '700', minWidth: 70 },

  totalRow: { justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 13, fontWeight: '600' },
  grandRow: {
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  grandLabel: { fontSize: 15, fontWeight: '700' },
  grandValue: { fontSize: 22, fontWeight: '800' },

  usdCard: { justifyContent: 'space-between', alignItems: 'center' },
  usdLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  usdAmount: { fontSize: 18, fontWeight: '800' },
  usdRate: { fontSize: 11.5 },
});
