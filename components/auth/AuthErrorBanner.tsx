import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Colors } from '@/constants/colors';

interface AuthErrorBannerProps {
  message: string;
  style?: StyleProp<ViewStyle>;
}

export function AuthErrorBanner({ message, style }: AuthErrorBannerProps) {
  return (
    <View style={[styles.errorBox, style]}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    padding: 12,
    marginBottom: 14,
    backgroundColor: Colors.errorBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
});
