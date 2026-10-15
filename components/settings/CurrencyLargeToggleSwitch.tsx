import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Circle, Text as SvgText, Defs, RadialGradient, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/contexts/ThemeContext';
import { hexToRgba } from '@/lib/colorUtils';

export interface CurrencyLargeToggleSwitchProps {
  value: 'IQD' | 'USD';
  onToggle: (nextCurrency: 'IQD' | 'USD') => void;
  disabled?: boolean;
}

// ─── Iraqi Dinar Cash Note Graphic ──────────────────────────────────────────
export function IraqiDinarBanknote({
  size,
  width,
  height,
}: {
  size?: number;
  width?: number;
  height?: number;
}) {
  const w = width ?? (size ? Math.round(size * 1.55) : 64);
  const h = height ?? (size ?? 38);
  return (
    <View style={[styles.banknoteWrap, { width: w, height: h }]}>
      <Svg width={w} height={h} viewBox="0 0 68 40">
        <Defs>
          <SvgLinearGradient id="iqdBillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0D9488" />
            <Stop offset="45%" stopColor="#047857" />
            <Stop offset="100%" stopColor="#064E3B" />
          </SvgLinearGradient>
          <RadialGradient id="iqdGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#34D399" stopOpacity="0.38" />
            <Stop offset="100%" stopColor="#064E3B" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Banknote Base */}
        <Rect x="0.5" y="0.5" width="67" height="39" rx="5" fill="url(#iqdBillGrad)" stroke="#F59E0B" strokeWidth="1.2" />

        {/* Sheen overlay */}
        <Rect x="1" y="1" width="66" height="38" rx="4" fill="url(#iqdGlow)" />

        {/* Guilloche border frame */}
        <Rect
          x="3.5"
          y="3.5"
          width="61"
          height="33"
          rx="3.5"
          fill="none"
          stroke="rgba(251, 191, 36, 0.45)"
          strokeWidth="0.8"
          strokeDasharray="2.5,1.5"
        />

        {/* Security watermark strip */}
        <Rect x="12" y="1" width="3.5" height="38" fill="rgba(217, 119, 6, 0.38)" />

        {/* Corner Denomination numerals */}
        <SvgText x="5.5" y="10" fontSize="6.5" fontWeight="bold" fill="#FDE68A" textAnchor="start">
          د.ع
        </SvgText>
        <SvgText x="62.5" y="35" fontSize="6.5" fontWeight="bold" fill="#FDE68A" textAnchor="end">
          IQD
        </SvgText>

        {/* Center Medallion with decorative circle */}
        <Circle cx="36" cy="20" r="12" fill="#064E3B" stroke="#F59E0B" strokeWidth="1.2" />
        <Circle cx="36" cy="20" r="10" fill="none" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="0.6" strokeDasharray="1.5,1" />

        {/* Central Currency Symbol "د.ع" */}
        <SvgText
          x="36"
          y="24"
          fontSize="11.5"
          fontWeight="bold"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          د.ع
        </SvgText>
      </Svg>
    </View>
  );
}

