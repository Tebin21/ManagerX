import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text as RNText } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Circle, Path, G, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/contexts/ThemeContext';

export interface CurrencyLargeToggleSwitchProps {
  value: 'IQD' | 'USD';
  onToggle: (nextCurrency: 'IQD' | 'USD') => void;
  disabled?: boolean;
}

// ─── Iraqi Dinar Note Graphic ────────────────────────────────────────────────
export function IraqiDinarGraphic({ size = 38 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <RadialGradient id="iqdShine" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="1" />
            <Stop offset="80%" stopColor="#047857" stopOpacity="1" />
            <Stop offset="100%" stopColor="#064E3B" stopOpacity="1" />
          </RadialGradient>
        </Defs>

        {/* Banknote circle background */}
        <Circle cx="24" cy="24" r="23" fill="url(#iqdShine)" stroke="#F59E0B" strokeWidth="2" />
        
        {/* Guilloche decorative circle */}
        <Circle cx="24" cy="24" r="19" fill="none" stroke="rgba(251, 191, 36, 0.45)" strokeWidth="1" strokeDasharray="3,2" />

        {/* Palm frond / crescent accent */}
        <Path
          d="M 14 32 C 16 22 24 16 34 16 C 30 22 26 28 20 32 Z"
          fill="rgba(255, 255, 255, 0.18)"
        />

        {/* Central "د.ع" Arabic/Kurdish currency symbol */}
        <SvgText
          x="24"
          y="27"
          fontSize="17"
          fontWeight="bold"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          د.ع
        </SvgText>

        {/* Small "IQD" label */}
        <SvgText
          x="24"
          y="38"
          fontSize="7.5"
          fontWeight="bold"
          letterSpacing="0.8"
          fill="#FDE68A"
          textAnchor="middle"
        >
          IQD
        </SvgText>
      </Svg>
    </View>
  );
}

// ─── US Dollar Note Graphic ──────────────────────────────────────────────────
export function USDollarGraphic({ size = 38 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Defs>
          <RadialGradient id="usdShine" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#059669" stopOpacity="1" />
            <Stop offset="80%" stopColor="#065F46" stopOpacity="1" />
            <Stop offset="100%" stopColor="#022C22" stopOpacity="1" />
          </RadialGradient>
        </Defs>

        {/* Banknote circle background */}
        <Circle cx="24" cy="24" r="23" fill="url(#usdShine)" stroke="#F59E0B" strokeWidth="2" />

        {/* Guilloche decorative circle */}
        <Circle cx="24" cy="24" r="19" fill="none" stroke="rgba(251, 191, 36, 0.45)" strokeWidth="1" strokeDasharray="3,2" />

        {/* Laurel wreath accents */}
        <Path
          d="M 12 24 C 12 16 18 12 24 12 M 36 24 C 36 16 30 12 24 12"
          fill="none"
          stroke="rgba(254, 240, 138, 0.35)"
          strokeWidth="1.2"
        />

        {/* Central "$" Symbol */}
        <SvgText
          x="24"
          y="29"
          fontSize="22"
          fontWeight="bold"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          $
        </SvgText>

        {/* Small "USD" label */}
        <SvgText
          x="24"
          y="39"
          fontSize="7.5"
          fontWeight="bold"
          letterSpacing="0.8"
          fill="#FDE68A"
          textAnchor="middle"
        >
          USD
        </SvgText>
      </Svg>
    </View>
  );
}

const TRACK_WIDTH = 196;
const TRACK_HEIGHT = 64;
const TRACK_PADDING = 5;
const THUMB_WIDTH = (TRACK_WIDTH - TRACK_PADDING * 2) / 2; // 93px
const THUMB_HEIGHT = TRACK_HEIGHT - TRACK_PADDING * 2; // 54px
const TRAVEL_DISTANCE = THUMB_WIDTH; // 93px

export function CurrencyLargeToggleSwitch({
  value,
  onToggle,
  disabled = false,
}: CurrencyLargeToggleSwitchProps) {
  const isUSD = value === 'USD';
  const progress = useSharedValue(isUSD ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isUSD ? 1 : 0, {
      damping: 17,
      stiffness: 180,
      mass: 0.85,
    });
  }, [isUSD]);

  const handlePress = (target: 'IQD' | 'USD') => {
    if (disabled) return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch {}
    if (target !== value) {
      onToggle(target);
    }
  };

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [0, TRAVEL_DISTANCE],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.outerContainer}>
      <View style={styles.track}>
        {/* Background gradient */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Left Side: Iraqi Dinar slot button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePress('IQD')}
          disabled={disabled}
          style={styles.slotBtn}
        >
          <View style={[styles.badgeWrap, !isUSD && styles.activeBadgeWrap]}>
            <IraqiDinarGraphic size={36} />
            <View style={styles.textStack}>
              <RNText style={[styles.slotTitle, !isUSD ? styles.activeText : styles.inactiveText]}>
                دینار
              </RNText>
              <RNText style={[styles.slotSub, !isUSD ? styles.activeSubText : styles.inactiveSubText]}>
                د.ع
              </RNText>
            </View>
          </View>
        </TouchableOpacity>

        {/* Right Side: US Dollar slot button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePress('USD')}
          disabled={disabled}
          style={styles.slotBtn}
        >
          <View style={[styles.badgeWrap, isUSD && styles.activeBadgeWrap]}>
            <USDollarGraphic size={36} />
            <View style={styles.textStack}>
              <RNText style={[styles.slotTitle, isUSD ? styles.activeText : styles.inactiveText]}>
                دۆلار
              </RNText>
              <RNText style={[styles.slotSub, isUSD ? styles.activeSubText : styles.inactiveSubText]}>
                USD $
              </RNText>
            </View>
          </View>
        </TouchableOpacity>

        {/* Animated Sliding Pill Selection Indicator */}
        <Animated.View style={[styles.thumbPill, thumbAnimatedStyle]} pointerEvents="none">
          <LinearGradient
            colors={['rgba(212, 175, 55, 0.28)', 'rgba(212, 175, 55, 0.08)']}
            style={styles.thumbGradient}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    padding: TRACK_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  slotBtn: {
    flex: 1,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
    opacity: 0.55,
  },
  activeBadgeWrap: {
    opacity: 1,
  },
  textStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  slotSub: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: -1,
  },
  activeText: {
    color: '#FFFFFF',
  },
  inactiveText: {
    color: '#94A3B8',
  },
  activeSubText: {
    color: '#D4AF37',
  },
  inactiveSubText: {
    color: '#64748B',
  },
  thumbPill: {
    position: 'absolute',
    left: TRACK_PADDING,
    top: TRACK_PADDING,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    zIndex: 1,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 4,
  },
  thumbGradient: {
    flex: 1,
    borderRadius: THUMB_HEIGHT / 2,
  },
});
