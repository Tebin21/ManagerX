import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { AppTextInput } from '@/components/ui/AppTextInput';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import * as Haptics from 'expo-haptics';
import { ReceiptCurrencySelector } from '@/components/shared/ReceiptCurrencySelector';
import type { PurchasePaymentStatus } from '@/types/purchases';
import type { ReceiptCurrencyMode } from '@/lib/invoiceTemplate';
import type { CheckoutMode } from '@/components/shared/CheckoutActionGrid';
import { toEnglishDigits, sanitizeNumericInput } from '@/utils/formatters';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  paymentStatus: PurchasePaymentStatus;
  onSelectPaymentStatus: (status: PurchasePaymentStatus) => void;

  amountPaid: string;
  onChangeAmountPaid: (val: string) => void;
  onEndEditingAmountPaid: () => void;
  maxDownPayment: number;
  maxDownPaymentDisplay: string;
  isPaidExceeded: boolean;
  initialPaymentMethod: 'cash' | 'fib';
  onSelectInitialPaymentMethod: (method: 'cash' | 'fib') => void;
  rawPaidNum: number;
  remainingDebt: number;
  isUSD: boolean;

  receiptCurrency: ReceiptCurrencyMode;
  onSelectReceiptCurrency: (currency: ReceiptCurrencyMode) => void;

  isCapitalEnabled: boolean;
  drawerBalance: number | null;
  isInsufficientCash: boolean;
  cashNeeded: number;
  projectedBalance: number;

  checkoutMode: CheckoutMode;
  onSelectCheckoutMode: (mode: CheckoutMode) => void;
}

