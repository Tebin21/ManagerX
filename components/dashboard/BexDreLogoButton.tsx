import React, { useEffect, useRef } from 'react';
import { Linking, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';

const BEXDRE_URL = 'https://www.bexdre.com';
const AUTO_RETURN_DELAY = 10000;
const ROW_HEIGHT = 44;

// Source PNGs are pre-trimmed to their visible content bounds (no transparent margins).
const X_SIZE = 32;
const WORDMARK_HEIGHT = 32;
const WORDMARK_WIDTH = Math.round(WORDMARK_HEIGHT * (1886 / 378)); // ~160

async function openWebsite() {
  try {
    await Linking.openURL(BEXDRE_URL);
  } catch {
    // No-op — don't crash if the device can't open the URL.
  }
}

function BexDreLogoButtonImpl() {
  const { isDark } = useAppTheme();
  const progress = useSharedValue(0); // 0 = X mark, 1 = full wordmark
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks expand state synchronously for tap branching — first tap reveals,
  // every tap after that (while expanded) visits the site. A ref avoids extra re-renders.
  const isExpandedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (returnTimer.current) clearTimeout(returnTimer.current);
    };
  }, []);

  const scheduleAutoCollapse = () => {
    if (returnTimer.current) clearTimeout(returnTimer.current);
    returnTimer.current = setTimeout(() => {
      progress.value = withTiming(0, { duration: 420, easing: Easing.inOut(Easing.cubic) });
      isExpandedRef.current = false;
      returnTimer.current = null;
    }, AUTO_RETURN_DELAY);
  };

  const handlePress = () => {
    if (!isExpandedRef.current) {
      // First tap: reveal the wordmark + hint only — no navigation yet.
      isExpandedRef.current = true;
      progress.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    } else {
      // Tap while already expanded: visit the site and restart the visible window.
      void openWebsite();
    }
    scheduleAutoCollapse();
  };

  const revealStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [X_SIZE, WORDMARK_WIDTH], Extrapolation.CLAMP),
  }));

  const xStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 0.4], [1, 0.5], Extrapolation.CLAMP) }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.35, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0.35, 1], [0.7, 1], Extrapolation.CLAMP) }],
  }));

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={10}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="BexDre Website"
    >
      <Animated.View style={[styles.outer, revealStyle]}>
        <Animated.Image
          source={require('@/assets/images/greenlogo.png')}
          style={[styles.xImage, xStyle]}
          resizeMode="contain"
        />

        {/* Clips the (fixed-width) wordmark so it visually unfurls left-to-right as `revealStyle` widens. */}
        <Animated.View style={[styles.wordmarkClip, revealStyle]}>
          <Animated.Image
            source={
              isDark
                ? require('@/assets/images/bexdrelogo-light.png')
                : require('@/assets/images/bexdrelogo-dark.png')
            }
            style={[styles.wordmarkImage, wordmarkStyle]}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export const BexDreLogoButton = React.memo(BexDreLogoButtonImpl);

const styles = StyleSheet.create({
  outer: {
    height: ROW_HEIGHT,
  },
  xImage: {
    position: 'absolute',
    left:     0,
    top:      (ROW_HEIGHT - X_SIZE) / 2,
    width:    X_SIZE,
    height:   X_SIZE,
  },
  wordmarkClip: {
    position: 'absolute',
    left:     0,
    top:      (ROW_HEIGHT - WORDMARK_HEIGHT) / 2,
    height:   WORDMARK_HEIGHT,
    overflow: 'hidden',
  },
  wordmarkImage: {
    width:  WORDMARK_WIDTH,
    height: WORDMARK_HEIGHT,
  },
});
