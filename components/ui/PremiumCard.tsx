import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
}

export function PremiumCard({ children, style, padding = 20 }: Props) {
  const { colors } = useAppTheme();
  const { isTablet } = useResponsive();
  const responsivePadding = isTablet ? Math.round(padding * 1.2) : padding;

  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderRadius:    isTablet ? 20 : Theme.radius.card,
          padding:         responsivePadding,
          ...Theme.shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
