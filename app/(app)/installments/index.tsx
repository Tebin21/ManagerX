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
import { fmtIQD, fmtUSD, toEnglishDigits, formatDate } from '@/utils/formatters';
import { getPeriodBounds, isDateWithinRange, type PeriodKey } from '@/utils/dateRanges';
import {
  getAllInstallmentSales,
  recordInstallmentPayment,
  getSaleById,
  type InstallmentSaleRow,
} from '@/lib/sqlite';
import { directPrintInvoice } from '@/lib/generateInvoice';
import type { DebtPaymentReceiptData } from '@/types/debt';
import type { Sale } from '@/types/sales';

type MainTab = 'report' | 'customers';
type StatusFilterType = 'all' | 'active' | 'settled' | 'shortTerm' | 'longTerm';

export default function InstallmentsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection } = useRTL();
  const { isTablet, isTabletLandscape, contentContainerStyle } = useResponsive();
  const { width: windowWidth } = useWindowDimensions();
  const isKuLanguage = useLanguageStore((s) => s.language === 'ku');

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

  // Main Tab State: 'report' or 'customers'
  const [tab, setTab] = useState<MainTab>('report');

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

  // Sub-filter category for the Customers tab
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');

  // Payment Modal State
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedSaleForPay, setSelectedSaleForPay] = useState<InstallmentSaleRow | null>(null);
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

  // Sale Invoice View Modal State
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

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

  // 1. Filter by Date Period
  const periodFilteredInstallments = useMemo(() => {
    if (periodKey === 'all') return installments;
    return installments.filter((item) =>
      isDateWithinRange(item.saleDate, bounds.from, bounds.to)
    );
  }, [installments, periodKey, bounds]);

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
    today: 'ئەمڕۆ',
    week: 'ئەم هەفتەیە',
    month: 'ئەم مانگە',
    year: 'ئەمساڵ',
    all: 'هەمووی',
    custom: customRange ? `${customRange.from} → ${customRange.to}` : t('installmentList.customRange', 'دیاریکراو'),
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

  // Open Payment Modal
  const openPayModal = (item: InstallmentSaleRow, presetAmount?: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSaleForPay(item);
    const initialAmtIQD = presetAmount !== undefined ? presetAmount : item.installmentMonthlyAmount;
    const clampedAmtIQD = Math.min(initialAmtIQD, item.remainingDebt);
    const inCurrency = isUSD ? clampedAmtIQD / exchangeRate : clampedAmtIQD;
    setPayAmountInput(inCurrency > 0 ? (isUSD ? inCurrency.toFixed(2) : String(Math.round(inCurrency))) : '');
    setPayMethod('cash');
    setPayNote('');
    setPayModalVisible(true);
  };

  // Submit Payment
  const handleConfirmPayment = async () => {
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

    setIsSubmittingPayment(true);
    try {
      const receipt = await recordInstallmentPayment(
        selectedSaleForPay.saleId,
        payAmtIQD,
        payMethod,
        payNote.trim() || undefined
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPayModalVisible(false);
      setSelectedSaleForPay(null);

      // Reload list
      await loadData();

      // Show receipt modal
      if (receipt) {
        setLastPaymentReceipt(receipt);
        setReceiptModalVisible(true);
      }
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
        Alert.alert(t('common.error'), 'پسوولە نەدۆزرایەوە');
      }
    } catch (err) {
      console.error('Failed to load sale invoice:', err);
    }
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

        {/* Action Buttons: Pay Monthly, Custom, Full, Schedule, Invoice */}
        <View style={[styles.actionsRow, { flexDirection }]}>
          {!isSettled && (
            <>
              {/* Pay 1 Month Quick */}
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => openPayModal(item, item.installmentMonthlyAmount)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF', fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {t('installmentList.payMonthly')}
                </Text>
              </TouchableOpacity>

              {/* Pay Custom Amount */}
              <TouchableOpacity
                style={[
                  styles.secondaryActionBtn,
                  {
                    backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                    borderColor: isDark ? colors.gray300 : '#CBD5E1',
                  },
                ]}
                onPress={() => openPayModal(item, 0)}
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={15} color={colors.black} />
                <Text style={[styles.actionBtnText, { color: colors.black }]}>
                  {t('installmentList.payCustom')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Schedule Breakdown */}
          <TouchableOpacity
            style={[
              styles.secondaryActionBtn,
              {
                backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                borderColor: isDark ? colors.gray300 : '#CBD5E1',
              },
            ]}
            onPress={() => openScheduleModal(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={15} color={colors.black} />
            <Text style={[styles.actionBtnText, { color: colors.black }]}>
              {t('installmentList.viewSchedule')}
            </Text>
          </TouchableOpacity>

          {/* View Invoice */}
          <TouchableOpacity
            style={[
              styles.iconOnlyBtn,
              {
                backgroundColor: isDark ? colors.gray200 : '#F1F5F9',
                borderColor: isDark ? colors.gray300 : '#CBD5E1',
              },
            ]}
            onPress={() => handleViewInvoice(item.saleId)}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={16} color={colors.black} />
          </TouchableOpacity>
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
        <View style={[styles.segmentTrack, { backgroundColor: colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Tab 1: ڕاپۆرت (Report) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.selectionAsync();
              setTab('report');
            }}
            style={[
              styles.segmentBtn,
              tab === 'report' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
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
              tab === 'customers' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
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
            {periodFilteredInstallments.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  tab === 'customers'
                    ? { backgroundColor: 'rgba(255,255,255,0.3)' }
                    : { backgroundColor: colors.gray200 },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    { color: tab === 'customers' ? '#FFFFFF' : colors.gray700 },
                  ]}
                >
                  {periodFilteredInstallments.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Period Filter Horizontal Bar with Expandable Search (Identical to History & Debts) ── */}
      <View
        style={[
          styles.filterWrapper,
          {
            backgroundColor: colors.white,
            borderBottomWidth: 1,
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
                  backgroundColor: query ? colors.primary : (isDark ? colors.gray100 : colors.white),
                  borderColor: query ? colors.primary : colors.gray200,
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
                    ≤ ٦ مانگ
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
                    {'> ٦ مانگ'}
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
            {/* Sub-filter Category Chips: هەمووی, چالاک, تەواوبوو, کورتخایەن, درێژخایەن */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filtersScroll, { flexDirection }]}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'all'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : {
                        backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                        borderColor: isDark ? colors.gray200 : '#E2E8F0',
                      },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter('all');
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: statusFilter === 'all' ? '#FFFFFF' : colors.black,
                      fontFamily: statusFilter === 'all' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                    },
                  ]}
                >
                  {t('installmentList.all')} ({periodFilteredInstallments.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'active'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : {
                        backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                        borderColor: isDark ? colors.gray200 : '#E2E8F0',
                      },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter('active');
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: statusFilter === 'active' ? '#FFFFFF' : colors.black,
                      fontFamily: statusFilter === 'active' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                    },
                  ]}
                >
                  {t('installmentList.active')} ({periodSummary.activeAccounts})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'settled'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : {
                        backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                        borderColor: isDark ? colors.gray200 : '#E2E8F0',
                      },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter('settled');
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: statusFilter === 'settled' ? '#FFFFFF' : colors.black,
                      fontFamily: statusFilter === 'settled' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                    },
                  ]}
                >
                  {t('installmentList.settled')} ({periodSummary.settledAccounts})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'shortTerm'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : {
                        backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                        borderColor: isDark ? colors.gray200 : '#E2E8F0',
                      },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter('shortTerm');
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: statusFilter === 'shortTerm' ? '#FFFFFF' : colors.black,
                      fontFamily: statusFilter === 'shortTerm' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                    },
                  ]}
                >
                  {t('installmentList.shortTerm')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  statusFilter === 'longTerm'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : {
                        backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                        borderColor: isDark ? colors.gray200 : '#E2E8F0',
                      },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setStatusFilter('longTerm');
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: statusFilter === 'longTerm' ? '#FFFFFF' : colors.black,
                      fontFamily: statusFilter === 'longTerm' ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                    },
                  ]}
                >
                  {t('installmentList.longTerm')}
                </Text>
              </TouchableOpacity>
            </ScrollView>

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

      {/* ── Payment Modal ── */}
      <Modal
        visible={payModalVisible}
        transparent
        animationType="slide"
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
        onRequestClose={() => setPayModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPayModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
                borderColor: isDark ? colors.gray200 : '#E2E8F0',
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { flexDirection }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.black, textAlign, fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                  {t('installmentList.paymentModalTitle')}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.gray500, textAlign }]}>
                  {selectedSaleForPay?.customerName} • {selectedSaleForPay?.invoiceNumber}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPayModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.gray500} />
              </TouchableOpacity>
            </View>

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
            )}

            {/* Amount Input */}
            <View style={{ marginTop: 14 }}>
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

            {/* Payment Method Selector */}
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.inputLabel, { color: colors.gray500, textAlign }]}>
                {t('installmentList.paymentMethod')}:
              </Text>
              <View style={[styles.methodRow, { flexDirection }]}>
                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    payMethod === 'cash'
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
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
                    {t('installmentList.cash')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    payMethod === 'fib'
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
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
                    {t('installmentList.fib')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Optional Note */}
            <View style={{ marginTop: 14 }}>
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
                placeholder={t('installmentList.notePlaceholder')}
                placeholderTextColor={colors.gray400}
                value={payNote}
                onChangeText={setPayNote}
              />
            </View>

            {/* Confirm Payment Action Button */}
            <TouchableOpacity
              style={[
                styles.confirmPayBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: isSubmittingPayment ? 0.6 : 1,
                },
              ]}
              onPress={handleConfirmPayment}
              disabled={isSubmittingPayment}
              activeOpacity={0.8}
            >
              {isSubmittingPayment ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                  <Text style={[styles.confirmPayBtnText, { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {t('installmentList.confirmPayment')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Month-by-Month Schedule Modal ── */}
      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="slide"
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
                maxHeight: '80%',
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

      {/* ── Payment Receipt Modal ── */}
      <DebtPaymentReceiptModal
        visible={receiptModalVisible}
        receipt={lastPaymentReceipt}
        onClose={() => setReceiptModalVisible(false)}
      />

      {/* ── Sale Invoice Preview Modal ── */}
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
              paddingBottom: 12,
              paddingHorizontal: 16,
              backgroundColor: isDark ? colors.gray100 : '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: isDark ? colors.gray200 : '#E2E8F0',
              flexDirection,
              justifyContent: 'space-between',
              alignItems: 'center',
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
                    'A4'
                  );
                }}
                style={{
                  flexDirection,
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                }}
              >
                <Ionicons name="print" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: SETTINGS_KURDISH_FONT_BOLD }}>
                  {t('common.print')}
                </Text>
              </TouchableOpacity>
            )}
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
  actionsRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconOnlyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
  },
  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  modalBannerLabel: {
    fontSize: 13,
  },
  modalBannerValue: {
    fontSize: 16,
  },
  quickAmountRow: {
    gap: 8,
    marginBottom: 10,
  },
  quickPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPillText: {
    fontSize: 12,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  inputControl: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  inputCurrency: {
    fontSize: 14,
  },
  conversionHint: {
    fontSize: 11,
    marginTop: 4,
  },
  methodRow: {
    gap: 10,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodBtnText: {
    fontSize: 13,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
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
});
