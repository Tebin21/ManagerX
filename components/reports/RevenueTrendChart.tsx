import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  type GestureResponderEvent,
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
} from 'react-native-svg';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme, type AppColors } from '@/contexts/ThemeContext';
import { useRTL } from '@/lib/rtl';
import { useResponsive } from '@/hooks/useResponsive';
import { CompactAmount } from '@/components/shared/CompactAmount';
import { PremiumCard } from '@/components/ui/PremiumCard';
import type { RevenuePoint } from '@/types/reports';

type FilterMetric = 'all' | 'revenue' | 'profit' | 'cost';

interface Props {
  data: RevenuePoint[];
  baseCurrency?: string;
  style?: any;
}

interface ProcessedPoint {
  period: string;
  label: string;
  fullLabel: string;
  revenue: number;
  profit: number;
  cost: number;
  sales: number;
}

const KURDISH_MONTHS = [
  'کانوونی دووەم',
  'شوبات',
  'ئازار',
  'نیسان',
  'ئایار',
  'حوزەیران',
  'تەممووز',
  'ئاب',
  'ئەیلوول',
  'تشرینی یەکەم',
  'تشرینی دووەم',
  'کانوونی یەکەم',
];

const KURDISH_MONTHS_SHORT = [
  'کـ٢',
  'شوبات',
  'ئازار',
  'نیسان',
  'ئایار',
  'حوزەیران',
  'تەممووز',
  'ئاب',
  'ئەیلوول',
  'تـ١',
  'تـ٢',
  'کـ١',
];

const ENGLISH_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatPeriodLabel(periodStr: string, isKu: boolean): { short: string; full: string } {
  // periodStr is formatted like "YYYY-MM"
  const parts = periodStr.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      const idx = monthNum - 1;
      const short = isKu ? KURDISH_MONTHS_SHORT[idx] : ENGLISH_MONTHS_SHORT[idx];
      const full = isKu ? `${KURDISH_MONTHS[idx]} ${year}` : `${ENGLISH_MONTHS_SHORT[idx]} ${year}`;
      return { short, full };
    }
  }
  return { short: periodStr, full: periodStr };
}

// Generate smooth cubic bezier SVG path from coordinates
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = p1.x - p0.x;
    const cp1x = p0.x + dx * 0.45;
    const cp1y = p0.y;
    const cp2x = p1.x - dx * 0.45;
    const cp2y = p1.y;
    path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return path;
}

