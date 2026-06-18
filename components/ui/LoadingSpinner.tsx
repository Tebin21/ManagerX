import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useAppTheme } from '@/contexts/ThemeContext';

interface Props {
  size?: number;
  color?: string;
}

export function LoadingSpinner({ size = 40, color }: Props) {
  const { colors } = useAppTheme();
  const spinnerColor = color ?? colors.primary;

  return (
    <View style={styles.container}>
      <MotiView
        from={{ rotate: '0deg' }}
        animate={{ rotate: '360deg' }}
        transition={{ type: 'timing', duration: 800, loop: true, repeatReverse: false }}
        style={[
          styles.spinner,
          {
            width:        size,
            height:       size,
            borderRadius: size / 2,
            borderColor:  spinnerColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  spinner: {
    borderWidth:     3,
    borderTopColor: 'transparent',
  },
});
