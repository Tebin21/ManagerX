import React, { useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';
import { useAppTheme } from '@/contexts/ThemeContext';

interface DataPoint {
  value: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
  color?: string;
  showArea?: boolean;
  showDots?: boolean;
}

export function MiniLineChart({
  data,
  height = 60,
  color,
  showArea = true,
  showDots = false,
}: Props) {
  const { colors } = useAppTheme();
  const resolvedColor = color ?? colors.primary;
  const [width, setWidth] = useState(0);

  if (!data || data.length < 2) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range  = maxVal - minVal || 1;

  const padding = 4;
  const chartH  = height - padding * 2;
  const chartW  = width  - padding * 2;

  function toX(i: number): number {
    return padding + (i / (data.length - 1)) * chartW;
  }
  function toY(v: number): number {
    return padding + chartH - ((v - minVal) / range) * chartH;
  }

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`)
    .join(' ');

  const areaPath = showArea
    ? `${linePath} L ${toX(data.length - 1).toFixed(1)},${(height - padding).toFixed(1)} L ${toX(0).toFixed(1)},${(height - padding).toFixed(1)} Z`
    : '';

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={resolvedColor} stopOpacity={0.3} />
              <Stop offset="1" stopColor={resolvedColor} stopOpacity={0} />
            </SvgGradient>
          </Defs>

          {showArea && (
            <Path d={areaPath} fill="url(#areaGrad)" />
          )}

          <Path
            d={linePath}
            stroke={resolvedColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {showDots && data.map((d, i) => (
            <Circle
              key={i}
              cx={toX(i)}
              cy={toY(d.value)}
              r={3}
              fill={resolvedColor}
            />
          ))}
        </Svg>
      )}
    </View>
  );
}
