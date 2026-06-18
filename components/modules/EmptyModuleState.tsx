import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { MotiView } from 'moti';
import { Colors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/ThemeContext';

interface Props {
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

export function EmptyModuleState({ title, description, icon }: Props) {
  const { colors } = useAppTheme();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 18, stiffness: 120, delay: 100 }}
      style={styles.container}
    >
      <View style={[styles.iconWrapper, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
        <Ionicons name={icon} size={64} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.darkBlue }]}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={[styles.badge, { backgroundColor: colors.softBlue, borderColor: colors.lightBlue }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>Coming Soon</Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
