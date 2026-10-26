import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { AmountText } from '@/components/ui/AmountText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { fmtIQD, fmtUSD } from '@/utils/formatters';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
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
}: QuotationPreviewModalProps) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);
  const isSystemUsd = baseCurrency === 'USD';

  if (!quotation) return null;

  const effMode = quotation.currencyMode || 'both';
  const isUsdOnly = effMode === 'usd';
  const isIqdOnly = effMode === 'iqd';
  const rate = quotation.exchangeRate || 1310;
  const usdValue = rate > 0 ? quotation.grandTotal / rate : 0;
  const isItemUsd = isSystemUsd || isUsdOnly;

  const formatPrice = (val: number) => {
    if (isItemUsd) {
      return `$${fmtUSD(val / rate)}`;
    }
    return `${fmtIQD(val)} د.ع`;
  };

  const totalUSD = fmtUSD(usdValue);
  const totalIQD = fmtIQD(quotation.grandTotal);

  let grandTotalPrimary = `${totalIQD} د.ع`;
  let grandTotalSecondary = '';

  if (isUsdOnly) {
    grandTotalPrimary = `$${totalUSD} USD`;
    grandTotalSecondary = '';
  } else if (isIqdOnly) {
    grandTotalPrimary = `${totalIQD} د.ع`;
    grandTotalSecondary = '';
  } else {
    if (isSystemUsd) {
      grandTotalPrimary = `$${totalUSD} USD`;
      grandTotalSecondary = `≈ ${totalIQD} د.ع`;
    } else {
      grandTotalPrimary = `${totalIQD} د.ع`;
      grandTotalSecondary = `≈ $${totalUSD} USD`;
    }
  }

  const printCount = quotation.printCount || 0;
  const viewCount = quotation.viewCount || 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: colors.gray200,
              width: isTablet ? Math.min(width * 0.78, 640) : Math.min(width * 0.94, 460),
              maxHeight: height * 0.88,
            },
          ]}
        >
          {/* ── Modal Header ── */}
          <View
            style={[
              styles.modalHeader,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                borderBottomColor: colors.gray200,
                backgroundColor: isDark ? colors.gray100 : colors.white,
              },
            ]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: isDark ? 'rgba(212, 175, 55, 0.2)' : '#FEF3C7' },
                ]}
              >
                <Ionicons name="document-text" size={20} color={colors.primary} />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'وردەکاری وەسڵی عەرز' : 'Quotation Details'}
                </Text>
                <IdText style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                  {quotation.quotationNumber}
                </IdText>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              style={[
                styles.closeBtn,
                { backgroundColor: isDark ? colors.gray200 : colors.gray100 },
              ]}
            >
              <Ionicons name="close" size={19} color={colors.black} />
            </TouchableOpacity>
          </View>

          {/* ── Modal Body Content ── */}
          <ScrollView
            style={{ maxHeight: height * 0.88 - 145 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Notice Banner */}
            <View
              style={[
                styles.previewNotice,
                {
                  backgroundColor: isDark ? 'rgba(212, 175, 55, 0.12)' : '#FEF9C3',
                  borderColor: isDark ? 'rgba(212, 175, 55, 0.28)' : '#FDE047',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.noticeTitle,
                    { color: isDark ? '#FDE047' : '#854D0E', textAlign },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage
                    ? 'ئەم وەسڵە تەنها بۆ عەرزی نرخە و وەسڵی فرۆشتن نییە'
                    : 'THIS DOCUMENT IS A PRICE QUOTATION ONLY'}
                </Text>
                <Text
                  style={[
                    styles.noticeSub,
                    { color: isDark ? colors.gray400 : '#A16207', textAlign },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKuLanguage
                    ? 'سەرجەم نرخەکان پێشنیارکراون بۆ کڕیار بەپێی بەروار و ماوەی دیاریکراو.'
                    : 'All prices are offered for quotation purposes.'}
                </Text>
              </View>
            </View>

            {/* ── View & Print Stats Card ── */}
            <View
              style={[
                styles.statsCard,
                {
                  backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                  borderColor: colors.gray200,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="stats-chart" size={15} color={colors.primary} />
                <Text
                  style={[
                    styles.statsCardTitle,
                    { color: colors.gray600 },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'ئاماری وەسڵ:' : 'Invoice Stats:'}
                </Text>
              </View>

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                {/* View Count Badge */}
                <View
                  style={[
                    styles.statPill,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="eye-outline" size={13} color={colors.gray600} />
                  <Text
                    style={[
                      styles.statPillText,
                      { color: colors.black },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKuLanguage ? `بینین: ${viewCount} جار` : `Views: ${viewCount}`}
                  </Text>
                </View>

                {/* Print Count Badge */}
                <View
                  style={[
                    styles.statPill,
                    {
                      backgroundColor: printCount > 0
                        ? (isDark ? 'rgba(34, 197, 94, 0.18)' : '#DCFCE7')
                        : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
                      borderWidth: printCount > 0 ? 1 : 0,
                      borderColor: printCount > 0 ? (isDark ? 'rgba(34, 197, 94, 0.35)' : '#86EFAC') : 'transparent',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons
                    name={printCount > 0 ? 'print' : 'print-outline'}
                    size={13}
                    color={printCount > 0 ? (isDark ? '#4ADE80' : '#15803D') : colors.gray500}
                  />
                  <Text
                    style={[
                      styles.statPillText,
                      {
                        color: printCount > 0 ? (isDark ? '#4ADE80' : '#15803D') : colors.gray600,
                      },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {printCount > 0
                      ? (isKuLanguage ? `چاپ: ${printCount} جار` : `Prints: ${printCount}`)
                      : (isKuLanguage ? 'چاپ نەکراوە' : 'Not printed')}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Client & Metadata Card ── */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDark ? colors.gray200 : colors.gray50,
                  borderColor: colors.gray200,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text
                    style={[
                      styles.clientLabel,
                      { color: colors.gray400 },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isKuLanguage ? 'کڕیار / کۆمپانیا:' : 'Client / Company:'}
                  </Text>
                  <Text
                    style={[
                      styles.clientName,
                      { color: colors.black, textAlign },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {quotation.customerName || (isKuLanguage ? 'کڕیاری گشتی' : 'Valued Client')}
                  </Text>

                  {quotation.customerPhone ? (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Ionicons name="call-outline" size={13} color={colors.primary} />
                      <Text style={[styles.clientSub, { color: colors.gray600, direction: 'ltr' }]}>
                        {quotation.customerPhone}
                      </Text>
                    </View>
                  ) : null}

                  {quotation.customerAddress ? (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
                      <Ionicons name="location-outline" size={13} color={colors.gray400} />
                      <Text style={[styles.clientSub, { color: colors.gray500, textAlign }]}>
                        {quotation.customerAddress}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {quotation.validityDays ? (
                  <View
                    style={[
                      styles.validityBadge,
                      {
                        backgroundColor: isDark ? 'rgba(212,175,55,0.18)' : '#FEF3C7',
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.validityLabel,
                        { color: colors.gray600 },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isKuLanguage ? 'ماوەی عەرز' : 'Validity'}
                    </Text>
                    <Text
                      style={[
                        styles.validityValue,
                        { color: colors.primary },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isKuLanguage ? `${quotation.validityDays} ڕۆژ` : `${quotation.validityDays} Days`}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Date & Time Row */}
              <View
                style={[
                  styles.dateRow,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    borderTopColor: isDark ? colors.gray300 : 'rgba(0,0,0,0.06)',
                  },
                ]}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="calendar-outline" size={13} color={colors.gray400} />
                  <Text style={[styles.dateText, { color: colors.gray500 }]}>
                    {quotation.date}
                  </Text>
                </View>
                {quotation.time ? (
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="time-outline" size={13} color={colors.gray400} />
                    <Text style={[styles.dateText, { color: colors.gray500 }]}>
                      {quotation.time}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── Items List ("چی کراوە چی نەکراوە") ── */}
            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    styles.sectionHeaderTitle,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'لیستی کاڵاکانی عەرز:' : 'Quotation Items List:'}
                </Text>
                <View
                  style={[
                    styles.itemCountPill,
                    { backgroundColor: isDark ? colors.gray200 : colors.gray200 },
                  ]}
                >
                  <Text
                    style={[
                      styles.itemCountText,
                      { color: colors.black },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {quotation.items?.length || 0} {isKuLanguage ? 'کاڵا' : 'items'}
                  </Text>
                </View>
              </View>

              {quotation.items && quotation.items.length > 0 ? (
                quotation.items.map((it, idx) => (
                  <View
                    key={it.id || String(idx)}
                    style={[
                      styles.itemRow,
                      {
                        backgroundColor: isDark ? colors.gray200 : colors.gray50,
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray200,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.indexBadge,
                        { backgroundColor: isDark ? colors.gray300 : '#E2E8F0' },
                      ]}
                    >
                      <Text style={{ fontSize: 11, color: colors.black, fontWeight: '700' }}>
                        #{idx + 1}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 10, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text
                        style={[
                          styles.itemName,
                          { color: colors.black, textAlign },
                          isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                        numberOfLines={2}
                      >
                        {it.productName}
                      </Text>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Text style={[styles.itemSub, { color: colors.gray500, direction: 'ltr' }]}>
                          {it.quantity} × {formatPrice(it.unitPrice)}
                        </Text>
                        {it.discount > 0 ? (
                          <Text style={[styles.itemDiscountText, { color: '#EF4444', direction: 'ltr' }]}>
                            (-{formatPrice(it.discount)})
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.itemTotal,
                        { color: colors.black, direction: 'ltr' },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {formatPrice(it.lineTotal)}
                    </Text>
                  </View>
                ))
              ) : (
                <View
                  style={[
                    styles.emptyItemsBox,
                    { backgroundColor: isDark ? colors.gray200 : colors.gray50 },
                  ]}
                >
                  <Text
                    style={[
                      { color: colors.gray400, textAlign: 'center', fontSize: 13 },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isKuLanguage ? 'هیچ کاڵایەک لەم عەرزەدا تۆمار نەکراوە.' : 'No items recorded in this quotation.'}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Notes & Terms Section ── */}
            {quotation.notes ? (
              <View
                style={[
                  styles.notesCard,
                  {
                    backgroundColor: isDark ? colors.gray200 : colors.gray50,
                    borderColor: colors.gray200,
                  },
                ]}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
                  <Text
                    style={[
                      styles.notesTitle,
                      { color: colors.gray600 },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKuLanguage ? 'تێبینی و مەرجەکان:' : 'Notes & Terms:'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.notesText,
                    { color: colors.black, textAlign },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {quotation.notes}
                </Text>
              </View>
            ) : null}

            {/* ── Financial Totals Summary ── */}
            <View
              style={[
                styles.totalsCard,
                {
                  backgroundColor: isDark ? colors.gray200 : colors.gray50,
                  borderColor: colors.gray200,
                },
              ]}
            >
              {quotation.discountTotal > 0 && (
                <>
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={[
                        { fontSize: 12.5, color: colors.gray500 },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isKuLanguage ? 'کۆی سەرەتایی:' : 'Subtotal:'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.black, direction: 'ltr' }}>
                      {formatPrice(quotation.subtotal)}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={[
                        { fontSize: 12.5, color: '#10B981' },
                        isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT },
                      ]}
                    >
                      {isKuLanguage ? 'داشکاندن:' : 'Discount:'}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981', direction: 'ltr' }}>
                      −{formatPrice(quotation.discountTotal)}
                    </Text>
                  </View>
                </>
              )}

              <View
                style={[
                  styles.grandTotalRow,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    borderTopColor: isDark ? colors.gray300 : 'rgba(0,0,0,0.08)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.grandTotalLabel,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKuLanguage ? 'کۆی گشتی:' : 'Grand Total:'}
                </Text>
                <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                  <Text
                    style={[
                      styles.grandTotalPrimary,
                      { color: colors.black, direction: 'ltr' },
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {grandTotalPrimary}
                  </Text>
                  {grandTotalSecondary ? (
                    <Text style={[styles.grandTotalSecondary, { color: colors.success, direction: 'ltr' }]}>
                      {grandTotalSecondary}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* ── Modal Bottom Actions (Print & Close) ── */}
          <View
            style={[
              styles.modalActions,
              {
                borderTopColor: colors.gray200,
                backgroundColor: isDark ? colors.gray100 : colors.white,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            {/* Print / Share Button (Primary) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onShare(quotation)}
              disabled={isSharing}
              style={[
                styles.modalPrimaryBtn,
                {
                  backgroundColor: colors.primary,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <>
                  <Ionicons name="print" size={18} color="#0F172A" />
                  <Text
                    style={[
                      styles.modalPrimaryBtnText,
                      isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isKuLanguage ? 'هاوبەشکردن و چاپکردن' : 'Share & Print PDF'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Close Button (Secondary) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              style={[
                styles.modalSecondaryBtn,
                {
                  borderColor: isDark ? colors.gray300 : '#CBD5E1',
                  backgroundColor: isDark ? colors.gray200 : colors.white,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="close-circle-outline" size={17} color={colors.gray600} />
              <Text
                style={[
                  styles.modalSecondaryBtnText,
                  { color: colors.gray600 },
                  isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKuLanguage ? 'داخستن' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
  },
  previewNotice: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  noticeTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  noticeSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  statsCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  statPill: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  infoCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  clientLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  clientName: {
    fontSize: 15.5,
    fontWeight: '800',
    marginTop: 2,
  },
  clientSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  validityBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    marginLeft: 8,
  },
  validityLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 1,
  },
  validityValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  dateRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  sectionHeaderTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  itemCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itemCountText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  itemRow: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  indexBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemDiscountText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyItemsBox: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  totalsCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  grandTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  grandTotalPrimary: {
    fontSize: 18,
    fontWeight: '900',
  },
  grandTotalSecondary: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 2,
  },
  modalActions: {
    padding: 14,
    borderTopWidth: 1,
    gap: 10,
    alignItems: 'center',
  },
  modalPrimaryBtn: {
    flex: 1.8,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSecondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
