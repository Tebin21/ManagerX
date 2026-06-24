import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
}

export function DonutRing({
  segments,
  size = 120,
  strokeWidth = 18,
  centerLabel,
  centerSub,
}: Props) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return null;

  const radius      = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;

  const arcs = segments.map((seg) => {
    const pct   = seg.value / total;
    const dash  = pct * circumference;
    const gap   = circumference - dash;
    const arc = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  return (
    <View style={styles.container}>
      {/* Donut */}
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          {/* Background track */}
          <Circle
            cx={cx} cy={cy} r={radius}
            stroke={Colors.gray100}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Segments */}
          {arcs.map((arc, i) => (
            <Circle
              key={i}
              cx={cx} cy={cy} r={radius}
              stroke={arc.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
            />
          ))}
        </Svg>

        {/* Center labels */}
        {(centerLabel || centerSub) && (
          <View style={[StyleSheet.absoluteFillObject, styles.centerLabels]}>
            {centerLabel ? (
              <Text style={styles.centerValue}>{centerLabel}</Text>
            ) : null}
            {centerSub ? (
              <Text style={styles.centerSub}>{centerSub}</Text>
            ) : null}
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {segments.map((seg, i) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
          return (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {seg.label}{' '}
                <Text style={styles.legendPct}>{pct}%</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  centerLabels: { justifyContent: 'center', alignItems: 'center' },
  centerValue: { fontSize: 14, fontWeight: '800', color: Colors.black, textAlign: 'center' },
  centerSub:   { fontSize: 10, color: Colors.gray400, textAlign: 'center', marginTop: 2 },
  legend: { flex: 1, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendText: { fontSize: 12, color: Colors.gray600, flex: 1 },
  legendPct:  { color: Colors.gray400, fontWeight: '600' },
});
