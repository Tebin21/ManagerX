import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Text } from '@/components/settings/SettingsText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { SettingsHeader as AppHeader } from '@/components/settings/SettingsHeader';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsBackground } from '@/components/settings/SettingsBackground';
import { useAppTheme } from '@/contexts/ThemeContext';
import {
  useSettingsStore,
  type ThermalReceiptWidth,
  type ThermalReceiptSettings,
  DEFAULT_THERMAL_RECEIPT_SETTINGS,
} from '@/store/settingsStore';
import { useBusinessStore } from '@/store/businessStore';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import { buildThermalReceiptHTML } from '@/lib/thermalReceiptTemplate';
import type { Sale } from '@/types/sales';

interface WidthOption {
  id: ThermalReceiptWidth;
  label: string;
  widthCm: string;
  desc: string;
}

const WIDTH_OPTIONS: WidthOption[] = [
  { id: '58mm', label: '58mm', widthCm: '5.8 cm', desc: 'وەصڵی بچووک (Mobile POS)' },
  { id: '80mm', label: '80mm', widthCm: '8.0 cm', desc: 'ستاندارد (Desktop POS)' },
  { id: '110mm', label: '110mm', widthCm: '11.0 cm', desc: 'وەصڵی پان (Wide Thermal)' },
];

