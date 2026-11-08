import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import type { ReceiptPaperSize } from '@/store/settingsStore';

export interface PrintFormatPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (paperSize: ReceiptPaperSize) => void | Promise<void>;
  title?: string;
  invoiceNumber?: string;
  partyName?: string;
  initialPaperSize?: ReceiptPaperSize;
  isPrinting?: boolean;
}

interface PaperFormatOption {
  id: ReceiptPaperSize;
  titleKu: string;
  titleEn: string;
  titleAr: string;
  dimKu: string;
  dimEn: string;
  dimAr: string;
  descKu: string;
  descEn: string;
  descAr: string;
  icon: keyof typeof Ionicons.glyphMap;
  isRecommended?: boolean;
}

const PAPER_OPTIONS: PaperFormatOption[] = [
  {
    id: 'A4',
    titleKu: 'پەڕەی فەرمی A4',
    titleEn: 'Standard A4 Sheet',
    titleAr: 'ورق رسمي قياسي A4',
    dimKu: '21 × 29.7 سم',
    dimEn: '21 × 29.7 cm',
    dimAr: '21 × 29.7 سم',
    descKu: 'چاپکەری ئۆفیس، خشتەی تەواو و لۆگۆ',
    descEn: 'Office printer, full table with logo',
    descAr: 'طابعة مكتبية، جدول كامل مع الشعار',
    icon: 'document-text',
  },
  {
    id: '110mm',
    titleKu: 'تێرمالی پان (110mm)',
    titleEn: 'Wide Thermal (110mm)',
    titleAr: 'حراري عريض (110mm)',
    dimKu: '11.0 سم',
    dimEn: '11.0 cm',
    dimAr: '11.0 سم',
    descKu: 'تێرمالی پانی فرۆشگا و کۆگا',
    descEn: 'Wide thermal roll for retail & warehouse',
    descAr: 'طابعة حرارية عريضة للمحلات والمستودعات',
    icon: 'receipt',
  },
  {
    id: '80mm',
    titleKu: 'ستاندارد (80mm)',
    titleEn: 'Standard POS (80mm)',
    titleAr: 'قياسي كاشير (80mm)',
    dimKu: '8.0 سم',
    dimEn: '8.0 cm',
    dimAr: '8.0 سم',
    descKu: 'باوترین تێرمالی دەسکتۆپ و کاشێر',
    descEn: 'Most common desktop cashier roll',
    descAr: 'الأكثر استخداماً لكاشير ونقاط البيع',
    icon: 'print',
    isRecommended: true,
  },
  {
    id: '58mm',
    titleKu: 'وەسڵی بچووک (58mm)',
    titleEn: 'Compact POS (58mm)',
    titleAr: 'إيصال صغير (58mm)',
    dimKu: '5.8 سم',
    dimEn: '5.8 cm',
    dimAr: '5.8 سم',
    descKu: 'چاپکەری مۆبایلی گەڕۆک و بلوتوس',
    descEn: 'Portable Bluetooth mobile printer',
    descAr: 'طابعات البلوتوث المحمولة الصغيرة',
    icon: 'phone-portrait-outline',
  },
];

