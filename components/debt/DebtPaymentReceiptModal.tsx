import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSettingsStore } from '@/store/settingsStore';
import { fmtIQD, fmtUSD, formatDate, formatTime } from '@/utils/formatters';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import type { DebtPaymentReceiptData } from '@/types/debt';
import type { DebtReceiptPaperSize } from '@/lib/debtPaymentReceiptTemplate';
import { directPrintDebtPaymentReceipt } from '@/lib/generateInvoice';
import { incrementDebtReceiptPrintCount } from '@/lib/sqlite';

interface DebtPaymentReceiptModalProps {
  visible: boolean;
  receipt: DebtPaymentReceiptData | null;
  onClose: () => void;
  initialPaperSize?: DebtReceiptPaperSize;
  onPrinted?: (receiptId: number, nextCount: number) => void;
}

interface PaperOption {
  id: DebtReceiptPaperSize;
  label: string;
  widthCm: string;
  descKu: string;
  descEn: string;
}

const PAPER_OPTIONS: PaperOption[] = [
  { id: 'A4', label: 'A4 Sheet', widthCm: '21 × 29.7 cm', descKu: 'پەڕەی فەرمی (A4)', descEn: 'Standard A4' },
  { id: '110mm', label: '110mm', widthCm: '11.0 cm', descKu: 'وەسڵی پان (110mm)', descEn: 'Wide Thermal' },
  { id: '80mm', label: '80mm', widthCm: '8.0 cm', descKu: 'ستاندارد (80mm)', descEn: 'Desktop POS' },
  { id: '58mm', label: '58mm', widthCm: '5.8 cm', descKu: 'وەسڵی بچووک (58mm)', descEn: 'Mobile POS' },
];

