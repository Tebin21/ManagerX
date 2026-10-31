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
import { useAppTheme } from '@/contexts/ThemeContext';

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

// ─── Iraq Flag SVG (Red-White-Black Tricolor with Green Kufic Text) ─────────
export function IraqFlagIcon({ size = 24 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        {/* Red stripe */}
        <Rect x="0" y="0" width="32" height="10.67" fill="#CE1126" />
        {/* White stripe */}
        <Rect x="0" y="10.67" width="32" height="10.67" fill="#FFFFFF" />
        {/* Black stripe */}
        <Rect x="0" y="21.33" width="32" height="10.67" fill="#000000" />
        {/* Green Kufic Takbir representation */}
        <Path
          d="M 6.5 16.5 L 8.5 16.5 M 8.5 13.5 L 8.5 16.5 M 10.5 13.5 L 10.5 17.5 M 12.5 15 L 14.5 15 M 14.5 13.5 L 14.5 17.5 M 17.5 13.5 L 17.5 17.5 M 19 15 L 21 15 M 21 13.5 L 21 17.5 M 23 15 L 25.5 15"
          stroke="#007A3D"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export type SupportedLanguage = 'ku' | 'ar' | 'en';

interface Props {
  language?: SupportedLanguage;
  onChangeLanguage?: (lang: SupportedLanguage) => void;
  value?: boolean; // Backward compatibility: true = ku, false = en
  onToggle?: (val: boolean) => void;
  disabled?: boolean;
  isDark?: boolean;
}

const TRACK_WIDTH = 98;
const TRACK_HEIGHT = 34;
const TRACK_PADDING = 3;
const THUMB_SIZE = 28;
const STEP_DISTANCE = 32; // 0 for en, 32 for ar, 64 for ku

function getLanguageIndex(lang: SupportedLanguage): number {
  if (lang === 'en') return 0;
  if (lang === 'ar') return 1;
  return 2; // 'ku'
}

export function LanguageToggleSwitch({
  language,
  onChangeLanguage,
  value,
  onToggle,
  disabled = false,
  isDark: isDarkProp,
}: Props) {
  let appThemeDark = true;
  try {
    const theme = useAppTheme();
    appThemeDark = theme.isDark;
  } catch {
    appThemeDark = true;
  }
  const isDark = isDarkProp !== undefined ? isDarkProp : appThemeDark;

  // Determine current active language (supporting 3-way language or legacy boolean value)
  const currentLang: SupportedLanguage = language !== undefined
    ? language
    : value !== undefined
    ? (value ? 'ku' : 'en')
    : 'ku';

  const targetIndex = getLanguageIndex(currentLang);
  const progress = useSharedValue(targetIndex);

  useEffect(() => {
    progress.value = withSpring(targetIndex, {
      damping: 18,
      stiffness: 210,
      mass: 0.8,
    });
  }, [targetIndex]);

  const selectLanguage = (lang: SupportedLanguage) => {
    if (disabled) return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {}
    onChangeLanguage?.(lang);
    onToggle?.(lang === 'ku');
  };

  // Thumb sliding & subtle tilt during animation
  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1, 2],
      [0, STEP_DISTANCE, STEP_DISTANCE * 2],
      Extrapolation.CLAMP
    );
    const rotate = `${interpolate(progress.value, [0, 1, 2], [-8, 0, 8], Extrapolation.CLAMP)}deg`;
    return {
      transform: [{ translateX }, { rotate }],
    };
  });

  // Flag opacity and scaling inside the sliding thumb
  const ukIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [1, 0, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.5, 1], [1, 0.5, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const iraqIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 0.5, 1, 1.5, 2],
      [0, 0.5, 1, 0.5, 0],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          progress.value,
          [0, 0.5, 1, 1.5, 2],
          [0, 0.5, 1, 0.5, 0],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const kurdIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [1, 1.55, 2], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [1, 1.5, 2], [0, 0.5, 1], Extrapolation.CLAMP),
      },
    ],
  }));

  const darkGradients: [string, string] = ['#0F172A', '#1E293B'];
  const lightGradients: [string, string] = ['#FFFFFF', '#F1F5F9'];

  return (
    <View style={styles.switchWrapper}>
      <View
        style={[
          styles.trackContainer,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : '#E2E8F0',
            shadowColor: isDark ? '#000000' : '#0F172A',
            shadowOpacity: isDark ? 0.3 : 0.08,
          },
        ]}
      >
        <LinearGradient
          colors={isDark ? darkGradients : lightGradients}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.trackGradient}
        >
          {/* 3 Clickable Slots with Inactive Flag Badges */}
          <View style={styles.slotsRow}>
            {/* Slot 0: English (Left) */}
            <TouchableOpacity
              activeOpacity={0.75}
              disabled={disabled}
              onPress={() => selectLanguage('en')}
              style={styles.slotTouch}
              accessibilityLabel="English"
              accessibilityRole="button"
            >
              <View style={styles.inactiveIconWrap}>
                <UKFlagIcon size={16} />
              </View>
            </TouchableOpacity>

            {/* Slot 1: Arabic (Center) */}
            <TouchableOpacity
              activeOpacity={0.75}
              disabled={disabled}
              onPress={() => selectLanguage('ar')}
              style={styles.slotTouch}
              accessibilityLabel="العربية"
              accessibilityRole="button"
            >
              <View style={styles.inactiveIconWrap}>
                <IraqFlagIcon size={16} />
              </View>
            </TouchableOpacity>

            {/* Slot 2: Kurdish (Right) */}
            <TouchableOpacity
              activeOpacity={0.75}
              disabled={disabled}
              onPress={() => selectLanguage('ku')}
              style={styles.slotTouch}
              accessibilityLabel="کوردی"
              accessibilityRole="button"
            >
              <View style={styles.inactiveIconWrap}>
                <KurdistanFlagIcon size={16} />
              </View>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Animated Golden Sliding Thumb */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: '#D4AF37',
              shadowColor: isDark ? '#D4AF37' : '#000000',
              shadowOpacity: isDark ? 0.4 : 0.18,
            },
            thumbAnimatedStyle,
          ]}
        >
          {/* Active UK Flag */}
          <Animated.View style={[styles.iconContainer, ukIconStyle]}>
            <View style={styles.thumbInner}>
              <UKFlagIcon size={24} />
            </View>
          </Animated.View>

          {/* Active Iraq Flag */}
          <Animated.View style={[styles.iconContainer, iraqIconStyle]}>
            <View style={styles.thumbInner}>
              <IraqFlagIcon size={24} />
            </View>
          </Animated.View>

          {/* Active Kurdistan Flag */}
          <Animated.View style={[styles.iconContainer, kurdIconStyle]}>
            <View style={styles.thumbInner}>
              <KurdistanFlagIcon size={24} />
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switchWrapper: {
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackContainer: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  trackGradient: {
    flex: 1,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
  },
  slotsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
  },
  slotTouch: {
    width: (TRACK_WIDTH - 2) / 3,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  inactiveIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.42,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    position: 'absolute',
    left: TRACK_PADDING,
    top: TRACK_PADDING - 0.5,
    borderWidth: 1.8,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3.5,
    elevation: 5,
    overflow: 'hidden',
    zIndex: 2,
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
