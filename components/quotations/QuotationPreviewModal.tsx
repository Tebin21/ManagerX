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
import { useSettingsStore } from '@/store/settingsStore';
import { fmtIQD, fmtUSD } from '@/utils/formatters';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import type { Quotation } from '@/types/quotation';

interface QuotationPreviewModalProps {
  visible: boolean;
  quotation: Quotation | null;
  onClose: () => void;
  onShare: (quotation: Quotation) => void;
  isSharing?: boolean;
  onDelete?: (quotation: Quotation) => void;
}

export function QuotationPreviewModal({
  visible,
  quotation,
  onClose,
  onShare,
  isSharing = false,
  onDelete,
}: QuotationPreviewModalProps) {
  const { colors, isDark } = useAppTheme();
  const { isRTL } = useRTL();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const isSystemUsd = baseCurrency === 'USD';

  if (!quotation) return null;

  const effMode = quotation.currencyMode || 'both';
  const isUsdOnly = effMode === 'usd';
  const isIqdOnly = effMode === 'iqd';
  const isBoth = effMode === 'both';
  const rate = quotation.exchangeRate || 1310;
  const usdValue = rate > 0 ? quotation.grandTotal / rate : 0;
  const isItemUsd = isSystemUsd || isUsdOnly;

  const formatPrice = (val: number) => {
    if (isItemUsd) {
      return `$${fmtUSD(val / rate)}`;
    }
    return `${fmtIQD(val)} IQD`;
  };

  const totalUSD = fmtUSD(usdValue);
  const totalIQD = fmtIQD(quotation.grandTotal);

  let grandTotalPrimary = `${totalIQD} IQD`;
  let grandTotalSecondary = '';

  if (isUsdOnly) {
    grandTotalPrimary = `$${totalUSD} USD`;
    grandTotalSecondary = '';
  } else if (isIqdOnly) {
    grandTotalPrimary = `${totalIQD} IQD`;
    grandTotalSecondary = '';
  } else {
    // Both
    if (isSystemUsd) {
      grandTotalPrimary = `$${totalUSD} USD`;
      grandTotalSecondary = `≈ ${totalIQD} IQD`;
    } else {
      grandTotalPrimary = `${totalIQD} IQD`;
      grandTotalSecondary = `≈ $${totalUSD} USD`;
    }
  }

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
                  ? 'سەرجەم نرخەکان پێشنیارکراون بۆ شەریکە و کڕیار.'
                  : 'All prices are offered for quotation purposes.'}
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

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.previewVal, { color: colors.black, textAlign: isRTL ? 'right' : 'left' }]}>
                    {quotation.customerName || (isKuLanguage ? 'کڕیاری گشتی' : 'Valued Client')}
                  </Text>

                  {quotation.customerPhone ? (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Ionicons name="call-outline" size={13} color={colors.gray400} />
                      <Text style={{ fontSize: 11.5, color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }}>
                        {quotation.customerPhone}
                      </Text>
                    </View>
                  ) : null}

                  {quotation.customerAddress ? (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Ionicons name="location-outline" size={13} color={colors.gray400} />
                      <Text style={{ fontSize: 11.5, color: colors.gray500, textAlign: isRTL ? 'right' : 'left' }}>
                        {quotation.customerAddress}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {quotation.validityDays ? (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      backgroundColor: isDark ? 'rgba(212,175,55,0.15)' : '#FEF3C7',
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                      marginHorizontal: 4,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.gray500, marginBottom: 1 }}>
                      {isKuLanguage ? 'ماوەی عەرز' : 'Validity'}
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: colors.primary }}>
                      {isKuLanguage ? `${quotation.validityDays} ڕۆژ` : `${quotation.validityDays} Days`}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: isDark ? colors.gray300 : 'rgba(0,0,0,0.06)' }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="calendar-outline" size={12} color={colors.gray400} />
                  <Text style={{ fontSize: 11, color: colors.gray400 }}>
                    {quotation.date} {quotation.time ? `• ${quotation.time}` : ''}
                  </Text>
                </View>
              </View>

              {/* View & Print Status & Counts */}
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                  {/* View Count Badge */}
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      borderWidth: 1,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray200,
                      borderColor: 'transparent',
                    }}
                  >
                    <Ionicons name="eye-outline" size={12} color={colors.gray500} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray500 }}>
                      {isKuLanguage ? `بینراوە (${quotation.viewCount || 0} جار)` : `Views (${quotation.viewCount || 0})`}
                    </Text>
                  </View>

                  {/* Print Status & Count Badge */}
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
                      <Text style={{ fontSize: 11, color: colors.black, fontWeight: '700' }}>
                        #{idx + 1}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.black }} numberOfLines={2}>
                        {it.productName}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.gray400, marginTop: 2, direction: 'ltr' }}>
                        {it.quantity} × {formatPrice(it.unitPrice)}
                        {it.discount > 0 ? ` (-${formatPrice(it.discount)})` : ''}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.black, direction: 'ltr' }}>
                      {formatPrice(it.lineTotal)}
                    </Text>
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
            <View style={[styles.previewTotals, { borderTopColor: colors.gray200, backgroundColor: isDark ? colors.gray200 : colors.gray50 }]}>
              {quotation.discountTotal > 0 && (
                <>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: colors.gray500 }}>{isKuLanguage ? 'کۆی سەرەتایی:' : 'Subtotal:'}</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.black, direction: 'ltr' }}>
                      {formatPrice(quotation.subtotal)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: colors.gray600 }}>{isKuLanguage ? 'داشکاندن:' : 'Discount:'}</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: isDark ? '#4ADE80' : '#15803D', direction: 'ltr' }}>
                      −{formatPrice(quotation.discountTotal)}
                    </Text>
                  </View>
                </>
              )}

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.black }}>
                  {isKuLanguage ? 'کۆی گشتی:' : 'Grand Total:'}
                </Text>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: colors.black, direction: 'ltr' }}>
                    {grandTotalPrimary}
                  </Text>
                  {grandTotalSecondary ? (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray500, direction: 'ltr', marginTop: 2 }}>
                      {grandTotalSecondary}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Modal Bottom Actions */}
          <View style={[styles.modalActions, { borderTopColor: colors.gray200, flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 }]}>
            {onDelete ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onDelete(quotation)}
                style={[
                  styles.deleteModalBtn,
                  {
                    backgroundColor: isDark ? 'rgba(239,68,68,0.14)' : '#FEE2E2',
                    borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FCA5A5',
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={19} color={colors.error} />
              </TouchableOpacity>
            ) : null}
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
    alignItems: 'center',
  },
  deleteModalBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
