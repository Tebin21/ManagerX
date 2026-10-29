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
  type ReceiptPaperSize,
  type ThermalReceiptWidth,
  type SalesReceiptSettings,
  type PurchaseReceiptSettings,
  type QuotationReceiptSettings,
  type InventoryReceiptSettings,
  DEFAULT_SALES_RECEIPT_SETTINGS,
  DEFAULT_PURCHASE_RECEIPT_SETTINGS,
  DEFAULT_QUOTATION_RECEIPT_SETTINGS,
  DEFAULT_INVENTORY_RECEIPT_SETTINGS,
} from '@/store/settingsStore';
import { useBusinessStore } from '@/store/businessStore';
import { useLanguageStore } from '@/store/languageStore';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import type { Sale } from '@/types/sales';

type ModuleTab = 'sales' | 'purchases' | 'quotation' | 'inventory';

interface PaperOption {
  id: ReceiptPaperSize;
  label: string;
  widthCm: string;
  desc: string;
}

const PAPER_OPTIONS: PaperOption[] = [
  { id: '58mm', label: '58mm', widthCm: '5.8 cm', desc: 'وەصڵی بچووک (Mobile POS)' },
  { id: '80mm', label: '80mm', widthCm: '8.0 cm', desc: 'ستاندارد (Desktop POS)' },
  { id: '110mm', label: '110mm', widthCm: '11.0 cm', desc: 'وەصڵی پان (Wide Thermal)' },
  { id: 'A4', label: 'A4 Sheet', widthCm: '21 × 29.7 cm', desc: 'پەڕەی فەرمی (Standard A4)' },
];

