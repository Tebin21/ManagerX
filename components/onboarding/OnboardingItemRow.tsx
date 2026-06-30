import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import type { OnboardingItem } from '@/constants/onboardingSlides';

interface Props {
  item: OnboardingItem;
}

export function OnboardingItemRow({ item }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <View style={styles.item}>
      <View style={[styles.iconWrapper, { backgroundColor: colors.softBlue }]}>
        <Ionicons name={item.icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.label, { color: colors.darkBlue }]}>
        {t(item.labelKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    width: '48%',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
