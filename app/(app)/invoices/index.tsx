import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  FlatList,
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
} from 'react-native';
import { Text } from '@/components/ui/AppText';
import { IdText } from '@/components/ui/IdText';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { AppHeader } from '@/components/common/AppHeader';
import { HeaderActionButton } from '@/components/common/HeaderActionButton';
import { PeriodFilterModal } from '@/components/shared/PeriodFilterModal';
import { CustomDateRangeModal } from '@/components/shared/CustomDateRangeModal';
import { InvoiceView } from '@/components/sales/InvoiceView';
import { LoadingView } from '@/components/ui/LoadingView';

import { useAppTheme } from '@/contexts/ThemeContext';
import { MODAL_SUPPORTED_ORIENTATIONS } from '@/constants/theme';
import { useLanguageStore } from '@/store/languageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBusinessStore } from '@/store/businessStore';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { hexToRgba } from '@/lib/colorUtils';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { fmtIQD, fmtUSD, toEnglishDigits, formatDate, formatTime } from '@/utils/formatters';
import { getPeriodBounds, isDateWithinRange, type PeriodKey } from '@/utils/dateRanges';

import {
  getAllSales,
  getAllPurchases,
  getAllPurchaseDebts,
  getPurchaseItemsByPurchaseId,
  getPurchaseDebtByPurchaseId,
  getSaleById,
  incrementSalePrintCount,
  incrementSaleViewCount,
  incrementPurchasePrintCount,
  incrementPurchaseViewCount,
  type PurchaseItem,
} from '@/lib/sqlite';
import { directPrintInvoice, directPrintPurchaseInvoice } from '@/lib/generateInvoice';
import type { Sale } from '@/types/sales';
import type { Purchase } from '@/types/purchases';
import type { PurchaseDebt } from '@/types/debt';
import type { ReceiptCurrencyMode } from '@/lib/invoiceTemplate';

type TabKey = 'reports' | 'purchases' | 'sales';

