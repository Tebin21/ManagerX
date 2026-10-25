import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { fmtIQD, fmtUSD } from '@/utils/formatters';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import type { Quotation } from '@/types/quotation';

interface QuotationPreviewModalProps {
  visible: boolean;
  quotation: Quotation | null;
  onClose: () => void;
  onShare: (quotation: Quotation) => void;
  isSharing?: boolean;
}

export function QuotationPreviewModal({
  visible,
  quotation,
  onClose,
  onShare,
  isSharing = false,
}: QuotationPreviewModalProps) {
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

  if (!quotation) return null;

  const usdValue = quotation.exchangeRate > 0 ? quotation.grandTotal / quotation.exchangeRate : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: isDark ? colors.gray100 : colors.white }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: colors.gray200 }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.black }]}>
                {isKuLanguage ? 'پێشبینینی وەسڵی عەرز' : 'Quotation Preview'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 12 }}>
            {/* Notice Banner (Delicate & Monochrome) */}
            <View style={[styles.previewNotice, { backgroundColor: isDark ? colors.gray200 : colors.gray50, borderColor: isDark ? colors.gray300 : '#E2E8F0' }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.black, textAlign: 'center' }}>
                {isKuLanguage
                  ? 'ئەم وەسڵە تەنها بۆ عەرزی نرخە و وەسڵی فرۆشتن نییە'
                  : 'THIS DOCUMENT IS A PRICE QUOTATION ONLY'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.gray500, textAlign: 'center', marginTop: 2 }}>
                {isKuLanguage
                  ? 'کاڵاکان لە کۆگا کەمنەکراونەتەوە و تەنها وەک پێشنیاری نرخ بەکاردێت.'
                  : 'No inventory stock has been deducted. Prices are for offer only.'}
              </Text>
            </View>

            {/* Info Block */}
            <View style={[styles.previewBlock, { backgroundColor: isDark ? colors.gray200 : colors.gray50, borderColor: colors.gray200 }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={[styles.previewLabel, { color: colors.gray400 }]}>
                  {isKuLanguage ? 'کۆمپانیا / کڕیار:' : 'Client:'}
                </Text>
                <IdText size="small">{quotation.quotationNumber}</IdText>
              </View>

              <Text style={[styles.previewVal, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>
                {quotation.customerName || (isKuLanguage ? 'کڕیاری گشتی' : 'Valued Client')}
              </Text>

              {quotation.customerPhone ? (
                <Text style={{ fontSize: 11.5, color: colors.gray500, textAlign: isRTL ? 'right' : 'left', marginTop: 2 }}>
                  📞 {quotation.customerPhone}
                </Text>
              ) : null}

              {quotation.customerAddress ? (
                <Text style={{ fontSize: 11.5, color: colors.gray500, textAlign: isRTL ? 'right' : 'left', marginTop: 2 }}>
                  📍 {quotation.customerAddress}
                </Text>
              ) : null}

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: isDark ? colors.gray300 : 'rgba(0,0,0,0.06)' }}>
                <Text style={{ fontSize: 11, color: colors.gray400 }}>
                  📅 {quotation.date} {quotation.time ? `• ${quotation.time}` : ''}
                </Text>
                {quotation.validityDays ? (
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                    ⏳ {isKuLanguage ? `ماوە: ${quotation.validityDays} ڕۆژ` : `Valid: ${quotation.validityDays} days`}
                  </Text>
                ) : null}
              </View>

              {/* Print Status & Count */}
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    borderWidth: 1,
                    backgroundColor: (quotation.printCount && quotation.printCount > 0)
                      ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#DCFCE7')
                      : (isDark ? colors.gray300 : colors.gray200),
                    borderColor: (quotation.printCount && quotation.printCount > 0)
                      ? (isDark ? 'rgba(34, 197, 94, 0.3)' : '#86EFAC')
                      : 'transparent',
                  }}
                >
                  <Ionicons
                    name={(quotation.printCount && quotation.printCount > 0) ? 'print' : 'print-outline'}
                    size={12}
                    color={(quotation.printCount && quotation.printCount > 0) ? (isDark ? '#4ADE80' : '#15803D') : colors.gray400}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: (quotation.printCount && quotation.printCount > 0) ? (isDark ? '#4ADE80' : '#15803D') : colors.gray400,
                    }}
                  >
                    {(quotation.printCount && quotation.printCount > 0)
                      ? (isKuLanguage ? `چاپکراوە (${quotation.printCount} جار)` : `Printed (${quotation.printCount} times)`)
                      : (isKuLanguage ? 'چاپ نەکراوە' : 'Not printed')}
                  </Text>
                </View>

                {quotation.lastPrintedAt ? (
                  <Text style={{ fontSize: 10.5, color: colors.gray400 }}>
                    {quotation.lastPrintedAt.split('T')[0]}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Items List */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.gray600 }}>
                  {isKuLanguage ? 'لیستی کاڵاکان:' : 'Items List:'}
                </Text>
                <Text style={{ fontSize: 11.5, color: colors.gray400 }}>
                  ({quotation.items?.length || 0} {isKuLanguage ? 'کاڵا' : 'items'})
                </Text>
              </View>

              {quotation.items && quotation.items.length > 0 ? (
                quotation.items.map((it, idx) => (
                  <View
                    key={it.id || String(idx)}
                    style={[
                      styles.previewItemRow,
                      {
                        backgroundColor: isDark ? colors.gray200 : colors.gray50,
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray200,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={[styles.indexPill, { backgroundColor: isDark ? colors.gray300 : colors.gray200 }]}>
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                        #{idx + 1}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.black }} numberOfLines={2}>
                        {it.productName}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.gray400, marginTop: 2 }}>
                        {it.quantity} × {fmtIQD(it.unitPrice)} IQD
                        {it.discount > 0 ? ` (-${fmtIQD(it.discount)})` : ''}
                      </Text>
                    </View>

                    <AmountText
                      value={it.lineTotal}
                      currency="IQD"
                      variant="small"
                      style={{ fontWeight: '700', color: colors.black }}
                    />
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 12, color: colors.gray400, textAlign: 'center', paddingVertical: 10 }}>
                  {isKuLanguage ? 'هیچ کاڵایەک لەم عەرزەدا نییە.' : 'No items in this quotation.'}
                </Text>
              )}
            </View>

            {/* Notes Section (Positioned BEFORE Totals as requested) */}
            {quotation.notes ? (
              <View style={[styles.previewNotesBox, { backgroundColor: isDark ? colors.gray200 : colors.gray50, borderColor: colors.gray200 }]}>
                <Text style={[styles.previewLabel, { color: colors.gray400, textAlign: isRTL ? 'right' : 'left' }]}>
                  {isKuLanguage ? 'تێبینی و مەرجەکان:' : 'Notes & Terms:'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.black, lineHeight: 18, marginTop: 3, textAlign: isRTL ? 'right' : 'left' }}>
                  {quotation.notes}
                </Text>
              </View>
            ) : null}

            {/* Totals Section (Positioned BELOW Notes as requested) */}
            <View style={[styles.previewTotals, { borderTopColor: colors.primary, backgroundColor: isDark ? colors.gray200 : colors.gray50 }]}>
              {quotation.discountTotal > 0 && (
                <>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: colors.gray500 }}>{isKuLanguage ? 'کۆی سەرەتایی:' : 'Subtotal:'}</Text>
                    <AmountText value={quotation.subtotal} currency="IQD" variant="small" style={{ color: colors.gray600 }} />
                  </View>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: colors.error }}>{isKuLanguage ? 'داشکاندن:' : 'Discount:'}</Text>
                    <AmountText value={quotation.discountTotal} prefix="−" currency="IQD" variant="small" style={{ color: colors.error }} />
                  </View>
                </>
              )}

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.black }}>
                  {isKuLanguage ? 'کۆی گشتی:' : 'Grand Total:'}
                </Text>
                <AmountText value={quotation.grandTotal} currency="IQD" variant="large" style={{ color: colors.primary, fontWeight: '900' }} />
              </View>

              {usdValue > 0 && (
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.success, textAlign: isRTL ? 'left' : 'right', marginTop: 4 }}>
                  ≈ ${fmtUSD(usdValue)} USD
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Modal Bottom Actions */}
          <View style={[styles.modalActions, { borderTopColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={isKuLanguage ? 'هاوبەشکردن و چاپکردنی PDF' : 'Share & Print PDF'}
                onPress={() => onShare(quotation)}
                loading={isSharing}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  previewNotice: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewBlock: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  previewVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  previewItemRow: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  indexPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewTotals: {
    padding: 12,
    borderRadius: 10,
    borderTopWidth: 2,
  },
  previewNotesBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalActions: {
    padding: 14,
    borderTopWidth: 1,
  },
});
