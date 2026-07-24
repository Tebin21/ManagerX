import React, { useRef, useState } from 'react';
import { View, Image, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isRTL, textAlign, writingDirection, flexDirection, alignStart } = useRTL();
  const { logoUri, name: businessName } = useBusinessStore();
  const [logoFailed, setLogoFailed] = useState(false);
  const tableScrollRef = useRef<ScrollView>(null);

  const items = sale.items ?? [];
  const status = getPaymentStatus(sale);
  const exchangeRate = sale.exchangeRateUsed || 1310;
  const valueAlign = isRTL ? 'left' : 'right';

  // Kurdish section titles read heavier in RudawRegular than the same weight does in
  // Inter, so the bold+uppercase treatment that works for English looks clenched here —
  // lean on a touch more size instead of weight to keep them distinct.
  const kuLabel = isRTL
    ? { fontWeight: '600' as const, fontSize: 12.5, textTransform: 'none' as const, letterSpacing: 0 }
    : null;
  // Same RudawRegular faux-bold issue as kuLabel above, but for the inline
  // "Name:"/"Phone:"/... prefixes in the top info card — only one Rudaw
  // weight is registered, so any fontWeight above 400 gets synthetically
  // emboldened by the OS. Drop to Regular for Kurdish; size/color/structure
  // stay untouched.
  const kuInfoLabel = isRTL ? { fontWeight: '400' as const } : null;

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
          <IdText style={[styles.invoiceNumber, { color: colors.black, textAlign, writingDirection: 'ltr', lineHeight: undefined }]}>{sale.invoiceNumber}</IdText>
          <View style={[styles.statusPill, { backgroundColor: STATUS_BG[status] }]}>
            <Text style={[styles.statusPillText, { color: STATUS_TEXT[status] }]}>
              {PAYMENT_STATUS_LABEL[status]}
            </Text>
          </View>
          <Text style={[styles.methodLabel, { color: colors.gray400 }]}>{PAYMENT_LABEL[sale.paymentMethod]}</Text>
        </View>
      </View>

      {/* Invoice info: single stacked column, one field per row */}
      <View style={[styles.card, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray400, textAlign, writingDirection }, kuLabel]}>{t('invoicePreview.invoiceInfo')}</Text>
        <View style={styles.infoStack}>
          {hasCustomer && (
            <>
              {sale.customerName ? (
                <Text style={[styles.infoLine, { color: colors.black, textAlign, writingDirection }]}>
                  <Text style={[styles.infoLineLabel, { color: colors.gray400 }, kuInfoLabel]}>{t('invoicePreview.name')}: </Text>
                  {sale.customerName}
                </Text>
              ) : null}
              {sale.customerPhone ? (
                <Text style={[styles.infoLine, { color: colors.black, textAlign, writingDirection }]}>
                  <Text style={[styles.infoLineLabel, { color: colors.gray400 }, kuInfoLabel]}>{t('invoicePreview.phone')}: </Text>
                  <Text style={{ writingDirection: 'ltr' }}>{sale.customerPhone}</Text>
                </Text>
              ) : null}
              {sale.customerAddress ? (
                <Text style={[styles.infoLine, { color: colors.black, textAlign, writingDirection }]}>
                  <Text style={[styles.infoLineLabel, { color: colors.gray400 }, kuInfoLabel]}>{t('invoicePreview.address')}: </Text>
                  {sale.customerAddress}
                </Text>
              ) : null}
            </>
          )}
          <Text style={[styles.infoLine, { color: colors.black, textAlign, writingDirection }]}>
            <Text style={[styles.infoLineLabel, { color: colors.gray400 }, kuInfoLabel]}>{t('invoicePreview.date')}: </Text>
            <Text style={{ writingDirection: 'ltr' }}>{formatDate(sale.date ?? sale.createdAt)}</Text>
          </Text>
          <Text style={[styles.infoLine, { color: colors.black, textAlign, writingDirection }]}>
            <Text style={[styles.infoLineLabel, { color: colors.gray400 }, kuInfoLabel]}>{t('invoicePreview.time')}: </Text>
            <Text style={{ writingDirection: 'ltr' }}>{formatTime(sale.date ?? sale.createdAt)}</Text>
          </Text>
        </View>
      </View>

      {/* Warranty */}
      {sale.warranty ? (
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
          <Text style={[styles.cardLabel, { color: colors.gray400, textAlign, writingDirection }, kuLabel]}>{t('invoicePreview.warranty')}</Text>
          <Text style={[styles.blockText, { color: colors.gray600, textAlign, writingDirection }]}>{sale.warranty}</Text>
        </View>
      ) : null}

      {/* Items */}
      {!compact && items.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
          <Text style={[styles.cardLabel, { color: colors.gray400, textAlign, writingDirection }, kuLabel]}>{t('invoicePreview.items')}</Text>
          <ScrollView
            ref={tableScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            // No native RTL here (the app mirrors layout via JS, not I18nManager), so a
            // horizontal ScrollView always opens at its physical-left edge. In Kurdish
            // the table is mirrored so the "first" column (Product/#) sits on the
            // physical right — without this it would default to showing Total/Discount
            // instead of the product name.
            onContentSizeChange={() => { if (isRTL) tableScrollRef.current?.scrollToEnd({ animated: false }); }}
          >
            <View>
              <View style={[styles.tableHeaderRow, { flexDirection, borderColor: colors.gray200 }]}>
                <Text style={[styles.colNum, styles.tableHeaderText, { color: colors.gray400 }]}>#</Text>
                <Text style={[styles.colProduct, styles.tableHeaderText, { color: colors.gray400, textAlign, writingDirection }]}>{t('invoicePreview.colProduct')}</Text>
                <Text style={[styles.colId, styles.tableHeaderText, { color: colors.gray400, writingDirection }]}>{t('invoicePreview.colId')}</Text>
                <Text style={[styles.colQty, styles.tableHeaderText, { color: colors.gray400, writingDirection }]}>{t('invoicePreview.colQty')}</Text>
                <Text style={[styles.colUnitPrice, styles.tableHeaderText, { color: colors.gray400, writingDirection }]}>{t('invoicePreview.colUnitPrice')}</Text>
                <Text style={[styles.colDiscount, styles.tableHeaderText, { color: colors.gray400, writingDirection }]}>{t('invoicePreview.colDiscount')}</Text>
                <Text style={[styles.colTotal, styles.tableHeaderText, { color: colors.gray400, writingDirection }]}>{t('invoicePreview.colTotal')}</Text>
              </View>
              {items.map((item, i) => (
                <View
                  key={item.id ?? i}
                  style={[
                    styles.tableRow,
                    { flexDirection },
                    i % 2 === 1 ? { backgroundColor: colors.gray50 } : null,
                  ]}
                >
                  <Text style={[styles.colNum, styles.tableCellMuted, { color: colors.gray500 }]}>{i + 1}</Text>
                  <Text style={[styles.colProduct, styles.tableCellName, { color: colors.black, textAlign, writingDirection }]}>{item.productName}</Text>
                  <IdText style={[styles.colId, styles.tableCellMuted, { color: item.itemId ? colors.primary : colors.gray300 }]}>{item.itemId ?? '—'}</IdText>
                  <Text style={[styles.colQty, styles.tableCellMuted, { color: colors.gray600 }]}>{item.quantity}</Text>
                  <Text style={[styles.colUnitPrice, styles.tableCellValue, { color: colors.gray600 }]}>{fmtIQD(item.sellingPrice)}</Text>
                  <Text style={[styles.colDiscount, styles.tableCellValue, { color: item.discount > 0 ? Colors.success : colors.gray300 }]}>
                    {item.discount > 0 ? `−${fmtIQD(item.discount)}` : '—'}
                  </Text>
                  <Text style={[styles.colTotal, styles.tableCellTotal, { color: colors.black }]}>{fmtIQD(item.lineTotal)}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Payment Summary */}
      <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray400, textAlign, writingDirection }, kuLabel]}>{t('invoicePreview.paymentSummary')}</Text>
        <View style={[styles.totalRow, { flexDirection }]}>
          <Text style={[styles.totalLabel, { color: colors.gray500, textAlign, writingDirection }]}>{t('invoicePreview.subtotal')}</Text>
          <Text style={[styles.totalValue, { color: colors.black, textAlign: valueAlign, writingDirection: 'ltr' }]}>{fmtIQD(sale.subtotal)}</Text>
        </View>
        {sale.discountTotal > 0 && (
          <View style={[styles.totalRow, { flexDirection }]}>
            <Text style={[styles.totalLabel, { color: colors.gray500, textAlign, writingDirection }]}>{t('invoicePreview.itemDiscount')}</Text>
            <Text style={[styles.totalValue, { color: Colors.success, textAlign: valueAlign, writingDirection: 'ltr' }]}>−{fmtIQD(sale.discountTotal)}</Text>
          </View>
        )}
        {(sale.globalDiscount ?? 0) > 0 && (
          <View style={[styles.totalRow, { flexDirection }]}>
            <Text style={[styles.totalLabel, { color: colors.gray500, textAlign, writingDirection }]}>{t('invoicePreview.invoiceDiscount')}</Text>
            <Text style={[styles.totalValue, { color: Colors.success, textAlign: valueAlign, writingDirection: 'ltr' }]}>−{fmtIQD(sale.globalDiscount ?? 0)}</Text>
          </View>
        )}
        <View style={[styles.grandRow, { flexDirection, borderTopColor: colors.gray200 }]}>
          <Text style={[styles.grandLabel, { color: colors.black, textAlign, writingDirection }]}>{t('invoicePreview.grandTotal')}</Text>
          <Text style={[styles.grandValue, { color: colors.black, textAlign: valueAlign, writingDirection: 'ltr' }]}>{fmtIQD(sale.grandTotal)}</Text>
        </View>
        {sale.paymentMethod === 'debt' && (
          <>
            {sale.paidAmount > 0 && (
              <View style={[styles.totalRow, { flexDirection }]}>
                <Text style={[styles.totalLabel, { color: colors.gray500, textAlign, writingDirection }]}>{t('invoicePreview.paid')}</Text>
                <Text style={[styles.totalValue, { color: Colors.success, textAlign: valueAlign, writingDirection: 'ltr' }]}>{fmtIQD(sale.paidAmount)}</Text>
              </View>
            )}
            {sale.remainingDebt > 0 && (
              <View style={[styles.totalRow, { flexDirection }]}>
                <Text style={[styles.totalLabel, { color: Colors.error, textAlign, writingDirection }]}>{t('invoicePreview.remainingDebt')}</Text>
                <Text style={[styles.totalValue, { color: Colors.error, fontWeight: '700', textAlign: valueAlign, writingDirection: 'ltr' }]}>
                  {fmtIQD(sale.remainingDebt)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* USD conversion */}
      {isRTL ? (
        <View style={[styles.card, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
          <View style={[styles.totalRow, { flexDirection }]}>
            <Text style={[styles.usdRate, { color: colors.gray400, textAlign, writingDirection }]}>{t('invoicePreview.exchangeRate')}</Text>
            <Text style={[styles.usdRate, { color: colors.gray400, textAlign: valueAlign, writingDirection: 'ltr' }]}>{fmtIQD(exchangeRate)} IQD/USD</Text>
          </View>
          <View style={[styles.totalRow, { flexDirection, marginBottom: 0 }]}>
            <Text style={[styles.usdLabel, { color: colors.gray400, textAlign, writingDirection }]}>{t('invoicePreview.totalUsd')}</Text>
            <Text style={[styles.usdAmount, { color: colors.black, textAlign: valueAlign, writingDirection: 'ltr' }]}>${fmtUSD(sale.grandTotal / exchangeRate)}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.card, styles.usdCard, { backgroundColor: colors.gray50, borderColor: colors.gray200, flexDirection }]}>
          <View style={{ alignItems: 'flex-start' }}>
            <Text style={[styles.usdLabel, { color: colors.gray400, textAlign: 'left' }]}>{t('invoicePreview.totalUsd')}</Text>
            <Text style={[styles.usdAmount, { color: colors.black, textAlign: 'left' }]}>${fmtUSD(sale.grandTotal / exchangeRate)}</Text>
          </View>
          <Text style={[styles.usdRate, { color: colors.gray400, textAlign: 'right' }]}>
            Rate: {fmtIQD(exchangeRate)} IQD/USD
          </Text>
        </View>
      )}

      {/* Notes */}
      <View style={[styles.card, { backgroundColor: colors.white, borderColor: colors.gray200 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray400, textAlign, writingDirection }, kuLabel]}>{t('invoicePreview.notes')}</Text>
        <Text style={[styles.blockText, { color: sale.notes ? colors.gray600 : colors.gray400, textAlign, writingDirection }]}>
          {sale.notes || t('invoicePreview.noNotes')}
        </Text>
      </View>
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

  infoStack: { flexDirection: 'column' },
  infoLine: { fontSize: 13, fontWeight: '600', paddingVertical: 4 },
  infoLineLabel: { fontSize: 12.5, fontWeight: '500' },

  blockText: { fontSize: 13, lineHeight: 19 },

  tableHeaderRow: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 6,
    marginBottom: 2,
    borderBottomWidth: 1,
    gap: 6,
  },
  tableHeaderText: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableRow: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: Theme.radius.sm,
    gap: 6,
  },
  tableCellMuted: { fontSize: 12, textAlign: 'center' },
  tableCellValue: { fontSize: 11.5, fontWeight: '600', textAlign: 'center' },
  tableCellTotal: { fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  tableCellName: { fontSize: 13, fontWeight: '600' },

  colNum: { width: 20 },
  colProduct: { width: 100 },
  colId: { width: 54 },
  colQty: { width: 28 },
  colUnitPrice: { width: 76 },
  colDiscount: { width: 70 },
  colTotal: { width: 80 },

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