// ─── US Dollar Cash Note Graphic ────────────────────────────────────────────
export function USDollarBanknote({
  size,
  width,
  height,
}: {
  size?: number;
  width?: number;
  height?: number;
}) {
  const w = width ?? (size ? Math.round(size * 1.55) : 64);
  const h = height ?? (size ?? 38);
  return (
    <View style={[styles.banknoteWrap, { width: w, height: h }]}>
      <Svg width={w} height={h} viewBox="0 0 68 40">
        <Defs>
          <SvgLinearGradient id="usdBillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#1E293B" />
            <Stop offset="35%" stopColor="#0F766E" />
            <Stop offset="100%" stopColor="#047857" />
          </SvgLinearGradient>
          <RadialGradient id="usdGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.38" />
            <Stop offset="100%" stopColor="#064E3B" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Banknote Base */}
        <Rect x="0.5" y="0.5" width="67" height="39" rx="5" fill="url(#usdBillGrad)" stroke="#F59E0B" strokeWidth="1.2" />

        {/* Sheen overlay */}
        <Rect x="1" y="1" width="66" height="38" rx="4" fill="url(#usdGlow)" />

        {/* Guilloche border frame */}
        <Rect
          x="3.5"
          y="3.5"
          width="61"
          height="33"
          rx="3.5"
          fill="none"
          stroke="rgba(251, 191, 36, 0.45)"
          strokeWidth="0.8"
          strokeDasharray="2.5,1.5"
        />

        {/* Famous $100 3D Blue Security Ribbon */}
        <Rect x="20" y="1" width="3.5" height="38" fill="#3B82F6" opacity={0.7} />

        {/* Corner Denomination numerals */}
        <SvgText x="5.5" y="10" fontSize="7" fontWeight="bold" fill="#86EFAC" textAnchor="start">
          $
        </SvgText>
        <SvgText x="62.5" y="35" fontSize="6.5" fontWeight="bold" fill="#FDE68A" textAnchor="end">
          USD
        </SvgText>

        {/* Center Federal Reserve Oval Medallion */}
        <Circle cx="37" cy="20" r="12" fill="#022C22" stroke="#F59E0B" strokeWidth="1.2" />
        <Circle cx="37" cy="20" r="10" fill="none" stroke="rgba(251, 191, 36, 0.4)" strokeWidth="0.6" strokeDasharray="1.5,1" />

        {/* Central Currency Symbol "$" */}
        <SvgText
          x="37"
          y="25.5"
          fontSize="15"
          fontWeight="bold"
          fill="#FFFFFF"
          textAnchor="middle"
        >
          $
        </SvgText>
      </Svg>
    </View>
  );
}

// Backward compatibility export aliases
export const IraqiDinarGraphic = IraqiDinarBanknote;
export const USDollarGraphic = USDollarBanknote;

const TRACK_WIDTH = 176;
const TRACK_HEIGHT = 56;
const TRACK_PADDING = 4;
const THUMB_WIDTH = (TRACK_WIDTH - TRACK_PADDING * 2) / 2; // 84px
const THUMB_HEIGHT = TRACK_HEIGHT - TRACK_PADDING * 2; // 48px
const TRAVEL_DISTANCE = THUMB_WIDTH; // 84px

export function CurrencyLargeToggleSwitch({
  value,
  onToggle,
  disabled = false,
}: CurrencyLargeToggleSwitchProps) {
  const { colors, isDark } = useAppTheme();
  const isUSD = value === 'USD';
  const progress = useSharedValue(isUSD ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isUSD ? 1 : 0, {
      damping: 17,
      stiffness: 185,
      mass: 0.85,
    });
  }, [isUSD, progress]);

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
      <View style={[styles.track, { borderColor: isDark ? hexToRgba(colors.primary, 0.45) : hexToRgba(colors.primary, 0.35) }]}>
        {/* Dark Slate Background */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Left Side: Iraqi Dinar Banknote */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handlePress('IQD')}
          disabled={disabled}
          style={styles.slotBtn}
        >
          <View style={[styles.badgeWrap, !isUSD ? styles.activeBadge : styles.inactiveBadge]}>
            <IraqiDinarBanknote width={66} height={39} />
          </View>
        </TouchableOpacity>

        {/* Right Side: US Dollar Banknote */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handlePress('USD')}
          disabled={disabled}
          style={styles.slotBtn}
        >
          <View style={[styles.badgeWrap, isUSD ? styles.activeBadge : styles.inactiveBadge]}>
            <USDollarBanknote width={66} height={39} />
          </View>
        </TouchableOpacity>

        {/* Animated Sliding Pill Selection Indicator */}
        <Animated.View style={[styles.thumbPill, thumbAnimatedStyle]} pointerEvents="none">
          <LinearGradient
            colors={[hexToRgba(colors.primary, 0.28), hexToRgba(colors.primary, 0.08)]}
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
    marginVertical: 6,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.65)',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  inactiveBadge: {
    opacity: 0.42,
    transform: [{ scale: 0.94 }],
  },
  banknoteWrap: {
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
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
