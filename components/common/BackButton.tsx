import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDirectionalChevron } from '@/lib/rtl';

interface Props {
  onPress?: () => void;
  style?: ViewStyle;
}

export function BackButton({ onPress, style }: Props) {
  const router = useRouter();
  const { chevronBack } = useDirectionalChevron();
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  function handlePressIn() {
    scale.value   = withSpring(0.84, { damping: 20, stiffness: 400 });
    opacity.value = withTiming(0.72, { duration: 80, easing: Easing.out(Easing.ease) });
  }

  function handlePressOut() {
    scale.value   = withSpring(1, { damping: 18, stiffness: 350 });
    opacity.value = withTiming(1,  { duration: 140, easing: Easing.out(Easing.ease) });
  }

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        onPress={onPress ?? (() => router.back())}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.btn}
        hitSlop={12}
        activeOpacity={1}
      >
        {/* Points left in English, mirrors to point right in Kurdish */}
        <Ionicons
          name={chevronBack as never}
          size={22}
          color="#FFFFFF"
          style={styles.icon}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems:      'center',
    justifyContent:  'center',
    // Top highlight for glass effect
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.35)',
    // Subtle shadow to lift it off the gradient
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.18,
    shadowRadius:    6,
    elevation:       4,
  },
  icon: {
    // Explicit left-to-right margin offset so the chevron looks optically centered
    marginRight: 1,
  },
});
