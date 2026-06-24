import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';

interface Props {
  count: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
}

function Dot({ index, scrollX, pageWidth }: { index: number; scrollX: SharedValue<number>; pageWidth: number }) {
  const { colors } = useAppTheme();
  const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];

  const animatedStyle = useAnimatedStyle(() => {
    const width = interpolate(scrollX.value, inputRange, [8, 22, 8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP);
    return { width, opacity };
  });

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: colors.primary }, animatedStyle]}
    />
  );
}

export function OnboardingDots({ count, scrollX, pageWidth }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, index) => (
        <Dot key={index} index={index} scrollX={scrollX} pageWidth={pageWidth} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
