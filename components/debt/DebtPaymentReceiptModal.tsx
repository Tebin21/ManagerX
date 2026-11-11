import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Image,
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
import { resolveImageUri } from '@/lib/imageStorage';

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

// Reference dimensions for authentic A4 sheet (ISO 210mm x 297mm, ratio 1:1.414)
const A4_SHEET_BASE_WIDTH = 520;
const A4_SHEET_BASE_HEIGHT = 735;

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

  // Calculate default fit scale for A4 so the full document fits cleanly on mobile screens
  const a4AvailableWidth = Math.max(280, Math.min(width - (isTablet ? 96 : 48), 640));
  const fitScale = useMemo(() => {
    return Number(Math.min(1.0, a4AvailableWidth / A4_SHEET_BASE_WIDTH).toFixed(2));
  }, [a4AvailableWidth]);

  // Current zoom level for A4 preview
  const [a4Zoom, setA4Zoom] = useState<number>(fitScale || 0.68);

  // Sync zoom scale when device width or initial paper changes
  React.useEffect(() => {
    if (selectedPaperSize === 'A4') {
      setA4Zoom(fitScale);
    }
  }, [selectedPaperSize, fitScale]);

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

  const resolvedLogo = resolveImageUri(business.logoUri) || business.logoUri;

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

  // Preview container max width for thermal formats
  const thermalPreviewWidth = selectedPaperSize === '110mm'
    ? Math.min(width - 50, 360)
    : selectedPaperSize === '80mm'
    ? Math.min(width - 60, 320)
    : Math.min(width - 70, 265);

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
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              maxWidth: selectedPaperSize === 'A4' ? (isTablet ? 740 : Math.min(width - 16, 520)) : 440,
            },
          ]}
        >
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

          {/* Interactive Zoom Bar for A4 Sheet Format */}
          {selectedPaperSize === 'A4' && (
            <View style={[styles.zoomToolbar, { backgroundColor: isDark ? colors.gray200 : '#F8FAFC', borderBottomColor: isDark ? colors.gray300 : '#E2E8F0', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.zoomControlsGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  onPress={() => setA4Zoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.zoomBtn, { backgroundColor: isDark ? colors.gray300 : '#FFFFFF', borderColor: isDark ? colors.gray400 : '#CBD5E1' }]}
                >
                  <Ionicons name="remove" size={16} color={colors.black} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setA4Zoom(1.0)}
                  style={[styles.zoomValuePill, { backgroundColor: isDark ? colors.gray300 : '#FFFFFF', borderColor: isDark ? colors.gray400 : '#CBD5E1' }]}
                >
                  <Text style={[styles.zoomValueText, { color: colors.black }]}>
                    {Math.round(a4Zoom * 100)}%
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setA4Zoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))))}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[styles.zoomBtn, { backgroundColor: isDark ? colors.gray300 : '#FFFFFF', borderColor: isDark ? colors.gray400 : '#CBD5E1' }]}
                >
                  <Ionicons name="add" size={16} color={colors.black} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setA4Zoom(fitScale)}
                  style={[
                    styles.fitBtn,
                    {
                      backgroundColor: Math.abs(a4Zoom - fitScale) < 0.05 ? `${colors.primary}25` : (isDark ? colors.gray300 : '#FFFFFF'),
                      borderColor: Math.abs(a4Zoom - fitScale) < 0.05 ? colors.primary : (isDark ? colors.gray400 : '#CBD5E1'),
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="scan-outline" size={13} color={Math.abs(a4Zoom - fitScale) < 0.05 ? colors.primary : colors.black} />
                  <Text style={[styles.fitBtnText, { color: Math.abs(a4Zoom - fitScale) < 0.05 ? colors.primary : colors.black }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isAr ? 'ملاءمة الشاشة' : isKu ? 'گونجاندن لە شاشە' : 'Fit'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setA4Zoom(1.0)}
                  style={[
                    styles.fitBtn,
                    {
                      backgroundColor: Math.abs(a4Zoom - 1.0) < 0.05 ? `${colors.primary}25` : (isDark ? colors.gray300 : '#FFFFFF'),
                      borderColor: Math.abs(a4Zoom - 1.0) < 0.05 ? colors.primary : (isDark ? colors.gray400 : '#CBD5E1'),
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Text style={[styles.fitBtnText, { color: Math.abs(a4Zoom - 1.0) < 0.05 ? colors.primary : colors.black }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    100%
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Live Preview Scrollable */}
          <ScrollView
            contentContainerStyle={styles.previewScroll}
            showsVerticalScrollIndicator={false}
            maximumZoomScale={3}
            minimumZoomScale={0.4}
            bouncesZoom={true}
          >
            {selectedPaperSize === 'A4' ? (
              /* ── AUTHENTIC A4 SHEET DOCUMENT PREVIEW (Matches buildDebtPaymentA4HTML) ── */
              <ScrollView
                horizontal
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 }}
                showsHorizontalScrollIndicator={false}
              >
                <View
                  style={{
                    width: Math.round(A4_SHEET_BASE_WIDTH * a4Zoom),
                    height: Math.round(A4_SHEET_BASE_HEIGHT * a4Zoom),
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={[
                      styles.a4SheetPaper,
                      {
                        width: A4_SHEET_BASE_WIDTH,
                        height: A4_SHEET_BASE_HEIGHT,
                        transform: [{ scale: a4Zoom }],
                      },
                    ]}
                  >
                    {/* A4 Header Table Row */}
                    <View style={[styles.a4HeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {/* Store Information */}
                      <View style={[styles.a4StoreCol, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        {resolvedLogo ? (
                          <Image
                            source={{ uri: resolvedLogo }}
                            style={styles.a4StoreLogo}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.a4StoreLogoMono}>
                            <Text style={styles.a4StoreLogoMonoText}>
                              {business.name?.charAt(0) || 'F'}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1, paddingHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                          <Text style={[styles.a4BizName, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]} numberOfLines={1}>
                            {business.name || 'فرۆشیار'}
                          </Text>
                          {business.phone ? (
                            <Text style={styles.a4BizMeta} numberOfLines={1}>📞 {business.phone}</Text>
                          ) : null}
                          {business.address ? (
                            <Text style={styles.a4BizMeta} numberOfLines={1}>📍 {business.address}</Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Document Meta */}
                      <View style={[styles.a4DocCol, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                        <Text style={[styles.a4DocTitle, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {docTitle}
                        </Text>
                        <Text style={styles.a4DocNumber}>{receipt.paymentNumber}</Text>
                        <Text style={styles.a4DocDateTime}>
                          {formatDate(receipt.createdAt)} · {formatTime(receipt.createdAt)}
                        </Text>
                        <View style={styles.a4StatusBadge}>
                          <Text style={[styles.a4StatusBadgeText, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                            {statusLabel}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* A4 Party Card */}
                    <View style={styles.a4PartyCard}>
                      <Text style={[styles.a4PartyRoleTag, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {partyRoleLabel}
                      </Text>
                      <Text style={[styles.a4PartyName, { textAlign: isRTL ? 'right' : 'left' }]}>
                        {receipt.partyName}
                      </Text>
                      <View style={[styles.a4PartyMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        {receipt.partyPhone ? (
                          <View style={[styles.a4PartyMetaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="call-outline" size={12} color="#000000" />
                            <Text style={styles.a4PartyMetaText}>{receipt.partyPhone}</Text>
                          </View>
                        ) : null}
                        {receipt.referenceNumber ? (
                          <View style={[styles.a4PartyMetaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="receipt-outline" size={12} color="#000000" />
                            <Text style={styles.a4PartyMetaText}>
                              {isAr ? 'فاتورة:' : isKu ? 'پسوولەی سەرەکی:' : 'Invoice:'} #{receipt.referenceNumber}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* A4 3-Column Financial Cards Grid */}
                    <View style={[styles.a4FinGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {/* Box 1: Previous Debt */}
                      <View style={styles.a4FinBox}>
                        <Text style={[styles.a4FinLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {isAr ? 'الدين السابق' : isKu ? 'قەرزی پێشوو' : 'Previous Debt'}
                        </Text>
                        <Text style={styles.a4FinVal}>
                          {fmtIQD(receipt.previousBalance)} IQD
                        </Text>
                      </View>

                      {/* Box 2: Paid Amount (Prominent) */}
                      <View style={[styles.a4FinBox, styles.a4FinBoxPaid]}>
                        <Text style={[styles.a4FinLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {isCustomerPayment
                            ? (isAr ? 'المبلغ المستلم' : isKu ? 'بڕی وەرگیراو لە کڕیار' : 'Received Amount')
                            : (isAr ? 'المبلغ المسدد' : isKu ? 'بڕی دراو بە دابینکەر' : 'Paid Amount')}
                        </Text>
                        <Text style={styles.a4FinValPaid}>
                          + {fmtIQD(receipt.amount)} IQD
                        </Text>
                        <Text style={styles.a4FinUsd}>
                          (${fmtUSD(usdValue)} USD)
                        </Text>
                      </View>

                      {/* Box 3: Remaining Debt */}
                      <View style={styles.a4FinBox}>
                        <Text style={[styles.a4FinLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {isAr ? 'الدين المتبقي' : isKu ? 'قەرزی ماوە' : 'Remaining Debt'}
                        </Text>
                        <Text style={[styles.a4FinVal, { fontWeight: '900' }]}>
                          {fmtIQD(receipt.remainingAfter)} IQD
                        </Text>
                      </View>
                    </View>

                    {/* A4 Meta Table (Method, Status, Notes) */}
                    <View style={styles.a4MetaTable}>
                      <View style={[styles.a4MetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.a4MetaLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { textAlign: isRTL ? 'right' : 'left' }]}>
                          {isAr ? 'طريقة الدفع:' : isKu ? 'شێوازی پارەدان:' : 'Payment Method:'}
                        </Text>
                        <Text style={[styles.a4MetaVal, { textAlign: isRTL ? 'left' : 'right' }]}>
                          {paymentMethodLabel}
                        </Text>
                      </View>
                      <View style={[styles.a4MetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomWidth: receipt.note ? 1 : 0 }]}>
                        <Text style={[styles.a4MetaLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { textAlign: isRTL ? 'right' : 'left' }]}>
                          {isAr ? 'حالة الدين:' : isKu ? 'دۆخی قەرز:' : 'Debt Status:'}
                        </Text>
                        <Text style={[styles.a4MetaVal, { textAlign: isRTL ? 'left' : 'right' }]}>
                          {statusLabel}
                        </Text>
                      </View>
                      {receipt.note ? (
                        <View style={[styles.a4MetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row', borderBottomWidth: 0 }]}>
                          <Text style={[styles.a4MetaLabel, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { textAlign: isRTL ? 'right' : 'left' }]}>
                            {isAr ? 'ملاحظات:' : isKu ? 'تێبینی:' : 'Note:'}
                          </Text>
                          <Text style={[styles.a4MetaVal, { textAlign: isRTL ? 'left' : 'right' }]}>
                            {receipt.note}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* A4 Formal Dual Signatures */}
                    <View style={[styles.a4SignaturesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={styles.a4SigCol}>
                        <View style={styles.a4SigLine} />
                        <Text style={[styles.a4SigText, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {isAr ? 'توقيع وختم المتجر / المُصدِر' : isKu ? 'واژوو و مۆری فرۆشگا / دەرهێنەر' : 'Store Signature & Stamp'}
                        </Text>
                      </View>
                      <View style={styles.a4SigCol}>
                        <View style={styles.a4SigLine} />
                        <Text style={[styles.a4SigText, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {isAr ? 'توقيع المستلم / المدين' : isKu ? 'واژووی وەرگر / قەرزدار' : 'Receiver / Debtor Signature'}
                        </Text>
                      </View>
                    </View>

                    {/* A4 Formal Footer */}
                    <View style={styles.a4Footer}>
                      <Text style={styles.a4FooterText}>
                        {isAr ? 'شكراً لتعاملكم معنا' : isKu ? 'سوپاس بۆ مامەڵەکەتان' : 'Thank You For Your Business'}
                      </Text>
                      <Text style={styles.a4FooterSub}>
                        www.froshiar.store · Froshiar POS
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            ) : (
              /* ── THERMAL RECEIPT ROLL PREVIEW (58mm, 80mm, 110mm) ── */
              <View
                style={[
                  styles.receiptPaper,
                  {
                    width: thermalPreviewWidth,
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

                <View style={styles.receiptDividerDashed} />

                {/* Receipt Footer */}
                <View style={styles.receiptFooter}>
                  <Text style={styles.receiptFooterText}>{isAr ? 'شكراً لتعاملكم معنا' : isKu ? 'سوپاس بۆ مامەڵەکەتان' : 'Thank You'}</Text>
                  <Text style={styles.receiptFooterSub}>www.froshiar.store · Froshiar POS</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions: Both Complete (تەواوکردن) and Print (چاپکردنی وەسڵ) */}
          <View style={[styles.bottomActionBar, { borderTopColor: isDark ? colors.gray200 : '#E2E8F0', backgroundColor: isDark ? colors.gray100 : '#FFFFFF' }]}>
            <View style={[styles.bottomActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* 1. Complete / Done Button (تەواوکردن) */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                disabled={isPrinting}
                style={[
                  styles.completeActionBtn,
                  {
                    backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                    borderColor: isDark ? colors.gray300 : '#CBD5E1',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={19} color={isDark ? '#34D399' : '#059669'} />
                <Text
                  style={[
                    styles.completeBtnText,
                    { color: colors.black },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isAr ? 'إتمام' : isKu ? 'تەواوکردن' : 'Done'}
                </Text>
              </TouchableOpacity>

              {/* 2. Print Receipt Button (چاپکردنی وەسڵ) */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePrint}
                disabled={isPrinting}
                style={[
                  styles.printActionBtn,
                  {
                    backgroundColor: colors.primary,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                {isPrinting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="print-outline" size={19} color="#FFFFFF" />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: '#FFFFFF' },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isAr ? 'طباعة الوصل' : isKu ? 'چاپکردنی وەسڵ' : 'Print Receipt'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  sheetContainer: {
    width: '100%',
    borderRadius: 24,
    maxHeight: '90%',
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
    paddingVertical: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  paperOptionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  paperOptionCard: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  paperCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  paperCardLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  paperCardSub: {
    fontSize: 9,
    marginTop: 2,
  },
  checkCircle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Zoom Toolbar for A4 ── */
  zoomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  zoomControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomValuePill: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomValueText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  fitBtn: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fitBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  previewScroll: {
    paddingVertical: 14,
    alignItems: 'center',
    flexGrow: 1,
  },

  /* ── REAL A4 SHEET DOCUMENT STYLES (1:1 with buildDebtPaymentA4HTML) ── */
  a4SheetPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  a4HeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 12,
    marginBottom: 14,
  },
  a4StoreCol: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  a4StoreLogo: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  a4StoreLogoMono: {
    width: 46,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  a4StoreLogoMonoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
  },
  a4BizName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 2,
  },
  a4BizMeta: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '600',
    marginTop: 1,
  },
  a4DocCol: {
    flex: 0.9,
  },
  a4DocTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 2,
  },
  a4DocNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  a4DocDateTime: {
    fontSize: 10.5,
    color: '#000000',
    fontWeight: '600',
    marginTop: 2,
  },
  a4StatusBadge: {
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 5,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  a4StatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#000000',
  },
  a4PartyCard: {
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  a4PartyRoleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  a4PartyName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 3,
  },
  a4PartyMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  a4PartyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  a4PartyMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
  },
  a4FinGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  a4FinBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  a4FinBoxPaid: {
    flex: 1.15,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#F4F4F5',
  },
  a4FinLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 3,
    textAlign: 'center',
  },
  a4FinVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
  },
  a4FinValPaid: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
  },
  a4FinUsd: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#000000',
    marginTop: 1,
  },
  a4MetaTable: {
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  a4MetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  a4MetaLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#000000',
  },
  a4MetaVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#000000',
  },
  a4SignaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    marginBottom: 14,
  },
  a4SigCol: {
    alignItems: 'center',
    width: '42%',
  },
  a4SigLine: {
    width: '100%',
    borderTopWidth: 1.5,
    borderTopColor: '#000000',
    borderStyle: 'dashed',
    marginBottom: 5,
  },
  a4SigText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
  },
  a4Footer: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  a4FooterText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#000000',
  },
  a4FooterSub: {
    fontSize: 9,
    color: '#000000',
    marginTop: 2,
  },

  /* ── THERMAL ROLL PREVIEW STYLES ── */
  receiptPaper: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
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
    marginVertical: 10,
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
    gap: 5,
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

  /* ── Bottom Action Bar ── */
  bottomActionBar: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  completeActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  printActionBtn: {
    flex: 1.25,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