export function PurchasePaymentOptionsAccordion({
  paymentStatus,
  onSelectPaymentStatus,
  amountPaid,
  onChangeAmountPaid,
  onEndEditingAmountPaid,
  maxDownPayment,
  maxDownPaymentDisplay,
  isPaidExceeded,
  initialPaymentMethod,
  onSelectInitialPaymentMethod,
  rawPaidNum,
  remainingDebt,
  isUSD,
  receiptCurrency,
  onSelectReceiptCurrency,
  isCapitalEnabled,
  drawerBalance,
  isInsufficientCash,
  cashNeeded,
  projectedBalance,
  checkoutMode,
  onSelectCheckoutMode,
}: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const currentLang = useLanguageStore((s) => s.language);
  const isKurdish = currentLang === 'ku';
  const isArabic = currentLang === 'ar';

  const isExpanded = useSettingsStore((s) => s.checkoutGridExpandedPurchase);
  const setExpanded = useSettingsStore((s) => s.setCheckoutGridExpandedPurchase);

  const toggleExpand = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!isExpanded);
  };

  const handleCheckoutModePress = (targetMode: CheckoutMode) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    onSelectCheckoutMode(targetMode);
    // Stays open intentionally — user must collapse it when desired
  };

  const checkoutOptions: Array<{
    id: CheckoutMode;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    isEmpty?: boolean;
    fullWidth?: boolean;
    badge?: string;
  }> = [
    {
      id: 'normal',
      title: isArabic ? 'عادي' : isKurdish ? 'ئاسایی' : 'Normal',
      subtitle: isArabic ? 'شراء وحفظ سريع' : isKurdish ? 'کڕین و گەڕانەوە' : 'Quick Purchase',
      icon: 'flash-outline',
    },
    {
      id: 'print',
      title: isArabic ? 'طباعة A4' : isKurdish ? 'پرینت A4' : 'A4 Print',
      subtitle: isArabic ? 'طباعة وحفظ' : isKurdish ? 'چاپ و گەڕانەوە' : 'Print & Return',
      icon: 'document-text-outline',
    },
    {
      id: 'print58',
      title: '58mm',
      subtitle: isArabic ? '5.8 سم • إيصال صغير' : isKurdish ? '5.8 cm • وەصڵی بچووک' : '5.8 cm Thermal',
      icon: 'receipt-outline',
      badge: '5.8 cm',
    },
    {
      id: 'print80',
      title: '80mm',
      subtitle: isArabic ? '8.0 سم • قياسي' : isKurdish ? '8.0 cm • ستاندارد' : '8.0 cm Standard',
      icon: 'receipt-outline',
      badge: '8.0 cm',
    },
    {
      id: 'print110',
      title: '110mm',
      subtitle: isArabic ? '11.0 سم • إيصال عريض' : isKurdish ? '11.0 cm • وەصڵی پان' : '11.0 cm Wide Thermal',
      icon: 'receipt-outline',
      fullWidth: true,
      badge: '11.0 cm',
    },
  ];

  return (
    <View style={styles.container}>
      {/* ── Interactive Collapsible Header Button ── */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggleExpand}
        style={[
          styles.headerButton,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            backgroundColor: isDark ? '#1E293B' : colors.white,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
        <View style={[styles.headerLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.headerIconBox,
              { backgroundColor: hexToRgba(colors.primary, isDark ? 0.22 : 0.12) },
            ]}
          >
            <Ionicons name="options-outline" size={17} color={colors.primary} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.black, textAlign },
                (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
              numberOfLines={1}
            >
              {isArabic ? 'خيارات الدفع وإتمام الشراء' : isKurdish ? 'شێوازی پارەدان و تەواوکردنی کڕین' : 'Payment & Checkout Options'}
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: colors.gray400, textAlign },
                (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
              numberOfLines={1}
            >
              {isArabic ? 'الدفع، العملة، الصندوق وطريقة الشراء' : isKurdish ? 'پارەدان، دراوی وەسڵ، دەخیلە و شێوازی کڕین' : 'Payment, currency, drawer & checkout mode'}
            </Text>
          </View>
        </View>

        <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Active Payment Status Pill */}
          <View
            style={[
              styles.activePill,
              {
                backgroundColor:
                  paymentStatus === 'paid'
                    ? (isDark ? hexToRgba(colors.success, 0.2) : '#DCFCE7')
                    : paymentStatus === 'fib'
                    ? (isDark ? hexToRgba('#3B82F6', 0.22) : '#DBEAFE')
                    : (isDark ? hexToRgba(colors.error, 0.2) : '#FEE2E2'),
                borderColor:
                  paymentStatus === 'paid'
                    ? colors.success
                    : paymentStatus === 'fib'
                    ? '#3B82F6'
                    : colors.error,
              },
            ]}
          >
            <Ionicons
              name={
                paymentStatus === 'paid'
                  ? 'checkmark-circle'
                  : paymentStatus === 'fib'
                  ? 'phone-portrait'
                  : 'alert-circle'
              }
              size={11}
              color={
                paymentStatus === 'paid'
                  ? colors.success
                  : paymentStatus === 'fib'
                  ? (isDark ? '#60A5FA' : '#1D4ED8')
                  : colors.error
              }
            />
            <Text
              style={[
                styles.activePillText,
                {
                  color:
                    paymentStatus === 'paid'
                      ? colors.success
                      : paymentStatus === 'fib'
                      ? (isDark ? '#60A5FA' : '#1D4ED8')
                      : colors.error,
                },
                (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {paymentStatus === 'paid' ? t('purchases.paid') : paymentStatus === 'fib' ? 'FIB' : t('purchases.debt')}
            </Text>
          </View>

          {/* Active Currency Pill */}
          <View
            style={[
              styles.activePill,
              {
                backgroundColor: isDark ? hexToRgba(colors.primary, 0.18) : '#FEF3C7',
                borderColor: isDark ? hexToRgba(colors.primary, 0.4) : '#FDE68A',
              },
            ]}
          >
            <Text
              style={[
                styles.activePillText,
                { color: isDark ? '#FBBF24' : '#B45309' },
                (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {receiptCurrency === 'iqd' ? (isArabic ? 'دينار' : 'دینار') : receiptCurrency === 'usd' ? (isArabic ? 'دولار' : 'دۆلار') : (isArabic ? 'دينار + دولار' : 'دینار+دۆلار')}
            </Text>
          </View>

          {/* Active Checkout Mode Pill */}
          <View
            style={[
              styles.activePill,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.gray100,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : colors.gray200,
              },
            ]}
          >
            <Ionicons
              name={checkoutMode.startsWith('print') ? 'print-outline' : 'flash-outline'}
              size={11}
              color={colors.primary}
            />
            <Text
              style={[
                styles.activePillText,
                { color: colors.black },
                (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {checkoutMode === 'print'
                ? (isArabic ? 'طباعة A4' : isKurdish ? 'پرینت A4' : 'A4 Print')
                : checkoutMode === 'print58'
                ? '58mm'
                : checkoutMode === 'print80'
                ? '80mm'
                : checkoutMode === 'print110'
                ? '110mm'
                : (isArabic ? 'عادي' : isKurdish ? 'ئاسایی' : 'Normal')}
            </Text>
          </View>

          {/* Expand/Collapse Chevron Indicator */}
          <View
            style={[
              styles.chevronCircle,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.gray100 },
            ]}
          >
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.primary}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Collapsible Body (Rendered when expanded) ── */}
      {isExpanded && (
        <View
          style={[
            styles.expandedContainer,
            {
              backgroundColor: isDark ? '#141E33' : '#F8FAFC',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 1. Payment Status (دۆخی پارەدان)                           */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <View style={styles.subSectionHeaderRow}>
            <Ionicons name="card-outline" size={15} color={colors.primary} />
            <Text
              style={[
                styles.subSectionTitle,
                { color: colors.gray600, textAlign },
                (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {t('purchases.paymentStatus')}
            </Text>
          </View>

          <View style={[styles.paymentRow, { flexDirection }]}>
            {/* Paid Button */}
            <TouchableOpacity
              style={[
                styles.payBtn,
                paymentStatus === 'paid'
                  ? (isDark
                      ? { backgroundColor: hexToRgba(colors.success, 0.18), borderColor: colors.success }
                      : styles.payBtnPaid)
                  : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.white },
                { flexDirection },
              ]}
              onPress={() => onSelectPaymentStatus('paid')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={paymentStatus === 'paid' ? colors.success : colors.gray400}
              />
              <Text
                style={[
                  styles.payBtnText,
                  { color: paymentStatus === 'paid' ? colors.success : colors.gray500 },
                  (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {t('purchases.paid')}
              </Text>
            </TouchableOpacity>

            {/* FIB Button */}
            <TouchableOpacity
              style={[
                styles.payBtn,
                paymentStatus === 'fib'
                  ? (isDark
                      ? { backgroundColor: hexToRgba('#3B82F6', 0.2), borderColor: '#60A5FA' }
                      : styles.payBtnFib)
                  : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.white },
                { flexDirection },
              ]}
              onPress={() => onSelectPaymentStatus('fib')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="phone-portrait"
                size={17}
                color={paymentStatus === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray400}
              />
              <Text
                style={[
                  styles.payBtnText,
                  { color: paymentStatus === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray500 },
                  (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {t('purchases.fib', 'FIB')}
              </Text>
            </TouchableOpacity>

            {/* Debt Button */}
            <TouchableOpacity
              style={[
                styles.payBtn,
                paymentStatus === 'debt'
                  ? (isDark
                      ? { backgroundColor: hexToRgba(colors.error, 0.18), borderColor: colors.error }
                      : styles.payBtnDebt)
                  : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.white },
                { flexDirection },
              ]}
              onPress={() => onSelectPaymentStatus('debt')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="alert-circle"
                size={18}
                color={paymentStatus === 'debt' ? colors.error : colors.gray400}
              />
              <Text
                style={[
                  styles.payBtnText,
                  { color: paymentStatus === 'debt' ? colors.error : colors.gray500 },
                  (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {t('purchases.debt')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conditional Debt Options */}
          {paymentStatus === 'debt' && (
            <View style={styles.debtSection}>
              <AppTextInput
                label={`${t('purchases.amountPaid')} (${isUSD ? 'USD' : 'IQD'})`}
                value={toEnglishDigits(amountPaid)}
                onChangeText={(v) => onChangeAmountPaid(sanitizeNumericInput(v, 'decimal-pad'))}
                onEndEditing={onEndEditingAmountPaid}
                keyboardType="decimal-pad"
                placeholder={isUSD ? '0.00' : '0'}
                returnKeyType="done"
                forceLatin
                error={isPaidExceeded ? t('purchases.downPaymentMustBeLess') : undefined}
              />
              <Text
                style={[
                  {
                    fontSize: 12,
                    color: colors.gray400,
                    marginTop: 4,
                    marginBottom: 8,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                  (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {t('purchases.maxDownPayment')} {maxDownPaymentDisplay}
              </Text>

              {rawPaidNum > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { color: colors.gray500, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' },
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {t('purchases.downPaymentMethod', 'شێوازی پارەدانی پێشەکی')}
                  </Text>
                  <View style={[styles.paymentRow, { flexDirection, gap: 8 }]}>
                    <TouchableOpacity
                      style={[
                        styles.payBtn,
                        initialPaymentMethod === 'cash'
                          ? (isDark
                              ? { backgroundColor: hexToRgba(colors.success, 0.18), borderColor: colors.success }
                              : styles.payBtnPaid)
                          : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.white },
                        { flexDirection, flex: 1, paddingVertical: 10 },
                      ]}
                      onPress={() => onSelectInitialPaymentMethod('cash')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={17}
                        color={initialPaymentMethod === 'cash' ? colors.success : colors.gray400}
                      />
                      <Text
                        style={[
                          styles.payBtnText,
                          { color: initialPaymentMethod === 'cash' ? colors.success : colors.gray500 },
                          (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {t('purchases.cash', 'کاش')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.payBtn,
                        initialPaymentMethod === 'fib'
                          ? (isDark
                              ? { backgroundColor: hexToRgba('#3B82F6', 0.2), borderColor: '#60A5FA' }
                              : styles.payBtnFib)
                          : { borderColor: colors.gray200, backgroundColor: isDark ? colors.gray100 : colors.white },
                        { flexDirection, flex: 1, paddingVertical: 10 },
                      ]}
                      onPress={() => onSelectInitialPaymentMethod('fib')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="phone-portrait"
                        size={16}
                        color={initialPaymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray400}
                      />
                      <Text
                        style={[
                          styles.payBtnText,
                          { color: initialPaymentMethod === 'fib' ? (isDark ? '#60A5FA' : '#1D4ED8') : colors.gray500 },
                          (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {t('purchases.fib', 'FIB')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View
                style={[
                  styles.totalBox,
                  {
                    backgroundColor: isDark ? hexToRgba(colors.error, 0.15) : '#FEF2F2',
                    borderColor: isDark ? hexToRgba(colors.error, 0.35) : '#FECACA',
                    flexDirection,
                    marginBottom: 12,
                  },
                ]}
              >
                <Text style={[styles.totalLabel, { color: colors.gray500 }]}>{t('purchases.remainingDebt')}</Text>
                <AmountText value={remainingDebt} style={[styles.totalValue, { color: colors.error }]} />
              </View>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 2. Receipt Currency (پیشاندانی دراو لە وەسڵ)               */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <ReceiptCurrencySelector
            value={receiptCurrency}
            onChange={onSelectReceiptCurrency}
            inner
            style={{ marginBottom: 14 }}
          />

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 3. Cash Drawer Live Indicator (دۆخی دەخیلە بۆ ئەم کڕینە)   */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {isCapitalEnabled && drawerBalance !== null && (
            <View
              style={[
                styles.drawerCardInner,
                {
                  borderColor: isInsufficientCash ? colors.error : colors.primary + '35',
                  backgroundColor: isDark ? colors.white : colors.gray50,
                  marginBottom: 14,
                },
              ]}
            >
              <View style={[styles.drawerCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.drawerCardTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View
                    style={[
                      styles.drawerIconBox,
                      { backgroundColor: (isInsufficientCash ? colors.error : colors.primary) + (isDark ? '24' : '18') },
                    ]}
                  >
                    <Ionicons
                      name="wallet"
                      size={18}
                      color={isInsufficientCash ? colors.error : colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.drawerCardTitle,
                      { color: colors.black, textAlign },
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {t('capital.drawerStatusTitle')}
                  </Text>
                </View>

                <View
                  style={[
                    styles.drawerActivePill,
                    { backgroundColor: (isInsufficientCash ? colors.error : colors.primary) + (isDark ? '24' : '14') },
                  ]}
                >
                  <Text
                    style={[
                      styles.drawerActivePillText,
                      { color: isInsufficientCash ? colors.error : colors.primary },
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {isInsufficientCash ? t('common.error') : t('capital.statusActive')}
                  </Text>
                </View>
              </View>

              {/* 3 Metric Rows */}
              <View style={styles.drawerMetricsContainer}>
                {/* Available Balance Now */}
                <View
                  style={[
                    styles.drawerMetricRow,
                    {
                      backgroundColor: isDark ? colors.white : colors.white,
                      borderColor: colors.gray200,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <View style={[styles.drawerMetricLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.drawerMetricIconCircle, { backgroundColor: colors.softBlue }]}>
                      <Ionicons name="wallet-outline" size={16} color={colors.primary} />
                    </View>
                    <Text
                      style={[
                        styles.drawerMetricRowLabel,
                        { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' },
                        (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {t('capital.drawerBalanceNow')}
                    </Text>
                  </View>
                  <AmountText
                    value={drawerBalance}
                    currency="IQD"
                    style={[styles.drawerMetricRowVal, { color: colors.black }]}
                  />
                </View>

                {/* Cash Needed for this purchase */}
                <View
                  style={[
                    styles.drawerMetricRow,
                    {
                      backgroundColor: isDark ? colors.white : colors.white,
                      borderColor: colors.gray200,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <View style={[styles.drawerMetricLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View
                      style={[
                        styles.drawerMetricIconCircle,
                        {
                          backgroundColor: isInsufficientCash
                            ? (isDark ? hexToRgba(colors.error, 0.18) : '#FEE2E2')
                            : (isDark ? hexToRgba(colors.warning, 0.18) : '#FEF3C7'),
                        },
                      ]}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={16}
                        color={isInsufficientCash ? colors.error : colors.warning}
                      />
                    </View>
                    <Text
                      style={[
                        styles.drawerMetricRowLabel,
                        { color: colors.gray500, textAlign: isRTL ? 'right' : 'left' },
                        (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {t('capital.drawerCashNeeded')}
                    </Text>
                  </View>
                  <AmountText
                    value={cashNeeded}
                    currency="IQD"
                    style={[
                      styles.drawerMetricRowVal,
                      { color: isInsufficientCash ? colors.error : colors.warning },
                    ]}
                  />
                </View>

                {/* Projected Balance After Purchase */}
                <View
                  style={[
                    styles.drawerMetricRowHighlight,
                    {
                      backgroundColor: isInsufficientCash
                        ? (isDark ? hexToRgba(colors.error, 0.15) : '#FEF2F2')
                        : (isDark ? hexToRgba(colors.success, 0.15) : '#F0FDF4'),
                      borderColor: isInsufficientCash
                        ? (isDark ? hexToRgba(colors.error, 0.5) : '#FECACA')
                        : (isDark ? hexToRgba(colors.success, 0.5) : '#BBF7D0'),
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <View style={[styles.drawerMetricLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View
                      style={[
                        styles.drawerMetricIconCircle,
                        {
                          backgroundColor: isInsufficientCash
                            ? (isDark ? hexToRgba(colors.error, 0.25) : '#FEE2E2')
                            : (isDark ? hexToRgba(colors.success, 0.25) : '#DCFCE7'),
                        },
                      ]}
                    >
                      <Ionicons
                        name={isInsufficientCash ? 'alert-circle-outline' : 'shield-checkmark-outline'}
                        size={17}
                        color={isInsufficientCash ? colors.error : colors.success}
                      />
                    </View>
                    <Text
                      style={[
                        styles.drawerMetricRowLabel,
                        {
                          color: isInsufficientCash ? colors.error : colors.success,
                          textAlign: isRTL ? 'right' : 'left',
                        },
                        (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {t('capital.drawerBalanceAfter')}
                    </Text>
                  </View>
                  <AmountText
                    value={projectedBalance}
                    currency="IQD"
                    variant="default"
                    style={[
                      styles.drawerMetricRowValBold,
                      { color: isInsufficientCash ? colors.error : colors.success },
                    ]}
                  />
                </View>
              </View>

              {/* Insufficient Warning Banner */}
              {isInsufficientCash && (
                <View
                  style={[
                    styles.drawerWarningBanner,
                    {
                      backgroundColor: isDark ? hexToRgba(colors.error, 0.15) : '#FEF2F2',
                      borderColor: isDark ? hexToRgba(colors.error, 0.35) : '#FECACA',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                  <Text
                    style={[
                      styles.drawerWarningText,
                      { color: colors.error, textAlign },
                      (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                    ]}
                  >
                    {t('capital.insufficientBanner')}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 4. Checkout Mode 4-Grid (شێوازی تەواوکردنی کڕین)           */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <View style={styles.subSectionHeaderRow}>
            <Ionicons name="flash-outline" size={15} color={colors.primary} />
            <Text
              style={[
                styles.subSectionTitle,
                { color: colors.gray600, textAlign },
                (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isArabic ? 'طريقة إتمام الشراء' : isKurdish ? 'شێوازی تەواوکردنی کڕین' : 'Purchase Completion Mode'}
            </Text>
          </View>

          <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {checkoutOptions.map((opt) => {
              const isSelected = checkoutMode === opt.id;
              const isSlotEmpty = Boolean(opt.isEmpty);
              const isFullWidth = Boolean(opt.fullWidth);

              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.75}
                  onPress={() => handleCheckoutModePress(opt.id)}
                  style={[
                    styles.modeCard,
                    isFullWidth && styles.modeCardFullWidth,
                    {
                      backgroundColor: isSelected
                        ? colors.primary + (isDark ? '22' : '14')
                        : (isDark ? colors.gray100 : colors.white),
                      borderColor: isSelected
                        ? colors.primary
                        : isSlotEmpty
                        ? (isDark ? 'rgba(255,255,255,0.08)' : colors.gray200 + '80')
                        : (isDark ? 'rgba(255,255,255,0.12)' : colors.gray200),
                      borderStyle: isSlotEmpty ? 'dashed' : 'solid',
                      opacity: isSlotEmpty ? 0.65 : 1,
                    },
                  ]}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  )}

                  <View style={[styles.iconRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: isSelected
                            ? colors.primary + '25'
                            : (isDark ? colors.gray200 : colors.gray100),
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={isSelected ? colors.primary : (isSlotEmpty ? colors.gray400 : colors.gray600)}
                      />
                    </View>

                    <View style={styles.textCol}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.modeCardTitle,
                            {
                              color: isSelected ? colors.primary : (isSlotEmpty ? colors.gray400 : colors.black),
                              textAlign,
                            },
                            (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                          ]}
                          numberOfLines={1}
                        >
                          {opt.title}
                        </Text>
                        {opt.badge ? (
                          <View
                            style={[
                              styles.dimBadge,
                              {
                                backgroundColor: isSelected
                                  ? colors.primary + '25'
                                  : (isDark ? 'rgba(255,255,255,0.08)' : colors.gray200),
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dimBadgeText,
                                { color: isSelected ? colors.primary : colors.gray500 },
                              ]}
                            >
                              {opt.badge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.modeCardSubtitle,
                          { color: isSelected ? colors.primary + 'CC' : colors.gray400, textAlign },
                          (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT },
                        ]}
                        numberOfLines={1}
                      >
                        {opt.subtitle}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 6,
  },
  headerButton: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  headerLeft: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'center',
    gap: 6,
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContainer: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  subSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentRow: {
    gap: 8,
    marginBottom: 10,
  },
  payBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  payBtnPaid: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  payBtnFib: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  payBtnDebt: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  payBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  debtSection: {
    marginBottom: 6,
  },
  totalBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  drawerCardInner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  drawerCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  drawerCardTitleGroup: {
    alignItems: 'center',
    gap: 6,
  },
  drawerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  drawerActivePill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  drawerActivePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  drawerMetricsContainer: {
    gap: 6,
  },
  drawerMetricRow: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerMetricRowHighlight: {
    borderWidth: 1.5,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerMetricLabelGroup: {
    alignItems: 'center',
    gap: 6,
  },
  drawerMetricIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerMetricRowLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  drawerMetricRowVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  drawerMetricRowValBold: {
    fontSize: 13,
    fontWeight: '800',
  },
  drawerWarningBanner: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  drawerWarningText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  grid: {
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modeCard: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 9,
    minHeight: 58,
    justifyContent: 'center',
    position: 'relative',
  },
  modeCardFullWidth: {
    width: '100%',
  },
  dimBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  dimBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Inter_600SemiBold',
  },
  checkBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconRow: {
    alignItems: 'center',
    gap: 7,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  modeCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 1,
  },
  modeCardSubtitle: {
    fontSize: 10,
    fontWeight: '500',
  },
});