export function RevenueTrendChart({ data = [], baseCurrency = 'IQD', style }: Props) {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const { isRTL, textAlign } = useRTL();
  const { isTablet, isTabletLandscape } = useResponsive();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<FilterMetric>('all');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const isKu = i18n.language === 'ku';

  // Ensure we have a solid sequence of the last 6 months even if DB has fewer entries
  const processedPoints = useMemo<ProcessedPoint[]>(() => {
    const now = new Date();
    const map = new Map<string, RevenuePoint>();
    (data || []).forEach((item) => {
      if (item && item.period) {
        map.set(item.period, item);
      }
    });

    const points: ProcessedPoint[] = [];
    const count = 6;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const periodKey = `${y}-${m}`;
      const found = map.get(periodKey);

      const revenue = Math.max(0, found?.revenue ?? 0);
      const profit = found?.profit ?? 0;
      const cost = Math.max(0, revenue - Math.max(0, profit));
      const sales = found?.sales ?? 0;

      const { short, full } = formatPeriodLabel(periodKey, isKu);
      points.push({
        period: periodKey,
        label: short,
        fullLabel: full,
        revenue,
        profit,
        cost,
        sales,
      });
    }
    return points;
  }, [data, isKu]);

  // Aggregate stats
  const totals = useMemo(() => {
    let totalRev = 0;
    let totalProf = 0;
    let totalCost = 0;
    let peakRev = 0;

    processedPoints.forEach((p) => {
      totalRev += p.revenue;
      totalProf += p.profit;
      totalCost += p.cost;
      if (p.revenue > peakRev) peakRev = p.revenue;
    });

    const marginPct = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
    const avgRev = processedPoints.length > 0 ? totalRev / processedPoints.length : 0;

    return { totalRev, totalProf, totalCost, peakRev, marginPct, avgRev };
  }, [processedPoints]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 2) {
      setContainerWidth(w);
    }
  }, [containerWidth]);

  // Dimensions
  const chartHeight = isTabletLandscape ? 260 : isTablet ? 230 : 190;
  const paddingLeft = 36;
  const paddingRight = 20;
  const paddingTop = 26;
  const paddingBottom = 28;

  const width = Math.max(containerWidth, 280);
  const plotWidth = Math.max(10, width - paddingLeft - paddingRight);
  const plotHeight = Math.max(10, chartHeight - paddingTop - paddingBottom);

  // Maximum scale value
  const maxVal = useMemo(() => {
    let highest = 0;
    processedPoints.forEach((p) => {
      if (p.revenue > highest) highest = p.revenue;
      if (p.cost > highest) highest = p.cost;
      if (p.profit > highest) highest = p.profit;
    });
    if (highest <= 0) return 100000;
    // Add 15% headroom
    return highest * 1.15;
  }, [processedPoints]);

  // Calculate coordinates
  const coords = useMemo(() => {
    const n = processedPoints.length;
    if (n === 0) return { rev: [], prof: [], cost: [] };

    const stepX = n > 1 ? plotWidth / (n - 1) : plotWidth;

    const rev: { x: number; y: number }[] = [];
    const prof: { x: number; y: number }[] = [];
    const cost: { x: number; y: number }[] = [];

    processedPoints.forEach((p, idx) => {
      // In RTL Kurdish, we can orient points naturally or LTR for chronological timeline
      const x = paddingLeft + idx * stepX;
      const yRev = paddingTop + plotHeight - (Math.max(0, p.revenue) / maxVal) * plotHeight;
      const yProf = paddingTop + plotHeight - (Math.max(0, p.profit) / maxVal) * plotHeight;
      const yCost = paddingTop + plotHeight - (Math.max(0, p.cost) / maxVal) * plotHeight;

      rev.push({ x, y: isNaN(yRev) ? paddingTop + plotHeight : yRev });
      prof.push({ x, y: isNaN(yProf) ? paddingTop + plotHeight : yProf });
      cost.push({ x, y: isNaN(yCost) ? paddingTop + plotHeight : yCost });
    });

    return { rev, prof, cost };
  }, [processedPoints, plotWidth, plotHeight, paddingTop, paddingLeft, maxVal]);

  // Build SVG Paths
  const revenuePath = useMemo(() => buildSmoothPath(coords.rev), [coords.rev]);
  const profitPath = useMemo(() => buildSmoothPath(coords.prof), [coords.prof]);
  const costPath = useMemo(() => buildSmoothPath(coords.cost), [coords.cost]);

  // Area under revenue line
  const revenueAreaPath = useMemo(() => {
    if (coords.rev.length < 2) return '';
    const baselineY = paddingTop + plotHeight;
    const firstX = coords.rev[0].x;
    const lastX = coords.rev[coords.rev.length - 1].x;
    return `${revenuePath} L ${lastX.toFixed(1)} ${baselineY.toFixed(1)} L ${firstX.toFixed(1)} ${baselineY.toFixed(1)} Z`;
  }, [coords.rev, revenuePath, paddingTop, plotHeight]);

  // Horizontal Grid Lines
  const gridLines = useMemo(() => {
    const steps = 4;
    const lines: { y: number; val: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const y = paddingTop + plotHeight * (1 - ratio);
      const val = maxVal * ratio;
      lines.push({ y, val });
    }
    return lines;
  }, [maxVal, paddingTop, plotHeight]);

  // Touch on chart to select index
  const handleChartPress = (evt: GestureResponderEvent) => {
    const locX = evt.nativeEvent.locationX;
    const n = processedPoints.length;
    if (n === 0) return;

    let closestIdx = 0;
    let minDiff = Infinity;
    coords.rev.forEach((pt, i) => {
      const diff = Math.abs(pt.x - locX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });

    if (selectedIdx === closestIdx) {
      setSelectedIdx(null); // toggle off
    } else {
      setSelectedIdx(closestIdx);
    }
  };

  const selectedPoint = selectedIdx !== null ? processedPoints[selectedIdx] : null;

  // Colors for lines
  const revColor = colors.primary; // Froshiar Gold Accent
  const profColor = colors.success ?? '#10B981'; // Vibrant Green
  const costColor = colors.error ?? '#EF4444'; // Red / Coral

  const styles = useMemo(() => getStyles(colors, isTablet, isTabletLandscape), [colors, isTablet, isTabletLandscape]);

  return (
    <PremiumCard style={[styles.card, style]}>
      {/* ─── Header ─── */}
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="stats-chart" size={isTablet ? 18 : 15} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.title, { textAlign }]}>{t('reports.revenueTrends')}</Text>
            <Text style={[styles.subtitle, { textAlign }]}>{t('reports.revenueTrendsDesc')}</Text>
          </View>
        </View>
      </View>

      {/* ─── KPI Quick Stat Chips ─── */}
      <View style={[styles.kpiRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { textAlign }]}>{t('reports.grossRevenue')}</Text>
          <CompactAmount
            value={totals.totalRev}
            style={[styles.kpiValue, { color: revColor, textAlign: isRTL ? 'right' : 'left' }]}
          />
        </View>

        <View style={[styles.kpiDivider, { backgroundColor: colors.gray100 }]} />

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { textAlign }]}>{t('reports.netProfit')}</Text>
          <CompactAmount
            value={totals.totalProf}
            style={[styles.kpiValue, { color: profColor, textAlign: isRTL ? 'right' : 'left' }]}
          />
        </View>

        <View style={[styles.kpiDivider, { backgroundColor: colors.gray100 }]} />

        <View style={styles.kpiCard}>
          <Text style={[styles.kpiLabel, { textAlign }]}>{t('reports.marginPct')}</Text>
          <Text style={[styles.kpiValue, { color: totals.marginPct >= 0 ? profColor : costColor, textAlign: isRTL ? 'right' : 'left' }]}>
            {totals.marginPct.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* ─── Metric Filter Tabs ─── */}
      <View style={[styles.filtersRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {(['all', 'revenue', 'profit', 'cost'] as FilterMetric[]).map((m) => {
          const isActive = activeFilter === m;
          const label =
            m === 'all'
              ? t('reports.allLines')
              : m === 'revenue'
              ? t('reports.revenueLine')
              : m === 'profit'
              ? t('reports.profitLine')
              : t('reports.costsLine');

          const activeColor =
            m === 'all'
              ? colors.primary
              : m === 'revenue'
              ? revColor
              : m === 'profit'
              ? profColor
              : costColor;

          return (
            <TouchableOpacity
              key={m}
              activeOpacity={0.75}
              onPress={() => setActiveFilter(m)}
              style={[
                styles.filterPill,
                isActive && { backgroundColor: `${activeColor}20`, borderColor: activeColor },
              ]}
            >
              <View
                style={[
                  styles.filterDot,
                  {
                    backgroundColor:
                      m === 'all' ? colors.primary : m === 'revenue' ? revColor : m === 'profit' ? profColor : costColor,
                  },
                ]}
              />
              <Text
                style={[
                  styles.filterText,
                  isActive ? { color: activeColor, fontWeight: '700' } : { color: colors.gray500 },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Interactive Tooltip Banner (When a Month is Tapped) ─── */}
      {selectedPoint && (
        <View style={[styles.tooltipBanner, { backgroundColor: isDark ? colors.gray200 : colors.gray100, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.tooltipHeader}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.tooltipPeriod, { color: colors.black }]}>{selectedPoint.fullLabel}</Text>
          </View>
          <View style={[styles.tooltipStats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.tooltipStatItem}>
              <Text style={styles.tooltipStatLabel}>{t('reports.revenueLine')}</Text>
              <CompactAmount value={selectedPoint.revenue} style={[styles.tooltipStatValue, { color: revColor }]} />
            </View>
            <View style={styles.tooltipStatItem}>
              <Text style={styles.tooltipStatLabel}>{t('reports.profitLine')}</Text>
              <CompactAmount value={selectedPoint.profit} style={[styles.tooltipStatValue, { color: profColor }]} />
            </View>
            <View style={styles.tooltipStatItem}>
              <Text style={styles.tooltipStatLabel}>{t('reports.costsLine')}</Text>
              <CompactAmount value={selectedPoint.cost} style={[styles.tooltipStatValue, { color: costColor }]} />
            </View>
          </View>
        </View>
      )}

      {/* ─── Responsive Chart SVG Canvas ─── */}
      <View
        onLayout={onLayout}
        onTouchEnd={handleChartPress}
        style={[styles.chartContainer, { height: chartHeight }]}
      >
        {containerWidth > 0 && (
          <Svg width={width} height={chartHeight}>
            <Defs>
              {/* Gradient fill under the revenue curve */}
              <LinearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={revColor} stopOpacity="0.32" />
                <Stop offset="80%" stopColor={revColor} stopOpacity="0.04" />
                <Stop offset="100%" stopColor={revColor} stopOpacity="0.00" />
              </LinearGradient>
              <LinearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={profColor} stopOpacity="0.25" />
                <Stop offset="100%" stopColor={profColor} stopOpacity="0.00" />
              </LinearGradient>
            </Defs>

            {/* Background Grid Lines & Y-Axis values */}
            {gridLines.map((line, i) => (
              <G key={i}>
                <Line
                  x1={paddingLeft}
                  y1={line.y}
                  x2={width - paddingRight}
                  y2={line.y}
                  stroke={colors.gray200}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity={0.65}
                />
              </G>
            ))}

            {/* Revenue Gradient Fill Area */}
            {(activeFilter === 'all' || activeFilter === 'revenue') && revenueAreaPath !== '' && (
              <Path d={revenueAreaPath} fill="url(#revGrad)" />
            )}

            {/* Cost Line */}
            {(activeFilter === 'all' || activeFilter === 'cost') && costPath !== '' && (
              <Path
                d={costPath}
                stroke={costColor}
                strokeWidth={activeFilter === 'cost' ? 3.5 : 2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5 3"
                fill="none"
              />
            )}

            {/* Net Profit Line */}
            {(activeFilter === 'all' || activeFilter === 'profit') && profitPath !== '' && (
              <Path
                d={profitPath}
                stroke={profColor}
                strokeWidth={activeFilter === 'profit' ? 3.5 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}

            {/* Revenue Line */}
            {(activeFilter === 'all' || activeFilter === 'revenue') && revenuePath !== '' && (
              <Path
                d={revenuePath}
                stroke={revColor}
                strokeWidth={activeFilter === 'revenue' ? 4 : 3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}

            {/* Selected Guide Line */}
            {selectedIdx !== null && coords.rev[selectedIdx] && (
              <Line
                x1={coords.rev[selectedIdx].x}
                y1={paddingTop - 4}
                x2={coords.rev[selectedIdx].x}
                y2={paddingTop + plotHeight + 4}
                stroke={colors.primary}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            )}

            {/* Data Points / Circles */}
            {coords.rev.map((pt, i) => {
              const isSelected = selectedIdx === i;
              return (
                <G key={i}>
                  {/* Revenue point */}
                  {(activeFilter === 'all' || activeFilter === 'revenue') && (
                    <>
                      {isSelected && (
                        <Circle
                          cx={pt.x}
                          cy={pt.y}
                          r={9}
                          fill={`${revColor}30`}
                        />
                      )}
                      <Circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected ? 5.5 : 3.5}
                        fill={colors.white}
                        stroke={revColor}
                        strokeWidth="2.5"
                      />
                    </>
                  )}

                  {/* Profit point */}
                  {(activeFilter === 'all' || activeFilter === 'profit') && coords.prof[i] && (
                    <>
                      {isSelected && (
                        <Circle
                          cx={coords.prof[i].x}
                          cy={coords.prof[i].y}
                          r={8}
                          fill={`${profColor}30`}
                        />
                      )}
                      <Circle
                        cx={coords.prof[i].x}
                        cy={coords.prof[i].y}
                        r={isSelected ? 5 : 3}
                        fill={colors.white}
                        stroke={profColor}
                        strokeWidth="2"
                      />
                    </>
                  )}

                  {/* Cost point */}
                  {(activeFilter === 'all' || activeFilter === 'cost') && coords.cost[i] && (
                    <>
                      {isSelected && (
                        <Circle
                          cx={coords.cost[i].x}
                          cy={coords.cost[i].y}
                          r={8}
                          fill={`${costColor}30`}
                        />
                      )}
                      <Circle
                        cx={coords.cost[i].x}
                        cy={coords.cost[i].y}
                        r={isSelected ? 5 : 3}
                        fill={colors.white}
                        stroke={costColor}
                        strokeWidth="2"
                      />
                    </>
                  )}
                </G>
              );
            })}
          </Svg>
        )}

        {/* X-Axis Month Labels Overlay */}
        <View style={styles.xAxisRow}>
          {processedPoints.map((p, i) => {
            const isSelected = selectedIdx === i;
            return (
              <TouchableOpacity
                key={p.period}
                activeOpacity={0.7}
                onPress={() => setSelectedIdx(isSelected ? null : i)}
                style={[
                  styles.xLabelBtn,
                  isSelected && { backgroundColor: `${colors.primary}20`, borderRadius: 6 },
                ]}
              >
                <Text
                  style={[
                    styles.xLabelText,
                    { color: isSelected ? colors.primary : colors.gray500 },
                    isSelected && { fontWeight: '800' },
                  ]}
                  numberOfLines={1}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─── Chart Footer Legend ─── */}
      <View style={[styles.legendRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendLine, { backgroundColor: revColor }]} />
          <Text style={[styles.legendText, { color: colors.gray500 }]}>{t('reports.revenueLine')}</Text>
        </View>

        <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendLine, { backgroundColor: profColor }]} />
          <Text style={[styles.legendText, { color: colors.gray500 }]}>{t('reports.profitLine')}</Text>
        </View>

        <View style={[styles.legendItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.legendLine, styles.dashedLine, { borderColor: costColor }]} />
          <Text style={[styles.legendText, { color: colors.gray500 }]}>{t('reports.costsLine')}</Text>
        </View>
      </View>
    </PremiumCard>
  );
}

function getStyles(colors: AppColors, isTablet: boolean = false, isTabletLandscape: boolean = false) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: isTablet ? 18 : 10,
      padding: isTabletLandscape ? 20 : isTablet ? 18 : 14,
      borderRadius: isTabletLandscape ? 22 : isTablet ? 18 : 16,
    },
    headerRow: {
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    titleGroup: {
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    iconWrap: {
      width: isTablet ? 34 : 30,
      height: isTablet ? 34 : 30,
      borderRadius: isTablet ? 10 : 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: isTablet ? 17 : 15,
      fontWeight: '800',
      color: colors.black,
    },
    subtitle: {
      fontSize: isTablet ? 13 : 11,
      color: colors.gray400,
      marginTop: 2,
    },

    // KPI row
    kpiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.gray50,
      borderRadius: isTablet ? 16 : 12,
      paddingVertical: isTablet ? 14 : 10,
      paddingHorizontal: isTablet ? 18 : 10,
      marginBottom: isTablet ? 18 : 14,
    },
    kpiCard: {
      flex: 1,
      alignItems: 'center',
    },
    kpiLabel: {
      fontSize: isTablet ? 13 : 11,
      color: colors.gray500,
      fontWeight: '600',
      marginBottom: 3,
    },
    kpiValue: {
      fontSize: isTablet ? 18 : 14,
      fontWeight: '800',
    },
    kpiDivider: {
      width: 1,
      height: 24,
    },

    // Filter pills
    filtersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isTablet ? 14 : 8,
      marginBottom: isTablet ? 16 : 12,
      flexWrap: 'wrap',
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isTablet ? 8 : 6,
      paddingHorizontal: isTablet ? 16 : 10,
      paddingVertical: isTablet ? 9 : 5,
      borderRadius: isTablet ? 24 : 20,
      borderWidth: 1,
      borderColor: colors.gray200,
      backgroundColor: 'transparent',
    },
    filterDot: {
      width: isTablet ? 9 : 7,
      height: isTablet ? 9 : 7,
      borderRadius: 4.5,
    },
    filterText: {
      fontSize: isTablet ? 14 : 11.5,
      fontWeight: '600',
    },

    // Tooltip Banner
    tooltipBanner: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    tooltipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tooltipPeriod: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '700',
    },
    tooltipStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    tooltipStatItem: {
      alignItems: 'center',
    },
    tooltipStatLabel: {
      fontSize: 10,
      color: colors.gray500,
      fontWeight: '600',
    },
    tooltipStatValue: {
      fontSize: isTablet ? 13 : 12,
      fontWeight: '800',
    },

    // Chart container
    chartContainer: {
      width: '100%',
      position: 'relative',
    },
    xAxisRow: {
      position: 'absolute',
      bottom: 2,
      left: 36,
      right: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    xLabelBtn: {
      paddingVertical: 3,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    xLabelText: {
      fontSize: isTablet ? 12 : 10,
      fontWeight: '600',
    },

    // Legend
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isTablet ? 24 : 16,
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.gray100,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendLine: {
      width: 14,
      height: 3.5,
      borderRadius: 2,
    },
    dashedLine: {
      borderWidth: 1,
      backgroundColor: 'transparent',
      borderStyle: 'dashed',
    },
    legendText: {
      fontSize: isTablet ? 12.5 : 11,
      fontWeight: '600',
    },
  });
}
