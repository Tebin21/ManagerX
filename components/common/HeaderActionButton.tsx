import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function HeaderActionButton({ icon, onPress, disabled = false, loading = false }: Props) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   isDisabled ? 0.55 : 1,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => {
          if (!isDisabled) scale.value = withSpring(0.87, { damping: 18, stiffness: 380 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 380 });
        }}
        style={styles.btn}
        hitSlop={10}
        activeOpacity={0.85}
        disabled={isDisabled}
      >
        {loading
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Ionicons name={icon} size={20} color="#FFFFFF" />
        }
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width:           36,
    height:          36,
    borderRadius:    11,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.28)',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.14,
    shadowRadius:    5,
    elevation:       3,
  },
});
