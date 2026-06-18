import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  fullWidth?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  fullWidth = true,
}: Props) {
  const { colors } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const isOutline = variant === 'outline';
  const isGhost   = variant === 'ghost';

  return (
    <Animated.View style={[animatedStyle, fullWidth && { width: '100%' }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          isOutline && [styles.outline, { borderColor: colors.primary, backgroundColor: 'transparent' }],
          isGhost   && styles.ghost,
          (disabled || loading) && styles.disabled,
          variant === 'primary' && Theme.shadow.button,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={isOutline || isGhost ? colors.primary : '#fff'} size="small" />
        ) : (
          <Text
            style={[
              styles.label,
              isOutline && [styles.outlineLabel, { color: colors.primary }],
              isGhost   && styles.ghostLabel,
            ]}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height:            Theme.button.height,
    borderRadius:      Theme.button.borderRadius,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 24,
  },
  outline: {
    borderWidth: 1.5,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color:         '#FFFFFF',
    fontSize:      16,
    fontWeight:    '600',
    letterSpacing: 0.3,
  },
  outlineLabel: {},
  ghostLabel: {
    color:    '#64748B',
    fontSize: 14,
  },
});
