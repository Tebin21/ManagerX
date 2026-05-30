import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function PremiumCard({ children, style, padding = 20 }: Props) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderRadius:    Theme.radius.card,
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
