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

import { useLanguageStore } from '@/store/languageStore';
import { SETTINGS_KURDISH_FONT, SETTINGS_KURDISH_FONT_BOLD } from '@/lib/settingsFont';
import { Text } from '@/components/settings/SettingsText';

export interface CurrencyLargeToggleSwitchProps {
  value: 'IQD' | 'USD';
  onToggle: (nextCurrency: 'IQD' | 'USD') => void;
  disabled?: boolean;
}

// ─── Backward compatibility stub graphics (unused in UI now) ────────────────
export function IraqiDinarBanknote() {
  return null;
}
export function USDollarBanknote() {
  return null;
}
export const IraqiDinarGraphic = IraqiDinarBanknote;
export const USDollarGraphic = USDollarBanknote;

const TRACK_WIDTH = 220;
const TRACK_HEIGHT = 52;
const TRACK_PADDING = 4;
const THUMB_WIDTH = (TRACK_WIDTH - TRACK_PADDING * 2) / 2; // 106px
const THUMB_HEIGHT = TRACK_HEIGHT - TRACK_PADDING * 2; // 44px
const TRAVEL_DISTANCE = THUMB_WIDTH; // 106px

export function CurrencyLargeToggleSwitch({
  value,
  onToggle,
  disabled = false,
}: CurrencyLargeToggleSwitchProps) {
  const { colors, isDark } = useAppTheme();
  const isKu = useLanguageStore((s) => s.language === 'ku');
  const isUSD = value === 'USD';
  const progress = useSharedValue(isUSD ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isUSD ? 1 : 0, {
      damping: 18,
      stiffness: 195,
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
      <View
        style={[
          styles.track,
          {
            borderColor: isDark
              ? hexToRgba(colors.primary, 0.45)
              : hexToRgba(colors.primary, 0.35),
          },
        ]}
      >
        {/* Dark Slate Background */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Animated Sliding Pill Selection Indicator */}
        <Animated.View style={[styles.thumbPill, thumbAnimatedStyle]} pointerEvents="none">
          <LinearGradient
            colors={[colors.primary, '#B4881D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.thumbGradient}
          />
        </Animated.View>

        {/* Left Slot: Dinar (IQD) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePress('IQD')}
          disabled={disabled}
          style={styles.slotBtn}
        >
          <Text
            style={[
              styles.slotText,
              {
                color: !isUSD ? '#0F172A' : '#94A3B8',
                fontFamily: !isUSD ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                fontWeight: !isUSD ? '700' : '500',
              },
            ]}
          >
            {isKu ? 'دینار' : 'IQD'}
          </Text>
        </TouchableOpacity>

        {/* Right Slot: Dollar (USD) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePress('USD')}
          disabled={disabled}
          style={styles.slotBtn}
        >
          <Text
            style={[
              styles.slotText,
              {
                color: isUSD ? '#0F172A' : '#94A3B8',
                fontFamily: isUSD ? SETTINGS_KURDISH_FONT_BOLD : SETTINGS_KURDISH_FONT,
                fontWeight: isUSD ? '700' : '500',
              },
            ]}
          >
            {isKu ? 'دۆلار' : 'USD'}
          </Text>
        </TouchableOpacity>
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
  slotText: {
    fontSize: 16.5,
    letterSpacing: 0.3,
    textAlign: 'center',
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