export default function ReceiptCustomizationScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, contentContainerStyle } = useResponsive();
  const { width: windowWidth } = useWindowDimensions();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const business = useBusinessStore();

  const widthPreference = useSettingsStore((s) => s.thermalReceiptWidthPreference ?? '80mm');
  const setWidthPreference = useSettingsStore((s) => s.setThermalReceiptWidthPreference);
  const settings = useSettingsStore((s) => s.thermalReceiptSettings ?? DEFAULT_THERMAL_RECEIPT_SETTINGS);
  const updateSettings = useSettingsStore((s) => s.setThermalReceiptSettings);
  const resetSettings = useSettingsStore((s) => s.resetThermalReceiptSettings);

  const [activeWidth, setActiveWidth] = useState<ThermalReceiptWidth>(widthPreference);
  const [isPrintingTest, setIsPrintingTest] = useState(false);

  const handleSelectWidth = (w: ThermalReceiptWidth) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {}
    setActiveWidth(w);
    setWidthPreference(w);
  };

  const handleToggle = (key: keyof ThermalReceiptSettings) => {
    try { Haptics.selectionAsync().catch(() => {}); } catch {}
    updateSettings({ [key]: !settings[key] });
  };

  const handleReset = () => {
    Alert.alert(
      isKurdish ? 'گەڕاندنەوەی سەرەتایی' : 'Reset to Defaults',
      isKurdish
        ? 'ئایا دڵنیایت لە گەڕاندنەوەی سەرجەم ڕێکخستنەکانی پسوولە بۆ دۆخی بنەڕەتی؟'
        : 'Are you sure you want to restore receipt settings to default?',
      [
        { text: isKurdish ? 'پاشگەزبوونەوە' : 'Cancel', style: 'cancel' },
        {
          text: isKurdish ? 'بەڵێ، بگەڕێنەوە' : 'Reset',
          style: 'destructive',
          onPress: () => {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
            resetSettings();
          },
        },
      ]
    );
  };

  // Sample sale data for preview and test printing
  const mockSale: Sale = useMemo(() => ({
    id: 9999,
    invoiceNumber: 'F-00124',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    customerName: 'ئارام محەمەد',
    customerPhone: '0750 123 4567',
    customerAddress: 'سلێمانی - تووی مەلیك',
    subtotal: 4750,
    discountTotal: 750,
    globalDiscount: 0,
    grandTotal: 4000,
    paidAmount: 4000,
    remainingDebt: 0,
    paymentMethod: 'cash',
    notes: 'کاڵای فرۆشراو دەگۆڕدرێتەوە تا ٧ ڕۆژ بە مەرجی پێشکەشکردنی ئەم پسوولەیە.',
    warranty: 'گرەنتی ١ مانگ',
    items: [
      {
        id: 1,
        saleId: 9999,
        productId: 101,
        productName: 'کۆلا قتوو ٣٣٠مل',
        quantity: 2,
        sellingPrice: 500,
        discount: 0,
        lineTotal: 1000,
        itemId: 'COL-330',
      },
      {
        id: 2,
        saleId: 9999,
        productId: 102,
        productName: 'چپس دوریتۆس گەورە',
        quantity: 1,
        sellingPrice: 1500,
        discount: 0,
        lineTotal: 1500,
        itemId: 'DOR-BIG',
      },
      {
        id: 3,
        saleId: 9999,
        productId: 103,
        productName: 'شوکۆلاتە کیندەر بوێنۆ',
        quantity: 3,
        sellingPrice: 750,
        discount: 250,
        lineTotal: 1500,
        itemId: 'KIN-BUE',
      },
    ],
  } as Sale), []);

  const handleTestPrint = async () => {
    setIsPrintingTest(true);
    try {
      const { directPrintThermalInvoice } = await import('@/lib/generateInvoice');
      await directPrintThermalInvoice(
        mockSale,
        {
          name: business.name || 'مارکێتی فرۆشیار',
          phone: business.phone || '0770 000 0000',
          address: business.address || 'شەقامی سەرەکی، هەولێر',
          logoUri: business.logoUri ?? null,
        },
        activeWidth
      );
    } catch (err) {
      console.error('[ReceiptCustomization] Test print error:', err);
      Alert.alert(
        isKurdish ? 'هەڵە لە پرینت' : 'Print Error',
        isKurdish ? 'نەتوانرا وەسڵەکە چاپ بکرێت.' : 'Failed to print test receipt.'
      );
    } finally {
      setIsPrintingTest(false);
    }
  };

  // Preview dimensions based on active thermal width
  const previewCardWidth = activeWidth === '58mm'
    ? Math.min(270, windowWidth - 48)
    : activeWidth === '80mm'
    ? Math.min(320, windowWidth - 36)
    : Math.min(360, windowWidth - 28);

  const renderToggleRow = (
    key: keyof ThermalReceiptSettings,
    title: string,
    sub?: string,
    icon: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline'
  ) => {
    const isChecked = Boolean(settings[key]);
    return (
      <TouchableOpacity
        key={key}
        activeOpacity={0.7}
        onPress={() => handleToggle(key)}
        style={[styles.switchRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <View style={[styles.switchRowLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.switchRowIcon,
              {
                backgroundColor: isChecked
                  ? hexToRgba(colors.primary, isDark ? 0.25 : 0.14)
                  : (isDark ? 'rgba(255,255,255,0.06)' : colors.gray100),
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={18}
              color={isChecked ? colors.primary : colors.gray400}
            />
          </View>
          <View style={styles.switchRowTextCol}>
            <Text
              style={[
                styles.switchRowTitle,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {title}
            </Text>
            {sub ? (
              <Text
                style={[
                  styles.switchRowSub,
                  { color: colors.gray400, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {sub}
              </Text>
            ) : null}
          </View>
        </View>

        <Switch
          value={isChecked}
          onValueChange={() => handleToggle(key)}
          trackColor={{ false: isDark ? '#334155' : '#E2E8F0', true: colors.primary }}
          thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <SettingsBackground />
      <AppHeader
        title={isKurdish ? 'وەسڵی حەراری' : 'Thermal Receipt'}
        showBack
      />

      <ScrollView
        contentContainerStyle={[styles.content, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Paper Size Selector (58mm, 80mm, 110mm) ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="resize-outline" size={19} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'قەبارەی وەسڵ و کاغەز (Thermal Width)' : 'Thermal Paper Width'}
            </Text>
          </View>

          <View style={[styles.widthTabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {WIDTH_OPTIONS.map((opt) => {
              const isSelected = activeWidth === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectWidth(opt.id)}
                  style={[
                    styles.widthTab,
                    {
                      backgroundColor: isSelected
                        ? colors.primary + (isDark ? '25' : '15')
                        : (isDark ? 'rgba(255,255,255,0.05)' : colors.gray100),
                      borderColor: isSelected
                        ? colors.primary
                        : (isDark ? 'rgba(255,255,255,0.1)' : colors.gray200),
                    },
                  ]}
                >
                  {isSelected && (
                    <View style={[styles.activeCheckBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                    </View>
                  )}
                  <Text
                    style={[
                      styles.widthTabLabel,
                      { color: isSelected ? colors.primary : colors.black },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <View
                    style={[
                      styles.widthCmBadge,
                      {
                        backgroundColor: isSelected
                          ? colors.primary + '25'
                          : (isDark ? 'rgba(255,255,255,0.08)' : colors.gray200),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.widthCmBadgeText,
                        { color: isSelected ? colors.primary : colors.gray500 },
                      ]}
                    >
                      {opt.widthCm}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.widthTabDesc,
                      { color: isSelected ? colors.primary : colors.gray400 },
                      isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </SettingsCard>

        {/* ── 2. Live Receipt Preview (نموونەی ڕاستەوخۆ) ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="eye-outline" size={19} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.sectionHeading,
                  { color: colors.black, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKurdish ? 'پێشبینینی ڕاستەوخۆ (Live Preview)' : 'Live Receipt Preview'}
              </Text>
              <Text
                style={[
                  styles.sectionSub,
                  { color: colors.gray400, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isKurdish
                  ? `پیشاندانی شێوازی چاپکراو بە قەبارەی ${activeWidth}`
                  : `Visual representation at ${activeWidth}`}
              </Text>
            </View>
          </View>

          {/* Simulated Thermal Paper Card */}
          <View style={styles.previewCenterWrap}>
            <View
              style={[
                styles.thermalPaper,
                { width: previewCardWidth },
                isDark && styles.thermalPaperDarkShadow,
              ]}
            >
              {/* Paper Top Serrated Cut Mock */}
              <View style={styles.paperTopEdge} />

              {/* Store Header */}
              <View style={styles.receiptBizHeader}>
                <Text style={styles.receiptBizName}>
                  {business.name || 'مارکێتی فرۆشیار'}
                </Text>
                {settings.showBusinessAddress && (
                  <Text style={styles.receiptBizMeta}>
                    {business.address || 'شەقامی سەرەکی، هەولێر'}
                  </Text>
                )}
                {settings.showBusinessPhone && (
                  <Text style={styles.receiptBizMeta}>
                    {business.phone || '0770 000 0000'}
                  </Text>
                )}
              </View>

              {/* Dashed Separator */}
              <Text style={styles.dashedDivider} numberOfLines={1}>
                - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              </Text>

              {/* Metadata Info */}
              <View style={styles.receiptInfoSection}>
                {settings.showInvoiceNumber && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {isKurdish ? 'پسوولە:' : 'Receipt #:'}
                    </Text>
                    <Text style={styles.receiptValue}>#F-00124</Text>
                  </View>
                )}
                {settings.showDate && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {isKurdish ? 'بەروار:' : 'Date:'}
                    </Text>
                    <Text style={styles.receiptValue}>2026/10/29 - 02:45 PM</Text>
                  </View>
                )}
                {settings.showCustomerName && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {isKurdish ? 'کڕیار:' : 'Customer:'}
                    </Text>
                    <Text style={styles.receiptValue}>ئارام محەمەد</Text>
                  </View>
                )}
                {settings.showCustomerPhone && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {isKurdish ? 'مۆبایل:' : 'Phone:'}
                    </Text>
                    <Text style={styles.receiptValue}>0750 123 4567</Text>
                  </View>
                )}
              </View>

              {/* Dashed Separator */}
              <Text style={styles.dashedDivider} numberOfLines={1}>
                - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              </Text>

              {/* Items Section */}
              {activeWidth === '58mm' ? (
                /* 58mm 2-line layout */
                <View style={styles.items58List}>
                  {(mockSale.items || []).map((item, idx) => (
                    <View key={item.id} style={styles.item58Row}>
                      <View style={styles.item58Top}>
                        <Text style={styles.item58Name} numberOfLines={1}>
                          {idx + 1}. {item.productName}
                        </Text>
                        {settings.showItemBarcode && (
                          <Text style={styles.itemIdTag}>#{item.itemId}</Text>
                        )}
                      </View>
                      <View style={styles.item58Bottom}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          {settings.showQty && (
                            <Text style={styles.item58QtyPrice}>{item.quantity} × </Text>
                          )}
                          {settings.showItemPrice && (
                            settings.showDiscount && item.discount > 0 ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Text style={[styles.item58QtyPrice, { textDecorationLine: 'line-through', color: '#777777', fontSize: 10 }]}>
                                  {item.sellingPrice}
                                </Text>
                                <Text style={[styles.item58QtyPrice, { fontWeight: '700', color: '#000000' }]}>
                                  {item.sellingPrice - item.discount}
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.item58QtyPrice}>{item.sellingPrice}</Text>
                            )
                          )}
                        </View>
                        <Text style={styles.item58Total}>{item.lineTotal} IQD</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                /* 80mm & 110mm Column Table */
                <View style={styles.itemsTable}>
                  <View style={styles.itemsTableHeader}>
                    <Text style={[styles.colHeader, { flex: 2 }]}>
                      {isKurdish ? 'کاڵا' : 'Item'}
                    </Text>
                    {settings.showQty && (
                      <Text style={[styles.colHeader, styles.colCenter, { flex: 0.8 }]}>
                        {isKurdish ? 'بڕ' : 'Qty'}
                      </Text>
                    )}
                    {settings.showItemPrice && (
                      <Text style={[styles.colHeader, styles.colRight, { flex: 1.3 }]}>
                        {isKurdish ? 'نرخ' : 'Price'}
                      </Text>
                    )}
                    <Text style={[styles.colHeader, styles.colRight, { flex: 1.3 }]}>
                      {isKurdish ? 'کۆ' : 'Total'}
                    </Text>
                  </View>

                  {(mockSale.items || []).map((item, idx) => (
                    <View key={item.id} style={styles.itemsTableRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.tableItemName} numberOfLines={1}>
                          {idx + 1}. {item.productName}
                        </Text>
                        {settings.showItemBarcode && (
                          <Text style={styles.itemIdTag}>#{item.itemId}</Text>
                        )}
                      </View>
                      {settings.showQty && (
                        <Text style={[styles.tableItemCell, styles.colCenter, { flex: 0.8 }]}>
                          {item.quantity}
                        </Text>
                      )}
                      {settings.showItemPrice && (
                        <View style={{ flex: 1.3, justifyContent: 'center', alignItems: 'flex-end' }}>
                          {settings.showDiscount && item.discount > 0 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                              <Text style={[styles.tableItemCell, { textDecorationLine: 'line-through', color: '#777777', fontSize: 10.5 }]}>
                                {item.sellingPrice}
                              </Text>
                              <Text style={[styles.tableItemCell, { fontWeight: '800', color: '#000000' }]}>
                                {item.sellingPrice - item.discount}
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.tableItemCell, styles.colRight]}>
                              {item.sellingPrice}
                            </Text>
                          )}
                        </View>
                      )}
                      <Text style={[styles.tableItemCell, styles.colRight, { flex: 1.3, fontWeight: '700' }]}>
                        {item.lineTotal}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Dashed Separator */}
              <Text style={styles.dashedDivider} numberOfLines={1}>
                - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              </Text>

              {/* Totals Section */}
              <View style={styles.receiptTotalsSection}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{isKurdish ? 'کۆی کاڵاکان:' : 'Subtotal:'}</Text>
                  <Text style={styles.receiptValue}>4,750 IQD</Text>
                </View>

                {settings.showDiscount && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>{isKurdish ? 'داشکاندن:' : 'Discount:'}</Text>
                    <Text style={styles.receiptValue}>− 750 IQD</Text>
                  </View>
                )}

                {/* Grand Total Box */}
                <View style={styles.receiptGrandTotalBox}>
                  <Text style={styles.receiptGrandTotalLabel}>
                    {isKurdish ? 'کۆی گشتی:' : 'Total:'}
                  </Text>
                  <Text style={styles.receiptGrandTotalAmount}>4,000 IQD</Text>
                </View>

                {settings.showPaymentMethod && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {isKurdish ? 'شێوازی پارەدان:' : 'Payment:'}
                    </Text>
                    <Text style={styles.receiptValue}>{isKurdish ? 'کاش (Cash)' : 'Cash'}</Text>
                  </View>
                )}

                {settings.showRemainingDebt && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {isKurdish ? 'قەرزی ماوە:' : 'Remaining:'}
                    </Text>
                    <Text style={styles.receiptValue}>0 IQD</Text>
                  </View>
                )}
              </View>

              {/* Notes Box */}
              {settings.showNotes && (
                <View style={styles.receiptNotesBox}>
                  <Text style={styles.receiptNotesTitle}>
                    {isKurdish ? 'گرەنتی و تێبینی:' : 'Notes & Policy:'}
                  </Text>
                  <Text style={styles.receiptNotesText}>
                    کاڵای فرۆشراو دەگۆڕدرێتەوە تا ٧ ڕۆژ بە مەرجی پێشکەشکردنی ئەم پسوولەیە.
                  </Text>
                </View>
              )}

              {/* Footer Note */}
              {Boolean(settings.customFooterNote) && (
                <View style={styles.receiptFooterMsgWrap}>
                  <Text style={styles.receiptFooterMsg}>
                    {settings.customFooterNote}
                  </Text>
                </View>
              )}

              {/* Barcode Mock */}
              {settings.showFooterBarcode && (
                <View style={styles.receiptBarcodeWrap}>
                  <View style={styles.barcodeLinesMock}>
                    {Array.from({ length: 32 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.barcodeLine,
                          {
                            width: (i % 3 === 0 ? 3 : i % 2 === 0 ? 1.5 : 2),
                            marginRight: (i % 4 === 0 ? 2.5 : 1.2),
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.barcodeTextMock}>#F-00124</Text>
                </View>
              )}

              <Text style={styles.receiptBrand}>
                Froshiar POS • www.froshiar.store
              </Text>
            </View>
          </View>

          {/* Test Print Action Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTestPrint}
            disabled={isPrintingTest}
            style={[
              styles.testPrintBtn,
              { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons name="print-outline" size={18} color="#0F172A" />
            <Text
              style={[
                styles.testPrintBtnText,
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isPrintingTest
                ? (isKurdish ? 'لە چاپداندایە...' : 'Printing...')
                : (isKurdish ? 'تاقیکردنەوەی چاپی ئەم وەسڵە 🖨️' : 'Test Print This Receipt 🖨️')}
            </Text>
          </TouchableOpacity>
        </SettingsCard>

        {/* ── 3. Header Information Toggles ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'زانیاری سەرەوەی پسوولە' : 'Header Information'}
            </Text>
          </View>

          {renderToggleRow(
            'showCustomerName',
            isKurdish ? 'ناوی کڕیار' : 'Customer Name',
            isKurdish ? 'پیشاندانی ناوی کڕیار لە وەسڵدا (ئەگەر هەبێ)' : 'Show customer name when available',
            'person-outline'
          )}
          {renderToggleRow(
            'showCustomerPhone',
            isKurdish ? 'ژمارەی مۆبایلی کڕیار' : 'Customer Phone',
            isKurdish ? 'پیشاندانی ژمارەی مۆبایلی کڕیار' : 'Show customer phone number',
            'call-outline'
          )}
          {renderToggleRow(
            'showBusinessPhone',
            isKurdish ? 'تەلەفۆنی فرۆشگا' : 'Store Phone',
            isKurdish ? 'پیشاندانی ژمارەی دوکان لە سەری پسوولە' : 'Show business contact number',
            'business-outline'
          )}
          {renderToggleRow(
            'showBusinessAddress',
            isKurdish ? 'ناونیشانی فرۆشگا' : 'Store Address',
            isKurdish ? 'پیشاندانی ناونیشانی بازرگانی' : 'Show store address',
            'location-outline'
          )}
          {renderToggleRow(
            'showInvoiceNumber',
            isKurdish ? 'ژمارەی پسوولە (#)' : 'Invoice Number (#)',
            isKurdish ? 'پیشاندانی ژمارەی ناسێنەری پسوولە' : 'Show invoice identifier',
            'receipt-outline'
          )}
          {renderToggleRow(
            'showDate',
            isKurdish ? 'بەروار و کات' : 'Date & Time',
            isKurdish ? 'پیشاندانی کات و ڕۆژی فرۆشتن' : 'Show sales date and timestamp',
            'calendar-outline'
          )}
        </SettingsCard>

        {/* ── 4. Item Table Columns Toggles ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="list-outline" size={18} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'خشتە و بڕگەکانی کاڵا' : 'Items & Columns'}
            </Text>
          </View>

          {renderToggleRow(
            'showQty',
            isKurdish ? 'بڕ / ژمارەی دانە (Qty)' : 'Item Quantity (Qty)',
            isKurdish ? 'پیشاندانی ژمارەی دانەی فرۆشراو' : 'Show count of items sold',
            'layers-outline'
          )}
          {renderToggleRow(
            'showItemPrice',
            isKurdish ? 'نرخی تاک (Unit Price)' : 'Unit Price',
            isKurdish ? 'پیشاندانی نرخی یەک دانەی کاڵا' : 'Show single item price',
            'pricetag-outline'
          )}
          {renderToggleRow(
            'showDiscount',
            isKurdish ? 'داشکاندن (Discount)' : 'Discounts',
            isKurdish ? 'پیشاندانی داشکاندنی سەر کاڵا و کۆی گشتی' : 'Show item and cart discounts',
            'gift-outline'
          )}
          {renderToggleRow(
            'showItemBarcode',
            isKurdish ? 'بارکۆد یان کۆدی کاڵا' : 'Product ID / Barcode',
            isKurdish ? 'پیشاندانی کۆدی ناسێنەری کاڵاکان لە ژێر ناویاندا' : 'Show product barcode or custom ID',
            'barcode-outline'
          )}
        </SettingsCard>

        {/* ── 5. Financial & Payment Toggles ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="cash-outline" size={18} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'کۆی گشتی و پارەدان' : 'Totals & Payment'}
            </Text>
          </View>

          {renderToggleRow(
            'showPaymentMethod',
            isKurdish ? 'شێوازی پارەدان (کاش / قەرز)' : 'Payment Method',
            isKurdish ? 'پیشاندانی جۆری دانەوەی پارە لە خوارەوە' : 'Show Cash / Debt / FIB method',
            'wallet-outline'
          )}
          {renderToggleRow(
            'showRemainingDebt',
            isKurdish ? 'قەرزی ماوە' : 'Remaining Debt',
            isKurdish ? 'پیشاندانی بڕی قەرزی ماوە لە پسوولەی قەرزدا' : 'Show remaining balance on credit sales',
            'hourglass-outline'
          )}
        </SettingsCard>

        {/* ── 6. Footer Notes & Barcode ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'تێبینی و دەقی کۆتایی' : 'Footer & Policy'}
            </Text>
          </View>

          {renderToggleRow(
            'showNotes',
            isKurdish ? 'تێبینی و گرەنتی' : 'Notes & Warranty',
            isKurdish ? 'پیشاندانی تێبینی و مەرجەکانی فرۆشگا' : 'Show warranty and invoice notes',
            'shield-checkmark-outline'
          )}
          {renderToggleRow(
            'showFooterBarcode',
            isKurdish ? 'بارکۆدی پسوولە لە خوارەوە' : 'Invoice Barcode',
            isKurdish ? 'پیشاندانی هێڵی بارکۆد لە بنی پسوولەکە' : 'Show scannable invoice barcode at bottom',
            'barcode-outline'
          )}

          {/* Custom Footer Message Text Input */}
          <View style={styles.footerNoteInputWrap}>
            <Text
              style={[
                styles.footerNoteInputLabel,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'دەقی سوپاسگوزاری کۆتایی پسوولە:' : 'Custom Footer Message:'}
            </Text>
            <TextInput
              value={settings.customFooterNote}
              onChangeText={(text) => updateSettings({ customFooterNote: text })}
              placeholder={isKurdish ? 'سوپاس بۆ سەردانەکەتان...' : 'Thank you for your visit...'}
              placeholderTextColor={colors.gray400}
              style={[
                styles.footerTextInput,
                {
                  color: colors.black,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.gray100,
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : colors.gray200,
                  textAlign,
                },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
              ]}
              multiline
              numberOfLines={2}
            />
          </View>
        </SettingsCard>

        {/* ── 7. Reset to Defaults Button ── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleReset}
          style={[
            styles.resetBtn,
            { borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5' },
          ]}
        >
          <Ionicons name="refresh-outline" size={17} color={colors.error} />
          <Text
            style={[
              styles.resetBtnText,
              { color: colors.error },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {isKurdish ? 'گەڕاندنەوە بۆ دۆخی بنەڕەتی' : 'Restore Default Settings'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 14,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  widthTabsRow: {
    gap: 8,
  },
  widthTab: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 9,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 74,
  },
  activeCheckBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widthTabLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  widthCmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginVertical: 3,
  },
  widthCmBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  widthTabDesc: {
    fontSize: 9.5,
    textAlign: 'center',
  },

  /* ── Simulated Thermal Receipt Preview ── */
  previewCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  thermalPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  thermalPaperDarkShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  paperTopEdge: {
    height: 4,
    borderBottomWidth: 1,
    borderColor: '#CCCCCC',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  receiptBizHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  receiptBizName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
  },
  receiptBizMeta: {
    fontSize: 11,
    color: '#333333',
    textAlign: 'center',
    marginTop: 1,
  },
  dashedDivider: {
    color: '#666666',
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 1,
    marginVertical: 4,
  },
  receiptInfoSection: {
    gap: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 1.5,
  },
  receiptLabel: {
    fontSize: 11.5,
    color: '#444444',
    fontWeight: '600',
  },
  receiptValue: {
    fontSize: 11.5,
    color: '#000000',
    fontWeight: '700',
  },

  /* ── 58mm Layout in Preview ── */
  items58List: {
    gap: 6,
    marginVertical: 4,
  },
  item58Row: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 4,
  },
  item58Top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item58Name: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  item58Bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  item58QtyPrice: {
    fontSize: 11,
    color: '#555555',
  },
  item58Total: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#000000',
  },

  /* ── 80mm & 110mm Table in Preview ── */
  itemsTable: {
    marginVertical: 4,
  },
  itemsTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 3,
    marginBottom: 4,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  colCenter: {
    textAlign: 'center',
  },
  colRight: {
    textAlign: 'right',
  },
  itemsTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2.5,
  },
  tableItemName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#000000',
  },
  tableItemCell: {
    fontSize: 11.5,
    color: '#000000',
  },
  itemIdTag: {
    fontSize: 9.5,
    color: '#777777',
    marginTop: 1,
  },

  /* ── Totals in Preview ── */
  receiptTotalsSection: {
    gap: 2,
  },
  receiptGrandTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#000000',
    paddingVertical: 5,
    marginVertical: 4,
  },
  receiptGrandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  receiptGrandTotalAmount: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#000000',
  },
  receiptNotesBox: {
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 4,
    padding: 5,
    marginTop: 6,
  },
  receiptNotesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 2,
  },
  receiptNotesText: {
    fontSize: 10,
    color: '#333333',
    lineHeight: 13,
  },
  receiptFooterMsgWrap: {
    marginTop: 6,
    alignItems: 'center',
  },
  receiptFooterMsg: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  receiptBarcodeWrap: {
    alignItems: 'center',
    marginVertical: 6,
  },
  barcodeLinesMock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
  },
  barcodeLine: {
    height: '100%',
    backgroundColor: '#000000',
  },
  barcodeTextMock: {
    fontSize: 9,
    fontFamily: monospaceFont(),
    letterSpacing: 2,
    marginTop: 2,
    color: '#000000',
    fontWeight: '700',
  },
  receiptBrand: {
    fontSize: 8.5,
    color: '#888888',
    textAlign: 'center',
    marginTop: 4,
  },

  /* ── Test Print Button ── */
  testPrintBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testPrintBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* ── Switch Rows ── */
  switchRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  switchRowLeft: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  switchRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRowTextCol: {
    flex: 1,
  },
  switchRowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  switchRowSub: {
    fontSize: 11,
    marginTop: 1,
  },

  /* ── Footer Note Text Input ── */
  footerNoteInputWrap: {
    marginTop: 12,
    gap: 6,
  },
  footerNoteInputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  footerTextInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    minHeight: 54,
  },

  /* ── Reset Button ── */
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

function monospaceFont(): string {
  return Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'monospace',
  });
}
