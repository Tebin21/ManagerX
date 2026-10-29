import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import * as Haptics from 'expo-haptics';
import type { ReceiptCurrencyMode } from '@/lib/invoiceTemplate';
import { ReceiptCurrencySelector } from '@/components/shared/ReceiptCurrencySelector';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type CheckoutMode = 'normal' | 'print' | 'print58' | 'print80' | 'print110' | 'empty1' | 'empty2';

interface Props {
  mode: CheckoutMode;
  onSelectMode: (mode: CheckoutMode) => void;
  type?: 'sale' | 'purchase';
  receiptCurrency?: ReceiptCurrencyMode;
  onSelectReceiptCurrency?: (currency: ReceiptCurrencyMode) => void;
}

export function CheckoutActionGrid({
  mode,
  onSelectMode,
  type = 'sale',
  receiptCurrency,
  onSelectReceiptCurrency,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const currentLang = useLanguageStore((s) => s.language);
  const isKurdish = currentLang === 'ku';
  const isArabic = currentLang === 'ar';

  const isSale = type === 'sale';
  const isExpanded = useSettingsStore((s) => (isSale ? s.checkoutGridExpandedSale : s.checkoutGridExpandedPurchase));
  const setExpanded = useSettingsStore((s) => (isSale ? s.setCheckoutGridExpandedSale : s.setCheckoutGridExpandedPurchase));

  const toggleExpand = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {}
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!isExpanded);
  };

  const handlePress = (targetMode: CheckoutMode) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {}
    if (targetMode === 'empty1' || targetMode === 'empty2') {
      Alert.alert(
        isArabic ? 'خانة فارغة' : isKurdish ? 'بەشی بەتاڵ' : 'Empty Slot',
        isArabic
          ? 'هذا الزر فارغ حالياً وسيتم تخصيصه في تحديث قادم.'
          : isKurdish
          ? 'ئەم بەتنە لە ئێستادا بەتاڵە و لە نوێکردنەوەی داهاتوودا دیاری دەکرێت.'
          : 'This button is currently empty and will be configured in a future update.'
      );
      return;
    }
    onSelectMode(targetMode);
    // Persists open: do NOT auto-collapse. It only closes when the user taps the toggle button again.
  };

  const saleOptions: Array<{
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
      subtitle: isArabic ? 'بيع وحفظ سريع' : isKurdish ? 'فرۆشتن و گەڕانەوە' : 'Quick Sale',
      icon: 'flash-outline',
    },
    {
      id: 'print',
      title: isArabic ? 'طباعة A4' : isKurdish ? 'پرینت A4' : 'A4 Print',
      subtitle: isArabic ? 'طباعة وحفظ' : isKurdish ? 'چاپ و گەڕانەوە' : 'A4 Print & Return',
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

  const purchaseOptions: Array<{
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
      title: isArabic ? 'طباعة' : isKurdish ? 'پرینت' : 'Print',
      subtitle: isArabic ? 'طباعة وحفظ' : isKurdish ? 'چاپ و گەڕانەوە' : 'Print & Return',
      icon: 'print-outline',
    },
    {
      id: 'empty1',
      title: isArabic ? 'فارغ 1' : isKurdish ? 'بەتاڵ ١' : 'Empty 1',
      subtitle: isArabic ? 'فارغ' : isKurdish ? 'خاڵی' : 'Empty',
      icon: 'ellipsis-horizontal-circle-outline',
      isEmpty: true,
    },
    {
      id: 'empty2',
      title: isArabic ? 'فارغ 2' : isKurdish ? 'بەتاڵ ٢' : 'Empty 2',
      subtitle: isArabic ? 'فارغ' : isKurdish ? 'خاڵی' : 'Empty',
      icon: 'ellipsis-horizontal-circle-outline',
      isEmpty: true,
    },
  ];

  const options = isSale ? saleOptions : purchaseOptions;

  const currentActiveOption = options.find((o) => o.id === mode) || options[0];

  return (
    <View style={styles.container}>
      {/* Interactive Collapsible Header Button */}
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
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.black, textAlign },
              (isKurdish || isArabic) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
            ]}
          >
            {isArabic
              ? (isSale ? 'طريقة إتمام البيع' : 'طريقة إتمام الشراء')
              : isKurdish
              ? (isSale ? 'شێوازی تەواوکردنی فرۆشتن' : 'شێوازی تەواوکردنی کڕین')
              : (isSale ? 'Sale Completion Mode' : 'Purchase Completion Mode')}
          </Text>
        </View>

        <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Current Active Mode Badge */}
          <View
            style={[
              styles.activeModePill,
              {
                backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : '#FEF3C7',
                borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : '#FDE68A',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons
              name={currentActiveOption.icon}
              size={13}
              color={isDark ? '#FBBF24' : '#B45309'}
            />
            <Text
              style={[
                styles.activeModePillText,
                { color: isDark ? '#FBBF24' : '#B45309' },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {currentActiveOption.title}
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

      {/* Expanded Container (Shown only when expanded) */}
      {isExpanded && (
        <View style={styles.expandedWrapper}>
          {/* 4 Option Buttons Grid */}
          <View style={[styles.grid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {options.map((opt) => {
              const isSelected = mode === opt.id;
              const isSlotEmpty = Boolean(opt.isEmpty);
              const isFullWidth = Boolean(opt.fullWidth);

              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.75}
                  onPress={() => handlePress(opt.id)}
                  style={[
                    styles.card,
                    isFullWidth && styles.cardFullWidth,
                    {
                      backgroundColor: isSelected
                        ? colors.primary + (isDark ? '22' : '14')
                        : (isDark ? colors.gray100 : colors.white),
                      borderColor: isSelected
                        ? colors.primary
                        : (isSlotEmpty ? (isDark ? 'rgba(255,255,255,0.08)' : colors.gray200 + '80') : (isDark ? 'rgba(255,255,255,0.12)' : colors.gray200)),
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
                            styles.cardTitle,
                            {
                              color: isSelected ? colors.primary : (isSlotEmpty ? colors.gray400 : colors.black),
                              textAlign,
                            },
                            isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
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
                          styles.cardSubtitle,
                          { color: isSelected ? colors.primary + 'CC' : colors.gray400, textAlign },
                          isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
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

          {/* Embedded Receipt Currency Selector (پیشاندانی دراو لە وەسڵ) */}
          {receiptCurrency !== undefined && onSelectReceiptCurrency !== undefined && (
            <View style={styles.receiptCurrencyWrapper}>
              <ReceiptCurrencySelector
                value={receiptCurrency}
                onChange={onSelectReceiptCurrency}
                inner
                style={[
                  styles.innerReceiptCurrency,
                  {
                    backgroundColor: isDark ? '#1E293B' : colors.white,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 20,
  },
  expandedWrapper: {
    marginTop: 10,
    gap: 10,
  },
  receiptCurrencyWrapper: {
    marginTop: 2,
  },
  innerReceiptCurrency: {
    marginBottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
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
  headerRight: {
    alignItems: 'center',
    gap: 8,
  },
  activeModePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 5,
  },
  activeModePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  card: {
    width: '48.5%',
    borderRadius: 13,
    borderWidth: 1.5,
    padding: 10,
    minHeight: 62,
    justifyContent: 'center',
    position: 'relative',
  },
  cardFullWidth: {
    width: '100%',
  },
  dimBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  dimBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconRow: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 10.5,
    fontWeight: '500',
  },
});
