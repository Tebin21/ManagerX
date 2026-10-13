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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  value: boolean; // true = dark mode (moon), false = light mode (sun)
  onToggle: (val: boolean) => void;
  disabled?: boolean;
}

const TRACK_WIDTH = 62;
const TRACK_HEIGHT = 32;
const TRACK_PADDING = 3;
const THUMB_SIZE = 26;
const TRAVEL_DISTANCE = TRACK_WIDTH - THUMB_SIZE - TRACK_PADDING * 2; // 29px

export function ThemeToggleSwitch({ value, onToggle, disabled = false }: Props) {
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
      // Haptics not available on some environments
    }
    onToggle(!value);
  };

  // Day Track fade
  const dayTrackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  // Night Track fade
  const nightTrackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // Thumb sliding & subtle rotation
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

  // Sun icon inside thumb
  const sunIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [1, 0, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 0.5, 1], [1, 0.5, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  // Moon icon inside thumb
  const moonIconStyle = useAnimatedStyle(() => ({
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
        {/* Day Background Layer (Warm Golden Sky) */}
        <Animated.View style={[StyleSheet.absoluteFill, dayTrackStyle]}>
          <LinearGradient
            colors={['#FDE68A', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.trackGradient}
          >
            {/* Subtle moon silhouette on the inactive side */}
            <View style={styles.inactiveMoonWrap}>
              <Ionicons name="moon" size={11} color="rgba(255, 255, 255, 0.55)" />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Night Background Layer (Deep Midnight Sky with Stars) */}
        <Animated.View style={[StyleSheet.absoluteFill, nightTrackStyle]}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.trackGradient, styles.nightBorder]}
          >
            {/* Stars on the inactive day side */}
            <View style={styles.starsWrap}>
              <View style={[styles.starDot, styles.star1]} />
              <View style={[styles.starDot, styles.star2]} />
              <View style={[styles.starDot, styles.star3]} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Animated Thumb (The Sun / Moon Sphere) */}
        <Animated.View style={[styles.thumb, thumbAnimatedStyle]}>
          {/* Sun Icon View */}
          <Animated.View style={[styles.iconContainer, sunIconStyle]}>
            <LinearGradient
              colors={['#FFFFFF', '#FEF3C7']}
              style={styles.thumbInner}
            >
              <Ionicons name="sunny" size={15} color="#D97706" />
            </LinearGradient>
          </Animated.View>

          {/* Moon Icon View */}
          <Animated.View style={[styles.iconContainer, moonIconStyle]}>
            <LinearGradient
              colors={['#1E293B', '#0F172A']}
              style={[styles.thumbInner, styles.moonThumbBorder]}
            >
              <Ionicons name="moon" size={14} color="#FBBF24" />
            </LinearGradient>
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
  nightBorder: {
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  inactiveMoonWrap: {
    position: 'absolute',
    right: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsWrap: {
    position: 'absolute',
    left: 8,
    width: 16,
    height: 16,
  },
  starDot: {
    position: 'absolute',
    backgroundColor: '#F8FAFC',
    borderRadius: 2,
  },
  star1: {
    width: 2.5,
    height: 2.5,
    top: 2,
    left: 4,
    opacity: 0.9,
  },
  star2: {
    width: 3.5,
    height: 3.5,
    bottom: 2,
    right: 2,
    opacity: 0.75,
  },
  star3: {
    width: 2,
    height: 2,
    top: 9,
    left: 1,
    opacity: 0.6,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 3,
    elevation: 4,
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
  },
  moonThumbBorder: {
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
});
