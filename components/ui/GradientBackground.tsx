import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/contexts/ThemeContext';

interface Props {
  children: React.ReactNode;
  style?: object;
}

export function GradientBackground({ children, style }: Props) {
  const { colors } = useAppTheme();
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[StyleSheet.absoluteFillObject, style]}
    >
      {children}
    </LinearGradient>
  );
}
