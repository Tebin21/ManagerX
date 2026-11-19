import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  G,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/AppText';
import { AmountText } from '@/components/ui/AmountText';
import { CompactAmount } from '@/components/shared/CompactAmount';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { useResponsive } from '@/hooks/useResponsive';
import { fmtEnNumber } from '@/utils/formatters';
import {
  type DashboardOverviewStats,
  getRevenueByMonth,
  getMostProfitableProducts,
  type ProfitableProduct,
  type RevenuePoint,
} from '@/lib/sqlite';
import { MotiView } from 'moti';

// Kurdish Month Names for the Spline Chart
const KURDISH_MONTHS_SHORT = [
  'کـ٢', 'شوبات', 'ئازار', 'نیسان', 'ئایار', 'حوزەیران',
  'تەممووز', 'ئاب', 'ئەیلوول', 'تـ١', 'تـ٢', 'کـ١',
];
const ENGLISH_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type ChartTab = 'all' | 'trend' | 'donut' | 'bars' | 'health' | 'products';
type TrendMetric = 'both' | 'revenue' | 'profit';

interface Props {
  stats: DashboardOverviewStats;
  periodLabel: string;
  fromStr?: string;
  toStr?: string;
}

export function DashboardAnalyticsCharts({
  stats,
  periodLabel,
  fromStr,
  toStr,
}: Props) {
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const isKurdish = useLanguageStore((s) => s.language === 'ku');
  const isAr = useLanguageStore((s) => s.language === 'ar');
  const { isTablet, isTabletLandscape } = useResponsive();

  // State
  const [activeTab, setActiveTab] = useState<ChartTab>('all');
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('both');
  const [monthlyPoints, setMonthlyPoints] = useState<RevenuePoint[]>([]);
  const [topProducts, setTopProducts] = useState<ProfitableProduct[]>([]);
  const [isLoadingAsync, setIsLoadingAsync] = useState(true);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(
    Dimensions.get('window').width - (isTablet ? 64 : 32)
  );

  // Load monthly revenue & top products
  useEffect(() => {
    let isMounted = true;
    async function loadExtraData() {
      try {
        setIsLoadingAsync(true);
        const [revData, prodData] = await Promise.all([
          getRevenueByMonth(6).catch(() => []),
          getMostProfitableProducts(5, fromStr, toStr).catch(() => []),
        ]);
        if (isMounted) {
          setMonthlyPoints(Array.isArray(revData) ? revData : []);
          setTopProducts(Array.isArray(prodData) ? prodData : []);
          if (Array.isArray(revData) && revData.length > 0) {
            setSelectedPointIndex(revData.length - 1);
          }
        }
      } catch (err) {
        console.warn('[DashboardAnalyticsCharts] Error fetching extra data:', err);
      } finally {
        if (isMounted) setIsLoadingAsync(false);
      }
    }
    loadExtraData();
    return () => {
      isMounted = false;
    };
  }, [fromStr, toStr]);

  // Handle responsive chart container measurement
  const onLayoutChartContainer = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 50) {
      setChartWidth(width);
    }
  }, []);

  // Safe KPI values
  const rev = Math.max(0, stats.totalRevenue || 0);
  const pur = Math.max(0, stats.totalPurchasesCost || 0);
  const exp = Math.max(0, stats.totalExpenses || 0);
  const profit = stats.expectedProfit || 0;
  const custDebt = Math.max(0, stats.customerDebtTotal || 0);
  const suppDebt = Math.max(0, stats.supplierDebtTotal || 0);
  const disc = Math.max(0, stats.totalDiscount || 0);

  // Profit Margin %
  const profitMarginPct = rev > 0 ? Math.round((profit / rev) * 100) : 0;
  // Expense Ratio %
  const expenseRatioPct = rev > 0 ? Math.round((exp / rev) * 100) : 0;
  // Customer Debt to Revenue Ratio %
  const debtRatioPct = rev > 0 ? Math.round((custDebt / rev) * 100) : 0;
  // Installment Collection Rate %
  const instTotal = stats.totalInstallmentSales || 0;
  const instColl = stats.totalInstallmentCollected || 0;
  const instRatePct = instTotal > 0 ? Math.round((instColl / instTotal) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SPLINE TREND CURVE CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (!monthlyPoints || monthlyPoints.length === 0) {
      // Synthesize fallback 6 months if database has no points yet
      const fallback: RevenuePoint[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        fallback.push({
          period: `${y}-${m}`,
          revenue: i === 0 ? rev : 0,
          profit: i === 0 ? profit : 0,
          sales: i === 0 ? stats.totalSales || 0 : 0,
        });
      }
      return fallback;
    }
    return monthlyPoints;
  }, [monthlyPoints, rev, profit, stats.totalSales]);

  const chartHeight = isTablet ? 240 : 200;
  const paddingLeft = 24;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 34;

  const innerWidth = Math.max(100, chartWidth - paddingLeft - paddingRight);
  const innerHeight = Math.max(50, chartHeight - paddingTop - paddingBottom);

  const maxTrendVal = useMemo(() => {
    let max = 1000;
    trendData.forEach((p) => {
      if (p.revenue > max) max = p.revenue;
      if (p.profit > max) max = p.profit;
    });
    return max * 1.15;
  }, [trendData]);

  // Coordinates of trend points
  const points = useMemo(() => {
    const n = trendData.length;
    if (n === 0) return [];
    return trendData.map((d, i) => {
      const x = paddingLeft + (i / Math.max(1, n - 1)) * innerWidth;
      const revClamped = Math.max(0, d.revenue);
      const profClamped = Math.max(0, d.profit);
      const yRev = paddingTop + innerHeight - (revClamped / maxTrendVal) * innerHeight;
      const yProf = paddingTop + innerHeight - (profClamped / maxTrendVal) * innerHeight;

      // Extract month name
      const parts = d.period.split('-');
      const mIdx = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
      const monthLabel = isKurdish
        ? KURDISH_MONTHS_SHORT[mIdx] || d.period
        : ENGLISH_MONTHS_SHORT[mIdx] || d.period;

      return {
        x,
        yRev,
        yProf,
        data: d,
        monthLabel,
      };
    });
  }, [trendData, paddingLeft, paddingTop, innerWidth, innerHeight, maxTrendVal, isKurdish]);

  // Smooth Bézier Spline path generator
  const createSplinePath = useCallback((pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }, []);

  const revLinePath = useMemo(() => {
    return createSplinePath(points.map((p) => ({ x: p.x, y: p.yRev })));
  }, [points, createSplinePath]);

  const revAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const bottomY = paddingTop + innerHeight;
    const first = points[0];
    const last = points[points.length - 1];
    return `${revLinePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [points, revLinePath, paddingTop, innerHeight]);

  const profLinePath = useMemo(() => {
    return createSplinePath(points.map((p) => ({ x: p.x, y: p.yProf })));
  }, [points, createSplinePath]);

  const profAreaPath = useMemo(() => {
    if (points.length < 2) return '';
    const bottomY = paddingTop + innerHeight;
    const first = points[0];
    const last = points[points.length - 1];
    return `${profLinePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [points, profLinePath, paddingTop, innerHeight]);

  // Selected point details
  const activePoint = selectedPointIndex !== null ? points[selectedPointIndex] : null;

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DONUT RING SEGMENT CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  const donutSegments = useMemo(() => {
    const list = [
      {
        id: 'revenue',
        label: isAr ? 'المبيعات والداهات' : isKurdish ? 'داهات و فرۆشتن' : 'Revenue',
        value: rev,
        color: '#10B981', // Emerald
        icon: 'wallet-outline',
      },
      {
        id: 'purchases',
        label: isAr ? 'تكاليف المشتريات' : isKurdish ? 'تێچووی کڕین' : 'Purchases Cost',
        value: pur,
        color: '#8B5CF6', // Purple
        icon: 'bag-handle-outline',
      },
      {
        id: 'expenses',
        label: isAr ? 'المصروفات' : isKurdish ? 'مەسروفات و خەرجی' : 'Expenses',
        value: exp,
        color: '#F43F5E', // Rose
        icon: 'cash-outline',
      },
      {
        id: 'profit',
        label: isAr ? 'صافي الأرباح' : isKurdish ? 'قازانجی ڕوون' : 'Net Profit',
        value: Math.max(0, profit),
        color: '#F59E0B', // Amber Gold
        icon: 'trending-up-outline',
      },
      {
        id: 'custDebt',
        label: isAr ? 'ديون الزبائن' : isKurdish ? 'قەرزی کڕیاران' : 'Receivables',
        value: custDebt,
        color: '#06B6D4', // Cyan
        icon: 'arrow-down-circle-outline',
      },
    ].filter((s) => s.value > 0);

    const totalVal = list.reduce((acc, cur) => acc + cur.value, 0);

    const donutSize = isTablet ? 180 : 150;
    const strokeWidth = isTablet ? 26 : 22;
    const radius = (donutSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let cumulativeOffset = 0;
    const computed = list.map((seg) => {
      const pct = totalVal > 0 ? seg.value / totalVal : 0;
      const strokeDash = pct * circumference;
      const strokeGap = circumference - strokeDash;
      const arc = {
        ...seg,
        pct: Math.round(pct * 100),
        strokeDash,
        strokeGap,
        offset: cumulativeOffset,
      };
      cumulativeOffset += strokeDash;
      return arc;
    });

    return {
      list: computed,
      totalVal,
      donutSize,
      strokeWidth,
      radius,
      circumference,
    };
  }, [rev, pur, exp, profit, custDebt, isAr, isKurdish, isTablet]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. COMPARATIVE BAR CHART ITEMS
  // ─────────────────────────────────────────────────────────────────────────────
  const comparativeItems = useMemo(() => {
    const raw = [
      {
        id: 'rev',
        title: isAr ? 'إجمالي المبيعات والداهات' : isKurdish ? 'کۆی داهاتی فرۆشتن' : 'Total Revenue',
        value: rev,
        color: '#10B981',
        icon: 'wallet',
      },
      {
        id: 'pur',
        title: isAr ? 'تكاليف شراء البضائع' : isKurdish ? 'تێچووی کڕینی کاڵا' : 'Purchases Cost',
        value: pur,
        color: '#8B5CF6',
        icon: 'bag-handle',
      },
      {
        id: 'exp',
        title: isAr ? 'إجمالي المصروفات والنفقات' : isKurdish ? 'کۆی مەسروفات و خەرجی' : 'Operating Expenses',
        value: exp,
        color: '#F43F5E',
        icon: 'receipt',
      },
      {
        id: 'profit',
        title: isAr ? 'الأرباح الصافية المتوقعة' : isKurdish ? 'قازانجی ڕوونی چاوەڕوانکراو' : 'Net Profit',
        value: Math.max(0, profit),
        color: '#F59E0B',
        icon: 'trending-up',
      },
      {
        id: 'cdebt',
        title: isAr ? 'ديون مستحقة عند الزبائن' : isKurdish ? 'قەرزی ماوەی لای کڕیاران' : 'Customer Receivables',
        value: custDebt,
        color: '#06B6D4',
        icon: 'arrow-down-circle',
      },
      {
        id: 'sdebt',
        title: isAr ? 'ديون واجبة الدفع للموردين' : isKurdish ? 'قەرزی سەرشان بۆ دابینکەران' : 'Supplier Payables',
        value: suppDebt,
        color: '#EC4899',
        icon: 'arrow-up-circle',
      },
      {
        id: 'disc',
        title: isAr ? 'إجمالي الخصومات الممنوحة' : isKurdish ? 'کۆی داشکاندنە بەخشراوەکان' : 'Discounts Given',
        value: disc,
        color: '#6366F1',
        icon: 'pricetag',
      },
    ];

    const maxVal = Math.max(...raw.map((r) => r.value), 1);
    return raw.map((item) => ({
      ...item,
      pctOfMax: Math.min(100, Math.max(6, Math.round((item.value / maxVal) * 100))),
    }));
  }, [rev, pur, exp, profit, custDebt, suppDebt, disc, isAr, isKurdish]);

  return (
    <View style={styles.container}>
      {/* ─── Top Filter Header ─── */}
      <View
        style={[
          styles.headerCard,
          {
            backgroundColor: isDark ? colors.gray100 : colors.white,
            borderColor: isDark ? colors.gray200 : colors.gray100,
          },
        ]}
      >
        <View style={[styles.headerTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: colors.primary + '18' },
              ]}
            >
              <Ionicons name="stats-chart" size={isTablet ? 20 : 18} color={colors.primary} />
            </View>
            <View>
              <Text
                style={[
                  styles.mainHeading,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isAr
                  ? 'شاشات وتحليلات المخططات البيانية'
                  : isKurdish
                  ? 'هێڵکاری و شیکارییە پێشکەوتووەکان'
                  : 'Advanced Analytics & Charts'}
              </Text>
              <Text style={[styles.subHeading, { color: colors.gray400, textAlign }]}>
                {isAr
                  ? `الفترة المحددة: (${periodLabel})`
                  : isKurdish
                  ? `ماوەی دیاریکراو: (${periodLabel})`
                  : `Active Period: (${periodLabel})`}
              </Text>
            </View>
          </View>

          {/* KPI Mini Pill */}
          <View
            style={[
              styles.kpiPill,
              {
                backgroundColor: profit >= 0 ? '#10B98118' : '#EF444418',
                borderColor: profit >= 0 ? '#10B98140' : '#EF444440',
              },
            ]}
          >
            <Ionicons
              name={profit >= 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={14}
              color={profit >= 0 ? '#10B981' : '#EF4444'}
            />
            <Text
              style={[
                styles.kpiPillText,
                { color: profit >= 0 ? '#10B981' : '#EF4444' },
                isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
              ]}
            >
              {profitMarginPct}% {isAr ? 'هامش الربح' : isKurdish ? 'ڕێژەی قازانج' : 'Margin'}
            </Text>
          </View>
        </View>

        {/* ─── Category Filter Tabs ─── */}
        <View style={[styles.tabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {[
            { key: 'all', label: isAr ? 'الكل' : isKurdish ? 'هەمووی' : 'All', icon: 'grid-outline' },
            { key: 'trend', label: isAr ? 'المسار الزمني' : isKurdish ? 'ڕەوتی کات' : 'Trend', icon: 'pulse-outline' },
            { key: 'donut', label: isAr ? 'التوزيع' : isKurdish ? 'دابەشبوون' : 'Donut', icon: 'pie-chart-outline' },
            { key: 'bars', label: isAr ? 'مقارنة' : isKurdish ? 'بەراورد' : 'Bars', icon: 'bar-chart-outline' },
            { key: 'health', label: isAr ? 'الصحة المالية' : isKurdish ? 'تەندروستی' : 'Health', icon: 'shield-checkmark-outline' },
            { key: 'products', label: isAr ? 'المنتجات' : isKurdish ? 'کاڵاکان' : 'Products', icon: 'cube-outline' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as ChartTab)}
                activeOpacity={0.7}
                style={[
                  styles.tabChip,
                  isActive
                    ? {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      }
                    : {
                        backgroundColor: isDark ? colors.gray200 + '50' : colors.gray100,
                        borderColor: 'transparent',
                      },
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={13}
                  color={isActive ? '#FFFFFF' : colors.gray400}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isActive ? '#FFFFFF' : colors.gray400 },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* CHART 1: SPLINE AREA / LINE TREND CHART                                */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'trend') && (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250 }}
          style={[
            styles.chartCard,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : colors.gray100,
            },
          ]}
          onLayout={onLayoutChartContainer}
        >
          {/* Card Header */}
          <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.cardTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.chartDot, { backgroundColor: '#10B981' }]} />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isAr ? 'مخطط مسار المبيعات والأرباح' : isKurdish ? 'هێڵکاریی ڕەوتی داهات و قازانج' : 'Revenue & Profit Trend'}
              </Text>
            </View>

            {/* Metric Switch */}
            <View style={[styles.metricToggleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                onPress={() => setTrendMetric('both')}
                style={[
                  styles.metricBtn,
                  trendMetric === 'both' && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.metricBtnText,
                    { color: trendMetric === 'both' ? '#FFFFFF' : colors.gray400 },
                  ]}
                >
                  {isAr ? 'الكل' : isKurdish ? 'هەردووکی' : 'Both'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTrendMetric('revenue')}
                style={[
                  styles.metricBtn,
                  trendMetric === 'revenue' && { backgroundColor: '#10B981' },
                ]}
              >
                <Text
                  style={[
                    styles.metricBtnText,
                    { color: trendMetric === 'revenue' ? '#FFFFFF' : colors.gray400 },
                  ]}
                >
                  {isAr ? 'الإيراد' : isKurdish ? 'داهات' : 'Rev'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTrendMetric('profit')}
                style={[
                  styles.metricBtn,
                  trendMetric === 'profit' && { backgroundColor: '#F59E0B' },
                ]}
              >
                <Text
                  style={[
                    styles.metricBtnText,
                    { color: trendMetric === 'profit' ? '#FFFFFF' : colors.gray400 },
                  ]}
                >
                  {isAr ? 'الربح' : isKurdish ? 'قازانج' : 'Prof'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SVG Canvas */}
          <View style={{ width: '100%', height: chartHeight, position: 'relative' }}>
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                {/* Revenue Gradient */}
                <LinearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
                  <Stop offset="80%" stopColor="#10B981" stopOpacity="0.05" />
                  <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </LinearGradient>
                {/* Profit Gradient */}
                <LinearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.40" />
                  <Stop offset="80%" stopColor="#F59E0B" stopOpacity="0.05" />
                  <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {/* Background Grid Lines */}
              {[0, 0.33, 0.66, 1].map((pct, idx) => {
                const y = paddingTop + innerHeight * (1 - pct);
                return (
                  <G key={`grid-${idx}`}>
                    <Line
                      x1={paddingLeft}
                      y1={y}
                      x2={paddingLeft + innerWidth}
                      y2={y}
                      stroke={isDark ? '#334155' : '#E2E8F0'}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  </G>
                );
              })}

              {/* Revenue Area & Line */}
              {(trendMetric === 'both' || trendMetric === 'revenue') && (
                <>
                  <Path d={revAreaPath} fill="url(#revGrad)" />
                  <Path
                    d={revLinePath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Profit Area & Line */}
              {(trendMetric === 'both' || trendMetric === 'profit') && (
                <>
                  <Path d={profAreaPath} fill="url(#profGrad)" />
                  <Path
                    d={profLinePath}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Interactive Points on Line */}
              {points.map((pt, i) => {
                const isSelected = selectedPointIndex === i;
                return (
                  <G key={`pt-${i}`}>
                    {/* Vertical indicator line for selected */}
                    {isSelected && (
                      <Line
                        x1={pt.x}
                        y1={paddingTop}
                        x2={pt.x}
                        y2={paddingTop + innerHeight}
                        stroke={colors.primary}
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Revenue Dot */}
                    {(trendMetric === 'both' || trendMetric === 'revenue') && (
                      <Circle
                        cx={pt.x}
                        cy={pt.yRev}
                        r={isSelected ? 6 : 4}
                        fill="#10B981"
                        stroke={isDark ? '#1E293B' : '#FFFFFF'}
                        strokeWidth={2}
                      />
                    )}

                    {/* Profit Dot */}
                    {(trendMetric === 'both' || trendMetric === 'profit') && (
                      <Circle
                        cx={pt.x}
                        cy={pt.yProf}
                        r={isSelected ? 5.5 : 3.5}
                        fill="#F59E0B"
                        stroke={isDark ? '#1E293B' : '#FFFFFF'}
                        strokeWidth={2}
                      />
                    )}

                    {/* Month Label on X-Axis */}
                    <SvgText
                      x={pt.x}
                      y={chartHeight - 10}
                      fontSize={isTablet ? 11.5 : 10}
                      fill={isSelected ? colors.primary : colors.gray400}
                      textAnchor="middle"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {pt.monthLabel}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>

            {/* Tap Hotspots for Month Selection */}
            <View style={styles.hotspotOverlay} pointerEvents="box-none">
              {points.map((pt, idx) => (
                <TouchableOpacity
                  key={`tap-${idx}`}
                  onPress={() => setSelectedPointIndex(idx)}
                  style={[
                    styles.touchCol,
                    {
                      left: pt.x - 20,
                      width: 40,
                      height: chartHeight,
                    },
                  ]}
                  activeOpacity={0.6}
                />
              ))}
            </View>
          </View>

          {/* Interactive Tooltip Card for Selected Month */}
          {activePoint && (
            <View
              style={[
                styles.tooltipCard,
                {
                  backgroundColor: isDark ? colors.gray200 + '60' : colors.gray100,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={[styles.tooltipItem, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.tooltipLabel, { color: colors.gray400 }]}>
                  {isAr ? 'الشهر' : isKurdish ? 'مانگ' : 'Month'}
                </Text>
                <Text
                  style={[
                    styles.tooltipVal,
                    { color: colors.primary },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD },
                  ]}
                >
                  {activePoint.monthLabel} ({activePoint.data.period})
                </Text>
              </View>

              <View style={[styles.tooltipItem, { alignItems: 'center' }]}>
                <Text style={[styles.tooltipLabel, { color: '#10B981' }]}>
                  {isAr ? 'الإيراد' : isKurdish ? 'داهات' : 'Revenue'}
                </Text>
                <CompactAmount
                  value={activePoint.data.revenue}
                  style={[styles.tooltipVal, { color: '#10B981' }]}
                />
              </View>

              <View style={[styles.tooltipItem, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                <Text style={[styles.tooltipLabel, { color: '#F59E0B' }]}>
                  {isAr ? 'الربح' : isKurdish ? 'قازانج' : 'Profit'}
                </Text>
                <CompactAmount
                  value={activePoint.data.profit}
                  style={[styles.tooltipVal, { color: '#F59E0B' }]}
                />
              </View>
            </View>
          )}
        </MotiView>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* CHART 2: DONUT ALLOCATION CHART                                        */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'donut') && (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250, delay: 50 }}
          style={[
            styles.chartCard,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : colors.gray100,
            },
          ]}
        >
          <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.cardTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.chartDot, { backgroundColor: '#F59E0B' }]} />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isAr
                  ? 'مخطط التوزيع والنسب المالية'
                  : isKurdish
                  ? 'بازنەی دابەشبوونی دارایی'
                  : 'Financial Allocation Donut'}
              </Text>
            </View>
          </View>

          {donutSegments.totalVal <= 0 ? (
            <View style={styles.emptyCardBox}>
              <Ionicons name="pie-chart-outline" size={36} color={colors.gray400} />
              <Text style={{ color: colors.gray400, marginTop: 6, fontSize: 13 }}>
                {isAr ? 'لا توجد بيانات مالية كافية حالياً' : isKurdish ? 'داتای دارایی پێویست تۆمار نەکراوە' : 'No financial data yet'}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.donutContentRow,
                {
                  flexDirection: isTablet ? (isRTL ? 'row-reverse' : 'row') : 'column',
                  alignItems: 'center',
                },
              ]}
            >
              {/* Donut SVG with Center Metric */}
              <View
                style={[
                  styles.donutWrapper,
                  { width: donutSegments.donutSize, height: donutSegments.donutSize },
                ]}
              >
                <Svg
                  width={donutSegments.donutSize}
                  height={donutSegments.donutSize}
                  style={{ transform: [{ rotate: '-90deg' }] }}
                >
                  {/* Base Track */}
                  <Circle
                    cx={donutSegments.donutSize / 2}
                    cy={donutSegments.donutSize / 2}
                    r={donutSegments.radius}
                    stroke={isDark ? '#334155' : '#E2E8F0'}
                    strokeWidth={donutSegments.strokeWidth}
                    fill="none"
                  />
                  {/* Segment Arcs */}
                  {donutSegments.list.map((seg, idx) => (
                    <Circle
                      key={idx}
                      cx={donutSegments.donutSize / 2}
                      cy={donutSegments.donutSize / 2}
                      r={donutSegments.radius}
                      stroke={seg.color}
                      strokeWidth={donutSegments.strokeWidth}
                      fill="none"
                      strokeDasharray={`${seg.strokeDash} ${seg.strokeGap}`}
                      strokeDashoffset={-seg.offset}
                      strokeLinecap="round"
                    />
                  ))}
                </Svg>

                {/* Center Label */}
                <View style={styles.donutCenterLabel}>
                  <Ionicons name="wallet-outline" size={16} color={colors.primary} />
                  <AmountText
                    value={profit}
                    style={[
                      styles.donutCenterVal,
                      {
                        color: profit >= 0 ? colors.darkBlue : colors.error,
                        fontSize: isTablet ? 15 : 13,
                      },
                    ]}
                  />
                  <Text style={[styles.donutCenterSub, { color: colors.gray400 }]}>
                    {isAr ? 'صافي الربح' : isKurdish ? 'قازانجی ڕوون' : 'Net Profit'}
                  </Text>
                </View>
              </View>

              {/* Segment Legend List */}
              <View style={[styles.donutLegendContainer, { width: isTablet ? '58%' : '100%' }]}>
                {donutSegments.list.map((seg) => (
                  <View
                    key={seg.id}
                    style={[
                      styles.donutLegendItem,
                      {
                        backgroundColor: isDark ? colors.gray200 + '35' : colors.gray100 + '70',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={[styles.legendLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.legendColorPill, { backgroundColor: seg.color }]} />
                      <Text
                        style={[
                          styles.legendLabelText,
                          { color: colors.darkBlue, textAlign },
                          isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        ]}
                      >
                        {seg.label}
                      </Text>
                    </View>

                    <View style={[styles.legendRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <CompactAmount
                        value={seg.value}
                        style={[styles.legendValText, { color: seg.color }]}
                      />
                      <View
                        style={[
                          styles.legendPctBadge,
                          { backgroundColor: seg.color + '20' },
                        ]}
                      >
                        <Text style={[styles.legendPctText, { color: seg.color }]}>
                          %{seg.pct}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </MotiView>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* CHART 3: MULTI-METRIC COMPARATIVE BAR CHART                           */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'bars') && (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250, delay: 100 }}
          style={[
            styles.chartCard,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : colors.gray100,
            },
          ]}
        >
          <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.cardTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.chartDot, { backgroundColor: '#06B6D4' }]} />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isAr
                  ? 'مقارنة حجم التدفقات المالية'
                  : isKurdish
                  ? 'بەراوردکاری قەبارەی سەرچاوەکان'
                  : 'Multi-Metric Comparative Bars'}
              </Text>
            </View>
          </View>

          <View style={styles.barsList}>
            {comparativeItems.map((bar) => (
              <View key={bar.id} style={styles.barItemRow}>
                {/* Header: Title and Exact Value */}
                <View style={[styles.barItemHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.barTitleBox, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name={bar.icon as any} size={14} color={bar.color} />
                    <Text
                      style={[
                        styles.barTitleText,
                        { color: colors.darkBlue, textAlign },
                        isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                      ]}
                    >
                      {bar.title}
                    </Text>
                  </View>
                  <AmountText
                    value={bar.value}
                    style={[styles.barValueText, { color: bar.color }]}
                  />
                </View>

                {/* Progress Track & Rounded Bar */}
                <View
                  style={[
                    styles.barTrack,
                    {
                      backgroundColor: isDark ? '#334155' : '#E2E8F0',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${bar.pctOfMax}%`,
                        backgroundColor: bar.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </MotiView>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* CHART 4: FINANCIAL HEALTH & RATIOS                                     */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'health') && (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250, delay: 150 }}
          style={[
            styles.chartCard,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : colors.gray100,
            },
          ]}
        >
          <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.cardTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.chartDot, { backgroundColor: '#10B981' }]} />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isAr
                  ? 'مؤشرات الصحة والكفاءة المالية'
                  : isKurdish
                  ? 'پێوەرەکانی تەندروستی دارایی'
                  : 'Financial Health & Key Ratios'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.healthGrid,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {/* Metric 1: Profit Margin */}
            <View
              style={[
                styles.healthSquare,
                {
                  backgroundColor: isDark ? colors.gray200 + '35' : colors.gray100 + '70',
                  width: isTablet ? '48.5%' : '100%',
                },
              ]}
            >
              <View style={[styles.healthTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="trending-up-outline" size={18} color="#10B981" />
                <Text
                  style={[
                    styles.healthMetricName,
                    { color: colors.darkBlue },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isAr ? 'هامش صافي الربح' : isKurdish ? 'ڕێژەی قازانجی ڕوون' : 'Net Profit Margin'}
                </Text>
                <View
                  style={[
                    styles.healthStatusTag,
                    {
                      backgroundColor:
                        profitMarginPct >= 30
                          ? '#10B98120'
                          : profitMarginPct >= 15
                          ? '#3B82F620'
                          : profitMarginPct > 0
                          ? '#F59E0B20'
                          : '#EF444420',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.healthStatusText,
                      {
                        color:
                          profitMarginPct >= 30
                            ? '#10B981'
                            : profitMarginPct >= 15
                            ? '#3B82F6'
                            : profitMarginPct > 0
                            ? '#F59E0B'
                            : '#EF4444',
                      },
                    ]}
                  >
                    {profitMarginPct >= 30
                      ? isAr ? 'ممتاز 🌟' : isKurdish ? 'نایاب 🌟' : 'Optimal'
                      : profitMarginPct >= 15
                      ? isAr ? 'جيد جداً' : isKurdish ? 'باشە 👍' : 'Good'
                      : profitMarginPct > 0
                      ? isAr ? 'متوسط' : isKurdish ? 'کەمە ⚠️' : 'Low'
                      : isAr ? 'خسارة' : isKurdish ? 'زەرەر 🚨' : 'Negative'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.healthBigNumber, { color: '#10B981' }]}>
                %{profitMarginPct}
              </Text>

              <View
                style={[
                  styles.healthProgressBarTrack,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              >
                <View
                  style={[
                    styles.healthProgressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, profitMarginPct))}%`,
                      backgroundColor: '#10B981',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.healthDesc, { color: colors.gray400, textAlign }]}>
                {isAr
                  ? 'نسبة الأرباح من إجمالي الإيرادات'
                  : isKurdish
                  ? 'ڕێژەی قازانج لە تەواوی داهاتی فرۆشراو'
                  : 'Share of revenue converted into profit'}
              </Text>
            </View>

            {/* Metric 2: Expense Ratio */}
            <View
              style={[
                styles.healthSquare,
                {
                  backgroundColor: isDark ? colors.gray200 + '35' : colors.gray100 + '70',
                  width: isTablet ? '48.5%' : '100%',
                },
              ]}
            >
              <View style={[styles.healthTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="receipt-outline" size={18} color="#F43F5E" />
                <Text
                  style={[
                    styles.healthMetricName,
                    { color: colors.darkBlue },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isAr ? 'نسبة المصروفات' : isKurdish ? 'ڕێژەی مەسروفات' : 'Expense Ratio'}
                </Text>
                <View
                  style={[
                    styles.healthStatusTag,
                    {
                      backgroundColor:
                        expenseRatioPct <= 15
                          ? '#10B98120'
                          : expenseRatioPct <= 35
                          ? '#3B82F620'
                          : '#EF444420',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.healthStatusText,
                      {
                        color:
                          expenseRatioPct <= 15
                            ? '#10B981'
                            : expenseRatioPct <= 35
                            ? '#3B82F6'
                            : '#EF4444',
                      },
                    ]}
                  >
                    {expenseRatioPct <= 15
                      ? isAr ? 'متحكم بها 🛡️' : isKurdish ? 'کۆنترۆڵکراوە 🛡️' : 'Controlled'
                      : expenseRatioPct <= 35
                      ? isAr ? 'معقول' : isKurdish ? 'مامناوەند 📊' : 'Moderate'
                      : isAr ? 'مرتفعة ⚠️' : isKurdish ? 'بەرزە ⚠️' : 'High'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.healthBigNumber, { color: '#F43F5E' }]}>
                %{expenseRatioPct}
              </Text>

              <View
                style={[
                  styles.healthProgressBarTrack,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              >
                <View
                  style={[
                    styles.healthProgressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, expenseRatioPct))}%`,
                      backgroundColor: '#F43F5E',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.healthDesc, { color: colors.gray400, textAlign }]}>
                {isAr
                  ? 'حجم النفقات والمصاريف التشغيلية'
                  : isKurdish
                  ? 'قەبارەی خەرجی کارگێڕی بەرامبەر داهات'
                  : 'Operating expenses against total sales'}
              </Text>
            </View>

            {/* Metric 3: Debt-to-Revenue Ratio */}
            <View
              style={[
                styles.healthSquare,
                {
                  backgroundColor: isDark ? colors.gray200 + '35' : colors.gray100 + '70',
                  width: isTablet ? '48.5%' : '100%',
                },
              ]}
            >
              <View style={[styles.healthTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="alert-circle-outline" size={18} color="#06B6D4" />
                <Text
                  style={[
                    styles.healthMetricName,
                    { color: colors.darkBlue },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isAr ? 'نسبة الديون للمبيعات' : isKurdish ? 'ڕێژەی قەرز بەرامبەر داهات' : 'Debt / Revenue'}
                </Text>
                <View style={[styles.healthStatusTag, { backgroundColor: '#06B6D420' }]}>
                  <Text style={[styles.healthStatusText, { color: '#06B6D4' }]}>
                    %{debtRatioPct}
                  </Text>
                </View>
              </View>

              <Text style={[styles.healthBigNumber, { color: '#06B6D4' }]}>
                %{debtRatioPct}
              </Text>

              <View
                style={[
                  styles.healthProgressBarTrack,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              >
                <View
                  style={[
                    styles.healthProgressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, debtRatioPct))}%`,
                      backgroundColor: '#06B6D4',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.healthDesc, { color: colors.gray400, textAlign }]}>
                {isAr
                  ? 'مستوى السيولة وأمان التحصيل'
                  : isKurdish
                  ? 'ئاستی سەلامەتی قەرز و نەختینەی دووکان'
                  : 'Accounts receivable balance ratio'}
              </Text>
            </View>

            {/* Metric 4: Installment Collection Rate */}
            <View
              style={[
                styles.healthSquare,
                {
                  backgroundColor: isDark ? colors.gray200 + '35' : colors.gray100 + '70',
                  width: isTablet ? '48.5%' : '100%',
                },
              ]}
            >
              <View style={[styles.healthTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
                <Text
                  style={[
                    styles.healthMetricName,
                    { color: colors.darkBlue },
                    isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                  ]}
                >
                  {isAr ? 'تحصيل الأقساط' : isKurdish ? 'کۆکردنەوەی قیست' : 'Installment Rate'}
                </Text>
                <View style={[styles.healthStatusTag, { backgroundColor: '#8B5CF620' }]}>
                  <Text style={[styles.healthStatusText, { color: '#8B5CF6' }]}>
                    %{instRatePct}
                  </Text>
                </View>
              </View>

              <Text style={[styles.healthBigNumber, { color: '#8B5CF6' }]}>
                %{instRatePct}
              </Text>

              <View
                style={[
                  styles.healthProgressBarTrack,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}
              >
                <View
                  style={[
                    styles.healthProgressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, instRatePct))}%`,
                      backgroundColor: '#8B5CF6',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.healthDesc, { color: colors.gray400, textAlign }]}>
                {isAr
                  ? 'نسبة المبالغ المستلمة من الأقساط'
                  : isKurdish
                  ? 'ڕێژەی پارەی وەرگیراو لە کۆی قیستەکان'
                  : 'Installment payment collection performance'}
              </Text>
            </View>
          </View>
        </MotiView>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* CHART 5: TOP PROFITABLE PRODUCTS RANKING                              */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'products') && (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250, delay: 200 }}
          style={[
            styles.chartCard,
            {
              backgroundColor: isDark ? colors.gray100 : colors.white,
              borderColor: isDark ? colors.gray200 : colors.gray100,
            },
          ]}
        >
          <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.cardTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.chartDot, { backgroundColor: '#EC4899' }]} />
              <Text
                style={[
                  styles.cardTitle,
                  { color: colors.darkBlue, textAlign },
                  isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                ]}
              >
                {isAr
                  ? 'أكثر ٥ منتجات ربحية في المتجر'
                  : isKurdish
                  ? '٥ پڕقازانجترین کاڵاکانی فرۆشگا'
                  : 'Top 5 Most Profitable Items'}
              </Text>
            </View>
          </View>

          {isLoadingAsync ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : topProducts.length === 0 ? (
            <View style={styles.emptyCardBox}>
              <Ionicons name="cube-outline" size={32} color={colors.gray400} />
              <Text style={{ color: colors.gray400, marginTop: 6, fontSize: 13 }}>
                {isAr ? 'لا توجد بيانات مبيعات للمنتجات بعد' : isKurdish ? 'هێشتا هیچ فرۆشتنێک بۆ کاڵاکان نەکراوە' : 'No product sales recorded yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.productsRankingList}>
              {topProducts.map((p, idx) => {
                const medals = ['🥇', '🥈', '🥉', '#4', '#5'];
                const rankColor =
                  idx === 0 ? '#F59E0B' : idx === 1 ? '#94A3B8' : idx === 2 ? '#B45309' : colors.primary;

                return (
                  <View
                    key={idx}
                    style={[
                      styles.productRankItem,
                      {
                        backgroundColor: isDark ? colors.gray200 + '30' : colors.gray100 + '60',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    {/* Medal / Rank Number */}
                    <View
                      style={[
                        styles.rankBadge,
                        {
                          backgroundColor: rankColor + '20',
                        },
                      ]}
                    >
                      <Text style={[styles.rankBadgeText, { color: rankColor }]}>
                        {medals[idx]}
                      </Text>
                    </View>

                    {/* Product Name & Qty */}
                    <View
                      style={[
                        styles.rankInfoBox,
                        { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankProductName,
                          { color: colors.darkBlue, textAlign },
                          isKurdish && { fontFamily: SETTINGS_KURDISH_FONT_BOLD, fontWeight: 'normal' },
                        ]}
                        numberOfLines={1}
                      >
                        {p.productName}
                      </Text>
                      <Text style={[styles.rankQtyText, { color: colors.gray400 }]}>
                        {fmtEnNumber(p.totalQty)} {isAr ? 'قطعة مباعة' : isKurdish ? 'دانە فرۆشراو' : 'Units Sold'}
                      </Text>
                    </View>

                    {/* Profit & Revenue Amount */}
                    <View
                      style={[
                        styles.rankAmountsBox,
                        { alignItems: isRTL ? 'flex-start' : 'flex-end' },
                      ]}
                    >
                      <AmountText
                        value={p.grossProfit}
                        style={[styles.rankProfitText, { color: '#10B981' }]}
                      />
                      <Text style={[styles.rankMarginTag, { color: colors.gray400 }]}>
                        %{Math.round(p.marginPct || 0)} {isAr ? 'ربح' : isKurdish ? 'قازانج' : 'margin'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 14,
  },
  headerCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  headerTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainHeading: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  subHeading: {
    fontSize: 11.5,
    marginTop: 2,
  },
  kpiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  tabsRow: {
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  cardHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitleGroup: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  metricToggleRow: {
    alignItems: 'center',
    gap: 4,
  },
  metricBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hotspotOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  touchCol: {
    position: 'absolute',
    top: 0,
  },
  tooltipCard: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tooltipItem: {
    flex: 1,
  },
  tooltipLabel: {
    fontSize: 10.5,
    marginBottom: 2,
  },
  tooltipVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCardBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutContentRow: {
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 6,
    gap: 16,
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterVal: {
    fontWeight: '800',
    marginTop: 2,
  },
  donutCenterSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  donutLegendContainer: {
    gap: 6,
  },
  donutLegendItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  legendLeft: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendColorPill: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabelText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  legendRight: {
    alignItems: 'center',
    gap: 8,
  },
  legendValText: {
    fontSize: 13,
    fontWeight: '700',
  },
  legendPctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  legendPctText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  barsList: {
    gap: 12,
    paddingTop: 4,
  },
  barItemRow: {
    gap: 6,
  },
  barItemHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barTitleBox: {
    alignItems: 'center',
    gap: 6,
  },
  barTitleText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  barValueText: {
    fontSize: 13,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthGrid: {
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  healthSquare: {
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  healthTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthMetricName: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
    marginHorizontal: 6,
  },
  healthStatusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  healthStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  healthBigNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  healthProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  healthProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  healthDesc: {
    fontSize: 10.5,
  },
  productsRankingList: {
    gap: 8,
  },
  productRankItem: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rankInfoBox: {
    flex: 1,
    marginHorizontal: 10,
  },
  rankProductName: {
    fontSize: 13,
    fontWeight: '600',
  },
  rankQtyText: {
    fontSize: 11,
    marginTop: 2,
  },
  rankAmountsBox: {
    minWidth: 80,
  },
  rankProfitText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  rankMarginTag: {
    fontSize: 10.5,
    marginTop: 2,
  },
});
