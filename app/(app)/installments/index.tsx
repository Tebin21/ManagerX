import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  useWindowDimensions,
  Linking,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { AppHeader } from '@/components/common/AppHeader';
import { InvoiceView } from '@/components/sales/InvoiceView';
import { DebtPaymentReceiptModal } from '@/components/debt/DebtPaymentReceiptModal';
import { CustomDateRangeModal } from '@/components/shared/CustomDateRangeModal';
import { useAppTheme } from '@/contexts/ThemeContext';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBusinessStore } from '@/store/businessStore';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { hexToRgba } from '@/lib/colorUtils';
import { fmtIQD, fmtUSD, toEnglishDigits, formatDate } from '@/utils/formatters';
import { getPeriodBounds, isDateWithinRange, type PeriodKey } from '@/utils/dateRanges';
import {
  getAllInstallmentSales,
  recordInstallmentPayment,
  getSaleById,
  getDebtPayments,
  type InstallmentSaleRow,
} from '@/lib/sqlite';
import { directPrintInvoice, directPrintDebtPaymentReceipt } from '@/lib/generateInvoice';
import type { DebtPaymentReceiptData } from '@/types/debt';
import type { DebtReceiptPaperSize } from '@/lib/debtPaymentReceiptTemplate';
import type { Sale } from '@/types/sales';

type MainTab = 'report' | 'customers';
type StatusFilterType = 'all' | 'active' | 'settled' | 'shortTerm' | 'longTerm';

