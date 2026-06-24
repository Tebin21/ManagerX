import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Theme } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

interface Props {
  onPress: () => void;
  loading?: boolean;
}

export function GoogleSignInButton({ onPress, loading }: Props) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        disabled={loading}
        activeOpacity={0.9}
        style={styles.button}
      >
        <View style={styles.inner}>
          <View style={styles.iconWrapper}>
            <Text style={styles.gText}>G</Text>
          </View>
          <Text style={styles.label}>{t('login.googleBtn')}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Theme.button.height,
    borderRadius: Theme.button.borderRadius,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    ...Theme.shadow.soft,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray700,
    letterSpacing: 0.2,
  },
});
