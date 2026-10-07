import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}

const IS_IOS = Platform.OS === 'ios';

export function SettingsCard({ children, style, padding = 18 }: Props) {
  const { colors, isDark } = useAppTheme();

  if (IS_IOS) {
    return (
      <View
        style={[
          styles.glassCard,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.68)' : 'rgba(255, 255, 255, 0.72)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.85)',
            shadowColor: isDark ? '#000000' : '#0F172A',
            padding,
          },
          style,
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.01)', 'rgba(255, 255, 255, 0.04)']
              : ['rgba(255, 255, 255, 0.60)', 'rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.22)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.androidCard,
        {
          backgroundColor: colors.white,
          borderRadius: Theme.radius.card,
          padding,
          ...Theme.shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: 20,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
  },
  androidCard: {
    overflow: 'hidden',
  },
});