export function DebtPaymentReceiptModal({
  visible,
  receipt,
  onClose,
  initialPaperSize,
  onPrinted,
}: DebtPaymentReceiptModalProps) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const lang = useLanguageStore((s) => s.language);
  const isKu = lang === 'ku';
  const isAr = lang === 'ar';

  const business = useBusinessStore();
  const defaultPaperSize = useSettingsStore((s) => s.debtPaperSizePreference ?? '80mm');
  const [selectedPaperSize, setSelectedPaperSize] = useState<DebtReceiptPaperSize>(
    initialPaperSize || defaultPaperSize
  );

  const [isPrinting, setIsPrinting] = useState(false);

  if (!receipt) return null;

  const isCustomerPayment = receipt.debtType === 'sales';
  const isSettled = receipt.remainingAfter <= 0;
  const exchangeRate = useSettingsStore.getState().exchangeRate || 1310;
  const usdValue = exchangeRate > 0 ? receipt.amount / exchangeRate : 0;

  const docTitle = isCustomerPayment
    ? (isAr ? 'وصل استلام دفعة دين' : isKu ? 'وەسڵی وەرگرتنی پارەی قەرز' : 'Debt Collection Receipt')
    : (isAr ? 'وصل تسديد دين للمورد' : isKu ? 'وەسڵی دانەوەی قەرزی دابینکەر' : 'Supplier Debt Payment Receipt');
  const partyRoleLabel = isCustomerPayment
    ? (isAr ? 'الزبون' : isKu ? 'کڕیار' : 'Customer')
    : (isAr ? 'المورد' : isKu ? 'دابینکەر' : 'Supplier');
  const statusLabel = isSettled
    ? (isAr ? 'مسدد بالكامل' : isKu ? 'تەواوبوو (بێ باڵانس)' : 'Settled')
    : (isAr ? 'دفعة جزئية (متبقي دين)' : isKu ? 'بەشێکی دراوە (قەرز ماوە)' : 'Partial Payment');
  const paymentMethodLabel = receipt.paymentMethod?.toLowerCase() === 'fib'
    ? 'FIB'
    : (isAr ? 'نقداً (كاش)' : isKu ? 'کاش (نەقد)' : 'Cash');

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const ok = await directPrintDebtPaymentReceipt(receipt, business, selectedPaperSize, exchangeRate);
      if (ok) {
        try {
          const nextCount = await incrementDebtReceiptPrintCount(receipt.id);
          onPrinted?.(receipt.id, nextCount);
        } catch (e) {
          console.warn('Failed to increment debt print count:', e);
        }
      }
    } catch (err) {
      console.error('Print receipt error:', err);
      Alert.alert(isAr ? 'خطأ' : isKu ? 'هەڵە' : 'Error', isAr ? 'تعذرت الطباعة.' : isKu ? 'نەتوانرا چاپ بکرێت.' : 'Failed to print receipt.');
    } finally {
      setIsPrinting(false);
    }
  };

  // Preview container max width based on paper size
  const previewCardWidth = selectedPaperSize === 'A4'
    ? Math.min(width - 40, isTablet ? 680 : 370)
    : selectedPaperSize === '110mm'
    ? Math.min(width - 50, 360)
    : selectedPaperSize === '80mm'
    ? Math.min(width - 60, 320)
    : Math.min(width - 70, 275);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheetContainer, { backgroundColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
          {/* Header */}
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomColor: isDark ? colors.gray200 : '#E2E8F0' }]}>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={[styles.closeBtn, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]}
              >
                <Ionicons name="close" size={20} color={colors.black} />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.modalTitle, { color: colors.black }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {isAr ? 'وصل دفع (دين)' : isKu ? 'وەسڵی پارەدان (قەرز)' : 'Debt Payment Receipt'}
              </Text>
              <Text style={[styles.modalSub, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {receipt.paymentNumber} · {isCustomerPayment ? (isAr ? 'استلام من زبون' : isKu ? 'وەرگرتن لە کڕیار' : 'Customer Collection') : (isAr ? 'تسديد لمورد' : isKu ? 'دانەوە بە دابینکەر' : 'Supplier Payment')}
              </Text>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, alignItems: 'center', marginTop: 2 }}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="eye-outline" size={11} color={colors.gray500} />
                  <Text style={[{ fontSize: 11, color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {isAr ? `مشاهدات: ${receipt.viewCount || 0}` : isKu ? `بینین: ${receipt.viewCount || 0} جار` : `Views: ${receipt.viewCount || 0}`}
                  </Text>
                </View>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="print-outline" size={11} color={colors.primary} />
                  <Text style={[{ fontSize: 11, color: colors.primary, fontWeight: '700' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isAr ? `طباعة: ${receipt.printCount || 0}` : isKu ? `چاپ: ${receipt.printCount || 0} جار` : `Prints: ${receipt.printCount || 0}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1, alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <View style={[styles.typeBadge, { backgroundColor: isCustomerPayment ? 'rgba(5, 150, 105, 0.12)' : 'rgba(180, 83, 9, 0.12)' }]}>
                <Text style={[{ color: isCustomerPayment ? '#059669' : '#B45309', fontSize: 11, fontWeight: '700' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {isCustomerPayment ? (isAr ? 'استلام' : isKu ? 'وەرگرتن' : 'Inflow') : (isAr ? 'تسديد' : isKu ? 'دانەوە' : 'Outflow')}
                </Text>
              </View>
            </View>
          </View>

          {/* Paper Size Selector (4 Formats) */}
          <View style={[styles.paperSelectorWrap, { borderBottomColor: isDark ? colors.gray200 : '#F1F5F9' }]}>
            <View style={[styles.paperOptionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {PAPER_OPTIONS.map((opt) => {
                const isSelected = selectedPaperSize === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.75}
                    onPress={() => setSelectedPaperSize(opt.id)}
                    style={[
                      styles.paperOptionCard,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(212, 175, 55, 0.16)' : '#FEF9C3')
                          : (isDark ? colors.gray200 : '#F8FAFC'),
                        borderColor: isSelected ? colors.primary : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
                      },
                    ]}
                  >
                    <View style={[styles.paperCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text
                        style={[
                          styles.paperCardLabel,
                          { color: isSelected ? colors.primary : colors.black },
                          isSelected && isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && (
                        <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.paperCardSub, { color: colors.gray500 }]}>
                      {opt.widthCm}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Live Preview Scrollable */}
          <ScrollView
            contentContainerStyle={styles.previewScroll}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.receiptPaper,
                {
                  width: previewCardWidth,
                  backgroundColor: '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#CBD5E1',
                },
              ]}
            >
              {/* Receipt Header */}
              <View style={styles.receiptHeader}>
                <View style={styles.receiptLogoBox}>
                  <Text style={styles.receiptLogoLetter}>{business.name?.charAt(0) || 'F'}</Text>
                </View>
                <Text style={styles.receiptBizName}>{business.name || 'Froshiar Store'}</Text>
                {business.phone ? <Text style={styles.receiptBizMeta}>{business.phone}</Text> : null}
                {business.address ? <Text style={styles.receiptBizMeta}>{business.address}</Text> : null}
              </View>

              <View style={styles.receiptDividerDashed} />

              {/* Title & Number */}
              <View style={styles.receiptTitleBox}>
                <Text style={[styles.receiptDocTitle, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {docTitle}
                </Text>
                <Text style={styles.receiptNumber}>{receipt.paymentNumber}</Text>
                <Text style={styles.receiptDateTime}>
                  {formatDate(receipt.createdAt)} · {formatTime(receipt.createdAt)}
                </Text>
              </View>

              {/* Party Information */}
              <View style={styles.partyBox}>
                <View style={[styles.receiptInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.receiptInfoLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {partyRoleLabel}:
                  </Text>
                  <Text style={[styles.receiptInfoValBold, { textAlign: isRTL ? 'left' : 'right' }]}>
                    {receipt.partyName}
                  </Text>
                </View>
                {receipt.partyPhone ? (
                  <View style={[styles.receiptInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.receiptInfoLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT }, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isAr ? 'الهاتف:' : isKu ? 'تەلەفۆن:' : 'Phone:'}
                    </Text>
                    <Text style={[styles.receiptInfoVal, { textAlign: isRTL ? 'left' : 'right' }]}>
                      {receipt.partyPhone}
                    </Text>
                  </View>
                ) : null}
                {receipt.referenceNumber ? (
                  <View style={[styles.receiptInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.receiptInfoLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT }, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {isAr ? 'رقم الفاتورة:' : isKu ? 'ژ. پسوولە:' : 'Invoice #:'}
                    </Text>
                    <Text style={[styles.receiptInfoVal, { textAlign: isRTL ? 'left' : 'right' }]}>
                      #{receipt.referenceNumber}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.receiptDividerSolid} />

              {/* Financial Metrics */}
              <View style={styles.financialSection}>
                <View style={[styles.receiptInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.receiptInfoLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT }, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isAr ? 'الدين السابق:' : isKu ? 'قەرزی پێشوو:' : 'Previous Debt:'}
                  </Text>
                  <Text style={[styles.receiptInfoVal, { textAlign: isRTL ? 'left' : 'right' }]}>
                    {fmtIQD(receipt.previousBalance)} IQD
                  </Text>
                </View>

                {/* Highlight Paid Amount */}
                <View style={styles.highlightPaidBox}>
                  <Text style={[styles.highlightPaidLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isCustomerPayment
                      ? (isAr ? 'المبلغ المستلم من الزبون' : isKu ? 'بڕی وەرگیراو لە کڕیار' : 'Received Amount')
                      : (isAr ? 'المبلغ المسدد للمورد' : isKu ? 'بڕی دراو بە دابینکەر' : 'Paid Amount')}
                  </Text>
                  <Text style={styles.highlightPaidAmount}>
                    + {fmtIQD(receipt.amount)} IQD
                  </Text>
                  <Text style={styles.highlightPaidUsd}>
                    (${fmtUSD(usdValue)} USD)
                  </Text>
                </View>

                <View style={[styles.receiptInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.receiptInfoLabel, { fontWeight: '700' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isAr ? 'الدين المتبقي:' : isKu ? 'قەرزی ماوە:' : 'Remaining Debt:'}
                  </Text>
                  <Text style={[styles.receiptInfoValBold, { color: '#000000', textAlign: isRTL ? 'left' : 'right' }]}>
                    {fmtIQD(receipt.remainingAfter)} IQD
                  </Text>
                </View>

                <View style={[styles.receiptInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.receiptInfoLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT }, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isAr ? 'طريقة الدفع:' : isKu ? 'شێوازی پارەدان:' : 'Payment Method:'}
                  </Text>
                  <Text style={[styles.receiptInfoVal, { textAlign: isRTL ? 'left' : 'right' }]}>
                    {paymentMethodLabel}
                  </Text>
                </View>

                <View style={[styles.receiptInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.receiptInfoLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT }, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {isAr ? 'حالة الدين:' : isKu ? 'دۆخی قەرز:' : 'Debt Status:'}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#000000' }]}>
                    <Text style={[{ color: '#000000', fontSize: 11, fontWeight: '800' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Dual Signatures for A4 mode */}
              {selectedPaperSize === 'A4' && (
                <View style={[styles.a4SignaturesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.signatureCol}>
                    <View style={styles.signatureLine} />
                    <Text style={[styles.signatureText, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {isAr ? 'توقيع المتجر / المُصدِر' : isKu ? 'واژووی دەرهێنەر / فرۆشگا' : 'Store Signature'}
                    </Text>
                  </View>
                  <View style={styles.signatureCol}>
                    <View style={styles.signatureLine} />
                    <Text style={[styles.signatureText, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {isAr ? 'توقيع المستلم' : isKu ? 'واژووی وەرگر' : 'Receiver Signature'}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.receiptDividerDashed} />

              {/* Receipt Footer */}
              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>{isAr ? 'شكراً لتعاملكم معنا' : isKu ? 'سوپاس بۆ مامەڵەکەتان' : 'Thank You'}</Text>
                <Text style={styles.receiptFooterSub}>www.froshiar.store · Froshiar POS</Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={[styles.bottomActionBar, { borderTopColor: isDark ? colors.gray200 : '#E2E8F0', backgroundColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePrint}
              disabled={isPrinting}
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              {isPrinting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="print-outline" size={20} color="#FFFFFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isAr ? 'طباعة الوصل' : isKu ? 'چاپکردنی وەسڵ' : 'Print Receipt'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    maxHeight: '88%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paperSelectorWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  paperOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paperOptionCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  paperCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  paperCardLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  paperCardSub: {
    fontSize: 9.5,
    marginTop: 2,
  },
  checkCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewScroll: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  receiptPaper: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  receiptLogoLetter: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  receiptBizName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
  },
  receiptBizMeta: {
    fontSize: 11,
    color: '#000000',
    marginTop: 1,
  },
  receiptDividerDashed: {
    borderStyle: 'dashed',
    borderBottomWidth: 1,
    borderColor: '#000000',
    marginVertical: 12,
  },
  receiptDividerSolid: {
    borderBottomWidth: 1.5,
    borderColor: '#000000',
    marginVertical: 10,
  },
  receiptTitleBox: {
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptDocTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  receiptNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  receiptDateTime: {
    fontSize: 11,
    color: '#000000',
    marginTop: 2,
  },
  partyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#000000',
    gap: 4,
  },
  receiptInfoRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2.5,
  },
  receiptInfoLabel: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
  },
  receiptInfoVal: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '600',
  },
  receiptInfoValBold: {
    fontSize: 12.5,
    color: '#000000',
    fontWeight: '800',
  },
  financialSection: {
    gap: 6,
  },
  highlightPaidBox: {
    backgroundColor: '#F4F4F5',
    borderColor: '#000000',
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginVertical: 4,
  },
  highlightPaidLabel: {
    fontSize: 11.5,
    color: '#000000',
    fontWeight: '800',
  },
  highlightPaidAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
    marginTop: 2,
  },
  highlightPaidUsd: {
    fontSize: 10.5,
    color: '#000000',
    fontWeight: '700',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  a4SignaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 6,
  },
  signatureCol: {
    alignItems: 'center',
    width: '40%',
  },
  signatureLine: {
    width: '100%',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 10.5,
    color: '#000000',
    fontWeight: '700',
  },
  receiptFooter: {
    alignItems: 'center',
    marginTop: 4,
  },
  receiptFooterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  receiptFooterSub: {
    fontSize: 9.5,
    color: '#000000',
    marginTop: 2,
  },
  bottomActionBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  primaryActionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
});
