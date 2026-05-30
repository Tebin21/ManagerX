import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Text } from '@/components/ui/AppText';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import { MotiView } from 'moti';
import { Colors } from '@/constants/colors';

interface BarData {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface Props {
  data: BarData[];
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
  showSecondary?: boolean;
  formatValue?: (v: number) => string;
}

function shortFmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

export function BarChart({
  data,
  height = 140,
  primaryColor = Colors.primary,
  secondaryColor = Colors.success,
  showSecondary = false,
  formatValue = shortFmt,
}: Props) {
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue ?? 0)), 1);
  const chartH = height - 28; // leave room for labels

  const barCount = showSecondary ? data.length * 2 + data.length : data.length;
  const gap = 4;
  const groupGap = showSecondary ? 8 : 6;
  const totalGaps = showSecondary
    ? (data.length - 1) * groupGap + data.length * gap
    : (data.length - 1) * gap;
  const barW = containerWidth > 0
    ? Math.max(4, (containerWidth - totalGaps) / (showSecondary ? data.length * 2 : data.length))
    : 16;

  return (
    <View onLayout={onLayout} style={{ height: height + 14 }}>
      {containerWidth > 0 && (
        <>
          <Svg width={containerWidth} height={height} style={{ overflow: 'visible' }}>
            {data.map((item, i) => {
              const barH = Math.max(2, (item.value / maxVal) * chartH);
              const x = showSecondary
                ? i * (barW * 2 + gap + groupGap)
                : i * (barW + gap);
              const y = chartH - barH;

              const secBarH = showSecondary && item.secondaryValue != null
                ? Math.max(2, (item.secondaryValue / maxVal) * chartH)
                : 0;
              const secX = x + barW + gap;

              return (
                <G key={i}>
                  {/* Primary bar — rendered as a foreign View inside SVG via absolute positioning */}
                  <Rect
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    fill={primaryColor}
                    rx={3}
                    ry={3}
                  />
                  {/* Value label above primary bar */}
                  {barH > 8 && (
                    <SvgText
                      x={x + barW / 2}
                      y={y - 4}
                      fontSize={8}
                      fill={Colors.gray400}
                      textAnchor="middle"
                    >
                      {formatValue(item.value)}
                    </SvgText>
                  )}

                  {/* Secondary bar */}
                  {showSecondary && item.secondaryValue != null && (
                    <>
                      <Rect
                        x={secX}
                        y={chartH - secBarH}
                        width={barW}
                        height={secBarH}
                        fill={secondaryColor}
                        rx={3}
                        ry={3}
                      />
                    </>
                  )}

                  {/* X-axis label */}
                  <SvgText
                    x={showSecondary ? x + barW + gap / 2 : x + barW / 2}
                    y={height - 4}
                    fontSize={9}
                    fill={Colors.gray400}
                    textAnchor="middle"
                  >
                    {item.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>

          {/* Legend */}
          {showSecondary && (
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: primaryColor }]} />
                <Text style={styles.legendText}>Revenue</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: secondaryColor }]} />
                <Text style={styles.legendText}>Profit</Text>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.gray400 },
});
