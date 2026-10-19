import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  QUESTIONS_AMICO_BASE_SVG,
  QUESTIONS_AMICO_QUESTION_MARK_SVG,
} from '@/constants/onboardingIllustrations';

interface Props {
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * FloatingQuestionIllustration
 *
 * Renders the Questions-amico illustration with a subtle, gentle floating animation
 * applied exclusively to the central 3D question mark, keeping the characters and floor grounded.
 */
export function FloatingQuestionIllustration({ width, height, style }: Props) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Subtle, gentle floating motion between 3px down and 7px up
    translateY.value = withRepeat(
      withTiming(-7, {
        duration: 2200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1, // Infinite loop
      true // Reverse back and forth
    );
  }, [translateY]);

  const animatedQuestionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[{ width, height, position: 'relative' }, style]}>
      {/* Base Layer: Floor, Shadows, Characters, Plants, Small Floating Marks */}
      <SvgXml
        xml={QUESTIONS_AMICO_BASE_SVG}
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Layer: Central 3D Question Mark only */}
      <Animated.View
        style={[
          {
            width,
            height,
            position: 'absolute',
            top: 0,
            left: 0,
          },
          animatedQuestionStyle,
        ]}
        pointerEvents="none"
      >
        <SvgXml
          xml={QUESTIONS_AMICO_QUESTION_MARK_SVG}
          width={width}
          height={height}
        />
      </Animated.View>
    </View>
  );
}