export default function ReceiptCustomizationScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, contentContainerStyle } = useResponsive();
  const { width: windowWidth } = useWindowDimensions();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const business = useBusinessStore();

  const [activeTab, setActiveTab] = useState<ModuleTab>('sales');

  // Store bindings
  const salesPaperSize = useSettingsStore((s) => s.salesPaperSizePreference ?? '80mm');
  const purchasePaperSize = useSettingsStore((s) => s.purchasePaperSizePreference ?? '80mm');
  const inventoryPaperSize = useSettingsStore((s) => s.inventoryPaperSizePreference ?? 'A4');
  const quotationPaperSize = useSettingsStore((s) => s.quotationPaperSizePreference ?? 'A4');

  const setSalesPaperSize = useSettingsStore((s) => s.setSalesPaperSizePreference);
  const setPurchasePaperSize = useSettingsStore((s) => s.setPurchasePaperSizePreference);
  const setInventoryPaperSize = useSettingsStore((s) => s.setInventoryPaperSizePreference);

  const salesSettings = useSettingsStore((s) => s.salesReceiptSettings ?? DEFAULT_SALES_RECEIPT_SETTINGS);
  const purchaseSettings = useSettingsStore((s) => s.purchaseReceiptSettings ?? DEFAULT_PURCHASE_RECEIPT_SETTINGS);
  const quotationSettings = useSettingsStore((s) => s.quotationReceiptSettings ?? DEFAULT_QUOTATION_RECEIPT_SETTINGS);
  const inventorySettings = useSettingsStore((s) => s.inventoryReceiptSettings ?? DEFAULT_INVENTORY_RECEIPT_SETTINGS);

  const updateSalesSettings = useSettingsStore((s) => s.setSalesReceiptSettings);
  const updatePurchaseSettings = useSettingsStore((s) => s.setPurchaseReceiptSettings);
  const updateQuotationSettings = useSettingsStore((s) => s.setQuotationReceiptSettings);
  const updateInventorySettings = useSettingsStore((s) => s.setInventoryReceiptSettings);

  const resetSalesSettings = useSettingsStore((s) => s.resetSalesReceiptSettings);
  const resetPurchaseSettings = useSettingsStore((s) => s.resetPurchaseReceiptSettings);
  const resetQuotationSettings = useSettingsStore((s) => s.resetQuotationReceiptSettings);
  const resetInventorySettings = useSettingsStore((s) => s.resetInventoryReceiptSettings);

  const [isPrintingTest, setIsPrintingTest] = useState(false);

  // Active paper size based on tab
  const activePaperSize: ReceiptPaperSize = useMemo(() => {
    switch (activeTab) {
      case 'sales': return salesPaperSize;
      case 'purchases': return purchasePaperSize;
      case 'inventory': return inventoryPaperSize;
      case 'quotation': return 'A4';
    }
  }, [activeTab, salesPaperSize, purchasePaperSize, inventoryPaperSize]);

  const handleSelectPaperSize = (size: ReceiptPaperSize) => {
    if (activeTab === 'quotation') return; // Quotation is strictly A4
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch {}
    if (activeTab === 'sales') setSalesPaperSize(size);
    else if (activeTab === 'purchases') setPurchasePaperSize(size);
    else if (activeTab === 'inventory') setInventoryPaperSize(size);
  };

  const handleSwitchTab = (tab: ModuleTab) => {
    try { Haptics.selectionAsync().catch(() => {}); } catch {}
    setActiveTab(tab);
  };

  const handleResetCurrentModule = () => {
    const tabName = activeTab === 'sales'
      ? (isKurdish ? 'فرۆشتن' : 'Sales')
      : activeTab === 'purchases'
      ? (isKurdish ? 'کڕین' : 'Purchases')
      : activeTab === 'quotation'
      ? (isKurdish ? 'عەرز' : 'Quotations')
      : (isKurdish ? 'کۆگا' : 'Inventory');

    Alert.alert(
      isKurdish ? 'گەڕاندنەوەی سەرەتایی' : 'Reset to Defaults',
      isKurdish
        ? `ئایا دڵنیایت لە گەڕاندنەوەی سەرجەم ڕێکخستنەکانی پسوولەی (${tabName}) بۆ دۆخی بنەڕەتی؟`
        : `Are you sure you want to reset (${tabName}) receipt settings to defaults?`,
      [
        { text: isKurdish ? 'پاشگەزبوونەوە' : 'Cancel', style: 'cancel' },
        {
          text: isKurdish ? 'بەڵێ، بگەڕێنەوە' : 'Reset',
          style: 'destructive',
          onPress: () => {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); } catch {}
            if (activeTab === 'sales') resetSalesSettings();
            else if (activeTab === 'purchases') resetPurchaseSettings();
            else if (activeTab === 'quotation') resetQuotationSettings();
            else if (activeTab === 'inventory') resetInventorySettings();
          },
        },
      ]
    );
  };

  // Mock Sales Data
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
      if (activeTab === 'sales') {
        if (activePaperSize === 'A4') {
          const { directPrintInvoice } = await import('@/lib/generateInvoice');
          await directPrintInvoice(mockSale, {
            name: business.name || 'مارکێتی فرۆشیار',
            phone: business.phone || '0770 000 0000',
            address: business.address || 'شەقامی سەرەکی، هەولێر',
            logoUri: business.logoUri ?? null,
          });
        } else {
          const { directPrintThermalInvoice } = await import('@/lib/generateInvoice');
          await directPrintThermalInvoice(
            mockSale,
            {
              name: business.name || 'مارکێتی فرۆشیار',
              phone: business.phone || '0770 000 0000',
              address: business.address || 'شەقامی سەرەکی، هەولێر',
              logoUri: business.logoUri ?? null,
            },
            activePaperSize as ThermalReceiptWidth
          );
        }
      } else if (activeTab === 'purchases') {
        const { directPrintPurchaseInvoice } = await import('@/lib/generateInvoice');
        await directPrintPurchaseInvoice(
          {
            id: 8888,
            purchaseNumber: 'P-00892',
            date: new Date().toISOString().split('T')[0],
            supplierName: 'کۆمپانیای عەلی بۆ هاوردەکردن',
            supplierPhone: '0770 123 9988',
            supplierAddress: 'هەولێر - شۆڕش',
            productName: 'زەیتی زەیتوون ٥ لیتری',
            category: 'خۆراک',
            quantity: 10,
            buyPriceIQD: 22000,
            buyPriceUSD: 14.5,
            sellPriceIQD: 26000,
            sellPriceUSD: 17.5,
            totalIQD: 390000,
            profitIQD: 40000,
            exchangeRate: 1500,
            idType: 'custom',
            itemIds: ['OIL-5L'],
            warranty: 'بەکارهێنان تا ٢٠٢٧',
            description: null,
            notes: 'وەسڵی کڕینی کاڵا لە کۆگای سەرەکی',
            paymentStatus: 'paid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          [
            { productName: 'زەیتی زەیتوون ٥ لیتری', category: 'خۆراک', quantity: 10, buyPriceIQD: 22000, lineTotalIQD: 220000, idType: 'custom', itemIds: ['OIL-5L'] },
            { productName: 'برنجی کوردی پلە یەک', category: 'خۆراک', quantity: 5, buyPriceIQD: 34000, lineTotalIQD: 170000, idType: 'custom', itemIds: ['RICE-KRD'] },
          ],
          {
            name: business.name || 'مارکێتی فرۆشیار',
            phone: business.phone || '0770 000 0000',
            address: business.address || 'شەقامی سەرەکی، هەولێر',
            logoUri: business.logoUri ?? null,
          }
        );
      } else if (activeTab === 'quotation') {
        const { shareQuotationInvoice } = await import('@/lib/generateInvoice');
        await shareQuotationInvoice(
          {
            id: 'Q-01',
            quotationNumber: 'Q-2026-045',
            customerName: 'کۆمپانیای ئاسۆ بۆ تەکنەلۆجیا',
            customerPhone: '0750 999 1122',
            date: new Date().toISOString().split('T')[0],
            time: '02:45 PM',
            validityDays: 10,
            notes: 'نرخەکان گۆڕانکارییان بەسەردا دێت بەپێی بەهای دۆلار لە بازاڕدا.',
            aboutPolicy: 'هەموو کاڵاکان بە گەرەنتی فەرمی ١ ساڵ پێشکەش دەکرێن.',
            subtotal: 3125000,
            discountTotal: 50000,
            grandTotal: 3075000,
            exchangeRate: 1500,
            createdAt: new Date().toISOString(),
            items: [
              { id: '1', productId: 1, productName: 'لاپتۆپ Dell XPS 15', quantity: 2, unitPrice: 1500000, discount: 50000, lineTotal: 2900000, itemId: 'DELL-XPS' },
              { id: '2', productId: 2, productName: 'ماوس و کیبۆرد بێوایەر', quantity: 5, unitPrice: 35000, discount: 0, lineTotal: 175000, itemId: 'ACC-MK' },
            ],
          },
          {
            name: business.name || 'مارکێتی فرۆشیار',
            phone: business.phone || '0770 000 0000',
            address: business.address || 'شەقامی سەرەکی، هەولێر',
            logoUri: business.logoUri ?? null,
          }
        );
      } else if (activeTab === 'inventory') {
        const { shareFullInventoryReport } = await import('@/lib/generateInvoice');
        await shareFullInventoryReport(
          [
            { id: 1, name: 'شیر نیدۆ گەورە', category: 'خۆراک', quantity: 45, buyPrice: 18000, sellingPrice: 22000, itemId: 'NID-2500', supplier: 'کۆمپانیای نەستلە', status: 'لەبارە', lowStockThreshold: 5 } as any,
            { id: 2, name: 'قاوەی نەسکافێ کلاسیک', category: 'خواردنەوە', quantity: 3, buyPrice: 8500, sellingPrice: 11000, itemId: 'NES-CL', supplier: 'کۆمپانیای هاوردە', status: 'کەمبوون', lowStockThreshold: 5 } as any,
            { id: 3, name: 'پەنیر کرافت ٥٠٠گم', category: 'شیرەمەنی', quantity: 28, buyPrice: 4250, sellingPrice: 5500, itemId: 'KRF-500', supplier: 'دابینکەری هەولێر', status: 'لەبارە', lowStockThreshold: 5 } as any,
          ],
          {
            name: business.name || 'مارکێتی فرۆشیار',
            phone: business.phone || '0770 000 0000',
            address: business.address || 'شەقامی سەرەکی، هەولێر',
            logoUri: business.logoUri ?? null,
          },
          true,
          5,
          'ڕاپۆرتی گشتی کۆگا'
        );
      }
    } catch (err) {
      console.error('[ReceiptCustomization] Test print error:', err);
      Alert.alert(
        isKurdish ? 'هەڵە لە پرینت' : 'Print Error',
        isKurdish ? 'نەتوانرا وەسڵەکە چاپ بکرێت.' : 'Failed to print test document.'
      );
    } finally {
      setIsPrintingTest(false);
    }
  };

  // Preview card width
  const previewCardWidth = activePaperSize === '58mm'
    ? Math.min(270, windowWidth - 48)
    : activePaperSize === '80mm'
    ? Math.min(320, windowWidth - 36)
    : activePaperSize === '110mm'
    ? Math.min(360, windowWidth - 28)
    : Math.min(380, windowWidth - 24); // A4 Sheet Preview

  // Generic Toggle Renderer
  const renderToggleRow = (
    title: string,
    sub: string | undefined,
    isChecked: boolean,
    onToggle: () => void,
    icon: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline'
  ) => {
    return (
      <TouchableOpacity
        key={title}
        activeOpacity={0.7}
        onPress={onToggle}
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
          onValueChange={onToggle}
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
        title={isKurdish ? 'شێوازی چاپ و ڕێکخستنی پسوولە' : 'Print & Receipt Customization'}
        showBack
      />

      {/* ── MODULE SELECTOR TABS (فرۆشتن • کڕین • عەرز • کۆگا) ── */}
      <View style={[styles.moduleTabsWrapper, { backgroundColor: isDark ? colors.gray100 : colors.white, borderBottomColor: colors.gray200 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.moduleTabsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          {([
            { id: 'sales', label: isKurdish ? 'فرۆشتن' : 'Sales', icon: 'cart-outline' },
            { id: 'purchases', label: isKurdish ? 'کڕین' : 'Purchases', icon: 'bag-check-outline' },
            { id: 'quotation', label: isKurdish ? 'عەرز (Quotation)' : 'Quotations', icon: 'document-text-outline' },
            { id: 'inventory', label: isKurdish ? 'کۆگا' : 'Inventory', icon: 'cube-outline' },
          ] as const).map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleSwitchTab(tab.id)}
                activeOpacity={0.75}
                style={[
                  styles.moduleTabButton,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : (isDark ? 'rgba(255,255,255,0.06)' : colors.gray50),
                    borderColor: isSelected ? colors.primary : colors.gray200,
                  },
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={isSelected ? '#FFFFFF' : colors.gray500}
                />
                <Text
                  style={[
                    styles.moduleTabButtonText,
                    { color: isSelected ? '#FFFFFF' : colors.black },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Paper Size Selector (58mm, 80mm, 110mm, A4) ── */}
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
              {isKurdish ? 'قەبارەی وەسڵ و کاغەز (Paper Size)' : 'Receipt & Paper Size'}
            </Text>
          </View>

          {activeTab === 'quotation' ? (
            <View style={[styles.a4OnlyNoticeBox, { backgroundColor: colors.softBlue, borderColor: colors.primary }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <Text style={[styles.a4OnlyNoticeTitle, { color: colors.primary }, isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {isKurdish ? 'پەڕەی ستانداردی A4' : 'Standard A4 Sheet (21 × 29.7 cm)'}
                </Text>
              </View>
              <Text style={[styles.a4OnlyNoticeSub, { color: colors.gray600, textAlign }, isKurdish && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                {isKurdish
                  ? 'بەشی عەرز و ئۆفەر (Quotation) بە شێوازی فەرمی تەنها لەسەر پەڕەی A4 چاپ دەکرێت و بۆ پرینتەری حەراری نییە.'
                  : 'Quotations and price proposals are designed exclusively for standard official A4 paper format.'}
              </Text>
            </View>
          ) : (
            <View style={[styles.widthTabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {PAPER_OPTIONS.map((opt) => {
                const isSelected = activePaperSize === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.8}
                    onPress={() => handleSelectPaperSize(opt.id)}
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
          )}
        </SettingsCard>

        {/* ── 2. Live Receipt Preview (نموونەی ڕاستەوخۆ) ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="eye-outline" size={19} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'پێشبینینی ڕاستەوخۆ (Live Preview)' : 'Live Document Preview'}
            </Text>
          </View>

          <View style={styles.previewContainer}>
            {activePaperSize === 'A4' ? (
              /* ── A4 FORMAL SHEET PREVIEW ── */
              <View style={[styles.a4PreviewSheet, { width: previewCardWidth }]}>
                {/* A4 Header Banner */}
                <View style={styles.a4Header}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.a4BizName, isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {business.name || 'مارکێتی فرۆشیار'}
                    </Text>
                    {((activeTab === 'sales' && salesSettings.showBusinessAddress) ||
                      (activeTab === 'purchases' && purchaseSettings.showBusinessAddress) ||
                      (activeTab === 'quotation' && quotationSettings.showBusinessAddress) ||
                      (activeTab === 'inventory' && inventorySettings.showBusinessHeader)) && (
                      <Text style={styles.a4BizContact}>
                        {business.address || 'شەقامی سەرەکی، هەولێر'}
                      </Text>
                    )}
                    {((activeTab === 'sales' && salesSettings.showBusinessPhone) ||
                      (activeTab === 'purchases' && purchaseSettings.showBusinessPhone) ||
                      (activeTab === 'quotation' && quotationSettings.showBusinessPhone) ||
                      (activeTab === 'inventory' && inventorySettings.showBusinessHeader)) && (
                      <Text style={styles.a4BizContact}>
                        {business.phone || '0770 000 0000'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.a4DocBadge}>
                    <Text style={styles.a4DocBadgeText}>
                      {activeTab === 'sales'
                        ? (isKurdish ? 'وەسڵی فرۆشتن (A4)' : 'Sales Invoice')
                        : activeTab === 'purchases'
                        ? (isKurdish ? 'وەسڵی کڕین (A4)' : 'Purchase Voucher')
                        : activeTab === 'quotation'
                        ? (isKurdish ? 'عەرزی نرخ (Quotation)' : 'Price Proposal')
                        : (isKurdish ? 'سەرژمێری کۆگا (A4)' : 'Inventory Audit')}
                    </Text>
                  </View>
                </View>

                {/* A4 Metadata Cards */}
                <View style={styles.a4MetaGrid}>
                  <View style={styles.a4MetaCard}>
                    <Text style={styles.a4MetaLabel}>
                      {activeTab === 'sales' ? 'پسوولە #' : activeTab === 'purchases' ? 'وەسڵی کڕین #' : activeTab === 'quotation' ? 'عەرز #' : 'کۆد #'}
                    </Text>
                    <Text style={styles.a4MetaVal}>
                      {activeTab === 'sales' ? '#F-00124' : activeTab === 'purchases' ? '#P-00892' : activeTab === 'quotation' ? '#Q-2026-045' : '#INV-2026'}
                    </Text>
                    <Text style={[styles.a4MetaLabel, { marginTop: 4 }]}>بەروار:</Text>
                    <Text style={styles.a4MetaVal}>2026/10/29</Text>
                  </View>

                  <View style={styles.a4MetaCard}>
                    {activeTab === 'sales' && salesSettings.showCustomerName && (
                      <>
                        <Text style={styles.a4MetaLabel}>کڕیار:</Text>
                        <Text style={styles.a4MetaVal}>ئارام محەمەد</Text>
                      </>
                    )}
                    {activeTab === 'sales' && salesSettings.showCustomerPhone && (
                      <Text style={styles.a4MetaValSub}>0750 123 4567</Text>
                    )}
                    {activeTab === 'purchases' && purchaseSettings.showSupplierName && (
                      <>
                        <Text style={styles.a4MetaLabel}>دابینکەر:</Text>
                        <Text style={styles.a4MetaVal}>کۆمپانیای عەلی بۆ هاوردەکردن</Text>
                      </>
                    )}
                    {activeTab === 'purchases' && purchaseSettings.showSupplierPhone && (
                      <Text style={styles.a4MetaValSub}>0770 123 9988</Text>
                    )}
                    {activeTab === 'quotation' && quotationSettings.showCustomerName && (
                      <>
                        <Text style={styles.a4MetaLabel}>بۆ بەڕێز:</Text>
                        <Text style={styles.a4MetaVal}>کۆمپانیای ئاسۆ بۆ تەکنەلۆجیا</Text>
                      </>
                    )}
                    {activeTab === 'inventory' && (
                      <>
                        <Text style={styles.a4MetaLabel}>بەش / کۆگا:</Text>
                        <Text style={styles.a4MetaVal}>کۆگای سەرەکی سلێمانی</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* A4 Items Table */}
                <View style={styles.a4Table}>
                  <View style={styles.a4TableHeader}>
                    <Text style={[styles.a4Th, { flex: 0.5 }]}>#</Text>
                    <Text style={[styles.a4Th, { flex: 2 }]}>کاڵا</Text>
                    {((activeTab === 'sales' && salesSettings.showItemBarcode) ||
                      (activeTab === 'purchases' && purchaseSettings.showItemBarcode) ||
                      (activeTab === 'quotation' && quotationSettings.showItemBarcode) ||
                      (activeTab === 'inventory' && inventorySettings.showItemId)) && (
                      <Text style={[styles.a4Th, { flex: 1 }]}>کۆد</Text>
                    )}
                    <Text style={[styles.a4Th, { flex: 0.8, textAlign: 'center' }]}>بڕ</Text>
                    <Text style={[styles.a4Th, { flex: 1.3, textAlign: 'right' }]}>نرخ</Text>
                    <Text style={[styles.a4Th, { flex: 1.4, textAlign: 'right' }]}>کۆ</Text>
                  </View>

                  {/* Sample rows */}
                  <View style={styles.a4TableRow}>
                    <Text style={[styles.a4Td, { flex: 0.5 }]}>1</Text>
                    <Text style={[styles.a4Td, { flex: 2, fontWeight: '600' }]}>کۆلا قتوو ٣٣٠مل</Text>
                    {((activeTab === 'sales' && salesSettings.showItemBarcode) ||
                      (activeTab === 'purchases' && purchaseSettings.showItemBarcode) ||
                      (activeTab === 'quotation' && quotationSettings.showItemBarcode) ||
                      (activeTab === 'inventory' && inventorySettings.showItemId)) && (
                      <Text style={[styles.a4Td, { flex: 1, color: '#64748B' }]}>COL-330</Text>
                    )}
                    <Text style={[styles.a4Td, { flex: 0.8, textAlign: 'center' }]}>2</Text>
                    <Text style={[styles.a4Td, { flex: 1.3, textAlign: 'right' }]}>500</Text>
                    <Text style={[styles.a4Td, { flex: 1.4, textAlign: 'right', fontWeight: '700' }]}>1,000</Text>
                  </View>

                  <View style={[styles.a4TableRow, { backgroundColor: '#F8FAFC' }]}>
                    <Text style={[styles.a4Td, { flex: 0.5 }]}>2</Text>
                    <Text style={[styles.a4Td, { flex: 2, fontWeight: '600' }]}>چپس دوریتۆس گەورە</Text>
                    {((activeTab === 'sales' && salesSettings.showItemBarcode) ||
                      (activeTab === 'purchases' && purchaseSettings.showItemBarcode) ||
                      (activeTab === 'quotation' && quotationSettings.showItemBarcode) ||
                      (activeTab === 'inventory' && inventorySettings.showItemId)) && (
                      <Text style={[styles.a4Td, { flex: 1, color: '#64748B' }]}>DOR-BIG</Text>
                    )}
                    <Text style={[styles.a4Td, { flex: 0.8, textAlign: 'center' }]}>1</Text>
                    <Text style={[styles.a4Td, { flex: 1.3, textAlign: 'right' }]}>1,500</Text>
                    <Text style={[styles.a4Td, { flex: 1.4, textAlign: 'right', fontWeight: '700' }]}>1,500</Text>
                  </View>

                  <View style={styles.a4TableRow}>
                    <Text style={[styles.a4Td, { flex: 0.5 }]}>3</Text>
                    <Text style={[styles.a4Td, { flex: 2, fontWeight: '600' }]}>شوکۆلاتە کیندەر بوێنۆ</Text>
                    {((activeTab === 'sales' && salesSettings.showItemBarcode) ||
                      (activeTab === 'purchases' && purchaseSettings.showItemBarcode) ||
                      (activeTab === 'quotation' && quotationSettings.showItemBarcode) ||
                      (activeTab === 'inventory' && inventorySettings.showItemId)) && (
                      <Text style={[styles.a4Td, { flex: 1, color: '#64748B' }]}>KIN-BUE</Text>
                    )}
                    <Text style={[styles.a4Td, { flex: 0.8, textAlign: 'center' }]}>3</Text>
                    <View style={{ flex: 1.3, alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text style={[styles.a4Td, { textDecorationLine: 'line-through', color: '#94A3B8', fontSize: 10 }]}>750</Text>
                      <Text style={[styles.a4Td, { fontWeight: '700' }]}>500</Text>
                    </View>
                    <Text style={[styles.a4Td, { flex: 1.4, textAlign: 'right', fontWeight: '700' }]}>1,500</Text>
                  </View>
                </View>

                {/* A4 Summary Box */}
                <View style={styles.a4SummaryRow}>
                  <View style={styles.a4NotesBox}>
                    <Text style={styles.a4NotesTitle}>تێبینی و مەرجەکان:</Text>
                    <Text style={styles.a4NotesText}>
                      {activeTab === 'quotation'
                        ? (quotationSettings.customFooterNote || 'ئەم عەرزە بۆ ماوەی دیاریکراو کارایە.')
                        : (salesSettings.customFooterNote || 'کاڵای فرۆشراو دەگۆڕدرێتەوە تا ٧ ڕۆژ.')}
                    </Text>
                  </View>

                  <View style={styles.a4TotalsBox}>
                    <View style={styles.a4TotalRow}>
                      <Text style={styles.a4TotalLabel}>کۆی کاڵاکان:</Text>
                      <Text style={styles.a4TotalVal}>4,750 IQD</Text>
                    </View>
                    <View style={styles.a4TotalRow}>
                      <Text style={styles.a4TotalLabel}>داشکاندن:</Text>
                      <Text style={[styles.a4TotalVal, { color: '#D97706' }]}>− 750 IQD</Text>
                    </View>
                    <View style={[styles.a4TotalRow, styles.a4GrandRow]}>
                      <Text style={styles.a4GrandLabel}>کۆی گشتی:</Text>
                      <Text style={styles.a4GrandVal}>4,000 IQD</Text>
                    </View>
                  </View>
                </View>

                {/* A4 Signature Section */}
                <View style={styles.a4SignatureRow}>
                  <View style={styles.a4SignatureCol}>
                    <Text style={styles.a4SignatureLine}>واژووی کڕیار / وەرگر</Text>
                  </View>
                  <View style={styles.a4SignatureCol}>
                    <Text style={styles.a4SignatureLine}>مۆر و واژووی فرۆشگا</Text>
                  </View>
                </View>
              </View>
            ) : (
              /* ── THERMAL RECEIPT ROLL PREVIEW (58mm, 80mm, 110mm) ── */
              <View style={[styles.receiptPaper, { width: previewCardWidth }]}>
                {/* Simulated Thermal Tear Marks at Top */}
                <View style={styles.tearMarks}>
                  {Array.from({ length: 22 }).map((_, i) => (
                    <View key={i} style={styles.tearDot} />
                  ))}
                </View>

                {/* Receipt Header */}
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptStoreName}>
                    {business.name || 'مارکێتی فرۆشیار'}
                  </Text>

                  {((activeTab === 'sales' && salesSettings.showBusinessAddress) ||
                    (activeTab === 'purchases' && purchaseSettings.showBusinessAddress) ||
                    (activeTab === 'inventory' && inventorySettings.showBusinessHeader)) && (
                    <Text style={styles.receiptContact}>
                      {business.address || 'شەقامی سەرەکی، هەولێر'}
                    </Text>
                  )}

                  {((activeTab === 'sales' && salesSettings.showBusinessPhone) ||
                    (activeTab === 'purchases' && purchaseSettings.showBusinessPhone) ||
                    (activeTab === 'inventory' && inventorySettings.showBusinessHeader)) && (
                    <Text style={styles.receiptContact}>
                      {business.phone || '0770 000 0000'}
                    </Text>
                  )}
                </View>

                <View style={styles.dashedDivider} />

                {/* Metadata */}
                <View style={styles.receiptMeta}>
                  {((activeTab === 'sales' && salesSettings.showInvoiceNumber) ||
                    (activeTab === 'purchases' && purchaseSettings.showInvoiceNumber)) && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{isKurdish ? 'پسوولە:' : 'Receipt #:'}</Text>
                      <Text style={[styles.receiptValue, { fontWeight: '700' }]}>
                        {activeTab === 'sales' ? '#F-00124' : '#P-00892'}
                      </Text>
                    </View>
                  )}

                  {((activeTab === 'sales' && salesSettings.showDate) ||
                    (activeTab === 'purchases' && purchaseSettings.showDate) ||
                    (activeTab === 'inventory' && inventorySettings.showDate)) && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{isKurdish ? 'بەروار:' : 'Date:'}</Text>
                      <Text style={styles.receiptValue}>2026/10/29 - 02:45 PM</Text>
                    </View>
                  )}

                  {activeTab === 'sales' && salesSettings.showCustomerName && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{isKurdish ? 'کڕیار:' : 'Customer:'}</Text>
                      <Text style={styles.receiptValue}>ئارام محەمەد</Text>
                    </View>
                  )}

                  {activeTab === 'sales' && salesSettings.showCustomerPhone && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{isKurdish ? 'مۆبایل:' : 'Phone:'}</Text>
                      <Text style={[styles.receiptValue, { fontWeight: '700' }]}>0750 123 4567</Text>
                    </View>
                  )}

                  {activeTab === 'purchases' && purchaseSettings.showSupplierName && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{isKurdish ? 'دابینکەر:' : 'Supplier:'}</Text>
                      <Text style={styles.receiptValue}>کۆمپانیای عەلی بۆ هاوردەکردن</Text>
                    </View>
                  )}
                </View>

                <View style={styles.dashedDivider} />

                {/* Items List */}
                {activePaperSize === '58mm' ? (
                  /* 58mm 2-line layout */
                  <View style={styles.items58}>
                    {(mockSale.items ?? []).map((item, idx) => (
                      <View key={item.id} style={styles.item58Block}>
                        <View style={styles.item58Top}>
                          <Text style={styles.item58Name} numberOfLines={1}>
                            {idx + 1}. {item.productName}
                          </Text>
                          {salesSettings.showItemBarcode && item.itemId && (
                            <Text style={styles.item58Id}>#{item.itemId}</Text>
                          )}
                        </View>
                        <View style={styles.item58Bottom}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            {salesSettings.showQty && (
                              <Text style={styles.item58QtyPrice}>{item.quantity} × </Text>
                            )}
                            {salesSettings.showItemPrice && (
                              salesSettings.showDiscount && item.discount > 0 ? (
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
                  /* 80mm & 110mm columnar layout */
                  <View style={styles.tableWrap}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.colHeader, { flex: 2 }]}>
                        {isKurdish ? 'کاڵا' : 'Item'}
                      </Text>
                      {salesSettings.showQty && (
                        <Text style={[styles.colHeader, styles.colCenter, { flex: 0.8 }]}>
                          {isKurdish ? 'عەدەد' : 'Qty'}
                        </Text>
                      )}
                      {salesSettings.showItemPrice && (
                        <Text style={[styles.colHeader, styles.colRight, { flex: 1.3 }]}>
                          {isKurdish ? 'نرخ' : 'Price'}
                        </Text>
                      )}
                      <Text style={[styles.colHeader, styles.colRight, { flex: 1.3 }]}>
                        {isKurdish ? 'کۆی گشتی' : 'Total'}
                      </Text>
                    </View>

                    {(mockSale.items ?? []).map((item, idx) => (
                      <View key={item.id} style={styles.tableRow}>
                        <View style={{ flex: 2 }}>
                          <Text style={styles.tableItemName} numberOfLines={2}>
                            {idx + 1}. {item.productName}
                          </Text>
                          {salesSettings.showItemBarcode && item.itemId && (
                            <Text style={styles.tableItemId}>#{item.itemId}</Text>
                          )}
                        </View>
                        {salesSettings.showQty && (
                          <Text style={[styles.tableItemCell, styles.colCenter, { flex: 0.8 }]}>
                            {item.quantity}
                          </Text>
                        )}
                        {salesSettings.showItemPrice && (
                          <View style={{ flex: 1.3, justifyContent: 'center', alignItems: 'flex-end' }}>
                            {salesSettings.showDiscount && item.discount > 0 ? (
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

                <View style={styles.dashedDivider} />

                {/* Financial Totals */}
                <View style={styles.receiptTotals}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>{isKurdish ? 'کۆی کاڵاکان:' : 'Subtotal:'}</Text>
                    <Text style={styles.receiptValue}>4,750 IQD</Text>
                  </View>

                  {salesSettings.showDiscount && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{isKurdish ? 'داشکاندن:' : 'Discount:'}</Text>
                      <Text style={styles.receiptValue}>− 750 IQD</Text>
                    </View>
                  )}

                  <View style={[styles.receiptRow, styles.receiptGrandTotalRow]}>
                    <Text style={styles.receiptGrandTotalLabel}>
                      {isKurdish ? 'کۆی گشتی:' : 'Total:'}
                    </Text>
                    <Text style={styles.receiptGrandTotalAmount}>4,000 IQD</Text>
                  </View>

                  {salesSettings.showPaymentMethod && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{isKurdish ? 'شێوازی پارەدان:' : 'Payment:'}</Text>
                      <Text style={styles.receiptValue}>Cash</Text>
                    </View>
                  )}

                  {salesSettings.showRemainingDebt && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>{isKurdish ? 'قەرزی ماوە:' : 'Remaining:'}</Text>
                      <Text style={styles.receiptValue}>0 IQD</Text>
                    </View>
                  )}
                </View>

                {/* Notes & Policy */}
                {salesSettings.showNotes && (
                  <View style={styles.receiptNotesBox}>
                    <Text style={styles.receiptNotesTitle}>{isKurdish ? 'تێبینی و سیاسەت:' : 'Notes & Policy:'}</Text>
                    <Text style={styles.receiptNotesText}>{mockSale.notes}</Text>
                  </View>
                )}

                {/* Footer Message & Barcode */}
                <View style={styles.receiptFooter}>
                  {salesSettings.customFooterNote ? (
                    <Text style={styles.receiptFooterNote}>{salesSettings.customFooterNote}</Text>
                  ) : null}

                  {salesSettings.showFooterBarcode && (
                    <View style={styles.barcodeBox}>
                      <View style={styles.barcodeMockLines}>
                        {Array.from({ length: 34 }).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.barcodeBar,
                              { width: (i % 3 === 0 ? 3 : i % 2 === 0 ? 1.5 : 2), height: 32 },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={styles.barcodeCode}>#F-00124</Text>
                    </View>
                  )}

                  <Text style={styles.receiptBrandCredit}>Froshiar POS • www.froshiar.store</Text>
                </View>
              </View>
            )}
          </View>
        </SettingsCard>

        {/* ── 3. Field Customization Toggles ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="options-outline" size={19} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'دەستکاری بڕگە و زانیارییەکان' : 'Field Customization'}
            </Text>
          </View>

          {/* Dynamic list of toggles based on activeTab */}
          {activeTab === 'sales' && (
            <View>
              {renderToggleRow('ژمارەی تەلەفۆنی فرۆشگا', 'پیشاندانی پەیوەندی فرۆشگا لە سەرپەڕە', salesSettings.showBusinessPhone, () => updateSalesSettings({ showBusinessPhone: !salesSettings.showBusinessPhone }), 'call-outline')}
              {renderToggleRow('ناونیشانی فرۆشگا', 'پیشاندانی ناونیشان لە سەرپەڕەی پسوولە', salesSettings.showBusinessAddress, () => updateSalesSettings({ showBusinessAddress: !salesSettings.showBusinessAddress }), 'location-outline')}
              {renderToggleRow('ناوی کڕیار', 'پیشاندانی ناوی کڕیاری دیاریکراو', salesSettings.showCustomerName, () => updateSalesSettings({ showCustomerName: !salesSettings.showCustomerName }), 'person-outline')}
              {renderToggleRow('ژمارەی مۆبایلی کڕیار', 'پیشاندانی ژمارەی پەیوەندی کڕیار', salesSettings.showCustomerPhone, () => updateSalesSettings({ showCustomerPhone: !salesSettings.showCustomerPhone }), 'phone-portrait-outline')}
              {renderToggleRow('ژمارەی پسوولە (#Invoice)', 'پیشاندانی کۆدی تایبەتی پسوولە', salesSettings.showInvoiceNumber, () => updateSalesSettings({ showInvoiceNumber: !salesSettings.showInvoiceNumber }), 'receipt-outline')}
              {renderToggleRow('بەروار و کات', 'پیشاندانی کات و ڕۆژی فرۆشتنەکە', salesSettings.showDate, () => updateSalesSettings({ showDate: !salesSettings.showDate }), 'calendar-outline')}
              {renderToggleRow('بڕ و عەدەد (Qty)', 'پیشاندانی ژمارەی دانەی هەر کاڵایەک', salesSettings.showQty, () => updateSalesSettings({ showQty: !salesSettings.showQty }), 'layers-outline')}
              {renderToggleRow('نرخی تاک (Unit Price)', 'پیشاندانی نرخی تاک بە هێڵ کێشان بەسەر نرخی کۆندا', salesSettings.showItemPrice, () => updateSalesSettings({ showItemPrice: !salesSettings.showItemPrice }), 'pricetag-outline')}
              {renderToggleRow('داشکاندن (Discount)', 'پیشاندانی بڕی داشکێنراو بۆ کاڵاکان و گشتی', salesSettings.showDiscount, () => updateSalesSettings({ showDiscount: !salesSettings.showDiscount }), 'cut-outline')}
              {renderToggleRow('بارکۆد و ئایدی کاڵا (Item ID)', 'پیشاندانی کۆدی ناسینەوە لەژێر ناوی کاڵا', salesSettings.showItemBarcode, () => updateSalesSettings({ showItemBarcode: !salesSettings.showItemBarcode }), 'barcode-outline')}
              {renderToggleRow('شێوازی پارەدان (Payment Method)', 'کاش، قەرز، یان کارت', salesSettings.showPaymentMethod, () => updateSalesSettings({ showPaymentMethod: !salesSettings.showPaymentMethod }), 'wallet-outline')}
              {renderToggleRow('قەرزی ماوە (Remaining Debt)', 'پیشاندانی بڕی قەرزی تۆمارکراو', salesSettings.showRemainingDebt, () => updateSalesSettings({ showRemainingDebt: !salesSettings.showRemainingDebt }), 'alert-circle-outline')}
              {renderToggleRow('تێبینی و سیاسەت (Notes & Policy)', 'پیشاندانی مەرج و گرەنتی فرۆشتن', salesSettings.showNotes, () => updateSalesSettings({ showNotes: !salesSettings.showNotes }), 'document-text-outline')}
              {renderToggleRow('بارکۆدی کۆتایی پسوولە (Footer Barcode)', 'بارکۆدی خێرا بۆ سکانکردنەوەی پسوولە', salesSettings.showFooterBarcode, () => updateSalesSettings({ showFooterBarcode: !salesSettings.showFooterBarcode }), 'qr-code-outline')}
            </View>
          )}

          {activeTab === 'purchases' && (
            <View>
              {renderToggleRow('تەلەفۆنی کۆمپانیا', 'پیشاندانی ژمارەی پەیوەندی لە سەرپەڕە', purchaseSettings.showBusinessPhone, () => updatePurchaseSettings({ showBusinessPhone: !purchaseSettings.showBusinessPhone }), 'call-outline')}
              {renderToggleRow('ناونیشانی کۆمپانیا', 'پیشاندانی ناونیشانی کۆگا لە سەرپەڕە', purchaseSettings.showBusinessAddress, () => updatePurchaseSettings({ showBusinessAddress: !purchaseSettings.showBusinessAddress }), 'location-outline')}
              {renderToggleRow('ناوی دابینکەر / سەپلایەر', 'پیشاندانی ناوی کۆمپانیا یان کەسی دابینکەر', purchaseSettings.showSupplierName, () => updatePurchaseSettings({ showSupplierName: !purchaseSettings.showSupplierName }), 'business-outline')}
              {renderToggleRow('تەلەفۆنی دابینکەر', 'پیشاندانی مۆبایلی سەپلایەر بۆ پەیوەندی', purchaseSettings.showSupplierPhone, () => updatePurchaseSettings({ showSupplierPhone: !purchaseSettings.showSupplierPhone }), 'phone-portrait-outline')}
              {renderToggleRow('ژمارەی وەسڵی کڕین (#Bill)', 'کۆدی وەسڵی کڕین لە سیستەم', purchaseSettings.showInvoiceNumber, () => updatePurchaseSettings({ showInvoiceNumber: !purchaseSettings.showInvoiceNumber }), 'receipt-outline')}
              {renderToggleRow('بەروار و کات', 'کاتی تۆمارکردنی کڕین لە سیستەم', purchaseSettings.showDate, () => updatePurchaseSettings({ showDate: !purchaseSettings.showDate }), 'calendar-outline')}
              {renderToggleRow('بڕ و عەدەد (Quantity)', 'عەدەدی کڕدراو بۆ مەخزەن', purchaseSettings.showQty, () => updatePurchaseSettings({ showQty: !purchaseSettings.showQty }), 'layers-outline')}
              {renderToggleRow('نرخی کڕین و تێچوو (Cost)', 'نرخی کڕینی تاک بە داشکاندنەوە', purchaseSettings.showBuyPrice, () => updatePurchaseSettings({ showBuyPrice: !purchaseSettings.showBuyPrice }), 'cash-outline')}
              {renderToggleRow('داشکاندنی کڕین (Discount)', 'پیشاندانی داشکاندنی دراو لەلایەن سەپلایەرەوە', purchaseSettings.showDiscount, () => updatePurchaseSettings({ showDiscount: !purchaseSettings.showDiscount }), 'cut-outline')}
              {renderToggleRow('بارکۆد و ئایدی کاڵا (Item ID)', 'کۆدی کاڵای کڕدراو', purchaseSettings.showItemBarcode, () => updatePurchaseSettings({ showItemBarcode: !purchaseSettings.showItemBarcode }), 'barcode-outline')}
              {renderToggleRow('دۆخی پارەدان (کاش، FIB، قەرز)', 'پیشاندانی چۆنیەتی درانی پارە بە دابینکەر', purchaseSettings.showPaymentMethod, () => updatePurchaseSettings({ showPaymentMethod: !purchaseSettings.showPaymentMethod }), 'wallet-outline')}
              {renderToggleRow('قەرزی ماوەی دابینکەر', 'بڕی ماوە کە دەبێت بدرێتەوە بە دابینکەر', purchaseSettings.showRemainingDebt, () => updatePurchaseSettings({ showRemainingDebt: !purchaseSettings.showRemainingDebt }), 'alert-circle-outline')}
              {renderToggleRow('تێبینییەکانی کڕین', 'پیشاندانی ڕوونکردنەوە و تێبینی سەر وەسڵ', purchaseSettings.showNotes, () => updatePurchaseSettings({ showNotes: !purchaseSettings.showNotes }), 'document-text-outline')}
              {renderToggleRow('بارکۆدی خوارەوە', 'بارکۆدی خێرا بۆ گەڕان لەناو سیستەم', purchaseSettings.showFooterBarcode, () => updatePurchaseSettings({ showFooterBarcode: !purchaseSettings.showFooterBarcode }), 'qr-code-outline')}
            </View>
          )}

          {activeTab === 'quotation' && (
            <View>
              {renderToggleRow('پەیوەندی و تەلەفۆنی کۆمپانیا', 'پیشاندانی پەیوەندی لەسەر عەرز', quotationSettings.showBusinessPhone, () => updateQuotationSettings({ showBusinessPhone: !quotationSettings.showBusinessPhone }), 'call-outline')}
              {renderToggleRow('ناونیشانی فەرمی کۆمپانیا', 'ناونیشانی ئۆفیسی پێشکەشکار', quotationSettings.showBusinessAddress, () => updateQuotationSettings({ showBusinessAddress: !quotationSettings.showBusinessAddress }), 'location-outline')}
              {renderToggleRow('ناوی کڕیار / کۆمپانیا', 'ناوی لایەنی داواکار لەسەر عەرز', quotationSettings.showCustomerName, () => updateQuotationSettings({ showCustomerName: !quotationSettings.showCustomerName }), 'person-outline')}
              {renderToggleRow('تەلەفۆنی کڕیار', 'مۆبایلی کڕیار بۆ پەیوەندی فەرمی', quotationSettings.showCustomerPhone, () => updateQuotationSettings({ showCustomerPhone: !quotationSettings.showCustomerPhone }), 'phone-portrait-outline')}
              {renderToggleRow('ژمارەی فەرمی عەرز (#Quotation)', 'کۆدی زنجیرەیی عەرزەکە', quotationSettings.showQuotationNumber, () => updateQuotationSettings({ showQuotationNumber: !quotationSettings.showQuotationNumber }), 'document-outline')}
              {renderToggleRow('بەرواری دەرچوون', 'بەرواری دەرکردنی عەرزەکە', quotationSettings.showDate, () => updateQuotationSettings({ showDate: !quotationSettings.showDate }), 'calendar-outline')}
              {renderToggleRow('وادەی کارابوون (Valid Until)', 'ماوەی کارابوونی نرخە پێشنیارکراوەکان', quotationSettings.showValidUntil, () => updateQuotationSettings({ showValidUntil: !quotationSettings.showValidUntil }), 'time-outline')}
              {renderToggleRow('کۆد و بارکۆدی کاڵاکان', 'کۆدی ناسینەوە لە خشتەی عەرزدا', quotationSettings.showItemBarcode, () => updateQuotationSettings({ showItemBarcode: !quotationSettings.showItemBarcode }), 'barcode-outline')}
              {renderToggleRow('بڕ و عەدەد (Quantity)', 'ژمارەی دانەی پێشکەشکراو', quotationSettings.showQty, () => updateQuotationSettings({ showQty: !quotationSettings.showQty }), 'layers-outline')}
              {renderToggleRow('نرخی یەکە (Unit Price)', 'نرخی پێشنیارکراو بە داشکاندنەوە', quotationSettings.showItemPrice, () => updateQuotationSettings({ showItemPrice: !quotationSettings.showItemPrice }), 'pricetag-outline')}
              {renderToggleRow('داشکاندن لەسەر کاڵاکان', 'پیشاندانی داشکاندنی تایبەت بۆ پڕۆژەکە', quotationSettings.showDiscount, () => updateQuotationSettings({ showDiscount: !quotationSettings.showDiscount }), 'cut-outline')}
              {renderToggleRow('دەربارەی کۆمپانیا و سیاسەت', 'سیاسەتی فرۆشتن و گەرەنتی', quotationSettings.showAboutPolicy, () => updateQuotationSettings({ showAboutPolicy: !quotationSettings.showAboutPolicy }), 'information-circle-outline')}
              {renderToggleRow('تێبینی و مەرجەکان', 'مەرجەکانی پارەدان و گواستنەوە', quotationSettings.showNotes, () => updateQuotationSettings({ showNotes: !quotationSettings.showNotes }), 'document-text-outline')}
              {renderToggleRow('شوێنی مۆر و واژوو (Signatures)', 'بەشی فەرمی واژووی وەرگر و پێشکەشکار', quotationSettings.showSignature, () => updateQuotationSettings({ showSignature: !quotationSettings.showSignature }), 'pencil-outline')}
            </View>
          )}

          {activeTab === 'inventory' && (
            <View>
              {renderToggleRow('سەرپەڕەی فەرمی و زانیاری کۆگا', 'ناوی کۆگا، پەیوەندی و ناونیشان', inventorySettings.showBusinessHeader, () => updateInventorySettings({ showBusinessHeader: !inventorySettings.showBusinessHeader }), 'business-outline')}
              {renderToggleRow('هاوپۆل و دەستە (Category)', 'هاوپۆلی کاڵا لە خشتەی کۆگادا', inventorySettings.showCategory, () => updateInventorySettings({ showCategory: !inventorySettings.showCategory }), 'grid-outline')}
              {renderToggleRow('بارکۆد و ئایدی کاڵا (Item ID)', 'کۆدی ستاندارد یان بارکۆدی کاڵا', inventorySettings.showItemId, () => updateInventorySettings({ showItemId: !inventorySettings.showItemId }), 'barcode-outline')}
              {renderToggleRow('بڕی بەردەست (Stock Qty)', 'ژمارەی دانەی ماوە لە مەخزەندا', inventorySettings.showQuantity, () => updateInventorySettings({ showQuantity: !inventorySettings.showQuantity }), 'layers-outline')}
              {renderToggleRow('نرخی کڕین / تێچوو (Cost)', 'تێچووی کڕین بۆ یەکەی کاڵا', inventorySettings.showBuyPrice, () => updateInventorySettings({ showBuyPrice: !inventorySettings.showBuyPrice }), 'cash-outline')}
              {renderToggleRow('نرخی فرۆشتن (Selling Price)', 'نرخی دیاریکراو بۆ فرۆشتن', inventorySettings.showSellPrice, () => updateInventorySettings({ showSellPrice: !inventorySettings.showSellPrice }), 'pricetag-outline')}
              {renderToggleRow('بەهای گشتی کاڵاکان (Total Value)', 'کۆی بەهای هەموو کاڵاکانی مەخزەن', inventorySettings.showTotalValue, () => updateInventorySettings({ showTotalValue: !inventorySettings.showTotalValue }), 'calculator-outline')}
              {renderToggleRow('ناوی دابینکەر (Supplier)', 'کۆمپانیای سەرچاوەی کاڵاکان', inventorySettings.showSupplier, () => updateInventorySettings({ showSupplier: !inventorySettings.showSupplier }), 'people-outline')}
              {renderToggleRow('دۆخی کاڵا و ئاگاداری کەمی (Status)', 'پیشاندانی دۆخی لەبارە یان کەمبوونەوە', inventorySettings.showStatus, () => updateInventorySettings({ showStatus: !inventorySettings.showStatus }), 'alert-circle-outline')}
              {renderToggleRow('بەروار و کاتی سەرژمێری', 'کاتی دەرهێنانی ڕاپۆرتی کۆگا', inventorySettings.showDate, () => updateInventorySettings({ showDate: !inventorySettings.showDate }), 'calendar-outline')}
              {renderToggleRow('تێبینی و کورتە', 'ڕوونکردنەوەی فەرمی کۆتایی ڕاپۆرت', inventorySettings.showNotes, () => updateInventorySettings({ showNotes: !inventorySettings.showNotes }), 'document-text-outline')}
            </View>
          )}
        </SettingsCard>

        {/* ── 4. Custom Footer Note Input ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="chatbox-ellipses-outline" size={19} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'دەقی دڵخوازی خوارەوەی وەسڵ' : 'Custom Footer Note'}
            </Text>
          </View>
          <Text
            style={[
              styles.sectionDesc,
              { color: colors.gray500, textAlign },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {isKurdish
              ? 'ئەم دەقە لە کۆتایی هەموو وەسڵ و چاپەکاندا پیشان دەدرێت بۆ سوپاسگوزاری یان مەرجی فرۆشگا.'
              : 'This note is printed at the bottom of the receipt/invoice.'}
          </Text>

          <TextInput
            style={[
              styles.footerInput,
              {
                color: colors.black,
                borderColor: colors.gray200,
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.white,
                textAlign,
              },
              isKurdish && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
            value={
              activeTab === 'sales'
                ? salesSettings.customFooterNote
                : activeTab === 'purchases'
                ? purchaseSettings.customFooterNote
                : activeTab === 'quotation'
                ? quotationSettings.customFooterNote
                : inventorySettings.customFooterNote
            }
            onChangeText={(txt) => {
              if (activeTab === 'sales') updateSalesSettings({ customFooterNote: txt });
              else if (activeTab === 'purchases') updatePurchaseSettings({ customFooterNote: txt });
              else if (activeTab === 'quotation') updateQuotationSettings({ customFooterNote: txt });
              else if (activeTab === 'inventory') updateInventorySettings({ customFooterNote: txt });
            }}
            placeholder={isKurdish ? 'سوپاس بۆ سەردانەکەتان • هەمیشە بەخێربێن' : 'Thank you for your business'}
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={2}
          />
        </SettingsCard>

        {/* ── 5. Action Buttons (Test Print & Reset) ── */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.testPrintBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={handleTestPrint}
            disabled={isPrintingTest}
          >
            <Ionicons name="print-outline" size={20} color="#FFFFFF" />
            <Text
              style={[
                styles.testPrintBtnText,
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isPrintingTest
                ? (isKurdish ? 'چاپ دەکرێت...' : 'Printing...')
                : isKurdish
                ? `چاپی تاقیکاری (${activePaperSize})`
                : `Test Print (${activePaperSize})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resetBtn,
              {
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FCA5A5',
              },
            ]}
            activeOpacity={0.8}
            onPress={handleResetCurrentModule}
          >
            <Ionicons name="refresh-outline" size={18} color="#EF4444" />
            <Text
              style={[
                styles.resetBtnText,
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isKurdish ? 'گەڕاندنەوەی سەرەتایی ئەم بەشە' : 'Reset Module to Default'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  /* Module Tabs */
  moduleTabsWrapper: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  moduleTabsContainer: {
    gap: 8,
    alignItems: 'center',
  },
  moduleTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  moduleTabButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* Sections */
  sectionCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },

  /* Paper Size Selectors */
  widthTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  widthTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    position: 'relative',
  },
  activeCheckBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widthTabLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  widthCmBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  widthCmBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  widthTabDesc: {
    fontSize: 9.5,
    textAlign: 'center',
  },

  a4OnlyNoticeBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  a4OnlyNoticeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  a4OnlyNoticeSub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  /* Preview Card */
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },

  /* A4 Preview Styles */
  a4PreviewSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  a4Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0F172A',
    paddingBottom: 8,
    marginBottom: 10,
  },
  a4BizName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  a4BizContact: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  a4DocBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  a4DocBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  a4MetaGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  a4MetaCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  a4MetaLabel: {
    fontSize: 9.5,
    color: '#64748B',
  },
  a4MetaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  a4MetaValSub: {
    fontSize: 10,
    color: '#334155',
    marginTop: 1,
  },
  a4Table: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  a4TableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  a4Th: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  a4TableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  a4Td: {
    fontSize: 10,
    color: '#0F172A',
  },
  a4SummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  a4NotesBox: {
    flex: 1.2,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 8,
  },
  a4NotesTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  a4NotesText: {
    fontSize: 9.5,
    color: '#64748B',
    lineHeight: 14,
  },
  a4TotalsBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 8,
  },
  a4TotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  a4TotalLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  a4TotalVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  a4GrandRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 4,
    marginTop: 2,
  },
  a4GrandLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  a4GrandVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  a4SignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  a4SignatureCol: {
    alignItems: 'center',
  },
  a4SignatureLine: {
    fontSize: 9.5,
    color: '#64748B',
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    paddingTop: 4,
    width: 100,
    textAlign: 'center',
  },

  /* Thermal Receipt Paper Styles */
  receiptPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tearMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tearDot: {
    width: 4,
    height: 1.5,
    backgroundColor: '#CBD5E1',
    borderRadius: 1,
  },
  receiptHeader: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  receiptStoreName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 2,
  },
  receiptContact: {
    fontSize: 11,
    color: '#555555',
    lineHeight: 16,
  },
  dashedDivider: {
    borderStyle: 'dashed',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    marginVertical: 8,
  },
  receiptMeta: {
    gap: 3,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 11,
    color: '#555555',
  },
  receiptValue: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '500',
  },

  /* 58mm Items */
  items58: {
    gap: 6,
  },
  item58Block: {
    gap: 2,
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
  item58Id: {
    fontSize: 9,
    color: '#777777',
  },
  item58Bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item58QtyPrice: {
    fontSize: 10.5,
    color: '#555555',
  },
  item58Total: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },

  /* 80mm & 110mm Items */
  tableWrap: {
    gap: 4,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 4,
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
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  tableItemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
  },
  tableItemId: {
    fontSize: 9,
    color: '#777777',
    marginTop: 1,
  },
  tableItemCell: {
    fontSize: 11,
    color: '#000000',
  },

  /* Totals */
  receiptTotals: {
    gap: 3,
  },
  receiptGrandTotalRow: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#000000',
    paddingVertical: 5,
    marginVertical: 4,
  },
  receiptGrandTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  receiptGrandTotalAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },

  /* Notes */
  receiptNotesBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  receiptNotesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 2,
  },
  receiptNotesText: {
    fontSize: 9.5,
    color: '#555555',
    lineHeight: 14,
  },

  /* Footer */
  receiptFooter: {
    alignItems: 'center',
    paddingTop: 8,
  },
  receiptFooterNote: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  barcodeBox: {
    alignItems: 'center',
    marginBottom: 6,
  },
  barcodeMockLines: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  barcodeBar: {
    backgroundColor: '#000000',
  },
  barcodeCode: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
    marginTop: 2,
  },
  receiptBrandCredit: {
    fontSize: 8.5,
    color: '#888888',
    marginTop: 2,
  },

  /* Switches */
  switchRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  switchRowLeft: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  switchRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRowTextCol: {
    flex: 1,
  },
  switchRowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchRowSub: {
    fontSize: 11,
    marginTop: 1,
  },

  /* Footer Text Input */
  footerInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  /* Actions */
  actionsContainer: {
    gap: 10,
    marginTop: 8,
  },
  testPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  testPrintBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
