import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Rect, Circle, Path } from 'react-native-svg';

// ─── Precomputed 21-Ray Path for Authentic Kurdistan Flag Sun ───────────────
const KURDISTAN_RAYS_PATH = (() => {
  const cx = 16;
  const cy = 16;
  const rTip = 6.8;
  const rBase = 3.9;
  const dTheta = Math.PI / 38;
  const paths: string[] = [];

  for (let i = 0; i < 21; i++) {
    const theta = (i * 2 * Math.PI) / 21 - Math.PI / 2;
    const xTip = (cx + rTip * Math.cos(theta)).toFixed(2);
    const yTip = (cy + rTip * Math.sin(theta)).toFixed(2);
    const x1 = (cx + rBase * Math.cos(theta - dTheta)).toFixed(2);
    const y1 = (cy + rBase * Math.sin(theta - dTheta)).toFixed(2);
    const x2 = (cx + rBase * Math.cos(theta + dTheta)).toFixed(2);
    const y2 = (cy + rBase * Math.sin(theta + dTheta)).toFixed(2);
    paths.push(`M ${xTip} ${yTip} L ${x1} ${y1} L ${x2} ${y2} Z`);
  }
  return paths.join(' ');
})();

// ─── Kurdistan Flag SVG (21-Ray Sun & Red-White-Green Tricolor) ──────────────
export function KurdistanFlagIcon({ size = 24 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {/* Red stripe */}
        <Rect x="0" y="0" width="32" height="10.67" fill="#EE2A35" />
        {/* White stripe */}
        <Rect x="0" y="10.67" width="32" height="10.67" fill="#FFFFFF" />
        {/* Green stripe */}
        <Rect x="0" y="21.33" width="32" height="10.67" fill="#10B981" />
        {/* Golden Sun disk */}
        <Circle cx="16" cy="16" r="4.0" fill="#FFC107" />
        {/* 21 golden rays */}
        <Path d={KURDISTAN_RAYS_PATH} fill="#FFC107" />
      </Svg>
    </View>
  );
}

// ─── UK Union Jack Flag SVG ──────────────────────────────────────────────────
export function UKFlagIcon({ size = 24 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {/* Blue background */}
        <Rect x="0" y="0" width="32" height="32" fill="#012169" />
        {/* White diagonals */}
        <Path d="M0 0 L32 32 M32 0 L0 32" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="square" />
        {/* Red diagonals */}
        <Path d="M0 0 L32 32 M32 0 L0 32" stroke="#C8102E" strokeWidth="2.5" strokeLinecap="square" />
        {/* White cross */}
        <Rect x="12" y="0" width="8" height="32" fill="#FFFFFF" />
        <Rect x="0" y="12" width="32" height="8" fill="#FFFFFF" />
        {/* Red cross */}
        <Rect x="13.5" y="0" width="5" height="32" fill="#C8102E" />
        <Rect x="0" y="13.5" width="32" height="5" fill="#C8102E" />
      </Svg>
    </View>
  );
}

interface Props {
  value: boolean; // true = Kurdish (Ku flag), false = English (UK flag)
  onToggle: (val: boolean) => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 62;
const TRACK_HEIGHT = 32;
const TRACK_PADDING = 3;
const THUMB_SIZE = 26;
const TRAVEL_DISTANCE = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2; // 30px

export function LanguageToggleSwitch({ value, onToggle, disabled = false }: Props) {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      damping: 16,
      stiffness: 190,
      mass: 0.8,
    });
  }, [value]);

  const handlePress = () => {
    if (disabled) return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      // Haptics fallback
    }
    onToggle(!value);
  };

  // Kurdish Track fade
  const kurdTrackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // English Track fade
  const engTrackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  // Thumb sliding & slight rotation
  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [0, TRAVEL_DISTANCE],
      Extrapolation.CLAMP
    );
    const rotate = `${interpolate(progress.value, [0, 1], [0, 360], Extrapolation.CLAMP)}deg`;
    return {
      transform: [{ translateX }, { rotate }],
    };
  });

  // UK Flag opacity inside thumb
  const ukIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [1, 0, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.5, 1], [1, 0.5, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  // Kurdistan Flag opacity inside thumb
  const kurdIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.5, 1], [0, 0.5, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      disabled={disabled}
      style={styles.switchWrapper}
    >
      <View style={styles.trackContainer}>
        {/* Kurdish Active Background Layer (Deep Slate with subtle UK flag on left) */}
        <Animated.View style={[StyleSheet.absoluteFill, kurdTrackStyle]}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.trackGradient, styles.goldBorder]}
          >
            {/* Inactive UK Flag on the left */}
            <View style={styles.inactiveLeftWrap}>
              <UKFlagIcon size={16} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* English Active Background Layer (Deep Navy + Slate with subtle Kurdistan flag on right) */}
        <Animated.View style={[StyleSheet.absoluteFill, engTrackStyle]}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.trackGradient, styles.goldBorder]}
          >
            {/* Inactive Kurdistan Flag on the right */}
            <View style={styles.inactiveRightWrap}>
              <KurdistanFlagIcon size={16} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Animated Thumb Sphere */}
        <Animated.View style={[styles.thumb, thumbAnimatedStyle]}>
          {/* UK Flag View inside Thumb */}
          <Animated.View style={[styles.iconContainer, ukIconStyle]}>
            <View style={styles.thumbInner}>
              <UKFlagIcon size={24} />
            </View>
          </Animated.View>

          {/* Kurdistan Flag View inside Thumb */}
          <Animated.View style={[styles.iconContainer, kurdIconStyle]}>
            <View style={styles.thumbInner}>
              <KurdistanFlagIcon size={24} />
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  switchWrapper: {
    paddingVertical: 2,
  },
  trackContainer: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: TRACK_PADDING,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.18,
    shadowRadius: 2.5,
    elevation: 2,
  },
  trackGradient: {
    flex: 1,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
    position: 'relative',
  },
  goldBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  inactiveLeftWrap: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
  },
  inactiveRightWrap: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  iconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInner: {
    width: '100%',
    height: '100%',
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