export function PrintFormatPickerModal({
  visible,
  onClose,
  onConfirm,
  title,
  invoiceNumber,
  partyName,
  initialPaperSize = '80mm',
  isPrinting = false,
}: PrintFormatPickerModalProps) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const lang = useLanguageStore((s) => s.language);
  const isKu = lang === 'ku';
  const isAr = lang === 'ar';

  const [selectedSize, setSelectedSize] = useState<ReceiptPaperSize>(initialPaperSize);

  useEffect(() => {
    if (visible && initialPaperSize) {
      setSelectedSize(initialPaperSize);
    }
  }, [visible, initialPaperSize]);

  const handleSelect = (size: ReceiptPaperSize) => {
    setSelectedSize(size);
  };

  const handlePrintPress = () => {
    if (isPrinting) return;
    onConfirm(selectedSize);
  };

  if (!visible) return null;

  const modalWidth = isTablet ? 520 : Math.min(width * 0.92, 420);

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
          onPress={isPrinting ? undefined : onClose}
        />

        <View
          style={[
            styles.dialogCard,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: colors.gray200,
              width: modalWidth,
            },
          ]}
        >
          {/* ── Dialog Header ── */}
          <View
            style={[
              styles.header,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                borderBottomColor: colors.gray200,
              },
            ]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : '#FEF3C7' },
                ]}
              >
                <Ionicons name="print" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.headerTitle,
                    { color: colors.black },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {title || (isAr ? 'اختر حجم الطباعة' : isKu ? 'قەبارەی چاپ هەڵبژێرە' : 'Select Print Format')}
                </Text>
                {(!!invoiceNumber || !!partyName) && (
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    {!!invoiceNumber && (
                      <IdText style={{ fontSize: 11.5, color: colors.primary, fontWeight: '700' }}>
                        {invoiceNumber}
                      </IdText>
                    )}
                    {!!invoiceNumber && !!partyName && (
                      <Text style={{ fontSize: 11, color: colors.gray400 }}>•</Text>
                    )}
                    {!!partyName && (
                      <Text
                        numberOfLines={1}
                        style={[
                          { fontSize: 11.5, color: colors.gray500 },
                          isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                        ]}
                      >
                        {partyName}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              disabled={isPrinting}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.gray500} />
            </TouchableOpacity>
          </View>

          {/* ── Subtitle Instruction ── */}
          <View style={[styles.instructionBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }]}>
            <Text
              style={[
                styles.instructionText,
                { color: colors.gray500, textAlign },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
            >
              {isKu
                ? 'تکایە یەکێک لە قەبارەکانی کاغەز دیاری بکە بۆ دەستپێکردنی چاپ:'
                : 'Please choose one of the paper formats to proceed with printing:'}
            </Text>
          </View>

          {/* ── 4 Format Cards ── */}
          <View style={styles.optionsList}>
            {PAPER_OPTIONS.map((opt) => {
              const isSelected = selectedSize === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelect(opt.id)}
                  style={[
                    styles.optionCard,
                    {
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(212, 175, 55, 0.14)' : '#FEF9C3')
                        : (isDark ? colors.gray200 : '#FFFFFF'),
                      borderColor: isSelected
                        ? colors.primary
                        : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
                    },
                    isSelected && styles.optionCardSelected,
                  ]}
                >
                  {/* Left/Right Icon */}
                  <View
                    style={[
                      styles.optIconWrap,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? 'rgba(212, 175, 55, 0.25)' : '#FDE047')
                          : (isDark ? colors.gray100 : '#F1F5F9'),
                      },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? colors.primary : colors.gray500}
                    />
                  </View>

                  {/* Texts */}
                  <View style={[styles.optTextWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={[
                          styles.optTitle,
                          { color: colors.black },
                          isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {isAr ? opt.titleAr : isKu ? opt.titleKu : opt.titleEn}
                      </Text>
                      {opt.isRecommended && (
                        <View
                          style={[
                            styles.badgeRecommended,
                            { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.3)' : '#FEF3C7' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeRecommendedText,
                              { color: colors.primary },
                              isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                            ]}
                          >
                            {isAr ? 'موصى به' : isKu ? 'پێشنیارکراو' : 'Popular'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.optDesc,
                        { color: colors.gray400 },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isAr ? opt.descAr : isKu ? opt.descKu : opt.descEn} • ({isAr ? opt.dimAr : isKu ? opt.dimKu : opt.dimEn})
                    </Text>
                  </View>

                  {/* Radio Indicator */}
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.gray300,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#0F172A" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Dialog Bottom Actions ── */}
          <View
            style={[
              styles.footer,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                borderTopColor: colors.gray200,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePrintPress}
              disabled={isPrinting}
              style={[
                styles.printBtn,
                { backgroundColor: '#2563EB' },
                isPrinting && { opacity: 0.7 },
              ]}
            >
              {isPrinting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="print" size={19} color="#FFFFFF" />
                  <Text
                    style={[
                      styles.printBtnText,
                      { color: '#FFFFFF' },
                      isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isAr ? 'طباعة الفاتورة' : isKu ? 'چاپکردنی وەسڵ' : 'Print Invoice'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              disabled={isPrinting}
              style={[
                styles.cancelBtn,
                {
                  borderColor: isDark ? '#2B3D63' : colors.gray300,
                  backgroundColor: isDark ? '#203152' : '#F8FAFC',
                },
              ]}
            >
              <Text
                style={[
                  styles.cancelBtnText,
                  { color: isDark ? '#CBD5E1' : colors.gray500 },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isAr ? 'إلغاء' : isKu ? 'داخستن' : 'Cancel'}
              </Text>
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
    padding: 16,
  },
  dialogCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  instructionText: {
    fontSize: 12,
    lineHeight: 17,
  },
  optionsList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 9,
  },
  optionCard: {
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  optionCardSelected: {
    borderWidth: 2,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  optIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optTextWrap: {
    flex: 1,
  },
  optTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  optDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  badgeRecommended: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  badgeRecommendedText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  printBtn: {
    flex: 1.8,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  printBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});

