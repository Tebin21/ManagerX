import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/contexts/ThemeContext';
import { Typography } from '@/constants/typography';

interface Props {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  light?: boolean;
}

export function ScreenHeader({ title, showBack = true, rightAction, light = false }: Props) {
  const router = useRouter();
  const { colors } = useAppTheme();

  const color = light ? colors.white : colors.darkBlue;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={color} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.title, { color }]} numberOfLines={1}>{title}</Text>
      <View style={styles.right}>{rightAction ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  left:    { width: 40, alignItems: 'flex-start' },
  right:   { width: 40, alignItems: 'flex-end' },
  backBtn: { padding: 4 },
  title: {
    flex: 1,
    textAlign: 'center',
    ...Typography.title,
    letterSpacing: 0.2,
  },
});
