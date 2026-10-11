import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

interface HeaderWaveLines3DProps {
  isAnimated?: boolean;
  height?: number;
}

const WAVELENGTH = 450;
const PERIODS = 3;
const TOTAL_SVG_WIDTH = WAVELENGTH * PERIODS; // 1350px
const SEGMENTS_PER_PERIOD = 8;
const SEGMENT_COUNT = PERIODS * SEGMENTS_PER_PERIOD;
const DX = WAVELENGTH / SEGMENTS_PER_PERIOD; // 56.25px

interface WavePathConfig {
  d: string;
  strokeWidth: number;
  opacity: number;
}

/**
 * Builds a mathematically continuous, periodic spline over 3 full wavelengths.
 * Guaranteeing 0% glitch / 0% stutter when looping horizontally across WAVELENGTH (450px).
 */
function buildPeriodicWavePath(
  y0: number,
  a1: number,
  phi1: number,
  a2: number,
  phi2: number
): string {
  const f = (x: number) => {
    const theta1 = (2 * Math.PI * x) / WAVELENGTH + phi1;
    const theta2 = (4 * Math.PI * x) / WAVELENGTH + phi2;
    return y0 + a1 * Math.sin(theta1) + a2 * Math.sin(theta2);
  };

  const df = (x: number) => {
    const theta1 = (2 * Math.PI * x) / WAVELENGTH + phi1;
    const theta2 = (4 * Math.PI * x) / WAVELENGTH + phi2;
    return (
      a1 * ((2 * Math.PI) / WAVELENGTH) * Math.cos(theta1) +
      a2 * ((4 * Math.PI) / WAVELENGTH) * Math.cos(theta2)
    );
  };

  const startY = f(0);
  let d = `M 0 ${startY.toFixed(2)}`;

  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const x0 = i * DX;
    const x1 = (i + 1) * DX;
    const y0Seg = f(x0);
    const y1Seg = f(x1);
    const dy0 = df(x0);
    const dy1 = df(x1);

    const cp1x = x0 + DX / 3;
    const cp1y = y0Seg + (DX / 3) * dy0;
    const cp2x = x1 - DX / 3;
    const cp2y = y1Seg - (DX / 3) * dy1;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${x1.toFixed(2)} ${y1Seg.toFixed(2)}`;
  }

  return d;
}

export const HeaderWaveLines3D = React.memo(function HeaderWaveLines3D({
  isAnimated = true,
  height = 195,
}: HeaderWaveLines3DProps) {
  // Independent translation and oscillation drivers for Stream 1 & Stream 2
  const animX1 = useRef(new Animated.Value(0)).current;
  const animY1 = useRef(new Animated.Value(0)).current;

  const animX2 = useRef(new Animated.Value(0)).current;
  const animY2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isAnimated) {
      animX1.stopAnimation();
      animY1.stopAnimation();
      animX2.stopAnimation();
      animY2.stopAnimation();
      animX1.setValue(0);
      animY1.setValue(0);
      animX2.setValue(0);
      animY2.setValue(0);
      return;
    }

    // STREAM 1: Translation loop over exactly 1 wavelength (450px) in 11.5s
    const loopX1 = Animated.loop(
      Animated.timing(animX1, {
        toValue: -WAVELENGTH,
        duration: 11500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // STREAM 1: Gentle vertical floating wave
    const loopY1 = Animated.loop(
      Animated.sequence([
        Animated.timing(animY1, {
          toValue: 5,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(animY1, {
          toValue: -5,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // STREAM 2: Different translation speed (15.2s) - organic multi-layer wave flow
    const loopX2 = Animated.loop(
      Animated.timing(animX2, {
        toValue: -WAVELENGTH,
        duration: 15200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // STREAM 2: Counter vertical breathing wave
    const loopY2 = Animated.loop(
      Animated.sequence([
        Animated.timing(animY2, {
          toValue: -6,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(animY2, {
          toValue: 6,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loopX1.start();
    loopY1.start();
    loopX2.start();
    loopY2.start();

    return () => {
      loopX1.stop();
      loopY1.stop();
      loopX2.stop();
      loopY2.stop();
    };
  }, [isAnimated, animX1, animY1, animX2, animY2]);

  // Generate 12 lines in 2 tightly spaced ribbons (6 lines each, spacing ~3.0px)
  const { stream1Lines, stream2Lines } = useMemo(() => {
    const centerY = height * 0.48;
    const s1: WavePathConfig[] = [];
    const s2: WavePathConfig[] = [];

    // Stream 1 (Lines 1 to 6): tight bundle centered around centerY - 7
    const s1Center = centerY - 7;
    for (let k = 0; k < 6; k++) {
      const y0 = s1Center + (k - 2.5) * 3.0; // 3.0px tight spacing
      const phi1 = k * 0.08;
      const phi2 = k * 0.12;
      const a1 = 17 + Math.sin(k * 0.6) * 2;
      const a2 = 5.5;
      const strokeWidth = 1.1 + k * 0.1;
      const opacity = 0.22 + k * 0.05;

      const d = buildPeriodicWavePath(y0, a1, phi1, a2, phi2);
      s1.push({ d, strokeWidth, opacity });
    }

    // Stream 2 (Lines 7 to 12): intertwined bundle centered around centerY + 9
    const s2Center = centerY + 9;
    for (let k = 0; k < 6; k++) {
      const y0 = s2Center + (k - 2.5) * 3.0; // 3.0px tight spacing
      const phi1 = 1.85 + k * 0.09; // ~106 deg phase shift for cross-weaving
      const phi2 = 0.95 + k * 0.14;
      const a1 = 20 + Math.cos(k * 0.6) * 3;
      const a2 = 6.5;
      const strokeWidth = 1.1 + (5 - k) * 0.1;
      const opacity = 0.2 + k * 0.05;

      const d = buildPeriodicWavePath(y0, a1, phi1, a2, phi2);
      s2.push({ d, strokeWidth, opacity });
    }

    return { stream1Lines: s1, stream2Lines: s2 };
  }, [height]);

  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      {/* 1. Stream 1 Animated Ribbon */}
      <Animated.View
        style={[
          styles.animatedCanvas,
          {
            width: TOTAL_SVG_WIDTH,
            height,
            transform: [{ translateX: animX1 }, { translateY: animY1 }],
          },
        ]}
      >
        <Svg width={TOTAL_SVG_WIDTH} height={height} viewBox={`0 0 ${TOTAL_SVG_WIDTH} ${height}`}>
          <Defs>
            <SvgGradient id="waveGoldGlow1" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
              <Stop offset="30%" stopColor="#FFFBEB" stopOpacity="0.55" />
              <Stop offset="60%" stopColor="#FEF3C7" stopOpacity="0.65" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
            </SvgGradient>
          </Defs>
          {stream1Lines.map((line, idx) => (
            <Path
              key={`stream1_line_${idx}`}
              d={line.d}
              stroke="url(#waveGoldGlow1)"
              strokeWidth={line.strokeWidth}
              strokeOpacity={line.opacity}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </Animated.View>

      {/* 2. Stream 2 Animated Ribbon (Different speed, intertwined motion) */}
      <Animated.View
        style={[
          styles.animatedCanvas,
          {
            width: TOTAL_SVG_WIDTH,
            height,
            transform: [{ translateX: animX2 }, { translateY: animY2 }],
          },
        ]}
      >
        <Svg width={TOTAL_SVG_WIDTH} height={height} viewBox={`0 0 ${TOTAL_SVG_WIDTH} ${height}`}>
          <Defs>
            <SvgGradient id="waveGoldGlow2" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
              <Stop offset="35%" stopColor="#FEF08A" stopOpacity="0.5" />
              <Stop offset="70%" stopColor="#FFFBEB" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.12" />
            </SvgGradient>
          </Defs>
          {stream2Lines.map((line, idx) => (
            <Path
              key={`stream2_line_${idx}`}
              d={line.d}
              stroke="url(#waveGoldGlow2)"
              strokeWidth={line.strokeWidth}
              strokeOpacity={line.opacity}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  animatedCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
