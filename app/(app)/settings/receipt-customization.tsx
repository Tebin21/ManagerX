import React, { useState, useMemo, useEffect } from 'react';
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
  Image,
  Text as RNText,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
  type DebtReceiptSettings,
  DEFAULT_SALES_RECEIPT_SETTINGS,
  DEFAULT_PURCHASE_RECEIPT_SETTINGS,
  DEFAULT_QUOTATION_RECEIPT_SETTINGS,
  DEFAULT_INVENTORY_RECEIPT_SETTINGS,
  DEFAULT_DEBT_RECEIPT_SETTINGS,
} from '@/store/settingsStore';
import { useBusinessStore } from '@/store/businessStore';
import { useLanguageStore } from '@/store/languageStore';
import { useManagementStore } from '@/store/managementStore';
import { useAuthStore } from '@/store/authStore';
import { isAdminEmail } from '@/lib/adminNotificationService';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { SETTINGS_KURDISH_FONT_BOLD, SETTINGS_KURDISH_FONT } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import { fmtIQD } from '@/utils/formatters';
import type { Sale } from '@/types/sales';

type ModuleTab = 'sales' | 'purchases' | 'quotation' | 'inventory' | 'debts';

interface PaperOption {
  id: ReceiptPaperSize;
  label: string;
  widthCm: string;
  desc: string;
  descAr: string;
  descEn: string;
}

const PAPER_OPTIONS: PaperOption[] = [
  { id: '58mm', label: '58mm', widthCm: '5.8 cm', desc: 'وەصڵی بچووک (Mobile POS)', descAr: 'وصل صغير (Mobile POS)', descEn: 'Mobile POS (58mm)' },
  { id: '80mm', label: '80mm', widthCm: '8.0 cm', desc: 'ستاندارد (Desktop POS)', descAr: 'قياسي (Desktop POS)', descEn: 'Desktop POS (80mm)' },
  { id: '110mm', label: '110mm', widthCm: '11.0 cm', desc: 'وەصڵی پان (Wide Thermal)', descAr: 'وصل عريض (Wide Thermal)', descEn: 'Wide Thermal (110mm)' },
  { id: 'A4', label: 'A4 Sheet', widthCm: '21 × 29.7 cm', desc: 'پەڕەی فەرمی (Standard A4)', descAr: 'ورقة رسمية (Standard A4)', descEn: 'Standard A4 Sheet' },
];