export default function InvoicesHubScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign, flexDirection, writingDirection } = useRTL();
  const isKu = useLanguageStore((s) => s.language !== 'en');
  const { isTablet, isTabletLandscape } = useResponsive();
  const { width, height } = useWindowDimensions();

  const baseCurrency = useSettingsStore((s) => s.baseCurrency) || 'IQD';
  const exchangeRate = useSettingsStore((s) => s.exchangeRate) || 1310;
  const isUSD = baseCurrency === 'USD';
  const business = useBusinessStore();

  // ─── Active Tab State ───
  const [activeTab, setActiveTab] = useState<TabKey>('reports');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const numColumns = useMemo(() => {
    if (isTabletLandscape) {
      return viewMode === 'grid' ? 3 : 2;
    }
    if (isTablet) {
      return 2;
    }
    return viewMode === 'grid' ? 2 : 1;
  }, [isTablet, isTabletLandscape, viewMode]);

  // ─── Data State ───
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseDebtsMap, setPurchaseDebtsMap] = useState<Record<number, PurchaseDebt>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Period Filter State ───
  const [periodKey, setPeriodKey] = useState<PeriodKey>('all');
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | null>(null);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [customRangeModalVisible, setCustomRangeModalVisible] = useState(false);

  // ─── Search Queries ───
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [salesSearch, setSalesSearch] = useState('');

  // ─── Read-Only Detail Modals State ───
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [loadingSaleDetails, setLoadingSaleDetails] = useState(false);

  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [selectedPurchaseItems, setSelectedPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedPurchaseDebt, setSelectedPurchaseDebt] = useState<PurchaseDebt | null>(null);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [loadingPurchaseDetails, setLoadingPurchaseDetails] = useState(false);

  // ─── Load Data ───
  const loadData = useCallback(async () => {
    try {
      const [salesData, purchasesData, debtsData] = await Promise.all([
        getAllSales(),
        getAllPurchases(),
        getAllPurchaseDebts(),
      ]);

      const debtMap: Record<number, PurchaseDebt> = {};
      debtsData.forEach((d) => {
        if (d.purchaseId) {
          debtMap[d.purchaseId] = d;
        }
      });

      setSales(salesData);
      setPurchases(purchasesData);
      setPurchaseDebtsMap(debtMap);
    } catch (err) {
      console.error('[InvoicesHub] Failed to load data:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // ─── Date Filter Logic ───
  const periodBounds = useMemo(() => {
    return getPeriodBounds(periodKey, customRange?.from, customRange?.to);
  }, [periodKey, customRange]);

  const filteredSalesByPeriod = useMemo(() => {
    if (periodKey === 'all') return sales;
    return sales.filter((s) => isDateWithinRange(s.date || s.createdAt, periodBounds.from, periodBounds.to));
  }, [sales, periodKey, periodBounds]);

  const filteredPurchasesByPeriod = useMemo(() => {
    if (periodKey === 'all') return purchases;
    return purchases.filter((p) => isDateWithinRange(p.date || p.createdAt, periodBounds.from, periodBounds.to));
  }, [purchases, periodKey, periodBounds]);

  // ─── Formatter Helper ───
  const formatMoney = useCallback((amountIQD: number) => {
    if (isUSD) {
      return `$${fmtUSD(amountIQD / exchangeRate)}`;
    }
    return `${fmtIQD(amountIQD)} د.ع`;
  }, [isUSD, exchangeRate]);

  // ─── TAB 1: KPI Statistics ───
  const reportStats = useMemo(() => {
    // 1. Purchase Invoices (وەسڵی کڕین)
    const purchaseCount = filteredPurchasesByPeriod.length;

    // 2. Sales Invoices (وەسڵی فرۆشتن)
    const salesCount = filteredSalesByPeriod.length;

    // 3. All Invoices (کۆی گشتی هەموو وەسڵەکان)
    const allCount = purchaseCount + salesCount;

    // 4. Paid Invoices count (کۆی گشتی وەسڵی پارەدراو)
    let paidInvoicesCount = 0;
    filteredSalesByPeriod.forEach((s) => {
      if ((s.remainingDebt || 0) <= 0) paidInvoicesCount++;
    });
    filteredPurchasesByPeriod.forEach((p) => {
      if (p.paymentStatus === 'paid' || p.paymentStatus === 'fib') {
        paidInvoicesCount++;
      } else {
        const debt = purchaseDebtsMap[p.id];
        if (debt && (debt.remainingAmount || 0) <= 0) {
          paidInvoicesCount++;
        }
      }
    });

    // 5. Unpaid / Remaining Debt Invoices count (کۆی گشتی وەسڵی قەرزی نەدراو)
    let unpaidDebtCount = 0;
    filteredSalesByPeriod.forEach((s) => {
      if ((s.remainingDebt || 0) > 0) unpaidDebtCount++;
    });
    filteredPurchasesByPeriod.forEach((p) => {
      if (p.paymentStatus === 'debt') {
        const debt = purchaseDebtsMap[p.id];
        if (!debt || (debt.remainingAmount || 0) > 0) {
          unpaidDebtCount++;
        }
      }
    });

    // 6. Total FIB Invoices count (کۆی گشتی وەسڵی FIB)
    let fibCount = 0;
    filteredSalesByPeriod.forEach((s) => {
      if (s.paymentMethod === 'fib' || s.initialPaymentMethod === 'fib') fibCount++;
    });
    filteredPurchasesByPeriod.forEach((p) => {
      if (p.paymentStatus === 'fib' || p.initialPaymentMethod === 'fib') fibCount++;
    });

    // 7. Total Cash Invoices count (کۆی گشتی وەسڵی کاش)
    let cashCount = 0;
    filteredSalesByPeriod.forEach((s) => {
      if (s.paymentMethod === 'cash' || s.initialPaymentMethod === 'cash') cashCount++;
    });
    filteredPurchasesByPeriod.forEach((p) => {
      if (p.paymentStatus === 'paid' || p.initialPaymentMethod === 'cash') cashCount++;
    });

    // 8. Total Debt Invoices Count ONLY (کۆی گشتی وەسڵی قەرز)
    let debtCount = 0;
    filteredSalesByPeriod.forEach((s) => {
      if (s.paymentMethod === 'debt' || (s.remainingDebt || 0) > 0) debtCount++;
    });
    filteredPurchasesByPeriod.forEach((p) => {
      if (p.paymentStatus === 'debt') debtCount++;
    });

    // 9. Total Discounted Sales Invoices count (وەسڵەکانی داشکاندن بۆ فرۆشتن)
    let discountedSalesCount = 0;
    filteredSalesByPeriod.forEach((s) => {
      const disc = (s.discountTotal || 0) + (s.globalDiscount || 0);
      if (disc > 0) discountedSalesCount++;
    });

    return {
      purchaseCount,
      salesCount,
      allCount,
      paidInvoicesCount,
      unpaidDebtCount,
      fibCount,
      cashCount,
      debtCount,
      discountedSalesCount,
    };
  }, [filteredPurchasesByPeriod, filteredSalesByPeriod, purchaseDebtsMap]);

  // ─── TAB 2: Filtered Purchases by Search ───
  const searchedPurchases = useMemo(() => {
    const q = toEnglishDigits(purchaseSearch.trim().toLowerCase());
    if (!q) return filteredPurchasesByPeriod;
    return filteredPurchasesByPeriod.filter((p) => {
      const numMatch = (p.purchaseNumber || '').toLowerCase().includes(q);
      const nameMatch = (p.supplierName || '').toLowerCase().includes(q);
      const phoneMatch = toEnglishDigits(p.supplierPhone || '').includes(q);
      const prodMatch = (p.productName || '').toLowerCase().includes(q);
      return numMatch || nameMatch || phoneMatch || prodMatch;
    });
  }, [filteredPurchasesByPeriod, purchaseSearch]);

  // ─── TAB 3: Filtered Sales by Search ───
  const searchedSales = useMemo(() => {
    const q = toEnglishDigits(salesSearch.trim().toLowerCase());
    if (!q) return filteredSalesByPeriod;
    return filteredSalesByPeriod.filter((s) => {
      const numMatch = (s.invoiceNumber || '').toLowerCase().includes(q);
      const nameMatch = (s.customerName || '').toLowerCase().includes(q);
      const phoneMatch = toEnglishDigits(s.customerPhone || '').includes(q);
      return numMatch || nameMatch || phoneMatch;
    });
  }, [filteredSalesByPeriod, salesSearch]);

  // ─── Purchase Actions ───
  const handleOpenPurchaseDetails = async (purchase: Purchase) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    const nextViewCount = (purchase.viewCount || 0) + 1;
    setSelectedPurchase({ ...purchase, viewCount: nextViewCount });
    setPurchaseModalVisible(true);
    setLoadingPurchaseDetails(true);

    // Increment view count in database and update state
    incrementPurchaseViewCount(purchase.id).catch(() => {});
    setPurchases((prev) =>
      prev.map((p) => (p.id === purchase.id ? { ...p, viewCount: nextViewCount } : p))
    );

    try {
      const [items, debt] = await Promise.all([
        getPurchaseItemsByPurchaseId(purchase.id),
        getPurchaseDebtByPurchaseId(purchase.id),
      ]);
      setSelectedPurchaseItems(items);
      setSelectedPurchaseDebt(debt);
    } catch (e) {
      console.warn('[InvoicesHub] Failed to fetch purchase details:', e);
    } finally {
      setLoadingPurchaseDetails(false);
    }
  };

  const handlePrintPurchase = async (purchase: Purchase | null) => {
    if (!purchase) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}

    // Immediately increment print count in UI state and SQLite the instant print button is pressed
    const nextPrintCount = (purchase.printCount || 0) + 1;
    setPurchases((prev) =>
      prev.map((p) => (p.id === purchase.id ? { ...p, printCount: nextPrintCount } : p))
    );
    setSelectedPurchase((p) => (p && p.id === purchase.id ? { ...p, printCount: nextPrintCount } : p));
    incrementPurchasePrintCount(purchase.id).catch((err) => {
      console.warn('[InvoicesHub] incrementPurchasePrintCount failed:', err);
    });

    try {
      let items = await getPurchaseItemsByPurchaseId(purchase.id);
      if (!items || items.length === 0) {
        items = [
          {
            id: 1,
            purchaseId: purchase.id,
            productName: purchase.productName,
            category: purchase.category,
            quantity: purchase.quantity,
            buyPriceIQD: purchase.buyPriceIQD,
            buyPriceUSD: purchase.buyPriceUSD,
            sellPriceIQD: purchase.sellPriceIQD,
            sellPriceUSD: purchase.sellPriceUSD,
            lineTotalIQD: purchase.totalIQD,
            idType: purchase.idType,
            itemIds: purchase.itemIds,
            createdAt: purchase.createdAt,
          },
        ];
      }
      const debt = purchaseDebtsMap[purchase.id] || (await getPurchaseDebtByPurchaseId(purchase.id));

      const receiptCurrency: ReceiptCurrencyMode = isUSD ? 'usd' : 'iqd';
      await directPrintPurchaseInvoice(
        purchase,
        items,
        {
          name: business.name,
          phone: business.phone,
          address: business.address,
          logoUri: business.logoUri,
        },
        receiptCurrency,
        debt
      );
    } catch (err) {
      console.error('[InvoicesHub] Failed to print purchase invoice:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  };

  // ─── Sales Actions ───
  const handleOpenSaleDetails = async (sale: Sale) => {
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    const nextViewCount = (sale.viewCount || 0) + 1;
    setSelectedSale({ ...sale, viewCount: nextViewCount });
    setSaleModalVisible(true);
    setLoadingSaleDetails(true);

    // Increment view count in database and update state
    incrementSaleViewCount(sale.id).catch(() => {});
    setSales((prev) =>
      prev.map((s) => (s.id === sale.id ? { ...s, viewCount: nextViewCount } : s))
    );

    try {
      const fullSale = await getSaleById(sale.id);
      setSelectedSale(fullSale ? { ...fullSale, viewCount: Math.max(fullSale.viewCount || 0, nextViewCount) } : { ...sale, viewCount: nextViewCount });
    } catch (e) {
      console.warn('[InvoicesHub] Failed to fetch full sale:', e);
      setSelectedSale({ ...sale, viewCount: nextViewCount });
    } finally {
      setLoadingSaleDetails(false);
    }
  };

  const handlePrintSale = async (sale: Sale | null) => {
    if (!sale) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}

    // Immediately increment print count in UI state and SQLite the instant print button is pressed
    const nextPrintCount = (sale.printCount || 0) + 1;
    setSales((prev) =>
      prev.map((s) => (s.id === sale.id ? { ...s, printCount: nextPrintCount } : s))
    );
    setSelectedSale((s) => (s && s.id === sale.id ? { ...s, printCount: nextPrintCount } : s));
    incrementSalePrintCount(sale.id).catch((err) => {
      console.warn('[InvoicesHub] incrementSalePrintCount failed:', err);
    });

    try {
      const fullSale = sale.items && sale.items.length > 0 ? sale : (await getSaleById(sale.id)) ?? sale;
      const receiptCurrency: ReceiptCurrencyMode = isUSD ? 'usd' : 'iqd';

      await directPrintInvoice(
        fullSale,
        {
          name: business.name,
          phone: business.phone,
          address: business.address,
          logoUri: business.logoUri,
        },
        receiptCurrency
      );
    } catch (err) {
      console.error('[InvoicesHub] Failed to print sales invoice:', err);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    }
  };

  // ─── Period Labels for Pills ───
  const periodPillKeys: PeriodKey[] = ['all', 'today', 'week', 'month', 'year', 'custom'];
  const periodPillLabels: Record<PeriodKey, string> = {
    all: isKu ? 'هەموو کات' : 'All Time',
    today: isKu ? 'ئەمڕۆ' : 'Today',
    week: isKu ? 'ئەم هەفتەیە' : 'This Week',
    month: isKu ? 'ئەم مانگە' : 'This Month',
    year: isKu ? 'ئەمساڵ' : 'This Year',
    custom: isKu ? 'دەستنیشانکراو' : 'Custom',
  };

  // ─── Shared Period Filter Pills Row ───
  const renderPeriodFilterSection = () => (
    <View style={styles.periodSection}>
      <View style={[styles.periodSectionHeader, { flexDirection }]}>
        <View style={[styles.periodTitleRow, { flexDirection }]}>
          <Ionicons name="calendar" size={16} color={colors.primary} />
          <Text
            style={[
              styles.periodSectionTitle,
              { color: colors.black },
              isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
            ]}
          >
            {isKu ? 'فلتەرکردنی کات:' : 'Time Period:'}
          </Text>
        </View>

        <Text style={[styles.periodSubHint, { color: colors.gray400 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
          {periodKey === 'all'
            ? isKu
              ? 'هەموو کات (سەرەکی)'
              : 'All Time (Default)'
            : periodPillLabels[periodKey]}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[{ marginHorizontal: -16 }, isRTL && { transform: [{ scaleX: -1 }] }]}
        contentContainerStyle={[styles.periodPillRow, { paddingHorizontal: 16, gap: 8 }]}
      >
        {periodPillKeys.map((key) => {
          const active = periodKey === key;
          const isCustom = key === 'custom';
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.8}
              onPress={() => {
                try {
                  Haptics.selectionAsync().catch(() => {});
                } catch {}
                if (isCustom) {
                  setCustomRangeModalVisible(true);
                } else {
                  setPeriodKey(key);
                  setCustomRange(null);
                }
              }}
              style={[
                styles.periodPill,
                isRTL && { transform: [{ scaleX: -1 }] },
                {
                  backgroundColor: active ? colors.primary : isDark ? colors.gray100 : colors.white,
                  borderColor: active ? colors.primary : colors.gray200,
                  flexDirection,
                  alignItems: 'center',
                  gap: 5,
                },
              ]}
            >
              {isCustom && (
                <Ionicons name="calendar" size={12} color={active ? '#0F172A' : colors.primary} />
              )}
              <Text
                style={[
                  styles.periodPillText,
                  { color: active ? '#0F172A' : isDark ? colors.gray600 : colors.darkBlue },
                  isKu && { fontFamily: active ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT },
                ]}
              >
                {isCustom && customRange
                  ? `${customRange.from} → ${customRange.to}`
                  : periodPillLabels[key]}
              </Text>
              {isCustom && active && customRange && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setPeriodKey('all');
                    setCustomRange(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={13} color="#0F172A" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.gray50 }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <AppHeader
        title={isKu ? 'پسوڵەکان' : 'Invoices & Receipts'}
        showBack
        rightAction={
          activeTab !== 'reports' ? (
            <HeaderActionButton
              icon={viewMode === 'grid' ? 'list-outline' : 'grid-outline'}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                } catch {}
                setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
              }}
            />
          ) : undefined
        }
      />

      {/* ── Period Filter Modal ── */}
      <PeriodFilterModal
        visible={periodModalVisible}
        onClose={() => setPeriodModalVisible(false)}
        includeAll
        current={periodKey}
        onSelect={(key, customFrom, customTo) => {
          setPeriodKey(key);
          if (key === 'custom' && customFrom && customTo) {
            setCustomRange({ from: customFrom, to: customTo });
          } else {
            setCustomRange(null);
          }
        }}
      />

      {/* ── Custom Date Range Modal ── */}
      <CustomDateRangeModal
        visible={customRangeModalVisible}
        onClose={() => setCustomRangeModalVisible(false)}
        onApply={(from, to) => {
          setPeriodKey('custom');
          setCustomRange({ from, to });
          setCustomRangeModalVisible(false);
        }}
      />

      {/* ── Segmented Control Tabs (Matching Expiry Screen Design) ── */}
      <View
        style={[
          styles.segmentWrapper,
          isTablet && {
            maxWidth: isTabletLandscape ? 980 : 760,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
      >
        <View
          style={[
            styles.segmentBar,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: colors.gray200,
              padding: isTabletLandscape ? 6 : 4,
              borderRadius: 18,
              flexDirection: 'row-reverse',
            },
          ]}
        >
          {/* Tab 1: ڕاپۆرت و ئامار (Right side) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.selectionAsync().catch(() => {});
              } catch {}
              setActiveTab('reports');
            }}
            style={[
              styles.segmentBtn,
              activeTab === 'reports' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                minHeight: isTabletLandscape ? 54 : isTablet ? 48 : 38,
                paddingVertical: isTabletLandscape ? 12 : isTablet ? 10 : 7,
                paddingHorizontal: 4,
                gap: 4,
                borderRadius: isTablet ? 14 : 11,
              },
            ]}
          >
            <Ionicons
              name="bar-chart-outline"
              size={isTabletLandscape ? 22 : isTablet ? 20 : 15}
              color={activeTab === 'reports' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.segmentBtnText,
                {
                  color: activeTab === 'reports' ? '#FFFFFF' : colors.gray600,
                  fontSize: isTabletLandscape ? 16 : isTablet ? 14.5 : 12,
                },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {isKu ? 'ڕاپۆرت و ئامار' : 'Reports & Analytics'}
            </Text>
          </TouchableOpacity>

          {/* Tab 2: وەسڵی کڕین (Middle) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.selectionAsync().catch(() => {});
              } catch {}
              setActiveTab('purchases');
            }}
            style={[
              styles.segmentBtn,
              activeTab === 'purchases' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                minHeight: isTabletLandscape ? 54 : isTablet ? 48 : 38,
                paddingVertical: isTabletLandscape ? 12 : isTablet ? 10 : 7,
                paddingHorizontal: 4,
                gap: 4,
                borderRadius: isTablet ? 14 : 11,
              },
            ]}
          >
            <Ionicons
              name="cart-outline"
              size={isTabletLandscape ? 22 : isTablet ? 20 : 15}
              color={activeTab === 'purchases' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.segmentBtnText,
                {
                  color: activeTab === 'purchases' ? '#FFFFFF' : colors.gray600,
                  fontSize: isTabletLandscape ? 16 : isTablet ? 14.5 : 12,
                },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {isKu ? 'وەسڵی کڕین' : 'Purchases'}
            </Text>
            {filteredPurchasesByPeriod.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'purchases' ? 'rgba(255, 255, 255, 0.28)' : isDark ? colors.gray200 : colors.gray300,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    { color: activeTab === 'purchases' ? '#FFFFFF' : colors.black },
                  ]}
                >
                  {filteredPurchasesByPeriod.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Tab 3: وەسڵی فرۆشتن (Left side) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.selectionAsync().catch(() => {});
              } catch {}
              setActiveTab('sales');
            }}
            style={[
              styles.segmentBtn,
              activeTab === 'sales' && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                minHeight: isTabletLandscape ? 54 : isTablet ? 48 : 38,
                paddingVertical: isTabletLandscape ? 12 : isTablet ? 10 : 7,
                paddingHorizontal: 4,
                gap: 4,
                borderRadius: isTablet ? 14 : 11,
              },
            ]}
          >
            <Ionicons
              name="receipt-outline"
              size={isTabletLandscape ? 22 : isTablet ? 20 : 15}
              color={activeTab === 'sales' ? '#FFFFFF' : colors.gray500}
            />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.segmentBtnText,
                {
                  color: activeTab === 'sales' ? '#FFFFFF' : colors.gray600,
                  fontSize: isTabletLandscape ? 16 : isTablet ? 14.5 : 12,
                },
                isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {isKu ? 'وەسڵی فرۆشتن' : 'Sales'}
            </Text>
            {filteredSalesByPeriod.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'sales' ? 'rgba(255, 255, 255, 0.28)' : isDark ? colors.gray200 : colors.gray300,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    { color: activeTab === 'sales' ? '#FFFFFF' : colors.black },
                  ]}
                >
                  {filteredSalesByPeriod.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Loading Spinner ── */}
      {isLoading ? (
        <LoadingView message={isKu ? 'چاوەڕێ بە...' : 'Loading Invoices...'} />
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════
              TAB 1: ڕاپۆرت و ئامار (REPORTS & ANALYTICS)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <ScrollView
              style={styles.scrollFlex}
              contentContainerStyle={[
                styles.reportScrollContent,
                isTablet && { maxWidth: isTabletLandscape ? 1160 : 760, alignSelf: 'center', width: '100%' },
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
              }
            >
              {/* Period Filter Pills */}
              {renderPeriodFilterSection()}

              {/* KPI Cards Grid (Responsive: 3 columns on landscape iPad, 2 on portrait tablet/phone) */}
              <View style={[styles.kpiGrid, { flexDirection: isRTL ? 'row-reverse' : 'row', gap: isTablet ? 12 : 10 }]}>
                {[
                  {
                    id: 'purchases',
                    icon: 'cart-outline' as const,
                    color: '#EA580C',
                    bgDark: 'rgba(234, 88, 12, 0.14)',
                    bgLight: '#FFF7ED',
                    borderDark: 'rgba(234, 88, 12, 0.35)',
                    borderLight: '#FED7AA',
                    label: isKu ? 'کۆی گشتی وەسڵی کڕین' : 'Purchase Invoices',
                    count: reportStats.purchaseCount,
                  },
                  {
                    id: 'sales',
                    icon: 'receipt-outline' as const,
                    color: '#10B981',
                    bgDark: 'rgba(16, 185, 129, 0.14)',
                    bgLight: '#ECFDF5',
                    borderDark: 'rgba(16, 185, 129, 0.35)',
                    borderLight: '#A7F3D0',
                    label: isKu ? 'کۆی گشتی وەسڵی فرۆشتن' : 'Sales Invoices',
                    count: reportStats.salesCount,
                  },
                  {
                    id: 'all',
                    icon: 'documents-outline' as const,
                    color: '#0284C7',
                    bgDark: 'rgba(2, 132, 199, 0.14)',
                    bgLight: '#F0F9FF',
                    borderDark: 'rgba(2, 132, 199, 0.35)',
                    borderLight: '#BAE6FD',
                    label: isKu ? 'کۆی گشتی هەموو وەسڵەکان' : 'All Invoices',
                    count: reportStats.allCount,
                  },
                  {
                    id: 'paid',
                    icon: 'checkmark-circle-outline' as const,
                    color: '#059669',
                    bgDark: 'rgba(5, 150, 105, 0.14)',
                    bgLight: '#F0FDF4',
                    borderDark: 'rgba(5, 150, 105, 0.35)',
                    borderLight: '#BBF7D0',
                    label: isKu ? 'کۆی گشتی وەسڵی پارەدراو' : 'Paid Invoices',
                    count: reportStats.paidInvoicesCount,
                  },
                  {
                    id: 'unpaid',
                    icon: 'hourglass-outline' as const,
                    color: '#E11D48',
                    bgDark: 'rgba(225, 29, 72, 0.14)',
                    bgLight: '#FFF1F2',
                    borderDark: 'rgba(225, 29, 72, 0.35)',
                    borderLight: '#FECDD3',
                    label: isKu ? 'کۆی وەسڵی قەرزی نەدراو' : 'Unpaid Debt Invoices',
                    count: reportStats.unpaidDebtCount,
                  },
                  {
                    id: 'fib',
                    icon: 'card-outline' as const,
                    color: '#6366F1',
                    bgDark: 'rgba(99, 102, 241, 0.14)',
                    bgLight: '#EEF2FF',
                    borderDark: 'rgba(99, 102, 241, 0.35)',
                    borderLight: '#C7D2FE',
                    label: isKu ? 'کۆی گشتی وەسڵی FIB' : 'Total FIB Invoices',
                    count: reportStats.fibCount,
                  },
                  {
                    id: 'cash',
                    icon: 'cash-outline' as const,
                    color: '#0D9488',
                    bgDark: 'rgba(13, 148, 136, 0.14)',
                    bgLight: '#F0FDFA',
                    borderDark: 'rgba(13, 148, 136, 0.35)',
                    borderLight: '#99F6E4',
                    label: isKu ? 'کۆی گشتی وەسڵی کاش' : 'Total Cash Invoices',
                    count: reportStats.cashCount,
                  },
                  {
                    id: 'debt',
                    icon: 'wallet-outline' as const,
                    color: '#8B5CF6',
                    bgDark: 'rgba(139, 92, 246, 0.14)',
                    bgLight: '#F5F3FF',
                    borderDark: 'rgba(139, 92, 246, 0.35)',
                    borderLight: '#DDD6FE',
                    label: isKu ? 'کۆی گشتی وەسڵی قەرز' : 'Total Debt Invoices',
                    count: reportStats.debtCount,
                  },
                  {
                    id: 'discount',
                    icon: 'pricetag-outline' as const,
                    color: '#D946EF',
                    bgDark: 'rgba(217, 70, 239, 0.14)',
                    bgLight: '#FDF4FF',
                    borderDark: 'rgba(217, 70, 239, 0.35)',
                    borderLight: '#F5D0FE',
                    label: isKu ? 'وەسڵەکانی داشکاندن' : 'Discounted Sales',
                    count: reportStats.discountedSalesCount,
                  },
                ].map((kpi) => (
                  <View
                    key={kpi.id}
                    style={[
                      styles.kpiCard,
                      {
                        flexBasis: isTabletLandscape ? '31.8%' : '48%',
                        maxWidth: isTabletLandscape ? '32.5%' : '49%',
                        backgroundColor: isDark ? kpi.bgDark : kpi.bgLight,
                        borderColor: isDark ? kpi.borderDark : kpi.borderLight,
                        alignItems: isRTL ? 'flex-end' : 'flex-start',
                        padding: isTablet ? 14 : 12,
                        borderRadius: 16,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.kpiIconWrap,
                        {
                          width: isTablet ? 42 : 36,
                          height: isTablet ? 42 : 36,
                          borderRadius: isTablet ? 12 : 10,
                          backgroundColor: hexToRgba(kpi.color, isDark ? 0.25 : 0.15),
                          alignSelf: isRTL ? 'flex-end' : 'flex-start',
                        },
                      ]}
                    >
                      <Ionicons name={kpi.icon} size={isTablet ? 20 : 17} color={kpi.color} />
                    </View>
                    <Text
                      style={[
                        styles.kpiLabel,
                        {
                          fontSize: isTablet ? 15 : 12.5,
                          color: kpi.color,
                          textAlign: isRTL ? 'right' : 'left',
                        },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                      numberOfLines={1}
                    >
                      {kpi.label}
                    </Text>
                    <Text
                      style={[
                        styles.kpiCountText,
                        {
                          fontSize: isTablet ? 22 : 16.5,
                          color: kpi.color,
                          textAlign: isRTL ? 'right' : 'left',
                          writingDirection,
                        },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {isKu ? `\u200F${kpi.count} وەسڵ` : `${kpi.count} Invoices`}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2: وەسڵی کڕین (PURCHASE INVOICES)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'purchases' && (
            <View style={styles.flexOne}>
              {/* Period Filter Pills */}
              <View style={[styles.tabPeriodSectionWrap, isTablet && { maxWidth: isTabletLandscape ? 1200 : 780, alignSelf: 'center', width: '100%' }]}>
                {renderPeriodFilterSection()}
              </View>

              {/* Search Bar */}
              <View style={[styles.searchContainer, isTablet && { maxWidth: isTabletLandscape ? 1200 : 780, alignSelf: 'center', width: '100%' }]}>
                <View
                  style={[
                    styles.searchInputWrap,
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.white,
                      borderColor: colors.gray200,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="search" size={18} color={colors.gray400} />
                  <TextInput
                    value={purchaseSearch}
                    onChangeText={setPurchaseSearch}
                    placeholder={isKu ? 'گەڕان بە ناوی دابینکەر، مۆبایل، ژمارەی وەسڵ...' : 'Search supplier, phone, purchase #...'}
                    placeholderTextColor={colors.gray400}
                    style={[
                      styles.searchInput,
                      { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                      isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  />
                  {purchaseSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setPurchaseSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={colors.gray400} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Invoices List / Grid */}
              <FlatList
                data={searchedPurchases}
                key={`purchases-${numColumns}-${viewMode}-${isRTL ? 'rtl' : 'ltr'}`}
                numColumns={numColumns}
                columnWrapperStyle={
                  numColumns > 1
                    ? [styles.columnWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]
                    : undefined
                }
                keyExtractor={(item) => `pur-${item.id}`}
                contentContainerStyle={[
                  styles.listContent,
                  isTablet && { maxWidth: isTabletLandscape ? 1200 : 780, alignSelf: 'center', width: '100%' },
                  searchedPurchases.length === 0 && styles.emptyListContent,
                ]}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Ionicons name="document-text-outline" size={48} color={colors.gray300} />
                    <Text style={[styles.emptyText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                      {isKu ? 'هیچ پسوڵەیەکی کڕین نەدۆزرایەوە' : 'No purchase invoices found'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const debt = purchaseDebtsMap[item.id];
                  const isDebt = item.paymentStatus === 'debt';
                  const isFib = item.paymentStatus === 'fib' || item.initialPaymentMethod === 'fib';
                  const statusLabel = isDebt ? (isKu ? 'قەرز' : 'Debt') : isFib ? 'FIB' : (isKu ? 'کاش' : 'Cash');
                  const statusColor = isDebt ? '#EA580C' : isFib ? '#6366F1' : '#10B981';

                  return (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleOpenPurchaseDetails(item)}
                      style={[
                        numColumns > 1 ? styles.invoiceCard : styles.listCard,
                        numColumns > 1 && {
                          flex: 1,
                          maxWidth: numColumns === 3 ? '32.5%' : '49%',
                        },
                        {
                          backgroundColor: isDark ? colors.gray100 : colors.white,
                          borderColor: colors.gray200,
                        },
                      ]}
                    >
                      {/* Top Row: Purchase Number & Payment Method Badge */}
                      <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.invoiceNumberBadge, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]}>
                          <IdText style={[styles.invoiceNumberText, { color: colors.primary }]}>{item.purchaseNumber}</IdText>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: hexToRgba(statusColor, 0.15) }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                            {statusLabel}
                          </Text>
                        </View>
                      </View>

                      {/* Supplier & Product Info */}
                      <View style={styles.cardInfoWrap}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.partyName,
                            { color: colors.black, textAlign, fontSize: isTablet ? 16.5 : 14 },
                            isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {item.supplierName || (isKu ? 'کڕینی ڕاستەوخۆ' : 'Direct Supplier')}
                        </Text>
                        {!!item.supplierPhone && (
                          <View style={[styles.phoneRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="call-outline" size={12} color={colors.gray400} />
                            <Text style={[styles.partyPhone, { color: colors.gray500, fontSize: isTablet ? 12.5 : 11.5 }]}>{item.supplierPhone}</Text>
                          </View>
                        )}
                        <Text numberOfLines={1} style={[styles.subProductName, { color: colors.gray400, textAlign, fontSize: isTablet ? 13 : 11.5 }]}>
                          {item.productName} {item.quantity > 1 ? `(${item.quantity} دانە)` : ''}
                        </Text>
                      </View>

                      {/* Print and View Counts Indicator */}
                      <View style={[styles.countBadgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                          <Ionicons name="eye-outline" size={12} color={colors.gray500} />
                          <Text style={[styles.countBadgeText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                            {isKu ? `بینین: ${item.viewCount || 0}` : `View: ${item.viewCount || 0}`}
                          </Text>
                        </View>
                        <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                          <Ionicons name="print-outline" size={12} color={colors.gray500} />
                          <Text style={[styles.countBadgeText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                            {isKu ? `چاپ: ${item.printCount || 0}` : `Print: ${item.printCount || 0}`}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3: وەسڵی فرۆشتن (SALES INVOICES)
             ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'sales' && (
            <View style={styles.flexOne}>
              {/* Period Filter Pills */}
              <View style={[styles.tabPeriodSectionWrap, isTablet && { maxWidth: isTabletLandscape ? 1200 : 780, alignSelf: 'center', width: '100%' }]}>
                {renderPeriodFilterSection()}
              </View>

              {/* Search Bar */}
              <View style={[styles.searchContainer, isTablet && { maxWidth: isTabletLandscape ? 1200 : 780, alignSelf: 'center', width: '100%' }]}>
                <View
                  style={[
                    styles.searchInputWrap,
                    {
                      backgroundColor: isDark ? colors.gray100 : colors.white,
                      borderColor: colors.gray200,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="search" size={18} color={colors.gray400} />
                  <TextInput
                    value={salesSearch}
                    onChangeText={setSalesSearch}
                    placeholder={isKu ? 'گەڕان بە ناوی کڕیار، مۆبایل، ژمارەی وەسڵ...' : 'Search customer, phone, invoice #...'}
                    placeholderTextColor={colors.gray400}
                    style={[
                      styles.searchInput,
                      { color: colors.black, textAlign: isRTL ? 'right' : 'left' },
                      isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                    ]}
                  />
                  {salesSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setSalesSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={colors.gray400} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Invoices List / Grid */}
              <FlatList
                data={searchedSales}
                key={`sales-${numColumns}-${viewMode}-${isRTL ? 'rtl' : 'ltr'}`}
                numColumns={numColumns}
                columnWrapperStyle={
                  numColumns > 1
                    ? [styles.columnWrapper, { flexDirection: isRTL ? 'row-reverse' : 'row' }]
                    : undefined
                }
                keyExtractor={(item) => `sale-${item.id}`}
                contentContainerStyle={[
                  styles.listContent,
                  isTablet && { maxWidth: isTabletLandscape ? 1200 : 780, alignSelf: 'center', width: '100%' },
                  searchedSales.length === 0 && styles.emptyListContent,
                ]}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Ionicons name="receipt-outline" size={48} color={colors.gray300} />
                    <Text style={[styles.emptyText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                      {isKu ? 'هیچ پسوڵەیەکی فرۆشتن نەدۆزرایەوە' : 'No sales invoices found'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isDebt = item.paymentMethod === 'debt' || item.remainingDebt > 0;
                  const isFib = item.paymentMethod === 'fib' || item.initialPaymentMethod === 'fib';
                  const statusLabel = isDebt ? (isKu ? 'قەرز' : 'Debt') : isFib ? 'FIB' : (isKu ? 'کاش' : 'Cash');
                  const statusColor = isDebt ? '#EA580C' : isFib ? '#6366F1' : '#10B981';
                  const hasDiscount = (item.discountTotal || 0) + (item.globalDiscount || 0) > 0;

                  return (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleOpenSaleDetails(item)}
                      style={[
                        numColumns > 1 ? styles.invoiceCard : styles.listCard,
                        numColumns > 1 && {
                          flex: 1,
                          maxWidth: numColumns === 3 ? '32.5%' : '49%',
                        },
                        {
                          backgroundColor: isDark ? colors.gray100 : colors.white,
                          borderColor: colors.gray200,
                        },
                      ]}
                    >
                      {/* Top Row: Invoice Number & Badges */}
                      <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.invoiceNumberBadge, { backgroundColor: isDark ? colors.gray200 : '#F1F5F9' }]}>
                          <IdText style={[styles.invoiceNumberText, { color: colors.primary }]}>{item.invoiceNumber}</IdText>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                          {hasDiscount && (
                            <View style={[styles.discountPill, { backgroundColor: hexToRgba('#D946EF', 0.15) }]}>
                              <Ionicons name="pricetag" size={10} color="#D946EF" />
                              <Text style={[styles.discountPillText, { color: '#D946EF' }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                                {isKu ? 'داشکاندن' : 'Disc.'}
                              </Text>
                            </View>
                          )}
                          <View style={[styles.statusBadge, { backgroundColor: hexToRgba(statusColor, 0.15) }]}>
                            <Text style={[styles.statusBadgeText, { color: statusColor }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                              {statusLabel}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Customer Info */}
                      <View style={styles.cardInfoWrap}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.partyName,
                            { color: colors.black, textAlign, fontSize: isTablet ? 16.5 : 14 },
                            isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {item.customerName || (isKu ? 'کڕیاری ڕاستەوخۆ' : 'Direct Customer')}
                        </Text>
                        {!!item.customerPhone && (
                          <View style={[styles.phoneRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="call-outline" size={12} color={colors.gray400} />
                            <Text style={[styles.partyPhone, { color: colors.gray500, fontSize: isTablet ? 12.5 : 11.5 }]}>{item.customerPhone}</Text>
                          </View>
                        )}
                      </View>

                      {/* Print and View Counts Indicator */}
                      <View style={[styles.countBadgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                          <Ionicons name="eye-outline" size={12} color={colors.gray500} />
                          <Text style={[styles.countBadgeText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                            {isKu ? `بینین: ${item.viewCount || 0}` : `View: ${item.viewCount || 0}`}
                          </Text>
                        </View>
                        <View style={[styles.countBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                          <Ionicons name="print-outline" size={12} color={colors.gray500} />
                          <Text style={[styles.countBadgeText, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                            {isKu ? `چاپ: ${item.printCount || 0}` : `Print: ${item.printCount || 0}`}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          READ-ONLY MODAL: PURCHASE INVOICE DETAILS
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        visible={purchaseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPurchaseModalVisible(false)}
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPurchaseModalVisible(false)}
          />
          <View
            style={[
              styles.modalDialogCard,
              {
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderColor: colors.gray200,
                width: isTablet ? Math.min(width * 0.75, 680) : Math.min(width * 0.92, 450),
                maxHeight: isTablet ? height * 0.82 : height * 0.85,
              },
            ]}
          >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderBottomColor: colors.gray200,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cart" size={20} color="#EA580C" />
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.black },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKu ? 'وردەکاری وەسڵی کڕین' : 'Purchase Invoice Details'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setPurchaseModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
            >
              <Ionicons name="close" size={20} color={colors.black} />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          {loadingPurchaseDetails ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : selectedPurchase ? (
            <ScrollView
              contentContainerStyle={[styles.modalBody, isTablet && { maxWidth: 680, alignSelf: 'center', width: '100%' }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Read Only Notice Badge */}
              <View
                style={[
                  styles.readOnlyNoticePill,
                  {
                    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.12)' : '#FFF7ED',
                    borderColor: isDark ? 'rgba(234, 88, 12, 0.3)' : '#FED7AA',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={14} color="#EA580C" />
                <Text
                  style={[
                    styles.readOnlyNoticePillText,
                    { color: isDark ? '#FDBA74' : '#C2410C', textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'ئەم بەشە تەنها بۆ بینینە و دەستکاری ناکرێت.'
                    : 'This section is read-only. No edits allowed.'}
                </Text>
              </View>

              {/* Purchase Summary Card */}
              <View
                style={[
                  styles.modalSectionCard,
                  {
                    backgroundColor: isDark ? colors.gray100 : colors.white,
                    borderColor: colors.gray200,
                  },
                ]}
              >
                <View style={[styles.modalDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.modalDetailLabel, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {isKu ? 'ژمارەی پسوڵە:' : 'Purchase Number:'}
                  </Text>
                  <IdText style={[styles.modalDetailValue, { color: colors.primary }]}>
                    {selectedPurchase.purchaseNumber}
                  </IdText>
                </View>

                <View style={[styles.modalDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.modalDetailLabel, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {isKu ? 'دابینکەر:' : 'Supplier:'}
                  </Text>
                  <Text style={[styles.modalDetailValue, { color: colors.black }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {selectedPurchase.supplierName || (isKu ? 'کڕینی ڕاستەوخۆ' : 'Direct Supplier')}
                  </Text>
                </View>

                {!!selectedPurchase.supplierPhone && (
                  <View style={[styles.modalDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.modalDetailLabel, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                      {isKu ? 'مۆبایل:' : 'Phone:'}
                    </Text>
                    <Text style={[styles.modalDetailValue, { color: colors.black }]}>
                      {selectedPurchase.supplierPhone}
                    </Text>
                  </View>
                )}

                <View style={[styles.modalDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.modalDetailLabel, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {isKu ? 'بەروار و کات:' : 'Date & Time:'}
                  </Text>
                  <Text style={[styles.modalDetailValue, { color: colors.gray600 }]}>
                    {formatDate(selectedPurchase.date || selectedPurchase.createdAt)} - {formatTime(selectedPurchase.createdAt)}
                  </Text>
                </View>

                <View style={[styles.modalDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.modalDetailLabel, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {isKu ? 'شێوازی پارەدان:' : 'Payment Method:'}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: hexToRgba(
                          selectedPurchase.paymentStatus === 'debt'
                            ? '#EA580C'
                            : selectedPurchase.paymentStatus === 'fib'
                            ? '#6366F1'
                            : '#10B981',
                          0.15
                        ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            selectedPurchase.paymentStatus === 'debt'
                              ? '#EA580C'
                              : selectedPurchase.paymentStatus === 'fib'
                              ? '#6366F1'
                              : '#10B981',
                        },
                        isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                      ]}
                    >
                      {selectedPurchase.paymentStatus === 'debt'
                        ? isKu
                          ? 'قەرز'
                          : 'Debt'
                        : selectedPurchase.paymentStatus === 'fib'
                        ? 'FIB'
                        : isKu
                        ? 'کاش'
                        : 'Cash'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.modalDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.modalDetailLabel, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                    {isKu ? 'ئاماری پسوڵە:' : 'Invoice Stats:'}
                  </Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="eye-outline" size={13} color={colors.gray500} />
                      <Text style={[styles.modalDetailValue, { color: colors.gray600 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                        {isKu ? `بینین: ${selectedPurchase.viewCount || 0}` : `View: ${selectedPurchase.viewCount || 0}`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="print-outline" size={13} color={colors.primary} />
                      <Text style={[styles.modalDetailValue, { color: colors.primary }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                        {isKu ? `چاپ: ${selectedPurchase.printCount || 0}` : `Print: ${selectedPurchase.printCount || 0}`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Items List Card */}
              <View
                style={[
                  styles.modalSectionCard,
                  {
                    backgroundColor: isDark ? colors.gray100 : colors.white,
                    borderColor: colors.gray200,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.itemsSectionTitle,
                    { color: colors.black, textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {isKu ? 'کاڵاکانی ئەم پسوڵەیە' : 'Invoice Items'}
                </Text>

                {selectedPurchaseItems.length > 0 ? (
                  selectedPurchaseItems.map((item, idx) => (
                    <View
                      key={item.id || idx}
                      style={[
                        styles.itemTableRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.gray100 },
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.itemTableName,
                            { color: colors.black, textAlign },
                            isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                          ]}
                        >
                          {item.productName}
                        </Text>
                        <Text style={[styles.itemTableSub, { color: colors.gray400, textAlign }]}>
                          {item.quantity} × {formatMoney(item.buyPriceIQD)}
                        </Text>
                      </View>
                      <Text style={[styles.itemTableTotal, { color: colors.primary }]}>
                        {formatMoney(item.lineTotalIQD || item.quantity * item.buyPriceIQD)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={[styles.itemTableRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.itemTableName,
                          { color: colors.black, textAlign },
                          isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                        ]}
                      >
                        {selectedPurchase.productName}
                      </Text>
                      <Text style={[styles.itemTableSub, { color: colors.gray400, textAlign }]}>
                        {selectedPurchase.quantity} × {formatMoney(selectedPurchase.buyPriceIQD)}
                      </Text>
                    </View>
                    <Text style={[styles.itemTableTotal, { color: colors.primary }]}>
                      {formatMoney(selectedPurchase.totalIQD)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Financial Summary */}
              <View
                style={[
                  styles.modalSectionCard,
                  {
                    backgroundColor: isDark ? colors.gray100 : colors.white,
                    borderColor: colors.gray200,
                  },
                ]}
              >
                <View style={[styles.modalDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.modalTotalLabel, { color: colors.black }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isKu ? 'کۆی گشتی:' : 'Grand Total:'}
                  </Text>
                  <Text style={[styles.modalTotalValue, { color: colors.primary }]}>
                    {formatMoney(selectedPurchase.totalIQD)}
                  </Text>
                </View>

                {selectedPurchase.paymentStatus === 'debt' && selectedPurchaseDebt && (
                  <>
                    <View style={[styles.modalDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.modalDetailLabel, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                        {isKu ? 'پارەی دراو:' : 'Paid Amount:'}
                      </Text>
                      <Text style={[styles.modalDetailValue, { color: '#10B981' }]}>
                        {formatMoney(selectedPurchaseDebt.paidAmount)}
                      </Text>
                    </View>

                    <View style={[styles.modalDetailRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.modalDetailLabel, { color: colors.gray500 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT }]}>
                        {isKu ? 'قەرزی ماوە:' : 'Remaining Debt:'}
                      </Text>
                      <Text style={[styles.modalDetailValue, { color: '#EA580C' }]}>
                        {formatMoney(selectedPurchaseDebt.remainingAmount)}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Modal Bottom Print Button */}
              <View style={[styles.modalBottomActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handlePrintPurchase(selectedPurchase)}
                  style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="print" size={18} color="#0F172A" />
                  <Text style={[styles.modalPrimaryBtnText, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isKu ? 'چاپکردنی وەسڵ' : 'Print Invoice'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setPurchaseModalVisible(false)}
                  style={[styles.modalSecondaryBtn, { borderColor: colors.gray300 }]}
                >
                  <Text style={[styles.modalSecondaryBtnText, { color: colors.gray600 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isKu ? 'داخستن' : 'Close'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>
          ) : null}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          READ-ONLY MODAL: SALES INVOICE DETAILS
         ══════════════════════════════════════════════════════════════ */}
      <Modal
        visible={saleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaleModalVisible(false)}
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSaleModalVisible(false)}
          />
          <View
            style={[
              styles.modalDialogCard,
              {
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderColor: colors.gray200,
                width: isTablet ? Math.min(width * 0.75, 680) : Math.min(width * 0.92, 450),
                maxHeight: isTablet ? height * 0.82 : height * 0.85,
              },
            ]}
          >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: isDark ? colors.gray100 : colors.white,
                borderBottomColor: colors.gray200,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="receipt" size={20} color="#10B981" />
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.black },
                  isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                ]}
              >
                {isKu ? 'وردەکاری وەسڵی فرۆشتن' : 'Sales Invoice Details'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setSaleModalVisible(false)}
              style={[styles.modalCloseBtn, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}
            >
              <Ionicons name="close" size={20} color={colors.black} />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          {loadingSaleDetails ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : selectedSale ? (
            <ScrollView
              contentContainerStyle={[styles.modalBody, isTablet && { maxWidth: 680, alignSelf: 'center', width: '100%' }]}
              showsVerticalScrollIndicator={false}
            >
              {/* Read Only Notice Badge */}
              <View
                style={[
                  styles.readOnlyNoticePill,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={14} color="#10B981" />
                <Text
                  style={[
                    styles.readOnlyNoticePillText,
                    { color: isDark ? '#6EE7B7' : '#047857', textAlign },
                    isKu && { fontFamily: SETTINGS_KURDISH_FONT },
                  ]}
                >
                  {isKu
                    ? 'ئەم پسوڵەیە لە ئەرشیف پارێزراوە و تەنها بۆ بینین و چاپکردنە.'
                    : 'Archived receipt for viewing and printing.'}
                </Text>
              </View>

              {/* Standard Full Invoice View */}
              <View style={styles.invoiceViewWrap}>
                <InvoiceView sale={selectedSale} />
              </View>

              {/* Bottom Print and Close Buttons */}
              <View style={[styles.modalBottomActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handlePrintSale(selectedSale)}
                  style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="print" size={18} color="#0F172A" />
                  <Text style={[styles.modalPrimaryBtnText, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isKu ? 'چاپکردنی وەسڵ' : 'Print Invoice'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSaleModalVisible(false)}
                  style={[styles.modalSecondaryBtn, { borderColor: colors.gray300 }]}
                >
                  <Text style={[styles.modalSecondaryBtnText, { color: colors.gray600 }, isKu && { fontFamily: SETTINGS_KURDISH_FONT_BOLD }]}>
                    {isKu ? 'داخستن' : 'Close'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>
          ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Stylesheet ───
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  scrollFlex: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Segmented Control
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  segmentBar: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Period Section
  periodSection: {
    marginBottom: 16,
  },
  periodSectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  periodTitleRow: {
    alignItems: 'center',
    gap: 6,
  },
  periodSectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  periodSubHint: {
    fontSize: 12,
  },
  periodPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodPillText: {
    fontSize: 12.5,
  },
  tabPeriodSectionWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // KPI Grid (Tab 1)
  reportScrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  kpiGrid: {
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '49%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  kpiIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  kpiCountText: {
    fontSize: 17,
    fontWeight: '800',
  },

  // Search Container
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInputWrap: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },

  // List & Grid Contents
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  gridContent: {
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },

  // Card Styles (List & Grid)
  listCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  invoiceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  gridCard: {
    flex: 1,
    margin: 6,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  invoiceNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  discountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  cardInfoWrap: {
    marginBottom: 8,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  phoneRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  partyPhone: {
    fontSize: 11.5,
  },
  subProductName: {
    fontSize: 11.5,
  },
  countBadgesRow: {
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.12)',
    alignItems: 'center',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDialogCard: {
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
    gap: 14,
  },
  readOnlyNoticePill: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  readOnlyNoticePillText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  modalSectionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  modalDetailRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDetailLabel: {
    fontSize: 13,
  },
  modalDetailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  itemTableRow: {
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTableName: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemTableSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  itemTableTotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalTotalLabel: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  modalTotalValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  invoiceViewWrap: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalBottomActions: {
    gap: 10,
    marginTop: 8,
  },
  modalPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  modalPrimaryBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