export default function InstallmentsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');
  const isArLanguage = useLanguageStore((s) => s.language === 'ar');

  const exchangeRate = useSettingsStore((s) => s.exchangeRate || 1310);
  const baseCurrency = useSettingsStore((s) => s.baseCurrency || 'USD');
  const isUSD = baseCurrency === 'USD';

  // Formatters
  const formatPrimary = useCallback((valIQD: number) => {
    if (isUSD) {
      return `$${fmtUSD(valIQD / exchangeRate)}`;
    }
    return `${fmtIQD(valIQD)} IQD`;
  }, [isUSD, exchangeRate]);

  const formatSecondary = useCallback((valIQD: number) => {
    if (isUSD) {
      return `≈ ${fmtIQD(valIQD)} IQD`;
    }
    return `≈ $${fmtUSD(valIQD / exchangeRate)}`;
  }, [isUSD, exchangeRate]);

  // Main Tab State: 'customers' or 'report'
  const [tab, setTab] = useState<MainTab>('customers');

  // Raw data from SQLite
  const [installments, setInstallments] = useState<InstallmentSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Period Filter State (History-style)
  const [periodKey, setPeriodKey] = useState<PeriodKey>('all');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [customDateModalVisible, setCustomDateModalVisible] = useState(false);

  // Search Bar State (History-style expandable search button)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const filterScrollRef = useRef<ScrollView>(null);
  const statusScrollRef = useRef<ScrollView>(null);

  // Sub-filter category for the Customers tab
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');

  // Payment Modal State
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedSaleForPay, setSelectedSaleForPay] = useState<InstallmentSaleRow | null>(null);
  const [payMode, setPayMode] = useState<'monthly' | 'custom'>('monthly');
  const [payCurrentTime, setPayCurrentTime] = useState<Date>(new Date());
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'fib'>('cash');
  const [payNote, setPayNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Schedule Modal State
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedSaleForSchedule, setSelectedSaleForSchedule] = useState<InstallmentSaleRow | null>(null);

  // Receipt Modal State
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<DebtPaymentReceiptData | null>(null);
  const [payReceiptPaperSize, setPayReceiptPaperSize] = useState<DebtReceiptPaperSize>('80mm');

  // Sale Invoice View Modal State (with 4 paper sizes)
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [invoicePaperSize, setInvoicePaperSize] = useState<'A4' | '80mm' | '58mm' | '110mm'>('A4');

  // Receipt / Invoice Options Table Modal State ("تەبلێ جوان")
  const [receiptPickerModalVisible, setReceiptPickerModalVisible] = useState(false);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<InstallmentSaleRow | null>(null);

  // Load installments from SQLite
  const loadData = useCallback(async () => {
    try {
      const rows = await getAllInstallmentSales();
      setInstallments(rows);
    } catch (err) {
      console.error('Failed to load installments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Compute Date Bounds
  const bounds = useMemo(() => {
    if (periodKey === 'custom' && customRange) {
      return getPeriodBounds('custom', customRange.from, customRange.to);
    }
    return getPeriodBounds(periodKey);
  }, [periodKey, customRange]);

  // 1. Filter by Date Period (for Report Tab)
  const periodFilteredInstallments = useMemo(() => {
    if (periodKey === 'all') return installments;
    return installments.filter((item) =>
      isDateWithinRange(item.saleDate, bounds.from, bounds.to)
    );
  }, [installments, periodKey, bounds]);

  // Summary for Customers Tab (total, active, settled, short-term, long-term)
  const customersSummary = useMemo(() => {
    let total = periodFilteredInstallments.length;
    let active = 0;
    let settled = 0;
    let shortTerm = 0;
    let longTerm = 0;

    periodFilteredInstallments.forEach((item) => {
      if (item.remainingDebt > 0 && item.debtStatus !== 'settled') {
        active += 1;
      } else {
        settled += 1;
      }
      if (item.installmentMonths <= 6) {
        shortTerm += 1;
      } else {
        longTerm += 1;
      }
    });

    return { total, active, settled, shortTerm, longTerm };
  }, [periodFilteredInstallments]);

  // Status Filter Pills for Customers Tab (matching media_1794138477479_e9550980.png)
  const statusPills: { key: StatusFilterType; label: string }[] = useMemo(() => [
    { key: 'all', label: `${t('installmentList.all')} (${customersSummary.total})` },
    { key: 'active', label: `${t('installmentList.active')} (${customersSummary.active})` },
    { key: 'settled', label: `${t('installmentList.settled')} (${customersSummary.settled})` },
    { key: 'shortTerm', label: t('installmentList.shortTerm') },
    { key: 'longTerm', label: t('installmentList.longTerm') },
  ], [t, customersSummary]);

  // 2. Filter by Search Query & Sub-filter Status (for Customers Tab)
  const visibleInstallments = useMemo(() => {
    return periodFilteredInstallments.filter((item) => {
      // Search text match
      const q = query.toLowerCase().trim();
      if (q) {
        const matchName = item.customerName?.toLowerCase().includes(q);
        const matchPhone = item.customerPhone?.toLowerCase().includes(q);
        const matchInvoice = item.invoiceNumber?.toLowerCase().includes(q);
        const matchProducts = item.productsSummary?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchInvoice && !matchProducts) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter === 'active') {
        return item.remainingDebt > 0 && item.debtStatus !== 'settled';
      }
      if (statusFilter === 'settled') {
        return item.remainingDebt <= 0 || item.debtStatus === 'settled';
      }
      if (statusFilter === 'shortTerm') {
        return item.installmentMonths <= 6;
      }
      if (statusFilter === 'longTerm') {
        return item.installmentMonths > 6;
      }

      return true;
    });
  }, [periodFilteredInstallments, query, statusFilter]);

  // Summary Metrics (Computed from current period)
  const periodSummary = useMemo(() => {
    let totalGrand = 0;
    let totalRemaining = 0;
    let totalCollected = 0;
    let monthlyExpected = 0;
    let activeAccounts = 0;
    let settledAccounts = 0;
    let shortTermCount = 0;
    let longTermCount = 0;

    periodFilteredInstallments.forEach((item) => {
      totalGrand += item.grandTotal;
      totalRemaining += item.remainingDebt;
      totalCollected += item.paidAmount;
      if (item.remainingDebt > 0 && item.debtStatus !== 'settled') {
        activeAccounts += 1;
        monthlyExpected += item.installmentMonthlyAmount;
      } else {
        settledAccounts += 1;
      }
      if (item.installmentMonths <= 6) {
        shortTermCount += 1;
      } else {
        longTermCount += 1;
      }
    });

    const collectionRate = totalGrand > 0 ? Math.round((totalCollected / totalGrand) * 100) : 100;

    return {
      totalGrand,
      totalRemaining,
      totalCollected,
      monthlyExpected,
      activeAccounts,
      settledAccounts,
      shortTermCount,
      longTermCount,
      collectionRate,
      totalCount: periodFilteredInstallments.length,
    };
  }, [periodFilteredInstallments]);

  // Period Filter keys and labels (History-style)
  const periodKeys: PeriodKey[] = ['today', 'week', 'month', 'year', 'all', 'custom'];
  const periodLabels: Record<PeriodKey, string> = {
    today: isArLanguage ? 'اليوم' : isKuLanguage ? 'ئەمڕۆ' : 'Today',
    week: isArLanguage ? 'هذا الأسبوع' : isKuLanguage ? 'ئەم هەفتەیە' : 'This Week',
    month: isArLanguage ? 'هذا الشهر' : isKuLanguage ? 'ئەم مانگە' : 'This Month',
    year: isArLanguage ? 'هذا العام' : isKuLanguage ? 'ئەمساڵ' : 'This Year',
    all: isArLanguage ? 'الكل' : isKuLanguage ? 'هەمووی' : 'All Time',
    custom: customRange ? `${customRange.from} → ${customRange.to}` : (isArLanguage ? 'مخصص' : isKuLanguage ? 'دیاریکراو' : 'Custom'),
  };

  const handlePeriodSelect = (key: PeriodKey) => {
    Haptics.selectionAsync();
    if (key === 'custom') {
      setCustomDateModalVisible(true);
    } else {
      setPeriodKey(key);
      setCustomRange(null);
    }
  };

  // Search Expand / Collapse
  const handleExpandSearch = () => {
    Haptics.selectionAsync();
    setIsSearchExpanded(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  const handleCollapseSearch = () => {
    setIsSearchExpanded(false);
    setQuery('');
  };

  // Real-time formatted date and time for custom payments
  const formattedRealTime = useMemo(() => {
    const d = payCurrentTime || new Date();
    const dateStr = formatDate(d.toISOString());
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${dateStr} · ${hours}:${minutes}`;
  }, [payCurrentTime]);

  // Open Payment Modal (mode: 'monthly' for scheduled installment, 'custom' for other payment / settle all)
  const openPayModal = (item: InstallmentSaleRow, mode: 'monthly' | 'custom' = 'monthly') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSaleForPay(item);
    setPayMode(mode);
    setPayCurrentTime(new Date());

    if (mode === 'monthly') {
      const amtIQD = Math.min(item.installmentMonthlyAmount, item.remainingDebt);
      const inCurrency = isUSD ? amtIQD / exchangeRate : amtIQD;
      setPayAmountInput(inCurrency > 0 ? (isUSD ? inCurrency.toFixed(2) : String(Math.round(inCurrency))) : '');
      setPayNote('');
    } else {
      // mode === 'custom' (دانەوەی تر: پاکتاوکردن یان هەر بڕێکی دڵخواز)
      setPayAmountInput('');
      setPayNote('');
    }

    setPayMethod('cash');
    setPayModalVisible(true);
  };

  // Submit Payment (supports normal completion without print, or complete & print)
  const handleConfirmPayment = async (shouldPrint: boolean = false) => {
    if (!selectedSaleForPay) return;
    const cleanAmount = parseFloat(toEnglishDigits(payAmountInput).replace(/,/g, ''));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      Alert.alert(t('common.error'), t('installmentList.invalidAmount'));
      return;
    }

    const remainingInCurrency = isUSD
      ? selectedSaleForPay.remainingDebt / exchangeRate
      : selectedSaleForPay.remainingDebt;

    const isFullPayment = cleanAmount >= remainingInCurrency - 0.05;
    const payAmtIQD = isFullPayment
      ? selectedSaleForPay.remainingDebt
      : (isUSD ? Math.round(cleanAmount * exchangeRate) : cleanAmount);

    const defaultNote = payMode === 'custom'
      ? (isFullPayment
          ? (isArLanguage ? 'تسوية كامل الدين' : isKuLanguage ? 'سافکردنی تەواوی قەرز' : 'Full debt settlement')
          : (isArLanguage ? 'دفع مبلغ آخر' : isKuLanguage ? 'دانەوەی بڕی تر' : 'Other amount payment'))
      : (isArLanguage ? 'سداد قسط شهر' : isKuLanguage ? 'سەرفکردنی قیستی مانگانە' : 'Monthly installment payment');
    const finalNote = payNote.trim() || defaultNote;

    setIsSubmittingPayment(true);
    try {
      const receipt = await recordInstallmentPayment(
        selectedSaleForPay.saleId,
        payAmtIQD,
        payMethod,
        finalNote,
        shouldPrint ? 1 : 0
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayModalVisible(false);
      setSelectedSaleForPay(null);

      // Only show receipt modal if user selected to print!
      if (shouldPrint && receipt) {
        receipt.printCount = Math.max(1, receipt.printCount || 1);
        const business = useBusinessStore.getState();
        directPrintDebtPaymentReceipt(receipt, business, payReceiptPaperSize, exchangeRate).catch((err: unknown) => {
          console.warn('[Installments] Direct print receipt error:', err);
        });
        setLastPaymentReceipt(receipt);
        setTimeout(() => {
          setReceiptModalVisible(true);
        }, Platform.OS === 'ios' ? 450 : 150);
      }

      // Reload list so cards reflect the fresh print count
      await loadData();
    } catch (err: any) {
      console.error('Failed to record installment payment:', err);
      Alert.alert(t('common.error'), err.message || t('installmentList.errorOccurred'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Open Schedule Modal
  const openScheduleModal = (item: InstallmentSaleRow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSaleForSchedule(item);
    setScheduleModalVisible(true);
  };

  // Open Sale Invoice
  const handleViewInvoice = async (saleId: number) => {
    try {
      const sale = await getSaleById(saleId);
      if (sale) {
        setViewingSale(sale);
        setInvoiceModalVisible(true);
      } else {
        Alert.alert(
          t('common.error'),
          isArLanguage ? 'لم يتم العثور على الفاتورة' : isKuLanguage ? 'پسوولە نەدۆزرایەوە' : 'Invoice not found'
        );
      }
    } catch (err) {
      console.error('Failed to load sale invoice:', err);
    }
  };

  // Open Latest Debt Payment Receipt (4 Paper Sizes)
  const openLatestReceipt = async (item: InstallmentSaleRow) => {
    if (!item.debtId) {
      handleViewInvoice(item.saleId);
      return;
    }
    try {
      const payments = await getDebtPayments(item.debtId, 'sales');
      if (payments.length === 0) {
        handleViewInvoice(item.saleId);
        return;
      }
      const p = payments[0];
      const receiptData: DebtPaymentReceiptData = {
        id: p.id,
        paymentNumber: `DP-${String(p.id).padStart(5, '0')}`,
        debtId: p.debtId,
        debtType: 'sales',
        partyName: item.customerName,
        partyPhone: item.customerPhone,
        referenceNumber: item.invoiceNumber,
        amount: p.amount,
        previousBalance: p.remainingAfter + p.amount,
        remainingAfter: p.remainingAfter,
        paymentMethod: p.paymentMethod || 'cash',
        note: p.note,
        createdAt: p.createdAt,
      };
      setLastPaymentReceipt(receiptData);
      setReceiptModalVisible(true);
    } catch (e) {
      console.error('Failed to load latest payment receipt:', e);
      handleViewInvoice(item.saleId);
    }
  };

  // Open modern receipts & invoices table modal ("تەبلێ جوان")
  const handleReceiptButtonPress = (item: InstallmentSaleRow) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    setSelectedReceiptSale(item);
    setReceiptPickerModalVisible(true);
  };

  // Quick WhatsApp / Call actions
  const handleCall = (phone: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleWhatsApp = (phone: string | null) => {
    if (!phone) return;
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('07')) {
      cleanPhone = '964' + cleanPhone.substring(1);
    }
    Linking.openURL(`https://wa.me/${cleanPhone}`).catch(() => {});
  };

  // Dynamic search input box width
  const dynamicSearchWidth = Math.min(windowWidth - 32, isTablet ? 360 : 260);

  // Render Customer Installment Card
  const renderCustomerCard = (item: InstallmentSaleRow) => {
    const isSettled = item.remainingDebt <= 0 || item.debtStatus === 'settled';
    const percentPaid = item.grandTotal > 0 ? Math.min(100, Math.round((item.paidAmount / item.grandTotal) * 100)) : 100;

    return (
      <View
        key={`card-${item.saleId}`}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
            borderColor: isDark ? colors.gray200 : '#E2E8F0',
          },
        ]}
      >
        {/* Card Header: Customer Info, Phone, Invoice Tag & Status */}
        <View style={[styles.cardHeader, { flexDirection }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection, alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text
                style={[
                  styles.customerName,
                  { color: colors.black, textAlign, fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {item.customerName}
              </Text>
              {item.customerPhone && (
                <View style={{ flexDirection, alignItems: 'center', gap: 4 }}>
                  <TouchableOpacity
                    style={[styles.contactMiniBtn, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}
                    onPress={() => handleCall(item.customerPhone)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={13} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contactMiniBtn, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}
                    onPress={() => handleWhatsApp(item.customerPhone)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="logo-whatsapp" size={13} color="#10B981" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {item.customerPhone && (
              <Text style={[styles.customerPhoneText, { color: colors.gray500, textAlign }]}>
                {item.customerPhone}
              </Text>
            )}
          </View>

          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
            <TouchableOpacity
              onPress={() => handleViewInvoice(item.saleId)}
              style={[styles.invoiceTag, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#C7D2FE' }]}
            >
              <Ionicons name="receipt-outline" size={12} color="#6366F1" />
              <IdText style={[styles.invoiceTagText, { color: '#6366F1' }]}>
                {item.invoiceNumber || `#${item.saleId}`}
              </IdText>
            </TouchableOpacity>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isSettled
                    ? (isDark ? '#064E3B' : '#ECFDF5')
                    : (isDark ? '#78350F' : '#FEF3C7'),
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: isSettled ? '#10B981' : '#F59E0B',
                    fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                  },
                ]}
              >
                {isSettled ? t('installmentList.settledBadge') : t('installmentList.activeBadge')}
              </Text>
            </View>
          </View>
        </View>

        {/* Financial Numbers Bar */}
        <View
          style={[
            styles.financialRow,
            {
              backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
              borderColor: isDark ? colors.gray300 : '#EDF2F7',
            },
          ]}
        >
          <View style={styles.finCol}>
            <Text style={[styles.finLabel, { color: colors.gray500, textAlign }]}>
              {t('installmentList.grandTotal')}
            </Text>
            <Text style={[styles.finValue, { color: colors.black, textAlign }]}>
              {formatPrimary(item.grandTotal)}
            </Text>
          </View>

          <View style={[styles.finDivider, { backgroundColor: isDark ? colors.gray300 : '#E2E8F0' }]} />

          <View style={styles.finCol}>
            <Text style={[styles.finLabel, { color: colors.gray500, textAlign }]}>
              {t('installmentList.downPayment')}
            </Text>
            <Text style={[styles.finValue, { color: colors.black, textAlign }]}>
              {formatPrimary(item.installmentDownPayment)}
            </Text>
          </View>

          <View style={[styles.finDivider, { backgroundColor: isDark ? colors.gray300 : '#E2E8F0' }]} />

          <View style={styles.finCol}>
            <Text style={[styles.finLabel, { color: colors.gray500, textAlign }]}>
              {t('installmentList.paidAmount')}
            </Text>
            <Text style={[styles.finValue, { color: '#10B981', textAlign }]}>
              {formatPrimary(item.paidAmount)}
            </Text>
          </View>

          <View style={[styles.finDivider, { backgroundColor: isDark ? colors.gray300 : '#E2E8F0' }]} />

          <View style={styles.finCol}>
            <Text style={[styles.finLabel, { color: colors.gray500, textAlign }]}>
              {t('installmentList.remainingDebt')}
            </Text>
            <Text
              style={[
                styles.finValue,
                {
                  color: isSettled ? '#10B981' : '#EF4444',
                  fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                  textAlign,
                },
              ]}
            >
              {formatPrimary(item.remainingDebt)}
            </Text>
          </View>
        </View>

        {/* Installment Plan Banner */}
        <View
          style={[
            styles.planBanner,
            {
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : '#F5F3FF',
              borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE',
            },
          ]}
        >
          <View style={{ flexDirection, justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection, alignItems: 'center', gap: 6 }}>
              <View style={[styles.planIconCircle, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="calendar" size={14} color="#FFFFFF" />
              </View>
              <Text style={[styles.planTitle, { color: isDark ? '#DDD6FE' : '#5B21B6', fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {item.installmentMonths} {t('installmentList.months')}
              </Text>
            </View>

            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Text style={[styles.monthlyRateText, { color: '#8B5CF6', fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                {formatPrimary(item.installmentMonthlyAmount)} / {t('installmentList.months')}
              </Text>
              <Text style={[styles.monthlyRateSub, { color: colors.gray500 }]}>
                {formatSecondary(item.installmentMonthlyAmount)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.gray300 : '#E2E8F0' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percentPaid}%`,
                    backgroundColor: isSettled ? '#10B981' : '#8B5CF6',
                  },
                ]}
              />
            </View>
            <View style={[styles.progressLabels, { flexDirection }]}>
              <Text style={[styles.progressText, { color: colors.gray500 }]}>
                {percentPaid}% {t('installmentList.settledBadge')}
              </Text>
              <Text style={[styles.progressText, { color: colors.gray500 }]}>
                {item.paymentsCount > 0
                  ? t('installmentList.paymentsCount', { count: item.paymentsCount })
                  : formatDate(item.saleDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Product Items Summary if available */}
        {item.productsSummary && (
          <View style={{ flexDirection, alignItems: 'center', gap: 4, marginTop: 8 }}>
            <Ionicons name="bag-handle-outline" size={13} color={colors.gray400} />
            <Text
              style={[styles.productsSummaryText, { color: colors.gray500, textAlign }]}
              numberOfLines={1}
            >
              {item.productsSummary}
            </Text>
          </View>
        )}

        {/* Action Buttons: 2 Responsive Rows */}
        <View style={styles.cardActionsContainer}>
          {!isSettled && (
            <View style={[styles.actionsRow, { flexDirection }]}>
              {/* Pay 1 Month Quick */}
              <TouchableOpacity
                style={[
                  styles.actionBtnBlock,
                  { backgroundColor: isDark ? colors.primary : '#1E293B' },
                ]}
                onPress={() => openPayModal(item, 'monthly')}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: '#FFFFFF' },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                  numberOfLines={1}
                >
                  {t('installmentList.payMonthly')}
                </Text>
              </TouchableOpacity>

              {/* Pay Custom Amount (دانەوەی تر) */}
              <TouchableOpacity
                style={[
                  styles.actionBtnBlock,
                  {
                    backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                    borderColor: isDark ? colors.gray300 : '#CBD5E1',
                    borderWidth: 1,
                  },
                ]}
                onPress={() => openPayModal(item, 'custom')}
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={16} color={colors.black} />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: colors.black },
                    isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                  numberOfLines={1}
                >
                  {t('installmentList.payCustom')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Row 2: Schedule & Receipt / Invoices (with 4 paper sizes) */}
          <View style={[styles.actionsRow, { flexDirection, marginTop: !isSettled ? 8 : 0 }]}>
            {/* Schedule Breakdown */}
            <TouchableOpacity
              style={[
                styles.actionBtnBlock,
                {
                  backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                  borderColor: isDark ? colors.gray300 : '#CBD5E1',
                  borderWidth: 1,
                },
              ]}
              onPress={() => openScheduleModal(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={15} color={colors.black} />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: colors.black },
                  (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT },
                ]}
                numberOfLines={1}
              >
                {t('installmentList.viewSchedule')}
              </Text>
            </TouchableOpacity>

            {/* View / Print Invoice & Receipts (with 4 paper sizes) */}
            <TouchableOpacity
              style={[
                styles.actionBtnBlock,
                {
                  backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                  borderColor: isDark ? colors.gray300 : '#CBD5E1',
                  borderWidth: 1,
                },
              ]}
              onPress={() => handleReceiptButtonPress(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="receipt-outline" size={15} color={colors.primary} />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: colors.black },
                  (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
                numberOfLines={1}
              >
                {isArLanguage ? 'الوصل' : isKuLanguage ? 'وەسڵ' : 'Receipt'}
                {` (${1 + (item.paymentsCount || 0)})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? colors.white : colors.gray50 }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── App Header ── */}
      <AppHeader
        title={t('installmentList.title')}
        showBack={true}
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity onPress={handleRefresh} style={{ padding: 6 }}>
            <Ionicons name="refresh-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      {/* ── 2-Tab Segmented Control (ڕاپۆرت | کەسەکان) ── */}
      <View style={[styles.segmentWrapper, { backgroundColor: colors.white, borderBottomColor: colors.gray200 }]}>
        <View style={[styles.segmentTrack, { backgroundColor: isDark ? colors.gray100 : '#F1F5F9', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Tab 1: ڕاپۆرت (Report) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              setTab('report');
            }}
            style={[
              styles.segmentBtn,
              tab === 'report' && [styles.segmentBtnActive, { backgroundColor: isDark ? colors.primary : '#1E293B' }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="stats-chart-outline"
              size={isTablet ? 18 : 16}
              color={tab === 'report' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: tab === 'report' ? '#FFFFFF' : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
              numberOfLines={1}
            >
              {t('installmentList.reportTab')}
            </Text>
          </TouchableOpacity>

          {/* Tab 2: کەسەکان (People / Customers) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              setTab('customers');
            }}
            style={[
              styles.segmentBtn,
              tab === 'customers' && [styles.segmentBtnActive, { backgroundColor: isDark ? colors.primary : '#1E293B' }],
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons
              name="people-outline"
              size={isTablet ? 18 : 16}
              color={tab === 'customers' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              style={[
                styles.segmentBtnText,
                { color: tab === 'customers' ? '#FFFFFF' : colors.gray600 },
                isKuLanguage && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
              ]}
              numberOfLines={1}
            >
              {t('installmentList.customersTab')}
            </Text>
            {customersSummary.total > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  tab === 'customers'
                    ? { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.22)' }
                    : { backgroundColor: colors.gray200 },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    { color: tab === 'customers' ? '#FFFFFF' : colors.gray700 },
                  ]}
                >
                  {customersSummary.active > 0 ? customersSummary.active : customersSummary.total}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Period Filter Horizontal Bar (ڕۆژ و ئەمڕۆ و شتەکان - ALWAYS PRESENT in BOTH tabs) ── */}
      <View
        style={[
          styles.filterWrapper,
          {
            backgroundColor: colors.white,
            borderBottomWidth: tab === 'report' ? 1 : 0.5,
            borderBottomColor: colors.gray200,
          },
        ]}
      >
        <ScrollView
          ref={filterScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[
            styles.periodScrollView,
            isRTL ? { transform: [{ scaleX: -1 }] } : undefined,
          ]}
          contentContainerStyle={[
            styles.filterRow,
            {
              paddingHorizontal: isTabletLandscape ? 24 : 16,
              gap: isTablet ? 10 : 8,
            },
          ]}
        >
          {/* Search Button / Expandable Search Bar on Right of Row in RTL */}
          {isSearchExpanded ? (
            <Pressable
              onPress={(e) => e.stopPropagation?.()}
              style={[
                styles.expandedSearchBox,
                isRTL && { transform: [{ scaleX: -1 }] },
                {
                  width: dynamicSearchWidth,
                  height: isTablet ? 42 : 38,
                  borderRadius: isTablet ? 21 : 19,
                  backgroundColor: isDark ? colors.gray100 : colors.white,
                  borderColor: colors.primary,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.primary} />
              <TextInput
                ref={searchInputRef}
                style={[
                  styles.expandedSearchInput,
                  {
                    color: colors.black,
                    textAlign: isRTL ? 'right' : 'left',
                    fontFamily: SETTINGS_KURDISH_FONT,
                    fontSize: isTablet ? 14 : 13,
                  },
                ]}
                placeholder={t('installmentList.searchPlaceholder')}
                placeholderTextColor={colors.gray400}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={17} color={colors.gray400} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleCollapseSearch}
                style={[
                  styles.closeSearchBtn,
                  {
                    backgroundColor: isDark ? colors.gray200 : colors.gray100,
                  },
                ]}
                hitSlop={8}
              >
                <Ionicons name="close" size={14} color={colors.gray500} />
              </TouchableOpacity>
            </Pressable>
          ) : (
            <TouchableOpacity
              onPress={handleExpandSearch}
              style={[
                styles.searchIconBtn,
                isRTL && { transform: [{ scaleX: -1 }] },
                {
                  width: isTablet ? 42 : 38,
                  height: isTablet ? 42 : 38,
                  borderRadius: isTablet ? 21 : 19,
                  backgroundColor: query ? (isDark ? colors.primary : '#1E293B') : (isDark ? colors.gray100 : colors.white),
                  borderColor: query ? (isDark ? colors.primary : '#1E293B') : colors.gray200,
                },
              ]}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="search"
                size={16}
                color={query ? '#FFFFFF' : (isDark ? colors.gray400 : '#0F172A')}
              />
              {query.length > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: '#10B981',
                  }}
                />
              )}
            </TouchableOpacity>
          )}

          {/* Period Pills: ئەمڕۆ, ئەم هەفتەیە, ئەم مانگە, ئەمساڵ, هەمووی, دیاریکراو */}
          {periodKeys.map((key) => {
            const active = periodKey === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.periodPill,
                  isRTL && { transform: [{ scaleX: -1 }] },
                  {
                    height: isTablet ? 42 : 38,
                    borderRadius: isTablet ? 21 : 19,
                    backgroundColor: active
                      ? (isDark ? colors.primary : '#1E293B')
                      : (isDark ? colors.gray100 : colors.white),
                    borderColor: active ? (isDark ? colors.primary : '#1E293B') : colors.gray200,
                  },
                ]}
                onPress={() => handlePeriodSelect(key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodPillText,
                    {
                      color: active ? '#FFFFFF' : colors.gray600,
                      fontFamily: active ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {periodLabels[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Sub-Filter Bar (فلتەری چالاک و شتە - ONLY in کەسەکان Tab) ── */}
      {tab === 'customers' && (
        <View
          style={[
            styles.filterWrapper,
            {
              backgroundColor: colors.white,
              borderBottomWidth: 1,
              borderBottomColor: colors.gray200,
              paddingTop: 2,
            },
          ]}
        >
          <ScrollView
            ref={statusScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[
              styles.periodScrollView,
              isRTL ? { transform: [{ scaleX: -1 }] } : undefined,
            ]}
            contentContainerStyle={[
              styles.filterRow,
              {
                paddingHorizontal: isTabletLandscape ? 24 : 16,
                gap: isTablet ? 10 : 8,
              },
            ]}
          >
            {/* Status Pills: هەمووی, چالاک / ماوە, تەواوبوو, کورتخایەن, درێژخایەن */}
            {statusPills.map((item) => {
              const active = statusFilter === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.periodPill,
                    isRTL && { transform: [{ scaleX: -1 }] },
                    {
                      height: isTablet ? 38 : 34,
                      borderRadius: isTablet ? 19 : 17,
                      paddingHorizontal: 14,
                      backgroundColor: active
                        ? (isDark ? colors.primary : '#1E293B')
                        : (isDark ? colors.gray100 : colors.white),
                      borderColor: active ? (isDark ? colors.primary : '#1E293B') : colors.gray200,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setStatusFilter(item.key);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.periodPillText,
                      {
                        color: active ? '#FFFFFF' : colors.gray600,
                        fontFamily: active ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                        fontSize: isTablet ? 13 : 12,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Main Scroll View ── */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, isTablet && contentContainerStyle]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════
            TAB 1: ڕاپۆرت (Report View)
           ═══════════════════════════════════════════════════════ */}
        {tab === 'report' && (
          <View>
            {/* KPI 4-Card Grid */}
            <View style={styles.kpiGrid}>
              {/* 1. Total Installments Volume */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                    borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  },
                ]}
              >
                <View style={[styles.kpiIconCircle, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="wallet-outline" size={18} color="#6366F1" />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.gray500, textAlign }]}>
                  {t('installmentList.totalInstallments')}
                </Text>
                <Text style={[styles.kpiValue, { color: colors.black, textAlign }]}>
                  {formatPrimary(periodSummary.totalGrand)}
                </Text>
                <Text style={[styles.kpiSubValue, { color: colors.gray400, textAlign }]}>
                  {formatSecondary(periodSummary.totalGrand)}
                </Text>
              </View>

              {/* 2. Total Remaining Debt */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                    borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  },
                ]}
              >
                <View style={[styles.kpiIconCircle, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="time-outline" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.gray500, textAlign }]}>
                  {t('installmentList.totalRemaining')}
                </Text>
                <Text style={[styles.kpiValue, { color: '#EF4444', textAlign, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {formatPrimary(periodSummary.totalRemaining)}
                </Text>
                <Text style={[styles.kpiSubValue, { color: colors.gray400, textAlign }]}>
                  {formatSecondary(periodSummary.totalRemaining)}
                </Text>
              </View>

              {/* 3. Total Collected so far */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                    borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  },
                ]}
              >
                <View style={[styles.kpiIconCircle, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="checkmark-done-outline" size={18} color="#10B981" />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.gray500, textAlign }]}>
                  {t('installmentList.totalCollected')}
                </Text>
                <Text style={[styles.kpiValue, { color: '#10B981', textAlign }]}>
                  {formatPrimary(periodSummary.totalCollected)}
                </Text>
                <Text style={[styles.kpiSubValue, { color: colors.gray400, textAlign }]}>
                  {formatSecondary(periodSummary.totalCollected)}
                </Text>
              </View>

              {/* 4. Expected Monthly Collections */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                    borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  },
                ]}
              >
                <View style={[styles.kpiIconCircle, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="calendar-number-outline" size={18} color="#8B5CF6" />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.gray500, textAlign }]}>
                  {t('installmentList.monthlyExpected')}
                </Text>
                <Text style={[styles.kpiValue, { color: '#8B5CF6', textAlign, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {formatPrimary(periodSummary.monthlyExpected)}
                </Text>
                <Text style={[styles.kpiSubValue, { color: colors.gray400, textAlign }]}>
                  {formatSecondary(periodSummary.monthlyExpected)}
                </Text>
              </View>
            </View>

            {/* Detailed Analytics & Breakdown Card */}
            <View
              style={[
                styles.reportAnalyticsCard,
                {
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                },
              ]}
            >
              <View style={[styles.analyticsHeader, { flexDirection }]}>
                <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
                <Text style={[styles.analyticsTitle, { color: colors.black, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {t('installmentList.statusOverview')}
                </Text>
              </View>

              {/* Progress Collection Rate Bar */}
              <View style={{ marginTop: 8 }}>
                <View style={[styles.rateHeaderRow, { flexDirection }]}>
                  <Text style={[styles.rateLabel, { color: colors.gray500 }]}>
                    {t('installmentList.collectionRate')}
                  </Text>
                  <Text style={[styles.rateValue, { color: colors.primary, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {periodSummary.collectionRate}%
                  </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? colors.gray200 : '#E2E8F0', marginTop: 6 }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${periodSummary.collectionRate}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Status Breakdown Row */}
              <View style={[styles.breakdownRow, { flexDirection, marginTop: 14 }]}>
                {/* Active Accounts */}
                <View
                  style={[
                    styles.breakdownBox,
                    {
                      backgroundColor: isDark ? '#78350F22' : '#FEF3C7',
                      borderColor: isDark ? '#78350F55' : '#FDE68A',
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={16} color="#D97706" />
                  <Text style={[styles.breakdownBoxTitle, { color: '#B45309' }]}>
                    {t('installmentList.active')}
                  </Text>
                  <Text style={[styles.breakdownBoxCount, { color: '#B45309', fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {periodSummary.activeAccounts}
                  </Text>
                </View>

                {/* Settled Accounts */}
                <View
                  style={[
                    styles.breakdownBox,
                    {
                      backgroundColor: isDark ? '#064E3B22' : '#ECFDF5',
                      borderColor: isDark ? '#064E3B55' : '#A7F3D0',
                    },
                  ]}
                >
                  <Ionicons name="checkmark-done-circle-outline" size={16} color="#059669" />
                  <Text style={[styles.breakdownBoxTitle, { color: '#047857' }]}>
                    {t('installmentList.settled')}
                  </Text>
                  <Text style={[styles.breakdownBoxCount, { color: '#047857', fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {periodSummary.settledAccounts}
                  </Text>
                </View>

                {/* Short-term (≤ 6 mo) */}
                <View
                  style={[
                    styles.breakdownBox,
                    {
                      backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                      borderColor: isDark ? colors.gray300 : '#E2E8F0',
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={16} color="#6366F1" />
                  <Text style={[styles.breakdownBoxTitle, { color: colors.gray600 }]}>
                    {isArLanguage ? '≤ ٦ أشهر' : isKuLanguage ? '≤ ٦ مانگ' : '≤ 6 mo'}
                  </Text>
                  <Text style={[styles.breakdownBoxCount, { color: colors.black, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {periodSummary.shortTermCount}
                  </Text>
                </View>

                {/* Long-term (> 6 mo) */}
                <View
                  style={[
                    styles.breakdownBox,
                    {
                      backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                      borderColor: isDark ? colors.gray300 : '#E2E8F0',
                    },
                  ]}
                >
                  <Ionicons name="calendar-number-outline" size={16} color="#8B5CF6" />
                  <Text style={[styles.breakdownBoxTitle, { color: colors.gray600 }]}>
                    {isArLanguage ? '> ٦ أشهر' : isKuLanguage ? '> ٦ مانگ' : '> 6 mo'}
                  </Text>
                  <Text style={[styles.breakdownBoxCount, { color: colors.black, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {periodSummary.longTermCount}
                  </Text>
                </View>
              </View>

              {/* Button to jump to customers view */}
              <TouchableOpacity
                style={[styles.jumpToCustomersBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTab('customers');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="people" size={18} color="#FFFFFF" />
                <Text style={[styles.jumpToCustomersText, { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {t('installmentList.customersTab')} ({periodFilteredInstallments.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════
            TAB 2: کەسەکان (Customers & Payments View)
           ═══════════════════════════════════════════════════════ */}
        {tab === 'customers' && (
          <View>
            {/* List of Customer Installment Cards */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : visibleInstallments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]}>
                  <Ionicons name="people-outline" size={36} color={colors.gray400} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.black, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {t('installmentList.noInstallmentsFound')}
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.gray500, textAlign: 'center' }]}>
                  {t('installmentList.noInstallmentsDesc')}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {visibleInstallments.map((item) => renderCustomerCard(item))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Payment Modal (Centered) ── */}
      <Modal
        visible={payModalVisible}
        transparent
        animationType="fade"
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
        onRequestClose={() => setPayModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPayModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}
          >
            <Pressable
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  maxHeight: Math.min(windowHeight * 0.90, 750),
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <View style={[styles.modalHeader, { flexDirection }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.black, textAlign, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {payMode === 'custom'
                      ? (isArLanguage ? 'دفع آخر (تسوية / مبلغ مخصص)' : isKuLanguage ? 'دانەوەی تر (سافکردن / بڕی دڵخواز)' : 'Other Payment / Settle')
                      : t('installmentList.paymentModalTitle')}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.gray500, textAlign }]}>
                    {selectedSaleForPay?.customerName} • {selectedSaleForPay?.invoiceNumber}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPayModalVisible(false)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={colors.gray500} />
                </TouchableOpacity>
              </View>

              {/* Scrollable Body */}
              <ScrollView
                showsVerticalScrollIndicator={true}
                bounces={true}
                keyboardShouldPersistTaps="handled"
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {/* Real-time Current Timestamp Indicator for دانەوەی تر */}
                {payMode === 'custom' && (
                  <View
                    style={[
                      styles.realTimeBadge,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                        borderColor: isDark ? colors.gray300 : '#E2E8F0',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text
                      style={[
                        styles.realTimeBadgeText,
                        { color: isDark ? '#FFFFFF' : '#334155', fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isArLanguage ? 'تاريخ ووقت الدفع:' : isKuLanguage ? 'بەروار و کاتی پارەدان:' : 'Date & Time:'} {formattedRealTime}
                    </Text>
                  </View>
                )}

                {/* Remaining Balance Summary Banner */}
                {selectedSaleForPay && (
                  <View
                    style={[
                      styles.modalBanner,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                        borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FEE2E2',
                      },
                    ]}
                  >
                    <View style={{ flexDirection, justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.modalBannerLabel, { color: '#EF4444', textAlign }]}>
                        {t('installmentList.remainingDebt')}:
                      </Text>
                      <Text style={[styles.modalBannerValue, { color: '#EF4444', fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                        {formatPrimary(selectedSaleForPay.remainingDebt)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Quick Amount Selector Pills */}
                {selectedSaleForPay && (
                  payMode === 'custom' ? (
                    /* In دانەوەی تر: ONLY Real Settle All & Clear (NO مانگانە) */
                    <View style={[styles.quickAmountRow, { flexDirection }]}>
                      {/* Settle All (هەمووی ساف بکە) */}
                      <TouchableOpacity
                        style={[
                          styles.quickPill,
                          {
                            backgroundColor: isDark ? '#7F1D1D22' : '#FEF2F2',
                            borderColor: isDark ? '#EF444466' : '#FCA5A5',
                            flex: 1.4,
                          },
                        ]}
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          const inCurr = isUSD
                            ? selectedSaleForPay.remainingDebt / exchangeRate
                            : selectedSaleForPay.remainingDebt;
                          setPayAmountInput(isUSD ? inCurr.toFixed(2) : String(Math.round(inCurr)));
                          if (!payNote) setPayNote(isArLanguage ? 'تسوية كامل الدين' : isKuLanguage ? 'سافکردنی تەواوی قەرز' : 'Full debt settlement');
                        }}
                      >
                        <Ionicons name="flash-outline" size={15} color="#EF4444" style={{ marginHorizontal: 4 }} />
                        <Text style={[styles.quickPillText, { color: '#DC2626', fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {isArLanguage
                            ? `تسوية كامل المبلغ (${formatPrimary(selectedSaleForPay.remainingDebt)})`
                            : isKuLanguage
                            ? `هەمووی ساف بکە (${formatPrimary(selectedSaleForPay.remainingDebt)})`
                            : `Settle all (${formatPrimary(selectedSaleForPay.remainingDebt)})`}
                        </Text>
                      </TouchableOpacity>

                      {/* Clear input */}
                      {payAmountInput.length > 0 && (
                        <TouchableOpacity
                          style={[
                            styles.quickPill,
                            {
                              backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                              borderColor: isDark ? colors.gray300 : '#CBD5E1',
                              flex: 0.6,
                            },
                          ]}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setPayAmountInput('');
                          }}
                        >
                          <Text style={[styles.quickPillText, { color: colors.gray600 }]}>
                            {isArLanguage ? 'مسح' : isKuLanguage ? 'سڕینەوە' : 'Clear'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    /* In دانەوەی مانگانە */
                    <View style={[styles.quickAmountRow, { flexDirection }]}>
                      {/* 1 Month */}
                      <TouchableOpacity
                        style={[
                          styles.quickPill,
                          {
                            backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                            borderColor: isDark ? colors.gray300 : '#CBD5E1',
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          const amtIQD = Math.min(selectedSaleForPay.installmentMonthlyAmount, selectedSaleForPay.remainingDebt);
                          const inCurr = isUSD ? amtIQD / exchangeRate : amtIQD;
                          setPayAmountInput(isUSD ? inCurr.toFixed(2) : String(Math.round(inCurr)));
                        }}
                      >
                        <Text style={[styles.quickPillText, { color: colors.black }]}>
                          {t('installmentList.payOneMonth')} ({formatPrimary(selectedSaleForPay.installmentMonthlyAmount)})
                        </Text>
                      </TouchableOpacity>

                      {/* Full Remaining */}
                      <TouchableOpacity
                        style={[
                          styles.quickPill,
                          {
                            backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                            borderColor: isDark ? colors.gray300 : '#CBD5E1',
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          const inCurr = isUSD
                            ? selectedSaleForPay.remainingDebt / exchangeRate
                            : selectedSaleForPay.remainingDebt;
                          setPayAmountInput(isUSD ? inCurr.toFixed(2) : String(Math.round(inCurr)));
                        }}
                      >
                        <Text style={[styles.quickPillText, { color: colors.black, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {t('installmentList.payFullRemaining')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                )}

                {/* Amount Input */}
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.inputLabel, { color: colors.gray500, textAlign }]}>
                    {t('installmentList.paymentAmount')} ({isUSD ? 'USD' : 'IQD'}):
                  </Text>
                  <View
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                        borderColor: isDark ? colors.gray300 : '#E2E8F0',
                        flexDirection,
                      },
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.inputControl,
                        {
                          color: colors.black,
                          textAlign,
                          fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                        },
                      ]}
                      keyboardType="numeric"
                      value={payAmountInput}
                      onChangeText={setPayAmountInput}
                      placeholder="0.00"
                      placeholderTextColor={colors.gray400}
                    />
                    <Text style={[styles.inputCurrency, { color: colors.primary, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                      {isUSD ? 'USD' : 'IQD'}
                    </Text>
                  </View>

                  {/* Conversion preview */}
                  {parseFloat(payAmountInput) > 0 && (
                    <Text style={[styles.conversionHint, { color: colors.gray400, textAlign }]}>
                      {isUSD
                        ? `≈ ${fmtIQD(parseFloat(payAmountInput || '0') * exchangeRate)} IQD`
                        : `≈ $${fmtUSD(parseFloat(payAmountInput || '0') / exchangeRate)}`}
                    </Text>
                  )}
                </View>

                {/* Payment Method Selector (FIB و کاش) */}
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.inputLabel, { color: colors.gray500, textAlign }]}>
                    {t('installmentList.paymentMethod')}:
                  </Text>
                  <View style={[styles.methodRow, { flexDirection }]}>
                    <TouchableOpacity
                      style={[
                        styles.methodBtn,
                        payMethod === 'cash'
                          ? { backgroundColor: isDark ? colors.primary : '#1E293B', borderColor: isDark ? colors.primary : '#1E293B' }
                          : {
                              backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                              borderColor: isDark ? colors.gray300 : '#E2E8F0',
                            },
                      ]}
                      onPress={() => setPayMethod('cash')}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={16}
                        color={payMethod === 'cash' ? '#FFFFFF' : colors.black}
                      />
                      <Text
                        style={[
                          styles.methodBtnText,
                          {
                            color: payMethod === 'cash' ? '#FFFFFF' : colors.black,
                            fontFamily: payMethod === 'cash' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                          },
                        ]}
                      >
                        {t('installmentList.cash', 'کاش')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.methodBtn,
                        payMethod === 'fib'
                          ? { backgroundColor: isDark ? colors.primary : '#1E293B', borderColor: isDark ? colors.primary : '#1E293B' }
                          : {
                              backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                              borderColor: isDark ? colors.gray300 : '#E2E8F0',
                            },
                      ]}
                      onPress={() => setPayMethod('fib')}
                    >
                      <Ionicons
                        name="card-outline"
                        size={16}
                        color={payMethod === 'fib' ? '#FFFFFF' : colors.black}
                      />
                      <Text
                        style={[
                          styles.methodBtnText,
                          {
                            color: payMethod === 'fib' ? '#FFFFFF' : colors.black,
                            fontFamily: payMethod === 'fib' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                          },
                        ]}
                      >
                        FIB
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Optional Note */}
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.inputLabel, { color: colors.gray500, textAlign }]}>
                    {t('installmentList.note')}:
                  </Text>
                  <TextInput
                    style={[
                      styles.noteInput,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                        borderColor: isDark ? colors.gray300 : '#E2E8F0',
                        color: colors.black,
                        textAlign,
                        fontFamily: SETTINGS_KURDISH_FONT,
                      },
                    ]}
                    placeholder={payMode === 'custom' ? (isArLanguage ? 'ملاحظة (مثال: تسوية كامل الدين...)' : isKuLanguage ? 'تێبینی (بۆ نموونە: سافکردنی تەواوی قەرز...)' : 'Note...') : t('installmentList.notePlaceholder')}
                    placeholderTextColor={colors.gray400}
                    value={payNote}
                    onChangeText={setPayNote}
                  />
                </View>

                {/* Paper Size for Payment Receipt (4 Formats) */}
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.inputLabel, { color: colors.gray500, textAlign }]}>
                    {isArLanguage ? 'نوع إيصال الطباعة (٤ أحجام):' : isKuLanguage ? 'جۆری وەسڵی چاپکردن (٤ قەبارە):' : 'Receipt Print Size (4 sizes):'}
                  </Text>
                  <View style={[styles.methodRow, { flexDirection, gap: 6 }]}>
                    {(['80mm', '58mm', '110mm', 'A4'] as DebtReceiptPaperSize[]).map((size) => {
                      const isSelected = payReceiptPaperSize === size;
                      return (
                        <TouchableOpacity
                          key={size}
                          style={[
                            styles.methodBtn,
                            isSelected
                              ? { backgroundColor: isDark ? colors.primary : '#1E293B', borderColor: isDark ? colors.primary : '#1E293B' }
                              : {
                                  backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                                  borderColor: isDark ? colors.gray300 : '#E2E8F0',
                                },
                          ]}
                          onPress={() => setPayReceiptPaperSize(size)}
                        >
                          <Text
                            style={[
                              styles.methodBtnText,
                              {
                                color: isSelected ? '#FFFFFF' : colors.black,
                                fontFamily: isSelected ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                              },
                            ]}
                          >
                            {size === 'A4' ? 'A4' : size}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ── Action Buttons: 1. Normal Complete | 2. Complete & Print ── */}
                <View style={[styles.payActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10, marginTop: 14 }]}>
                  {/* 1. Normal Complete (Without Printing) */}
                  <TouchableOpacity
                    style={[
                      styles.normalPayBtn,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                        borderColor: isDark ? colors.gray300 : '#CBD5E1',
                        opacity: isSubmittingPayment ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => handleConfirmPayment(false)}
                    disabled={isSubmittingPayment}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color={isDark ? '#FFFFFF' : '#0F172A'} />
                    <Text
                      style={[
                        styles.normalPayBtnText,
                        {
                          color: isDark ? '#FFFFFF' : '#0F172A',
                          fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {isArLanguage ? 'إكمال عادي' : isKuLanguage ? 'تەواوکردنی ئاسایی' : 'Normal Complete'}
                    </Text>
                  </TouchableOpacity>

                  {/* 2. Complete & Print */}
                  <TouchableOpacity
                    style={[
                      styles.printPayBtn,
                      {
                        backgroundColor: isDark ? colors.primary : '#1E293B',
                        opacity: isSubmittingPayment ? 0.6 : 1,
                      },
                    ]}
                    onPress={() => handleConfirmPayment(true)}
                    disabled={isSubmittingPayment}
                    activeOpacity={0.8}
                  >
                    {isSubmittingPayment ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="print-outline" size={17} color="#FFFFFF" />
                        <Text
                          style={[
                            styles.printPayBtnText,
                            {
                              color: '#FFFFFF',
                              fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {isArLanguage ? `إكمال وطباعة (${payReceiptPaperSize})` : isKuLanguage ? `تەواوکردن و چاپ (${payReceiptPaperSize})` : `Complete & Print (${payReceiptPaperSize})`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── Beautiful Table/Card Modal for Invoices & Receipts ("تەبلێ جوان") ── */}
      <Modal
        visible={receiptPickerModalVisible}
        transparent
        animationType="fade"
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
        onRequestClose={() => setReceiptPickerModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setReceiptPickerModalVisible(false)}
        >
          <Pressable
            style={[
              styles.receiptTableModalCard,
              {
                backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                borderColor: isDark ? colors.gray200 : '#E2E8F0',
                maxHeight: Math.min(windowHeight * 0.9, 740),
                width: isTablet ? Math.min(windowWidth - 64, 580) : Math.min(windowWidth - 28, 440),
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* 1. Header */}
            <View style={[styles.receiptModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={[
                    styles.receiptModalHeaderIconWrap,
                    {
                      backgroundColor: isDark ? 'rgba(212, 175, 55, 0.15)' : '#FEF9C3',
                      borderColor: isDark ? 'rgba(212, 175, 55, 0.35)' : '#FDE047',
                    },
                  ]}
                >
                  <Ionicons name="receipt" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.receiptModalTitle,
                      { color: colors.black, textAlign },
                      (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isArLanguage ? 'فواتير وإيصالات الأقساط' : isKuLanguage ? 'پسوولە و وەسڵەکانی قیست' : 'Installment Receipts & Invoices'}
                  </Text>
                  <Text
                    style={[
                      styles.receiptModalSubtitle,
                      { color: colors.gray500, textAlign },
                      (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  >
                    {isArLanguage
                      ? 'اختر الوصل أو الفاتورة للمعاينة والطباعة (٤ أحجام)'
                      : isKuLanguage
                      ? 'پسوولە یان وەسڵ هەڵبژێرە بۆ چاپکردن بە هەر ٤ قەبارەکە'
                      : 'Choose invoice or receipt to preview & print (4 sizes)'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setReceiptPickerModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            {selectedReceiptSale && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
                {/* 2. Customer Summary Card */}
                <View
                  style={[
                    styles.receiptCustomerSummaryCard,
                    {
                      backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                      borderColor: isDark ? colors.gray300 : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={[styles.receiptCustomerTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Ionicons name="person-circle" size={18} color={colors.primary} />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.receiptCustomerName,
                          { color: colors.black },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {selectedReceiptSale.customerName}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.receiptInvoiceBadge,
                        {
                          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                          borderColor: isDark ? 'rgba(99, 102, 241, 0.35)' : '#C7D2FE',
                        },
                      ]}
                    >
                      <IdText style={[styles.receiptInvoiceBadgeText, { color: '#6366F1' }]}>
                        #{selectedReceiptSale.invoiceNumber}
                      </IdText>
                    </View>
                  </View>

                  {/* Financial KPI Row */}
                  <View
                    style={[
                      styles.receiptFinanceRow,
                      {
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                        borderTopColor: isDark ? colors.gray300 : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.receiptFinanceCol}>
                      <Text style={[styles.receiptFinanceLabel, { color: colors.gray500, textAlign }]}>
                        {isArLanguage ? 'الإجمالي' : isKuLanguage ? 'کۆی گشتی' : 'Total'}
                      </Text>
                      <Text
                        style={[
                          styles.receiptFinanceValue,
                          { color: colors.black, textAlign },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {formatPrimary(selectedReceiptSale.grandTotal)}
                      </Text>
                    </View>

                    <View style={styles.receiptFinanceCol}>
                      <Text style={[styles.receiptFinanceLabel, { color: colors.gray500, textAlign }]}>
                        {isArLanguage ? 'المدفوع' : isKuLanguage ? 'دراو' : 'Paid'}
                      </Text>
                      <Text
                        style={[
                          styles.receiptFinanceValue,
                          { color: '#10B981', textAlign },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {formatPrimary(selectedReceiptSale.paidAmount)}
                      </Text>
                    </View>

                    <View style={styles.receiptFinanceCol}>
                      <Text style={[styles.receiptFinanceLabel, { color: colors.gray500, textAlign }]}>
                        {isArLanguage ? 'المتبقي' : isKuLanguage ? 'ماوە' : 'Remaining'}
                      </Text>
                      <Text
                        style={[
                          styles.receiptFinanceValue,
                          {
                            color: selectedReceiptSale.remainingDebt <= 0 ? '#10B981' : '#EF4444',
                            textAlign,
                          },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {formatPrimary(selectedReceiptSale.remainingDebt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 3. Section Label */}
                <Text
                  style={[
                    styles.receiptSectionHeader,
                    { color: colors.gray600, textAlign },
                    (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isArLanguage ? 'قائمة الفواتير والإيصالات المتاحة:' : isKuLanguage ? 'لیستی پسوولە و وەسڵە بەردەستەکان:' : 'Available Documents & Actions:'}
                </Text>

                {/* 4. Table Cards List ("تەبلێ جوان") */}
                <View style={{ gap: 10 }}>
                  {/* Row 1: Sales Invoice (فاتورة البيع الأصلية) */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setReceiptPickerModalVisible(false);
                      setTimeout(() => handleViewInvoice(selectedReceiptSale.saleId), 200);
                    }}
                    style={[
                      styles.receiptTableRow,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#FFFFFF',
                        borderColor: isDark ? colors.gray300 : '#CBD5E1',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.receiptTableRowIconWrap,
                        {
                          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                          borderColor: isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
                        },
                      ]}
                    >
                      <Ionicons name="document-text" size={22} color="#3B82F6" />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text
                          style={[
                            styles.receiptTableRowTitle,
                            { color: colors.black },
                            (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {isArLanguage ? 'فاتورة البيع الأصلية' : isKuLanguage ? 'پسوولەی فرۆشتنی سەرەکی' : 'Original Sales Invoice'}
                        </Text>
                        <View style={[styles.receiptPillTag, { backgroundColor: hexToRgba(colors.primary, 0.15) }]}>
                          <Text style={[styles.receiptPillTagText, { color: colors.primary }]}>
                            {isArLanguage ? '٤ أحجام' : isKuLanguage ? '٤ قەبارە' : '4 sizes'}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.receiptTableRowSubtitle,
                          { color: colors.gray500, textAlign },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT },
                        ]}
                      >
                        {isArLanguage
                          ? `فاتورة البيع الكاملة (${selectedReceiptSale.itemsCount || 0} مواد) • ${formatDate(selectedReceiptSale.saleDate)}`
                          : isKuLanguage
                          ? `پسوولەی گشتی فرۆشتن (${selectedReceiptSale.itemsCount || 0} کاڵا) • ${formatDate(selectedReceiptSale.saleDate)}`
                          : `Sales invoice (${selectedReceiptSale.itemsCount || 0} items) • ${formatDate(selectedReceiptSale.saleDate)}`}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.receiptActionBtnPill,
                        {
                          backgroundColor: isDark ? colors.primary : '#1E293B',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <Ionicons name="print-outline" size={14} color="#FFFFFF" />
                      <Text
                        style={[
                          styles.receiptActionBtnPillText,
                          { color: '#FFFFFF' },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {isArLanguage ? 'معاينة / طباعة' : isKuLanguage ? 'بینین / چاپ' : 'Print'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Row 2: Latest Payment Receipt (إيصال آخر دفعة تسديد) */}
                  {selectedReceiptSale.paymentsCount > 0 ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setReceiptPickerModalVisible(false);
                        setTimeout(() => openLatestReceipt(selectedReceiptSale), 200);
                      }}
                      style={[
                        styles.receiptTableRow,
                        {
                          backgroundColor: isDark ? colors.gray200 : '#FFFFFF',
                          borderColor: isDark ? colors.gray300 : '#CBD5E1',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.receiptTableRowIconWrap,
                          {
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                            borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0',
                          },
                        ]}
                      >
                        <Ionicons name="cash" size={22} color="#10B981" />
                      </View>

                      <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text
                            style={[
                              styles.receiptTableRowTitle,
                              { color: colors.black },
                              (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                            ]}
                          >
                            {isArLanguage ? 'إيصال آخر دفعة تسديد' : isKuLanguage ? 'وەسڵی دوایین پارەدان' : 'Latest Payment Receipt'}
                          </Text>
                          <View
                            style={[
                              styles.receiptPillTag,
                              { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' },
                            ]}
                          >
                            <Text style={[styles.receiptPillTagText, { color: '#059669' }]}>
                              {isArLanguage ? `${selectedReceiptSale.paymentsCount} دفعات` : isKuLanguage ? `${selectedReceiptSale.paymentsCount} پارەدان` : `${selectedReceiptSale.paymentsCount} payments`}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.receiptTableRowSubtitle,
                            { color: colors.gray500, textAlign },
                            (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT },
                          ]}
                        >
                          {isArLanguage
                            ? `إيصال تسديد رسمي • تاريخ: ${selectedReceiptSale.latestPaymentDate ? formatDate(selectedReceiptSale.latestPaymentDate) : '-'}`
                            : isKuLanguage
                            ? `وەسڵی فەرمی پارەدان • بەروار: ${selectedReceiptSale.latestPaymentDate ? formatDate(selectedReceiptSale.latestPaymentDate) : '-'}`
                            : `Official receipt • Date: ${selectedReceiptSale.latestPaymentDate ? formatDate(selectedReceiptSale.latestPaymentDate) : '-'}`}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.receiptActionBtnPill,
                          {
                            backgroundColor: '#10B981',
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                      >
                        <Ionicons name="receipt-outline" size={14} color="#FFFFFF" />
                        <Text
                          style={[
                            styles.receiptActionBtnPillText,
                            { color: '#FFFFFF' },
                            (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {isArLanguage ? 'طباعة الوصل' : isKuLanguage ? 'چاپی وەسڵ' : 'Receipt'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.receiptTableRow,
                        {
                          backgroundColor: isDark ? colors.gray200 : '#F8FAFC',
                          borderColor: isDark ? colors.gray300 : '#E2E8F0',
                          borderStyle: 'dashed',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                          opacity: 0.75,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.receiptTableRowIconWrap,
                          {
                            backgroundColor: isDark ? 'rgba(100, 116, 139, 0.15)' : '#F1F5F9',
                            borderColor: isDark ? 'rgba(100, 116, 139, 0.3)' : '#CBD5E1',
                          },
                        ]}
                      >
                        <Ionicons name="receipt-outline" size={22} color={colors.gray400} />
                      </View>

                      <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text
                          style={[
                            styles.receiptTableRowTitle,
                            { color: colors.gray500 },
                            (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {isArLanguage ? 'إيصال تسديد القسط' : isKuLanguage ? 'وەسڵی پارەدانی قیست' : 'Installment Payment Receipt'}
                        </Text>
                        <Text
                          style={[
                            styles.receiptTableRowSubtitle,
                            { color: colors.gray400, textAlign },
                            (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT },
                          ]}
                        >
                          {isArLanguage
                            ? 'لم يتم تسجيل أي دفعة تسديد لهذا القسط حتى الآن'
                            : isKuLanguage
                            ? 'هێشتا هیچ پارەدانێک بۆ ئەم قیستە تۆمار نەکراوە'
                            : 'No payment made yet for this installment'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.receiptActionBtnPill,
                          {
                            backgroundColor: isDark ? colors.gray300 : '#E2E8F0',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.receiptActionBtnPillText,
                            { color: colors.gray500 },
                            (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT },
                          ]}
                        >
                          {isArLanguage ? 'لا توجد دفعات' : isKuLanguage ? 'پارە نەدراوە' : 'None'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Row 3: Schedule & Due Dates */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setReceiptPickerModalVisible(false);
                      setTimeout(() => openScheduleModal(selectedReceiptSale), 200);
                    }}
                    style={[
                      styles.receiptTableRow,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#FFFFFF',
                        borderColor: isDark ? colors.gray300 : '#CBD5E1',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.receiptTableRowIconWrap,
                        {
                          backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
                          borderColor: isDark ? 'rgba(139, 92, 246, 0.35)' : '#DDD6FE',
                        },
                      ]}
                    >
                      <Ionicons name="calendar-outline" size={22} color="#8B5CF6" />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text
                        style={[
                          styles.receiptTableRowTitle,
                          { color: colors.black },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {isArLanguage ? 'جدول ومواعيد الأقساط' : isKuLanguage ? 'خشتە و بەرواری قیستەکان' : 'Installment Schedule'}
                      </Text>
                      <Text
                        style={[
                          styles.receiptTableRowSubtitle,
                          { color: colors.gray500, textAlign },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT },
                        ]}
                      >
                        {isArLanguage
                          ? `${selectedReceiptSale.installmentMonths} أشهر • القسط الشهري: ${formatPrimary(selectedReceiptSale.installmentMonthlyAmount)}`
                          : isKuLanguage
                          ? `${selectedReceiptSale.installmentMonths} مانگ • قیستی مانگانە: ${formatPrimary(selectedReceiptSale.installmentMonthlyAmount)}`
                          : `${selectedReceiptSale.installmentMonths} months • Monthly: ${formatPrimary(selectedReceiptSale.installmentMonthlyAmount)}`}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.receiptActionBtnPill,
                        {
                          backgroundColor: isDark ? colors.gray300 : '#F1F5F9',
                          borderColor: isDark ? colors.gray400 : '#CBD5E1',
                          borderWidth: 1,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <Ionicons name="calendar" size={13} color={colors.black} />
                      <Text
                        style={[
                          styles.receiptActionBtnPillText,
                          { color: colors.black },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {isArLanguage ? 'عرض الجدول' : isKuLanguage ? 'بینینی خشتە' : 'View'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Row 4: View in Invoices Hub */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setReceiptPickerModalVisible(false);
                      router.push({
                        pathname: '/(app)/invoices',
                        params: {
                          tab: 'installments',
                        },
                      });
                    }}
                    style={[
                      styles.receiptTableRow,
                      {
                        backgroundColor: isDark ? colors.gray200 : '#FFFFFF',
                        borderColor: isDark ? colors.gray300 : '#CBD5E1',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.receiptTableRowIconWrap,
                        {
                          backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : '#F0F9FF',
                          borderColor: isDark ? 'rgba(2, 132, 199, 0.35)' : '#BAE6FD',
                        },
                      ]}
                    >
                      <Ionicons name="documents-outline" size={22} color="#0284C7" />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 8, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text
                        style={[
                          styles.receiptTableRowTitle,
                          { color: colors.black },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {isArLanguage ? 'عرض كافة الفواتير في قسم الفواتير' : isKuLanguage ? 'بینینی هەموو وەسڵەکان لە بەشی پسوڵەکان' : 'Invoices Hub'}
                      </Text>
                      <Text
                        style={[
                          styles.receiptTableRowSubtitle,
                          { color: colors.gray500, textAlign },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT },
                        ]}
                      >
                        {isArLanguage
                          ? 'الانتقال إلى قسم الفواتير والإيصالات الشاملة'
                          : isKuLanguage
                          ? 'دەستگەیشتنی ڕاستەوخۆ بە بەشی سەرەکی پسوڵەکان'
                          : 'Open invoices and receipts section'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.receiptActionBtnPill,
                        {
                          backgroundColor: '#0284C7',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={14} color="#FFFFFF" />
                      <Text
                        style={[
                          styles.receiptActionBtnPillText,
                          { color: '#FFFFFF' },
                          (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {isArLanguage ? 'فتح' : isKuLanguage ? 'چوون' : 'Open'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 5. Footer Dismiss Button */}
                <TouchableOpacity
                  onPress={() => setReceiptPickerModalVisible(false)}
                  style={[
                    styles.receiptModalCloseBtnFull,
                    {
                      backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                      borderColor: isDark ? colors.gray300 : '#CBD5E1',
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.receiptModalCloseBtnFullText,
                      { color: colors.gray700 },
                      (isKuLanguage || isArLanguage) && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                    ]}
                  >
                    {isArLanguage ? 'إغلاق' : isKuLanguage ? 'داخستن' : 'Close'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Month-by-Month Schedule Modal (Centered) ── */}
      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="fade"
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setScheduleModalVisible(false)}
        >
            <Pressable
              style={[
                styles.modalCard,
                {
                  backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                  borderColor: isDark ? colors.gray200 : '#E2E8F0',
                  maxHeight: Math.min(windowHeight * 0.85, 680),
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <View style={[styles.modalHeader, { flexDirection }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.black, textAlign, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {t('installmentList.scheduleModalTitle')}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.gray500, textAlign }]}>
                  {selectedSaleForSchedule?.customerName} • {selectedSaleForSchedule?.installmentMonths} {t('installmentList.months')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setScheduleModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.gray500} />
              </TouchableOpacity>
            </View>

            {/* Schedule List */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
              {selectedSaleForSchedule &&
                Array.from({ length: selectedSaleForSchedule.installmentMonths }).map((_, idx) => {
                  const monthNum = idx + 1;
                  const baseDate = new Date(selectedSaleForSchedule.saleDate || Date.now());
                  const dueDate = new Date(baseDate);
                  dueDate.setMonth(dueDate.getMonth() + monthNum);

                  const paidForMonths = Math.max(0, selectedSaleForSchedule.paidAmount - selectedSaleForSchedule.installmentDownPayment);
                  const monthTarget = monthNum * selectedSaleForSchedule.installmentMonthlyAmount;
                  const isPaid = paidForMonths >= (monthTarget - 0.05);

                  return (
                    <View
                      key={`schedule-mo-${monthNum}`}
                      style={[
                        styles.scheduleRow,
                        {
                          backgroundColor: isPaid
                            ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4')
                            : (isDark ? colors.gray200 : '#F8FAFC'),
                          borderColor: isPaid
                            ? (isDark ? 'rgba(16, 185, 129, 0.3)' : '#BBF7D0')
                            : (isDark ? colors.gray300 : '#E2E8F0'),
                          flexDirection,
                        },
                      ]}
                    >
                      <View style={{ flexDirection, alignItems: 'center', gap: 10 }}>
                        <View
                          style={[
                            styles.scheduleNumCircle,
                            {
                              backgroundColor: isPaid ? '#10B981' : (isDark ? colors.gray300 : '#CBD5E1'),
                            },
                          ]}
                        >
                          <Text style={[styles.scheduleNumText, { color: '#FFFFFF', fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                            {monthNum}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.scheduleMonthTitle, { color: colors.black, textAlign, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                            {t('installmentList.monthNum', { num: monthNum })}
                          </Text>
                          <Text style={[styles.scheduleDueDate, { color: colors.gray500, textAlign }]}>
                            {t('installmentList.dueDate')}: {formatDate(dueDate.toISOString())}
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }}>
                        <Text style={[styles.scheduleMonthAmt, { color: colors.black, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                          {formatPrimary(selectedSaleForSchedule.installmentMonthlyAmount)}
                        </Text>
                        <View
                          style={[
                            styles.scheduleStatusTag,
                            {
                              backgroundColor: isPaid
                                ? (isDark ? '#064E3B' : '#DCFCE7')
                                : (isDark ? '#78350F' : '#FEF3C7'),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.scheduleStatusTagText,
                              {
                                color: isPaid ? '#10B981' : '#F59E0B',
                                fontFamily: SETTINGS_KURDISH_FONT_BOLD,
                              },
                            ]}
                          >
                            {isPaid ? t('installmentList.paidStatus') : t('installmentList.remainingStatus')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Payment Receipt Modal (with 4 paper sizes) ── */}
      <DebtPaymentReceiptModal
        visible={receiptModalVisible}
        receipt={lastPaymentReceipt}
        initialPaperSize={payReceiptPaperSize}
        onClose={() => setReceiptModalVisible(false)}
        onPrinted={() => {
          loadData();
        }}
      />

      {/* ── Sale Invoice Preview Modal (with 4 paper sizes) ── */}
      <Modal
        visible={invoiceModalVisible}
        animationType="slide"
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
        onRequestClose={() => setInvoiceModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.white }}>
          <View
            style={{
              paddingTop: Platform.OS === 'ios' ? 48 : 16,
              paddingBottom: 10,
              paddingHorizontal: 16,
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: isDark ? colors.gray200 : '#E2E8F0',
            }}
          >
            <View
              style={{
                flexDirection,
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setInvoiceModalVisible(false)}
                style={{
                  flexDirection,
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                }}
              >
                <Ionicons name="arrow-back" size={18} color={colors.black} />
                <Text style={{ color: colors.black, fontSize: 13, fontFamily: SETTINGS_KURDISH_FONT_BOLD }}>
                  {t('common.close')}
                </Text>
              </TouchableOpacity>

              {viewingSale && (
                <TouchableOpacity
                  onPress={() => {
                    const biz = useBusinessStore.getState();
                    directPrintInvoice(
                      viewingSale,
                      {
                        name: biz.name,
                        phone: biz.phone,
                        address: biz.address,
                        logoUri: biz.logoUri,
                      },
                      'both',
                      invoicePaperSize
                    );
                  }}
                  style={{
                    flexDirection,
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 7,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                  }}
                >
                  <Ionicons name="print" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: SETTINGS_KURDISH_FONT_BOLD }}>
                    {isArLanguage ? `طباعة (${invoicePaperSize})` : isKuLanguage ? `چاپکردن (${invoicePaperSize})` : `Print (${invoicePaperSize})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 4 Paper Sizes Selector Bar: A4, 80mm, 58mm, 110mm */}
            <View style={{ flexDirection, gap: 6, alignItems: 'center' }}>
              {(['A4', '80mm', '58mm', '110mm'] as const).map((size) => {
                const active = invoicePaperSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setInvoicePaperSize(size)}
                    style={{
                      flex: 1,
                      paddingVertical: 6,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active
                        ? (isDark ? colors.primary : '#1E293B')
                        : (isDark ? colors.gray200 : '#F1F5F9'),
                      borderWidth: 1,
                      borderColor: active ? (isDark ? colors.primary : '#1E293B') : colors.gray300,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: active ? '#FFFFFF' : colors.gray700,
                        fontFamily: active ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                      }}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {viewingSale && (
            <InvoiceView
              sale={viewingSale}
              currencyMode="both"
            />
          )}
        </View>
      </Modal>

      {/* ── Custom Date Range Modal ── */}
      <CustomDateRangeModal
        visible={customDateModalVisible}
        onClose={() => setCustomDateModalVisible(false)}
        initialFrom={customRange?.from}
        initialTo={customRange?.to}
        onApply={(from, to) => {
          setPeriodKey('custom');
          setCustomRange({ from, to });
          setCustomDateModalVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  // ── Segmented Control Switcher ──
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmentTrack: {
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 9,
    gap: 6,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Period Filter & Search Bar (History-style) ──
  filterWrapper: {
    paddingVertical: 6,
  },
  periodScrollView: {
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodPill: {
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillText: {
    fontSize: 13,
  },
  searchIconBtn: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedSearchBox: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
  },
  expandedSearchInput: {
    flex: 1,
    padding: 0,
  },
  closeSearchBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── KPI Grid ──
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  kpiIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  kpiSubValue: {
    fontSize: 11,
    marginTop: 2,
  },
  // ── Analytics Card in Report View ──
  reportAnalyticsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  analyticsHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  analyticsTitle: {
    fontSize: 15,
  },
  rateHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 13,
  },
  rateValue: {
    fontSize: 16,
  },
  breakdownRow: {
    flexWrap: 'wrap',
    gap: 8,
  },
  breakdownBox: {
    flex: 1,
    minWidth: '47%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  breakdownBoxTitle: {
    fontSize: 12,
  },
  breakdownBoxCount: {
    fontSize: 16,
  },
  jumpToCustomersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  jumpToCustomersText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  // ── Filters in Customers Tab ──
  filtersScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
  },
  // ── Loading & Empty ──
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  // ── Card ──
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
  },
  customerPhoneText: {
    fontSize: 12,
    marginTop: 2,
  },
  contactMiniBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  invoiceTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
  },
  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  finCol: {
    flex: 1,
    alignItems: 'center',
  },
  finLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  finValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  finDivider: {
    width: 1,
    height: 24,
  },
  planBanner: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  planIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: {
    fontSize: 14,
  },
  monthlyRateText: {
    fontSize: 14,
  },
  monthlyRateSub: {
    fontSize: 10,
    marginTop: 1,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressText: {
    fontSize: 11,
  },
  productsSummaryText: {
    fontSize: 11,
    flex: 1,
  },
  cardActionsContainer: {
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12.5,
  },
  // ── Modals (Centered Dialog Style) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBanner: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalBannerLabel: {
    fontSize: 12,
  },
  modalBannerValue: {
    fontSize: 15,
  },
  realTimeBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  realTimeBadgeText: {
    fontSize: 11.5,
  },
  quickAmountRow: {
    gap: 8,
    marginBottom: 8,
  },
  quickPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPillText: {
    fontSize: 11.5,
  },
  inputLabel: {
    fontSize: 11.5,
    marginBottom: 4,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  inputControl: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  inputCurrency: {
    fontSize: 13,
  },
  conversionHint: {
    fontSize: 10.5,
    marginTop: 2,
  },
  methodRow: {
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  methodBtnText: {
    fontSize: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  payActionsRow: {
    alignItems: 'center',
    width: '100%',
  },
  normalPayBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  normalPayBtnText: {
    fontSize: 12,
  },
  printPayBtn: {
    flex: 1.35,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  printPayBtnText: {
    fontSize: 12,
  },
  confirmPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 20,
  },
  confirmPayBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  scheduleRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  scheduleNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleNumText: {
    fontSize: 12,
  },
  scheduleMonthTitle: {
    fontSize: 13,
  },
  scheduleDueDate: {
    fontSize: 11,
    marginTop: 2,
  },
  scheduleMonthAmt: {
    fontSize: 13,
  },
  scheduleStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scheduleStatusTagText: {
    fontSize: 10,
  },
  // ── Beautiful Receipt Options Table Modal Styles ("تەبلێ جوان") ──
  receiptTableModalCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  receiptModalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  receiptModalHeaderIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptModalTitle: {
    fontSize: 17,
  },
  receiptModalSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  receiptCustomerSummaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  receiptCustomerTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  receiptCustomerName: {
    fontSize: 15,
    flexShrink: 1,
  },
  receiptInvoiceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  receiptInvoiceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  receiptFinanceRow: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
  },
  receiptFinanceCol: {
    flex: 1,
    alignItems: 'center',
  },
  receiptFinanceLabel: {
    fontSize: 10.5,
    marginBottom: 2,
  },
  receiptFinanceValue: {
    fontSize: 13,
  },
  receiptSectionHeader: {
    fontSize: 12.5,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  receiptTableRow: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  receiptTableRowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptTableRowTitle: {
    fontSize: 13.5,
  },
  receiptTableRowSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  receiptPillTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  receiptPillTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  receiptActionBtnPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  receiptActionBtnPillText: {
    fontSize: 11.5,
  },
  receiptModalCloseBtnFull: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  receiptModalCloseBtnFullText: {
    fontSize: 13.5,
  },
});