export default function ReceiptCustomizationScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape, contentContainerStyle, contentMaxWidth } = useResponsive();
  const { width: windowWidth } = useWindowDimensions();
  const currentLang = useLanguageStore((s) => s.language) || 'ku';
  const isAr = currentLang === 'ar';
  const isKurdish = currentLang === 'ku';
  const isKuOrAr = isKurdish || isAr;
  const business = useBusinessStore();

  const params = useLocalSearchParams<{ tab?: ModuleTab; size?: ReceiptPaperSize }>();
  const [activeTab, setActiveTab] = useState<ModuleTab>(params.tab || 'sales');

  // Employee Permissions & Manager Lock
  const isEmployee = useManagementStore((s) => s.isEmployee);
  const currentEmployeeAccount = useManagementStore((s) => s.currentEmployeeAccount);
  const currentPermissions = useManagementStore((s) => s.currentPermissions);
  const user = useAuthStore((s) => s.user);
  const isAdmin = isAdminEmail(user?.email);

  // Strict check: An account is strictly considered an employee ONLY IF:
  // 1. isEmployee flag is true
  // 2. An employee account exists
  // 3. The currently logged-in user email exactly matches the employee account email!
  // Normal accounts, store owners, and super-admins are NEVER locked.
  const isRealEmployee = Boolean(
    isEmployee &&
    currentEmployeeAccount?.email &&
    user?.email &&
    currentEmployeeAccount.email.trim().toLowerCase() === user.email.trim().toLowerCase() &&
    !isAdmin
  );

  // Normal users & managers have 100% full control. Employees are restricted unless granted permission by manager.
  const sub = currentPermissions?.subPermissions;
  const tabAllowed = !isRealEmployee || (
    activeTab === 'sales' ? (sub?.canCustomizeSalesReceipt ?? true) :
      activeTab === 'purchases' ? (sub?.canCustomizePurchaseReceipt ?? true) :
        activeTab === 'quotation' ? (sub?.canCustomizeQuotationReceipt ?? true) :
          activeTab === 'debts' ? (sub?.canCustomizeDebtReceipt ?? true) : true
  );
  const canEdit = true;
  const isLockedForEmployee = false;

  // Store bindings
  const salesPaperSize = useSettingsStore((s) => s.salesPaperSizePreference ?? '80mm');
  const purchasePaperSize = useSettingsStore((s) => s.purchasePaperSizePreference ?? '80mm');
  const inventoryPaperSize = useSettingsStore((s) => s.inventoryPaperSizePreference ?? 'A4');
  const quotationPaperSize = useSettingsStore((s) => s.quotationPaperSizePreference ?? '80mm');
  const debtPaperSize = useSettingsStore((s) => s.debtPaperSizePreference ?? '80mm');

  const setSalesPaperSize = useSettingsStore((s) => s.setSalesPaperSizePreference);
  const setPurchasePaperSize = useSettingsStore((s) => s.setPurchasePaperSizePreference);
  const setInventoryPaperSize = useSettingsStore((s) => s.setInventoryPaperSizePreference);
  const setQuotationPaperSize = useSettingsStore((s) => s.setQuotationPaperSizePreference);
  const setDebtPaperSize = useSettingsStore((s) => s.setDebtPaperSizePreference);

  useEffect(() => {
    if (params.tab) setActiveTab(params.tab);
    if (params.size) {
      if (params.tab === 'sales' || !params.tab) setSalesPaperSize(params.size);
      else if (params.tab === 'purchases') setPurchasePaperSize(params.size);
      else if (params.tab === 'inventory') setInventoryPaperSize(params.size);
      else if (params.tab === 'quotation') setQuotationPaperSize(params.size);
      else if (params.tab === 'debts') setDebtPaperSize(params.size);
    }
  }, [params.tab, params.size]);

  const salesSettings = useSettingsStore((s) => s.salesReceiptSettings ?? DEFAULT_SALES_RECEIPT_SETTINGS);
  const purchaseSettings = useSettingsStore((s) => s.purchaseReceiptSettings ?? DEFAULT_PURCHASE_RECEIPT_SETTINGS);
  const quotationSettings = useSettingsStore((s) => s.quotationReceiptSettings ?? DEFAULT_QUOTATION_RECEIPT_SETTINGS);
  const inventorySettings = useSettingsStore((s) => s.inventoryReceiptSettings ?? DEFAULT_INVENTORY_RECEIPT_SETTINGS);
  const debtSettings = useSettingsStore((s) => s.debtReceiptSettings ?? DEFAULT_DEBT_RECEIPT_SETTINGS);

  const updateSalesSettings = useSettingsStore((s) => s.setSalesReceiptSettings);
  const updatePurchaseSettings = useSettingsStore((s) => s.setPurchaseReceiptSettings);
  const updateQuotationSettings = useSettingsStore((s) => s.setQuotationReceiptSettings);
  const updateInventorySettings = useSettingsStore((s) => s.setInventoryReceiptSettings);
  const updateDebtSettings = useSettingsStore((s) => s.setDebtReceiptSettings);

  const resetSalesSettings = useSettingsStore((s) => s.resetSalesReceiptSettings);
  const resetPurchaseSettings = useSettingsStore((s) => s.resetPurchaseReceiptSettings);
  const resetQuotationSettings = useSettingsStore((s) => s.resetQuotationReceiptSettings);
  const resetInventorySettings = useSettingsStore((s) => s.resetInventoryReceiptSettings);
  const resetDebtSettings = useSettingsStore((s) => s.resetDebtReceiptSettings);

  const [isPrintingTest, setIsPrintingTest] = useState(false);

  // Active paper size based on tab
  const activePaperSize: ReceiptPaperSize = useMemo(() => {
    switch (activeTab) {
      case 'sales': return salesPaperSize;
      case 'purchases': return purchasePaperSize;
      case 'inventory': return inventoryPaperSize;
      case 'quotation': return quotationPaperSize;
      case 'debts': return debtPaperSize;
      default: return '80mm';
    }
  }, [activeTab, salesPaperSize, purchasePaperSize, inventoryPaperSize, quotationPaperSize, debtPaperSize]);

  const handleSelectPaperSize = (size: ReceiptPaperSize) => {
    if (isLockedForEmployee) {
      Alert.alert(
        isAr ? 'إشعار الإدارة' : isKurdish ? 'ئاگاداری بەڕێوەبەرایەتی' : 'Management Notice',
        isAr
          ? 'تم قفل تخصيص أحجام الورق من قبل المدير لحسابك.'
          : isKurdish
            ? 'دەسەڵاتی گۆڕینی قەبارەی وەسڵ لەلایەن بەڕێوەبەرەکەتەوە قفڵ کراوە.'
            : 'Paper size modification is locked by your supervising manager.'
      );
      return;
    }
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { }); } catch { }
    if (activeTab === 'sales') setSalesPaperSize(size);
    else if (activeTab === 'purchases') setPurchasePaperSize(size);
    else if (activeTab === 'inventory') setInventoryPaperSize(size);
    else if (activeTab === 'quotation') setQuotationPaperSize(size);
    else if (activeTab === 'debts') setDebtPaperSize(size);
  };

  const handleSwitchTab = (tab: ModuleTab) => {
    try { Haptics.selectionAsync().catch(() => { }); } catch { }
    setActiveTab(tab);
  };

  const handleResetCurrentModule = () => {
    if (isLockedForEmployee) return;
    const tabName = activeTab === 'sales'
      ? (isAr ? 'المبيعات' : isKurdish ? 'فرۆشتن' : 'Sales')
      : activeTab === 'purchases'
        ? (isAr ? 'المشتريات' : isKurdish ? 'کڕین' : 'Purchases')
        : activeTab === 'quotation'
          ? (isAr ? 'عروض الأسعار' : isKurdish ? 'عەرز' : 'Quotations')
          : activeTab === 'inventory'
            ? (isAr ? 'المخزن' : isKurdish ? 'کۆگا' : 'Inventory')
            : (isAr ? 'الديون' : isKurdish ? 'قەرز' : 'Debts');

    Alert.alert(
      isAr ? 'استعادة الإعدادات الافتراضية' : isKurdish ? 'گەڕاندنەوەی سەرەتایی' : 'Reset to Defaults',
      isKurdish
        ? `ئایا دڵنیایت لە گەڕاندنەوەی سەرجەم ڕێکخستنەکانی پسوولەی (${tabName}) بۆ دۆخی بنەڕەتی؟`
        : `Are you sure you want to reset (${tabName}) receipt settings to defaults?`,
      [
        { text: isAr ? 'إلغاء' : isKurdish ? 'پاشگەزبوونەوە' : 'Cancel', style: 'cancel' },
        {
          text: isAr ? 'نعم، استعادة' : isKurdish ? 'بەڵێ، بگەڕێنەوە' : 'Reset',
          style: 'destructive',
          onPress: () => {
            try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { }); } catch { }
            if (activeTab === 'sales') resetSalesSettings();
            else if (activeTab === 'purchases') resetPurchaseSettings();
            else if (activeTab === 'quotation') resetQuotationSettings();
            else if (activeTab === 'inventory') resetInventorySettings();
            else if (activeTab === 'debts') resetDebtSettings();
          },
        },
      ]
    );
  };

  // Mock Sales Data (Matches official A4 invoice shown in actual sales print)
  const mockSale: Sale = useMemo(() => ({
    id: 9999,
    invoiceNumber: 'F-00004',
    date: '2026/10/30',
    createdAt: '2026/10/30',
    customerName: isAr ? 'زبون مباشر' : isKurdish ? 'کڕیاری ڕاستەوخۆ' : 'Direct Customer',
    customerPhone: '',
    customerAddress: '',
    subtotal: 3370250,
    discountTotal: 50000,
    globalDiscount: 0,
    grandTotal: 3320250,
    paidAmount: 3320250,
    remainingDebt: 0,
    paymentMethod: 'cash',
    notes: isAr ? 'لا توجد ملاحظات' : isKurdish ? 'هیچ تێبینییەک نییە' : 'No notes',
    warranty: '',
    items: [
      {
        id: 1,
        saleId: 9999,
        productId: 101,
        productName: 'iPhone 15 Pro Max',
        quantity: 1,
        sellingPrice: 1450000,
        discount: 50000,
        lineTotal: 1400000,
        itemId: 'IPH-15PM',
      },
      {
        id: 2,
        saleId: 9999,
        productId: 102,
        productName: 'MacBook Air M3',
        quantity: 1,
        sellingPrice: 1550000,
        discount: 0,
        lineTotal: 1550000,
        itemId: 'MBA-M3',
      },
      {
        id: 3,
        saleId: 9999,
        productId: 103,
        productName: isAr ? 'ساعة' : isKurdish ? 'سەعات' : 'Watch',
        quantity: 1,
        sellingPrice: 85250,
        discount: 0,
        lineTotal: 85250,
        itemId: 'WAT-003',
      },
      {
        id: 4,
        saleId: 9999,
        productId: 104,
        productName: 'AirPods Pro 2',
        quantity: 1,
        sellingPrice: 285000,
        discount: 0,
        lineTotal: 285000,
        itemId: 'APP-004',
      },
    ],
  } as Sale), [isKurdish, isAr]);

  // Mock Purchase Data
  const mockPurchase = useMemo(() => ({
    purchaseNumber: 'P-00892',
    date: '2026/10/29',
    time: '11:15 AM',
    supplierName: isAr ? 'شركة علي للاستيراد والتوزيع' : isKurdish ? 'کۆمپانیای عەلی بۆ هاوردەکردن' : 'Ali Import & Distribution Co.',
    supplierPhone: '0770 123 9988',
    supplierAddress: isAr ? 'السليمانية - المنطقة الصناعية' : isKurdish ? 'سلێمانی - ناوچەی پیشەسازی' : 'Industrial Zone, Sulaymaniyah',
    subtotal: 4000,
    totalIQD: 4000,
    paidAmount: 4000,
    remainingDebt: 0,
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    warranty: '',
    notes: isAr
      ? 'تم فحص البضائع بالكامل واستلامها وإدخالها إلى المخزن الرئيسي.'
      : isKurdish
        ? 'کاڵاکان بە تەواوی وەرگیراون و داخڵی مەخزەنی سەرەکی کراون.'
        : 'All goods inspected, verified, and received into warehouse.',
    items: [
      { id: 1, name: isAr ? 'كولا علبة 330 مل' : isKurdish ? 'کۆلا قتوو ٣٣٠مل' : 'Coca-Cola Can 330ml', description: isAr ? 'مشروب غازي مثلج' : isKurdish ? 'خواردنەوەی گازی سارد' : 'Original chilled can', itemId: 'COL-330', category: isAr ? 'المشروبات' : isKurdish ? 'خواردنەوەکان' : 'Beverages', qty: 2, buyPrice: 500, total: 1000 },
      { id: 2, name: isAr ? 'شيبس دوريتوس كبير' : isKurdish ? 'چپس دوریتۆس گەورە' : 'Doritos Chips Large', description: isAr ? 'وجبة خفيفة بنكهة الجبنة' : isKurdish ? 'بە تامی پەنیری ناچۆ' : 'Nacho cheese flavored', itemId: 'DOR-BIG', category: isAr ? 'الوجبات الخفيفة' : isKurdish ? 'سووکەژەم' : 'Snacks', qty: 1, buyPrice: 1500, total: 1500 },
      { id: 3, name: isAr ? 'شوكولاتة كندر بوينو' : isKurdish ? 'شوکۆلاتە کیندەر بوێنۆ' : 'Kinder Bueno Chocolate', description: isAr ? 'ويفر مقرمش بكريمة البندق' : isKurdish ? 'شوکۆلاتەی بەندقی کریمی' : 'Crispy hazelnut wafer', itemId: 'KIN-BUE', category: isAr ? 'الحلويات' : isKurdish ? 'شیرینی' : 'Sweets', qty: 3, buyPrice: 500, total: 1500 },
    ],
  }), [isKurdish, isAr]);

  // Mock Quotation Data
  const mockQuotation = useMemo(() => ({
    quotationNumber: 'Q-2026-045',
    date: '2026/10/29',
    validityDays: 10,
    validUntil: '2026/11/08',
    customerName: isAr ? 'شركة آسو للحلول التقنية' : isKurdish ? 'کۆمپانیای ئاسۆ بۆ تەکنەلۆجیا' : 'Aso Technology Solutions',
    customerPhone: '0770 987 6543',
    customerAddress: isAr ? 'أربيل - القرية الإيطالية' : isKurdish ? 'هەولێر - گوندی ئیتاڵی' : 'Italian Village, Erbil',
    aboutPolicy: isKurdish
      ? 'سەرجەم کەلوپەلەکان ئەسڵین و گرەنتی یەک ساڵ کارکردنیان لەگەڵدایە لە بەرواری جێبەجێکردنەوە.'
      : 'All hardware products are genuine with 1-year official warranty.',
    notes: isAr
      ? '1. شروط الدفع: 50% مقدماً عند الاتفاق.\n2. التسليم: خلال 3 أيام عمل.'
      : isKurdish
        ? '١. مەرجی پارەدان: ٥٠٪ پێشەکی لە کاتی ڕێککەوتن.\n٢. گەیاندن: لە ماوەی ٣ ڕۆژی کارکردندا.'
        : '1. Payment terms: 50% advance upon contract signing.\n2. Delivery timeline: Within 3 business days.',
    subtotal: '3,125,000 IQD',
    discount: '50,000 IQD',
    grandTotalIQD: '3,075,000 IQD',
    grandTotalUSD: '$2,050.00 USD',
    items: [
      { id: 1, name: isAr ? 'لابتوب Dell XPS 15' : isKurdish ? 'لاپتۆپ Dell XPS 15' : 'Dell XPS 15 Laptop', itemId: 'DELL-XPS', qty: 2, price: '1,500,000', oldPrice: '1,550,000', discount: '50,000', total: '2,950,000' },
      { id: 2, name: isAr ? 'ماوس ولوحة مفاتيح لاسلكية' : isKurdish ? 'ماوس و کیبۆرد بێوایەر' : 'Wireless Mouse & Keyboard', itemId: 'ACC-MK', qty: 5, price: '25,000', oldPrice: null, discount: null, total: '125,000' },
    ],
  }), [isKurdish, isAr]);

  // Mock Inventory Data
  const mockInventory = useMemo(() => ({
    reportCode: 'INV-2026-089',
    date: '2026/10/29',
    time: '02:45 PM',
    warehouseName: isAr ? 'المخزن الرئيسي في السليمانية' : isKurdish ? 'کۆگای سەرەکی سلێمانی' : 'Sulaymaniyah Central Warehouse',
    stats: {
      totalItems: 18,
      totalQty: 142,
      lowStockCount: 2,
      totalValueIQD: '1,450,000 IQD',
    },
    notes: isAr
      ? 'تم إجراء الجرد الكامل للمخزن الرئيسي وهو متطابق مع النظام الإلكتروني.'
      : isKurdish
        ? 'سەرژمێری تەواوی کۆگای سەرەکی ئەنجامدرا و لەگەڵ سیستەمی ئەلیکترۆنی یەکانگیرە.'
        : 'Complete warehouse audit completed and reconciled with electronic inventory system.',
    items: [
      { id: 1, name: isAr ? 'كولا علبة 330 مل' : isKurdish ? 'کۆلا قتوو ٣٣٠مل' : 'Coca-Cola Can 330ml', itemId: 'COL-330', category: isAr ? 'المشروبات' : isKurdish ? 'خواردنەوەکان' : 'Beverages', qty: 48, buyPrice: 400, sellPrice: 500, totalValue: '19,200', supplier: isAr ? 'مورد أربيل' : isKurdish ? 'دابینکەری هەولێر' : 'Erbil Supplier Co.', status: 'available' },
      { id: 2, name: isAr ? 'شيبس دوريتوس كبير' : isKurdish ? 'چپس دوریتۆس گەورە' : 'Doritos Chips Large', itemId: 'DOR-BIG', category: isAr ? 'الوجبات الخفيفة' : isKurdish ? 'سووکەژەم' : 'Snacks', qty: 24, buyPrice: 1100, sellPrice: 1500, totalValue: '26,400', supplier: isAr ? 'شركة الاستيراد العامة' : isKurdish ? 'کۆمپانیای هاوردە' : 'Import Trade LLC', status: 'available' },
      { id: 3, name: isAr ? 'شوكولاتة كندر بوينو' : isKurdish ? 'شوکۆلاتە کیندەر بوێنۆ' : 'Kinder Bueno Chocolate', itemId: 'KIN-BUE', category: isAr ? 'الحلويات' : isKurdish ? 'شیرینی' : 'Sweets', qty: 2, buyPrice: 600, sellPrice: 750, totalValue: '1,200', supplier: isAr ? 'موزع نستله السليمانية' : isKurdish ? 'نەستلە سلێمانی' : 'Nestle Distributor', status: 'low' },
    ],
  }), [isKurdish, isAr]);

  // Unified thermal items for Live Preview across all modules
  const previewThermalItems = useMemo(() => {
    if (activeTab === 'purchases') {
      return mockPurchase.items.map((it) => ({
        id: it.id,
        productName: it.name,
        barcode: it.itemId,
        quantity: it.qty,
        price: `${it.buyPrice.toLocaleString()} IQD`,
        rawPrice: it.buyPrice,
        discount: 0,
        lineTotal: `${it.total.toLocaleString()} IQD`,
      }));
    }
    if (activeTab === 'quotation') {
      return mockQuotation.items.map((it) => ({
        id: it.id,
        productName: it.name,
        barcode: it.itemId,
        quantity: it.qty,
        price: `${String(it.price).replace(/ IQD/g, '')} IQD`,
        rawPrice: typeof it.price === 'number' ? it.price : Number(String(it.price).replace(/[^0-9]/g, '')),
        discount: it.discount ? Number(String(it.discount).replace(/[^0-9]/g, '')) : 0,
        lineTotal: `${String(it.total).replace(/ IQD/g, '')} IQD`,
      }));
    }
    return (mockSale.items ?? []).map((it) => ({
      id: it.id,
      productName: it.productName,
      barcode: it.itemId || (it as any).barcode,
      quantity: it.quantity,
      price: `${it.sellingPrice.toLocaleString()} IQD`,
      rawPrice: it.sellingPrice,
      discount: it.discount || 0,
      lineTotal: `${it.lineTotal.toLocaleString()} IQD`,
    }));
  }, [activeTab, mockPurchase.items, mockQuotation.items, mockSale.items]);

  const handleTestPrint = async () => {
    setIsPrintingTest(true);
    const testBiz = {
      name: displayBizName,
      phone: business.phone || '0770 000 0000',
      address: displayBizAddress,
      logoUri: business.logoUri ?? null,
    };

    try {
      if (activeTab === 'sales') {
        if (activePaperSize === 'A4') {
          const { directPrintInvoice } = await import('@/lib/generateInvoice');
          await directPrintInvoice(mockSale, testBiz, 'iqd', 'A4');
        } else {
          const { directPrintThermalInvoice } = await import('@/lib/generateInvoice');
          await directPrintThermalInvoice(
            mockSale,
            testBiz,
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
            supplierName: isAr ? 'شركة علي للاستيراد والتوزيع' : isKurdish ? 'کۆمپانیای عەلی بۆ هاوردەکردن' : 'Ali Import & Distribution Co.',
            supplierPhone: '0770 123 9988',
            supplierAddress: isAr ? 'أربيل - شورش' : isKurdish ? 'هەولێر - شۆڕش' : 'Shorish, Erbil',
            productName: isAr ? 'زيت زيتون 5 لتر' : isKurdish ? 'زەیتی زەیتوون ٥ لیتری' : 'Olive Oil 5L',
            category: isAr ? 'المواد الغذائية' : isKurdish ? 'خۆراک' : 'Food',
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
            warranty: isAr ? 'صالح حتى 2027' : isKurdish ? 'بەکارهێنان تا ٢٠٢٧' : 'Valid until 2027',
            description: null,
            notes: isAr ? 'وصل استلام البضائع في المخزن الرئيسي' : isKurdish ? 'وەسڵی کڕینی کاڵا لە کۆگای سەرەکی' : 'Goods received in main warehouse',
            paymentStatus: 'paid',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          [
            { productName: isAr ? 'زيت زيتون 5 لتر' : isKurdish ? 'زەیتی زەیتوون ٥ لیتری' : 'Olive Oil 5L', category: isAr ? 'المواد الغذائية' : isKurdish ? 'خۆراک' : 'Food', quantity: 10, buyPriceIQD: 22000, lineTotalIQD: 220000, idType: 'custom', itemIds: ['OIL-5L'] },
            { productName: isAr ? 'أرز كوردي درجة أولى' : isKurdish ? 'برنجی کوردی پلە یەک' : 'Premium Kurdish Rice', category: isAr ? 'المواد الغذائية' : isKurdish ? 'خۆراک' : 'Food', quantity: 5, buyPriceIQD: 34000, lineTotalIQD: 170000, idType: 'custom', itemIds: ['RICE-KRD'] },
          ],
          testBiz
        );
      } else if (activeTab === 'quotation') {
        const { directPrintQuotationInvoice } = await import('@/lib/generateInvoice');
        await directPrintQuotationInvoice(
          {
            id: 'Q-01',
            quotationNumber: 'Q-2026-045',
            customerName: isAr ? 'شركة آسو للحلول التقنية' : isKurdish ? 'کۆمپانیای ئاسۆ بۆ تەکنەلۆجیا' : 'Aso Technology Solutions',
            customerPhone: '0750 999 1122',
            date: new Date().toISOString().split('T')[0],
            time: '02:45 PM',
            validityDays: 10,
            notes: isAr ? 'تخضع الأسعار لتغيرات سعر صرف الدولار في السوق.' : isKurdish ? 'نرخەکان گۆڕانکارییان بەسەردا دێت بەپێی بەهای دۆلار لە بازاڕدا.' : 'Prices subject to market exchange rate changes.',
            aboutPolicy: isAr ? 'تقدم جميع المواد بضمان رسمي لمدة 1 سنة.' : isKurdish ? 'هەموو کاڵاکان بە گەرەنتی فەرمی ١ ساڵ پێشکەش دەکرێن.' : 'All items supplied with 1-year official warranty.',
            subtotal: 3125000,
            discountTotal: 50000,
            grandTotal: 3075000,
            exchangeRate: 1500,
            createdAt: new Date().toISOString(),
            items: [
              { id: '1', productId: 1, productName: isAr ? 'لابتوب Dell XPS 15' : isKurdish ? 'لاپتۆپ Dell XPS 15' : 'Dell XPS 15 Laptop', quantity: 2, unitPrice: 1500000, discount: 50000, lineTotal: 2900000, itemId: 'DELL-XPS' },
              { id: '2', productId: 2, productName: isAr ? 'ماوس ولوحة مفاتيح لاسلكية' : isKurdish ? 'ماوس و کیبۆرد بێوایەر' : 'Wireless Mouse & Keyboard', quantity: 5, unitPrice: 35000, discount: 0, lineTotal: 175000, itemId: 'ACC-MK' },
            ],
          },
          testBiz,
          'both',
          activePaperSize
        );
      } else if (activeTab === 'inventory') {
        const { shareFullInventoryReport } = await import('@/lib/generateInvoice');
        await shareFullInventoryReport(
          [
            { id: 1, name: isAr ? 'حليب نيدو حجم كبير' : isKurdish ? 'شیر نیدۆ گەورە' : 'Nido Milk Powder Large', category: isAr ? 'المواد الغذائية' : isKurdish ? 'خۆراک' : 'Food', quantity: 45, buyPrice: 18000, sellingPrice: 22000, itemId: 'NID-2500', supplier: isAr ? 'شركة نستله' : isKurdish ? 'کۆمپانیای نەستلە' : 'Nestle Co.', status: isAr ? 'متوفر' : isKurdish ? 'لەبارە' : 'In Stock', lowStockThreshold: 5 } as any,
            { id: 2, name: isAr ? 'قهوة نسكافيه كلاسيك' : isKurdish ? 'قاوەی نەسکافێ کلاسیک' : 'Nescafe Classic Coffee', category: isAr ? 'مشروبات' : isKurdish ? 'خواردنەوە' : 'Beverages', quantity: 3, buyPrice: 8500, sellingPrice: 11000, itemId: 'NES-CL', supplier: isAr ? 'شركة الاستيراد' : isKurdish ? 'کۆمپانیای هاوردە' : 'Import Trade', status: isAr ? 'مخزون منخفض' : isKurdish ? 'کەمبوون' : 'Low Stock', lowStockThreshold: 5 } as any,
            { id: 3, name: isAr ? 'جبن كرافت 500 غرام' : isKurdish ? 'پەنیر کرافت ٥٠٠گم' : 'Kraft Cheese 500g', category: isAr ? 'ألبان' : isKurdish ? 'شیرەمەنی' : 'Dairy', quantity: 28, buyPrice: 4250, sellingPrice: 5500, itemId: 'KRF-500', supplier: isAr ? 'مورد أربيل' : isKurdish ? 'دابینکەری هەولێر' : 'Erbil Supplier', status: isAr ? 'متوفر' : isKurdish ? 'لەبارە' : 'In Stock', lowStockThreshold: 5 } as any,
          ],
          testBiz,
          true,
          5,
          isAr ? 'التقرير العام للمخزن' : isKurdish ? 'ڕاپۆرتی گشتی کۆگا' : 'General Inventory Report'
        );
      } else if (activeTab === 'debts') {
        const { shareSalesDebtReport } = await import('@/lib/generateInvoice');
        await shareSalesDebtReport(
          {
            id: 999,
            saleId: 9999,
            customerName: isAr ? 'أرام محمد' : isKurdish ? 'ئارام محەمەد' : 'Aram Mohammed',
            customerPhone: '0750 123 4567',
            customerAddress: isAr ? 'السليمانية - شارع سالم' : isKurdish ? 'سلێمانی - شەقامی سالم' : 'Sulaymaniyah - Salim St.',
            totalDebt: 500000,
            remainingDebt: 300000,
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
            status: 'partial',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as any,
          [
            { id: 1, debtId: 999, debtType: 'sales', amount: 100000, remainingAfter: 400000, paymentMethod: 'Cash', note: isAr ? 'دفعة نقدية أولى' : isKurdish ? 'پارەی یەکەم بە نەختینە' : '1st Cash installment', createdAt: '2026-10-20T10:00:00Z' },
            { id: 2, debtId: 999, debtType: 'sales', amount: 100000, remainingAfter: 300000, paymentMethod: 'FIB', note: isAr ? 'تحويل إلكتروني' : isKurdish ? 'حەواڵەی بانکی FIB' : 'Bank Transfer', createdAt: '2026-10-29T14:45:00Z' },
          ],
          testBiz
        );
      }
    } catch (err) {
      console.error('[ReceiptCustomization] Test print error:', err);
      Alert.alert(
        isAr ? 'خطأ في الطباعة' : isKurdish ? 'هەڵە لە پرینت' : 'Print Error',
        isAr ? 'تعذر طباعة مستند الاختبار.' : isKurdish ? 'نەتوانرا وەسڵەکە چاپ بکرێت.' : 'Failed to print test document.'
      );
    } finally {
      setIsPrintingTest(false);
    }
  };

  // Preview card width - beautifully responsive for Phones, iPad Portrait and iPad Landscape
  const previewCardWidth = useMemo(() => {
    if (activePaperSize === '58mm') {
      return isTablet ? 360 : Math.min(270, windowWidth - 48);
    }
    if (activePaperSize === '80mm') {
      return isTablet ? 460 : Math.min(320, windowWidth - 36);
    }
    if (activePaperSize === '110mm') {
      return isTablet ? 560 : Math.min(360, windowWidth - 28);
    }
    // A4 Sheet Preview
    return isTablet
      ? isTabletLandscape
        ? Math.min(780, (contentMaxWidth || 1000) - 48)
        : Math.min(680, windowWidth - 64)
      : Math.min(380, windowWidth - 24);
  }, [activePaperSize, isTablet, isTabletLandscape, contentMaxWidth, windowWidth]);

  // Generic Toggle Renderer
  const renderToggleRow = (
    title: string,
    sub: string | undefined,
    isChecked: boolean,
    onToggle: () => void,
    icon: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline'
  ) => {
    const handlePress = () => {
      if (isLockedForEmployee) {
        Alert.alert(
          isAr ? 'إشعار الإدارة' : isKurdish ? 'ئاگاداری بەڕێوەبەرایەتی' : 'Management Notice',
          isAr
            ? 'تم قفل تعديل خيارات الفواتير من قبل المدير لحسابك.'
            : isKurdish
              ? 'دەسەڵاتی دەستکاریکردنی ئەم بڕگەیە لەلایەن بەڕێوەبەرەکەتەوە قفڵ کراوە.'
              : 'Editing receipt fields is locked by your supervising manager.'
        );
        return;
      }
      onToggle();
    };

    return (
      <TouchableOpacity
        key={title}
        activeOpacity={isLockedForEmployee ? 0.9 : 0.7}
        onPress={handlePress}
        style={[
          styles.switchRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
          isTablet && { paddingVertical: 15 },
          isLockedForEmployee && { opacity: 0.75 },
        ]}
      >
        <View style={[styles.switchRowLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }, isTablet && { gap: 14 }]}>
          <View
            style={[
              styles.switchRowIcon,
              {
                backgroundColor: isChecked
                  ? hexToRgba(colors.primary, isDark ? 0.25 : 0.14)
                  : (isDark ? 'rgba(255,255,255,0.06)' : colors.gray100),
                width: isTablet ? 42 : 32,
                height: isTablet ? 42 : 32,
                borderRadius: isTablet ? 12 : 8,
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={isTablet ? 22 : 18}
              color={isChecked ? colors.primary : colors.gray400}
            />
          </View>
          <View style={styles.switchRowTextCol}>
            <Text
              style={[
                styles.switchRowTitle,
                { color: colors.black, textAlign },
                isTablet && { fontSize: 16 },
                isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {title}
            </Text>
            {sub ? (
              <Text
                style={[
                  styles.switchRowSub,
                  { color: colors.gray400, textAlign },
                  isTablet && { fontSize: 13, marginTop: 2 },
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {sub}
              </Text>
            ) : null}
          </View>
        </View>

        <Switch
          value={isChecked}
          disabled={isLockedForEmployee}
          onValueChange={handlePress}
          style={isTablet ? { transform: [{ scaleX: 1.15 }, { scaleY: 1.15 }] } : undefined}
          trackColor={{ false: isDark ? '#334155' : '#E2E8F0', true: colors.primary }}
          thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
        />
      </TouchableOpacity>
    );
  };

  const defaultBizName = isAr ? 'أسواق فروشيار' : isKurdish ? 'مارکێتی فرۆشیار' : 'Froshiar Market';
  const defaultBizAddress = isAr ? 'الشارع الرئيسي، أربيل' : isKurdish ? 'شەقامی سەرەکی، هەولێر' : 'Main Street, Erbil';
  const displayBizName = business.name || defaultBizName;
  const displayBizAddress = business.address || defaultBizAddress;

  const getSalesFooterNote = () => {
    const note = salesSettings.customFooterNote;
    if (!note || (!isKurdish && note.includes('سەردانەکەتان'))) {
      return isAr ? 'شكراً لزيارتكم • أهلاً وسهلاً بكم دائماً' : isKurdish ? 'سوپاس بۆ سەردانەکەتان • هەمیشە بەخێربێن.' : 'Thank you for your visit • Always welcome';
    }
    return note;
  };

  const getPurchaseFooterNote = () => {
    const note = purchaseSettings.customFooterNote;
    if (!note || (!isKurdish && (note.includes('وەسڵی کڕین') || note.includes('کاڵاکان')))) {
      return isAr ? 'وصل شراء وتوريد البضائع في النظام' : isKurdish ? 'وەسڵی کڕین و تۆمارکردنی کاڵاکان لە سیستەم' : 'Goods received and recorded in warehouse system';
    }
    return note;
  };

  const getQuotationFooterNote = () => {
    const note = quotationSettings.customFooterNote;
    if (!note || (!isKurdish && (note.includes('ئەم عەرزە') || note.includes('مەرجی پارەدان')))) {
      return isAr
        ? '1. شروط الدفع: 50% مقدماً عند الاتفاق.\n2. التسليم: خلال 3 أيام عمل.'
        : isKurdish
          ? '١. مەرجی پارەدان: ٥٠٪ پێشەکی لە کاتی ڕێککەوتن.\n٢. گەیاندن: لە ماوەی ٣ ڕۆژی کارکردندا.'
          : '1. Payment: 50% advance upon agreement.\n2. Delivery: within 3 working days.';
    }
    return note;
  };

  const getInventoryFooterNote = () => {
    const note = inventorySettings.customFooterNote;
    if (!note || (!isKurdish && (note.includes('سەرژمێری') || note.includes('کۆگا')))) {
      return isAr ? 'تم إنجاز الجرد الشامل للمخزن ومطابقته مع النظام.' : isKurdish ? 'سەرژمێری تەواوی کۆگای سەرەکی ئەنجامدرا و لەگەڵ سیستەمی ئەلیکترۆنی یەکانگیرە.' : 'Full warehouse audit completed and reconciled with system.';
    }
    return note;
  };

  const getDebtFooterNote = () => {
    const note = debtSettings.customFooterNote;
    if (!note || (!isKurdish && (note.includes('وەسڵ') || note.includes('قەرز')))) {
      return isAr ? 'سند قبض ودفعات حساب الديون الموثقة' : isKurdish ? 'پسوولەی فەرمی وەرگرتنی پارە و تۆماری قەرز' : 'Official debt payment and account receipt';
    }
    return note;
  };

  const monogram = (displayBizName || 'F').trim().charAt(0).toUpperCase() || 'F';

  // 1. Sales A4 Preview (Exact replica of official sales receipt from lib/invoiceTemplate.ts)
  const renderSalesA4Preview = () => (
    <View style={[styles.a4SheetReal, { width: previewCardWidth }]}>
      {/* 3-Column Header (Business Left | Customer Center | Invoice Info Right) */}
      <View style={[styles.a4HeaderCols, { flexDirection: 'row' }]}>
        {/* Col 1: Business (Left) */}
        <View style={styles.a4ColBusiness}>
          <View style={styles.a4LogoFrame}>
            {business.logoUri ? (
              <Image source={{ uri: business.logoUri }} style={styles.a4LogoImg} resizeMode="contain" />
            ) : (
              <View style={styles.a4LogoMono}>
                <Text style={styles.a4LogoMonoText}>{monogram}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.a4BizName, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]} numberOfLines={1}>
            {displayBizName}
          </Text>
          {salesSettings.showBusinessAddress && (
            <Text style={styles.a4BizMeta} numberOfLines={1}>{displayBizAddress}</Text>
          )}
          {salesSettings.showBusinessPhone && (
            <Text style={styles.a4BizMeta}>{business.phone || '0770 000 0000'}</Text>
          )}
        </View>

        {/* Col 2: Customer (Center) */}
        <View style={styles.a4ColCustomer}>
          <Text style={[styles.a4ColLabelTag, { textAlign: isRTL ? 'right' : 'left' }]}>
            {isAr ? 'الزبون' : isKurdish ? 'کڕیار' : 'CUSTOMER'}
          </Text>
          {salesSettings.showCustomerName && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'الاسم:' : isKurdish ? 'ناو:' : 'Name:'}</Text>
              <Text style={styles.a4RowVal} numberOfLines={1}>{mockSale.customerName}</Text>
            </View>
          )}
          {salesSettings.showCustomerPhone && !!mockSale.customerPhone && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'الهاتف:' : isKurdish ? 'تەلەفۆن:' : 'Phone:'}</Text>
              <RNText style={[styles.a4RowVal, { direction: 'ltr' }]} numberOfLines={1}>{mockSale.customerPhone}</RNText>
            </View>
          )}
          {salesSettings.showBusinessAddress && !!mockSale.customerAddress && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'العنوان:' : isKurdish ? 'ناونیشان:' : 'Address:'}</Text>
              <Text style={styles.a4RowVal} numberOfLines={1}>{mockSale.customerAddress}</Text>
            </View>
          )}
        </View>

        {/* Col 3: Invoice Info (Right) */}
        <View style={styles.a4ColInvoice}>
          <Text style={[styles.a4InvTypeLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
            {isAr ? 'فاتورة مبيعات' : isKurdish ? 'پسوولەی فرۆشتن' : 'SALES INVOICE'}
          </Text>
          {salesSettings.showInvoiceNumber && (
            <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'رقم الفاتورة' : isKurdish ? 'ژمارەی پسوولە' : 'Invoice #:'}</Text>
              <RNText style={[styles.a4RowVal, { fontWeight: '800' }]}>{mockSale.invoiceNumber}</RNText>
            </View>
          )}
          {salesSettings.showDate && (
            <>
              <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.a4RowLabel}>{isAr ? 'التاريخ:' : isKurdish ? 'بەروار:' : 'Date:'}</Text>
                <RNText style={styles.a4RowVal}>Oct 30, 2026</RNText>
              </View>
              <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.a4RowLabel}>{isAr ? 'الوقت:' : isKurdish ? 'کات:' : 'Time:'}</Text>
                <RNText style={styles.a4RowVal}>2:07 PM</RNText>
              </View>
            </>
          )}
          {salesSettings.showPaymentMethod && (
            <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 3 }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'الحالة:' : isKurdish ? 'دۆخ:' : 'Status:'}</Text>
              <View style={[styles.a4StatusPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={[styles.a4StatusPillText, { color: '#047857' }]}>
                  {isAr ? 'مدفوع' : isKurdish ? 'پارەدراوە' : 'Paid'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Top Summary Pair (Side-by-side above table: Left = Payment Summary | Right = Notes) */}
      <View style={[styles.a4TopSummaryPair, { flexDirection: 'row' }]}>
        {/* Left: Financial Card (پوختەی پارەدان) */}
        <View style={styles.a4SummaryCard}>
          <Text style={[styles.a4CardLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
            {isAr ? 'ملخص الدفع' : isKurdish ? 'پوختەی پارەدان' : 'PAYMENT SUMMARY'}
          </Text>
          <View style={[styles.a4FinRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.a4FinLabel}>{isAr ? 'المجموع الأولي:' : isKurdish ? 'کۆی سەرەتایی' : 'Subtotal:'}</Text>
            <RNText style={styles.a4FinVal}>{fmtIQD(mockSale.subtotal)} IQD</RNText>
          </View>
          {salesSettings.showDiscount && (mockSale.discountTotal > 0 || mockSale.globalDiscount > 0) && (
            <View style={[styles.a4FinRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.a4FinLabel, { color: '#000000', fontWeight: '700' }]}>{isAr ? 'الخصم:' : isKurdish ? 'داشکاندن:' : 'Discount:'}</Text>
              <RNText style={[styles.a4FinVal, { color: '#000000', fontWeight: '700' }]}>− {fmtIQD(mockSale.discountTotal + mockSale.globalDiscount)} IQD</RNText>
            </View>
          )}
          <View style={styles.a4TotalBlock}>
            <View style={[styles.a4TotalBlockRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4TotalBlockLabel}>{isAr ? 'المجموع الكلي (IQD)' : isKurdish ? 'کۆی گشتی (IQD)' : 'Grand Total (IQD)'}</Text>
              <RNText style={styles.a4TotalBlockAmount}>{fmtIQD(mockSale.grandTotal)} IQD</RNText>
            </View>
          </View>
        </View>

        {/* Right: Notes Card (تێبینی) */}
        {salesSettings.showNotes && (
          <View style={styles.a4SummaryCard}>
            <Text style={[styles.a4CardLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
              {isAr ? 'ملاحظات' : isKurdish ? 'تێبینی' : 'NOTES'}
            </Text>
            <Text style={[styles.a4NotesWarrantyText, { textAlign: isRTL ? 'right' : 'left', marginBottom: 6 }]}>
              {mockSale.notes}
            </Text>
            <View style={styles.a4NotesDivider} />
            <Text style={[styles.a4NotesWarrantyText, { textAlign: isRTL ? 'right' : 'left', color: '#64748B' }]} numberOfLines={2}>
              {getSalesFooterNote()}
            </Text>
          </View>
        )}
      </View>

      {/* Items Table (Exact Columns: # | کاڵا | ئایدی کاڵا | بڕ | نرخی یەکە | داشکاندن | کۆی گشتی) */}
      <View style={styles.a4TableWrap}>
        <View style={[styles.a4TableHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.a4Th, { width: '4%', textAlign: 'center' }]} numberOfLines={1}>#</Text>
          <Text style={[styles.a4Th, { width: '30%', textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{isAr ? 'المادة' : isKurdish ? 'کاڵا' : 'Product'}</Text>
          <Text style={[styles.a4Th, { width: '12%', textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'رمز المادة' : isKurdish ? 'ئایدی کاڵا' : 'Code'}</Text>
          <Text style={[styles.a4Th, { width: '8%', textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'الكمية' : isKurdish ? 'بڕ' : 'Qty'}</Text>
          <Text style={[styles.a4Th, { width: '16%', textAlign: isRTL ? 'left' : 'right' }]} numberOfLines={1}>{isAr ? 'سعر الوحدة' : isKurdish ? 'نرخی یەکە' : 'Price'}</Text>
          <Text style={[styles.a4Th, { width: '12%', textAlign: isRTL ? 'left' : 'right' }]} numberOfLines={1}>{isAr ? 'الخصم' : isKurdish ? 'داشکاندن' : 'Disc.'}</Text>
          <Text style={[styles.a4Th, { width: '18%', textAlign: isRTL ? 'left' : 'right' }]} numberOfLines={1}>{isAr ? 'المجموع' : isKurdish ? 'کۆی گشتی' : 'Total'}</Text>
        </View>

        {(mockSale.items ?? []).map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.a4TableRow,
              idx % 2 === 1 && { backgroundColor: '#F8FAFC' },
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <RNText style={[styles.a4TdNum, { width: '4%', textAlign: 'center' }]}>{idx + 1}</RNText>
            <View style={{ width: '30%' }}>
              <Text style={styles.a4ItemName} numberOfLines={1}>{item.productName}</Text>
              {item.itemDescription ? (
                <Text style={styles.a4ItemDesc} numberOfLines={1}>{item.itemDescription}</Text>
              ) : null}
            </View>
            <View style={{ width: '12%', alignItems: 'center', justifyContent: 'center' }}>
              {salesSettings.showItemBarcode && item.itemId && item.itemId !== '—' ? (
                <RNText style={styles.a4IdChip} numberOfLines={1}>
                  {item.itemId}
                </RNText>
              ) : (
                <RNText style={[styles.a4Td, { textAlign: 'center', color: '#94A3B8' }]} numberOfLines={1}>
                  —
                </RNText>
              )}
            </View>
            <RNText style={[styles.a4TdNum, { width: '8%', textAlign: 'center', fontWeight: '700' }]}>{item.quantity}</RNText>
            <View style={{ width: '16%', alignItems: isRTL ? 'flex-start' : 'flex-end', justifyContent: 'center' }}>
              {salesSettings.showDiscount && item.discount > 0 ? (
                <>
                  <RNText style={[styles.a4TdAmount, { textAlign: isRTL ? 'left' : 'right', fontWeight: '700', color: '#000000' }]} numberOfLines={1}>
                    {fmtIQD(item.sellingPrice - item.discount)} IQD
                  </RNText>
                  <RNText style={{ fontSize: 7, color: '#64748B', textDecorationLine: 'line-through', textAlign: isRTL ? 'left' : 'right' }} numberOfLines={1}>
                    {fmtIQD(item.sellingPrice)} IQD
                  </RNText>
                </>
              ) : (
                <RNText style={[styles.a4TdAmount, { textAlign: isRTL ? 'left' : 'right', fontWeight: '700', color: '#000000' }]} numberOfLines={1}>
                  {fmtIQD(item.sellingPrice)} IQD
                </RNText>
              )}
            </View>
            <RNText style={[styles.a4Td, { width: '12%', textAlign: isRTL ? 'left' : 'right', color: '#000000', fontWeight: '700' }]} numberOfLines={1}>
              {salesSettings.showDiscount && item.discount > 0 ? `− ${fmtIQD(item.discount)}` : '—'}
            </RNText>
            <RNText style={[styles.a4TdAmountBold, { width: '18%', textAlign: isRTL ? 'left' : 'right', color: '#000000', fontWeight: '700' }]} numberOfLines={1}>
              {fmtIQD(item.lineTotal)} IQD
            </RNText>
          </View>
        ))}
      </View>

      {/* Signatures (Customer Signature Right | Store Stamp & Signature Left) */}
      {salesSettings.showSignature !== false && (
        <View style={[styles.a4SignaturesRow, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 18, marginBottom: 12 }]}>
          <View style={[styles.a4SigCol, { width: 130, alignItems: 'center' }]}>
            <View style={styles.a4SigLine} />
            <Text style={styles.a4SigLabel}>
              {isAr ? 'توقيع الزبون / المستلم' : isKurdish ? 'واژووی کڕیار / وەرگر' : 'Customer Signature'}
            </Text>
          </View>
          <View style={[styles.a4SigCol, { width: 130, alignItems: 'center' }]}>
            <View style={styles.a4SigLine} />
            <Text style={styles.a4SigLabel}>
              {isAr ? 'ختم وتوقيع المتجر' : isKurdish ? 'مۆر و واژووی فرۆشگا' : 'Store Stamp & Signature'}
            </Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.a4BrandCredit}>
        {`F-00004 · www.froshiar.store · ${isAr ? 'فاتورة مبيعات · تم التطوير بواسطة Froshiar' : isKurdish ? 'پسوولەی فرۆشتن · دروستکراوە لەلایەن Froshiar' : 'Sales Invoice · Developed by Froshiar'}`}
      </Text>
    </View>
  );

  // 2. Purchases A4 Preview (Matches lib/invoiceTemplate.ts buildPurchaseCSS / buildPurchaseInvoiceHTML)
  const renderPurchasesA4Preview = () => (
    <View style={[styles.a4SheetReal, { width: previewCardWidth }]}>
      {/* 3-Column Header */}
      <View style={[styles.a4HeaderCols, { flexDirection: 'row' }]}>
        {/* Col 1: Business */}
        <View style={styles.a4ColBusiness}>
          <View style={styles.a4LogoFrame}>
            {business.logoUri ? (
              <Image source={{ uri: business.logoUri }} style={styles.a4LogoImg} resizeMode="contain" />
            ) : (
              <View style={styles.a4LogoMono}>
                <Text style={styles.a4LogoMonoText}>{monogram}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.a4BizName, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]} numberOfLines={1}>
            {displayBizName}
          </Text>
          {purchaseSettings.showBusinessAddress && (
            <Text style={styles.a4BizMeta} numberOfLines={1}>{displayBizAddress}</Text>
          )}
          {purchaseSettings.showBusinessPhone && (
            <Text style={styles.a4BizMeta}>{business.phone || '0770 000 0000'}</Text>
          )}
        </View>

        {/* Col 2: Supplier */}
        <View style={styles.a4ColCustomer}>
          <Text style={styles.a4ColLabelTag}>{isAr ? 'المورد' : isKurdish ? 'دابینکەر' : 'SUPPLIER'}</Text>
          {purchaseSettings.showSupplierName && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'المورد:' : isKurdish ? 'دابینکەر:' : 'Supplier:'}</Text>
              <Text style={styles.a4RowVal} numberOfLines={1}>{mockPurchase.supplierName}</Text>
            </View>
          )}
          {purchaseSettings.showSupplierPhone && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'الهاتف:' : isKurdish ? 'تەلەفۆن:' : 'Phone:'}</Text>
              <Text style={[styles.a4RowVal, { direction: 'ltr' }]} numberOfLines={1}>{mockPurchase.supplierPhone}</Text>
            </View>
          )}
          {purchaseSettings.showBusinessAddress && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'العنوان:' : isKurdish ? 'ناونیشان:' : 'Address:'}</Text>
              <Text style={styles.a4RowVal} numberOfLines={1}>{mockPurchase.supplierAddress}</Text>
            </View>
          )}
        </View>

        {/* Col 3: Invoice Info */}
        <View style={styles.a4ColInvoice}>
          <Text style={styles.a4InvTypeLabel}>{isAr ? 'وصل شراء' : isKurdish ? 'وەسڵی کڕین' : 'PURCHASE VOUCHER'}</Text>
          {purchaseSettings.showInvoiceNumber && (
            <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4InvMetaTitle}>#{mockPurchase.purchaseNumber}</Text>
            </View>
          )}
          {purchaseSettings.showDate && (
            <>
              <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.a4RowLabel}>{isAr ? 'التاريخ:' : isKurdish ? 'بەروار:' : 'Date:'}</Text>
                <Text style={styles.a4RowVal} numberOfLines={1}>{mockPurchase.date}</Text>
              </View>
              <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.a4RowLabel}>{isAr ? 'الوقت:' : isKurdish ? 'کات:' : 'Time:'}</Text>
                <Text style={styles.a4RowVal} numberOfLines={1}>{mockPurchase.time}</Text>
              </View>
            </>
          )}
          {purchaseSettings.showPaymentMethod && (
            <View style={[styles.a4StatusPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Text style={[styles.a4StatusPillText, { color: '#047857' }]}>
                {isAr ? '● مدفوع (نقداً)' : isKurdish ? '● پارەدراو (کاش)' : '● PAID (CASH)'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Procurement Policy Card */}
      {purchaseSettings.showAboutPolicy !== false && (
        <View style={styles.a4PolicyCard}>
          <Text style={styles.a4PolicyLabel}>{isAr ? 'سياسة الشراء والاستلام' : isKurdish ? 'سیاسەتی وەرگرتن و کڕین' : 'PROCUREMENT POLICY'}</Text>
          <Text style={styles.a4PolicyText}>
            {isAr
              ? 'تم استلام كافة المواد وفقاً لفاتورة المورد الرسمية وتم إدخالها إلى نظام المخزن.'
              : isKurdish
                ? 'سەرجەم کاڵاکان بەپێی فاکتوورەی فەرمی دابینکەر وەرگیراون و داخڵی سیستەمی کۆگا کراون.'
                : 'Goods received according to supplier official invoice and registered in warehouse.'}
          </Text>
        </View>
      )}

      {/* Top Summary Pair */}
      <View style={[styles.a4TopSummaryPair, { flexDirection: 'row' }]}>
        {/* Left: Financial Card */}
        <View style={styles.a4SummaryCard}>
          <Text style={styles.a4CardLabel}>{isAr ? 'ملخص الشراء المالي' : isKurdish ? 'پوختەی دارایی کڕین' : 'PURCHASE SUMMARY'}</Text>
          <View style={styles.a4FinRow}>
            <Text style={styles.a4FinLabel}>{isAr ? 'إجمالي التكلفة:' : isKurdish ? 'کۆی تێچوو:' : 'Subtotal:'}</Text>
            <Text style={styles.a4FinVal}>4,000 IQD</Text>
          </View>
          <View style={styles.a4TotalBlock}>
            <View style={[styles.a4TotalBlockRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4TotalBlockLabel}>{isAr ? 'إجمالي تكلفة الشراء (IQD)' : isKurdish ? 'کۆی گشتی کڕین' : 'Total Cost (IQD)'}</Text>
              <Text style={styles.a4TotalBlockAmount}>4,000 IQD</Text>
            </View>
            <View style={styles.a4TotalDivider} />
            <View style={[styles.a4TotalBlockRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4TotalBlockSub}>{isAr ? 'المجموع الكلي بالدولار' : isKurdish ? 'کۆی گشتی بە دۆلار' : 'Total in USD'}</Text>
              <Text style={styles.a4TotalBlockSubAmount}>$3.05 USD</Text>
            </View>
          </View>
          {purchaseSettings.showPaymentMethod && (
            <View style={styles.a4FinRow}>
              <Text style={styles.a4FinLabel}>{isAr ? 'طريقة السداد:' : isKurdish ? 'شێوازی دران:' : 'Payment:'}</Text>
              <Text style={styles.a4FinVal}>{isAr ? 'نقداً' : isKurdish ? 'کاش (نەقد)' : 'Cash'}</Text>
            </View>
          )}
          {purchaseSettings.showPaidAmount !== false && (
            <View style={styles.a4FinRow}>
              <Text style={[styles.a4FinLabel, { color: '#047857', fontWeight: '700' }]}>{isAr ? 'المقدمة المدفوعة:' : isKurdish ? 'پێشەکیی دراو:' : 'Down Payment:'}</Text>
              <Text style={[styles.a4FinVal, { color: '#047857', fontWeight: '700' }]}>1,000 IQD</Text>
            </View>
          )}
          {purchaseSettings.showRemainingDebt && (
            <View style={styles.a4FinRow}>
              <Text style={styles.a4FinLabel}>{isAr ? 'الدين المتبقي:' : isKurdish ? 'قەرزی ماوە:' : 'Remaining Debt:'}</Text>
              <Text style={[styles.a4FinVal, { color: '#047857', fontWeight: '700' }]}>0 IQD</Text>
            </View>
          )}
        </View>

        {/* Right: Notes Card */}
        {purchaseSettings.showNotes && (
          <View style={styles.a4SummaryCard}>
            <Text style={styles.a4CardLabel}>{isAr ? 'ملاحظات الشراء' : isKurdish ? 'تێبینیەکانی کڕین' : 'PURCHASE NOTES'}</Text>
            {Boolean(mockPurchase.warranty && mockPurchase.warranty.trim()) && (
              <>
                <Text style={styles.a4NotesWarrantyTitle}>{isAr ? 'ضمان المورد:' : isKurdish ? 'گرەنتی دابینکەر:' : 'Supplier Warranty:'}</Text>
                <Text style={styles.a4NotesWarrantyText}>{mockPurchase.warranty}</Text>
                <View style={styles.a4NotesDivider} />
              </>
            )}
            <Text style={styles.a4NotesWarrantyTitle}>{isAr ? 'ملاحظات الفحص والاستلام:' : isKurdish ? 'تێبینی و پشکنین:' : 'Inspection Notes:'}</Text>
            <Text style={styles.a4NotesWarrantyText} numberOfLines={3}>
              {getPurchaseFooterNote()}
            </Text>
          </View>
        )}
      </View>

      {/* Items Table */}
      <View style={styles.a4TableWrap}>
        <View style={[styles.a4TableHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.a4Th, { width: '4%', textAlign: 'center' }]} numberOfLines={1}>#</Text>
          <Text style={[styles.a4Th, { width: '28%', textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{isAr ? 'المادة' : isKurdish ? 'کاڵا' : 'Product'}</Text>
          <Text style={[styles.a4Th, { width: '12%', textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'رمز المادة' : isKurdish ? 'ئایدی کاڵا' : 'Item ID'}</Text>
          <Text style={[styles.a4Th, { width: '14%', textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'التصنيف' : isKurdish ? 'هاوپۆل' : 'Cat.'}</Text>
          <Text style={[styles.a4Th, { width: '6%', textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'الكمية' : isKurdish ? 'بڕ' : 'Qty'}</Text>
          <Text style={[styles.a4Th, { width: '16%', textAlign: isRTL ? 'left' : 'right' }]} numberOfLines={1}>{isAr ? 'التكلفة' : isKurdish ? 'تێچوو' : 'Cost'}</Text>
          <Text style={[styles.a4Th, { width: '20%', textAlign: isRTL ? 'left' : 'right' }]} numberOfLines={1}>{isAr ? 'المجموع' : isKurdish ? 'کۆ' : 'Total'}</Text>
        </View>

        {mockPurchase.items.map((item, idx) => (
          <View key={item.id} style={[styles.a4TableRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <RNText style={[styles.a4TdNum, { width: '4%', textAlign: 'center' }]}>{idx + 1}</RNText>
            <View style={{ width: '28%' }}>
              <Text style={styles.a4ItemName} numberOfLines={1}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.a4ItemDesc} numberOfLines={1}>{item.description}</Text>
              ) : null}
            </View>
            <View style={{ width: '12%', alignItems: 'center', justifyContent: 'center' }}>
              {purchaseSettings.showItemBarcode && item.itemId && item.itemId !== '—' ? (
                <RNText style={styles.a4IdChip} numberOfLines={1}>
                  {item.itemId}
                </RNText>
              ) : (
                <RNText style={[styles.a4Td, { textAlign: 'center', color: '#94A3B8' }]} numberOfLines={1}>
                  —
                </RNText>
              )}
            </View>
            <RNText style={[styles.a4Td, { width: '14%', textAlign: 'center', color: '#64748B' }]} numberOfLines={1}>{item.category}</RNText>
            <RNText style={[styles.a4TdNum, { width: '6%', textAlign: 'center', fontWeight: '700' }]}>{item.qty}</RNText>
            <View style={{ width: '16%', alignItems: isRTL ? 'flex-start' : 'flex-end', justifyContent: 'center' }}>
              <RNText style={[styles.a4TdAmount, { textAlign: isRTL ? 'left' : 'right' }]} numberOfLines={1}>{fmtIQD(item.buyPrice)}</RNText>
            </View>
            <RNText style={[styles.a4TdAmountBold, { width: '20%', textAlign: isRTL ? 'left' : 'right' }]} numberOfLines={1}>{fmtIQD(item.total)} IQD</RNText>
          </View>
        ))}
      </View>

      {/* Signatures */}
      {purchaseSettings.showSignature !== false && (
        <View style={[styles.a4SignaturesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.a4SigCol}>
            <View style={styles.a4SigLine} />
            <Text style={styles.a4SigLabel}>{isAr ? 'توقيع مستلم المخزن' : isKurdish ? 'واژووی وەرگری مەخزەن' : 'Warehouse Receiver'}</Text>
          </View>
          <View style={styles.a4SigCol}>
            <View style={styles.a4SigLine} />
            <Text style={styles.a4SigLabel}>{isAr ? 'توقيع مسؤول المشتريات' : isKurdish ? 'واژووی سەرپەرشتیاری کڕین' : 'Procurement Manager'}</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.a4BrandCredit}>
        {isAr ? 'وصل شراء · نظام فروشيار · www.froshiar.store · #P-00892' : isKurdish ? 'وەسڵی کڕین · سیستەمی فرۆشیار · www.froshiar.store · #P-00892' : 'Purchase Voucher · Powered by Froshiar · www.froshiar.store · #P-00892'}
      </Text>
    </View>
  );

  // 3. Quotation A4 Preview (Matches lib/quotationTemplate.ts buildQuotationHTML)
  const renderQuotationA4Preview = () => (
    <View style={[styles.a4SheetReal, { width: previewCardWidth }]}>
      {/* Official Proposal Banner */}
      <View style={[styles.a4ProposalBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
        <Text style={styles.a4ProposalBannerText}>
          {isAr
            ? 'عرض سعر رسمي • مقدم حسب طلبكم الكريم للمدة المحددة'
            : isKurdish
              ? 'عەرزی نرخی فەرمی • پێشکەشکراوە بە پێی داواکاری بەڕێزتان بۆ ماوەی دیاریکراو'
              : 'Official Price Proposal • Submitted according to client request for specified validity'}
        </Text>
      </View>

      {/* 3-Column Header */}
      <View style={[styles.a4HeaderCols, { flexDirection: 'row' }]}>
        {/* Col 1: Business */}
        <View style={styles.a4ColBusiness}>
          <View style={styles.a4LogoFrame}>
            {business.logoUri ? (
              <Image source={{ uri: business.logoUri }} style={styles.a4LogoImg} resizeMode="contain" />
            ) : (
              <View style={styles.a4LogoMono}>
                <Text style={styles.a4LogoMonoText}>{monogram}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.a4BizName, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]} numberOfLines={1}>
            {displayBizName}
          </Text>
          {quotationSettings.showBusinessAddress && (
            <Text style={styles.a4BizMeta} numberOfLines={1}>{displayBizAddress}</Text>
          )}
          {quotationSettings.showBusinessPhone && (
            <Text style={styles.a4BizMeta}>{business.phone || '0770 000 0000'}</Text>
          )}
        </View>

        {/* Col 2: Client */}
        <View style={styles.a4ColCustomer}>
          <Text style={styles.a4ColLabelTag}>{isAr ? 'إلى المحترم / الشركة' : isKurdish ? 'بۆ بەڕێز' : 'PROPOSAL TO'}</Text>
          {quotationSettings.showCustomerName && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'الزبون:' : isKurdish ? 'کڕیار:' : 'Client:'}</Text>
              <Text style={styles.a4RowVal} numberOfLines={1}>{mockQuotation.customerName}</Text>
            </View>
          )}
          {quotationSettings.showCustomerPhone && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'الهاتف:' : isKurdish ? 'تەلەفۆن:' : 'Phone:'}</Text>
              <Text style={[styles.a4RowVal, { direction: 'ltr' }]}>{mockQuotation.customerPhone}</Text>
            </View>
          )}
          {quotationSettings.showBusinessAddress && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'العنوان:' : isKurdish ? 'ناونیشان:' : 'Address:'}</Text>
              <Text style={styles.a4RowVal} numberOfLines={1}>{mockQuotation.customerAddress}</Text>
            </View>
          )}
        </View>

        {/* Col 3: Quotation Meta & Validity Box */}
        <View style={styles.a4ColInvoice}>
          <Text style={styles.a4InvTypeLabel}>{isAr ? 'عرض أسعار' : isKurdish ? 'عەرزی نرخ' : 'PRICE QUOTATION'}</Text>
          {quotationSettings.showQuotationNumber && (
            <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4InvMetaTitle}>#{mockQuotation.quotationNumber}</Text>
            </View>
          )}
          {quotationSettings.showDate && (
            <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'التاريخ:' : isKurdish ? 'بەروار:' : 'Date:'}</Text>
              <Text style={styles.a4RowVal}>{mockQuotation.date}</Text>
            </View>
          )}
          {/* Validity Box */}
          {quotationSettings.showValidUntil && (
            <View style={styles.a4ValidityDoubleBox}>
              <Text style={styles.a4ValidityLabel}>{isAr ? 'الصلاحية' : isKurdish ? 'ماوەی کارایی' : 'VALIDITY'}</Text>
              <Text style={styles.a4ValidityValue}>{isAr ? '10 أيام' : isKurdish ? '١٠ ڕۆژ' : '10 Days'}</Text>
              <Text style={styles.a4ValiditySub}>{isAr ? `حتى: ${mockQuotation.validUntil}` : isKurdish ? `تاکو: ${mockQuotation.validUntil}` : `Until: ${mockQuotation.validUntil}`}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Policy Card */}
      {quotationSettings.showAboutPolicy && (
        <View style={styles.a4PolicyCard}>
          <Text style={styles.a4PolicyLabel}>{isAr ? 'حول سياسة وضمان المشروع' : isKurdish ? 'دەربارەی سیاسەت و گرەنتی پڕۆژە' : 'PROJECT POLICY & WARRANTY'}</Text>
          <Text style={styles.a4PolicyText}>
            {isAr
              ? 'كافة المواد أصلية وتتمتع بضمان لمدة سنة واحدة من تاريخ التركيب والتنفيذ.'
              : isKurdish
                ? 'سەرجەم کەرەستەکان ئەسڵین و گرەنتی یەک ساڵ کارکردنیان لەگەڵدایە لە بەرواری جێبەجێکردنەوە.'
                : 'All products are authentic with 1-year warranty from date of installation.'}
          </Text>
        </View>
      )}

      {/* Top Summary Pair */}
      <View style={[styles.a4TopSummaryPair, { flexDirection: 'row' }]}>
        {/* Left: Financial Card */}
        <View style={styles.a4SummaryCard}>
          <Text style={styles.a4CardLabel}>{isAr ? 'الملخص المالي للعرض' : isKurdish ? 'پوختەی دارایی پێشنیار' : 'PROPOSAL FINANCIALS'}</Text>
          <View style={styles.a4FinRow}>
            <Text style={styles.a4FinLabel}>{isAr ? 'إجمالي المواد:' : isKurdish ? 'کۆی گشتی کاڵاکان:' : 'Subtotal:'}</Text>
            <Text style={styles.a4FinVal}>{mockQuotation.subtotal}</Text>
          </View>
          {quotationSettings.showDiscount && (
            <View style={styles.a4FinRow}>
              <Text style={[styles.a4FinLabel, { color: '#D97706', fontWeight: '700' }]}>{isAr ? 'خصم المشروع:' : isKurdish ? 'داشکاندنی پڕۆژە:' : 'Discount:'}</Text>
              <Text style={[styles.a4FinVal, { color: '#D97706', fontWeight: '700' }]}>− {mockQuotation.discount}</Text>
            </View>
          )}
          <View style={styles.a4TotalBlock}>
            <View style={[styles.a4TotalBlockRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4TotalBlockLabel}>{isAr ? 'المجموع الكلي المقترح' : isKurdish ? 'کۆی گشتی پێشنیارکراو' : 'Grand Total'}</Text>
              <Text style={styles.a4TotalBlockAmount}>{mockQuotation.grandTotalIQD}</Text>
            </View>
            <View style={styles.a4TotalDivider} />
            <View style={[styles.a4TotalBlockRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4TotalBlockSub}>{isAr ? 'القيمة التقديرية بالدولار' : isKurdish ? 'بەهای تەقریبی بە دۆلار' : 'Approx. in USD'}</Text>
              <Text style={styles.a4TotalBlockSubAmount}>{mockQuotation.grandTotalUSD}</Text>
            </View>
          </View>
        </View>

        {/* Right: Terms Card */}
        {quotationSettings.showNotes && (
          <View style={styles.a4SummaryCard}>
            <Text style={styles.a4CardLabel}>{isAr ? 'الشروط والأحكام' : isKurdish ? 'مەرج و ڕێساکانی عەرز' : 'TERMS & CONDITIONS'}</Text>
            <Text style={styles.a4NotesWarrantyText} numberOfLines={4}>
              {getQuotationFooterNote()}
            </Text>
          </View>
        )}
      </View>

      {/* Items Table */}
      <View style={styles.a4TableWrap}>
        <View style={[styles.a4TableHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.a4Th, { flex: 0.35, textAlign: 'center' }]} numberOfLines={1}>#</Text>
          <Text style={[styles.a4Th, { flex: 2.1, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{isAr ? 'المادة (الوصف)' : isKurdish ? 'کاڵا (وەسف)' : 'Product'}</Text>
          {quotationSettings.showItemBarcode && (
            <Text style={[styles.a4Th, { flex: 0.95, textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'الرمز' : isKurdish ? 'کۆد' : 'Code'}</Text>
          )}
          {quotationSettings.showQty && (
            <Text style={[styles.a4Th, { flex: 0.55, textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'الكمية' : isKurdish ? 'بڕ' : 'Qty'}</Text>
          )}
          {quotationSettings.showItemPrice && (
            <Text style={[styles.a4Th, { flex: 1.1, textAlign: 'right' }]} numberOfLines={1}>{isAr ? 'السعر' : isKurdish ? 'نرخ' : 'Price'}</Text>
          )}
          {quotationSettings.showDiscount && (
            <Text style={[styles.a4Th, { flex: 0.95, textAlign: 'right' }]} numberOfLines={1}>{isAr ? 'الخصم' : isKurdish ? 'داشکاندن' : 'Disc.'}</Text>
          )}
          <Text style={[styles.a4Th, { flex: 1.25, textAlign: 'right' }]} numberOfLines={1}>{isAr ? 'المجموع الكلي' : isKurdish ? 'کۆی گشتی' : 'Total'}</Text>
        </View>

        {mockQuotation.items.map((item, idx) => (
          <View key={item.id} style={[styles.a4TableRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.a4Td, { flex: 0.35, textAlign: 'center' }]}>{idx + 1}</Text>
            <View style={{ flex: 2.1 }}>
              <Text style={styles.a4ItemName} numberOfLines={1}>{item.name}</Text>
            </View>
            {quotationSettings.showItemBarcode && (
              <View style={{ flex: 0.95, alignItems: 'center' }}>
                <Text style={styles.a4IdChip} numberOfLines={1}>{item.itemId}</Text>
              </View>
            )}
            {quotationSettings.showQty && <Text style={[styles.a4Td, { flex: 0.55, textAlign: 'center' }]}>{item.qty}</Text>}
            {quotationSettings.showItemPrice && (
              <View style={{ flex: 1.1, alignItems: 'flex-end', justifyContent: 'center' }}>
                {quotationSettings.showDiscount && item.oldPrice ? (
                  <>
                    <Text style={styles.a4StrikethroughPrice}>{item.oldPrice}</Text>
                    <Text style={[styles.a4Td, { fontWeight: '700' }]} numberOfLines={1}>{item.price}</Text>
                  </>
                ) : (
                  <Text style={[styles.a4Td, { fontWeight: '700' }]} numberOfLines={1}>{item.price}</Text>
                )}
              </View>
            )}
            {quotationSettings.showDiscount && (
              <Text style={[styles.a4Td, { flex: 0.95, textAlign: 'right', color: item.discount ? '#D97706' : '#94A3B8', fontWeight: item.discount ? '700' : '400' }]} numberOfLines={1}>
                {item.discount ? `− ${item.discount}` : '—'}
              </Text>
            )}
            <Text style={[styles.a4Td, { flex: 1.25, textAlign: 'right', fontWeight: '700' }]} numberOfLines={1}>{item.total}</Text>
          </View>
        ))}
      </View>

      {/* Stamp & Signatures */}
      {quotationSettings.showSignature && (
        <View style={[styles.a4SignaturesRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>
          <View style={styles.a4SigCol}>
            <View style={styles.a4SigLine} />
            <Text style={styles.a4SigLabel}>{isAr ? 'توقيع وقبول العميل' : isKurdish ? 'واژووی کڕیار / پەسەندکردن' : 'Client Acceptance'}</Text>
          </View>

          {/* Authentic Circular Company Stamp Graphic */}
          <View style={styles.a4StampSeal}>
            <View style={styles.a4StampInner}>
              <Text style={styles.a4StampBizText}>{business.name || (isAr ? 'فروشيار' : isKurdish ? 'فرۆشیار' : 'Froshiar')}</Text>
              <Text style={styles.a4StampApprovedText}>★ APPROVED ★</Text>
              <Text style={styles.a4StampSubText}>{isAr ? 'الختم الرسمي' : isKurdish ? 'مۆری فەرمی پڕۆژە' : 'OFFICIAL SEAL'}</Text>
            </View>
            <View style={[styles.a4SigLine, { marginTop: 4 }]} />
            <Text style={styles.a4SigLabel}>{isAr ? 'ختم وتوقيع الشركة' : isKurdish ? 'واژوو و مۆری کۆمپانیا' : 'Company Seal & Signature'}</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.a4BrandCredit}>
        {isAr ? 'عرض أسعار · نظام فروشيار الرسمي · www.froshiar.store · #Q-2026-045' : isKurdish ? 'عەرزی نرخ · سیستەمی فەرمی فرۆشیار · www.froshiar.store · #Q-2026-045' : 'Price Quotation · Powered by Froshiar · www.froshiar.store · #Q-2026-045'}
      </Text>
    </View>
  );

  // 4. Inventory A4 Preview (Matches lib/inventoryPDFReports.ts / lib/inventoryReportTemplate.ts)
  const renderInventoryA4Preview = () => (
    <View style={[styles.a4SheetReal, { width: previewCardWidth }]}>
      {/* Inventory Header */}
      {inventorySettings.showBusinessHeader && (
        <View style={[styles.a4HeaderCols, { flexDirection: 'row' }]}>
          <View style={styles.a4ColBusiness}>
            <View style={styles.a4LogoFrame}>
              {business.logoUri ? (
                <Image source={{ uri: business.logoUri }} style={styles.a4LogoImg} resizeMode="contain" />
              ) : (
                <View style={styles.a4LogoMono}>
                  <Text style={styles.a4LogoMonoText}>{monogram}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.a4BizName, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]} numberOfLines={1}>
              {displayBizName}
            </Text>
            <Text style={styles.a4BizMeta}>{mockInventory.warehouseName}</Text>
            <Text style={styles.a4BizMeta}>{business.phone || '0770 000 0000'}</Text>
          </View>

          <View style={styles.a4ColInvoice}>
            <Text style={styles.a4InvTypeLabel}>{isAr ? 'تقرير الجرد الشامل للمخزن' : isKurdish ? 'ڕاپۆرتی سەرژمێری و کۆگای گشتی' : 'FULL INVENTORY AUDIT'}</Text>
            <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4InvMetaTitle}>#{mockInventory.reportCode}</Text>
            </View>
            {inventorySettings.showDate && (
              <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.a4RowLabel}>{isAr ? 'التاريخ:' : isKurdish ? 'بەروار:' : 'Date:'}</Text>
                <Text style={styles.a4RowVal}>{mockInventory.date} - {mockInventory.time}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 4 KPI Metric Cards */}
      {inventorySettings.showStatsCards !== false && (
        <View style={[styles.a4KpiRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.a4KpiCard}>
            <Text style={styles.a4KpiLabel}>{isAr ? 'إجمالي المواد' : isKurdish ? 'کۆی کاڵاکان' : 'Total Items'}</Text>
            <Text style={styles.a4KpiVal}>{mockInventory.stats.totalItems}</Text>
          </View>
          <View style={styles.a4KpiCard}>
            <Text style={styles.a4KpiLabel}>{isAr ? 'المتوفر في المخزن' : isKurdish ? 'کۆی عەدەد' : 'In Stock'}</Text>
            <Text style={styles.a4KpiVal}>{mockInventory.stats.totalQty} {isAr ? 'قطعة' : isKurdish ? 'دانە' : 'Units'}</Text>
          </View>
          <View style={[styles.a4KpiCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Text style={[styles.a4KpiLabel, { color: '#92400E' }]}>{isAr ? 'مخزون منخفض' : isKurdish ? 'کەمبووەوە' : 'Low Stock'}</Text>
            <Text style={[styles.a4KpiVal, { color: '#B45309' }]}>{mockInventory.stats.lowStockCount} ⚠️</Text>
          </View>
          <View style={styles.a4KpiCard}>
            <Text style={styles.a4KpiLabel}>{isAr ? 'إجمالي القيمة' : isKurdish ? 'بەهای گشتی' : 'Total Value'}</Text>
            <Text style={[styles.a4KpiVal, { fontSize: 10 }]} numberOfLines={1}>{mockInventory.stats.totalValueIQD}</Text>
          </View>
        </View>
      )}

      {/* Inventory Audit Table */}
      <View style={styles.a4TableWrap}>
        <View style={[styles.a4TableHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.a4Th, { flex: 0.35, textAlign: 'center' }]} numberOfLines={1}>#</Text>
          <Text style={[styles.a4Th, { flex: 1.7, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{isAr ? 'المادة' : isKurdish ? 'کاڵا' : 'Product'}</Text>
          {inventorySettings.showItemId && <Text style={[styles.a4Th, { flex: 0.75, textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'الرمز' : isKurdish ? 'کۆد' : 'ID'}</Text>}
          {inventorySettings.showCategory && <Text style={[styles.a4Th, { flex: 0.85, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{isAr ? 'التصنيف' : isKurdish ? 'هاوپۆل' : 'Cat.'}</Text>}
          {inventorySettings.showQuantity && <Text style={[styles.a4Th, { flex: 0.6, textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'الكمية' : isKurdish ? 'بڕ' : 'Qty'}</Text>}
          {inventorySettings.showBuyPrice && <Text style={[styles.a4Th, { flex: 0.8, textAlign: 'right' }]} numberOfLines={1}>{isAr ? 'التكلفة' : isKurdish ? 'تێچوو' : 'Cost'}</Text>}
          {inventorySettings.showSellPrice && <Text style={[styles.a4Th, { flex: 0.8, textAlign: 'right' }]} numberOfLines={1}>{isAr ? 'البيع' : isKurdish ? 'فرۆشتن' : 'Sell'}</Text>}
          {inventorySettings.showTotalValue && <Text style={[styles.a4Th, { flex: 0.9, textAlign: 'right' }]} numberOfLines={1}>{isAr ? 'القيمة' : isKurdish ? 'بەها' : 'Value'}</Text>}
          {inventorySettings.showStatus && <Text style={[styles.a4Th, { flex: 1.15, textAlign: 'center' }]} numberOfLines={1}>{isAr ? 'الحالة' : isKurdish ? 'دۆخ' : 'Status'}</Text>}
        </View>

        {mockInventory.items.map((item, idx) => (
          <View key={item.id} style={[styles.a4TableRow, idx % 2 === 1 && { backgroundColor: '#F8FAFC' }, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.a4Td, { flex: 0.35, textAlign: 'center' }]}>{idx + 1}</Text>
            <View style={{ flex: 1.7 }}>
              <Text style={styles.a4ItemName} numberOfLines={1}>{item.name}</Text>
              {inventorySettings.showSupplier && (
                <Text style={styles.a4ItemSupplier} numberOfLines={1}>{item.supplier}</Text>
              )}
            </View>
            {inventorySettings.showItemId && (
              <View style={{ flex: 0.75, alignItems: 'center' }}>
                <Text style={styles.a4IdChip} numberOfLines={1}>{item.itemId}</Text>
              </View>
            )}
            {inventorySettings.showCategory && <Text style={[styles.a4Td, { flex: 0.85, color: '#64748B' }]} numberOfLines={1}>{item.category}</Text>}
            {inventorySettings.showQuantity && <Text style={[styles.a4Td, { flex: 0.6, textAlign: 'center', fontWeight: '700' }]} numberOfLines={1}>{item.qty}</Text>}
            {inventorySettings.showBuyPrice && <Text style={[styles.a4Td, { flex: 0.8, textAlign: 'right' }]} numberOfLines={1}>{item.buyPrice}</Text>}
            {inventorySettings.showSellPrice && <Text style={[styles.a4Td, { flex: 0.8, textAlign: 'right' }]} numberOfLines={1}>{item.sellPrice}</Text>}
            {inventorySettings.showTotalValue && <Text style={[styles.a4Td, { flex: 0.9, textAlign: 'right', fontWeight: '700' }]} numberOfLines={1}>{item.totalValue}</Text>}
            {inventorySettings.showStatus && (
              <View style={{ flex: 1.15, alignItems: 'center' }}>
                <View style={[styles.a4InvStatusBadge, item.status === 'low' ? styles.a4InvStatusLow : styles.a4InvStatusOk]}>
                  <Text style={[styles.a4InvStatusText, item.status === 'low' ? { color: '#B45309' } : { color: '#047857' }]} numberOfLines={1}>
                    {item.status === 'low' ? (isAr ? 'منخفض ⚠️' : isKurdish ? 'کەمبوون ⚠️' : 'Low ⚠️') : (isAr ? 'متوفر' : isKurdish ? 'بەردەست' : 'In Stock')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Warehouse Audit Note */}
      {inventorySettings.showNotes && (
        <View style={styles.a4PolicyCard}>
          <Text style={styles.a4PolicyLabel}>{isAr ? 'ملاحظات وتقرير الجرد' : isKurdish ? 'تێبینی و ڕاپۆرتی سەرژمێری' : 'INVENTORY AUDIT NOTES'}</Text>
          <Text style={styles.a4PolicyText}>
            {getInventoryFooterNote()}
          </Text>
        </View>
      )}

      {/* Signatures */}
      {inventorySettings.showSignatureArea !== false && (
        <View style={[styles.a4SignaturesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.a4SigCol}>
            <View style={styles.a4SigLine} />
            <Text style={styles.a4SigLabel}>{isAr ? 'توقيع أمين المخزن' : isKurdish ? 'واژووی چاودێری کۆگا' : 'Warehouse Keeper'}</Text>
          </View>
          <View style={styles.a4SigCol}>
            <View style={styles.a4SigLine} />
            <Text style={styles.a4SigLabel}>{isAr ? 'توقيع مشرف الجرد' : isKurdish ? 'واژووی سەرپەرشتیاری سەرژمێری' : 'Audit Supervisor'}</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.a4BrandCredit}>
        {isAr ? 'تقرير جرد المخزن · نظام فروشيار · www.froshiar.store' : isKurdish ? 'ڕاپۆرتی سەرژمێری کۆگا · سیستەمی فرۆشیار · www.froshiar.store' : 'Inventory Audit Report · Powered by Froshiar · www.froshiar.store'}
      </Text>
    </View>
  );

  // 5. Debts A4 Preview (Matches lib/debtReportTemplate.ts)
  const renderDebtsA4Preview = () => (
    <View style={[styles.a4SheetReal, { width: previewCardWidth }]}>
      {/* 3-Column Header */}
      <View style={[styles.a4HeaderCols, { flexDirection: 'row' }]}>
        {/* Col 1: Business */}
        <View style={styles.a4ColBusiness}>
          <View style={styles.a4LogoFrame}>
            {business.logoUri ? (
              <Image source={{ uri: business.logoUri }} style={styles.a4LogoImg} resizeMode="contain" />
            ) : (
              <View style={styles.a4LogoMono}>
                <Text style={styles.a4LogoMonoText}>{monogram}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.a4BizName, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]} numberOfLines={1}>
            {displayBizName}
          </Text>
          {debtSettings.showBusinessAddress && (
            <Text style={styles.a4BizMeta} numberOfLines={1}>{displayBizAddress}</Text>
          )}
          {debtSettings.showBusinessPhone && (
            <Text style={styles.a4BizMeta}>{business.phone || '0770 000 0000'}</Text>
          )}
        </View>

        {/* Col 2: Customer / Debtor */}
        <View style={styles.a4ColCustomer}>
          <Text style={styles.a4ColLabelTag}>{isAr ? 'المدين' : isKurdish ? 'قەرزدار' : 'DEBTOR'}</Text>
          {debtSettings.showCustomerName && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'الاسم:' : isKurdish ? 'ناو:' : 'Name:'}</Text>
              <Text style={styles.a4RowVal} numberOfLines={1}>{mockSale.customerName}</Text>
            </View>
          )}
          {debtSettings.showCustomerPhone && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'الهاتف:' : isKurdish ? 'تەلەفۆن:' : 'Phone:'}</Text>
              <Text style={[styles.a4RowVal, { direction: 'ltr' }]} numberOfLines={1}>0750 123 4567</Text>
            </View>
          )}
          {debtSettings.showBusinessAddress && (
            <View style={[styles.a4InfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4RowLabel}>{isAr ? 'العنوان:' : isKurdish ? 'ناونیشان:' : 'Address:'}</Text>
              <Text style={styles.a4RowVal} numberOfLines={1}>{mockSale.customerAddress}</Text>
            </View>
          )}
        </View>

        {/* Col 3: Document Info */}
        <View style={styles.a4ColInvoice}>
          <Text style={styles.a4InvTypeLabel}>{isAr ? 'كشف حساب الديون' : isKurdish ? 'کەشف حیسابی قەرز' : 'DEBT STATEMENT'}</Text>
          {debtSettings.showInvoiceNumber && (
            <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.a4InvMetaTitle}>#D-00412</Text>
            </View>
          )}
          {debtSettings.showDate && (
            <>
              <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.a4RowLabel}>{isAr ? 'التاريخ:' : isKurdish ? 'بەروار:' : 'Date:'}</Text>
                <Text style={styles.a4RowVal} numberOfLines={1}>2026/10/29</Text>
              </View>
              <View style={[styles.a4InvMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.a4RowLabel}>{isAr ? 'الوقت:' : isKurdish ? 'کات:' : 'Time:'}</Text>
                <Text style={styles.a4RowVal} numberOfLines={1}>02:45 PM</Text>
              </View>
            </>
          )}
          <View style={[styles.a4StatusPill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
            <Text style={[styles.a4StatusPillText, { color: '#B45309' }]}>
              {isAr ? '● رصيد قيد المتابعة' : isKurdish ? '● قەرزی بەردەوام' : '● ACTIVE BALANCE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Top Summary Pair */}
      <View style={[styles.a4TopSummaryPair, { flexDirection: 'row' }]}>
        {/* Left: Financial Card */}
        <View style={styles.a4SummaryCard}>
          <Text style={styles.a4CardLabel}>{isAr ? 'خلاصة الحساب المالي' : isKurdish ? 'پوختەی حیسابی دارایی' : 'DEBT ACCOUNT SUMMARY'}</Text>
          {debtSettings.showTotalDebt && (
            <View style={styles.a4FinRow}>
              <Text style={styles.a4FinLabel}>{isAr ? 'إجمالي الدين:' : isKurdish ? 'کۆی قەرز:' : 'Total Debt:'}</Text>
              <Text style={styles.a4FinVal}>500,000 IQD</Text>
            </View>
          )}
          {debtSettings.showPaidAmount && (
            <View style={styles.a4FinRow}>
              <Text style={[styles.a4FinLabel, { color: '#16A34A', fontWeight: '700' }]}>{isAr ? 'المبلغ المسدد:' : isKurdish ? 'بڕی دراو / واصل:' : 'Paid Amount:'}</Text>
              <Text style={[styles.a4FinVal, { color: '#16A34A', fontWeight: '700' }]}>− 200,000 IQD</Text>
            </View>
          )}
          {debtSettings.showRemainingDebt && (
            <View style={styles.a4TotalBlock}>
              <View style={[styles.a4TotalBlockRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.a4TotalBlockLabel}>{isAr ? 'الرصيد المتبقي (IQD)' : isKurdish ? 'قەرزی ماوە (IQD)' : 'Remaining Balance'}</Text>
                <Text style={styles.a4TotalBlockAmount}>300,000 IQD</Text>
              </View>
              <View style={styles.a4TotalDivider} />
              <View style={[styles.a4TotalBlockRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.a4TotalBlockSub}>{isAr ? 'الرصيد بالدولار' : isKurdish ? 'ماوە بە دۆلار' : 'Remaining USD'}</Text>
                <Text style={styles.a4TotalBlockSubAmount}>$200.00 USD</Text>
              </View>
            </View>
          )}
          {debtSettings.showPaymentMethod && (
            <View style={styles.a4FinRow}>
              <Text style={styles.a4FinLabel}>{isAr ? 'شێوازی پارەدان:' : isKurdish ? 'شێوازی پارەدان:' : 'Payment Method:'}</Text>
              <Text style={styles.a4FinVal}>{isAr ? 'نقداً (Cash)' : isKurdish ? 'کاش (نەختینە)' : 'Cash'}</Text>
            </View>
          )}
        </View>

        {/* Right: Notes & Policy Card */}
        {debtSettings.showNotes && (
          <View style={styles.a4SummaryCard}>
            <Text style={styles.a4CardLabel}>{isAr ? 'الملاحظات وسند التعهد' : isKurdish ? 'تێبینی و مەرجی قەرز' : 'TERMS & NOTES'}</Text>
            <Text style={styles.a4NotesWarrantyTitle}>{isAr ? 'تعهد السداد:' : isKurdish ? 'بەڵێننامەی گەڕاندنەوە:' : 'Commitment:'}</Text>
            <Text style={styles.a4NotesWarrantyText}>
              {isAr
                ? 'يتعهد الزبون بسداد الرصيد المتبقي وفق الجداول المتفق عليها رسمياً.'
                : isKurdish
                  ? 'کڕیار بەڵێن دەدات باڵانسی ماوە لە کاتی دیاریکراودا بگەڕێنێتەوە بەپێی ڕێککەوتن.'
                  : 'Debtor agrees to settle the remaining balance on or before the due date.'}
            </Text>
            <View style={styles.a4NotesDivider} />
            <Text style={styles.a4NotesWarrantyTitle}>{isAr ? 'الملاحظات:' : isKurdish ? 'تێبینیەکان:' : 'Notes:'}</Text>
            <Text style={styles.a4NotesWarrantyText} numberOfLines={3}>
              {getDebtFooterNote()}
            </Text>
          </View>
        )}
      </View>

      {/* Debt Payments History Table */}
      <View style={styles.a4TableWrap}>
        <View style={[styles.a4TableHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.a4Th, { flex: 0.35, textAlign: 'center' }]} numberOfLines={1}>#</Text>
          <Text style={[styles.a4Th, { flex: 1.5, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{isAr ? 'التاريخ والوقت' : isKurdish ? 'بەروار و کات' : 'Date & Time'}</Text>
          <Text style={[styles.a4Th, { flex: 1.4, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{isAr ? 'نوع الحركة' : isKurdish ? 'جۆری جووڵە' : 'Transaction'}</Text>
          <Text style={[styles.a4Th, { flex: 1.1, textAlign: 'right' }]} numberOfLines={1}>{isAr ? 'المبلغ' : isKurdish ? 'بڕی پارە' : 'Amount'}</Text>
          <Text style={[styles.a4Th, { flex: 1.25, textAlign: 'right' }]} numberOfLines={1}>{isAr ? 'الرصيد المتبقي' : isKurdish ? 'باڵانسی ماوە' : 'Balance'}</Text>
        </View>

        {[
          { num: '1', date: '2026/10/15 - 11:30 AM', desc: isAr ? 'فاتورة بيع (#F-00120)' : isKurdish ? 'وەسڵی فرۆشتن (#F-00120)' : 'Sale Inv (#F-00120)', amount: '+500,000 IQD', balance: '500,000 IQD', isPaid: false },
          { num: '2', date: '2026/10/22 - 04:15 PM', desc: isAr ? 'دفعة نقدية (سند قبض)' : isKurdish ? 'پارەدانی کاش (وەسڵ)' : 'Cash Payment', amount: '− 100,000 IQD', balance: '400,000 IQD', isPaid: true },
          { num: '3', date: '2026/10/29 - 02:45 PM', desc: isAr ? 'تحويل مصرفي (FIB)' : isKurdish ? 'حەواڵەی بانکی FIB' : 'Bank Transfer', amount: '− 100,000 IQD', balance: '300,000 IQD', isPaid: true },
        ].map((row, idx) => (
          <View
            key={row.num}
            style={[
              styles.a4TableRow,
              idx % 2 === 1 && { backgroundColor: '#F8FAFC' },
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Text style={[styles.a4Td, { flex: 0.35, textAlign: 'center' }]}>{row.num}</Text>
            <Text style={[styles.a4Td, { flex: 1.5, fontSize: 8 }]}>{row.date}</Text>
            <Text style={[styles.a4Td, { flex: 1.4, fontWeight: '600' }]} numberOfLines={1}>{row.desc}</Text>
            <Text style={[styles.a4Td, { flex: 1.1, textAlign: 'right', fontWeight: '700', color: row.isPaid ? '#16A34A' : '#DC2626' }]}>
              {row.amount}
            </Text>
            <Text style={[styles.a4Td, { flex: 1.25, textAlign: 'right', fontWeight: '800', color: colors.primary }]}>
              {row.balance}
            </Text>
          </View>
        ))}
      </View>

      {/* Stamp & Signatures */}
      {debtSettings.showSignature && (
        <View style={[styles.a4SignaturesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.a4SigCol}>
            <View style={styles.a4SigLine} />
            <Text style={styles.a4SigLabel}>{isAr ? 'توقيع المستلم / العميل' : isKurdish ? 'واژووی کڕیار / وەرگر' : 'Client / Receiver Signature'}</Text>
          </View>
          <View style={styles.a4SigCol}>
            <View style={styles.a4SigLine} />
            <Text style={styles.a4SigLabel}>{isAr ? 'ختم وتوقيع المحاسب' : isKurdish ? 'واژوو و مۆری ژمێریار' : 'Accountant Seal & Signature'}</Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.a4BrandCredit}>
        {isAr ? 'كشف حساب الديون الرسمي · نظام فروشيار · www.froshiar.store' : isKurdish ? 'کەشف حیسابی فەرمی قەرز · سیستەمی فرۆشیار · www.froshiar.store' : 'Official Debt Statement · Powered by Froshiar · www.froshiar.store'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <SettingsBackground />
      <AppHeader
        title={isAr ? 'تخصيص وإعدادات طباعة الفواتير' : isKurdish ? 'شێوازی چاپ و ڕێکخستنی پسوولە' : 'Print & Receipt Customization'}
        showBack
      />

      {/* ── 5 MODULE SELECTOR TABS (فرۆشتن • کڕین • عەرز • کۆگا • قەرز) ── */}
      <View
        style={[
          styles.moduleTabsWrapper,
          { backgroundColor: isDark ? colors.gray100 : colors.white, borderBottomColor: colors.gray200 },
          isTablet && { paddingVertical: 12, paddingHorizontal: 16 },
        ]}
      >
        <View
          style={[
            styles.moduleTabsRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
            isTablet && {
              maxWidth: contentMaxWidth || 980,
              width: '100%',
              alignSelf: 'center',
              gap: 8,
            },
          ]}
        >
          {([
            { id: 'sales', label: isAr ? 'المبيعات' : isKurdish ? 'فرۆشتن' : 'Sales', icon: 'cart-outline' },
            { id: 'purchases', label: isAr ? 'المشتريات' : isKurdish ? 'کڕین' : 'Purchases', icon: 'bag-check-outline' },
            { id: 'quotation', label: isAr ? 'العروض' : isKurdish ? 'عەرز' : 'Quotes', icon: 'document-text-outline' },
            { id: 'inventory', label: isAr ? 'المخزن' : isKurdish ? 'کۆگا' : 'Stock', icon: 'cube-outline' },
            { id: 'debts', label: isAr ? 'الديون' : isKurdish ? 'قەرز' : 'Debts', icon: 'wallet-outline' },
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
                  isTablet && {
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    gap: 6,
                  },
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={isTablet ? 18 : 14}
                  color={isSelected ? '#FFFFFF' : colors.gray500}
                />
                <Text
                  style={[
                    styles.moduleTabButtonText,
                    { color: isSelected ? '#FFFFFF' : colors.black },
                    isTablet && { fontSize: 15 },
                    isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, isTablet && contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Employee Management Lock Notice ── */}
        {isLockedForEmployee && (
          <View
            style={[
              styles.lockedBanner,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                borderColor: isDark ? '#EF444488' : '#FECACA',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View
              style={[
                styles.lockedIconWrapper,
                { backgroundColor: isDark ? '#EF444433' : '#FEE2E2' },
              ]}
            >
              <Ionicons name="lock-closed" size={20} color="#EF4444" />
            </View>
            <View style={[styles.lockedTextWrapper, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text
                style={[
                  styles.lockedTitle,
                  { color: isDark ? '#FCA5A5' : '#B91C1C', textAlign },
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isAr
                  ? 'إعدادات الفواتير مقفلة من قبل الإدارة'
                  : isKurdish
                    ? 'شێوازی پسوولە لەلایەن بەڕێوەبەرەکەتەوە قفڵ کراوە'
                    : 'Receipt Customization Locked by Management'}
              </Text>
              <Text
                style={[
                  styles.lockedSubtitle,
                  { color: isDark ? '#E5E7EB' : '#4B5563', textAlign },
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
              >
                {isAr
                  ? 'يمكنك معاينة الفواتير للتحقق من الشكل النهائي، بينما يتم التحكم في أحجام الأوراق والبيانات من حساب المدير فقط.'
                  : isKurdish
                    ? 'تەنها دەتوانیت پێشبینی وەسڵەکان ببینی، کۆنترۆڵکردنی قەبارەکان و داتاکانی سەر پسوولە تەنها لە دەسەڵاتی بەڕێوەبەرەکەتە.'
                    : 'You have read-only preview access. Paper sizes and printed fields are strictly controlled by your supervising manager.'}
              </Text>
            </View>
          </View>
        )}
        {/* ── 1. Paper Size Selector (58mm, 80mm, 110mm, A4) ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="resize-outline" size={19} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isAr ? 'مقاس الورق والفاتورة' : isKurdish ? 'قەبارەی وەسڵ و کاغەز (Paper Size)' : 'Receipt & Paper Size'}
            </Text>
          </View>

          <View style={[styles.widthTabsContainer, isTablet && { gap: 14 }]}>
            {(isTabletLandscape
              ? [PAPER_OPTIONS]
              : [PAPER_OPTIONS.slice(0, 2), PAPER_OPTIONS.slice(2, 4)]
            ).map((rowGroup, rowIdx) => (
              <View
                key={`paper_row_${rowIdx}`}
                style={[
                  styles.widthTabsRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  isTablet && { gap: 14 },
                ]}
              >
                {rowGroup.map((opt) => {
                  const isSelected = activePaperSize === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      activeOpacity={0.8}
                      onPress={() => handleSelectPaperSize(opt.id)}
                      style={[
                        styles.widthTab,
                        isTablet && { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 16 },
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
                          <Ionicons name="checkmark" size={isTablet ? 12 : 10} color="#FFFFFF" />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.widthTabLabel,
                          isTablet && { fontSize: 16.5 },
                          { color: isSelected ? colors.primary : colors.black },
                          isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <View
                        style={[
                          styles.widthCmBadge,
                          isTablet && { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
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
                            isTablet && { fontSize: 12 },
                            { color: isSelected ? colors.primary : colors.gray500 },
                          ]}
                        >
                          {opt.widthCm}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.widthTabDesc,
                          isTablet && { fontSize: 12 },
                          { color: isSelected ? colors.primary : colors.gray400 },
                          isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
                        ]}
                        numberOfLines={1}
                      >
                        {isAr ? opt.descAr : isKurdish ? opt.desc : opt.descEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </SettingsCard>

        {/* ── 2. Live Receipt Preview (نموونەی ڕاستەوخۆ) ── */}
        <SettingsCard style={styles.sectionCard}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="eye-outline" size={19} color={colors.primary} />
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.black, textAlign },
                isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isAr ? 'معاينة مباشرة للمستند' : isKurdish ? 'پێشبینینی ڕاستەوخۆ (Live Preview)' : 'Live Document Preview'}
            </Text>
          </View>

          <View style={styles.previewContainer}>
            {activePaperSize === 'A4' ? (
              activeTab === 'sales'
                ? renderSalesA4Preview()
                : activeTab === 'purchases'
                  ? renderPurchasesA4Preview()
                  : activeTab === 'quotation'
                    ? renderQuotationA4Preview()
                    : activeTab === 'inventory'
                      ? renderInventoryA4Preview()
                      : renderDebtsA4Preview()
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
                  <Text style={[styles.receiptStoreName, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {displayBizName}
                  </Text>

                  {activeTab === 'purchases' && (
                    <Text style={[styles.receiptTypeBadge, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {isAr ? 'وصل شراء (مخزن)' : isKurdish ? 'وەسڵی کڕین (کۆگا)' : 'Purchase Voucher'}
                    </Text>
                  )}
                  {activeTab === 'quotation' && (
                    <Text style={[styles.receiptTypeBadge, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {isAr ? 'عرض أسعار (كشف)' : isKurdish ? 'وەسڵی عەرز (تەنها نرخ)' : 'Price Quotation'}
                    </Text>
                  )}

                  {((activeTab === 'sales' && salesSettings.showBusinessAddress) ||
                    (activeTab === 'purchases' && purchaseSettings.showBusinessAddress) ||
                    (activeTab === 'inventory' && inventorySettings.showBusinessHeader) ||
                    (activeTab === 'quotation' && quotationSettings.showBusinessAddress) ||
                    (activeTab === 'debts' && debtSettings.showBusinessAddress)) && (
                      <Text style={[styles.receiptContact, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                        {displayBizAddress}
                      </Text>
                    )}

                  {((activeTab === 'sales' && salesSettings.showBusinessPhone) ||
                    (activeTab === 'purchases' && purchaseSettings.showBusinessPhone) ||
                    (activeTab === 'inventory' && inventorySettings.showBusinessHeader) ||
                    (activeTab === 'quotation' && quotationSettings.showBusinessPhone) ||
                    (activeTab === 'debts' && debtSettings.showBusinessPhone)) && (
                      <Text style={[styles.receiptContact, { direction: 'ltr' }]}>
                        {business.phone || '0770 000 0000'}
                      </Text>
                    )}
                </View>

                <View style={styles.dashedDivider} />

                {/* Metadata */}
                <View style={styles.receiptMeta}>
                  {((activeTab === 'sales' && salesSettings.showInvoiceNumber) ||
                    (activeTab === 'purchases' && purchaseSettings.showInvoiceNumber) ||
                    (activeTab === 'quotation' && quotationSettings.showQuotationNumber) ||
                    (activeTab === 'debts' && debtSettings.showInvoiceNumber)) && (
                      <View style={[styles.receiptMetaRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.receiptLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                          <Text style={isKuOrAr ? { fontFamily: SETTINGS_KURDISH_FONT_BOLD } : { fontWeight: '700' }}>
                            {activeTab === 'debts'
                              ? (isAr ? 'رقم السند: ' : isKurdish ? 'ژمارەی پسوولە: ' : 'Slip #: ')
                              : activeTab === 'purchases'
                              ? (isAr ? 'رقم وصل الشراء: ' : isKurdish ? 'وەسڵی کڕین: ' : 'Bill #: ')
                              : activeTab === 'quotation'
                              ? (isAr ? 'رقم عرض السعر: ' : isKurdish ? 'ژمارەی عەرز: ' : 'Quote #: ')
                              : (isAr ? 'رقم الفاتورة: ' : isKurdish ? 'پسوولە: ' : 'Receipt #: ')}
                          </Text>
                          <Text style={[styles.receiptValue, { fontWeight: '700' }]}>
                            {activeTab === 'sales' ? '#F-00124' : activeTab === 'purchases' ? '#P-00892' : activeTab === 'quotation' ? `#${mockQuotation.quotationNumber}` : '#D-00412'}
                          </Text>
                        </Text>
                      </View>
                    )}

                  {((activeTab === 'sales' && salesSettings.showDate) ||
                    (activeTab === 'purchases' && purchaseSettings.showDate) ||
                    (activeTab === 'inventory' && inventorySettings.showDate) ||
                    (activeTab === 'quotation' && quotationSettings.showDate) ||
                    (activeTab === 'debts' && debtSettings.showDate)) && (
                      <View style={[styles.receiptMetaRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.receiptLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                          <Text style={isKuOrAr ? { fontFamily: SETTINGS_KURDISH_FONT } : {}}>
                            {isAr ? 'التاريخ: ' : isKurdish ? 'بەروار: ' : 'Date: '}
                          </Text>
                          <Text style={styles.receiptValue}>{activeTab === 'quotation' ? mockQuotation.date : '2026/10/29 - 02:45 PM'}</Text>
                        </Text>
                      </View>
                    )}

                  {((activeTab === 'sales' && salesSettings.showCustomerName) ||
                    (activeTab === 'quotation' && quotationSettings.showCustomerName) ||
                    (activeTab === 'debts' && debtSettings.showCustomerName)) && (
                      <View style={[styles.receiptMetaRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.receiptLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                          <Text style={isKuOrAr ? { fontFamily: SETTINGS_KURDISH_FONT } : {}}>
                            {activeTab === 'debts'
                              ? (isAr ? 'المدين: ' : isKurdish ? 'قەرزدار: ' : 'Debtor: ')
                              : (isAr ? 'الزبون: ' : isKurdish ? 'کڕیار: ' : 'Customer: ')}
                          </Text>
                          <Text style={[styles.receiptValue, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                            {activeTab === 'quotation' ? mockQuotation.customerName : mockSale.customerName}
                          </Text>
                        </Text>
                      </View>
                    )}

                  {((activeTab === 'sales' && salesSettings.showCustomerPhone) ||
                    (activeTab === 'quotation' && quotationSettings.showCustomerPhone) ||
                    (activeTab === 'debts' && debtSettings.showCustomerPhone)) && (
                      <View style={[styles.receiptMetaRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.receiptLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                          <Text style={isKuOrAr ? { fontFamily: SETTINGS_KURDISH_FONT } : {}}>
                            {isAr ? 'الهاتف: ' : isKurdish ? 'مۆبایل: ' : 'Phone: '}
                          </Text>
                          <Text style={[styles.receiptValue, { fontWeight: '700' }]}>
                            {activeTab === 'quotation' ? mockQuotation.customerPhone : '0750 123 4567'}
                          </Text>
                        </Text>
                      </View>
                    )}

                  {activeTab === 'quotation' && quotationSettings.showValidUntil && (
                    <View style={[styles.receiptMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: isRTL ? 'flex-end' : 'flex-start', gap: 4 }]}>
                      <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                        {isAr ? 'صلاحية العرض:' : isKurdish ? 'بڕوابەپێکراو تا:' : 'Valid Until:'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.receiptValue, { fontWeight: '700' }]}>
                          {`${mockQuotation.validityDays} ${isAr ? 'أيام' : isKurdish ? 'ڕۆژ' : 'Days'} `}
                        </Text>
                        <Text style={[styles.receiptValue, { fontWeight: '700' }]}>(</Text>
                        <Text style={[styles.receiptValue, { fontWeight: '700' }]}>{mockQuotation.validUntil}</Text>
                        <Text style={[styles.receiptValue, { fontWeight: '700' }]}>)</Text>
                      </View>
                    </View>
                  )}

                  {activeTab === 'purchases' && purchaseSettings.showSupplierName && (
                    <View style={[styles.receiptMetaRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.receiptLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                        <Text style={isKuOrAr ? { fontFamily: SETTINGS_KURDISH_FONT } : {}}>
                          {isAr ? 'المورد: ' : isKurdish ? 'دابینکەر: ' : 'Supplier: '}
                        </Text>
                        <Text style={[styles.receiptValue, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                          {mockPurchase.supplierName}
                        </Text>
                      </Text>
                    </View>
                  )}

                  {activeTab === 'purchases' && purchaseSettings.showSupplierPhone && (
                    <View style={[styles.receiptMetaRow, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.receiptLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                        <Text style={isKuOrAr ? { fontFamily: SETTINGS_KURDISH_FONT } : {}}>
                          {isAr ? 'الهاتف: ' : isKurdish ? 'مۆبایل: ' : 'Phone: '}
                        </Text>
                        <Text style={[styles.receiptValue, { fontWeight: '700' }]}>
                          {mockPurchase.supplierPhone}
                        </Text>
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.dashedDivider} />

                {/* Items List or Debt Summary */}
                {activeTab === 'debts' ? (
                  /* Thermal Debt Account Voucher Layout */
                  <View style={{ paddingVertical: 4 }}>
                    {debtSettings.showTotalDebt && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginVertical: 3 }]}>
                        <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'إجمالي الدين:' : isKurdish ? 'کۆی قەرز:' : 'Total Debt:'}</Text>
                        <Text style={[styles.receiptValue, { fontWeight: '700' }]}>500,000 IQD</Text>
                      </View>
                    )}
                    {debtSettings.showPaidAmount && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginVertical: 3 }]}>
                        <Text style={[styles.receiptLabel, { color: '#16A34A' }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'المبلغ المسدد:' : isKurdish ? 'بڕی دراو / واصل:' : 'Paid Amount:'}</Text>
                        <Text style={[styles.receiptValue, { fontWeight: '700', color: '#16A34A' }]}>− 200,000 IQD</Text>
                      </View>
                    )}
                    {debtSettings.showRemainingDebt && (
                      <View style={[styles.receiptRow, styles.receiptGrandTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 6, paddingTop: 6 }]}>
                        <Text style={[styles.receiptGrandTotalLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>{isAr ? 'الرصيد المتبقي:' : isKurdish ? 'قەرزی ماوە:' : 'Remaining:'}</Text>
                        <Text style={styles.receiptGrandTotalAmount}>300,000 IQD</Text>
                      </View>
                    )}
                    {debtSettings.showPaymentMethod && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 4 }]}>
                        <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'طريقة الدفع:' : isKurdish ? 'شێوازی پارەدان:' : 'Payment:'}</Text>
                        <Text style={[styles.receiptValue, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'نقداً (Cash)' : isKurdish ? 'نەختینە (کاش)' : 'Cash'}</Text>
                      </View>
                    )}
                  </View>
                ) : activePaperSize === '58mm' ? (
                  /* 58mm 2-line layout */
                  <View style={styles.items58}>
                    {previewThermalItems.map((item, idx) => {
                      const itemPrice = item.price;
                      const hasDiscount = (activeTab === 'sales' && salesSettings.showDiscount && item.discount > 0) ||
                                          (activeTab === 'quotation' && quotationSettings.showDiscount && item.discount > 0);
                      const showBarcode = (activeTab === 'sales' && salesSettings.showItemBarcode) ||
                                          (activeTab === 'purchases' && purchaseSettings.showItemBarcode) ||
                                          (activeTab === 'quotation' && quotationSettings.showItemBarcode);
                      const showQty = (activeTab === 'sales' && salesSettings.showQty) ||
                                      (activeTab === 'purchases' && purchaseSettings.showQty) ||
                                      (activeTab === 'quotation' && quotationSettings.showQty);
                      const showPrice = (activeTab === 'sales' && salesSettings.showItemPrice) ||
                                        (activeTab === 'purchases' && purchaseSettings.showBuyPrice) ||
                                        (activeTab === 'quotation' && quotationSettings.showItemPrice);

                      return (
                        <View key={item.id} style={styles.item58Block}>
                          <View style={[styles.item58Top, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <View style={{ flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 10, color: '#666', fontFamily: 'Inter_700Bold', marginHorizontal: 2 }}>
                                {idx + 1}.{' '}
                              </Text>
                              <Text style={[styles.item58Name, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }, { textAlign: isRTL ? 'right' : 'left', flex: 1 }]} numberOfLines={1}>
                                {item.productName}
                              </Text>
                            </View>
                            {showBarcode && !!item.barcode && (
                              <Text style={styles.item58Id}>#{item.barcode}</Text>
                            )}
                          </View>
                          <View style={[styles.item58Bottom, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 3 }}>
                              {showQty && (
                                <Text style={styles.item58QtyPrice}>{item.quantity} × </Text>
                              )}
                              {showPrice && (
                                hasDiscount ? (
                                  <View style={{ flexDirection: 'column', alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 1 }}>
                                    <Text style={[styles.item58QtyPrice, { fontWeight: '700', color: '#000000', direction: 'ltr' }]}>
                                      {typeof (item as any).rawPrice === 'number' ? `${((item as any).rawPrice - item.discount).toLocaleString()} IQD` : itemPrice}
                                    </Text>
                                    <Text style={[styles.item58QtyPrice, { textDecorationLine: 'line-through', color: '#777777', fontSize: 9, direction: 'ltr' }]}>
                                      {itemPrice}
                                    </Text>
                                  </View>
                                ) : (
                                  <Text style={[styles.item58QtyPrice, { direction: 'ltr' }]}>{itemPrice}</Text>
                                )
                              )}
                            </View>
                            <Text style={[styles.item58Total, { direction: 'ltr' }]}>{String(item.lineTotal).includes('IQD') ? item.lineTotal : `${item.lineTotal} IQD`}</Text>
                          </View>
                          {hasDiscount && (
                            <Text style={[styles.item58Id, { color: '#000000', fontWeight: '600', marginTop: 2, textAlign: isRTL ? 'right' : 'left' }]}>
                              {isAr ? 'الخصم:' : isKurdish ? 'داشکاندن:' : 'Disc:'} − {item.discount.toLocaleString()} IQD
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  /* 80mm & 110mm columnar layout */
                  <View style={styles.tableWrap}>
                    <View style={[styles.tableHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.colHeader, { flex: 2, textAlign: isRTL ? 'right' : 'left' }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                        {isAr ? 'المادة' : isKurdish ? 'کاڵا' : 'Item'}
                      </Text>
                      {((activeTab === 'sales' && salesSettings.showQty) ||
                        (activeTab === 'purchases' && purchaseSettings.showQty) ||
                        (activeTab === 'quotation' && quotationSettings.showQty)) && (
                        <Text style={[styles.colHeader, styles.colCenter, { flex: 0.8 }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {isAr ? 'العدد' : isKurdish ? 'عەدەد' : 'Qty'}
                        </Text>
                      )}
                      {((activeTab === 'sales' && salesSettings.showItemPrice) ||
                        (activeTab === 'purchases' && purchaseSettings.showBuyPrice) ||
                        (activeTab === 'quotation' && quotationSettings.showItemPrice)) && (
                        <Text style={[styles.colHeader, isRTL ? styles.colLeft : styles.colRight, { flex: 1.3 }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {activeTab === 'purchases'
                            ? (isAr ? 'التكلفة' : isKurdish ? 'تێچوو' : 'Cost')
                            : (isAr ? 'السعر' : isKurdish ? 'نرخ' : 'Price')}
                        </Text>
                      )}
                      <Text style={[styles.colHeader, isRTL ? styles.colLeft : styles.colRight, { flex: 1.3 }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                        {isAr ? 'المجموع الكلي' : isKurdish ? 'کۆی گشتی' : 'Total'}
                      </Text>
                    </View>

                    {previewThermalItems.map((item, idx) => {
                      const itemPrice = item.price;
                      const hasDiscount = (activeTab === 'sales' && salesSettings.showDiscount && item.discount > 0) ||
                                          (activeTab === 'quotation' && quotationSettings.showDiscount && item.discount > 0);
                      const showBarcode = (activeTab === 'sales' && salesSettings.showItemBarcode) ||
                                          (activeTab === 'purchases' && purchaseSettings.showItemBarcode) ||
                                          (activeTab === 'quotation' && quotationSettings.showItemBarcode);
                      const showQty = (activeTab === 'sales' && salesSettings.showQty) ||
                                      (activeTab === 'purchases' && purchaseSettings.showQty) ||
                                      (activeTab === 'quotation' && quotationSettings.showQty);
                      const showPrice = (activeTab === 'sales' && salesSettings.showItemPrice) ||
                                        (activeTab === 'purchases' && purchaseSettings.showBuyPrice) ||
                                        (activeTab === 'quotation' && quotationSettings.showItemPrice);

                      return (
                        <View key={item.id} style={[styles.tableRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <View style={{ flex: 2 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 9.5, color: '#666', fontFamily: 'Inter_700Bold', marginHorizontal: 2 }}>
                                {idx + 1}.{' '}
                              </Text>
                              <Text style={[styles.tableItemName, { textAlign: isRTL ? 'right' : 'left', flex: 1 }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]} numberOfLines={2}>
                                {item.productName}
                              </Text>
                            </View>
                            {showBarcode && !!item.barcode && (
                              <Text style={[styles.tableItemId, { textAlign: isRTL ? 'right' : 'left' }]}>#{item.barcode}</Text>
                            )}
                            {hasDiscount && (
                              <Text style={[styles.tableItemId, { color: '#000000', fontWeight: '600', marginTop: 1, textAlign: isRTL ? 'right' : 'left' }]}>
                                {isAr ? 'الخصم:' : isKurdish ? 'داشکاندن:' : 'Disc:'} − {item.discount.toLocaleString()} IQD
                              </Text>
                            )}
                          </View>
                          {showQty && (
                            <Text style={[styles.tableItemCell, styles.colCenter, { flex: 0.8 }]}>
                              {item.quantity}
                            </Text>
                          )}
                          {showPrice && (
                            <View style={{ flex: 1.3, justifyContent: 'center', alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                              {hasDiscount ? (
                                <View style={{ flexDirection: 'column', alignItems: isRTL ? 'flex-start' : 'flex-end', justifyContent: 'center', gap: 1 }}>
                                  <Text style={[styles.tableItemCell, { fontWeight: '800', color: '#000000', direction: 'ltr' }]}>
                                    {typeof (item as any).rawPrice === 'number' ? `${((item as any).rawPrice - item.discount).toLocaleString()} IQD` : itemPrice}
                                  </Text>
                                  <Text style={[styles.tableItemCell, { textDecorationLine: 'line-through', color: '#777777', fontSize: 9.5, direction: 'ltr' }]}>
                                    {itemPrice}
                                  </Text>
                                </View>
                              ) : (
                                <Text style={[styles.tableItemCell, isRTL ? styles.colLeft : styles.colRight, { direction: 'ltr' }]}>
                                  {itemPrice}
                                </Text>
                              )}
                            </View>
                          )}
                          <Text style={[styles.tableItemCell, isRTL ? styles.colLeft : styles.colRight, { flex: 1.3, fontWeight: '700', direction: 'ltr' }]}>
                            {item.lineTotal}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.dashedDivider} />

                {/* Financial Totals (Sales, Purchases & Quotation) */}
                {activeTab === 'purchases' ? (
                  <View style={styles.receiptTotals}>
                    <View style={[styles.receiptRow, styles.receiptGrandTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.receiptGrandTotalLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                        {isAr ? 'إجمالي تكلفة الشراء:' : isKurdish ? 'کۆی گشتی کڕین:' : 'Total Cost:'}
                      </Text>
                      <Text style={styles.receiptGrandTotalAmount}>3,200,000 IQD</Text>
                    </View>

                    {purchaseSettings.showPaymentMethod && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'طريقة الدفع:' : isKurdish ? 'شێوازی پارەدان:' : 'Payment:'}</Text>
                        <Text style={[styles.receiptValue, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'نقداً (Cash)' : isKurdish ? 'نەختینە (کاش)' : 'Cash'}</Text>
                      </View>
                    )}

                    {purchaseSettings.showPaidAmount !== false && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }, { color: '#047857' }]}>{isAr ? 'المقدمة المدفوعة:' : isKurdish ? 'پێشەکیی دراو:' : 'Down Payment:'}</Text>
                        <Text style={[styles.receiptValue, { color: '#047857', fontWeight: '700' }]}>200,000 IQD</Text>
                      </View>
                    )}

                    {purchaseSettings.showRemainingDebt && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'الدين المتبقي:' : isKurdish ? 'قەرزی ماوە:' : 'Remaining:'}</Text>
                        <Text style={styles.receiptValue}>0 IQD</Text>
                      </View>
                    )}
                  </View>
                ) : activeTab === 'quotation' ? (
                  <View style={styles.receiptTotals}>
                    <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'مجموع المواد:' : isKurdish ? 'کۆی کاڵاکان:' : 'Subtotal:'}</Text>
                      <Text style={styles.receiptValue}>{mockQuotation.subtotal}</Text>
                    </View>

                    {quotationSettings.showDiscount && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'الخصم:' : isKurdish ? 'داشکاندن:' : 'Discount:'}</Text>
                        <Text style={styles.receiptValue}>− {mockQuotation.discount}</Text>
                      </View>
                    )}

                    <View style={[styles.receiptRow, styles.receiptGrandTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.receiptGrandTotalLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                        {isAr ? 'المجموع الكلي:' : isKurdish ? 'کۆی گشتی:' : 'Total:'}
                      </Text>
                      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                        <Text style={styles.receiptGrandTotalAmount}>{mockQuotation.grandTotalIQD}</Text>
                        <Text style={{ fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 1 }}>{mockQuotation.grandTotalUSD}</Text>
                      </View>
                    </View>
                  </View>
                ) : activeTab === 'sales' ? (
                  <View style={styles.receiptTotals}>
                    <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'مجموع المواد:' : isKurdish ? 'کۆی کاڵاکان:' : 'Subtotal:'}</Text>
                      <Text style={styles.receiptValue}>4,750 IQD</Text>
                    </View>

                    {salesSettings.showDiscount && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'الخصم:' : isKurdish ? 'داشکاندن:' : 'Discount:'}</Text>
                        <Text style={styles.receiptValue}>− 750 IQD</Text>
                      </View>
                    )}

                    <View style={[styles.receiptRow, styles.receiptGrandTotalRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.receiptGrandTotalLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                        {isAr ? 'المجموع الكلي:' : isKurdish ? 'کۆی گشتی:' : 'Total:'}
                      </Text>
                      <Text style={styles.receiptGrandTotalAmount}>4,000 IQD</Text>
                    </View>

                    {salesSettings.showPaymentMethod && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'طريقة الدفع:' : isKurdish ? 'شێوازی پارەدان:' : 'Payment:'}</Text>
                        <Text style={[styles.receiptValue, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>Cash</Text>
                      </View>
                    )}

                    {salesSettings.showRemainingDebt && (
                      <View style={[styles.receiptRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.receiptLabel, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>{isAr ? 'الدين المتبقي:' : isKurdish ? 'قەرزی ماوە:' : 'Remaining:'}</Text>
                        <Text style={styles.receiptValue}>0 IQD</Text>
                      </View>
                    )}
                  </View>
                ) : null}

                {/* Notes & Policy */}
                {((activeTab === 'sales' && salesSettings.showNotes) ||
                  (activeTab === 'purchases' && purchaseSettings.showNotes) ||
                  (activeTab === 'quotation' && quotationSettings.showNotes) ||
                  (activeTab === 'debts' && debtSettings.showNotes)) && (
                    <View style={styles.receiptNotesBox}>
                      <Text style={[styles.receiptNotesTitle, { textAlign: isRTL ? 'right' : 'left' }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>{isAr ? 'الملاحظات والسياسة:' : isKurdish ? 'تێبینی و سیاسەت:' : 'Notes & Policy:'}</Text>
                      <Text style={[styles.receiptNotesText, { textAlign: isRTL ? 'right' : 'left' }, isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                        {activeTab === 'debts'
                          ? getDebtFooterNote()
                          : activeTab === 'purchases'
                          ? mockPurchase.notes
                          : activeTab === 'quotation'
                          ? mockQuotation.notes
                          : mockSale.notes}
                      </Text>
                    </View>
                  )}

                {/* Signature Line for Debts or Quotation on Thermal */}
                {((activeTab === 'debts' && debtSettings.showSignature) ||
                  (activeTab === 'quotation' && quotationSettings.showSignature)) && (
                  <View style={{ marginTop: 10, marginBottom: 6 }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', paddingHorizontal: 6 }}>
                      <View style={{ alignItems: 'center', width: '45%' }}>
                        <View style={{ width: '100%', height: 1, backgroundColor: '#94A3B8', marginBottom: 4 }} />
                        <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '600' }}>
                          {isAr ? 'توقيع العميل' : isKurdish ? 'واژووی کڕیار' : 'Client Signature'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'center', width: '45%' }}>
                        <View style={{ width: '100%', height: 1, backgroundColor: '#94A3B8', marginBottom: 4 }} />
                        <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '600' }}>
                          {isAr ? 'ختم الشركة' : isKurdish ? 'مۆری کۆمپانیا' : 'Company Stamp'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Footer Message & Barcode */}
                <View style={styles.receiptFooter}>
                  {activeTab === 'purchases' ? (
                    getPurchaseFooterNote() ? (
                      <Text style={styles.receiptFooterNote}>{getPurchaseFooterNote()}</Text>
                    ) : null
                  ) : activeTab === 'debts' ? (
                    getDebtFooterNote() ? (
                      <Text style={styles.receiptFooterNote}>{getDebtFooterNote()}</Text>
                    ) : null
                  ) : activeTab === 'quotation' ? (
                    getQuotationFooterNote() ? (
                      <Text style={styles.receiptFooterNote}>{getQuotationFooterNote()}</Text>
                    ) : null
                  ) : (
                    getSalesFooterNote() ? (
                      <Text style={styles.receiptFooterNote}>{getSalesFooterNote()}</Text>
                    ) : null
                  )}

                  {((activeTab === 'sales' && salesSettings.showFooterBarcode) ||
                    (activeTab === 'purchases' && purchaseSettings.showFooterBarcode) ||
                    (activeTab === 'quotation' && quotationSettings.showItemBarcode) ||
                    (activeTab === 'debts' && debtSettings.showFooterBarcode)) && (
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
                        <Text style={styles.barcodeCode}>
                          {activeTab === 'sales'
                            ? '#F-00124'
                            : activeTab === 'purchases'
                            ? '#P-00892'
                            : activeTab === 'quotation'
                            ? `#${mockQuotation.quotationNumber}`
                            : '#D-00412'}
                        </Text>
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
                isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isAr ? 'تخصيص الحقول والبيانات' : isKurdish ? 'دەستکاری بڕگە و زانیارییەکان' : 'Field Customization'}
            </Text>
          </View>

          {/* Dynamic list of toggles based on activeTab */}
          {activeTab === 'sales' && (
            <View>
              {renderToggleRow(
                isAr ? 'رقم هاتف المتجر' : isKurdish ? 'ژمارەی تەلەفۆنی فرۆشگا' : 'Store Phone Number',
                isAr ? 'إظهار هاتف المتجر في الترويسة' : isKurdish ? 'پیشاندانی پەیوەندی فرۆشگا لە سەرپەڕە' : 'Show store phone number in header',
                salesSettings.showBusinessPhone,
                () => updateSalesSettings({ showBusinessPhone: !salesSettings.showBusinessPhone }),
                'call-outline'
              )}
              {renderToggleRow(
                isAr ? 'عنوان المتجر' : isKurdish ? 'ناونیشانی فرۆشگا' : 'Store Address',
                isAr ? 'إظهار عنوان المتجر في الترويسة' : isKurdish ? 'پیشاندانی ناونیشان لە سەرپەڕەی پسوولە' : 'Show store address in header',
                salesSettings.showBusinessAddress,
                () => updateSalesSettings({ showBusinessAddress: !salesSettings.showBusinessAddress }),
                'location-outline'
              )}
              {renderToggleRow(
                isAr ? 'اسم الزبون' : isKurdish ? 'ناوی کڕیار' : 'Customer Name',
                isAr ? 'إظهار اسم الزبون المحدد' : isKurdish ? 'پیشاندانی ناوی کڕیاری دیاریکراو' : 'Show assigned customer name',
                salesSettings.showCustomerName,
                () => updateSalesSettings({ showCustomerName: !salesSettings.showCustomerName }),
                'person-outline'
              )}
              {renderToggleRow(
                isAr ? 'رقم هاتف الزبون' : isKurdish ? 'ژمارەی مۆبایلی کڕیار' : 'Customer Phone Number',
                isAr ? 'إظهار رقم هاتف الزبون' : isKurdish ? 'پیشاندانی ژمارەی پەیوەندی کڕیار' : 'Show customer contact number',
                salesSettings.showCustomerPhone,
                () => updateSalesSettings({ showCustomerPhone: !salesSettings.showCustomerPhone }),
                'phone-portrait-outline'
              )}
              {renderToggleRow(
                isAr ? 'رقم الفاتورة (#Invoice)' : isKurdish ? 'ژمارەی پسوولە (#Invoice)' : 'Invoice Number (#Invoice)',
                isAr ? 'إظهار الرقم التعريفي للفاتورة' : isKurdish ? 'پیشاندانی کۆدی تایبەتی پسوولە' : 'Show unique invoice identifier',
                salesSettings.showInvoiceNumber,
                () => updateSalesSettings({ showInvoiceNumber: !salesSettings.showInvoiceNumber }),
                'receipt-outline'
              )}
              {renderToggleRow(
                isAr ? 'التاريخ والوقت' : isKurdish ? 'بەروار و کات' : 'Date & Time',
                isAr ? 'إظهار تاريخ وتوقيت البيع' : isKurdish ? 'پیشاندانی کات و ڕۆژی فرۆشتنەکە' : 'Show date and timestamp',
                salesSettings.showDate,
                () => updateSalesSettings({ showDate: !salesSettings.showDate }),
                'calendar-outline'
              )}
              {renderToggleRow(
                isAr ? 'الكمية (Qty)' : isKurdish ? 'بڕ و عەدەد (Qty)' : 'Quantity (Qty)',
                isAr ? 'إظهار عدد القطع لكل مادة' : isKurdish ? 'پیشاندانی ژمارەی دانەی هەر کاڵایەک' : 'Show item quantities in table',
                salesSettings.showQty,
                () => updateSalesSettings({ showQty: !salesSettings.showQty }),
                'layers-outline'
              )}
              {renderToggleRow(
                isAr ? 'سعر المفرد (Unit Price)' : isKurdish ? 'نرخی تاک (Unit Price)' : 'Unit Price',
                isAr ? 'إظهار سعر المفرد مع خط الشطب عند الخصم' : isKurdish ? 'پیشاندانی نرخی تاک بە داشکاندنەوە' : 'Show unit price with discount strikethrough',
                salesSettings.showItemPrice,
                () => updateSalesSettings({ showItemPrice: !salesSettings.showItemPrice }),
                'pricetag-outline'
              )}
              {renderToggleRow(
                isAr ? 'تفاصيل الخصم (Discount)' : isKurdish ? 'داشکاندن (Discount)' : 'Discount Breakdown',
                isAr ? 'إظهار قيمة الخصم للمواد والإجمالي' : isKurdish ? 'پیشاندانی بڕی داشکێنراو بۆ کاڵاکان و گشتی' : 'Show item and cart discount amounts',
                salesSettings.showDiscount,
                () => updateSalesSettings({ showDiscount: !salesSettings.showDiscount }),
                'cut-outline'
              )}
              {renderToggleRow(
                isAr ? 'رمز وباركود المادة (Item ID)' : isKurdish ? 'بارکۆد و ئایدی کاڵا (Item ID)' : 'Product Code & Barcode',
                isAr ? 'إظهار شارة رمز المادة تحت اسمها' : isKurdish ? 'پیشاندانی کۆدی ناسینەوە لەژێر ناوی کاڵا' : 'Show item identification chip',
                salesSettings.showItemBarcode,
                () => updateSalesSettings({ showItemBarcode: !salesSettings.showItemBarcode }),
                'barcode-outline'
              )}
              {renderToggleRow(
                isAr ? 'طريقة الدفع (Payment Method)' : isKurdish ? 'شێوازی پارەدان (Payment Method)' : 'Payment Method',
                isAr ? 'شارة الدفع (نقداً، دين، أو بطاقة)' : isKurdish ? 'کاش، قەرز، یان کارت' : 'Cash, debt, or card status badge',
                salesSettings.showPaymentMethod,
                () => updateSalesSettings({ showPaymentMethod: !salesSettings.showPaymentMethod }),
                'wallet-outline'
              )}
              {renderToggleRow(
                isAr ? 'الدين المتبقي (Remaining Debt)' : isKurdish ? 'قەرزی ماوە (Remaining Debt)' : 'Remaining Debt',
                isAr ? 'إظهار صف رصيد الدين المتبقي' : isKurdish ? 'پیشاندانی بڕی قەرزی تۆمارکراو' : 'Show remaining balance row',
                salesSettings.showRemainingDebt,
                () => updateSalesSettings({ showRemainingDebt: !salesSettings.showRemainingDebt }),
                'alert-circle-outline'
              )}
              {renderToggleRow(
                isAr ? 'الملاحظات والسياسة (Notes & Policy)' : isKurdish ? 'تێبینی و سیاسەت (Notes & Policy)' : 'Notes & Policy',
                isAr ? 'إظهار شروط وضمان البيع' : isKurdish ? 'پیشاندانی مەرج و گرەنتی فرۆشتن' : 'Show warranty and transaction notes',
                salesSettings.showNotes,
                () => updateSalesSettings({ showNotes: !salesSettings.showNotes }),
                'document-text-outline'
              )}
              {renderToggleRow(
                isAr ? 'سياسة وضمان الشركة (Policy)' : isKurdish ? 'دەربارەی سیاسەت و گەرەنتی (Policy)' : 'Company Policy Box',
                isAr ? 'إظهار بطاقة سياسة الشركة والضمان في الأعلى' : isKurdish ? 'پیشاندانی مەرجی فرۆشتن و گەرەنتی لە سەرەوە' : 'Show company policy card at the top',
                salesSettings.showAboutPolicy !== false,
                () => updateSalesSettings({ showAboutPolicy: !(salesSettings.showAboutPolicy !== false) }),
                'shield-checkmark-outline'
              )}
              {renderToggleRow(
                isAr ? 'خانات التوقيع والختم (Signatures)' : isKurdish ? 'شوێنی واژوو و مۆر (Signatures)' : 'Signature & Stamp Lines',
                isAr ? 'إظهار توقيع الزبون وختم المتجر' : isKurdish ? 'پیشاندانی واژووی کڕیار و مۆری فرۆشگا لە وەسڵدا' : 'Show customer signature and store stamp',
                salesSettings.showSignature !== false,
                () => updateSalesSettings({ showSignature: !(salesSettings.showSignature !== false) }),
                'pencil-outline'
              )}
              {activePaperSize !== 'A4' && renderToggleRow(
                isAr ? 'باركود أسفل الفاتورة (Footer Barcode)' : isKurdish ? 'بارکۆدی کۆتایی پسوولە (Footer Barcode)' : 'Footer Barcode',
                isAr ? 'إظهار باركود سريع في أسفل الفاتورة للمسح' : isKurdish ? 'بارکۆدی خێرا بۆ سکانکردنەوەی پسوولە' : 'Show quick scan barcode at receipt footer',
                salesSettings.showFooterBarcode,
                () => updateSalesSettings({ showFooterBarcode: !salesSettings.showFooterBarcode }),
                'qr-code-outline'
              )}
            </View>
          )}

          {activeTab === 'purchases' && (
            <View>
              {renderToggleRow(
                isAr ? 'رقم هاتف الشركة' : isKurdish ? 'تەلەفۆنی کۆمپانیا' : 'Company Phone Number',
                isAr ? 'إظهار هاتف الشركة في الترويسة' : isKurdish ? 'پیشاندانی ژمارەی پەیوەندی لە سەرپەڕە' : 'Show warehouse/company phone in header',
                purchaseSettings.showBusinessPhone,
                () => updatePurchaseSettings({ showBusinessPhone: !purchaseSettings.showBusinessPhone }),
                'call-outline'
              )}
              {renderToggleRow(
                isAr ? 'عنوان الشركة' : isKurdish ? 'ناونیشانی کۆمپانیا' : 'Company Address',
                isAr ? 'إظهار عنوان المخزن/الشركة في الترويسة' : isKurdish ? 'پیشاندانی ناونیشانی کۆگا لە سەرپەڕە' : 'Show company/warehouse address',
                purchaseSettings.showBusinessAddress,
                () => updatePurchaseSettings({ showBusinessAddress: !purchaseSettings.showBusinessAddress }),
                'location-outline'
              )}
              {renderToggleRow(
                isAr ? 'اسم المورد' : isKurdish ? 'ناوی دابینکەر / سەپلایەر' : 'Supplier Name',
                isAr ? 'إظهار اسم الشركة أو الشخص المورد' : isKurdish ? 'پیشاندانی ناوی کۆمپانیا یان کەسی دابینکەر' : 'Show vendor or supplier name',
                purchaseSettings.showSupplierName,
                () => updatePurchaseSettings({ showSupplierName: !purchaseSettings.showSupplierName }),
                'business-outline'
              )}
              {renderToggleRow(
                isAr ? 'هاتف المورد' : isKurdish ? 'تەلەفۆنی دابینکەر' : 'Supplier Phone Number',
                isAr ? 'إظهار هاتف المورد للتواصل' : isKurdish ? 'پیشاندانی مۆبایلی سەپلایەر بۆ پەیوەندی' : 'Show supplier phone contact',
                purchaseSettings.showSupplierPhone,
                () => updatePurchaseSettings({ showSupplierPhone: !purchaseSettings.showSupplierPhone }),
                'phone-portrait-outline'
              )}
              {renderToggleRow(
                isAr ? 'رقم وصل الشراء (#Bill)' : isKurdish ? 'ژمارەی وەسڵی کڕین (#Bill)' : 'Purchase Voucher #',
                isAr ? 'إظهار رقم وصل الشراء في النظام' : isKurdish ? 'کۆدی وەسڵی کڕین لە سیستەم' : 'Show system purchase bill number',
                purchaseSettings.showInvoiceNumber,
                () => updatePurchaseSettings({ showInvoiceNumber: !purchaseSettings.showInvoiceNumber }),
                'receipt-outline'
              )}
              {renderToggleRow(
                isAr ? 'التاريخ والوقت' : isKurdish ? 'بەروار و کات' : 'Date & Time',
                isAr ? 'إظهار تاريخ وتوقيت تسجيل الشراء' : isKurdish ? 'کاتی تۆمارکردنی کڕین لە سیستەم' : 'Show procurement date and time',
                purchaseSettings.showDate,
                () => updatePurchaseSettings({ showDate: !purchaseSettings.showDate }),
                'calendar-outline'
              )}
              {renderToggleRow(
                isAr ? 'الكمية والعدد (Qty)' : isKurdish ? 'بڕ و عەدەد (Quantity)' : 'Quantity (Qty)',
                isAr ? 'إظهار الكميات المشتراة للمخزن' : isKurdish ? 'عەدەدی کڕدراو بۆ مەخزەن' : 'Show purchased quantities',
                purchaseSettings.showQty,
                () => updatePurchaseSettings({ showQty: !purchaseSettings.showQty }),
                'layers-outline'
              )}
              {renderToggleRow(
                isAr ? 'تكلفة الشراء وسعر المفرد (Cost)' : isKurdish ? 'نرخی کڕین و تێچوو (Cost)' : 'Purchase Cost (Unit Price)',
                isAr ? 'إظهار سعر الشراء الفردي لكل مادة' : isKurdish ? 'پیشاندانی تێچووی یەکە بۆ هەر کاڵایەک' : 'Show unit purchase cost for each item',
                purchaseSettings.showBuyPrice,
                () => updatePurchaseSettings({ showBuyPrice: !purchaseSettings.showBuyPrice }),
                'cash-outline'
              )}
              {renderToggleRow(
                isAr ? 'رمز المادة وباركودها (Item ID)' : isKurdish ? 'بارکۆد و ئایدی کاڵا (Item ID)' : 'Product Code (Item ID)',
                isAr ? 'إظهار الرموز التعريفية للمواد المشتراة' : isKurdish ? 'کۆدی کاڵای کڕدراو' : 'Show purchased product identifiers',
                purchaseSettings.showItemBarcode,
                () => updatePurchaseSettings({ showItemBarcode: !purchaseSettings.showItemBarcode }),
                'barcode-outline'
              )}
              {renderToggleRow(
                isAr ? 'حالة وطريقة الدفع (نقداً، FIB، دين)' : isKurdish ? 'دۆخی پارەدان (کاش، FIB، قەرز)' : 'Payment Status & Method',
                isAr ? 'إظهار شارة سداد المستحقات للمورد' : isKurdish ? 'پیشاندانی چۆنیەتی درانی پارە بە دابینکەر' : 'Show payment badge (Paid, FIB, Debt)',
                purchaseSettings.showPaymentMethod,
                () => updatePurchaseSettings({ showPaymentMethod: !purchaseSettings.showPaymentMethod }),
                'wallet-outline'
              )}
              {renderToggleRow(
                isAr ? 'الدفعة الأولى / المقدمة المدفوعة' : isKurdish ? 'پێشەکیی دراوی قەرز' : 'Down Payment Paid',
                isAr ? 'إظهار مبلغ الدفعة المقدمة عند الشراء بالدين' : isKurdish ? 'پیشاندانی بڕی پێشەکیی دراو لە کاتی کڕینی بەقەرز' : 'Show upfront down payment amount on credit purchases',
                purchaseSettings.showPaidAmount !== false,
                () => updatePurchaseSettings({ showPaidAmount: !(purchaseSettings.showPaidAmount !== false) }),
                'cash-outline'
              )}
              {renderToggleRow(
                isAr ? 'الدين المتبقي للمورد' : isKurdish ? 'قەرزی ماوەی دابینکەر' : 'Remaining Payable Debt',
                isAr ? 'إظهار رصيد الدين المتبقي سداده للمورد' : isKurdish ? 'بڕی ماوە کە دەبێت بدرێتەوە بە دابینکەر' : 'Show unpaid debt balance to supplier',
                purchaseSettings.showRemainingDebt,
                () => updatePurchaseSettings({ showRemainingDebt: !purchaseSettings.showRemainingDebt }),
                'alert-circle-outline'
              )}
              {renderToggleRow(
                isAr ? 'ملاحظات الشراء والفحص' : isKurdish ? 'تێبینییەکانی کڕین' : 'Purchase & Inspection Notes',
                isAr ? 'إظهار الملاحظات وتفاصيل الفحص على الوصل' : isKurdish ? 'پیشاندانی ڕوونکردنەوە و تێبینی سەر وەسڵ' : 'Show inspection and warranty notes',
                purchaseSettings.showNotes,
                () => updatePurchaseSettings({ showNotes: !purchaseSettings.showNotes }),
                'document-text-outline'
              )}
              {renderToggleRow(
                isAr ? 'سياسة الشراء والاستلام (Policy)' : isKurdish ? 'سیاسەتی وەرگرتن و کڕین (Policy)' : 'Procurement Policy Box',
                isAr ? 'إظهار إرشادات وسياسة استلام البضائع للمخزن' : isKurdish ? 'ڕێنمایی وەرگرتنی کاڵا بۆ مەخزەن' : 'Show warehouse procurement policy notice',
                purchaseSettings.showAboutPolicy !== false,
                () => updatePurchaseSettings({ showAboutPolicy: !(purchaseSettings.showAboutPolicy !== false) }),
                'shield-checkmark-outline'
              )}
              {renderToggleRow(
                isAr ? 'تواقيع أمين المخزن والمدير (Signatures)' : isKurdish ? 'واژووی مەخزەن و سەرپەرشتیار (Signatures)' : 'Warehouse & Manager Signatures',
                isAr ? 'إظهار خانات توقيع الاستلام والإشراف في الأسفل' : isKurdish ? 'پیشاندانی واژووی وەرگرتنی مەخزەن لە خوارەوە' : 'Show receiver and supervisor signature lines',
                purchaseSettings.showSignature !== false,
                () => updatePurchaseSettings({ showSignature: !(purchaseSettings.showSignature !== false) }),
                'pencil-outline'
              )}
              {activePaperSize !== 'A4' && renderToggleRow(
                isAr ? 'باركود أسفل الوصل' : isKurdish ? 'بارکۆدی خوارەوە' : 'Footer Barcode',
                isAr ? 'إظهار باركود سريع للبحث في النظام' : isKurdish ? 'بارکۆدی خێرا بۆ گەڕان لەناو سیستەم' : 'Show document barcode at bottom',
                purchaseSettings.showFooterBarcode,
                () => updatePurchaseSettings({ showFooterBarcode: !purchaseSettings.showFooterBarcode }),
                'qr-code-outline'
              )}
            </View>
          )}

          {activeTab === 'quotation' && (
            <View>
              {renderToggleRow(
                isAr ? 'هاتف وتواصل الشركة' : isKurdish ? 'پەیوەندی و تەلەفۆنی کۆمپانیا' : 'Company Phone Number',
                isAr ? 'إظهار هاتف الشركة في عرض الأسعار' : isKurdish ? 'پیشاندانی پەیوەندی لەسەر عەرز' : 'Show company phone contact in proposal',
                quotationSettings.showBusinessPhone,
                () => updateQuotationSettings({ showBusinessPhone: !quotationSettings.showBusinessPhone }),
                'call-outline'
              )}
              {renderToggleRow(
                isAr ? 'العنوان الرسمي للشركة' : isKurdish ? 'ناونیشانی فەرمی کۆمپانیا' : 'Company Address',
                isAr ? 'إظهار مقر الشركة المُقدِمة للعرض' : isKurdish ? 'ناونیشانی ئۆفیسی پێشکەشکار' : 'Show company headquarters address',
                quotationSettings.showBusinessAddress,
                () => updateQuotationSettings({ showBusinessAddress: !quotationSettings.showBusinessAddress }),
                'location-outline'
              )}
              {renderToggleRow(
                isAr ? 'اسم العميل / الشركة' : isKurdish ? 'ناوی کڕیار / کۆمپانیا' : 'Client / Company Name',
                isAr ? 'إظهار اسم الجهة الطالبة في عرض الأسعار' : isKurdish ? 'ناوی لایەنی داواکار لەسەر عەرز' : 'Show target client or enterprise name',
                quotationSettings.showCustomerName,
                () => updateQuotationSettings({ showCustomerName: !quotationSettings.showCustomerName }),
                'person-outline'
              )}
              {renderToggleRow(
                isAr ? 'هاتف العميل' : isKurdish ? 'تەلەفۆنی کڕیار' : 'Client Phone Number',
                isAr ? 'إظهار هاتف العميل للتواصل الرسمي' : isKurdish ? 'مۆبایلی کڕیار بۆ پەیوەندی فەرمی' : 'Show client contact phone number',
                quotationSettings.showCustomerPhone,
                () => updateQuotationSettings({ showCustomerPhone: !quotationSettings.showCustomerPhone }),
                'phone-portrait-outline'
              )}
              {renderToggleRow(
                isAr ? 'الرقم الرسمي للعرض (#Quotation)' : isKurdish ? 'ژمارەی فەرمی عەرز (#Quotation)' : 'Quotation # Identifier',
                isAr ? 'إظهار الرقم التسلسلي المرجعي لعرض الأسعار' : isKurdish ? 'کۆدی زنجیرەیی عەرزەکە' : 'Show proposal serial reference number',
                quotationSettings.showQuotationNumber,
                () => updateQuotationSettings({ showQuotationNumber: !quotationSettings.showQuotationNumber }),
                'document-outline'
              )}
              {renderToggleRow(
                isAr ? 'تاريخ الإصدار' : isKurdish ? 'بەرواری دەرچوون' : 'Issuance Date',
                isAr ? 'إظهار تاريخ إصدار عرض الأسعار' : isKurdish ? 'بەرواری دەرکردنی عەرزەکە' : 'Show proposal release date',
                quotationSettings.showDate,
                () => updateQuotationSettings({ showDate: !quotationSettings.showDate }),
                'calendar-outline'
              )}
              {renderToggleRow(
                isAr ? 'مدة الصلاحية والانتهاء (Valid Until)' : isKurdish ? 'وادەی کارابوون (Valid Until)' : 'Validity Period & Expiry',
                isAr ? 'إظهار مربع مدة صلاحية الأسعار المقترحة' : isKurdish ? 'ماوەی کارابوونی نرخە پێشنیارکراوەکان' : 'Show validity days and expiration date box',
                quotationSettings.showValidUntil,
                () => updateQuotationSettings({ showValidUntil: !quotationSettings.showValidUntil }),
                'time-outline'
              )}
              {renderToggleRow(
                isAr ? 'رمز وباركود المواد' : isKurdish ? 'کۆد و بارکۆدی کاڵاکان' : 'Item Code / Barcode',
                isAr ? 'إظهار الرمز التعريفي في جدول العرض' : isKurdish ? 'کۆدی ناسینەوە لە خشتەی عەرزدا' : 'Show product identification code',
                quotationSettings.showItemBarcode,
                () => updateQuotationSettings({ showItemBarcode: !quotationSettings.showItemBarcode }),
                'barcode-outline'
              )}
              {renderToggleRow(
                isAr ? 'الكمية والعدد (Qty)' : isKurdish ? 'بڕ و عەدەد (Quantity)' : 'Quantity (Qty)',
                isAr ? 'إظهار كميات المواد المقترحة' : isKurdish ? 'ژمارەی دانەی پێشکەشکراو' : 'Show quoted item quantities',
                quotationSettings.showQty,
                () => updateQuotationSettings({ showQty: !quotationSettings.showQty }),
                'layers-outline'
              )}
              {renderToggleRow(
                isAr ? 'سعر الوحدة (Unit Price)' : isKurdish ? 'نرخی یەکە (Unit Price)' : 'Unit Price',
                isAr ? 'إظهار سعر الوحدة المقترح' : isKurdish ? 'نرخی پێشنیارکراو بە داشکاندنەوە' : 'Show quoted unit price',
                quotationSettings.showItemPrice,
                () => updateQuotationSettings({ showItemPrice: !quotationSettings.showItemPrice }),
                'pricetag-outline'
              )}
              {renderToggleRow(
                isAr ? 'الخصم على المواد' : isKurdish ? 'داشکاندن لەسەر کاڵاکان' : 'Proposal Discount',
                isAr ? 'إظهار مخصصات الخصم الخاص بالمشروع' : isKurdish ? 'پیشاندانی داشکاندنی تایبەت بۆ پڕۆژەکە' : 'Show special discount allowances',
                quotationSettings.showDiscount,
                () => updateQuotationSettings({ showDiscount: !quotationSettings.showDiscount }),
                'cut-outline'
              )}
              {renderToggleRow(
                isAr ? 'بطاقة سياسة الشركة والشروط' : isKurdish ? 'دەربارەی کۆمپانیا و سیاسەت' : 'About Policy & Terms Card',
                isAr ? 'إظهار سياسة الشركة وتفاصيل الضمان' : isKurdish ? 'سیاسەتی فرۆشتن و گەرەنتی پڕۆژە' : 'Show company policy and warranty details',
                quotationSettings.showAboutPolicy,
                () => updateQuotationSettings({ showAboutPolicy: !quotationSettings.showAboutPolicy }),
                'information-circle-outline'
              )}
              {renderToggleRow(
                isAr ? 'الملاحظات والشروط' : isKurdish ? 'تێبینی و مەرجەکان' : 'Terms & Conditions',
                isAr ? 'إظهار شروط الدفع والجدول الزمني للتسليم' : isKurdish ? 'مەرجەکانی پارەدان و گواستنەوە' : 'Show terms of payment and delivery timeline',
                quotationSettings.showNotes,
                () => updateQuotationSettings({ showNotes: !quotationSettings.showNotes }),
                'document-text-outline'
              )}
              {renderToggleRow(
                isAr ? 'خانات الختم والتوقيع الرسمي' : isKurdish ? 'شوێنی مۆر و واژوو (Signatures)' : 'Official Stamp & Signatures',
                isAr ? 'إظهار الختم الرسمي للشركة وموافقة العميل' : isKurdish ? 'بەشی فەرمی واژووی وەرگر و مۆری کۆمپانیا' : 'Show official company seal and client acceptance',
                quotationSettings.showSignature,
                () => updateQuotationSettings({ showSignature: !quotationSettings.showSignature }),
                'pencil-outline'
              )}
            </View>
          )}

          {activeTab === 'inventory' && (
            <View>
              {renderToggleRow(
                isAr ? 'الترويسة الرسمية لبيانات المخزن' : isKurdish ? 'سەرپەڕەی فەرمی و زانیاری کۆگا' : 'Official Warehouse Header',
                isAr ? 'إظهار اسم المخزن، الهاتف، والعنوان' : isKurdish ? 'ناوی کۆگا، پەیوەندی و ناونیشان' : 'Show warehouse name, phone, and address',
                inventorySettings.showBusinessHeader,
                () => updateInventorySettings({ showBusinessHeader: !inventorySettings.showBusinessHeader }),
                'business-outline'
              )}
              {renderToggleRow(
                isAr ? 'بطاقات ملخص إحصائيات المخزن (KPI)' : isKurdish ? 'کارتەکانی پوختەی ئاماری کۆگا (KPI Cards)' : 'Inventory KPI Summary Cards',
                isAr ? 'إظهار 4 بطاقات: إجمالي المواد، المتوفر، المنخفض، والقيمة' : isKurdish ? 'پیشاندانی ٤ کارتی کۆی کاڵا، عەدەد، کەمبوون و بەها' : 'Show 4 cards: Total Items, In Stock, Low Stock, Value',
                inventorySettings.showStatsCards !== false,
                () => updateInventorySettings({ showStatsCards: !(inventorySettings.showStatsCards !== false) }),
                'stats-chart-outline'
              )}
              {renderToggleRow(
                isAr ? 'عمود التصنيف والفئة (Category)' : isKurdish ? 'هاوپۆل و دەستە (Category)' : 'Category Column',
                isAr ? 'إظهار عمود تصنيف المواد في جدول المخزن' : isKurdish ? 'هاوپۆلی کاڵا لە خشتەی کۆگادا' : 'Show product classification column',
                inventorySettings.showCategory,
                () => updateInventorySettings({ showCategory: !inventorySettings.showCategory }),
                'grid-outline'
              )}
              {renderToggleRow(
                isAr ? 'عمود رمز وباركود المادة (Item ID)' : isKurdish ? 'بارکۆد و ئایدی کاڵا (Item ID)' : 'Item ID / Barcode Column',
                isAr ? 'إظهار شارة رمز المادة' : isKurdish ? 'کۆدی ستاندارد یان بارکۆدی کاڵا' : 'Show item code badge',
                inventorySettings.showItemId,
                () => updateInventorySettings({ showItemId: !inventorySettings.showItemId }),
                'barcode-outline'
              )}
              {renderToggleRow(
                isAr ? 'الكمية المتوفرة (Stock Qty)' : isKurdish ? 'بڕی بەردەست (Stock Qty)' : 'Stock Quantity',
                isAr ? 'إظهار عدد القطع المتوفرة في المخزن' : isKurdish ? 'ژمارەی دانەی ماوە لە مەخزەندا' : 'Show current stock counts',
                inventorySettings.showQuantity,
                () => updateInventorySettings({ showQuantity: !inventorySettings.showQuantity }),
                'layers-outline'
              )}
              {renderToggleRow(
                isAr ? 'تكلفة الشراء وسعر التكلفة (Cost)' : isKurdish ? 'نرخی کڕین / تێچوو (Cost)' : 'Purchase Cost Price',
                isAr ? 'إظهار تكلفة شراء الوحدة الواحدة' : isKurdish ? 'تێچووی کڕین بۆ یەکەی کاڵا' : 'Show procurement unit cost',
                inventorySettings.showBuyPrice,
                () => updateInventorySettings({ showBuyPrice: !inventorySettings.showBuyPrice }),
                'cash-outline'
              )}
              {renderToggleRow(
                isAr ? 'سعر البيع (Selling Price)' : isKurdish ? 'نرخی فرۆشتن (Selling Price)' : 'Selling Price',
                isAr ? 'إظهار سعر البيع للمستهلك' : isKurdish ? 'نرخی دیاریکراو بۆ فرۆشتن' : 'Show retail selling price',
                inventorySettings.showSellPrice,
                () => updateInventorySettings({ showSellPrice: !inventorySettings.showSellPrice }),
                'pricetag-outline'
              )}
              {renderToggleRow(
                isAr ? 'إجمالي قيمة المخزون (Total Value)' : isKurdish ? 'بەهای گشتی کاڵاکان (Total Value)' : 'Total Inventory Value',
                isAr ? 'إظهار إجمالي القيمة النقدية لكافة بضائع المخزن' : isKurdish ? 'کۆی بەهای هەموو کاڵاکانی مەخزەن' : 'Show total monetary inventory value',
                inventorySettings.showTotalValue,
                () => updateInventorySettings({ showTotalValue: !inventorySettings.showTotalValue }),
                'calculator-outline'
              )}
              {renderToggleRow(
                isAr ? 'عمود اسم المورد (Supplier)' : isKurdish ? 'ناوی دابینکەر (Supplier)' : 'Supplier Column',
                isAr ? 'إظهار اسم الشركة أو الجهة الموردة' : isKurdish ? 'کۆمپانیای سەرچاوەی کاڵاکان' : 'Show supplying vendor name',
                inventorySettings.showSupplier,
                () => updateInventorySettings({ showSupplier: !inventorySettings.showSupplier }),
                'people-outline'
              )}
              {renderToggleRow(
                isAr ? 'حالة المادة وتنبيه النقص (Status)' : isKurdish ? 'دۆخی کاڵا و ئاگاداری کەمی (Status)' : 'Stock Status & Low Alert',
                isAr ? 'إظهار شارات التوفر وتنبيهات نفاد المخزون' : isKurdish ? 'پیشاندانی دۆخی لەبارە یان کەمبوونەوە' : 'Show in-stock and low-stock warning badges',
                inventorySettings.showStatus,
                () => updateInventorySettings({ showStatus: !inventorySettings.showStatus }),
                'alert-circle-outline'
              )}
              {renderToggleRow(
                isAr ? 'توقيت وتاريخ الجرد' : isKurdish ? 'بەروار و کاتی سەرژمێری' : 'Audit Timestamp',
                isAr ? 'إظهار تاريخ وتوقيت إنشاء تقرير الجرد' : isKurdish ? 'کاتی دەرهێنانی ڕاپۆرتی کۆگا' : 'Show audit generation timestamp',
                inventorySettings.showDate,
                () => updateInventorySettings({ showDate: !inventorySettings.showDate }),
                'calendar-outline'
              )}
              {renderToggleRow(
                isAr ? 'ملخص وملاحظات الجرد' : isKurdish ? 'تێبینی و کورتە' : 'Audit Notes & Report Summary',
                isAr ? 'إظهار الملاحظات الرسمية لمشرف الجرد في نهاية التقرير' : isKurdish ? 'ڕوونکردنەوەی فەرمی کۆتایی ڕاپۆرت' : 'Show official audit supervisor commentary',
                inventorySettings.showNotes,
                () => updateInventorySettings({ showNotes: !inventorySettings.showNotes }),
                'document-text-outline'
              )}
              {renderToggleRow(
                isAr ? 'منطقة تواقيع الجرد (Signatures)' : isKurdish ? 'شوێنی واژووی سەرژمێری (Signatures)' : 'Audit Signatures Area',
                isAr ? 'إظهار خطوط توقيع أمين المخزن ومشرف الجرد' : isKurdish ? 'واژووی چاودێری کۆگا و بەڕێوەبەری سەرژمێری' : 'Show warehouse keeper and audit supervisor lines',
                inventorySettings.showSignatureArea !== false,
                () => updateInventorySettings({ showSignatureArea: !(inventorySettings.showSignatureArea !== false) }),
                'pencil-outline'
              )}
            </View>
          )}

          {activeTab === 'debts' && (
            <View>
              {renderToggleRow(
                isAr ? 'رقم هاتف المتجر' : isKurdish ? 'ژمارەی تەلەفۆنی فرۆشگا' : 'Store Phone Number',
                isAr ? 'إظهار هاتف المتجر في ترويسة سند الديون' : isKurdish ? 'پیشاندانی تەلەفۆن لە سەرپەڕەی پسوولەی قەرز' : 'Show store phone in debt receipt header',
                debtSettings.showBusinessPhone,
                () => updateDebtSettings({ showBusinessPhone: !debtSettings.showBusinessPhone }),
                'call-outline'
              )}
              {renderToggleRow(
                isAr ? 'عنوان المتجر' : isKurdish ? 'ناونیشانی فرۆشگا' : 'Store Address',
                isAr ? 'إظهار عنوان المتجر في السند' : isKurdish ? 'پیشاندانی ناونیشان لە سەرپەڕەی وەسڵ' : 'Show store address in header',
                debtSettings.showBusinessAddress,
                () => updateDebtSettings({ showBusinessAddress: !debtSettings.showBusinessAddress }),
                'location-outline'
              )}
              {renderToggleRow(
                isAr ? 'اسم الزبون / المدين' : isKurdish ? 'ناوی کڕیار / قەرزدار' : 'Client / Debtor Name',
                isAr ? 'إظهار اسم صاحب الحساب المدين' : isKurdish ? 'پیشاندانی ناوی کەسی قەرزدار لە پسوولە' : 'Show debtor customer name',
                debtSettings.showCustomerName,
                () => updateDebtSettings({ showCustomerName: !debtSettings.showCustomerName }),
                'person-outline'
              )}
              {renderToggleRow(
                isAr ? 'هاتف الزبون المدين' : isKurdish ? 'مۆبایلی کڕیار' : 'Client Phone Number',
                isAr ? 'إظهار هاتف الزبون للمطابقة والتواصل' : isKurdish ? 'پیشاندانی پەیوەندی کڕیار لە وەسڵ' : 'Show debtor phone contact',
                debtSettings.showCustomerPhone,
                () => updateDebtSettings({ showCustomerPhone: !debtSettings.showCustomerPhone }),
                'phone-portrait-outline'
              )}
              {renderToggleRow(
                isAr ? 'رقم سند الديون (#Debt)' : isKurdish ? 'ژمارەی پسوولەی قەرز (#Debt)' : 'Debt Voucher #',
                isAr ? 'إظهار الرقم المرجعي لسند القبض أو الدين' : isKurdish ? 'کۆدی ناسینەوەی پسوولەی قەرز' : 'Show debt voucher tracking number',
                debtSettings.showInvoiceNumber,
                () => updateDebtSettings({ showInvoiceNumber: !debtSettings.showInvoiceNumber }),
                'receipt-outline'
              )}
              {renderToggleRow(
                isAr ? 'التاريخ والوقت' : isKurdish ? 'بەروار و کاتی تۆمار' : 'Date & Time',
                isAr ? 'إظهار تاريخ وتوقيت المعاملة المالية' : isKurdish ? 'پیشاندانی کات و بەرواری پارەدان و تۆمارکردن' : 'Show date and timestamp',
                debtSettings.showDate,
                () => updateDebtSettings({ showDate: !debtSettings.showDate }),
                'calendar-outline'
              )}
              {renderToggleRow(
                isAr ? 'إجمالي رصيد الدين (Total Debt)' : isKurdish ? 'کۆی قەرز (Total Debt)' : 'Total Debt Balance',
                isAr ? 'إظهار إجمالي الدين الكلي للزبون' : isKurdish ? 'پیشاندانی بڕی گشتی قەرزی کڕیار' : 'Show total cumulative debt balance',
                debtSettings.showTotalDebt,
                () => updateDebtSettings({ showTotalDebt: !debtSettings.showTotalDebt }),
                'calculator-outline'
              )}
              {renderToggleRow(
                isAr ? 'المبلغ المسدد (Paid Amount)' : isKurdish ? 'بڕی دراو / واصل (Paid Amount)' : 'Paid Amount',
                isAr ? 'إظهار الدفعة المسددة في السند' : isKurdish ? 'پیشاندانی بڕی پارەی دراو لەم وەسڵەدا' : 'Show payment received amount',
                debtSettings.showPaidAmount,
                () => updateDebtSettings({ showPaidAmount: !debtSettings.showPaidAmount }),
                'cash-outline'
              )}
              {renderToggleRow(
                isAr ? 'الرصيد المتبقي (Remaining Debt)' : isKurdish ? 'قەرزی ماوە (Remaining Debt)' : 'Remaining Debt Balance',
                isAr ? 'إظهار الرصيد المتبقي بعد التسديد' : isKurdish ? 'پیشاندانی باڵانسی ماوە دوای پارەدان' : 'Show balance due after payment',
                debtSettings.showRemainingDebt,
                () => updateDebtSettings({ showRemainingDebt: !debtSettings.showRemainingDebt }),
                'alert-circle-outline'
              )}
              {renderToggleRow(
                isAr ? 'طريقة الدفع (Payment Method)' : isKurdish ? 'شێوازی پارەدان (Payment Method)' : 'Payment Method',
                isAr ? 'إظهار طريقة السداد (نقداً، FIB، حوالة)' : isKurdish ? 'کاش، کارتی FIB، یان حەواڵە' : 'Cash, FIB card, or bank transfer badge',
                debtSettings.showPaymentMethod,
                () => updateDebtSettings({ showPaymentMethod: !debtSettings.showPaymentMethod }),
                'wallet-outline'
              )}
              {renderToggleRow(
                isAr ? 'ملاحظات وسند التعهد (Notes)' : isKurdish ? 'تێبینی و مەرجی قەرز (Notes)' : 'Debt Notes & Terms',
                isAr ? 'إظهار الملاحظات والتعهد بسداد الدين' : isKurdish ? 'پیشاندانی مەرج و تێبینییەکانی قەرز' : 'Show debt terms and notes',
                debtSettings.showNotes,
                () => updateDebtSettings({ showNotes: !debtSettings.showNotes }),
                'document-text-outline'
              )}
              {renderToggleRow(
                isAr ? 'تواقيع المحاسب والمستلم والختم' : isKurdish ? 'واژوو و مۆری ژمێریار (Signatures)' : 'Signatures & Stamp',
                isAr ? 'إظهار خطوط التوقيع الرسمي والختم' : isKurdish ? 'پیشاندانی شوێنی واژووی وەرگر و مۆری فرۆشگا' : 'Show customer signature and store seal',
                debtSettings.showSignature,
                () => updateDebtSettings({ showSignature: !debtSettings.showSignature }),
                'pencil-outline'
              )}
              {activePaperSize !== 'A4' && renderToggleRow(
                isAr ? 'باركود أسفل السند' : isKurdish ? 'بارکۆدی خوارەوەی وەسڵ' : 'Footer Barcode',
                isAr ? 'إظهار باركود سريع في الأسفل' : isKurdish ? 'بارکۆدی خێرا بۆ سکانکردنی پسوولە' : 'Show barcode at receipt footer',
                debtSettings.showFooterBarcode,
                () => updateDebtSettings({ showFooterBarcode: !debtSettings.showFooterBarcode }),
                'qr-code-outline'
              )}
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
                isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isAr ? 'ملاحظة مخصصة في أسفل الفاتورة' : isKurdish ? 'دەقی دڵخوازی خوارەوەی وەسڵ' : 'Custom Footer Note'}
            </Text>
          </View>
          <Text
            style={[
              styles.sectionDesc,
              { color: colors.gray500, textAlign },
              isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
          >
            {isAr
              ? 'يظهر هذا النص في أسفل كافة الإيصالات والمطبوعات للشكر أو توضيح شروط المحل.'
              : isKurdish
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
                opacity: isLockedForEmployee ? 0.7 : 1,
              },
              isTablet && { minHeight: 80, fontSize: 15, padding: 16 },
              isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT },
            ]}
            value={
              activeTab === 'sales'
                ? salesSettings.customFooterNote
                : activeTab === 'purchases'
                  ? purchaseSettings.customFooterNote
                  : activeTab === 'quotation'
                    ? quotationSettings.customFooterNote
                    : activeTab === 'inventory'
                      ? inventorySettings.customFooterNote
                      : debtSettings.customFooterNote
            }
            editable={!isLockedForEmployee}
            onChangeText={(txt) => {
              if (isLockedForEmployee) return;
              if (activeTab === 'sales') updateSalesSettings({ customFooterNote: txt });
              else if (activeTab === 'purchases') updatePurchaseSettings({ customFooterNote: txt });
              else if (activeTab === 'quotation') updateQuotationSettings({ customFooterNote: txt });
              else if (activeTab === 'inventory') updateInventorySettings({ customFooterNote: txt });
              else if (activeTab === 'debts') updateDebtSettings({ customFooterNote: txt });
            }}
            placeholder={isAr ? 'شكراً لتعاملكم معنا • أهلاً وسهلاً بكم' : isKurdish ? 'سوپاس بۆ سەردانەکەتان • هەمیشە بەخێربێن' : 'Thank you for your business'}
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={2}
          />
        </SettingsCard>

        {/* ── 5. Action Buttons (Test Print & Reset) ── */}
        <View style={[styles.actionsContainer, isTablet && { marginTop: 14, gap: 14 }]}>
          <TouchableOpacity
            style={[
              styles.testPrintBtn,
              { backgroundColor: colors.primary },
              isTablet && { paddingVertical: 18, borderRadius: 18 },
            ]}
            activeOpacity={0.8}
            onPress={handleTestPrint}
            disabled={isPrintingTest}
          >
            <Ionicons name="print-outline" size={isTablet ? 24 : 20} color="#FFFFFF" />
            {isPrintingTest ? (
              <Text
                style={[
                  styles.testPrintBtnText,
                  isTablet && { fontSize: 17 },
                  isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isAr ? 'جارٍ الطباعة...' : isKurdish ? 'چاپ دەکرێت...' : 'Printing...'}
              </Text>
            ) : (
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                <Text
                  style={[
                    styles.testPrintBtnText,
                    isTablet && { fontSize: 17 },
                    isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isAr ? 'طباعة تجريبية' : isKurdish ? 'چاپی تاقیکاری' : 'Test Print'}
                </Text>
                <Text
                  style={[
                    styles.testPrintBtnText,
                    isTablet && { fontSize: 17 },
                    { writingDirection: 'ltr' },
                  ]}
                >
                  ({activePaperSize})
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resetBtn,
              {
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FCA5A5',
              },
              isTablet && { paddingVertical: 16, borderRadius: 16 },
            ]}
            activeOpacity={0.8}
            onPress={handleResetCurrentModule}
          >
            <Ionicons name="refresh-outline" size={isTablet ? 21 : 18} color="#EF4444" />
            <Text
              style={[
                styles.resetBtnText,
                isTablet && { fontSize: 15 },
                isKuOrAr && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
            >
              {isAr ? 'استعادة الإعدادات الافتراضية لهذا القسم' : isKurdish ? 'گەڕاندنەوەی سەرەتایی ئەم بەشە' : 'Reset Module to Default'}
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
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  moduleTabsRow: {
    gap: 4,
    alignItems: 'center',
    width: '100%',
  },
  moduleTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  moduleTabButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* Locked Notice Banner */
  lockedBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    alignItems: 'center',
  },
  lockedIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTextWrapper: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  lockedSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
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
  widthTabsContainer: {
    gap: 10,
    marginTop: 8,
  },
  widthTabsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  widthTab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 88,
  },
  activeCheckBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widthTabLabel: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  widthCmBadge: {
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  widthCmBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  widthTabDesc: {
    fontSize: 11,
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
  a4SheetReal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  a4ProposalBanner: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  a4ProposalBannerText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  a4HeaderCols: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  a4ColBusiness: {
    flex: 1.1,
    paddingHorizontal: 3,
  },
  a4LogoFrame: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  a4LogoImg: {
    width: '100%',
    height: '100%',
  },
  a4LogoMono: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  a4LogoMonoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D4AF37',
  },
  a4BizName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 1,
  },
  a4BizMeta: {
    fontSize: 9,
    color: '#64748B',
    lineHeight: 12.5,
  },
  a4ColCustomer: {
    flex: 1.15,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  a4ColLabelTag: {
    fontSize: 8,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  a4InfoRow: {
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 1,
    overflow: 'hidden',
  },
  a4RowLabel: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: '700',
    flexShrink: 0,
  },
  a4RowVal: {
    fontSize: 8,
    color: '#0F172A',
    fontWeight: '600',
    flexShrink: 1,
  },
  a4ColInvoice: {
    flex: 1.05,
    paddingHorizontal: 3,
    overflow: 'hidden',
  },
  a4InvTypeLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  a4InvMetaRow: {
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 1,
  },
  a4InvMetaTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  a4StatusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  a4StatusPillText: {
    fontSize: 7.5,
    fontWeight: '800',
  },
  a4ValidityDoubleBox: {
    borderWidth: 1.5,
    borderColor: '#0F172A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
    marginTop: 3,
    backgroundColor: '#FFFFFF',
  },
  a4ValidityLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#64748B',
  },
  a4ValidityValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 15,
  },
  a4ValiditySub: {
    fontSize: 7.5,
    color: '#64748B',
  },
  a4PolicyCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 6,
    marginBottom: 8,
  },
  a4PolicyLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  a4PolicyText: {
    fontSize: 9,
    color: '#0F172A',
    lineHeight: 13,
  },
  a4TopSummaryPair: {
    gap: 6,
    marginBottom: 8,
  },
  a4SummaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 6,
  },
  a4CardLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  a4FinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1.5,
  },
  a4FinLabel: {
    fontSize: 8.5,
    color: '#475569',
  },
  a4FinVal: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  a4TotalBlock: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 5,
    paddingVertical: 3.5,
    paddingHorizontal: 5,
    marginVertical: 3,
  },
  a4TotalBlockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  a4TotalBlockLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
  },
  a4TotalBlockAmount: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#000000',
  },
  a4TotalDivider: {
    height: 1,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 2,
    width: '100%',
  },
  a4TotalBlockSub: {
    fontSize: 7,
    fontWeight: '600',
    color: '#475569',
  },
  a4TotalBlockSubAmount: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  a4NotesWarrantyTitle: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  a4NotesWarrantyText: {
    fontSize: 8.5,
    color: '#475569',
    lineHeight: 12,
  },
  a4NotesDivider: {
    height: 0.5,
    backgroundColor: '#E2E8F0',
    marginVertical: 3,
  },
  a4TableWrap: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  a4TableHeaderRow: {
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  a4Th: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
  },
  a4TableRow: {
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  a4Td: {
    fontSize: 8,
    color: '#0F172A',
  },
  a4TdNum: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  a4TdAmount: {
    fontSize: 7.2,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  a4TdAmountBold: {
    fontSize: 7.2,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  a4ItemName: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  a4ItemDesc: {
    fontSize: 6.8,
    color: '#64748B',
    marginTop: 1,
  },
  a4ItemSupplier: {
    fontSize: 7,
    color: '#64748B',
    marginTop: 1,
  },
  a4IdChip: {
    fontSize: 6.5,
    fontWeight: '700',
    color: '#334155',
    backgroundColor: '#F1F5F9',
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    borderRadius: 2.5,
    paddingHorizontal: 2,
    paddingVertical: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
  },
  a4StrikethroughPrice: {
    fontSize: 8,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  a4SignaturesRow: {
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  a4SigCol: {
    alignItems: 'center',
    width: 95,
  },
  a4SigLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#94A3B8',
    marginBottom: 3,
  },
  a4SigLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  a4StampSeal: {
    alignItems: 'center',
    width: 105,
  },
  a4StampInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: '#B91C1C',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    backgroundColor: '#FEF2F2',
  },
  a4StampBizText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#B91C1C',
  },
  a4StampApprovedText: {
    fontSize: 6.5,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.3,
    marginVertical: 1,
  },
  a4StampSubText: {
    fontSize: 6,
    color: '#B91C1C',
  },
  a4BarcodeSection: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  a4BarcodeCode: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    letterSpacing: 0.8,
  },
  a4BrandCredit: {
    fontSize: 7.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  a4KpiRow: {
    gap: 4,
    marginBottom: 8,
  },
  a4KpiCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 4,
    alignItems: 'center',
  },
  a4KpiLabel: {
    fontSize: 7.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 1,
  },
  a4KpiVal: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  a4InvStatusBadge: {
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 0.5,
  },
  a4InvStatusOk: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  a4InvStatusLow: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  a4InvStatusText: {
    fontSize: 7.5,
    fontWeight: '700',
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
    textAlign: 'center',
  },
  receiptTypeBadge: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginVertical: 2,
  },
  receiptContact: {
    fontSize: 11,
    color: '#555555',
    lineHeight: 16,
    textAlign: 'center',
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
  receiptMetaRow: {
    width: '100%',
    marginVertical: 1.5,
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
  colLeft: {
    textAlign: 'left',
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
